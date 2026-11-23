// Primary Freight dashboard data source.
//
// Reads live freight data from the Supabase tables that the Primary Freight
// dashboard populates via the TAI relay (`loads`, `shipments`,
// `shipment_events`) and maps them into the ops metrics + drawer detail lists.
//
// Uses the Supabase REST API (PostgREST) directly with the service-role key,
// so no extra client dependency is required. Server-only — the service-role
// key must never reach the browser.
import type {
  OpsDetails,
  LoadItem,
  TrackingItem,
  BillingItem,
  AlertItem,
} from "@/lib/types/ops"

function getConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ""), key }
}

async function rest<T>(query: string): Promise<T> {
  const config = getConfig()
  if (!config) throw new Error("Supabase not configured")
  const res = await fetch(`${config.url}/rest/v1/${query}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Supabase REST ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

interface LoadRow {
  id: string
  external_id: string | null
  reference: string | null
  status: string | null
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  pickup_date: string | null
  delivery_date: string | null
  equipment: string | null
  weight_lbs: number | null
  rate_usd: number | null
  booked_by_company: string | null
  booked_at: string | null
  posted_at: string | null
  updated_at: string | null
}

interface ShipmentRow {
  id: string
  shipment_id: string | null
  ref_number: string | null
  status: string | null
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  pickup_date: string | null
  delivery_date: string | null
  customer_name: string | null
  carrier_name: string | null
  equipment: string | null
  weight: number | null
  rate_sell: number | null
  rate_cost: number | null
  current_location: string | null
  eta: string | null
  last_status_note: string | null
  updated_at: string | null
}

interface ShipmentEventRow {
  id: string
  shipment_id: string | null
  event_type: string | null
  status: string | null
  location: string | null
  note: string | null
  occurred_at: string | null
  created_at: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function place(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(", ") || "Unknown"
}

function fmtDate(value: string | null): string {
  if (!value) return "TBD"
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Buckets a load into exactly one dashboard category so counts never overlap.
type LoadBucket = "new" | "uncovered" | "booked" | "cancelled"

function classifyLoad(row: LoadRow): LoadBucket {
  const s = (row.status ?? "").toLowerCase()
  if (/cancel/.test(s)) return "cancelled"
  if (
    row.booked_at ||
    /(book|cover|assign|tender|accept|dispatch|transit|deliver)/.test(s)
  ) {
    return "booked"
  }
  // Not yet covered. Recently posted (last 24h) counts as a "new" load;
  // anything older that still lacks a carrier is "uncovered".
  const postedRecently =
    row.posted_at && Date.now() - new Date(row.posted_at).getTime() < DAY_MS
  if (postedRecently || /(new|created)/.test(s)) return "new"
  return "uncovered"
}

function toLoadItem(row: LoadRow, status: LoadItem["status"]): LoadItem {
  return {
    id: row.reference || row.external_id || row.id,
    origin: place(row.origin_city, row.origin_state),
    destination: place(row.dest_city, row.dest_state),
    pickupDate: fmtDate(row.pickup_date),
    deliveryDate: row.delivery_date ? fmtDate(row.delivery_date) : undefined,
    carrier: row.booked_by_company ?? undefined,
    status,
    rate: row.rate_usd != null ? Number(row.rate_usd) : undefined,
    weight: row.weight_lbs ?? undefined,
    equipment: row.equipment ?? undefined,
    source: "tai",
  }
}

// A shipment is "in motion" (tracking) unless it's already delivered/cancelled.
function isTracking(row: ShipmentRow): boolean {
  const s = (row.status ?? "").toLowerCase()
  return !/(deliver|cancel|complete|closed)/.test(s)
}

function toTrackingItem(row: ShipmentRow): TrackingItem {
  return {
    id: row.id,
    loadId: row.ref_number || row.shipment_id || row.id,
    status: row.last_status_note || row.status || "In transit",
    location: row.current_location ?? undefined,
    eta: row.eta ? fmtDate(row.eta) : undefined,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    carrier: row.carrier_name ?? undefined,
  }
}

// Flags shipments with missing pricing (a billing gap the team must resolve).
function toBillingGap(row: ShipmentRow): BillingItem | null {
  const sell = row.rate_sell != null ? Number(row.rate_sell) : null
  const cost = row.rate_cost != null ? Number(row.rate_cost) : null
  let issue: BillingItem["issue"] | null = null
  if (sell == null || sell === 0) issue = "no_sell_price"
  else if (cost == null || cost === 0) issue = "no_carrier_cost"
  else if (sell - cost <= 0) issue = "margin_issue"
  if (!issue) return null
  return {
    id: `${row.id}-billing`,
    loadId: row.ref_number || row.shipment_id || row.id,
    carrier: row.carrier_name || "Unassigned",
    carrierCost: cost ?? undefined,
    sellPrice: sell ?? undefined,
    issue,
  }
}

// Turns a shipment exception/tracking event into an alert, or null for
// routine events that don't need operator attention.
function toAlert(row: ShipmentEventRow): AlertItem | null {
  const haystack = `${row.event_type ?? ""} ${row.status ?? ""} ${
    row.note ?? ""
  }`.toLowerCase()

  const critical =
    /(exception|critical|refus|reject|damage|accident|breakdown|missed|lost|stolen|claim)/.test(
      haystack,
    )
  const urgent = /(delay|late|detention|hold|reschedul|reconsign|problem)/.test(
    haystack,
  )
  if (!critical && !urgent) return null

  return {
    id: row.id,
    type: critical ? "exception" : "delay",
    message:
      row.note ||
      `${row.event_type ?? "Event"}${row.location ? ` at ${row.location}` : ""}`,
    loadId: row.shipment_id ?? undefined,
    source: "tai",
    timestamp: row.occurred_at || row.created_at || new Date().toISOString(),
    priority: critical ? "critical" : "high",
  }
}

export interface PrimaryFreightSync {
  details: OpsDetails
  rowCounts: { loads: number; shipments: number; events: number }
}

export async function syncPrimaryFreight(): Promise<PrimaryFreightSync> {
  const [loadRows, shipmentRows, eventRows] = await Promise.all([
    rest<LoadRow[]>(
      "loads?select=id,external_id,reference,status,origin_city,origin_state,dest_city,dest_state,pickup_date,delivery_date,equipment,weight_lbs,rate_usd,booked_by_company,booked_at,posted_at,updated_at&order=updated_at.desc&limit=1000",
    ),
    rest<ShipmentRow[]>(
      "shipments?select=id,shipment_id,ref_number,status,origin_city,origin_state,dest_city,dest_state,pickup_date,delivery_date,customer_name,carrier_name,equipment,weight,rate_sell,rate_cost,current_location,eta,last_status_note,updated_at&order=updated_at.desc&limit=1000",
    ),
    rest<ShipmentEventRow[]>(
      "shipment_events?select=id,shipment_id,event_type,status,location,note,occurred_at,created_at&order=occurred_at.desc&limit=500",
    ),
  ])

  const uncoveredLoads: LoadItem[] = []
  const newLoadItems: LoadItem[] = []
  const cancelledShipments: LoadItem[] = []

  for (const row of loadRows) {
    const bucket = classifyLoad(row)
    if (bucket === "uncovered")
      uncoveredLoads.push(toLoadItem(row, "uncovered"))
    else if (bucket === "new") newLoadItems.push(toLoadItem(row, "new"))
    else if (bucket === "cancelled")
      cancelledShipments.push(toLoadItem(row, "cancelled"))
  }

  const trackingUpdates: TrackingItem[] = []
  const billingGapItems: BillingItem[] = []

  for (const row of shipmentRows) {
    if (isTracking(row)) trackingUpdates.push(toTrackingItem(row))
    const gap = toBillingGap(row)
    if (gap) billingGapItems.push(gap)
  }

  const criticalItems: AlertItem[] = []
  const urgentItems: AlertItem[] = []

  for (const row of eventRows) {
    const alert = toAlert(row)
    if (!alert) continue
    if (alert.priority === "critical") criticalItems.push(alert)
    else urgentItems.push(alert)
  }

  const details: OpsDetails = {
    criticalItems,
    urgentItems,
    uncoveredLoads,
    newLoadItems,
    // No quote/RFQ source exists in the freight tables yet, so this stays empty.
    quoteRequests: [],
    cancelledShipments,
    trackingUpdates,
    billingGapItems,
  }

  return {
    details,
    rowCounts: {
      loads: loadRows.length,
      shipments: shipmentRows.length,
      events: eventRows.length,
    },
  }
}

export function isConfigured(): boolean {
  return getConfig() !== null
}
