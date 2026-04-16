// Redis-backed store for the latest ops snapshot and 24-hour history.
// The hourly Claude report (or manual entry) writes here; the dashboard reads from here.
import { Redis } from "@upstash/redis"
import type { OpsDetails, OpsMetrics } from "@/lib/types/ops"

const OPS_SNAPSHOT_KEY = "ops:snapshot:latest"
const OPS_HISTORY_KEY = "ops:history"
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

// Lazily construct the client so builds don't crash if env vars are missing.
function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function readSnapshot(): Promise<OpsSnapshot | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const snapshot = await redis.get<OpsSnapshot>(OPS_SNAPSHOT_KEY)
    return snapshot ?? null
  } catch (err) {
    console.error("[v0] readSnapshot failed:", err)
    return null
  }
}

export async function writeSnapshot(snapshot: OpsSnapshot): Promise<boolean> {
  const redis = getRedis()
  if (!redis) {
    console.warn("[v0] writeSnapshot: Redis not configured, snapshot not persisted")
    return false
  }
  try {
    await redis.set(OPS_SNAPSHOT_KEY, snapshot)
    // Also append a compact point to the history list (cap at HISTORY_LIMIT).
    const point: OpsHistoryPoint = {
      timestamp: snapshot.updatedAt,
      critical: snapshot.metrics.critical,
      urgent: snapshot.metrics.urgent,
      uncovered: snapshot.metrics.uncovered,
      newLoads: snapshot.metrics.newLoads,
      quotes: snapshot.metrics.quotes,
      cancels: snapshot.metrics.cancels,
      tracking: snapshot.metrics.tracking,
      billingGaps: snapshot.metrics.billingGaps,
    }
    await redis.lpush(OPS_HISTORY_KEY, JSON.stringify(point))
    await redis.ltrim(OPS_HISTORY_KEY, 0, HISTORY_LIMIT - 1)
    return true
  } catch (err) {
    console.error("[v0] writeSnapshot failed:", err)
    return false
  }
}

export async function readHistory(): Promise<OpsHistoryPoint[]> {
  const redis = getRedis()
  if (!redis) return []
  try {
    const raw = await redis.lrange(OPS_HISTORY_KEY, 0, HISTORY_LIMIT - 1)
    // LPUSH stores newest-first; reverse so the array is oldest→newest for charts.
    return raw
      .map((entry) => {
        if (typeof entry === "string") {
          try {
            return JSON.parse(entry) as OpsHistoryPoint
          } catch {
            return null
          }
        }
        return entry as unknown as OpsHistoryPoint
      })
      .filter((p): p is OpsHistoryPoint => Boolean(p))
      .reverse()
  } catch (err) {
    console.error("[v0] readHistory failed:", err)
    return []
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}
