// Connectivity check for the direct TAI polling integration.
// Probes a cheap authenticated endpoint so the UI can report whether TAI
// is reachable and whether this app's IP is allowlisted.
import { NextResponse } from "next/server"
import { getShipmentDetail, taiConfigured } from "@/lib/integrations/tai-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  if (!taiConfigured()) {
    return NextResponse.json(
      { configured: false, reachable: false, message: "TAI_API_KEY is not configured." },
      { status: 200 },
    )
  }

  // Probe with a numeric id that won't exist: 401/403 = auth/allowlist failure;
  // 404 (or any non-auth status like a validation 400) means credentials were
  // accepted and we got past auth — i.e. reachable + authorized.
  const probe = await getShipmentDetail("0")
  const authFailedProbe = probe.status === 401 || probe.status === 403

  if (probe.ok || (probe.status > 0 && !authFailedProbe)) {
    return NextResponse.json(
      { configured: true, reachable: true, authorized: true, message: "TAI reachable and authorized." },
      { status: 200 },
    )
  }

  const authFailed = probe.status === 401 || probe.status === 403
  return NextResponse.json(
    {
      configured: true,
      reachable: probe.status !== 0,
      authorized: false,
      status: probe.status,
      message: authFailed
        ? "TAI rejected this app's credentials — likely IP allowlisting. Data will flow once TAI authorizes this deployment's server IP."
        : probe.error,
      hint: probe.hint,
    },
    { status: 200 },
  )
}
