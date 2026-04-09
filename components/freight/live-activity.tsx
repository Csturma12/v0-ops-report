"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Package, CheckCircle, AlertTriangle, Clock } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "delivered",
    message: "Shipment SHP-8835 delivered to Boston, MA",
    time: "2 min ago",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    id: 2,
    type: "dispatch",
    message: "Truck TRK-442 dispatched from LA hub",
    time: "5 min ago",
    icon: Truck,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    id: 3,
    type: "alert",
    message: "Delay alert: SHP-8832 running 30 min late",
    time: "8 min ago",
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    id: 4,
    type: "pickup",
    message: "Shipment SHP-8843 picked up from Seattle",
    time: "12 min ago",
    icon: Package,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    id: 5,
    type: "schedule",
    message: "Maintenance scheduled for TRK-398",
    time: "15 min ago",
    icon: Clock,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
]

export function LiveActivity() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-foreground">Live Activity</CardTitle>
          <Badge variant="outline" className="text-xs border-success/30 text-success bg-success/10">
            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${activity.bgColor}`}>
              <activity.icon className={`h-4 w-4 ${activity.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-tight">{activity.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
