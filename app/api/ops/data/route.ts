// Dashboard read endpoint — returns the latest Supabase-backed snapshot.
import { NextResponse } from "next/server"
import type { OpsDataResponse, OpsMetrics, IntegrationStatus } from "@/lib/types/ops"
import { isConfigured as primaryFreightConfigured } from "@/lib/integrations/primary-freight"
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
  const connected = primaryFreightConfigured()

  // All three streams come from the same Primary Freight Supabase source, so
  // they share the same connection + last-sync state.
  const integrationStatus: IntegrationStatus = {
    Loads: { connected, lastSync },
    Shipments: { connected, lastSync },
    Tracking: { connected, lastSync },
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
