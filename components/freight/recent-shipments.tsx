"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, MapPin, ArrowRight } from "lucide-react"

const shipments = [
  {
    id: "SHP-8842",
    origin: "Los Angeles, CA",
    destination: "Chicago, IL",
    status: "in-transit",
    eta: "2h 15m",
    progress: 75,
    carrier: "Swift Trans",
  },
  {
    id: "SHP-8841",
    origin: "Seattle, WA",
    destination: "Denver, CO",
    status: "in-transit",
    eta: "5h 30m",
    progress: 45,
    carrier: "Prime Freight",
  },
  {
    id: "SHP-8840",
    origin: "Miami, FL",
    destination: "Atlanta, GA",
    status: "loading",
    eta: "8h 00m",
    progress: 10,
    carrier: "Atlantic Cargo",
  },
  {
    id: "SHP-8839",
    origin: "New York, NY",
    destination: "Boston, MA",
    status: "delivered",
    eta: "Completed",
    progress: 100,
    carrier: "Northeast Express",
  },
  {
    id: "SHP-8838",
    origin: "Houston, TX",
    destination: "Phoenix, AZ",
    status: "in-transit",
    eta: "4h 45m",
    progress: 60,
    carrier: "Desert Route",
  },
]

const statusStyles = {
  "in-transit": "bg-chart-1/20 text-chart-1 border-chart-1/30",
  loading: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  delivered: "bg-success/20 text-success border-success/30",
  delayed: "bg-destructive/20 text-destructive border-destructive/30",
}

export function RecentShipments() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">Recent Shipments</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {shipments.map((shipment) => (
          <div
            key={shipment.id}
            className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-medium text-foreground">{shipment.id}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      statusStyles[shipment.status as keyof typeof statusStyles]
                    }`}
                  >
                    {shipment.status.replace("-", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{shipment.origin}</span>
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{shipment.destination}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-foreground">{shipment.eta}</p>
                <p className="text-xs text-muted-foreground">{shipment.carrier}</p>
              </div>
            </div>
            <div className="mt-3 h-1 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-chart-1 rounded-full transition-all"
                style={{ width: `${shipment.progress}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
