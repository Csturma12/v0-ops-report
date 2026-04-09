// Gmail API Integration Client
import type { QuoteItem, GmailSyncResult } from "@/lib/types/ops"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ body?: { data?: string } }>
  }
  internalDate: string
}

interface GmailListResponse {
  messages: Array<{ id: string; threadId: string }>
  resultSizeEstimate: number
}

async function getAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Gmail OAuth credentials not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

async function gmailRequest<T>(endpoint: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ""
}

function parseQuoteFromEmail(message: GmailMessage): QuoteItem | null {
  const headers = message.payload.headers
  const subject = extractHeader(headers, "Subject")
  const from = extractHeader(headers, "From")
  const date = extractHeader(headers, "Date")

  // Only process quote-related emails
  const lowerSubject = subject.toLowerCase()
  if (!lowerSubject.includes("quote") && 
      !lowerSubject.includes("rfq") && 
      !lowerSubject.includes("rate request") &&
      !lowerSubject.includes("pricing")) {
    return null
  }

  // Try to extract origin/destination from subject or snippet
  const lanePatter = /([A-Z]{2,3})\s*(?:to|-|>)\s*([A-Z]{2,3})/i
  const laneMatch = subject.match(lanePatter) || message.snippet.match(lanePatter)

  return {
    id: message.id,
    subject,
    from,
    origin: laneMatch?.[1],
    destination: laneMatch?.[2],
    receivedAt: new Date(parseInt(message.internalDate)).toISOString(),
    status: "open",
    source: "email",
  }
}

export async function syncGmail(): Promise<GmailSyncResult> {
  try {
    const accessToken = await getAccessToken()

    // Search for quote-related emails from last 48 hours
    const query = encodeURIComponent(
      "(subject:quote OR subject:RFQ OR subject:rate OR subject:pricing) newer_than:2d"
    )
    const listResponse = await gmailRequest<GmailListResponse>(
      `/messages?q=${query}&maxResults=50`,
      accessToken
    )

    const quoteRequests: QuoteItem[] = []
    let bolCount = 0

    if (listResponse.messages) {
      for (const msg of listResponse.messages.slice(0, 20)) {
        const message = await gmailRequest<GmailMessage>(
          `/messages/${msg.id}?format=full`,
          accessToken
        )

        const quote = parseQuoteFromEmail(message)
        if (quote) {
          quoteRequests.push(quote)
        }

        // Check for BOL attachments
        if (message.payload.parts) {
          for (const part of message.payload.parts) {
            const filename = (part as { filename?: string }).filename || ""
            if (filename.toLowerCase().includes("bol") || 
                filename.toLowerCase().includes("bill of lading")) {
              bolCount++
            }
          }
        }
      }
    }

    // Get unread count
    const unreadResponse = await gmailRequest<{ messages?: unknown[] }>(
      "/messages?q=is:unread&maxResults=1",
      accessToken
    )

    return {
      quoteRequests,
      bolCount,
      unreadCount: unreadResponse.messages?.length || 0,
    }
  } catch (error) {
    console.error("[Gmail Sync Error]", error)
    throw error
  }
}

export function isConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN)
}
