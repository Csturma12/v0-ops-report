"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { SidebarNav } from "@/components/freight/sidebar-nav"
import { OpsStats } from "@/components/freight/ops-stats"
import { AIBrief } from "@/components/freight/ai-brief"
import { ManualEntryForm } from "@/components/freight/manual-entry-form"
import { PasteReportDialog } from "@/components/freight/paste-report-dialog"
import {
  DetailDrawer,
  type SectionKey,
} from "@/components/freight/detail-drawer"
import { Button } from "@/components/ui/button"
import { Menu, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import type { OpsDataResponse, OpsMetrics } from "@/lib/types/ops"
import type { OpsHistoryPoint } from "@/lib/store/ops-store"

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.json() as Promise<T>
}

export default function OpsOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dateTime, setDateTime] = useState({ date: "", time: "" })
  const [syncing, setSyncing] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)

  // SWR auto-refreshes every 60s so the site picks up new hourly data quickly.
  const { data, error, isLoading, mutate } = useSWR<OpsDataResponse>(
    "/api/ops/data",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  )

  // History (last 24 hourly points) for the trend sparkline inside the drawer.
  const { data: historyData, mutate: mutateHistory } = useSWR<{
    points: OpsHistoryPoint[]
  }>("/api/ops/history", fetcher, {
    refreshInterval: 60_000,
    keepPreviousData: true,
  })

  // Client-only clock to avoid hydration mismatch.
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setDateTime({
        date: now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short",
        }),
      })
    }
    updateTime()
    const interval = setInterval(updateTime, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch("/api/sync", { method: "POST" })
      await Promise.all([mutate(), mutateHistory()])
    } catch (err) {
      console.error("[v0] Sync failed:", err)
    } finally {
      setSyncing(false)
    }
  }, [mutate, mutateHistory])

  const handleSeedDemo = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/seed", { method: "POST" })
      if (res.ok) {
        await Promise.all([mutate(), mutateHistory()])
      }
    } catch (err) {
      console.error("[v0] Seed failed:", err)
    }
  }, [mutate, mutateHistory])

  const handleManualSave = useCallback(
    async (metrics: OpsMetrics) => {
      await fetch("/api/ops/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...metrics, source: "manual" }),
      })
      await Promise.all([mutate(), mutateHistory()])
    },
    [mutate, mutateHistory],
  )

  const metrics = data?.metrics
  const lastSyncedText = metrics?.lastSynced
    ? `Last synced: ${new Date(metrics.lastSynced).toLocaleTimeString()}`
    : "Waiting for first sync"

  const connectedCount = data?.integrationStatus
    ? Object.values(data.integrationStatus).filter((s) => s.connected).length
    : 0

  const activeCount =
    activeSection && metrics
      ? (metrics[activeSection] as number | undefined) ?? 0
      : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <SidebarNav
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          metrics={metrics}
          activeSection={activeSection}
          onSectionClick={setActiveSection}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden flex items-center h-12 px-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight uppercase">
                  OPS OVERVIEW
                </h1>
                <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-blue-400">Mythos</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-yellow-500">
                    {dateTime.date || "Loading..."}
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-yellow-500">{dateTime.time}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>Primary Companies / Blackbox Logistics</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {connectedCount > 0 ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                    )}
                    <span>{connectedCount}/4 integrations</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {lastSyncedText}
                  </p>
                </div>
                <PasteReportDialog
                  onIngested={async () => {
                    await Promise.all([mutate(), mutateHistory()])
                  }}
                />
                <ManualEntryForm
                  currentMetrics={metrics}
                  onSave={handleManualSave}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Sync</span>
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                Failed to load ops data. Please try refreshing.
              </div>
            )}

            {!isLoading && metrics && !metrics.lastSynced && (
              <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      No data yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      When your hourly Claude report hits Slack, copy the full
                      message and click{" "}
                      <span className="text-foreground font-medium">
                        Paste Claude Report
                      </span>{" "}
                      above. Or load sample data to preview the dashboard.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleSeedDemo}
                  >
                    Load Sample Data
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <OpsStats
                metrics={metrics}
                loading={isLoading && !data}
                onSectionClick={setActiveSection}
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Tip: click any metric to review the underlying items.
              </p>
            </div>

            {data?.integrationStatus && (
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider">
                  Streams from:
                </span>
                {Object.entries(data.integrationStatus).map(([name, status]) => (
                  <span
                    key={name}
                    className={`px-1.5 py-0.5 rounded ${
                      status.connected
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            <AIBrief metrics={metrics} />
          </main>
        </div>
      </div>

      <DetailDrawer
        section={activeSection}
        details={data?.details}
        count={activeCount}
        lastUpdated={metrics?.lastSynced}
        history={historyData?.points}
        onClose={() => setActiveSection(null)}
      />
    </div>
  )
}
