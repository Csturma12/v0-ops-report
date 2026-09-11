"use client"

import { useState } from "react"
import useSWR from "swr"
import { X, MapPin, Truck, Package, DollarSign, Clock, Satellite, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Shipment, ShipmentEvent } from "@/lib/types/shipment"
import { StatusBadge } from "@/components/shipments/status-badge"

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load shipment")
  return res.json()
}

function money(n: number | null) {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function when(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function lane(s: Shipment) {
  const o = [s.origin_city, s.origin_state].filter(Boolean).join(", ") || "Unknown origin"
  const d = [s.dest_city, s.dest_state].filter(Boolean).join(", ") || "Unknown dest"
  return `${o}  →  ${d}`
}

export function ShipmentDetail({ shipmentId, onClose }: { shipmentId: string; onClose: () => void }) {
  const { data, isLoading } = useSWR<{ shipment: Shipment; events: ShipmentEvent[] }>(
    `/api/shipments/${encodeURIComponent(shipmentId)}`,
    fetcher,
    { refreshInterval: 30_000 },
  )

  const shipment = data?.shipment
  const events = data?.events ?? []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              {shipment?.ref_number || shipment?.shipment_id || shipmentId}
            </p>
            <p className="text-xs text-muted-foreground">Shipment detail</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-4">
          {isLoading && !shipment ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !shipment ? (
            <p className="text-sm text-muted-foreground">Shipment not found.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={shipment.status} />
                {shipment.eta && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> ETA {when(shipment.eta)}
                  </span>
                )}
              </div>

              <div className="rounded border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{lane(shipment)}</span>
                </div>
                {shipment.current_location && (
                  <p className="mt-1.5 pl-5 text-xs text-sky-300">Currently: {shipment.current_location}</p>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field icon={Package} label="Customer" value={shipment.customer_name} />
                <Field icon={Truck} label="Carrier" value={shipment.carrier_name} />
                <Field label="Equipment" value={shipment.equipment} />
                <Field label="Weight" value={shipment.weight ? `${shipment.weight.toLocaleString()} lbs` : null} />
                <Field label="Pickup" value={when(shipment.pickup_date)} />
                <Field label="Delivery" value={when(shipment.delivery_date)} />
                <Field label="BOL" value={shipment.bol_number} />
                <Field label="PRO" value={shipment.pro_number} />
                <Field icon={DollarSign} label="Sell" value={money(shipment.rate_sell)} />
                <Field icon={DollarSign} label="Cost" value={money(shipment.rate_cost)} />
                <Field
                  label="Margin"
                  value={
                    shipment.rate_sell !== null && shipment.rate_cost !== null
                      ? money(shipment.rate_sell - shipment.rate_cost)
                      : null
                  }
                />
                <Field label="MC #" value={shipment.carrier_mc} />
              </dl>

              {shipment.last_status_note && (
                <div className="rounded border border-border bg-background/40 p-3 text-sm text-foreground">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Latest note</p>
                  {shipment.last_status_note}
                </div>
              )}

              <div>
                <h3 className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Event Timeline ({events.length})
                </h3>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events recorded yet.</p>
                ) : (
                  <ol className="space-y-0">
                    {events.map((e, i) => (
                      <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                          {i < events.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {e.status || e.event_type}
                          </p>
                          {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                          {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
                          <p className="mt-0.5 text-[10px] text-muted-foreground/70">{when(e.occurred_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <LiveTaiSection shipmentId={shipment.shipment_id || shipmentId} />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

type LiveState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; status: number; message: string }
  | { phase: "ok"; detail: unknown; tracking: unknown }

function LiveTaiSection({ shipmentId }: { shipmentId: string }) {
  const [state, setState] = useState<LiveState>({ phase: "idle" })

  async function pull() {
    setState({ phase: "loading" })
    try {
      const [d, t] = await Promise.all([
        fetch(`/api/tai/shipment/${encodeURIComponent(shipmentId)}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/tai/tracking/${encodeURIComponent(shipmentId)}`, { cache: "no-store" }).then((r) => r.json()),
      ])
      if (!d.ok && !t.ok) {
        setState({
          phase: "error",
          status: d.status ?? 0,
          message: d.hint || d.error || "TAI request failed.",
        })
        return
      }
      setState({ phase: "ok", detail: d.ok ? d.shipment : null, tracking: t.ok ? t.tracking : null })
    } catch {
      setState({ phase: "error", status: 0, message: "Could not reach the TAI proxy." })
    }
  }

  return (
    <div className="rounded border border-sky-500/20 bg-sky-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-sky-300">
          <Satellite className="h-3 w-3" />
          Live from TAI
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={pull}
          disabled={state.phase === "loading"}
        >
          {state.phase === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Satellite className="h-3 w-3" />}
          {state.phase === "loading" ? "Polling…" : "Poll TAI now"}
        </Button>
      </div>

      {state.phase === "idle" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fetch the latest detail and tracking directly from TAI for this shipment.
        </p>
      )}

      {state.phase === "error" && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-500">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {state.status === 401 || state.status === 403 ? "TAI rejected credentials — " : ""}
            {state.message}
          </span>
        </div>
      )}

      {state.phase === "ok" && (
        <div className="mt-2 space-y-2">
          {state.detail !== null && (
            <details className="text-xs" open>
              <summary className="cursor-pointer text-muted-foreground">Shipment detail (raw)</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/60 p-2 font-mono text-[10px] text-foreground">
                {JSON.stringify(state.detail, null, 2)}
              </pre>
            </details>
          )}
          {state.tracking !== null && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Tracking / location history (raw)</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/60 p-2 font-mono text-[10px] text-foreground">
                {JSON.stringify(state.tracking, null, 2)}
              </pre>
            </details>
          )}
          {state.detail === null && state.tracking === null && (
            <p className="text-xs text-muted-foreground">TAI returned no data for this shipment.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-foreground">{value || "—"}</dd>
    </div>
  )
}
