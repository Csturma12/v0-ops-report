"use client"

import { useState } from "react"
import { X, Plus, Trash2, Calculator, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  FREIGHT_CLASSES,
  PACKAGING_TYPES,
  type QuoteCommodity,
  type RateQuoteApiResponse,
  type RateQuoteOption,
} from "@/lib/types/tai"

function emptyCommodity(): QuoteCommodity {
  return { handlingQuantity: 1, packagingType: "Pallet", weightTotal: 500, freightClass: "70" }
}

function money(n: number | undefined | null) {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

export function RateQuotePanel({ onClose }: { onClose: () => void }) {
  const [origin, setOrigin] = useState("")
  const [dest, setDest] = useState("")
  const [commodities, setCommodities] = useState<QuoteCommodity[]>([emptyCommodity()])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RateQuoteApiResponse | null>(null)

  function updateCommodity(i: number, patch: Partial<QuoteCommodity>) {
    setCommodities((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  async function submit() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/tai/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originZipCode: origin,
          destinationZipCode: dest,
          commodities,
          accessorialCodes: [],
        }),
      })
      setResult((await res.json()) as RateQuoteApiResponse)
    } catch {
      setResult({ ok: false, status: 0, quotes: [], error: "Request failed. Check your connection." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">LTL Rate Quote</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">TAI getRateQuote · live carrier pricing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Origin ZIP
              </span>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="30301"
                inputMode="numeric"
                className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Destination ZIP
              </span>
              <input
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="60601"
                inputMode="numeric"
                className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Commodities</h3>
            <button
              type="button"
              onClick={() => setCommodities((p) => [...p, emptyCommodity()])}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          <div className="mt-2 space-y-3">
            {commodities.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Item {i + 1}</span>
                  {commodities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCommodities((p) => p.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Num label="Qty" value={c.handlingQuantity} onChange={(v) => updateCommodity(i, { handlingQuantity: v })} />
                  <Num label="Weight (lbs)" value={c.weightTotal} onChange={(v) => updateCommodity(i, { weightTotal: v })} />
                  <Select
                    label="Packaging"
                    value={c.packagingType}
                    options={PACKAGING_TYPES as readonly string[]}
                    onChange={(v) => updateCommodity(i, { packagingType: v })}
                  />
                  <Select
                    label="Class"
                    value={c.freightClass}
                    options={FREIGHT_CLASSES as readonly string[]}
                    onChange={(v) => updateCommodity(i, { freightClass: v })}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={submit} disabled={loading} className="mt-5 w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            {loading ? "Requesting quotes…" : "Get Rate Quote"}
          </Button>

          {result && (
            <div className="mt-5">
              {result.ok ? (
                result.quotes.length === 0 ? (
                  <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    No carrier rates returned for this lane.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {result.quotes.map((q, i) => (
                      <QuoteRow key={q.apiQuoteNumber || i} q={q} best={i === 0} />
                    ))}
                  </ol>
                )
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-1.5 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    {result.status === 401 || result.status === 403 ? "TAI rejected credentials" : "Quote failed"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{result.hint || result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function QuoteRow({ q, best }: { q: RateQuoteOption; best: boolean }) {
  return (
    <li
      className={`rounded-lg border p-3 ${best ? "border-emerald-300 bg-emerald-50" : "border-border bg-muted/50"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {q.carrierName || q.carrierSCAC || "Carrier"}
            {best && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-emerald-700">Best</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[q.serviceLevel, q.transitTime ? `${q.transitTime} day transit` : null].filter(Boolean).join(" · ") ||
              q.tariffDescription ||
              "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-bold tabular-nums text-emerald-700">{money(q.priceTotal)}</p>
          {(q.priceFuelSurcharge ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground">incl. {money(q.priceFuelSurcharge)} fuel</p>
          )}
        </div>
      </div>
    </li>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
