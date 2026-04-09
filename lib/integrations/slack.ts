// Slack Integration Client
// Uses Slack MCP when available, falls back to Web API
import type { AlertItem, QuoteItem, SlackSyncResult } from "@/lib/types/ops"

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNELS = process.env.SLACK_CHANNELS?.split(",") || []

interface SlackMessage {
  ts: string
  text: string
  user: string
  channel?: string
}

interface SlackHistoryResponse {
  ok: boolean
  messages: SlackMessage[]
  error?: string
}

// Keywords to identify alert types
const ALERT_KEYWORDS = {
  critical: ["critical", "emergency", "asap", "immediately"],
  urgent: ["urgent", "tonight", "today", "am pickup"],
  delay: ["delayed", "late", "missed", "behind schedule"],
  carrier_problem: ["no show", "breakdown", "refused", "cancelled", "driver issue"],
}

const QUOTE_KEYWORDS = ["quote", "rate", "pricing", "rfq", "bid"]

function categorizeMessage(text: string): { type: AlertItem["type"]; priority: AlertItem["priority"] } | null {
  const lowerText = text.toLowerCase()

  for (const keyword of ALERT_KEYWORDS.critical) {
    if (lowerText.includes(keyword)) {
      return { type: "urgent", priority: "critical" }
    }
  }

  for (const keyword of ALERT_KEYWORDS.carrier_problem) {
    if (lowerText.includes(keyword)) {
      return { type: "carrier_problem", priority: "high" }
    }
  }

  for (const keyword of ALERT_KEYWORDS.delay) {
    if (lowerText.includes(keyword)) {
      return { type: "delay", priority: "high" }
    }
  }

  for (const keyword of ALERT_KEYWORDS.urgent) {
    if (lowerText.includes(keyword)) {
      return { type: "urgent", priority: "high" }
    }
  }

  return null
}

function isQuoteDiscussion(text: string): boolean {
  const lowerText = text.toLowerCase()
  return QUOTE_KEYWORDS.some(kw => lowerText.includes(kw))
}

// Extract load ID from message (common formats: #12345, LOAD-12345, etc.)
function extractLoadId(text: string): string | undefined {
  const patterns = [
    /#(\d{4,})/,
    /LOAD[- ]?(\d+)/i,
    /PRO[- ]?(\d+)/i,
    /BOL[- ]?(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }

  return undefined
}

async function fetchSlackHistory(channelId: string): Promise<SlackMessage[]> {
  if (!SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN not configured")
  }

  // Get messages from last 2 hours
  const oldest = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000)

  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  )

  const data: SlackHistoryResponse = await response.json()

  if (!data.ok) {
    console.error(`[Slack Error] Channel ${channelId}: ${data.error}`)
    return []
  }

  return data.messages.map(m => ({ ...m, channel: channelId }))
}

export async function syncSlack(): Promise<SlackSyncResult> {
  try {
    const alerts: AlertItem[] = []
    const quoteDiscussions: QuoteItem[] = []
    let messageCount = 0

    // Fetch messages from all configured channels
    for (const channelId of SLACK_CHANNELS) {
      const messages = await fetchSlackHistory(channelId.trim())
      messageCount += messages.length

      for (const message of messages) {
        // Check if it's an alert
        const category = categorizeMessage(message.text)
        if (category) {
          alerts.push({
            id: `slack-${message.ts}`,
            type: category.type,
            message: message.text.slice(0, 200),
            loadId: extractLoadId(message.text),
            source: "slack",
            timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
            priority: category.priority,
          })
        }

        // Check if it's a quote discussion
        if (isQuoteDiscussion(message.text)) {
          quoteDiscussions.push({
            id: `slack-quote-${message.ts}`,
            subject: message.text.slice(0, 100),
            from: `Slack user ${message.user}`,
            receivedAt: new Date(parseFloat(message.ts) * 1000).toISOString(),
            status: "open",
            source: "slack",
          })
        }
      }
    }

    return { alerts, quoteDiscussions, messageCount }
  } catch (error) {
    console.error("[Slack Sync Error]", error)
    throw error
  }
}

export function isConfigured(): boolean {
  return Boolean(SLACK_BOT_TOKEN && SLACK_CHANNELS.length > 0)
}
