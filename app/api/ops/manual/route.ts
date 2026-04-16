// Write endpoint for the hourly Claude report and manual entry form.
// POSTs here persist a snapshot in Redis so the dashboard can render it.
import { NextRequest, NextResponse } from "next/server"
import type { OpsDetails, OpsMetrics } from "@/lib/types/ops"
import { readSnapshot, writeSnapshot } from "@/lib/store/ops-store"

export const dynamic = "force-dynamic"
export const revalidate = 0

function toInt(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? 0), 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Optional shared-secret auth for automated writers (Claude job).
    // If OPS_WRITE_SECRET is set, require a matching Bearer token.
    const writeSecret = process.env.OPS_WRITE_SECRET
    if (writeSecret) {
      const auth = request.headers.get("authorization")
      if (auth !== `Bearer ${writeSecret}`) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        )
      }
    }

    const now = new Date().toISOString()

    const metrics: OpsMetrics = {
      critical: toInt(body.critical),
      urgent: toInt(body.urgent),
      uncovered: toInt(body.uncovered),
      newLoads: toInt(body.newLoads),
      quotes: toInt(body.quotes),
      cancels: toInt(body.cancels),
      tracking: toInt(body.tracking),
      billingGaps: toInt(body.billingGaps),
      lastSynced: now,
    }

    // Optional detailed items (so users can click a card and review the list).
    const details: OpsDetails | undefined = body.details
      ? {
          criticalItems: body.details.criticalItems ?? [],
          urgentItems: body.details.urgentItems ?? [],
          uncoveredLoads: body.details.uncoveredLoads ?? [],
          newLoadItems: body.details.newLoadItems ?? [],
          quoteRequests: body.details.quoteRequests ?? [],
          cancelledShipments: body.details.cancelledShipments ?? [],
          trackingUpdates: body.details.trackingUpdates ?? [],
          billingGapItems: body.details.billingGapItems ?? [],
        }
      : undefined

    const source =
      body.source === "claude" || body.source === "sync" ? body.source : "manual"

    const ok = await writeSnapshot({
      metrics,
      details,
      source,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      persisted: ok,
      metrics,
      message: ok
        ? "Snapshot saved"
        : "Snapshot accepted but not persisted (Redis unavailable)",
    })
  } catch (error) {
    console.error("[v0] manual POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save metrics" },
      { status: 500 },
    )
  }
}

export async function GET() {
  const snapshot = await readSnapshot()
  if (!snapshot) {
    return NextResponse.json({
      success: false,
      metrics: null,
      message: "No data yet - waiting for the next hourly report.",
    })
  }

  return NextResponse.json({
    success: true,
    metrics: { ...snapshot.metrics, lastUpdated: snapshot.updatedAt },
    details: snapshot.details,
    source: snapshot.source,
    updatedAt: snapshot.updatedAt,
  })
}
