"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const fleetData = [
  { label: "In Transit", value: 847, total: 1200, color: "bg-chart-1" },
  { label: "Loading", value: 156, total: 1200, color: "bg-chart-2" },
  { label: "Unloading", value: 89, total: 1200, color: "bg-chart-3" },
  { label: "Maintenance", value: 42, total: 1200, color: "bg-chart-4" },
  { label: "Available", value: 66, total: 1200, color: "bg-chart-5" },
]

export function FleetStatus() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">Fleet Status</CardTitle>
          <span className="text-xs text-muted-foreground">1,200 vehicles</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fleetData.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full transition-all`}
                style={{ width: `${(item.value / item.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
