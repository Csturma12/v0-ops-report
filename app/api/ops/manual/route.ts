import { NextRequest, NextResponse } from "next/server"
import type { OpsMetrics } from "@/lib/types/ops"

// Store metrics in memory (in production, use a database)
let storedMetrics: OpsMetrics & { lastUpdated: string } | null = null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the incoming data
    const metrics: OpsMetrics = {
      critical: parseInt(body.critical) || 0,
      urgent: parseInt(body.urgent) || 0,
      uncovered: parseInt(body.uncovered) || 0,
      newLoads: parseInt(body.newLoads) || 0,
      quotes: parseInt(body.quotes) || 0,
      cancels: parseInt(body.cancels) || 0,
      tracking: parseInt(body.tracking) || 0,
      billingGaps: parseInt(body.billingGaps) || 0,
    }

    storedMetrics = {
      ...metrics,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ 
      success: true, 
      metrics: storedMetrics,
      message: "Data synced from TAI successfully!"
    })
  } catch (error) {
    console.error("Manual sync error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save metrics" },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!storedMetrics) {
    return NextResponse.json({ 
      success: false, 
      metrics: null,
      message: "No data yet - use the bookmarklet on TAI to sync"
    })
  }

  return NextResponse.json({ 
    success: true, 
    metrics: storedMetrics 
  })
}
