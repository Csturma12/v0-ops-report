// Parses freight ops reports from Slack (produced by the hourly Claude task)
// into OpsMetrics + OpsDetails, so users can paste the report and have it
// routed into the right dashboard sections automatically.
//
// The parser is intentionally tolerant: it looks for known section headers
// and explicit totals (e.g. "(~156 total)"), and falls back to counting
// child bullet lines when no explicit total is given.
import type {
  AlertItem,
  BillingItem,
  LoadItem,
  OpsDetails,
  OpsMetrics,
  QuoteItem,
  TrackingItem,
} from "@/lib/types/ops"

export interface ParsedReport {
  metrics: OpsMetrics
  details: OpsDetails
  reportTimestamp: string | null
  warnings: string[]
}

// Section header strings we look for. Matching is case-insensitive and
// tolerant of a leading ":rotating_light:" or similar Slack emoji prefix.
const SECTION_HEADERS = [
  "IMCC HOT CONTAINERS",
  "New Customer Quotes/RFQs",
  "Load Tenders",
  "Customer Update Requests",
  "Team Updates",
  "Carrier Cancellations/Falloffs",
  "TMS Uncovered Loads",
  "$0 Rate Loads Needing Pricing",
  "Top Action Items",
  "Watchlist Action Items",
] as const

type SectionHeader = (typeof SECTION_HEADERS)[number]

interface ParsedSection {
  header: SectionHeader
  // Raw header line (preserves "(~156 total)" suffix etc.)
  headerLine: string
  // Child bullet lines, trimmed, excluding the header itself.
  lines: string[]
}

// ---- Main entrypoint ------------------------------------------------------

export function parseFreightReport(rawText: string): ParsedReport {
  const warnings: string[] = []
  // Each report ends with "Sent using @Claude". If multiple are pasted,
  // prefer the most recent one by timestamp in its header.
  const reportBlocks = splitIntoReports(rawText)

  // Pick the freshest "Freight Ops Update" block (has the most parseable sections);
  // merge in any "Watchlist Update" from the same snapshot for richer items.
  const opsReport = pickLatest(reportBlocks, "Freight Ops Update")
  const watchlistReport = pickLatest(reportBlocks, "Watchlist Update")

  if (!opsReport && !watchlistReport) {
    warnings.push(
      "No recognizable 'Freight Ops Update' or 'Watchlist Update' header found.",
    )
  }

  const primary = opsReport ?? watchlistReport
  const primaryText = primary?.text ?? rawText
  const sections = extractSections(primaryText)

  // Timestamp from the report header (e.g. "Freight Ops Update — Fri 4/10 1:10 PM CT")
  const reportTimestamp = extractTimestamp(primary?.headerLine ?? rawText)

  const metrics = buildMetrics(sections, warnings)
  const details = buildDetails(sections, watchlistReport?.text ?? "", warnings)

  return {
    metrics: {
      ...metrics,
      lastSynced: reportTimestamp ?? new Date().toISOString(),
    },
    details,
    reportTimestamp,
    warnings,
  }
}

// ---- Splitting & selection ------------------------------------------------

interface ReportBlock {
  kind: "Freight Ops Update" | "Watchlist Update" | "Unknown"
  headerLine: string
  text: string
  timestamp: string | null
}

function splitIntoReports(raw: string): ReportBlock[] {
  // "Sent using @Claude" reliably marks the end of each report. Split on it,
  // then classify each chunk by looking for known header lines.
  const chunks = raw.split(/Sent using @Claude/gi)
  const blocks: ReportBlock[] = []
  for (const chunk of chunks) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    const headerLine = findReportHeader(trimmed)
    if (!headerLine) continue
    const kind = headerLine.includes("Watchlist Update")
      ? "Watchlist Update"
      : headerLine.includes("Freight Ops Update")
        ? "Freight Ops Update"
        : "Unknown"
    blocks.push({
      kind,
      headerLine,
      text: trimmed,
      timestamp: extractTimestamp(headerLine),
    })
  }
  return blocks
}

function findReportHeader(text: string): string | null {
  // Header lines look like "Freight Ops Update — Fri 4/10 1:10 PM CT" or
  // "Watchlist Update — Fri 4/10 11:10 AM CT", possibly with a timestamp
  // prefix like "[1:12 PM]chris sturma " from a Slack copy-paste.
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (/Freight Ops Update/i.test(line) || /Watchlist Update/i.test(line)) {
      return line.trim()
    }
  }
  return null
}

function pickLatest(
  blocks: ReportBlock[],
  kind: ReportBlock["kind"],
): ReportBlock | null {
  const filtered = blocks.filter((b) => b.kind === kind)
  if (filtered.length === 0) return null
  // Reports are pasted in chronological order (oldest first); grab the last one.
  return filtered[filtered.length - 1]
}

function extractTimestamp(headerLine: string): string | null {
  // e.g. "Freight Ops Update — Fri 4/10 1:10 PM CT"
  const match = headerLine.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  )
  if (!match) return null
  const now = new Date()
  const month = parseInt(match[1], 10) - 1
  const day = parseInt(match[2], 10)
  const year = match[3]
    ? parseInt(match[3].length === 2 ? `20${match[3]}` : match[3], 10)
    : now.getFullYear()
  let hour = parseInt(match[4], 10)
  const minute = parseInt(match[5], 10)
  const ampm = match[6].toUpperCase()
  if (ampm === "PM" && hour !== 12) hour += 12
  if (ampm === "AM" && hour === 12) hour = 0
  const d = new Date(year, month, day, hour, minute)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ---- Section extraction ---------------------------------------------------

function extractSections(text: string): Map<SectionHeader, ParsedSection> {
  const lines = text.split(/\r?\n/)
  const out = new Map<SectionHeader, ParsedSection>()
  let current: ParsedSection | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const headerMatch = matchSectionHeader(line)
    if (headerMatch) {
      if (current) out.set(current.header, current)
      current = { header: headerMatch, headerLine: line, lines: [] }
      continue
    }
    if (current && line.length > 0) {
      current.lines.push(line)
    }
  }
  if (current) out.set(current.header, current)
  return out
}

function matchSectionHeader(line: string): SectionHeader | null {
  // Strip leading Slack emoji codes like ":rotating_light:" so headers with a
  // warning emoji still match.
  const stripped = line.replace(/^:[a-z_]+:\s*/i, "")
  for (const h of SECTION_HEADERS) {
    // Match "TMS Uncovered Loads" followed by "(...)" optional and trailing ":"
    const re = new RegExp(
      `^${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b.*:?$`,
      "i",
    )
    if (re.test(stripped)) return h
  }
  return null
}

// ---- Metric extraction ----------------------------------------------------

function buildMetrics(
  sections: Map<SectionHeader, ParsedSection>,
  warnings: string[],
): Omit<OpsMetrics, "lastSynced"> {
  const actionItems = sections.get("Top Action Items")
  const watchlistActions = sections.get("Watchlist Action Items")
  const uncovered = sections.get("TMS Uncovered Loads")
  const pricing = sections.get("$0 Rate Loads Needing Pricing")
  const quotes = sections.get("New Customer Quotes/RFQs")
  const tenders = sections.get("Load Tenders")
  const updates = sections.get("Customer Update Requests")
  const cancels = sections.get("Carrier Cancellations/Falloffs")
  const hot = sections.get("IMCC HOT CONTAINERS")

  // Critical: count ":rotating_light:" flagged items across all action lists,
  // plus the CRITICAL line inside TMS Uncovered Loads.
  let critical = countRotatingLight(actionItems?.lines ?? [])
  critical += countRotatingLight(watchlistActions?.lines ?? [])
  if (uncovered) {
    const criticalLine = uncovered.lines.find((l) => /^CRITICAL\b/i.test(l))
    if (criticalLine) critical += countLoadIdsInLine(criticalLine)
  }

  // Urgent: non-rotating-light action items + URGENT line in uncovered.
  let urgent =
    (actionItems?.lines.length ?? 0) - countRotatingLight(actionItems?.lines ?? [])
  urgent += Math.max(
    0,
    (watchlistActions?.lines.length ?? 0) -
      countRotatingLight(watchlistActions?.lines ?? []),
  )
  if (uncovered) {
    const urgentLine = uncovered.lines.find((l) => /^URGENT\b/i.test(l))
    if (urgentLine) urgent += countLoadIdsInLine(urgentLine)
  }

  // Uncovered: explicit total from header "(~156 total)" if present.
  const uncoveredCount = uncovered
    ? extractParenTotal(uncovered.headerLine) ?? uncovered.lines.length
    : 0

  // Quotes: new quote count + $0-pricing count.
  const quoteCount =
    (quotes?.lines.length ?? 0) +
    (pricing ? extractParenTotal(pricing.headerLine) ?? pricing.lines.length : 0)

  // New loads: Load Tenders + explicit "NEW" hot container entries + "NEW DO"s.
  const tenderCount = tenders?.lines.length ?? 0
  const newHot = (hot?.lines ?? []).filter((l) => /\bNEW\b/i.test(l)).length
  const newLoads = tenderCount + newHot

  // Cancels/tracking: simple bullet counts.
  const cancelCount = cancels?.lines.length ?? 0
  const trackingCount = updates?.lines.length ?? 0

  // Billing gaps: count any mention of POD/invoice/BOL in the cumulative report text.
  const billingGaps = countBillingMentions(sections)

  if (uncoveredCount === 0 && !uncovered) {
    warnings.push("TMS Uncovered Loads section not found.")
  }

  return {
    critical,
    urgent,
    uncovered: uncoveredCount,
    newLoads,
    quotes: quoteCount,
    cancels: cancelCount,
    tracking: trackingCount,
    billingGaps,
  }
}

function countRotatingLight(lines: string[]): number {
  return lines.filter((l) => /:rotating_light:|^🚨/.test(l)).length
}

function countLoadIdsInLine(line: string): number {
  // Lines like "CRITICAL (PU today 4/10): 128619806 ... | 128614983 ..." —
  // count pipe-separated groups as approximate item count.
  const afterColon = line.split(/:\s/).slice(1).join(": ")
  const groups = afterColon.split("|").map((g) => g.trim()).filter(Boolean)
  return groups.length
}

function extractParenTotal(line: string): number | null {
  const m = line.match(/\(\s*~?\s*(\d+)\s*(?:total)?\s*\)/i)
  return m ? parseInt(m[1], 10) : null
}

function countBillingMentions(
  sections: Map<SectionHeader, ParsedSection>,
): number {
  const all: string[] = []
  sections.forEach((s) => all.push(...s.lines))
  return all.filter((l) =>
    /\b(POD|BOL|invoice|signed|detention|TONU)\b/i.test(l),
  ).length
}

// ---- Detail extraction (for drawer lists) ---------------------------------

function buildDetails(
  sections: Map<SectionHeader, ParsedSection>,
  watchlistText: string,
  _warnings: string[],
): OpsDetails {
  const now = new Date().toISOString()

  const criticalItems: AlertItem[] = []
  const urgentItems: AlertItem[] = []
  const uncoveredLoads: LoadItem[] = []
  const newLoadItems: LoadItem[] = []
  const quoteRequests: QuoteItem[] = []
  const cancelledShipments: LoadItem[] = []
  const trackingUpdates: TrackingItem[] = []
  const billingGapItems: BillingItem[] = []

  const actions = sections.get("Top Action Items")?.lines ?? []
  const watchlistActions = sections.get("Watchlist Action Items")?.lines ?? []
  for (const line of [...actions, ...watchlistActions]) {
    const isCritical = /:rotating_light:|^🚨/.test(line)
    const cleaned = cleanLine(line)
    const item: AlertItem = {
      id: hashId(cleaned),
      type: isCritical ? "urgent" : "exception",
      message: cleaned,
      source: "slack",
      timestamp: now,
      priority: isCritical ? "critical" : "high",
    }
    if (isCritical) criticalItems.push(item)
    else urgentItems.push(item)
  }

  const uncoveredSection = sections.get("TMS Uncovered Loads")
  if (uncoveredSection) {
    for (const line of uncoveredSection.lines) {
      const category = line.match(/^(CRITICAL|URGENT|UPCOMING|STALE)/i)?.[1]
      // Split grouped lines on "|" into individual load-ish chunks.
      const chunks = line
        .replace(/^(CRITICAL|URGENT|UPCOMING|STALE)[^:]*:\s*/i, "")
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
      for (const chunk of chunks) {
        uncoveredLoads.push({
          id: hashId(chunk),
          origin: extractOrigin(chunk) ?? "—",
          destination: extractDestination(chunk) ?? "—",
          pickupDate: category === "CRITICAL" ? "Today" : category ?? "—",
          status: "uncovered",
          rate: extractRate(chunk),
          source: "tai",
        })
      }
    }
  }

  const hot = sections.get("IMCC HOT CONTAINERS")?.lines ?? []
  const tenders = sections.get("Load Tenders")?.lines ?? []
  for (const line of [...hot.filter((l) => /\bNEW\b/i.test(l)), ...tenders]) {
    const cleaned = cleanLine(line)
    newLoadItems.push({
      id: hashId(cleaned),
      origin: extractOrigin(cleaned) ?? "—",
      destination: extractDestination(cleaned) ?? "—",
      pickupDate: "Incoming",
      status: "new",
      rate: extractRate(cleaned),
      source: "tai",
    })
  }

  const quotesSection = sections.get("New Customer Quotes/RFQs")?.lines ?? []
  const pricingSection =
    sections.get("$0 Rate Loads Needing Pricing")?.lines ?? []
  for (const line of [...quotesSection, ...pricingSection]) {
    const cleaned = cleanLine(line)
    quoteRequests.push({
      id: hashId(cleaned),
      subject: cleaned.slice(0, 140),
      from: extractFrom(cleaned) ?? "—",
      origin: extractOrigin(cleaned),
      destination: extractDestination(cleaned),
      receivedAt: now,
      status: "open",
      source: "slack",
    })
  }

  const cancelSection = sections.get("Carrier Cancellations/Falloffs")?.lines ?? []
  for (const line of cancelSection) {
    const cleaned = cleanLine(line)
    cancelledShipments.push({
      id: hashId(cleaned),
      origin: extractOrigin(cleaned) ?? "—",
      destination: extractDestination(cleaned) ?? "—",
      pickupDate: "—",
      status: "cancelled",
      source: "tai",
    })
  }

  const updates = sections.get("Customer Update Requests")?.lines ?? []
  for (const line of updates) {
    const cleaned = cleanLine(line)
    trackingUpdates.push({
      id: hashId(cleaned),
      loadId: extractLoadId(cleaned) ?? "—",
      status: cleaned.slice(0, 140),
      eta: extractEta(cleaned),
      updatedAt: now,
    })
  }

  // Billing gaps: pull from all text mentioning POD/invoice/TONU.
  const combined = [
    ...Array.from(sections.values()).flatMap((s) => s.lines),
    ...watchlistText.split(/\r?\n/).map((l) => l.trim()),
  ]
  const seen = new Set<string>()
  for (const line of combined) {
    if (!/\b(POD|BOL|invoice|TONU)\b/i.test(line)) continue
    const cleaned = cleanLine(line).slice(0, 200)
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    billingGapItems.push({
      id: hashId(cleaned),
      loadId: extractLoadId(cleaned) ?? "—",
      carrier: extractFrom(cleaned) ?? "—",
      issue: "no_sell_price",
    })
  }

  return {
    criticalItems,
    urgentItems,
    uncoveredLoads,
    newLoadItems,
    quoteRequests,
    cancelledShipments,
    trackingUpdates,
    billingGapItems,
  }
}

// ---- Small extractors -----------------------------------------------------

function cleanLine(line: string): string {
  return line
    .replace(/:[a-z_]+:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

function hashId(s: string): string {
  // Simple deterministic id based on line content so repeated parses
  // don't churn ids unnecessarily.
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return `p_${Math.abs(h).toString(36)}`
}

function extractOrigin(line: string): string | null {
  // Patterns like "Wilmington CA → Memphis" or "New Iberia → Brewton AL"
  const m = line.match(/([A-Z][A-Za-z.\s]+(?:\s[A-Z]{2})?)\s*(?:→|->|to)\s*/)
  return m ? m[1].trim() : null
}

function extractDestination(line: string): string | null {
  const m = line.match(/(?:→|->|to)\s*([A-Z][A-Za-z.\s]+(?:\s[A-Z]{2})?)/)
  return m ? m[1].trim() : null
}

function extractRate(line: string): number | undefined {
  const m = line.match(/\$([\d,]+(?:\.\d{2})?)/)
  if (!m) return undefined
  const n = Number(m[1].replace(/,/g, ""))
  return Number.isFinite(n) ? n : undefined
}

function extractFrom(line: string): string | null {
  // First name-looking token like "Parker Morris" or "Saadiah"
  const m = line.match(
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?=\s+(?:confirmed|said|asked|sent|quoting|replied|wrote|escalated|requested|requesting|requesting))/,
  )
  return m ? m[1] : null
}

function extractLoadId(line: string): string | null {
  const m = line.match(/\b(\d{8,9}|[A-Z]{3,4}\d{6,8})\b/)
  return m ? m[1] : null
}

function extractEta(line: string): string | undefined {
  const m = line.match(/ETA\s+([^,;.]+?)(?:[,;.]|$)/i)
  return m ? m[1].trim() : undefined
}
