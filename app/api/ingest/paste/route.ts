// Accepts raw text of a Claude freight-ops report (pasted from Slack),
// parses it, and writes the snapshot + history point into Redis.
import { NextResponse } from "next/server"
import { parseFreightReport } from "@/lib/parsers/freight-report"
import { writeSnapshot, isRedisConfigured } from "@/lib/store/ops-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  let body: { text?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const text = typeof body.text === "string" ? body.text : ""
  if (!text.trim()) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 })
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "redis_not_configured" },
      { status: 500 },
    )
  }

  try {
    const parsed = parseFreightReport(text)
    const ok = await writeSnapshot({
      metrics: parsed.metrics,
      details: parsed.details,
      source: "claude",
      updatedAt: parsed.reportTimestamp ?? new Date().toISOString(),
    })

    return NextResponse.json({
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
    })
  } catch (err) {
    console.error("[v0] /api/ingest/paste parse/write failed:", err)
    return NextResponse.json(
      { error: "parse_failed", message: (err as Error).message },
      { status: 500 },
    )
  }
}
