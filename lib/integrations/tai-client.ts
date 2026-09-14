// Direct TAI Cloud Public API client (polling).
//
// Auth: the Public API authenticates with the `x-api-key` header
// (confirmed in the swagger securityDefinitions). The V1 rate-quote body
// additionally requires an `authenticationKey` field, which maps to the
// second provisioned credential.
//
// NOTE: TAI allowlists caller IPs. Requests from this app's server may return
// 401 until TAI authorizes this deployment's egress IP. The client surfaces
// that state honestly rather than throwing so the UI can explain it.

const TAI_BASE_URL = (process.env.TAI_API_URL || "https://atl.taicloud.net").replace(/\/+$/, "")
const TAI_API_KEY = process.env.TAI_API_KEY
const TAI_AUTH_KEY = process.env.TAI_AUTHORIZATION_KEY

export type TAIResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; hint?: string }

export function taiConfigured(): boolean {
  return Boolean(TAI_API_KEY)
}

export function taiAuthKey(): string {
  return TAI_AUTH_KEY || ""
}

function hintForStatus(status: number): string | undefined {
  if (status === 401 || status === 403) {
    return "TAI rejected the credentials for this request. This is typically IP allowlisting — TAI must authorize this deployment's server IP, or the key lacks Public API access."
  }
  if (status === 404) return "TAI has no record for that identifier."
  if (status === 429) return "TAI rate limit hit. Back off and retry."
  return undefined
}

async function taiFetch<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<TAIResult<T>> {
  if (!TAI_API_KEY) {
    return { ok: false, status: 0, error: "TAI_API_KEY is not configured" }
  }

  const url = `${TAI_BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "x-api-key": TAI_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error reaching TAI"
    return { ok: false, status: 0, error: msg, hint: "Could not reach TAI. Check TAI_API_URL and network egress." }
  }

  const raw = await res.text()
  let parsed: unknown = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
  }

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object"
        ? JSON.stringify(parsed).slice(0, 500)
        : String(parsed || res.statusText)
    return {
      ok: false,
      status: res.status,
      error: `TAI ${res.status}: ${detail || res.statusText}`,
      hint: hintForStatus(res.status),
    }
  }

  return { ok: true, status: res.status, data: parsed as T }
}

// --- Endpoints -------------------------------------------------------------

/** GET /PublicApi/Shipping/v2/Shipments/{shipmentId} — full shipment detail. */
export function getShipmentDetail<T = unknown>(shipmentId: string): Promise<TAIResult<T>> {
  return taiFetch<T>(`/PublicApi/Shipping/v2/Shipments/${encodeURIComponent(shipmentId)}`, {
    method: "GET",
  })
}

/** GET /PublicApi/Location/v2/ShipmentLocationHistory/{shipmentId} — tracking breadcrumbs. */
export function getTracking<T = unknown>(shipmentId: string): Promise<TAIResult<T>> {
  return taiFetch<T>(
    `/PublicApi/Location/v2/ShipmentLocationHistory/${encodeURIComponent(shipmentId)}`,
    { method: "GET" },
  )
}

/** PUT /publicapi/shipping/getRateQuote — LTL rate quote (returns carrier options). */
export function getRateQuote<T = unknown>(body: Record<string, unknown>): Promise<TAIResult<T>> {
  const payload = { authenticationKey: taiAuthKey(), ...body }
  return taiFetch<T>(`/publicapi/shipping/getRateQuote`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
