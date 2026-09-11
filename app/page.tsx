"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { RefreshCw, CheckCircle2, AlertCircle, Truck, TrendingUp, PackageCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusTiles } from "@/components/shipments/status-tiles"
import { ShipmentsBoard } from "@/components/shipments/shipments-board"
import { ShipmentDetail } from "@/components/shipments/shipment-detail"
import type { ShipmentsResponse, StatusBucket } from "@/lib/types/shipment"

const fetcher = async (url: string): Promise<ShipmentsResponse> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.json() as Promise<ShipmentsResponse>
}

const EMPTY: ShipmentsResponse = {
  shipments: [],
  summary: {
    total: 0,
    buckets: { new: 0, booked: 0, in_transit: 0, delivered: 0, exception: 0, cancelled: 0 },
    needsCoverage: 0,
    inTransit: 0,
    deliveredToday: 0,
    marginAtRisk: 0,
    totalMargin: 0,
    lastReceivedAt: null,
  },
  connected: false,
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default function ShipmentsDashboard() {
  const [dateTime, setDateTime] = useState({ date: "", time: "" })
  const [filter, setFilter] = useState<StatusBucket | "all">("all")
  const [openId, setOpenId] = useState<string | null>(null)

  const { data, error, isLoading, isValidating, mutate } = useSWR<ShipmentsResponse>(
    "/api/shipments",
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true, keepPreviousData: true },
  )

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setDateTime({
        date: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }),
      })
    }
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  const view = data ?? EMPTY
  const { summary } = view
  const connected = view.connected

  const lastReceived = summary.lastReceivedAt
    ? `Last update ${new Date(summary.lastReceivedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : "Awaiting TAI data"

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-sky-400" />
              <h1 className="text-2xl font-bold uppercase tracking-tight text-foreground lg:text-3xl">
                Freight Ops
              </h1>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-sky-400">TAI Live Feed</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-yellow-500">{dateTime.date || "Loading…"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-yellow-500">{dateTime.time}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                {connected ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                )}
                <span>{connected ? "Supabase connected" : "Not connected"}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">{lastReceived}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load shipments. Retrying automatically.
          </div>
        )}

        {view.error && (
          <div className="mt-4 rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-500">
            {view.error}
          </div>
        )}

        {/* KPI highlights */}
        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi
            icon={AlertTriangle}
            tone="amber"
            label="Needs Coverage"
            value={summary.needsCoverage}
            loading={isLoading && !data}
          />
          <Kpi
            icon={Truck}
            tone="sky"
            label="In Transit"
            value={summary.inTransit}
            loading={isLoading && !data}
          />
          <Kpi
            icon={PackageCheck}
            tone="emerald"
            label="Delivered Today"
            value={summary.deliveredToday}
            loading={isLoading && !data}
          />
          <Kpi
            icon={TrendingUp}
            tone={summary.totalMargin >= 0 ? "emerald" : "red"}
            label="Total Margin"
            value={money(summary.totalMargin)}
            loading={isLoading && !data}
          />
        </div>

        {/* Status board */}
        <div className="mt-6">
          <StatusTiles
            summary={summary}
            active={filter}
            onSelect={setFilter}
            loading={isLoading && !data}
          />
        </div>

        <div className="mt-6">
          <ShipmentsBoard
            shipments={view.shipments}
            filter={filter}
            onOpen={setOpenId}
            loading={isLoading && !data}
          />
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground/60">
          Read-only view · Auto-refreshes every 30s · {view.shipments.length} shipments loaded
        </p>
      </main>

      {openId && <ShipmentDetail shipmentId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: "amber" | "sky" | "emerald" | "red"
  label: string
  value: number | string
  loading?: boolean
}) {
  const toneMap = {
    amber: "text-amber-300",
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    red: "text-red-300",
  }
  return (
    <div className="rounded border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneMap[tone]}`} />
        {label}
      </div>
      <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${toneMap[tone]}`}>
        {loading ? "—" : value}
      </p>
    </div>
  )
}
