// Cron endpoint to sync all integrations
// Schedule: 0 */2 * * * (every 2 hours)
import { NextResponse } from "next/server"
import type { OpsMetrics, OpsDetails, SyncResult, AlertItem, LoadItem, QuoteItem } from "@/lib/types/ops"
import { syncTAI, isConfigured as taiConfigured } from "@/lib/integrations/tai"
import { syncGmail, isConfigured as gmailConfigured } from "@/lib/integrations/gmail"
import { syncTruckstop, isConfigured as truckstopConfigured } from "@/lib/integrations/truckstop"
import { syncSlack, isConfigured as slackConfigured } from "@/lib/integrations/slack"

// In-memory cache for latest sync results (in production, use Redis or KV)
let lastSyncResult: SyncResult | null = null

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Allow requests from Vercel cron (has special header) or with correct secret
  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const errors: string[] = []
  const allAlerts: AlertItem[] = []
  const allLoads: LoadItem[] = []
  const allQuotes: QuoteItem[] = []

  // Sync TAI TMS
  let taiResult = null
  if (taiConfigured()) {
    try {
      taiResult = await syncTAI()
      allAlerts.push(...taiResult.alerts)
      allLoads.push(...taiResult.loads)
    } catch (error) {
      errors.push(`TAI: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Sync Slack
  let slackResult = null
  if (slackConfigured()) {
    try {
      slackResult = await syncSlack()
      allAlerts.push(...slackResult.alerts)
      allQuotes.push(...slackResult.quoteDiscussions)
    } catch (error) {
      errors.push(`Slack: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Sync Gmail
  let gmailResult = null
  if (gmailConfigured()) {
    try {
      gmailResult = await syncGmail()
      allQuotes.push(...gmailResult.quoteRequests)
    } catch (error) {
      errors.push(`Gmail: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Sync Truckstop
  let truckstopResult = null
  if (truckstopConfigured()) {
    try {
      truckstopResult = await syncTruckstop()
      allLoads.push(...truckstopResult.postedLoads)
    } catch (error) {
      errors.push(`Truckstop: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Calculate metrics
  const criticalAlerts = allAlerts.filter(a => a.priority === "critical")
  const urgentAlerts = allAlerts.filter(a => a.priority === "high" && a.type === "urgent")
  const uncoveredLoads = allLoads.filter(l => l.status === "uncovered")
  const newLoads = allLoads.filter(l => l.status === "new")
  const cancelledLoads = allLoads.filter(l => l.status === "cancelled")
  const inTransitLoads = allLoads.filter(l => l.status === "in_transit")

  const metrics: OpsMetrics = {
    critical: criticalAlerts.length,
    urgent: urgentAlerts.length,
    uncovered: uncoveredLoads.length,
    newLoads: newLoads.length,
    quotes: allQuotes.filter(q => q.status === "open").length,
    cancels: cancelledLoads.length,
    tracking: inTransitLoads.length,
    billingGaps: taiResult?.billingGaps.length || 0,
    lastSynced: new Date().toISOString(),
  }

  const details: OpsDetails = {
    criticalItems: criticalAlerts,
    urgentItems: urgentAlerts,
    uncoveredLoads,
    newLoadItems: newLoads,
    quoteRequests: allQuotes.filter(q => q.status === "open"),
    cancelledShipments: cancelledLoads,
    trackingUpdates: taiResult?.tracking || [],
    billingGapItems: taiResult?.billingGaps || [],
  }

  const result: SyncResult = {
    success: errors.length === 0,
    timestamp: new Date().toISOString(),
    metrics,
    details,
    errors: errors.length > 0 ? errors : undefined,
  }

  // Cache the result
  lastSyncResult = result

  return NextResponse.json(result)
}

// Export for use by the data endpoint
export function getLastSyncResult(): SyncResult | null {
  return lastSyncResult
}

// Allow manual trigger via POST
export async function POST(request: Request) {
  return GET(request)
}
