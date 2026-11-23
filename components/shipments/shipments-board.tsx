"use client"

import { useMemo, useState } from "react"
import { Search, ArrowRight } from "lucide-react"
import type { Shipment, StatusBucket } from "@/lib/types/shipment"
import { statusBucket } from "@/lib/types/shipment"
import { StatusBadge } from "@/components/shipments/status-badge"

function lane(s: Shipment) {
  const o = [s.origin_city, s.origin_state].filter(Boolean).join(", ") || "—"
  const d = [s.dest_city, s.dest_state].filter(Boolean).join(", ") || "—"
  return { o, d }
}

function money(n: number | null) {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function shortDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function relative(iso: string | null) {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  shipments: Shipment[]
  filter: StatusBucket | "all"
  onOpen: (shipmentId: string) => void
  loading?: boolean
}

export function ShipmentsBoard({ shipments, filter, onOpen, loading }: Props) {
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shipments.filter((s) => {
      if (filter !== "all" && statusBucket(s.status) !== filter) return false
      if (!q) return true
      const hay = [
        s.shipment_id,
        s.ref_number,
        s.bol_number,
        s.pro_number,
        s.customer_name,
        s.carrier_name,
        s.origin_city,
        s.dest_city,
        s.dest_state,
        s.origin_state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [shipments, filter, query])

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
          Live Shipments
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
            {rows.length}
          </span>
        </h2>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ref, customer, carrier, lane…"
            className="h-8 w-full rounded border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {loading && shipments.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading shipments…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {shipments.length === 0
              ? "No shipments received from TAI yet."
              : "No shipments match this filter."}
          </p>
          {shipments.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Data appears here as the TAI relay pushes it into Supabase.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Ref</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Lane</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Customer</th>
                <th className="hidden px-4 py-2 font-medium lg:table-cell">Carrier</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Pickup</th>
                <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Margin</th>
                <th className="px-4 py-2 text-right font-medium">Updated</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const { o, d } = lane(s)
                const margin =
                  s.rate_sell !== null && s.rate_cost !== null ? s.rate_sell - s.rate_cost : null
                return (
                  <tr
                    key={s.id}
                    onClick={() => onOpen(s.shipment_id)}
                    className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {s.ref_number || s.shipment_id}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs text-foreground">
                        <span>{o}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span>{d}</span>
                      </span>
                      {s.current_location && (
                        <span className="mt-0.5 block font-mono text-[11px] text-sky-600">{s.current_location}</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                      {s.customer_name || "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                      {s.carrier_name || "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
                      {shortDate(s.pickup_date)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right lg:table-cell">
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          margin === null
                            ? "text-muted-foreground/60"
                            : margin <= 0
                              ? "text-primary"
                              : "text-emerald-600"
                        }`}
                      >
                        {money(margin)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">
                      {relative(s.updated_at)}
                    </td>
                    <td className="px-2 py-2.5">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
