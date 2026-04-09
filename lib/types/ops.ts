// Ops data types for Mythos Freight Ops

export interface OpsMetrics {
  critical: number
  urgent: number
  uncovered: number
  newLoads: number
  quotes: number
  cancels: number
  tracking: number
  billingGaps: number
  lastSynced: string | null
}

export interface OpsDetails {
  criticalItems: AlertItem[]
  urgentItems: AlertItem[]
  uncoveredLoads: LoadItem[]
  newLoadItems: LoadItem[]
  quoteRequests: QuoteItem[]
  cancelledShipments: LoadItem[]
  trackingUpdates: TrackingItem[]
  billingGapItems: BillingItem[]
}

export interface AlertItem {
  id: string
  type: "carrier_problem" | "delay" | "exception" | "urgent"
  message: string
  loadId?: string
  source: "slack" | "tai" | "email"
  timestamp: string
  priority: "critical" | "high" | "medium" | "low"
}

export interface LoadItem {
  id: string
  origin: string
  destination: string
  pickupDate: string
  deliveryDate?: string
  carrier?: string
  status: "new" | "uncovered" | "booked" | "in_transit" | "delivered" | "cancelled"
  rate?: number
  weight?: number
  equipment?: string
  source: "tai" | "truckstop" | "email"
}

export interface QuoteItem {
  id: string
  subject: string
  from: string
  origin?: string
  destination?: string
  requestedDate?: string
  receivedAt: string
  status: "open" | "responded" | "won" | "lost"
  source: "email" | "slack"
}

export interface TrackingItem {
  id: string
  loadId: string
  status: string
  location?: string
  eta?: string
  updatedAt: string
  carrier?: string
}

export interface BillingItem {
  id: string
  loadId: string
  carrier: string
  carrierCost?: number
  sellPrice?: number
  issue: "no_sell_price" | "no_carrier_cost" | "margin_issue"
}

// Integration response types
export interface SlackSyncResult {
  alerts: AlertItem[]
  quoteDiscussions: QuoteItem[]
  messageCount: number
}

export interface GmailSyncResult {
  quoteRequests: QuoteItem[]
  bolCount: number
  unreadCount: number
}

export interface TAISyncResult {
  loads: LoadItem[]
  tracking: TrackingItem[]
  billingGaps: BillingItem[]
  alerts: AlertItem[]
}

export interface TruckstopSyncResult {
  postedLoads: LoadItem[]
  activePostings: number
}

export interface SyncResult {
  success: boolean
  timestamp: string
  metrics: OpsMetrics
  details?: OpsDetails
  errors?: string[]
}

// API response type
export interface OpsDataResponse {
  metrics: OpsMetrics
  details?: OpsDetails
  integrationStatus: IntegrationStatus
}

export interface IntegrationStatus {
  slack: ConnectionStatus
  gmail: ConnectionStatus
  tai: ConnectionStatus
  truckstop: ConnectionStatus
}

export interface ConnectionStatus {
  connected: boolean
  lastSync: string | null
  error?: string
}
