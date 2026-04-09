// Endpoint to get current ops data for the dashboard
import { NextResponse } from "next/server"
import type { OpsDataResponse, OpsMetrics, IntegrationStatus } from "@/lib/types/ops"
import { isConfigured as taiConfigured } from "@/lib/integrations/tai"
import { isConfigured as gmailConfigured } from "@/lib/integrations/gmail"
import { isConfigured as truckstopConfigured } from "@/lib/integrations/truckstop"
import { isConfigured as slackConfigured } from "@/lib/integrations/slack"

// Simple in-memory store for sync results
// In production, replace with Redis/KV store
declare global {
  // eslint-disable-next-line no-var
  var opsDataStore: {
    metrics: OpsMetrics
    lastSynced: string
  } | undefined
}

// Default metrics when no sync has occurred
const defaultMetrics: OpsMetrics = {
  critical: 0,
  urgent: 3,
  uncovered: 10,
  newLoads: 5,
  quotes: 1,
  cancels: 0,
  tracking: 4,
  billingGaps: 2,
  lastSynced: null,
}

export async function GET() {
  const integrationStatus: IntegrationStatus = {
    slack: {
      connected: slackConfigured(),
      lastSync: global.opsDataStore?.lastSynced || null,
    },
    gmail: {
      connected: gmailConfigured(),
      lastSync: global.opsDataStore?.lastSynced || null,
    },
    tai: {
      connected: taiConfigured(),
      lastSync: global.opsDataStore?.lastSynced || null,
    },
    truckstop: {
      connected: truckstopConfigured(),
      lastSync: global.opsDataStore?.lastSynced || null,
    },
  }

  // Return stored data or defaults
  const response: OpsDataResponse = {
    metrics: global.opsDataStore?.metrics || defaultMetrics,
    integrationStatus,
  }

  return NextResponse.json(response)
}

// Update stored metrics (called after sync)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    if (body.metrics) {
      global.opsDataStore = {
        metrics: body.metrics,
        lastSynced: new Date().toISOString(),
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
