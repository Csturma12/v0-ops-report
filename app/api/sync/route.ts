// Cron endpoint to sync all integrations — runs hourly via vercel.json.
import { NextResponse } from "next/server"
import type {
  OpsMetrics,
  OpsDetails,
  SyncResult,
  AlertItem,
  LoadItem,
  QuoteItem,
} from "@/lib/types/ops"
import { syncTAI, isConfigured as taiConfigured } from "@/lib/integrations/tai"
import { syncGmail, isConfigured as gmailConfigured } from "@/lib/integrations/gmail"
import {
  syncTruckstop,
  isConfigured as truckstopConfigured,
} from "@/lib/integrations/truckstop"
import { syncSlack, isConfigured as slackConfigured } from "@/lib/integrations/slack"
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

  const errors: string[] = []
  const allAlerts: AlertItem[] = []
  const allLoads: LoadItem[] = []
  const allQuotes: QuoteItem[] = []

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

  let gmailResult = null
  if (gmailConfigured()) {
    try {
      gmailResult = await syncGmail()
      allQuotes.push(...gmailResult.quoteRequests)
    } catch (error) {
      errors.push(`Gmail: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  let truckstopResult = null
  if (truckstopConfigured()) {
    try {
      truckstopResult = await syncTruckstop()
      allLoads.push(...truckstopResult.postedLoads)
    } catch (error) {
      errors.push(
        `Truckstop: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  const criticalAlerts = allAlerts.filter((a) => a.priority === "critical")
  const urgentAlerts = allAlerts.filter(
    (a) => a.priority === "high" && a.type === "urgent",
  )
  const uncoveredLoads = allLoads.filter((l) => l.status === "uncovered")
  const newLoads = allLoads.filter((l) => l.status === "new")
  const cancelledLoads = allLoads.filter((l) => l.status === "cancelled")
  const inTransitLoads = allLoads.filter((l) => l.status === "in_transit")

  const now = new Date().toISOString()

  const metrics: OpsMetrics = {
    critical: criticalAlerts.length,
    urgent: urgentAlerts.length,
    uncovered: uncoveredLoads.length,
    newLoads: newLoads.length,
    quotes: allQuotes.filter((q) => q.status === "open").length,
    cancels: cancelledLoads.length,
    tracking: inTransitLoads.length,
    billingGaps: taiResult?.billingGaps.length || 0,
    lastSynced: now,
  }

  const details: OpsDetails = {
    criticalItems: criticalAlerts,
    urgentItems: urgentAlerts,
    uncoveredLoads,
    newLoadItems: newLoads,
    quoteRequests: allQuotes.filter((q) => q.status === "open"),
    cancelledShipments: cancelledLoads,
    trackingUpdates: taiResult?.tracking || [],
    billingGapItems: taiResult?.billingGaps || [],
  }

  const result: SyncResult = {
    success: errors.length === 0,
    timestamp: now,
    metrics,
    details,
    errors: errors.length > 0 ? errors : undefined,
  }

  // Persist to Redis so the dashboard sees the new data.
  await writeSnapshot({
    metrics,
    details,
    source: "sync",
    updatedAt: now,
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  return GET(request)
}
