"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/freight/sidebar-nav"
import { OpsStats } from "@/components/freight/ops-stats"
import { AIBrief } from "@/components/freight/ai-brief"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function OpsOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dateTime, setDateTime] = useState({ date: "", time: "" })

  // Set date/time on client only to avoid hydration mismatch
  useEffect(() => {
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
  }, [])

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
            {/* Page Title */}
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

            {/* Stats Cards */}
            <div className="mt-6">
              <OpsStats />
            </div>

            {/* AI Brief Section */}
            <AIBrief />
          </main>
        </div>
      </div>
    </div>
  )
}
