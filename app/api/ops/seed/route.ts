// Seed the store with live ops data from the latest Slack report.
// Refuses to overwrite existing data unless ?force=1 is passed.
import { NextRequest, NextResponse } from "next/server"
import { readSnapshot, writeSnapshot } from "@/lib/store/ops-store"
import { liveMetrics, liveDetails, reportDate } from "@/lib/data/ops-report-2024-04-23"

export const dynamic = "force-dynamic"

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

  const ok = await writeSnapshot({
    metrics: liveMetrics,
    details: liveDetails,
    source: "claude",
    updatedAt: reportDate,
  })

  return NextResponse.json({
    success: ok,
    message: ok
      ? "Live ops data loaded (Thu Apr 23). Refresh the dashboard to see current action items."
      : "Redis not configured - could not persist data.",
  })
}
