"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Zap,
  AlertTriangle,
  Truck,
  Plus,
  FileQuestion,
  XCircle,
  AlertOctagon,
  Radio,
  DollarSign,
  Settings,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const opsNavigation = [
  { name: "Overview", icon: Zap, current: true, badge: null, badgeColor: "" },
  { name: "Action Items", icon: AlertTriangle, current: false, badge: 3, badgeColor: "bg-yellow-500" },
  { name: "Uncovered Loads", icon: Truck, current: false, badge: 10, badgeColor: "bg-emerald-500" },
  { name: "New Loads", icon: Plus, current: false, badge: 5, badgeColor: "bg-blue-500" },
  { name: "Quote Requests", icon: FileQuestion, current: false, badge: 1, badgeColor: "bg-purple-500" },
  { name: "Canceled Shipments", icon: XCircle, current: false, badge: 8, badgeColor: "bg-orange-500" },
  { name: "Carrier Problems", icon: AlertOctagon, current: false, badge: 2, badgeColor: "bg-pink-500" },
  { name: "Tracking", icon: Radio, current: false, badge: 4, badgeColor: "bg-cyan-500" },
  { name: "Billing", icon: DollarSign, current: false, badge: 2, badgeColor: "bg-lime-500" },
]

const configNavigation = [
  { name: "Setup TAI Sync", icon: Zap, href: "/setup" },
  { name: "Settings", icon: Settings, href: "#" },
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
          "lg:relative lg:translate-x-0 lg:z-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-end h-12 px-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4 text-sidebar-foreground" />
          </Button>
        </div>

        {/* OPS Section */}
        <div className="px-3 pt-4 lg:pt-6">
          <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            OPS
          </span>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {opsNavigation.map((item) => (
            <button
              key={item.name}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                item.current
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{item.name}</span>
              </span>
              {item.badge !== null && (
                <span
                  className={cn(
                    "min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium text-white",
                    item.badgeColor
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* CONFIG Section */}
        <div className="px-3 pt-2">
          <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            CONFIG
          </span>
        </div>

        <div className="py-2 px-2 space-y-0.5 pb-6">
          {configNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
