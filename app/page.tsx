"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { RefreshCw, CheckCircle2, AlertCircle, Truck, TrendingUp, PackageCheck, AlertTriangle, Calculator, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusTiles } from "@/components/shipments/status-tiles"
import { ShipmentsBoard } from "@/components/shipments/shipments-board"
import { ShipmentDetail } from "@/components/shipments/shipment-detail"
import { RateQuotePanel } from "@/components/tai/rate-quote-panel"
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
  const [quoteOpen, setQuoteOpen] = useState(false)

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
    <div className="flex min-h-screen flex-col bg-background fn-grid">
      {/* Identity bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-foreground">
                Five Nines Logistics
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Control Tower · An agent of Primary Freight LLC · Houston, TX
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Dispatch Live
            </span>
          </span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Live Freight Feed</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground text-balance lg:text-3xl">
              Every load, one tolerance for failure.
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span>{dateTime.date || "Loading…"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{dateTime.time}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 font-mono text-[11px] text-muted-foreground">
                {connected ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                )}
                <span>{connected ? "Supabase connected" : "Not connected"}</span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{lastReceived}</p>
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setQuoteOpen(true)}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rate Quote</span>
            </Button>
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
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Failed to load shipments. Retrying automatically.
          </div>
        )}

        {view.error && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {view.error}
          </div>
        )}

        {/* KPI highlights */}
        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Kpi
            icon={AlertTriangle}
            tone={summary.needsCoverage > 0 ? "red" : "muted"}
            label="Needs Coverage"
            value={summary.needsCoverage}
            loading={isLoading && !data}
          />
          <Kpi
            icon={Truck}
            tone="ink"
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

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
          Read-only mirror · Auto-refreshes every 30s · {view.shipments.length} shipments loaded
        </p>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-foreground/60">
            Five Nines Logistics · MC# 841023
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-foreground/80">
            99.999% is a standard, not a slogan.
          </p>
        </div>
      </footer>

      {openId && <ShipmentDetail shipmentId={openId} onClose={() => setOpenId(null)} />}
      {quoteOpen && <RateQuotePanel onClose={() => setQuoteOpen(false)} />}
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
  tone: "red" | "ink" | "emerald" | "muted"
  label: string
  value: number | string
  loading?: boolean
}) {
  const toneMap = {
    red: "text-primary",
    ink: "text-foreground",
    emerald: "text-emerald-600",
    muted: "text-muted-foreground",
  }
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneMap[tone]}`} />
        {label}
      </div>
      <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${toneMap[tone]}`}>
        {loading ? "—" : value}
      </p>
    </div>
  )
}
