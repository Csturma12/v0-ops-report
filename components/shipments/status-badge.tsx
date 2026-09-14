import { statusBucket, type StatusBucket } from "@/lib/types/shipment"

const BUCKET_STYLES: Record<StatusBucket, { dot: string; text: string; bg: string; label: string }> = {
  new: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    label: "Needs Coverage",
  },
  booked: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    label: "Booked",
  },
  in_transit: {
    dot: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    label: "In Transit",
  },
  delivered: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    label: "Delivered",
  },
  exception: {
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/5 border-primary/20",
    label: "Exception",
  },
  cancelled: {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    bg: "bg-muted border-border",
    label: "Cancelled",
  },
}

export function bucketStyle(bucket: StatusBucket) {
  return BUCKET_STYLES[bucket]
}

export function StatusBadge({ status }: { status: string | null }) {
  const bucket = statusBucket(status)
  const style = BUCKET_STYLES[bucket]
  const raw = status?.trim()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {raw && raw.length <= 24 ? raw : style.label}
    </span>
  )
}
