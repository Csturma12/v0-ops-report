// TAI TMS API Integration Client
import type { LoadItem, TrackingItem, BillingItem, AlertItem, TAISyncResult } from "@/lib/types/ops"

const TAI_API_URL = process.env.TAI_API_URL || "https://api.tai-software.com/v2"
const TAI_API_KEY = process.env.TAI_API_KEY
const TAI_COMPANY_ID = process.env.TAI_COMPANY_ID

interface TAIShipment {
  shipmentId: string
  origin: { city: string; state: string }
  destination: { city: string; state: string }
  pickupDate: string
  deliveryDate?: string
  carrier?: { name: string; mcNumber: string }
  status: string
  rate?: { sell?: number; cost?: number }
  weight?: number
  equipment?: string
  alerts?: Array<{ type: string; message: string; createdAt: string }>
  tracking?: { status: string; location?: string; eta?: string; updatedAt: string }
}

async function taiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!TAI_API_KEY) {
    throw new Error("TAI_API_KEY is not configured")
  }

  const response = await fetch(`${TAI_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${TAI_API_KEY}`,
      "Content-Type": "application/json",
      "X-Company-Id": TAI_COMPANY_ID || "",
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`TAI API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function mapTAIStatus(taiStatus: string): LoadItem["status"] {
  const statusMap: Record<string, LoadItem["status"]> = {
    "NEW": "new",
    "PENDING": "uncovered",
    "BOOKED": "booked",
    "DISPATCHED": "booked",
    "IN_TRANSIT": "in_transit",
    "DELIVERED": "delivered",
    "CANCELLED": "cancelled",
  }
  return statusMap[taiStatus?.toUpperCase()] || "new"
}

function mapTAIAlertPriority(type: string): AlertItem["priority"] {
  if (type.includes("CRITICAL") || type.includes("URGENT")) return "critical"
  if (type.includes("HIGH") || type.includes("DELAY")) return "high"
  if (type.includes("MEDIUM")) return "medium"
  return "low"
}

export async function syncTAI(): Promise<TAISyncResult> {
  try {
    // Fetch all active shipments
    const shipments = await taiRequest<{ data: TAIShipment[] }>("/shipments?status=active&limit=500")
    
    const loads: LoadItem[] = []
    const tracking: TrackingItem[] = []
    const billingGaps: BillingItem[] = []
    const alerts: AlertItem[] = []

    for (const shipment of shipments.data || []) {
      // Map to LoadItem
      const load: LoadItem = {
        id: shipment.shipmentId,
        origin: `${shipment.origin.city}, ${shipment.origin.state}`,
        destination: `${shipment.destination.city}, ${shipment.destination.state}`,
        pickupDate: shipment.pickupDate,
        deliveryDate: shipment.deliveryDate,
        carrier: shipment.carrier?.name,
        status: mapTAIStatus(shipment.status),
        rate: shipment.rate?.sell,
        weight: shipment.weight,
        equipment: shipment.equipment,
        source: "tai",
      }
      loads.push(load)

      // Extract tracking updates
      if (shipment.tracking) {
        tracking.push({
          id: `${shipment.shipmentId}-tracking`,
          loadId: shipment.shipmentId,
          status: shipment.tracking.status,
          location: shipment.tracking.location,
          eta: shipment.tracking.eta,
          updatedAt: shipment.tracking.updatedAt,
          carrier: shipment.carrier?.name,
        })
      }

      // Check for billing gaps
      if (!shipment.rate?.sell) {
        billingGaps.push({
          id: `${shipment.shipmentId}-billing`,
          loadId: shipment.shipmentId,
          carrier: shipment.carrier?.name || "Unassigned",
          carrierCost: shipment.rate?.cost,
          sellPrice: shipment.rate?.sell,
          issue: "no_sell_price",
        })
      }

      // Extract alerts
      if (shipment.alerts) {
        for (const alert of shipment.alerts) {
          alerts.push({
            id: `${shipment.shipmentId}-alert-${alert.createdAt}`,
            type: alert.type.includes("CARRIER") ? "carrier_problem" : 
                  alert.type.includes("DELAY") ? "delay" : "exception",
            message: alert.message,
            loadId: shipment.shipmentId,
            source: "tai",
            timestamp: alert.createdAt,
            priority: mapTAIAlertPriority(alert.type),
          })
        }
      }
    }

    return { loads, tracking, billingGaps, alerts }
  } catch (error) {
    console.error("[TAI Sync Error]", error)
    throw error
  }
}

export function isConfigured(): boolean {
  return Boolean(TAI_API_KEY && TAI_COMPANY_ID)
}
