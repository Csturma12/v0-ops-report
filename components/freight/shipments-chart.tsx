"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { time: "12h ago", shipments: 1180, delivered: 1050 },
  { time: "10h ago", shipments: 1220, delivered: 1100 },
  { time: "8h ago", shipments: 1350, delivered: 1180 },
  { time: "6h ago", shipments: 1280, delivered: 1150 },
  { time: "4h ago", shipments: 1420, delivered: 1280 },
  { time: "2h ago", shipments: 1380, delivered: 1220 },
  { time: "Now", shipments: 1284, delivered: 1190 },
]

export function ShipmentsChart() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium text-foreground">Shipment Volume</CardTitle>
            <p className="text-2xl font-bold text-foreground mt-1">1,284</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-chart-1" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-chart-2" />
              <span className="text-xs text-muted-foreground">Delivered</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="shipmentsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 30)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.65 0.2 30)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.18 220)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.6 0.18 220)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="oklch(0.65 0 0)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.65 0 0)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.02 260)",
                  border: "1px solid oklch(0.28 0.02 260)",
                  borderRadius: "8px",
                  color: "oklch(0.95 0 0)",
                }}
              />
              <Area
                type="monotone"
                dataKey="shipments"
                stroke="oklch(0.65 0.2 30)"
                strokeWidth={2}
                fill="url(#shipmentsGradient)"
              />
              <Area
                type="monotone"
                dataKey="delivered"
                stroke="oklch(0.6 0.18 220)"
                strokeWidth={2}
                fill="url(#deliveredGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
