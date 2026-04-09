"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Keyboard, Save, X } from "lucide-react"
import type { OpsMetrics } from "@/lib/types/ops"

interface ManualEntryFormProps {
  currentMetrics?: OpsMetrics
  onSave: (metrics: OpsMetrics) => void
}

const FIELDS = [
  { key: "critical", label: "Critical", color: "text-red-500", description: "act now" },
  { key: "urgent", label: "Urgent", color: "text-yellow-500", description: "tonight/AM" },
  { key: "uncovered", label: "Uncovered", color: "text-emerald-500", description: "need carrier" },
  { key: "newLoads", label: "New Loads", color: "text-blue-400", description: "incoming" },
  { key: "quotes", label: "Quotes", color: "text-purple-400", description: "open RFQs" },
  { key: "cancels", label: "Cancels", color: "text-gray-400", description: "carrier" },
  { key: "tracking", label: "Tracking", color: "text-cyan-400", description: "in motion" },
  { key: "billingGaps", label: "Billing Gaps", color: "text-lime-400", description: "no sell price" },
] as const

export function ManualEntryForm({ currentMetrics, onSave }: ManualEntryFormProps) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, number>>({
    critical: currentMetrics?.critical ?? 0,
    urgent: currentMetrics?.urgent ?? 3,
    uncovered: currentMetrics?.uncovered ?? 10,
    newLoads: currentMetrics?.newLoads ?? 5,
    quotes: currentMetrics?.quotes ?? 1,
    cancels: currentMetrics?.cancels ?? 0,
    tracking: currentMetrics?.tracking ?? 4,
    billingGaps: currentMetrics?.billingGaps ?? 2,
  })

  const handleChange = (key: string, value: string) => {
    const num = parseInt(value, 10)
    setValues(prev => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num)
    }))
  }

  const handleSave = () => {
    const metrics: OpsMetrics = {
      critical: values.critical,
      urgent: values.urgent,
      uncovered: values.uncovered,
      newLoads: values.newLoads,
      quotes: values.quotes,
      cancels: values.cancels,
      tracking: values.tracking,
      billingGaps: values.billingGaps,
      lastSynced: new Date().toISOString(),
    }
    onSave(metrics)
    setOpen(false)
  }

  const handleReset = () => {
    setValues({
      critical: 0,
      urgent: 0,
      uncovered: 0,
      newLoads: 0,
      quotes: 0,
      cancels: 0,
      tracking: 0,
      billingGaps: 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Manual Entry</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground uppercase tracking-wide">
            Manual Data Entry
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Enter your current ops numbers from TAI. This takes about 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label 
                htmlFor={field.key}
                className={`text-[10px] uppercase tracking-wider ${field.color}`}
              >
                {field.label}
              </label>
              <Input
                id={field.key}
                type="number"
                min="0"
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="h-10 bg-background border-border text-xl font-bold text-foreground text-center"
              />
              <span className="text-[9px] text-muted-foreground">{field.description}</span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary text-primary-foreground"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save & Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
