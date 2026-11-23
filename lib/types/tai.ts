// Types for the TAI V1 LTL rate quote (getRateQuote), mirrored from the
// swagger definitions RateQuoteRequest / RateQuoteResponse.

export const PACKAGING_TYPES = [
  "Pallet",
  "Box",
  "Crate",
  "Carton",
  "Drum",
  "Bundle",
  "Roll",
  "Skid",
  "Piece",
  "Bag",
  "Case",
  "Loose",
] as const

export const FREIGHT_CLASSES = [
  "50",
  "55",
  "60",
  "65",
  "70",
  "77.5",
  "85",
  "92.5",
  "100",
  "110",
  "125",
  "150",
  "175",
  "200",
  "250",
  "300",
  "400",
  "500",
] as const

export interface QuoteCommodity {
  handlingQuantity: number
  packagingType: string
  weightTotal: number
  freightClass: string
  length?: number
  width?: number
  height?: number
  description?: string
  hazardousMaterial?: boolean
}

export interface RateQuoteFormState {
  originZipCode: string
  destinationZipCode: string
  commodities: QuoteCommodity[]
  accessorialCodes: string[]
}

export interface RateQuoteOption {
  carrierSCAC?: string
  carrierName?: string
  tariffDescription?: string
  transitTime?: number
  serviceLevel?: string
  priceLineHaul?: number
  priceFuelSurcharge?: number
  priceInsurance?: number
  priceTotal?: number
  apiQuoteNumber?: string
  pricingInstructions?: string
}

export interface RateQuoteApiResponse {
  ok: boolean
  status: number
  quotes: RateQuoteOption[]
  error?: string
  hint?: string
}
