// Accepts raw text of a Claude freight-ops report (pasted from Slack or
// POSTed directly by a Claude scheduled task), parses it, and writes the
// snapshot + history point into Redis.
//
// Accepted request shapes (all work):
//   POST JSON { "text": "..." }
//   POST JSON { "report": "..." }       // Claude sometimes picks this key
//   POST JSON { "message": "..." }      // ...or this one
//   POST JSON { "body": "..." }
//   POST text/plain with the raw report as the body
import { NextResponse } from "next/server"
import { parseFreightReport } from "@/lib/parsers/freight-report"
import { writeSnapshot, isRedisConfigured } from "@/lib/store/ops-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Allow CORS so Claude (or any browser-side tool) can POST directly.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// Simple GET so you can sanity-check the URL in a browser.
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "/api/ingest/paste",
      accepts: [
        'POST application/json {"text": "<full report>"}',
        'POST application/json {"report": "<full report>"}',
        "POST text/plain with the raw report as the body",
      ],
      redisConfigured: isRedisConfigured(),
    },
    { headers: corsHeaders() },
  )
}

async function extractText(req: Request): Promise<string> {
  const contentType = req.headers.get("content-type") ?? ""

  // JSON payload
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>
      const candidate =
        body.text ??
        body.report ??
        body.message ??
        body.body ??
        body.content ??
        body.raw
      if (typeof candidate === "string") return candidate
      // If Claude sends the entire report as the whole JSON object stringified
      return JSON.stringify(body)
    } catch {
      return ""
    }
  }

  // Raw text or any other content type — just read the body as text.
  try {
    return await req.text()
  } catch {
    return ""
  }
}

export async function POST(req: Request) {
  const text = await extractText(req)

  if (!text.trim()) {
    return NextResponse.json(
      { error: "empty_text", hint: 'Send { "text": "<full report>" } as JSON.' },
      { status: 400, headers: corsHeaders() },
    )
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "redis_not_configured" },
      { status: 500, headers: corsHeaders() },
    )
  }

  try {
    const parsed = parseFreightReport(text)

    // If the parse came back empty, log the first 2KB of raw text so we can
    // see exactly what format was sent and fix the parser.
    const itemTotal =
      parsed.details.criticalItems.length +
      parsed.details.urgentItems.length +
      parsed.details.uncoveredLoads.length +
      parsed.details.newLoadItems.length +
      parsed.details.quoteRequests.length +
      parsed.details.cancelledShipments.length +
      parsed.details.trackingUpdates.length +
      parsed.details.billingGapItems.length
    const metricTotal =
      parsed.metrics.critical +
      parsed.metrics.urgent +
      parsed.metrics.uncovered +
      parsed.metrics.newLoads +
      parsed.metrics.quotes +
      parsed.metrics.cancels +
      parsed.metrics.tracking +
      parsed.metrics.billingGaps

    if (itemTotal === 0 && metricTotal === 0) {
      console.warn(
        "[v0] /api/ingest/paste parsed zero items — raw text preview (first 2KB):\n" +
          text.slice(0, 2048),
      )
      console.warn("[v0] parser warnings:", parsed.warnings)
    }

    const ok = await writeSnapshot({
      metrics: parsed.metrics,
      details: parsed.details,
      source: "claude",
      updatedAt: parsed.reportTimestamp ?? new Date().toISOString(),
    })

    console.log(
      "[v0] /api/ingest/paste wrote snapshot — metrics:",
      parsed.metrics,
      "items:",
      {
        critical: parsed.details.criticalItems.length,
        urgent: parsed.details.urgentItems.length,
        uncovered: parsed.details.uncoveredLoads.length,
        newLoads: parsed.details.newLoadItems.length,
        quotes: parsed.details.quoteRequests.length,
        cancels: parsed.details.cancelledShipments.length,
        tracking: parsed.details.trackingUpdates.length,
        billing: parsed.details.billingGapItems.length,
      },
    )

    return NextResponse.json(
      {
        ok,
        metrics: parsed.metrics,
        reportTimestamp: parsed.reportTimestamp,
        warnings: parsed.warnings,
        itemCounts: {
          criticalItems: parsed.details.criticalItems.length,
          urgentItems: parsed.details.urgentItems.length,
          uncoveredLoads: parsed.details.uncoveredLoads.length,
          newLoadItems: parsed.details.newLoadItems.length,
          quoteRequests: parsed.details.quoteRequests.length,
          cancelledShipments: parsed.details.cancelledShipments.length,
          trackingUpdates: parsed.details.trackingUpdates.length,
          billingGapItems: parsed.details.billingGapItems.length,
        },
      },
      { headers: corsHeaders() },
    )
  } catch (err) {
    console.error("[v0] /api/ingest/paste parse/write failed:", err)
    return NextResponse.json(
      { error: "parse_failed", message: (err as Error).message },
      { status: 500, headers: corsHeaders() },
    )
  }
}
