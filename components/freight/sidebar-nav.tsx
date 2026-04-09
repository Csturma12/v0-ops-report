"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  Users,
  Settings,
  MapPin,
  FileText,
  HelpCircle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, current: true },
  { name: "Shipments", icon: Package, current: false, badge: "1,284" },
  { name: "Fleet", icon: Truck, current: false, badge: "847" },
  { name: "Tracking", icon: MapPin, current: false },
  { name: "Analytics", icon: BarChart3, current: false },
  { name: "Carriers", icon: Users, current: false },
  { name: "Documents", icon: FileText, current: false },
]

const secondaryNavigation = [
  { name: "Settings", icon: Settings },
  { name: "Help & Support", icon: HelpCircle },
]

interface SidebarNavProps {
  open?: boolean
  onClose?: () => void
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Mythos</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-sidebar-foreground" />
          </Button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                item.current
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-sidebar-accent text-sidebar-foreground"
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-sidebar-border py-4 px-3 space-y-1">
          {secondaryNavigation.map((item) => (
            <button
              key={item.name}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
