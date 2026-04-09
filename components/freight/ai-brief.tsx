"use client"

import { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AIBrief() {
  const [isLoading, setIsLoading] = useState(false)
  const [briefContent, setBriefContent] = useState<string | null>(null)

  const handleRunBrief = async () => {
    setIsLoading(true)
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setBriefContent(
      `**Operations Summary - ${new Date().toLocaleTimeString()}**

Your freight operations are running smoothly with a few items requiring attention:

- **3 urgent loads** need carrier assignment before tonight/AM deadlines
- **10 uncovered loads** are waiting for carrier coverage - prioritize high-value shipments
- **5 new loads** have come in since your last review
- **4 shipments** are currently in transit with active tracking
- **2 billing gaps** detected - missing sell prices need to be resolved

**Recommended Actions:**
1. Review and assign carriers to the 3 urgent loads immediately
2. Check the 2 carrier problems flagged for potential service issues
3. Update sell prices for the 2 billing gap items`
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
