import { Check } from "lucide-react"
import { settlement, money } from "../lib/booking"
import { type RecordBooking } from "../lib/pipeline"
export default function BookingMilestones({
  record,
}: {
  record: RecordBooking
}) {
  const ledger = record.ledger,
    totals = settlement(ledger)
  const ended = ["rejected", "cancelled"].includes(record.status)
  const eventSteps = [
    [
      "Request",
      record.status === "rejected"
        ? "Provider rejected"
        : record.status === "pending"
          ? "Awaiting provider"
          : "Request reviewed",
      record.status !== "pending",
    ],
    [
      "Agreement",
      ledger.quoteStatus === "accepted"
        ? "Price agreed"
        : ledger.quoteStatus === "declined"
          ? "Quote declined; new offer needed"
          : "Negotiation in progress",
      ledger.quoteStatus === "accepted",
    ],
    [
      "Event",
      ended
        ? "Event will not proceed"
        : ledger.performance !== "upcoming"
          ? "Completion reported"
          : record.demoStartedAt
            ? "Demo event in progress"
            : ledger.quoteStatus === "accepted"
              ? "Scheduled"
              : "Awaiting agreement",
      ledger.performance !== "upcoming",
    ],
    [
      "Verification",
      ended
        ? "Not required"
        : ledger.performance === "confirmed"
          ? "Admin verified completion"
          : "Awaiting completion verification",
      ledger.performance === "confirmed",
    ],
  ] as const
  const paymentSteps = [
    [
      "Advance",
      ledger.advance === "paid"
        ? "10% advance recorded"
        : ledger.advance === "skipped"
          ? "Advance skipped"
          : ended
            ? "Not collected"
            : "Optional advance not chosen",
      ledger.advance !== "offered",
    ],
    [
      "Final payment",
      ended
        ? "No further collection"
        : ledger.quoteStatus !== "accepted"
          ? "Awaiting agreement"
          : totals.remainingCents
            ? `${money(totals.remainingCents)} outstanding`
            : "No balance due",
      totals.remainingCents === 0,
    ],
    [
      "Settlement",
      totals.refundedCents
        ? "Refunded"
        : ledger.payoutBlocked
          ? "Payout on hold"
          : totals.heldCents
            ? `${money(totals.heldCents)} held by StageLink`
            : totals.paidOutCents
              ? `${money(totals.paidOutCents)} transferred`
              : "No payout yet",
      ledger.payment === "released",
    ],
  ] as const
  return (
    <section className="pw-panel pw-review m4-milestones">
      <span className="sl-eyebrow">FROM REQUEST TO SETTLEMENT</span>
      <h2>Booking journey</h2>
      <p>
        Event progress and money movement are separate. Completion does not
        automatically collect payment or release funds.
      </p>
      {ended && (
        <p className="pw-alert">
          Booking {record.status}. Payment and refund records remain available.
        </p>
      )}
      {[
        ["Event progress", eventSteps],
        ["Payment progress", paymentSteps],
      ].map(([title, steps]) => (
        <div key={String(title)}>
          <h3>{String(title)}</h3>
          <ol className="m4-milestone-list">
            {(steps as typeof eventSteps | typeof paymentSteps).map(
              ([label, detail, done]) => (
                <li key={label} className={done && !ended ? "is-complete" : ""}>
                  <span>
                    {done && !ended ? (
                      <Check size={16} />
                    ) : (
                      <span aria-hidden="true">○</span>
                    )}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ),
            )}
          </ol>
        </div>
      ))}
      {ledger.overtime.some((item) => item.status === "pending") && (
        <p className="pw-alert">
          Pending overtime approval blocks final checkout.
        </p>
      )}
      {record.refund && (
        <p className="pw-alert">
          Refund {record.refund.status}:{" "}
          {record.refund.decisionReason ?? record.refund.reason}
        </p>
      )}
      <h3>Activity history</h3>
      <ol className="pw-activity">
        {record.activity.map((item, index) => (
          <li key={`${item.at}-${index}`}>
            <span>
              <strong>{item.actor ?? "Demo seed"}</strong> · {item.label}
            </span>
            <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}
