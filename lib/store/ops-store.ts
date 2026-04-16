// Redis-backed store for the latest ops snapshot.
// The hourly Claude report (or manual entry) writes here; the dashboard reads from here.
import { Redis } from "@upstash/redis"
import type { OpsDetails, OpsMetrics } from "@/lib/types/ops"

const OPS_SNAPSHOT_KEY = "ops:snapshot:latest"

export interface OpsSnapshot {
  metrics: OpsMetrics
  details?: OpsDetails
  source: "claude" | "manual" | "sync"
  updatedAt: string
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
    return true
  } catch (err) {
    console.error("[v0] writeSnapshot failed:", err)
    return false
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}
