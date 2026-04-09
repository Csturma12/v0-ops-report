"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, TrendingUp, TrendingDown } from "lucide-react"

const carriers = [
  {
    name: "Swift Trans",
    initials: "ST",
    rating: 4.9,
    deliveries: "2,847",
    onTime: "98.2%",
    trend: "up",
    color: "bg-chart-1",
  },
  {
    name: "Prime Freight",
    initials: "PF",
    rating: 4.8,
    deliveries: "2,156",
    onTime: "96.8%",
    trend: "up",
    color: "bg-chart-2",
  },
  {
    name: "Atlantic Cargo",
    initials: "AC",
    rating: 4.7,
    deliveries: "1,923",
    onTime: "95.4%",
    trend: "down",
    color: "bg-chart-3",
  },
  {
    name: "Northeast Express",
    initials: "NE",
    rating: 4.6,
    deliveries: "1,654",
    onTime: "94.1%",
    trend: "up",
    color: "bg-chart-4",
  },
  {
    name: "Desert Route",
    initials: "DR",
    rating: 4.5,
    deliveries: "1,432",
    onTime: "93.7%",
    trend: "down",
    color: "bg-chart-5",
  },
]

export function CarrierRankings() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">Top Carriers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {carriers.map((carrier, index) => (
          <div
            key={carrier.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-medium text-muted-foreground w-4">
              {index + 1}
            </span>
            <Avatar className="h-9 w-9">
              <AvatarFallback className={`${carrier.color} text-primary-foreground text-xs font-medium`}>
                {carrier.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{carrier.name}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-chart-4 fill-chart-4" />
                  <span className="text-xs text-muted-foreground">{carrier.rating}</span>
                </div>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{carrier.deliveries} deliveries</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {carrier.onTime}
              </Badge>
              {carrier.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
