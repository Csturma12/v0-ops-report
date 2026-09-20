// Supabase-backed store for the latest ops snapshot and 24-hour history.
// The hourly Claude report (or manual entry) writes here; the dashboard reads from here.
//
// Uses the Supabase REST API (PostgREST) directly via fetch with the
// service-role key, so no extra client dependency is required. This code is
// server-only — the service-role key must never reach the browser.
import type { OpsDetails, OpsMetrics } from "@/lib/types/ops"

const TABLE = "ops_snapshots"
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

function getConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ""), key }
}

function restHeaders(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  }
}

interface SnapshotRow {
  metrics: OpsMetrics
  details: OpsDetails | null
  source: OpsSnapshot["source"]
  updated_at: string
}

export async function readSnapshot(): Promise<OpsSnapshot | null> {
  const config = getConfig()
  if (!config) return null
  try {
    const res = await fetch(
      `${config.url}/rest/v1/${TABLE}?select=metrics,details,source,updated_at&order=updated_at.desc&limit=1`,
      { headers: restHeaders(config.key), cache: "no-store" },
    )
    if (!res.ok) {
      console.error("[v0] readSnapshot failed:", res.status, await res.text())
      return null
    }
    const rows = (await res.json()) as SnapshotRow[]
    if (!rows.length) return null
    const row = rows[0]
    return {
      metrics: row.metrics,
      details: row.details ?? undefined,
      source: row.source,
      updatedAt: row.updated_at,
    }
  } catch (err) {
    console.error("[v0] readSnapshot failed:", err)
    return null
  }
}

export async function writeSnapshot(snapshot: OpsSnapshot): Promise<boolean> {
  const config = getConfig()
  if (!config) {
    console.warn(
      "[v0] writeSnapshot: Supabase not configured, snapshot not persisted",
    )
    return false
  }
  try {
    const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: restHeaders(config.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({
        metrics: snapshot.metrics,
        details: snapshot.details ?? null,
        source: snapshot.source,
        updated_at: snapshot.updatedAt,
      }),
    })
    if (!res.ok) {
      console.error("[v0] writeSnapshot failed:", res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error("[v0] writeSnapshot failed:", err)
    return false
  }
}

export async function readHistory(): Promise<OpsHistoryPoint[]> {
  const config = getConfig()
  if (!config) return []
  try {
    const res = await fetch(
      `${config.url}/rest/v1/${TABLE}?select=metrics,updated_at&order=updated_at.desc&limit=${HISTORY_LIMIT}`,
      { headers: restHeaders(config.key), cache: "no-store" },
    )
    if (!res.ok) {
      console.error("[v0] readHistory failed:", res.status, await res.text())
      return []
    }
    const rows = (await res.json()) as { metrics: OpsMetrics; updated_at: string }[]
    // Query returns newest-first; reverse so the array is oldest→newest for charts.
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
    console.error("[v0] readHistory failed:", err)
    return []
  }
}

export function isStoreConfigured(): boolean {
  return getConfig() !== null
}
