// Dashboard read endpoint — returns the latest Redis-backed snapshot.
import { NextResponse } from "next/server"
import type { OpsDataResponse, OpsMetrics, IntegrationStatus } from "@/lib/types/ops"
import { isConfigured as taiConfigured } from "@/lib/integrations/tai"
import { isConfigured as gmailConfigured } from "@/lib/integrations/gmail"
import { isConfigured as truckstopConfigured } from "@/lib/integrations/truckstop"
import { isConfigured as slackConfigured } from "@/lib/integrations/slack"
import { readSnapshot } from "@/lib/store/ops-store"

export const dynamic = "force-dynamic"
export const revalidate = 0

const defaultMetrics: OpsMetrics = {
  critical: 0,
  urgent: 0,
  uncovered: 0,
  newLoads: 0,
  quotes: 0,
  cancels: 0,
  tracking: 0,
  billingGaps: 0,
  lastSynced: null,
}

export async function GET() {
  const snapshot = await readSnapshot()

  const lastSync = snapshot?.metrics.lastSynced ?? snapshot?.updatedAt ?? null

  const integrationStatus: IntegrationStatus = {
    slack: { connected: slackConfigured(), lastSync },
    gmail: { connected: gmailConfigured(), lastSync },
    tai: { connected: taiConfigured(), lastSync },
    truckstop: { connected: truckstopConfigured(), lastSync },
  }

  const response: OpsDataResponse = {
    metrics: snapshot?.metrics ?? defaultMetrics,
    details: snapshot?.details,
    integrationStatus,
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}
