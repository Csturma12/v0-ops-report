"use client"

import type { OpsMetrics } from "@/lib/types/ops"

interface OpsStatsProps {
  metrics?: OpsMetrics
  loading?: boolean
}

const statConfig = [
  { key: "critical", label: "CRITICAL", sublabel: "act now", color: "text-red-500" },
  { key: "urgent", label: "URGENT", sublabel: "tonight/AM", color: "text-yellow-500" },
  { key: "uncovered", label: "UNCOVERED", sublabel: "need carrier", color: "text-emerald-500" },
  { key: "newLoads", label: "NEW LOADS", sublabel: "incoming", color: "text-blue-500" },
  { key: "quotes", label: "QUOTES", sublabel: "open RFQs", color: "text-purple-500" },
  { key: "cancels", label: "CANCELS", sublabel: "carrier", color: "text-gray-500" },
  { key: "tracking", label: "TRACKING", sublabel: "in motion", color: "text-cyan-500" },
  { key: "billingGaps", label: "BILLING GAPS", sublabel: "no sell price", color: "text-lime-500" },
] as const

const defaultMetrics: OpsMetrics = {
  critical: 0,
  urgent: 3,
  uncovered: 10,
  newLoads: 5,
  quotes: 1,
  cancels: 0,
  tracking: 4,
  billingGaps: 2,
  lastSynced: null,
}

export function OpsStats({ metrics = defaultMetrics, loading = false }: OpsStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden">
      {statConfig.map((stat) => {
        const value = metrics[stat.key as keyof OpsMetrics]
        return (
          <div
            key={stat.key}
            className="bg-card p-3 flex flex-col"
          >
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {stat.label}
            </span>
            <span className={`text-3xl font-bold ${stat.color} mt-1 ${loading ? "animate-pulse" : ""}`}>
              {loading ? "-" : (typeof value === "number" ? value : 0)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {stat.sublabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
