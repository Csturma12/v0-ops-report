// LTL rate quote via TAI getRateQuote. Validates input server-side, injects
// the auth key from env (never trusted from the client), and normalizes the
// response into a compact list of carrier options.
import { NextResponse } from "next/server"
import { getRateQuote } from "@/lib/integrations/tai-client"
import type { QuoteCommodity, RateQuoteApiResponse, RateQuoteOption } from "@/lib/types/tai"

export const dynamic = "force-dynamic"
export const revalidate = 0

const ZIP_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/

function bad(message: string) {
  return NextResponse.json(
    { ok: false, status: 400, quotes: [], error: message } satisfies RateQuoteApiResponse,
    { status: 200 },
  )
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad("Invalid JSON body.")
  }

  const input = body as {
    originZipCode?: string
    destinationZipCode?: string
    commodities?: QuoteCommodity[]
    accessorialCodes?: string[]
  }

  const origin = (input.originZipCode || "").trim()
  const dest = (input.destinationZipCode || "").trim()
  if (!ZIP_RE.test(origin)) return bad("Enter a valid origin ZIP/postal code.")
  if (!ZIP_RE.test(dest)) return bad("Enter a valid destination ZIP/postal code.")

  const commodities = Array.isArray(input.commodities) ? input.commodities : []
  if (commodities.length === 0) return bad("Add at least one commodity.")

  const cleaned = commodities.map((c) => {
    const qty = Number(c.handlingQuantity)
    const weight = Number(c.weightTotal)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Handling quantity must be a positive number.")
    if (!Number.isFinite(weight) || weight <= 0) throw new Error("Weight must be a positive number.")
    return {
      handlingQuantity: Math.floor(qty),
      packagingType: c.packagingType || "Pallet",
      weightTotal: weight,
      freightClass: c.freightClass || "No Class",
      length: c.length ? Number(c.length) : undefined,
      width: c.width ? Number(c.width) : undefined,
      height: c.height ? Number(c.height) : undefined,
      description: c.description || undefined,
      hazardousMaterial: Boolean(c.hazardousMaterial),
    }
  })

  let payload
  try {
    payload = {
      originZipCode: origin,
      originCountry: "USA",
      destinationZipCode: dest,
      destinationCountry: "USA",
      weightUnits: "lbs",
      dimensionUnits: "in",
      commodities: cleaned,
      accessorialCodes: Array.isArray(input.accessorialCodes) ? input.accessorialCodes : [],
    }
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Invalid commodity data.")
  }

  const result = await getRateQuote<RateQuoteOption[] | RateQuoteOption>(payload)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, status: result.status, quotes: [], error: result.error, hint: result.hint } satisfies RateQuoteApiResponse,
      { status: 200 },
    )
  }

  const raw = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
  const quotes: RateQuoteOption[] = raw
    .map((q) => ({
      carrierSCAC: q.carrierSCAC,
      carrierName: q.carrierName,
      tariffDescription: q.tariffDescription,
      transitTime: q.transitTime,
      serviceLevel: q.serviceLevel,
      priceLineHaul: q.priceLineHaul,
      priceFuelSurcharge: q.priceFuelSurcharge,
      priceInsurance: q.priceInsurance,
      priceTotal: q.priceTotal,
      apiQuoteNumber: q.apiQuoteNumber,
      pricingInstructions: q.pricingInstructions,
    }))
    .sort((a, b) => (a.priceTotal ?? Infinity) - (b.priceTotal ?? Infinity))

  return NextResponse.json(
    { ok: true, status: result.status, quotes } satisfies RateQuoteApiResponse,
    { status: 200 },
  )
}
