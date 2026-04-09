"use client"

import { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OpsMetrics } from "@/lib/types/ops"

interface AIBriefProps {
  metrics?: OpsMetrics
}

export function AIBrief({ metrics }: AIBriefProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [briefContent, setBriefContent] = useState<string | null>(null)

  const handleRunBrief = async () => {
    setIsLoading(true)
    // Simulate AI processing with actual metrics
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    const m = metrics || {
      critical: 0, urgent: 3, uncovered: 10, newLoads: 5,
      quotes: 1, cancels: 0, tracking: 4, billingGaps: 2
    }
    
    const criticalSection = m.critical > 0 
      ? `\n**CRITICAL:** ${m.critical} items require immediate action - act now!` 
      : ""
    
    setBriefContent(
      `**Operations Summary - ${new Date().toLocaleTimeString()}**
${criticalSection}
Your freight operations status:

- **${m.urgent} urgent loads** need carrier assignment before tonight/AM deadlines
- **${m.uncovered} uncovered loads** are waiting for carrier coverage - prioritize high-value shipments
- **${m.newLoads} new loads** have come in since your last review
- **${m.quotes} open quote requests** pending response
- **${m.tracking} shipments** currently in transit with active tracking
- **${m.billingGaps} billing gaps** detected - missing sell prices need resolution
${m.cancels > 0 ? `- **${m.cancels} carrier cancellations** require rebooking` : ""}

**Recommended Actions:**
1. ${m.urgent > 0 ? `Review and assign carriers to the ${m.urgent} urgent loads immediately` : "No urgent loads - focus on uncovered capacity"}
2. ${m.uncovered > 5 ? "Prioritize uncovered loads by margin and deadline" : "Uncovered loads under control"}
3. ${m.billingGaps > 0 ? `Update sell prices for the ${m.billingGaps} billing gap items` : "Billing is clean"}`
    )
    setIsLoading(false)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            AI BRIEF
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          streams from all 8 sections
        </span>
      </div>

      <div className="bg-card border border-border rounded p-4 min-h-[120px]">
        {briefContent ? (
          <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {briefContent}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click Run AI Brief to synthesize everything above into a freight ops summary.
          </p>
        )}
      </div>

      <div className="mt-4">
        <Button
          onClick={handleRunBrief}
          disabled={isLoading}
          className="bg-transparent border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 text-xs font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              GENERATING...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 mr-2" />
              RUN AI BRIEF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
