"use client"

import { useEffect, useRef, useState } from "react"
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
import {
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clipboard,
} from "lucide-react"

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
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const reset = () => {
    setText("")
    setResult(null)
    setError(null)
    setClipboardMessage(null)
  }

  // Auto-focus the textarea when the dialog opens so the user can immediately
  // paste with Cmd/Ctrl+V or long-press paste on mobile.
  useEffect(() => {
    if (open && !result) {
      const t = setTimeout(() => textareaRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [open, result])

  const handlePasteFromClipboard = async () => {
    setClipboardMessage(null)
    try {
      // Safari/iOS + some desktop browsers require a user gesture (the click we
      // just got) and will throw if permission is denied.
      if (!navigator.clipboard?.readText) {
        setClipboardMessage(
          "Your browser blocks clipboard reads. Long-press or Ctrl/Cmd+V into the box below.",
        )
        textareaRef.current?.focus()
        return
      }
      const clipText = await navigator.clipboard.readText()
      if (!clipText) {
        setClipboardMessage(
          "Clipboard is empty. Copy the Claude report from Slack first.",
        )
        return
      }
      setText(clipText)
      setClipboardMessage(
        `Pulled ${clipText.length.toLocaleString()} characters from clipboard.`,
      )
    } catch {
      setClipboardMessage(
        "Couldn't read clipboard automatically. Long-press or Ctrl/Cmd+V into the box below.",
      )
      textareaRef.current?.focus()
    }
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground uppercase tracking-wide">
            Paste Claude Report
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            Tap the button to pull the report straight from your clipboard, or
            paste it into the box below with Cmd/Ctrl+V (long-press on mobile).
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={handlePasteFromClipboard}
                disabled={submitting}
              >
                <Clipboard className="h-3.5 w-3.5" />
                Paste from clipboard
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setText("")}
                disabled={submitting || !text}
              >
                Clear
              </Button>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {text.length.toLocaleString()} chars
              </span>
            </div>

            {clipboardMessage && (
              <div className="text-[11px] text-muted-foreground">
                {clipboardMessage}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "Paste the entire Slack message here — for example:\n\nFreight Ops Update — Fri 4/10 1:10 PM CT\n:rotating_light: IMCC HOT CONTAINERS (TOP PRIORITY)\n..."
              }
              className="min-h-[360px] font-mono text-[11px] leading-relaxed bg-background border-border"
              disabled={submitting}
              autoFocus
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
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
