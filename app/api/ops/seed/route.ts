// Seed the store with realistic sample data so users can preview the dashboard
// (including drawer item lists) before the Claude job starts sending real data.
// Refuses to overwrite existing data unless ?force=1 is passed.
import { NextRequest, NextResponse } from "next/server"
import { readSnapshot, writeSnapshot } from "@/lib/store/ops-store"
import type { OpsDetails } from "@/lib/types/ops"

export const dynamic = "force-dynamic"

const now = () => new Date().toISOString()

function buildSampleDetails(): OpsDetails {
  const recent = (mins: number) =>
    new Date(Date.now() - mins * 60_000).toISOString()

  return {
    criticalItems: [],
    urgentItems: [
      {
        id: "a1",
        type: "urgent",
        message:
          "Carrier running 3 hours late to pickup in Dallas - driver stuck in traffic",
        loadId: "L-44821",
        source: "slack",
        timestamp: recent(22),
        priority: "high",
      },
      {
        id: "a2",
        type: "delay",
        message: "Shipper requesting earlier pickup window - move from 4pm to 1pm",
        loadId: "L-44833",
        source: "email",
        timestamp: recent(48),
        priority: "high",
      },
      {
        id: "a3",
        type: "exception",
        message: "Detention fees accruing at consignee - no one at dock",
        loadId: "L-44799",
        source: "tai",
        timestamp: recent(90),
        priority: "high",
      },
    ],
    uncoveredLoads: [
      {
        id: "u1",
        origin: "Dallas, TX",
        destination: "Atlanta, GA",
        pickupDate: "Tomorrow 8am",
        deliveryDate: "Fri 2pm",
        status: "uncovered",
        rate: 2850,
        equipment: "Dry Van 53'",
        source: "tai",
      },
      {
        id: "u2",
        origin: "Los Angeles, CA",
        destination: "Phoenix, AZ",
        pickupDate: "Thu 10am",
        status: "uncovered",
        rate: 1200,
        equipment: "Reefer",
        source: "tai",
      },
      {
        id: "u3",
        origin: "Chicago, IL",
        destination: "Nashville, TN",
        pickupDate: "Thu 2pm",
        status: "uncovered",
        rate: 1950,
        equipment: "Dry Van 53'",
        source: "truckstop",
      },
      {
        id: "u4",
        origin: "Seattle, WA",
        destination: "Portland, OR",
        pickupDate: "Fri 9am",
        status: "uncovered",
        rate: 850,
        equipment: "Flatbed",
        source: "tai",
      },
    ],
    newLoadItems: [
      {
        id: "n1",
        origin: "Houston, TX",
        destination: "New Orleans, LA",
        pickupDate: "Fri 11am",
        status: "new",
        rate: 1450,
        equipment: "Dry Van 53'",
        source: "tai",
      },
      {
        id: "n2",
        origin: "Denver, CO",
        destination: "Kansas City, MO",
        pickupDate: "Sat 7am",
        status: "new",
        rate: 2100,
        source: "email",
      },
    ],
    quoteRequests: [
      {
        id: "q1",
        subject: "RFQ: 5 loads LA → Chicago next week",
        from: "ops@acme-foods.com",
        origin: "Los Angeles, CA",
        destination: "Chicago, IL",
        receivedAt: recent(35),
        status: "open",
        source: "email",
      },
    ],
    cancelledShipments: [],
    trackingUpdates: [
      {
        id: "t1",
        loadId: "L-44765",
        status: "In transit",
        location: "Amarillo, TX",
        eta: "Tomorrow 10am",
        updatedAt: recent(12),
        carrier: "Swift Transportation",
      },
      {
        id: "t2",
        loadId: "L-44772",
        status: "At pickup",
        location: "Phoenix, AZ",
        eta: "Today 3pm",
        updatedAt: recent(18),
        carrier: "Knight-Swift",
      },
      {
        id: "t3",
        loadId: "L-44781",
        status: "In transit",
        location: "Flagstaff, AZ",
        eta: "Tomorrow 8am",
        updatedAt: recent(30),
        carrier: "Werner",
      },
      {
        id: "t4",
        loadId: "L-44788",
        status: "Delivered",
        location: "Atlanta, GA",
        updatedAt: recent(60),
        carrier: "Schneider",
      },
    ],
    billingGapItems: [
      {
        id: "b1",
        loadId: "L-44701",
        carrier: "Landstar",
        carrierCost: 1800,
        issue: "no_sell_price",
      },
      {
        id: "b2",
        loadId: "L-44712",
        carrier: "CH Robinson",
        carrierCost: 2200,
        sellPrice: 2300,
        issue: "margin_issue",
      },
    ],
  }
}

export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1"

  if (!force) {
    const existing = await readSnapshot()
    if (existing && existing.source !== "sync") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Existing data found. Pass ?force=1 to overwrite (this will replace the current snapshot).",
        },
        { status: 409 },
      )
    }
  }

  const timestamp = now()
  const details = buildSampleDetails()

  const ok = await writeSnapshot({
    metrics: {
      critical: details.criticalItems.length,
      urgent: details.urgentItems.length,
      uncovered: details.uncoveredLoads.length,
      newLoads: details.newLoadItems.length,
      quotes: details.quoteRequests.length,
      cancels: details.cancelledShipments.length,
      tracking: details.trackingUpdates.length,
      billingGaps: details.billingGapItems.length,
      lastSynced: timestamp,
    },
    details,
    source: "manual",
    updatedAt: timestamp,
  })

  return NextResponse.json({
    success: ok,
    message: ok
      ? "Sample data loaded. Refresh the dashboard or click any card to explore."
      : "Redis not configured - could not persist sample data.",
  })
}
