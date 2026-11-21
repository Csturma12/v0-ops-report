// Supabase-backed store for the latest ops snapshot and 24-hour history.
// Rows live in ops_report.snapshots (project nonqwidfqrklksjluloz), which is
// append-only: every write is a new row, the latest row is the snapshot, and the
// last 24 rows are the trend history. Replaces the former Upstash KV store.
// Access is through two service-role RPCs; the schema is not exposed directly.
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { OpsDetails, OpsMetrics } from "@/lib/types/ops"

const HISTORY_LIMIT = 24

export interface OpsSnapshot {
  metrics: OpsMetrics
  details?: OpsDetails
  source: "claude" | "manual" | "sync"
  updatedAt: string
}

// A lightweight per-hour record (no details) used for trend charts.
export interface OpsHistoryPoint {
  timestamp: string
  critical: number
  urgent: number
  uncovered: number
  newLoads: number
  quotes: number
  cancels: number
  tracking: number
  billingGaps: number
}

interface SnapshotRow {
  metrics: OpsMetrics
  details: OpsDetails | null
  source: OpsSnapshot["source"]
  updated_at: string
}

export function isStoreConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY),
  )
}

// Kept for existing callers; the store is Supabase now, not Redis.
export const isRedisConfigured = isStoreConfigured

async function recent(limit: number): Promise<SnapshotRow[]> {
  if (!isStoreConfigured()) return []
  const { data, error } = await getSupabaseAdmin().rpc("ops_report_recent", { p_limit: limit })
  if (error) throw error
  return (data ?? []) as SnapshotRow[]
}

export async function readSnapshot(): Promise<OpsSnapshot | null> {
  try {
    const [row] = await recent(1)
    if (!row) return null
    return {
      metrics: row.metrics,
      details: row.details ?? undefined,
      source: row.source,
      updatedAt: row.updated_at,
    }
  } catch (err) {
    console.error("[ops-store] readSnapshot failed:", err)
    return null
  }
}

export async function writeSnapshot(snapshot: OpsSnapshot): Promise<boolean> {
  if (!isStoreConfigured()) {
    console.warn("[ops-store] writeSnapshot: Supabase not configured, snapshot not persisted")
    return false
  }
  try {
    const { error } = await getSupabaseAdmin().rpc("ops_report_write_snapshot", {
      p_metrics: snapshot.metrics,
      p_details: snapshot.details ?? null,
      p_source: snapshot.source,
      p_updated_at: snapshot.updatedAt,
    })
    if (error) throw error
    return true
  } catch (err) {
    console.error("[ops-store] writeSnapshot failed:", err)
    return false
  }
}

export async function readHistory(): Promise<OpsHistoryPoint[]> {
  try {
    const rows = await recent(HISTORY_LIMIT)
    // Newest-first from the RPC; reverse so charts read oldest to newest.
    return rows
      .map((row) => ({
        timestamp: row.updated_at,
        critical: row.metrics.critical,
        urgent: row.metrics.urgent,
        uncovered: row.metrics.uncovered,
        newLoads: row.metrics.newLoads,
        quotes: row.metrics.quotes,
        cancels: row.metrics.cancels,
        tracking: row.metrics.tracking,
        billingGaps: row.metrics.billingGaps,
      }))
      .reverse()
  } catch (err) {
    console.error("[ops-store] readHistory failed:", err)
    return []
  }
}
