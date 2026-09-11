// Read-only single-shipment endpoint: returns the shipment plus its event
// timeline from the TAI-fed Supabase tables. Never writes.
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import type { Shipment, ShipmentEvent } from "@/lib/types/shipment"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shipmentId: string }> },
) {
  const { shipmentId } = await params

  try {
    const supabase = getSupabaseAdmin()

    const [shipmentRes, eventsRes] = await Promise.all([
      supabase.from("shipments").select("*").eq("shipment_id", shipmentId).maybeSingle(),
      supabase
        .from("shipment_events")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("occurred_at", { ascending: false })
        .limit(200),
    ])

    if (shipmentRes.error) {
      return NextResponse.json({ error: shipmentRes.error.message }, { status: 500 })
    }
    if (!shipmentRes.data) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        shipment: shipmentRes.data as Shipment,
        events: (eventsRes.data ?? []) as ShipmentEvent[],
      },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
