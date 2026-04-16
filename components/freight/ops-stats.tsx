"use client"

import type { OpsMetrics } from "@/lib/types/ops"
import type { SectionKey } from "@/components/freight/detail-drawer"

interface OpsStatsProps {
  metrics?: OpsMetrics
  loading?: boolean
  onSectionClick?: (section: SectionKey) => void
}

const statConfig: {
  key: SectionKey
  label: string
  sublabel: string
  color: string
}[] = [
  { key: "critical", label: "CRITICAL", sublabel: "act now", color: "text-red-500" },
  { key: "urgent", label: "URGENT", sublabel: "tonight/AM", color: "text-yellow-500" },
  { key: "uncovered", label: "UNCOVERED", sublabel: "need carrier", color: "text-emerald-500" },
  { key: "newLoads", label: "NEW LOADS", sublabel: "incoming", color: "text-blue-500" },
  { key: "quotes", label: "QUOTES", sublabel: "open RFQs", color: "text-purple-500" },
  { key: "cancels", label: "CANCELS", sublabel: "carrier", color: "text-gray-400" },
  { key: "tracking", label: "TRACKING", sublabel: "in motion", color: "text-cyan-500" },
  { key: "billingGaps", label: "BILLING GAPS", sublabel: "no sell price", color: "text-lime-500" },
]

const defaultMetrics: OpsMetrics = {
  critical: 0,
  urgent: 0,
  uncovered: 0,
  newLoads: 0,
  quotes: 0,
  cancels: 0,
  tracking: 0,
  billingGaps: 0,
  lastSynced: null,
}

export function OpsStats({
  metrics = defaultMetrics,
  loading = false,
  onSectionClick,
}: OpsStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden">
      {statConfig.map((stat) => {
        const value = metrics[stat.key as keyof OpsMetrics]
        const displayValue = typeof value === "number" ? value : 0
        return (
          <button
            key={stat.key}
            type="button"
            onClick={() => onSectionClick?.(stat.key)}
            className="bg-card p-3 flex flex-col text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
            aria-label={`Open ${stat.label} details, ${displayValue} items`}
          >
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {stat.label}
            </span>
            <span
              className={`text-3xl font-bold ${stat.color} mt-1 ${
                loading ? "animate-pulse" : ""
              }`}
            >
              {loading ? "-" : displayValue}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {stat.sublabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
