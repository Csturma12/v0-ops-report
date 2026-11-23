// Cron endpoint that pulls the latest Primary Freight data from Supabase and
// writes a snapshot the dashboard reads. Runs hourly via vercel.json.
import { NextResponse } from "next/server"
import type { OpsMetrics, OpsDetails, SyncResult } from "@/lib/types/ops"
import {
  syncPrimaryFreight,
  isConfigured as primaryFreightConfigured,
} from "@/lib/integrations/primary-freight"
import { writeSnapshot } from "@/lib/store/ops-store"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date().toISOString()
  const errors: string[] = []

  const emptyDetails: OpsDetails = {
    criticalItems: [],
    urgentItems: [],
    uncoveredLoads: [],
    newLoadItems: [],
    quoteRequests: [],
    cancelledShipments: [],
    trackingUpdates: [],
    billingGapItems: [],
  }

  let details = emptyDetails
  let rowCounts = { loads: 0, shipments: 0, events: 0 }

  if (primaryFreightConfigured()) {
    try {
      const result = await syncPrimaryFreight()
      details = result.details
      rowCounts = result.rowCounts
    } catch (error) {
      errors.push(
        `Primary Freight: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  } else {
    errors.push("Primary Freight: Supabase not configured")
  }

  const metrics: OpsMetrics = {
    critical: details.criticalItems.length,
    urgent: details.urgentItems.length,
    uncovered: details.uncoveredLoads.length,
    newLoads: details.newLoadItems.length,
    quotes: details.quoteRequests.length,
    cancels: details.cancelledShipments.length,
    tracking: details.trackingUpdates.length,
    billingGaps: details.billingGapItems.length,
    lastSynced: now,
  }

  const result: SyncResult = {
    success: errors.length === 0,
    timestamp: now,
    metrics,
    details,
    errors: errors.length > 0 ? errors : undefined,
  }

  console.log("[v0] /api/sync pulled Primary Freight data — rows:", rowCounts, "metrics:", metrics)

  // Only persist when the pull succeeded, so a transient read error doesn't
  // wipe the dashboard back to zeros.
  if (errors.length === 0) {
    await writeSnapshot({ metrics, details, source: "sync", updatedAt: now })
  }

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  return GET(request)
}
