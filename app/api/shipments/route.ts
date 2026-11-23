// Read-only shipments endpoint. Reads the TAI-fed Supabase tables and returns
// the live board plus summary KPIs. This route never writes.
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import {
  type Shipment,
  type ShipmentsResponse,
  type ShipmentsSummary,
  type StatusBucket,
  statusBucket,
} from "@/lib/types/shipment"

export const dynamic = "force-dynamic"
export const revalidate = 0

function summarize(shipments: Shipment[]): ShipmentsSummary {
  const buckets: Record<StatusBucket, number> = {
    new: 0,
    booked: 0,
    in_transit: 0,
    delivered: 0,
    exception: 0,
    cancelled: 0,
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let deliveredToday = 0
  let marginAtRisk = 0
  let totalMargin = 0
  let lastReceivedAt: string | null = null

  for (const s of shipments) {
    const bucket = statusBucket(s.status)
    buckets[bucket] += 1

    if (bucket === "delivered" && s.delivery_date) {
      if (new Date(s.delivery_date) >= startOfToday) deliveredToday += 1
    }

    const sell = typeof s.rate_sell === "number" ? s.rate_sell : null
    const cost = typeof s.rate_cost === "number" ? s.rate_cost : null
    if (sell !== null && cost !== null) {
      const margin = sell - cost
      totalMargin += margin
      if (margin <= 0) marginAtRisk += 1
    } else if (bucket !== "cancelled" && bucket !== "delivered") {
      // Missing rate data on an active load is a billing gap risk.
      marginAtRisk += 1
    }

    if (!lastReceivedAt || s.received_at > lastReceivedAt) {
      lastReceivedAt = s.received_at
    }
  }

  return {
    total: shipments.length,
    buckets,
    needsCoverage: buckets.new,
    inTransit: buckets.in_transit,
    deliveredToday,
    marginAtRisk,
    totalMargin,
    lastReceivedAt,
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500)

    if (error) {
      const payload: ShipmentsResponse = {
        shipments: [],
        summary: summarize([]),
        connected: false,
        error: error.message,
      }
      return NextResponse.json(payload, { status: 200 })
    }

    const shipments = (data ?? []) as Shipment[]
    const payload: ShipmentsResponse = {
      shipments,
      summary: summarize(shipments),
      connected: true,
    }
    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const payload: ShipmentsResponse = {
      shipments: [],
      summary: summarize([]),
      connected: false,
      error: message,
    }
    return NextResponse.json(payload, { status: 200 })
  }
}
