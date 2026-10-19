import type { BookingRole } from "./booking.ts"

export type QuoteLine = {
  description: string
  quantity: number
  unitCents: number
}
export type QuoteInput = {
  description: string
  lines: QuoteLine[]
  notes: string
  included: string
}
export type Quotation = QuoteInput & {
  id: string
  bookingId: string
  providerId: string
  providerName: string
  customerName: string
  eventDate: string
  start: string
  end: string
  version: number
  totalCents: number
  offeredBy: BookingRole
  at: string
  status: "pending" | "accepted" | "declined" | "superseded"
  decidedBy?: BookingRole
  decidedAt?: string
}
export function parseMoney(value: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) return null
  const [whole, fraction = ""] = value.trim().split(".")
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 100_000_000
    ? cents
    : null
}
export const quoteTotal = (lines: QuoteLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0)
export function quoteError(input: QuoteInput) {
  if (
    !input ||
    typeof input.description !== "string" ||
    input.description.trim().length < 3 ||
    input.description.length > 500
  )
    return "Describe the service in 3–500 characters."
  if (
    !Array.isArray(input.lines) ||
    !input.lines.length ||
    input.lines.length > 12 ||
    input.lines.some(
      (line) =>
        !line ||
        typeof line.description !== "string" ||
        !line.description.trim() ||
        line.description.length > 200 ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 1000 ||
        !Number.isSafeInteger(line.unitCents) ||
        line.unitCents < 100 ||
        line.unitCents > 100_000_000,
    )
  )
    return "Add 1–12 valid charges, each with a description, positive whole quantity and price of at least $1."
  if (quoteTotal(input.lines) > 100_000_000)
    return "Keep the total at or below $1,000,000."
  if (
    typeof input.notes !== "string" ||
    input.notes.length > 2000 ||
    typeof input.included !== "string" ||
    input.included.length > 2000
  )
    return "Keep notes and included services under 2,000 characters each."
  return ""
}
