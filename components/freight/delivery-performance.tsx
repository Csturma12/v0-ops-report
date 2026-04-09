"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

const data = [
  { day: "Mon", onTime: 94, delayed: 6 },
  { day: "Tue", onTime: 91, delayed: 9 },
  { day: "Wed", onTime: 96, delayed: 4 },
  { day: "Thu", onTime: 89, delayed: 11 },
  { day: "Fri", onTime: 95, delayed: 5 },
  { day: "Sat", onTime: 97, delayed: 3 },
  { day: "Sun", onTime: 93, delayed: 7 },
]

export function DeliveryPerformance() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium text-foreground">Delivery Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Weekly on-time rate</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">On Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Delayed</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" vertical={false} />
              <XAxis
                dataKey="day"
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
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.02 260)",
                  border: "1px solid oklch(0.28 0.02 260)",
                  borderRadius: "8px",
                  color: "oklch(0.95 0 0)",
                }}
                formatter={(value: number) => [`${value}%`]}
              />
              <Bar dataKey="onTime" stackId="a" fill="oklch(0.7 0.15 160)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="delayed" stackId="a" fill="oklch(0.55 0.22 25)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
