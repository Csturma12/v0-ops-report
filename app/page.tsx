"use client"

import { useState } from "react"
import { Header } from "@/components/freight/header"
import { SidebarNav } from "@/components/freight/sidebar-nav"
import { StatsCards } from "@/components/freight/stats-cards"
import { ShipmentsChart } from "@/components/freight/shipments-chart"
import { FleetStatus } from "@/components/freight/fleet-status"
import { RecentShipments } from "@/components/freight/recent-shipments"
import { DeliveryPerformance } from "@/components/freight/delivery-performance"
import { CarrierRankings } from "@/components/freight/carrier-rankings"
import { LiveActivity } from "@/components/freight/live-activity"
import { Button } from "@/components/ui/button"
import { Plus, Download, RefreshCw } from "lucide-react"

export default function FreightOpsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time overview of your freight operations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="text-sm hidden sm:inline-flex">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" className="text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Shipment
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <StatsCards />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2">
                <ShipmentsChart />
              </div>
              <FleetStatus />
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <RecentShipments />
              <DeliveryPerformance />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CarrierRankings />
              <LiveActivity />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
