"use client"

import { useState, useEffect, useCallback } from "react"
import { SidebarNav } from "@/components/freight/sidebar-nav"
import { OpsStats } from "@/components/freight/ops-stats"
import { AIBrief } from "@/components/freight/ai-brief"
import { ManualEntryForm } from "@/components/freight/manual-entry-form"
import { Button } from "@/components/ui/button"
import { Menu, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import type { OpsDataResponse, OpsMetrics } from "@/lib/types/ops"

export default function OpsOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dateTime, setDateTime] = useState({ date: "", time: "" })
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<OpsDataResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch ops data (try manual endpoint first, fall back to integrations)
  const fetchData = useCallback(async () => {
    try {
      // First check for manually entered data
      const manualRes = await fetch("/api/ops/manual")
      const manualData = await manualRes.json()
      
      if (manualData.success && manualData.metrics) {
        setData({
          metrics: manualData.metrics,
          integrationStatus: {
            slack: { connected: false, lastSync: null },
            gmail: { connected: false, lastSync: null },
            tai: { connected: true, lastSync: manualData.metrics.lastUpdated },
            truckstop: { connected: false, lastSync: null },
          }
        })
        setError(null)
        setIsLoading(false)
        return
      }

      // Fall back to integration data
      const res = await fetch("/api/ops/data")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch and auto-refresh every 5 minutes
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Set date/time on client only to avoid hydration mismatch
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
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Manual sync trigger
  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch("/api/sync", { method: "POST" })
      await fetchData()
    } catch (err) {
      console.error("Sync failed:", err)
    } finally {
      setSyncing(false)
    }
  }, [fetchData])

  // Manual entry save handler
  const handleManualSave = useCallback((metrics: OpsMetrics) => {
    setData(prev => ({
      metrics,
      details: prev?.details,
      integrationStatus: prev?.integrationStatus ?? {
        slack: { connected: false, lastSync: null },
        gmail: { connected: false, lastSync: null },
        tai: { connected: false, lastSync: null },
        truckstop: { connected: false, lastSync: null },
      }
    }))
  }, [])

  // Format last synced time
  const lastSyncedText = data?.metrics.lastSynced
    ? `Last synced: ${new Date(data.metrics.lastSynced).toLocaleTimeString()}`
    : "Not synced yet"

  // Count connected integrations
  const connectedCount = data?.integrationStatus
    ? Object.values(data.integrationStatus).filter(s => s.connected).length
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
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
            {/* Page Title with Sync Controls */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight uppercase">
                  OPS OVERVIEW
                </h1>

                {/* Subtitle with metadata */}
                <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-blue-400">Mythos</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-yellow-500">{dateTime.date || "Loading..."}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-yellow-500">{dateTime.time}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>Primary Companies / Blackbox Logistics</span>
                </p>
              </div>

              {/* Sync Status & Refresh */}
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
                <ManualEntryForm 
                  currentMetrics={data?.metrics} 
                  onSave={handleManualSave} 
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Sync</span>
                </Button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                Failed to load ops data. Please try refreshing.
              </div>
            )}

            {/* Stats Cards */}
            <div className="mt-6">
              <OpsStats metrics={data?.metrics} loading={isLoading} />
            </div>

            {/* Integration Status (small) */}
            {data?.integrationStatus && (
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider">Streams from:</span>
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

            {/* AI Brief Section */}
            <AIBrief metrics={data?.metrics} />
          </main>
        </div>
      </div>
    </div>
  )
}
