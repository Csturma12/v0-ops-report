// Truckstop Load Board API Integration Client
import type { LoadItem, TruckstopSyncResult } from "@/lib/types/ops"

const TRUCKSTOP_API_KEY = process.env.TRUCKSTOP_API_KEY
const TRUCKSTOP_USERNAME = process.env.TRUCKSTOP_USERNAME
const TRUCKSTOP_PASSWORD = process.env.TRUCKSTOP_PASSWORD

const TRUCKSTOP_API_URL = "https://api.truckstop.com/v2"

interface TruckstopLoad {
  loadId: string
  origin: { city: string; state: string; postalCode?: string }
  destination: { city: string; state: string; postalCode?: string }
  pickupDate: string
  deliveryDate?: string
  rate?: number
  weight?: number
  equipment: string
  status: string
  postedAt: string
}

interface TruckstopAuthResponse {
  access_token: string
  expires_in: number
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  if (!TRUCKSTOP_API_KEY || !TRUCKSTOP_USERNAME || !TRUCKSTOP_PASSWORD) {
    throw new Error("Truckstop credentials not configured")
  }

  const response = await fetch(`${TRUCKSTOP_API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": TRUCKSTOP_API_KEY,
    },
    body: JSON.stringify({
      username: TRUCKSTOP_USERNAME,
      password: TRUCKSTOP_PASSWORD,
    }),
  })

  if (!response.ok) {
    throw new Error(`Truckstop auth error: ${response.status} ${response.statusText}`)
  }

  const data: TruckstopAuthResponse = await response.json()
  
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }

  return cachedToken.token
}

async function truckstopRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()

  const response = await fetch(`${TRUCKSTOP_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-API-Key": TRUCKSTOP_API_KEY || "",
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Truckstop API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function mapTruckstopLoad(load: TruckstopLoad): LoadItem {
  return {
    id: load.loadId,
    origin: `${load.origin.city}, ${load.origin.state}`,
    destination: `${load.destination.city}, ${load.destination.state}`,
    pickupDate: load.pickupDate,
    deliveryDate: load.deliveryDate,
    status: load.status === "ACTIVE" ? "uncovered" : "new",
    rate: load.rate,
    weight: load.weight,
    equipment: load.equipment,
    source: "truckstop",
  }
}

export async function syncTruckstop(): Promise<TruckstopSyncResult> {
  try {
    // Get all posted loads
    const response = await truckstopRequest<{ loads: TruckstopLoad[]; total: number }>(
      "/loads?status=ACTIVE&limit=100"
    )

    const postedLoads = (response.loads || []).map(mapTruckstopLoad)

    return {
      postedLoads,
      activePostings: response.total || postedLoads.length,
    }
  } catch (error) {
    console.error("[Truckstop Sync Error]", error)
    throw error
  }
}

export function isConfigured(): boolean {
  return Boolean(TRUCKSTOP_API_KEY && TRUCKSTOP_USERNAME && TRUCKSTOP_PASSWORD)
}
