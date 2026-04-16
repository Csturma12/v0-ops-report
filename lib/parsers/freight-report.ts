// Parses freight ops reports from Slack or Claude Cowork into OpsMetrics
// + OpsDetails. The parser is intentionally tolerant — it looks for known
// section headers, strips markdown/emoji formatting, and falls back
// gracefully when any given section is missing.
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

// Section header strings we look for (case-insensitive, markdown-stripped).
// Order matters for disambiguation: longer matches win if multiple would match.
const SECTION_HEADERS = [
  "IMCC HOT CONTAINERS",
  "New Customer Quotes/RFQs",
  "New Customer Quotes",
  "Load Tenders",
  "Customer Update Requests",
  "Team Updates",
  "Carrier Cancellations/Falloffs",
  "Carrier Cancellations",
  "TMS Uncovered Loads",
  "$0 Rate Loads Needing Pricing",
  "$0 Rate Loads",
  "Top Action Items",
  "Watchlist Action Items",
  "Action Items",
] as const

type SectionHeader = (typeof SECTION_HEADERS)[number]

// Canonicalize aliased headers (e.g. "New Customer Quotes" → "New Customer Quotes/RFQs")
const CANONICAL: Record<string, SectionHeader> = {
  "New Customer Quotes": "New Customer Quotes/RFQs",
  "Carrier Cancellations": "Carrier Cancellations/Falloffs",
  "$0 Rate Loads": "$0 Rate Loads Needing Pricing",
  "Action Items": "Top Action Items",
}

interface ParsedSection {
  header: SectionHeader
  headerLine: string
  lines: string[]
}

// ---- Main entrypoint ------------------------------------------------------

export function parseFreightReport(rawText: string): ParsedReport {
  const warnings: string[] = []

  // Normalize the text up front: strip markdown formatting, Slack wrappers,
  // and zero-width characters that throw off header matching.
  const normalized = normalizeText(rawText)

  const reportBlocks = splitIntoReports(normalized)

  const opsReport = pickLatest(reportBlocks, "Freight Ops Update")
  const watchlistReport = pickLatest(reportBlocks, "Watchlist Update")

  // If we couldn't find an explicit report header, treat the whole text as a
  // single block. This makes the parser work with Claude's programmatic POSTs
  // which might not include "Sent using @Claude" or a report-title line.
  const primaryText =
    opsReport?.text ??
    watchlistReport?.text ??
    (reportBlocks[0]?.text ?? normalized)

  if (!opsReport && !watchlistReport && reportBlocks.length === 0) {
    warnings.push(
      "No 'Freight Ops Update' / 'Watchlist Update' header found — parsing whole text.",
    )
  }

  const sections = extractSections(primaryText)

  if (sections.size === 0) {
    warnings.push(
      "No recognizable section headers found (e.g. 'TMS Uncovered Loads', 'Top Action Items').",
    )
  }

  const reportTimestamp =
    extractTimestamp(opsReport?.headerLine ?? watchlistReport?.headerLine ?? "") ??
    extractTimestamp(primaryText)

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

// ---- Normalization --------------------------------------------------------

function normalizeText(raw: string): string {
  return (
    raw
      // Collapse Windows line endings
      .replace(/\r\n/g, "\n")
      // Strip zero-width characters that Slack sometimes injects
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Strip markdown emphasis markers: **bold**, *italic*, __bold__, _italic_
      // But preserve the inner text so section headers still match.
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Only strip single-* emphasis when it clearly wraps a word (avoid eating
      // the "*" used as bullets in some paste formats).
      .replace(/(^|\s)\*(\S[^*\n]*?\S)\*(?=\s|$|[.,;:])/gm, "$1$2")
      .replace(/(^|\s)_(\S[^_\n]*?\S)_(?=\s|$|[.,;:])/gm, "$1$2")
      // Slack-style mention/link wrappers: <@U123>, <!channel>, <http://...>
      .replace(/<!?(channel|here|everyone)>/g, "")
      .replace(/<@[UW][A-Z0-9]+\|?([^>]*)>/g, "$1")
      .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
      .replace(/<(https?:\/\/[^>]+)>/g, "$1")
  )
}

// ---- Splitting & selection ------------------------------------------------

interface ReportBlock {
  kind: "Freight Ops Update" | "Watchlist Update" | "Unknown"
  headerLine: string
  text: string
  timestamp: string | null
}

function splitIntoReports(raw: string): ReportBlock[] {
  // Prefer to split on "Sent using @Claude" if present; otherwise fall back
  // to splitting at each "Freight Ops Update"/"Watchlist Update" line so that
  // multiple reports pasted together still split cleanly.
  const chunks = /Sent using @Claude/i.test(raw)
    ? raw.split(/Sent using @Claude/gi)
    : raw.split(/(?=^\s*(?:Freight Ops Update|Watchlist Update)\b)/gim)

  const blocks: ReportBlock[] = []
  for (const chunk of chunks) {
    const trimmed = chunk.trim()
    if (!trimmed) continue
    const headerLine = findReportHeader(trimmed)
    if (!headerLine) {
      // If the chunk still contains recognizable sections, keep it as Unknown.
      if (containsAnySectionHeader(trimmed)) {
        blocks.push({
          kind: "Unknown",
          headerLine: "",
          text: trimmed,
          timestamp: null,
        })
      }
      continue
    }
    const kind = /Watchlist Update/i.test(headerLine)
      ? "Watchlist Update"
      : /Freight Ops Update/i.test(headerLine)
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
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (/Freight Ops Update/i.test(line) || /Watchlist Update/i.test(line)) {
      return line.trim()
    }
  }
  return null
}

function containsAnySectionHeader(text: string): boolean {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  return lines.some((l) => matchSectionHeader(l) !== null)
}

function pickLatest(
  blocks: ReportBlock[],
  kind: ReportBlock["kind"],
): ReportBlock | null {
  const filtered = blocks.filter((b) => b.kind === kind)
  if (filtered.length === 0) return null
  return filtered[filtered.length - 1]
}

function extractTimestamp(text: string): string | null {
  const match = text.match(
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
      if (current) {
        // If we already have this canonical header, append rather than overwrite.
        const existing = out.get(current.header)
        if (existing) {
          existing.lines.push(...current.lines)
        } else {
          out.set(current.header, current)
        }
      }
      current = { header: headerMatch, headerLine: line, lines: [] }
      continue
    }
    if (current && line.length > 0) {
      current.lines.push(line)
    }
  }
  if (current) {
    const existing = out.get(current.header)
    if (existing) existing.lines.push(...current.lines)
    else out.set(current.header, current)
  }
  return out
}

function matchSectionHeader(line: string): SectionHeader | null {
  // Strip leading Slack emoji codes like ":rotating_light:" or unicode emoji.
  const stripped = line
    .replace(/^(?::[a-z_0-9]+:\s*)+/gi, "")
    .replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/gu, "")
    .replace(/^#{1,6}\s*/, "") // markdown headings
    .replace(/^[•*\-]\s+/, "") // bullet markers
    .trim()
  for (const h of SECTION_HEADERS) {
    // Match at the start of the line, followed by optional "(...)" group and
    // optional trailing ":" — nothing else required.
    const re = new RegExp(`^${escapeRegex(h)}\\b`, "i")
    if (re.test(stripped)) {
      return CANONICAL[h] ?? h
    }
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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

  let critical = countRotatingLight(actionItems?.lines ?? [])
  critical += countRotatingLight(watchlistActions?.lines ?? [])
  if (uncovered) {
    const criticalLine = uncovered.lines.find((l) => /^CRITICAL\b/i.test(l))
    if (criticalLine) critical += countLoadIdsInLine(criticalLine)
  }

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

  const uncoveredCount = uncovered
    ? extractParenTotal(uncovered.headerLine) ?? uncovered.lines.length
    : 0

  const quoteCount =
    (quotes?.lines.length ?? 0) +
    (pricing ? extractParenTotal(pricing.headerLine) ?? pricing.lines.length : 0)

  const tenderCount = tenders?.lines.length ?? 0
  const newHot = (hot?.lines ?? []).filter((l) => /\bNEW\b/i.test(l)).length
  const newLoads = tenderCount + newHot

  const cancelCount = cancels?.lines.length ?? 0
  const trackingCount = updates?.lines.length ?? 0

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
  return lines.filter((l) => /:rotating_light:|🚨/.test(l)).length
}

function countLoadIdsInLine(line: string): number {
  const afterColon = line.split(/:\s/).slice(1).join(": ")
  const groups = afterColon
    .split("|")
    .map((g) => g.trim())
    .filter(Boolean)
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
    const isCritical = /:rotating_light:|🚨/.test(line)
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
    .replace(/:[a-z_0-9]+:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

function hashId(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return `p_${Math.abs(h).toString(36)}`
}

function extractOrigin(line: string): string | null {
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
  const m = line.match(
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?=\s+(?:confirmed|said|asked|sent|quoting|replied|wrote|escalated|requested|requesting))/,
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
