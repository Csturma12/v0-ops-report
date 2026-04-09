"use client"

const stats = [
  { label: "CRITICAL", value: 0, sublabel: "act now", color: "text-red-500" },
  { label: "URGENT", value: 3, sublabel: "tonight/AM", color: "text-yellow-500" },
  { label: "UNCOVERED", value: 10, sublabel: "need carrier", color: "text-emerald-500" },
  { label: "NEW LOADS", value: 5, sublabel: "incoming", color: "text-blue-500" },
  { label: "QUOTES", value: 1, sublabel: "open RFQs", color: "text-purple-500" },
  { label: "CANCELS", value: 0, sublabel: "carrier", color: "text-gray-500" },
  { label: "TRACKING", value: 4, sublabel: "in motion", color: "text-cyan-500" },
  { label: "BILLING GAPS", value: 2, sublabel: "no sell price", color: "text-lime-500" },
]

export function OpsStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border rounded overflow-hidden">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card p-3 flex flex-col"
        >
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            {stat.label}
          </span>
          <span className={`text-3xl font-bold ${stat.color} mt-1`}>
            {stat.value}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {stat.sublabel}
          </span>
        </div>
      ))}
    </div>
  )
}
