"use client"

// Minimal dependency-free sparkline. Renders an area polyline + dots.
// Used inside the detail drawer to show the last 24 hourly readings.

interface SparklineProps {
  values: number[]
  labels?: string[]
  colorClass?: string // tailwind text-* that drives stroke/fill via currentColor
  height?: number
  className?: string
}

export function Sparkline({
  values,
  labels,
  colorClass = "text-emerald-500",
  height = 56,
  className,
}: SparklineProps) {
  if (!values.length) {
    return (
      <div className="text-[11px] text-muted-foreground italic">
        No history yet. Points will populate each hour.
      </div>
    )
  }

  const width = 280
  const pad = 4
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return { x, y, v }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath =
    points.length > 1
      ? `${linePath} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`
      : ""

  const latest = values[values.length - 1]
  const first = values[0]
  const delta = latest - first
  const deltaSign = delta > 0 ? "+" : ""

  return (
    <div className={className}>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Last {values.length} hour{values.length === 1 ? "" : "s"}
        </span>
        <span
          className={
            "text-[11px] tabular-nums " +
            (delta > 0
              ? "text-red-500"
              : delta < 0
                ? "text-emerald-500"
                : "text-muted-foreground")
          }
        >
          {deltaSign}
          {delta} vs start
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className={colorClass}
        role="img"
        aria-label="Hourly trend"
      >
        {areaPath && (
          <path d={areaPath} fill="currentColor" fillOpacity={0.12} stroke="none" />
        )}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 2.5 : 1.5}
            fill="currentColor"
          >
            {labels?.[i] && (
              <title>
                {labels[i]}: {p.v}
              </title>
            )}
          </circle>
        ))}
      </svg>
    </div>
  )
}
