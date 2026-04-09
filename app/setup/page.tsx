"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Copy, Bookmark, ArrowRight, Zap } from "lucide-react"
import Link from "next/link"

export default function SetupPage() {
  const [copied, setCopied] = useState(false)

  // Bookmarklet code - scrapes common TMS patterns and sends to our API
  const bookmarkletCode = `javascript:(function(){
    const findNumbers = (patterns) => {
      let results = {};
      patterns.forEach(({key, regex, selectors}) => {
        // Try selectors first
        for(let sel of selectors || []) {
          const el = document.querySelector(sel);
          if(el) {
            const num = parseInt(el.textContent.replace(/[^0-9]/g, ''));
            if(!isNaN(num)) { results[key] = num; return; }
          }
        }
        // Fall back to regex on page text
        const match = document.body.innerText.match(regex);
        if(match) results[key] = parseInt(match[1]) || 0;
      });
      return results;
    };
    
    const patterns = [
      {key:'critical', regex:/critical[:\\s]*(\\d+)/i, selectors:['.critical-count','[data-metric="critical"]']},
      {key:'urgent', regex:/urgent[:\\s]*(\\d+)/i, selectors:['.urgent-count','[data-metric="urgent"]']},
      {key:'uncovered', regex:/uncovered[:\\s]*(\\d+)/i, selectors:['.uncovered-count','[data-metric="uncovered"]']},
      {key:'newLoads', regex:/new\\s*loads?[:\\s]*(\\d+)/i, selectors:['.new-loads-count','[data-metric="new-loads"]']},
      {key:'quotes', regex:/quotes?[:\\s]*(\\d+)/i, selectors:['.quotes-count','[data-metric="quotes"]']},
      {key:'cancels', regex:/cancel(?:s|lations|led)?[:\\s]*(\\d+)/i, selectors:['.cancels-count','[data-metric="cancels"]']},
      {key:'tracking', regex:/tracking[:\\s]*(\\d+)/i, selectors:['.tracking-count','[data-metric="tracking"]']},
      {key:'billingGaps', regex:/billing\\s*gaps?[:\\s]*(\\d+)/i, selectors:['.billing-gaps-count','[data-metric="billing-gaps"]']}
    ];
    
    const data = findNumbers(patterns);
    const missing = ['critical','urgent','uncovered','newLoads','quotes','cancels','tracking','billingGaps'].filter(k => !(k in data));
    
    if(missing.length > 0) {
      const prompts = {
        critical: 'Critical (act now)',
        urgent: 'Urgent (tonight/AM)',
        uncovered: 'Uncovered (need carrier)',
        newLoads: 'New Loads (incoming)',
        quotes: 'Quotes (open RFQs)',
        cancels: 'Cancels (carrier)',
        tracking: 'Tracking (in motion)',
        billingGaps: 'Billing Gaps (no sell price)'
      };
      missing.forEach(key => {
        const val = prompt('Could not find ' + prompts[key] + '. Enter value:');
        if(val !== null) data[key] = parseInt(val) || 0;
      });
    }
    
    fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/ops/manual', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
      if(res.success) {
        alert('Mythos synced! ' + Object.entries(data).map(([k,v]) => k + ': ' + v).join(', '));
      } else {
        alert('Sync failed: ' + (res.error || 'Unknown error'));
      }
    })
    .catch(e => alert('Sync error: ' + e.message));
  })();`

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4 tracking-tight">SETUP TAI SYNC</h1>
          <p className="text-muted-foreground mt-2">
            One-click sync from TAI to Mythos - no API needed
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Install the Bookmarklet
            </CardTitle>
            <CardDescription>
              Drag the button below to your browser&apos;s bookmarks bar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bookmarklet Button */}
            <div className="flex flex-col items-center gap-4 p-6 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
              <p className="text-sm text-muted-foreground text-center">
                Drag this button to your bookmarks bar:
              </p>
              <a
                href={bookmarkletCode}
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors cursor-grab active:cursor-grabbing"
                draggable
              >
                <Zap className="h-4 w-4" />
                Sync to Mythos
              </a>
              <p className="text-xs text-muted-foreground">
                Or right-click and &quot;Bookmark This Link&quot;
              </p>
            </div>

            {/* Manual Copy */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Can&apos;t drag? Copy the code manually:
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-3 bg-muted rounded text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {bookmarkletCode.substring(0, 60)}...
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</span>
                <div>
                  <p className="font-medium">Open TAI in your browser</p>
                  <p className="text-sm text-muted-foreground">Navigate to your TAI dashboard or load board</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</span>
                <div>
                  <p className="font-medium">Click the &quot;Sync to Mythos&quot; bookmark</p>
                  <p className="text-sm text-muted-foreground">The bookmarklet will scan the page for your metrics</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">3</span>
                <div>
                  <p className="font-medium">Fill in any missing values</p>
                  <p className="text-sm text-muted-foreground">If a metric can&apos;t be found, you&apos;ll be prompted to enter it</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">4</span>
                <div>
                  <p className="font-medium">Done! Data synced to Mythos</p>
                  <p className="text-sm text-muted-foreground">Your dashboard updates automatically</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claude Summary Integration</CardTitle>
            <CardDescription>
              Since Claude generates summaries for you, here&apos;s how to connect that
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy your Claude-generated summary and paste it into the AI Brief section on the dashboard. 
              The &quot;Run AI Brief&quot; button can also generate insights from your synced metrics.
            </p>
            <div className="flex gap-2">
              <Link href="/">
                <Button className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
