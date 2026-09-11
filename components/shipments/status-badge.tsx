import { statusBucket, type StatusBucket } from "@/lib/types/shipment"

const BUCKET_STYLES: Record<StatusBucket, { dot: string; text: string; bg: string; label: string }> = {
  new: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-400/10 border-amber-400/20",
    label: "Needs Coverage",
  },
  booked: {
    dot: "bg-blue-400",
    text: "text-blue-300",
    bg: "bg-blue-400/10 border-blue-400/20",
    label: "Booked",
  },
  in_transit: {
    dot: "bg-sky-400",
    text: "text-sky-300",
    bg: "bg-sky-400/10 border-sky-400/20",
    label: "In Transit",
  },
  delivered: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    label: "Delivered",
  },
  exception: {
    dot: "bg-red-400",
    text: "text-red-300",
    bg: "bg-red-400/10 border-red-400/20",
    label: "Exception",
  },
  cancelled: {
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40 border-border",
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
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {raw && raw.length <= 24 ? raw : style.label}
    </span>
  )
}
