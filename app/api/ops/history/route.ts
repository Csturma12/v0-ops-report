import { NextResponse } from "next/server"
import { readHistory } from "@/lib/store/ops-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const points = await readHistory()
  return NextResponse.json({ points })
}
