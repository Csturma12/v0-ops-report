// Live shipment detail straight from TAI (bypasses Supabase). Read-only.
import { NextResponse } from "next/server"
import { getShipmentDetail } from "@/lib/integrations/tai-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_req: Request, { params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params
  const result = await getShipmentDetail(shipmentId)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, status: result.status, error: result.error, hint: result.hint },
      { status: 200 },
    )
  }

  return NextResponse.json({ ok: true, status: result.status, shipment: result.data }, { status: 200 })
}
