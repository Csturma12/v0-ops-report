import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Read-only server client. RLS is enabled on the shipment tables with no anon
// policies, so all reads go through the service-role key on the server only.
// This app NEVER writes to Supabase — the TAI relay (hosted on Fly) owns writes.
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase server credentials are not configured")
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
