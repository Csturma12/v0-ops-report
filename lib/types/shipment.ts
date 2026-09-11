// Types mirror the existing Supabase schema written by the TAI relay (Fly).
// This app treats these tables as read-only.

export interface Shipment {
  id: string
  shipment_id: string
  ref_number: string | null
  bol_number: string | null
  pro_number: string | null
  status: string
  origin_city: string | null
  origin_state: string | null
  origin_zip: string | null
  dest_city: string | null
  dest_state: string | null
  dest_zip: string | null
  pickup_date: string | null
  delivery_date: string | null
  customer_name: string | null
  carrier_name: string | null
  carrier_mc: string | null
  equipment: string | null
  weight: number | null
  rate_sell: number | null
  rate_cost: number | null
  current_location: string | null
  eta: string | null
  last_status_note: string | null
  raw: unknown | null
  received_at: string
  updated_at: string
  created_at: string
}

export interface ShipmentEvent {
  id: string
  shipment_id: string
  event_type: string
  status: string | null
  location: string | null
  note: string | null
  occurred_at: string
  raw: unknown | null
  created_at: string
}

// High-level status buckets used for the board and KPI tiles.
export type StatusBucket =
  | "new"
  | "booked"
  | "in_transit"
  | "delivered"
  | "exception"
  | "cancelled"

export interface ShipmentsSummary {
  total: number
  buckets: Record<StatusBucket, number>
  needsCoverage: number
  inTransit: number
  deliveredToday: number
  marginAtRisk: number
  totalMargin: number
  lastReceivedAt: string | null
}

export interface ShipmentsResponse {
  shipments: Shipment[]
  summary: ShipmentsSummary
  connected: boolean
  error?: string
}

const NORMALIZE: Record<string, StatusBucket> = {
  new: "new",
  quote: "new",
  quoted: "new",
  open: "new",
  uncovered: "new",
  tender: "new",
  tendered: "booked",
  booked: "booked",
  dispatched: "booked",
  assigned: "booked",
  covered: "booked",
  scheduled: "booked",
  in_transit: "in_transit",
  "in transit": "in_transit",
  intransit: "in_transit",
  transit: "in_transit",
  picked_up: "in_transit",
  "picked up": "in_transit",
  enroute: "in_transit",
  "en route": "in_transit",
  out_for_delivery: "in_transit",
  arrived: "in_transit",
  delivered: "delivered",
  completed: "delivered",
  pod: "delivered",
  invoiced: "delivered",
  exception: "exception",
  delayed: "exception",
  problem: "exception",
  hold: "exception",
  detained: "exception",
  cancelled: "cancelled",
  canceled: "cancelled",
  voided: "cancelled",
}

export function statusBucket(raw: string | null | undefined): StatusBucket {
  if (!raw) return "new"
  const key = raw.trim().toLowerCase()
  return NORMALIZE[key] ?? "in_transit"
}
