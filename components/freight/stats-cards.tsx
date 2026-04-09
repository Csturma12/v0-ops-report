"use client"

import { Truck, Package, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const stats = [
  {
    label: "Active Shipments",
    value: "1,284",
    change: "+12.5%",
    trend: "up",
    icon: Package,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    label: "Fleet On Route",
    value: "847",
    change: "+8.2%",
    trend: "up",
    icon: Truck,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    label: "Avg Delivery Time",
    value: "2.4 days",
    change: "-0.3 days",
    trend: "up",
    icon: Clock,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    label: "On-Time Rate",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    icon: TrendingUp,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs ${
                stat.trend === "up" ? "text-success" : "text-destructive"
              }`}>
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
