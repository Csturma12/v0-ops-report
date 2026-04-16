"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type {
  AlertItem,
  BillingItem,
  LoadItem,
  OpsDetails,
  QuoteItem,
  TrackingItem,
} from "@/lib/types/ops"
import { AlertTriangle, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparkline } from "./sparkline"
import type { OpsHistoryPoint } from "@/lib/store/ops-store"

export type SectionKey =
  | "critical"
  | "urgent"
  | "uncovered"
  | "newLoads"
  | "quotes"
  | "cancels"
  | "tracking"
  | "billingGaps"

const SECTION_META: Record<
  SectionKey,
  { title: string; subtitle: string; accent: string }
> = {
  critical: {
    title: "Critical",
    subtitle: "Items that require immediate action",
    accent: "text-red-500",
  },
  urgent: {
    title: "Urgent",
    subtitle: "Tonight/AM deadlines",
    accent: "text-yellow-500",
  },
  uncovered: {
    title: "Uncovered Loads",
    subtitle: "Loads still needing a carrier",
    accent: "text-emerald-500",
  },
  newLoads: {
    title: "New Loads",
    subtitle: "Incoming since last review",
    accent: "text-blue-500",
  },
  quotes: {
    title: "Quote Requests",
    subtitle: "Open RFQs awaiting response",
    accent: "text-purple-500",
  },
  cancels: {
    title: "Canceled Shipments",
    subtitle: "Carrier cancellations needing rebook",
    accent: "text-gray-400",
  },
  tracking: {
    title: "Tracking",
    subtitle: "Shipments currently in transit",
    accent: "text-cyan-500",
  },
  billingGaps: {
    title: "Billing Gaps",
    subtitle: "Missing sell prices / margin issues",
    accent: "text-lime-500",
  },
}

interface DetailDrawerProps {
  section: SectionKey | null
  details?: OpsDetails
  count: number
  lastUpdated?: string | null
  history?: OpsHistoryPoint[]
  onClose: () => void
}

const ACCENT_TO_TREND: Record<SectionKey, string> = {
  critical: "text-red-500",
  urgent: "text-yellow-500",
  uncovered: "text-emerald-500",
  newLoads: "text-blue-500",
  quotes: "text-purple-500",
  cancels: "text-gray-400",
  tracking: "text-cyan-500",
  billingGaps: "text-lime-500",
}

export function DetailDrawer({
  section,
  details,
  count,
  lastUpdated,
  history,
  onClose,
}: DetailDrawerProps) {
  const meta = section ? SECTION_META[section] : null

  return (
    <Sheet open={section !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-card border-border overflow-y-auto"
      >
        <SheetHeader className="text-left border-b border-border pb-4">
          <div className="flex items-baseline gap-3">
            <span className={cn("text-4xl font-bold tabular-nums", meta?.accent)}>
              {count}
            </span>
            <SheetTitle className="uppercase tracking-wide text-foreground">
              {meta?.title ?? "Section"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {meta?.subtitle}
            {lastUpdated && (
              <>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                Last updated {new Date(lastUpdated).toLocaleString()}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          {section && history && history.length > 0 && (
            <div className="py-4 border-b border-border">
              <Sparkline
                values={history.map((p) => p[section])}
                labels={history.map((p) =>
                  new Date(p.timestamp).toLocaleTimeString([], {
                    hour: "numeric",
                    hour12: true,
                  }),
                )}
                colorClass={ACCENT_TO_TREND[section]}
              />
            </div>
          )}
          {section && <DetailBody section={section} details={details} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({
  section,
  details,
}: {
  section: SectionKey
  details?: OpsDetails
}) {
  if (!details) {
    return (
      <EmptyState
        message="No itemized data yet"
        hint="The hourly Claude report can include a details payload. Once it runs, you'll see individual items here."
      />
    )
  }

  switch (section) {
    case "critical":
      return <AlertList items={details.criticalItems} />
    case "urgent":
      return <AlertList items={details.urgentItems} />
    case "uncovered":
      return <LoadList items={details.uncoveredLoads} />
    case "newLoads":
      return <LoadList items={details.newLoadItems} />
    case "quotes":
      return <QuoteList items={details.quoteRequests} />
    case "cancels":
      return <LoadList items={details.cancelledShipments} />
    case "tracking":
      return <TrackingList items={details.trackingUpdates} />
    case "billingGaps":
      return <BillingList items={details.billingGapItems} />
    default:
      return null
  }
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Inbox className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-foreground">{message}</p>
      {hint && (
        <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">{children}</div>
  )
}

function SourceBadge({ source }: { source: string }) {
  return (
    <Badge
      variant="outline"
      className="h-5 text-[10px] uppercase tracking-wider text-muted-foreground border-border"
    >
      {source}
    </Badge>
  )
}

function AlertList({ items }: { items: AlertItem[] }) {
  if (!items.length)
    return <EmptyState message="No alerts in this bucket right now" />

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Row key={item.id}>
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                item.priority === "critical"
                  ? "text-red-500"
                  : item.priority === "high"
                    ? "text-yellow-500"
                    : "text-muted-foreground",
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">
                {item.message}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                {item.loadId && <span>Load #{item.loadId}</span>}
                <SourceBadge source={item.source} />
                <span>{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Row>
      ))}
    </div>
  )
}

function LoadList({ items }: { items: LoadItem[] }) {
  if (!items.length) return <EmptyState message="No loads in this bucket" />

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Row key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {item.origin}{" "}
                <span className="text-muted-foreground">→</span>{" "}
                {item.destination}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <span>Pickup {item.pickupDate}</span>
                {item.deliveryDate && <span>· Deliver {item.deliveryDate}</span>}
                {item.equipment && <span>· {item.equipment}</span>}
                {item.carrier && <span>· {item.carrier}</span>}
                <SourceBadge source={item.source} />
              </div>
            </div>
            {item.rate != null && (
              <span className="text-sm font-semibold text-emerald-500 tabular-nums shrink-0">
                ${item.rate.toLocaleString()}
              </span>
            )}
          </div>
        </Row>
      ))}
    </div>
  )
}

function QuoteList({ items }: { items: QuoteItem[] }) {
  if (!items.length) return <EmptyState message="No open quote requests" />

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Row key={item.id}>
          <p className="text-sm font-medium text-foreground">{item.subject}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>From {item.from}</span>
            {item.origin && item.destination && (
              <span>
                · {item.origin} → {item.destination}
              </span>
            )}
            <span>· {new Date(item.receivedAt).toLocaleString()}</span>
            <SourceBadge source={item.source} />
          </div>
        </Row>
      ))}
    </div>
  )
}

function TrackingList({ items }: { items: TrackingItem[] }) {
  if (!items.length) return <EmptyState message="No active tracking updates" />

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Row key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Load #{item.loadId}
                {item.carrier && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {item.carrier}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.status}
                {item.location && ` · ${item.location}`}
              </p>
            </div>
            {item.eta && (
              <span className="text-xs text-cyan-500 tabular-nums shrink-0">
                ETA {item.eta}
              </span>
            )}
          </div>
        </Row>
      ))}
    </div>
  )
}

function BillingList({ items }: { items: BillingItem[] }) {
  if (!items.length) return <EmptyState message="No billing gaps" />

  const labels: Record<BillingItem["issue"], string> = {
    no_sell_price: "No sell price",
    no_carrier_cost: "No carrier cost",
    margin_issue: "Margin issue",
  }

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Row key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Load #{item.loadId}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.carrier} · {labels[item.issue]}
              </p>
            </div>
            <div className="text-right text-[11px] tabular-nums shrink-0">
              {item.carrierCost != null && (
                <div className="text-muted-foreground">
                  Cost ${item.carrierCost.toLocaleString()}
                </div>
              )}
              {item.sellPrice != null && (
                <div className="text-foreground">
                  Sell ${item.sellPrice.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </Row>
      ))}
    </div>
  )
}
