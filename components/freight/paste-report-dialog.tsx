"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ClipboardPaste, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface PasteReportDialogProps {
  onIngested: () => void | Promise<void>
}

interface IngestResult {
  ok: boolean
  metrics: {
    critical: number
    urgent: number
    uncovered: number
    newLoads: number
    quotes: number
    cancels: number
    tracking: number
    billingGaps: number
  }
  reportTimestamp: string | null
  warnings: string[]
  itemCounts: Record<string, number>
}

export function PasteReportDialog({ onIngested }: PasteReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setText("")
    setResult(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/ingest/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const json = (await res.json()) as IngestResult & { error?: string }
      if (!res.ok) {
        setError(json.error ?? "Failed to parse report")
      } else {
        setResult(json)
        await onIngested()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="h-8 gap-1.5">
          <ClipboardPaste className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Paste Claude Report</span>
          <span className="sm:hidden">Paste</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground uppercase tracking-wide">
            Paste Claude Report
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            Copy the full Slack message from your hourly Claude report and paste
            it below. The app will parse each section automatically and update
            all dashboard metrics + drawers.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Paste the entire Slack message here — e.g.\n\nFreight Ops Update — Fri 4/10 1:10 PM CT\n:rotating_light: IMCC HOT CONTAINERS (TOP PRIORITY)\n..."}
              className="min-h-[320px] font-mono text-[11px] leading-relaxed bg-background border-border"
              disabled={submitting}
            />
            {error && (
              <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {result && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Report parsed and saved</span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Parsed metrics
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["critical", "Critical", "text-red-500"],
                    ["urgent", "Urgent", "text-yellow-500"],
                    ["uncovered", "Uncovered", "text-emerald-500"],
                    ["newLoads", "New", "text-blue-400"],
                    ["quotes", "Quotes", "text-purple-400"],
                    ["cancels", "Cancels", "text-gray-400"],
                    ["tracking", "Tracking", "text-cyan-400"],
                    ["billingGaps", "Billing", "text-lime-400"],
                  ] as const
                ).map(([key, label, color]) => (
                  <div
                    key={key}
                    className="p-2 rounded bg-background border border-border text-center"
                  >
                    <div className={`text-[9px] uppercase ${color}`}>{label}</div>
                    <div className="text-lg font-bold text-foreground">
                      {result.metrics[key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Items extracted
              </p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {Object.entries(result.itemCounts).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {k}: <span className="text-foreground">{v}</span>
                  </span>
                ))}
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-500">
                <p className="font-medium mb-1">Warnings</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {result ? (
            <>
              <Button variant="outline" size="sm" onClick={reset}>
                Paste Another
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                className="bg-primary text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Parse & Save"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
