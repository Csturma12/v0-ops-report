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
import type { OpsMetrics } from "@/lib/types/ops"
import type { SectionKey } from "@/components/freight/detail-drawer"

type NavItem = {
  name: string
  icon: typeof Zap
  section: SectionKey | null
  metricKey: keyof OpsMetrics | null
  badgeColor: string
}

const opsNavigation: NavItem[] = [
  { name: "Overview", icon: Zap, section: null, metricKey: null, badgeColor: "" },
  {
    name: "Action Items",
    icon: AlertTriangle,
    section: "urgent",
    metricKey: "urgent",
    badgeColor: "bg-yellow-500",
  },
  {
    name: "Uncovered Loads",
    icon: Truck,
    section: "uncovered",
    metricKey: "uncovered",
    badgeColor: "bg-emerald-500",
  },
  {
    name: "New Loads",
    icon: Plus,
    section: "newLoads",
    metricKey: "newLoads",
    badgeColor: "bg-blue-500",
  },
  {
    name: "Quote Requests",
    icon: FileQuestion,
    section: "quotes",
    metricKey: "quotes",
    badgeColor: "bg-purple-500",
  },
  {
    name: "Canceled Shipments",
    icon: XCircle,
    section: "cancels",
    metricKey: "cancels",
    badgeColor: "bg-orange-500",
  },
  {
    name: "Carrier Problems",
    icon: AlertOctagon,
    section: "critical",
    metricKey: "critical",
    badgeColor: "bg-red-500",
  },
  {
    name: "Tracking",
    icon: Radio,
    section: "tracking",
    metricKey: "tracking",
    badgeColor: "bg-cyan-500",
  },
  {
    name: "Billing",
    icon: DollarSign,
    section: "billingGaps",
    metricKey: "billingGaps",
    badgeColor: "bg-lime-500",
  },
]

const configNavigation = [
  { name: "Setup TAI Sync", icon: Zap, href: "/setup" },
  { name: "Settings", icon: Settings, href: "#" },
]

interface SidebarNavProps {
  open?: boolean
  onClose?: () => void
  metrics?: OpsMetrics
  activeSection?: SectionKey | null
  onSectionClick?: (section: SectionKey) => void
}

function SidebarContent({
  metrics,
  activeSection,
  onSectionClick,
  onMobileClose,
}: {
  metrics?: OpsMetrics
  activeSection?: SectionKey | null
  onSectionClick?: (section: SectionKey) => void
  onMobileClose?: () => void
}) {
  return (
    <>
      <div className="px-3 pt-4 lg:pt-6">
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          OPS
        </span>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {opsNavigation.map((item) => {
          const badgeValue =
            item.metricKey && metrics
              ? (metrics[item.metricKey] as number | undefined)
              : null
          const isActive =
            item.section === null
              ? activeSection == null
              : activeSection === item.section

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                if (item.section) {
                  onSectionClick?.(item.section)
                  onMobileClose?.()
                }
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
                item.section === null && "cursor-default",
              )}
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{item.name}</span>
              </span>
              {badgeValue != null && badgeValue > 0 && (
                <span
                  className={cn(
                    "min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium text-white px-1.5",
                    item.badgeColor,
                  )}
                >
                  {badgeValue}
                </span>
              )}
            </button>
          )
        })}
      </nav>

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
    </>
  )
}

export function SidebarNav({
  open,
  onClose,
  metrics,
  activeSection,
  onSectionClick,
}: SidebarNavProps) {
  return (
    <>
      <aside className="hidden md:flex w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex-col shrink-0">
        <SidebarContent
          metrics={metrics}
          activeSection={activeSection}
          onSectionClick={onSectionClick}
        />
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-end h-12 px-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4 text-sidebar-foreground" />
          </Button>
        </div>
        <SidebarContent
          metrics={metrics}
          activeSection={activeSection}
          onSectionClick={onSectionClick}
          onMobileClose={onClose}
        />
      </aside>
    </>
  )
}
