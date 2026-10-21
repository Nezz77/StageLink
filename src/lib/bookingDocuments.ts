import {
  money,
  settlement,
  advancePercent,
  requiresEscrow,
  type Installment,
} from "./booking.ts"
import { bookingService, paymentLabel, type RecordBooking } from "./pipeline.ts"
export type DocumentKind = "invoice" | "receipt" | "settlement"
export type BookingDocument = {
  kind: DocumentKind
  summary: {
    label: string
    amount: string
    status: string
  }
  number: string
  title: string
  filename: string
  generatedAt: string
  bookingId: string
  sections: {
    title: string
    rows: [string, string][]
  }[]
}
export function bookingDocument(
  record: RecordBooking,
  kind: DocumentKind,
  installmentKind?: Installment["kind"],
  at = new Date().toISOString(),
): BookingDocument | null {
  const totals = settlement(record.ledger)
  const payment = record.ledger.installments.find(
    (item) => item.kind === installmentKind,
  )
  const agreed = record.quotations.find((item) => item.status === "accepted")
  if (
    (kind === "receipt" && !payment) ||
    (kind === "invoice" && !agreed && record.ledger.quoteStatus !== "accepted")
  )
    return null
  const number = `${
    kind === "invoice" ? "INV" : kind === "receipt" ? "RCT" : "SET"
  }-${record.id}${
    kind === "receipt"
      ? `-${installmentKind!.toUpperCase()}`
      : `-V${agreed?.version ?? record.ledger.quoteVersion}`
  }`
  const title =
    kind === "settlement"
      ? "Provider settlement statement"
      : kind === "receipt"
        ? "Customer payment receipt"
        : "Customer booking invoice"
  const sections: BookingDocument["sections"] = [
    {
      title: "Booking & participants",
      rows: [
        ["Booking ID", record.id],
        ["Customer", record.organizer ?? "Jordan Rivera"],
        ["Provider", bookingService(record).provider],
        ["Event", record.event],
        ["Event schedule", `${record.date} · ${record.start}–${record.end}`],
        ["Venue", record.venue],
        ["Booking status", record.status],
        ["Payment status", paymentLabel(record)],
      ],
    },
    {
      title: "Agreed services",
      rows: [
        ...(agreed?.lines.map(
          (line) =>
            [
              `${line.description} · ${line.quantity} × ${money(line.unitCents)}`,
              money(line.quantity * line.unitCents),
            ] as [string, string],
        ) ?? [
          ["Service", money(record.ledger.quoteCents)] as [string, string],
        ]),
        ["Original agreed price", money(record.ledger.quoteCents)],
        ["Approved overtime", money(totals.overtimeCents)],
        ...(totals.totalCents !==
        record.ledger.quoteCents + totals.overtimeCents
          ? [
              [
                "Historical demo surcharge (legacy record)",
                money(
                  totals.totalCents -
                    record.ledger.quoteCents -
                    totals.overtimeCents,
                ),
              ],
            ] as [string, string][]
          : []),
        ["Total agreed", money(totals.totalCents)],
      ],
    },
    {
      title: "Customer account",
      rows: [
        [
          "Advance policy",
          requiresEscrow(record.ledger)
            ? "Required 50% escrow advance"
            : "Historical optional 10% advance",
        ],
        ["Advance amount", money(totals.advanceCents)],
        ["Advance status", record.ledger.advance],
        ["Payments recorded", money(totals.receivedCents)],
        ["Refunded", money(totals.refundedCents)],
        [
          "Net customer paid",
          money(totals.receivedCents - totals.refundedCents),
        ],
        ["Outstanding balance", money(totals.remainingCents)],
        ["Platform fee charged to customer", "$0.00"],
        [
          "Pending overtime",
          record.ledger.overtime.some((item) => item.status === "pending")
            ? "Awaiting approval; excluded from the invoice. Final checkout is blocked."
            : "None",
        ],
      ],
    },
  ]
  if (payment && kind === "receipt")
    sections.unshift({
      title: "Receipt transaction",
      rows: [
        ["Transaction", `TX-${record.id}-${payment.kind.toUpperCase()}`],
        ["Payment date", payment.paidAt],
        [
          "Payment kind",
          payment.kind === "advance"
            ? `${advancePercent(record.ledger)}% advance`
            : payment.kind === "final"
              ? "Final balance"
              : "Historical payment",
        ],
        ["Method", `Demo ${payment.method}`],
        ["Amount received", money(payment.grossCents)],
        ["Booking total (not this transaction)", money(totals.totalCents)],
        [
          "Status",
          payment.refundedAt
            ? "Refunded"
            : payment.releasedAt
              ? "Transferred to provider by admin"
              : "Held by StageLink",
        ],
        ...(payment.refundedAt
          ? [["Refund date", payment.refundedAt]] as [string, string][]
          : []),
      ],
    })
  sections.push({
    title: "Payment history",
    rows: record.ledger.installments.length
      ? record.ledger.installments.map((item) => [
          `TX-${record.id}-${item.kind.toUpperCase()}`,
          `${money(item.grossCents)} · ${item.paidAt} · demo ${item.method} · ${
            item.refundedAt
              ? `refunded ${item.refundedAt}`
              : item.releasedAt
                ? `released ${item.releasedAt}`
                : "held by StageLink"
          }`,
        ])
      : [["No payments", "No payment has been recorded."]],
  })
  if (record.refund)
    sections.push({
      title: "Refund review",
      rows: [
        ["Status", record.refund.status],
        ["Requested", record.refund.at],
        ["Amount requested", money(record.refund.amountCents)],
        ["Reason", record.refund.reason],
        ["Decision", record.refund.decisionReason ?? "Awaiting administrator"],
        ["Decision date", record.refund.decidedAt ?? "Pending"],
      ],
    })
  if (kind === "settlement")
    sections.push({
      title: "Provider payout only",
      rows: [
        ["Held by StageLink", money(totals.heldCents)],
        ["Transferred to provider", money(totals.paidOutCents)],
        ["StageLink fee (5% of original price)", money(totals.feeCents)],
        ["Fee already deducted", money(totals.feeChargedCents)],
        ["Fee remaining to deduct", money(totals.feeDueCents)],
        [
          "Payout hold",
          record.ledger.payoutBlocked ? "On hold" : "No active hold",
        ],
        ["Completion verification", record.ledger.performance],
        ...record.ledger.installments
          .filter((item) => item.releasedAt)
          .map(
            (item) =>
              [
                item.kind,
                `${item.releasedAt} · net ${money(item.payoutCents ?? 0)} · fee ${money(item.feeCents ?? 0)}`,
              ] as [string, string],
          ),
      ],
    })
  sections.push({
    title: "Notes & terms",
    rows: [
      ["Included services", agreed?.included ?? "As described in the booking."],
      ["Offer notes", agreed?.notes ?? record.requirements],
      [
        "Demonstration only",
        "No real payment, tax invoice, bank transfer or live financial service is provided. All values come from this temporary demo session.",
      ],
      [
        "Fee policy",
        "The 5% platform fee is deducted once from the provider payout on the original agreed price. Approved overtime does not increase the fee.",
      ],
    ],
  })
  return {
    kind,
    summary: {
      label:
        kind === "receipt"
          ? "Amount received"
          : kind === "settlement"
            ? "Transferred to provider"
            : "Total agreed",
      amount: money(
        kind === "receipt"
          ? payment!.grossCents
          : kind === "settlement"
            ? totals.paidOutCents
            : totals.totalCents,
      ),
      status:
        kind === "receipt"
          ? payment!.refundedAt
            ? "Refunded to customer"
            : payment!.releasedAt
              ? "Transferred to provider by admin"
              : "Held by StageLink - not paid to provider"
          : kind === "invoice"
            ? `${
                requiresEscrow(record.ledger)
                  ? "Required"
                  : "Historical optional"
              } ${advancePercent(record.ledger)}% advance: ${money(totals.advanceCents)} | Outstanding: ${money(totals.remainingCents)}`
            : record.ledger.payoutBlocked
              ? "Payout on hold"
              : paymentLabel(record),
    },
    number,
    title,
    filename: `StageLink-${number}-DEMO.pdf`,
    generatedAt: at,
    bookingId: record.id,
    sections:
      kind === "receipt"
        ? sections.filter((section) => section.title !== "Agreed services")
        : sections,
  }
}
