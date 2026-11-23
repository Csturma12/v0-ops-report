"use client"

import type { ShipmentsSummary, StatusBucket } from "@/lib/types/shipment"
import { bucketStyle } from "@/components/shipments/status-badge"

const ORDER: StatusBucket[] = ["new", "booked", "in_transit", "delivered", "exception", "cancelled"]

interface Props {
  summary: ShipmentsSummary
  active: StatusBucket | "all"
  onSelect: (bucket: StatusBucket | "all") => void
  loading?: boolean
}

export function StatusTiles({ summary, active, onSelect, loading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      <button
        type="button"
        onClick={() => onSelect("all")}
        className={`flex flex-col items-start rounded border px-3 py-2.5 text-left transition-colors ${
          active === "all"
            ? "border-foreground/40 bg-foreground/5"
            : "border-border bg-card hover:border-foreground/20"
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">All Loads</span>
        <span className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
          {loading ? "—" : summary.total}
        </span>
      </button>

      {ORDER.map((bucket) => {
        const style = bucketStyle(bucket)
        const count = summary.buckets[bucket]
        const isActive = active === bucket
        return (
          <button
            key={bucket}
            type="button"
            onClick={() => onSelect(bucket)}
            className={`flex flex-col items-start rounded border px-3 py-2.5 text-left transition-colors ${
              isActive ? "border-foreground/40 bg-foreground/5" : "border-border bg-card hover:border-foreground/20"
            }`}
          >
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <span className={`mt-1 font-mono text-2xl font-bold tabular-nums ${count > 0 ? style.text : "text-muted-foreground/50"}`}>
              {loading ? "—" : count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
