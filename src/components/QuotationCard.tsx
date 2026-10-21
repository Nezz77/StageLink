import { useState } from "react"
import { FileCheck, Plus, Trash2, ShieldCheck, ArrowUpRight } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { useDashboard } from "../lib/DashboardContext"
import {
  bookingService,
  negotiationOpen,
  type RecordBooking,
} from "../lib/pipeline"
import { money, advancePercent, checkoutFor, settlement } from "../lib/booking"
import {
  parseMoney,
  quoteError,
  quoteTotal,
  type Quotation,
  type QuoteInput,
} from "../lib/quotations"
import { draftKey } from "../lib/dashboard"
import {
  Modal,
  Notice,
  useDraftGuard,
  requestDashboardNavigation,
} from "./DashboardUI"

export function QuoteComposer({
  record,
  onClose,
}: {
  record: RecordBooking
  onClose: () => void
}) {
  const { actor, dispatch } = useBooking()
  const { state, dispatch: manage } = useDashboard()
  const key = `quotation:${record.id}`
  const saved = state.drafts[draftKey(actor, key)]
  const latest = record.quotations.at(-1)
  const [version] = useState(record.ledger.quoteVersion)
  const [description, setDescription] = useState(
    saved?.description ?? latest?.description ?? bookingService(record).detail,
  )
  const [notes, setNotes] = useState(saved?.notes ?? ""),
    [included, setIncluded] = useState(
      saved?.included ?? latest?.included ?? "",
    )
  const [lines, setLines] = useState<{
    description: string
    quantity: string
    price: string
  }[]>(() => {
    if (saved?.lines) {
      try {
        return JSON.parse(saved.lines)
      } catch {
        /* stale draft: use the current offer */
      }
    }
    return (
      latest?.lines ?? [
        {
          description: "Agreed service",
          quantity: 1,
          unitCents: record.ledger.quoteCents,
        },
      ]
    ).map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      price: (line.unitCents / 100).toFixed(2),
    }))
  })
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false)
  const guard = useDraftGuard(dirty)
  const input: QuoteInput = {
    description,
    notes,
    included,
    lines: lines.map((line) => ({
      description: line.description,
      quantity: /^\d+$/.test(line.quantity) ? Number(line.quantity) : 0,
      unitCents: parseMoney(line.price) ?? 0,
    })),
  }
  const changeLine = (
    index: number,
    field: "description" | "quantity" | "price",
    value: string,
  ) => {
    setDirty(true)
    setLines((old) =>
      old.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    )
  }
  return (
    <>
      <Modal
        title={
          actor === "customer" ? "Make a counteroffer" : "Create quotation"
        }
        onClose={() => requestDashboardNavigation(onClose)}
      >
        <form
          className="mg-form"
          onSubmit={(event) => {
            event.preventDefault()
            const issue = quoteError(input)
            if (issue) {
              setError(issue)
              return
            }
            if (
              !dispatch({
                type: "quotation",
                id: record.id,
                expectedVersion: version,
                input,
              })
            ) {
              setError(
                "This offer is out of date, the booking is locked, or availability changed. Close this form and review the latest booking.",
              )
              return
            }
            manage({ type: "discard_draft", key })
            setDirty(false)
            onClose()
          }}
        >
          <p className="mg-muted">
            {record.id} · {bookingService(record).provider}
            <br />
            {record.date} · {record.start}–{record.end}
            <br />
            Version {version + 1} · Sent only in this demo.
          </p>
          <label className="mg-field">
            Service description
            <textarea
              value={description}
              maxLength={500}
              required
              onChange={(event) => {
                setDescription(event.target.value)
                setDirty(true)
              }}
            />
          </label>
          <fieldset className="m4-lines">
            <legend>Itemised charges</legend>
            {lines.map((line, index) => (
              <div key={index} className="m4-charge">
                <label className="mg-field">
                  Charge {index + 1}
                  <input
                    aria-label={`Charge ${index + 1} description`}
                    maxLength={200}
                    value={line.description}
                    onChange={(event) =>
                      changeLine(index, "description", event.target.value)
                    }
                  />
                </label>
                <label className="mg-field">
                  Quantity
                  <input
                    aria-label={`Charge ${index + 1} quantity`}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(event) =>
                      changeLine(index, "quantity", event.target.value)
                    }
                  />
                </label>
                <label className="mg-field">
                  Unit price (USD)
                  <input
                    aria-label={`Charge ${index + 1} price`}
                    inputMode="decimal"
                    value={line.price}
                    onChange={(event) =>
                      changeLine(index, "price", event.target.value)
                    }
                  />
                </label>
                <button
                  className="btn-ghost"
                  type="button"
                  disabled={lines.length === 1}
                  aria-label={`Remove charge ${index + 1}`}
                  onClick={() => {
                    setLines((old) => old.filter((_, i) => i !== index))
                    setDirty(true)
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn-ghost sl-action"
            disabled={lines.length >= 12}
            onClick={() => {
              setLines((old) => [
                ...old,
                { description: "", quantity: "1", price: "" },
              ])
              setDirty(true)
            }}
          >
            <Plus size={15} />
            Add charge
          </button>
          <label className="mg-field">
            Included services
            <textarea
              maxLength={2000}
              value={included}
              onChange={(event) => {
                setIncluded(event.target.value)
                setDirty(true)
              }}
            />
          </label>
          <label className="mg-field">
            Notes
            <textarea
              maxLength={2000}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setDirty(true)
              }}
            />
          </label>
          <p className="m4-quote-total">
            Offer total <strong>{money(quoteTotal(input.lines))}</strong>
          </p>
          <p className="mg-muted">
            The 5% StageLink fee is deducted from the provider payout once. It
            is not added to the customer price.
          </p>
          <p className="mg-muted">Required 50% demo escrow: {money(Math.round(quoteTotal(input.lines) / 2))}. Remaining after performance: {money(quoteTotal(input.lines) - Math.round(quoteTotal(input.lines) / 2))}.</p>
          <Notice error>{error}</Notice>
          <Notice>{notice}</Notice>
          <div className="pw-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (
                  manage({
                    type: "draft",
                    key,
                    values: {
                      description,
                      notes,
                      included,
                      lines: JSON.stringify(lines),
                    },
                  })
                ) {
                  setDirty(false)
                  setNotice("Quotation draft saved for this session.")
                } else
                  setError(
                    "This draft is too large. Shorten the charge descriptions.",
                  )
              }}
            >
              Save for later
            </button>
            <button className="btn-primary">
              {actor === "customer" ? "Send counteroffer" : "Send quotation"}
            </button>
          </div>
        </form>
      </Modal>
      {guard}
    </>
  )
}

export default function QuotationCard({
  quote,
  record,
  onCounter,
  onBooking,
  onCheckout,
}: {
  quote: Quotation
  record: RecordBooking
  onCounter: () => void
  onBooking: () => void
  onCheckout: () => void
}) {
  const { actor, dispatch } = useBooking()
  const [error, setError] = useState("")
  const current =
    quote.version === record.ledger.quoteVersion && quote.status === "pending"
  const canAnswer =
    current &&
    negotiationOpen(record) &&
    actor !== quote.offeredBy &&
    ["customer", bookingService(record).role].includes(actor)
  const percent = quote.status === "accepted" ? advancePercent(record.ledger) : 50
  const deposit = Math.round(quote.totalCents * percent / 100)
  const paid = record.ledger.installments.some(item => item.kind === "advance" && !item.refundedAt)
  const due = quote.status === "accepted" ? checkoutFor(record.ledger) : null
  const accept = () => {
    const ok = dispatch({ type: "quote_response", id: record.id, quotationId: quote.id, accept: true, advancePolicy: "escrow-50" })
    if (!ok) { setError("This offer is outdated or unavailable. Review the latest quotation."); return }
    if (actor === "customer") onCheckout()
  }
  return (
    <article
      className={`m4-quote m4-quote-${quote.status}`}
      aria-label={`Quotation version ${quote.version}`}
      data-quote-attention={quote.version === record.ledger.quoteVersion && quote.status !== "superseded" ? "true" : undefined}
    >
      <header>
        <span className="sl-eyebrow">
          <FileCheck size={16} />{" "}
          {quote.offeredBy === "customer"
            ? "CUSTOMER OFFER"
            : "PROVIDER QUOTATION"}
        </span>
        <span className="mg-badge">
          v{quote.version} · {quote.status}
        </span>
      </header>
      <h3>{quote.description}</h3>
      <p>
        {quote.providerName} · {quote.customerName}
        <br />
        {quote.bookingId} · {quote.eventDate} · {quote.start}–{quote.end}
      </p>
      <dl className="m4-quote-charges">
        {quote.lines.map((line, index) => (
          <div key={index}>
            <dt>
              {line.description}{" "}
              <small>
                ({line.quantity} × {money(line.unitCents)})
              </small>
            </dt>
            <dd>{money(line.quantity * line.unitCents)}</dd>
          </div>
        ))}
      </dl>
      <p className="m4-quote-total">
        Total <strong>{money(quote.totalCents)}</strong>
      </p>
      <div className="m4-escrow-summary" aria-label="Quotation payment breakdown">
        <div><span><ShieldCheck size={16} />{percent}% advance {percent === 50 ? "required" : "(legacy policy)"}</span><strong>{money(deposit)}</strong></div>
        <div><span>Remaining after performance</span><strong>{money(quote.totalCents - deposit)}</strong></div>
        <p>{paid ? `${money(settlement(record.ledger).heldCents)} held in demo escrow.` : "Accepting agrees this quote. Payment is recorded only after demo checkout succeeds."}</p>
        <small>Demo only · no real funds or gateway connection</small>
      </div>
      {quote.included && (
        <p>
          <strong>Includes</strong>
          <br />
          {quote.included}
        </p>
      )}
      {quote.notes && (
        <p>
          <strong>Notes</strong>
          <br />
          {quote.notes}
        </p>
      )}
      {quote.decidedAt && (
        <small>
          {quote.decidedBy ?? "Participant"} ·{" "}
          {new Date(quote.decidedAt).toLocaleString()}
        </small>
      )}
      <Notice error>{error}</Notice>
      {canAnswer && (
        <div className="pw-actions">
          <button
            className="btn-primary"
            onClick={accept}
          >
            {actor === "customer" ? "Accept & Pay Escrow" : "Accept counter-offer"}
          </button>
          <button className="btn-ghost" onClick={onCounter}>
            Counter-Offer
          </button>
          <button
            className="pw-text-button"
            onClick={() => {
              if (
                !dispatch({
                  type: "quote_response",
                  id: record.id,
                  quotationId: quote.id,
                  accept: false,
                })
              )
                setError("This offer is no longer available.")
            }}
          >
            Decline offer
          </button>
        </div>
      )}
      {quote.status === "pending" && !canAnswer && (
        <p className="mg-muted">
          {quote.offeredBy === actor
            ? "Waiting for the other participant. You cannot accept your own offer."
            : "This offer is no longer actionable."}
        </p>
      )}
      {quote.status === "accepted" && (
        <div className="pw-actions">
          <span className="mg-notice">{paid ? "Advance paid · held in demo escrow" : "Quote accepted · payment pending"}</span>
          {actor === "customer" && due?.kind === "advance" && <button className="btn-primary" onClick={onCheckout}>Pay {percent}% Escrow <ArrowUpRight size={16} /></button>}
          <button className="btn-ghost" onClick={onBooking}>
            View booking & payment
          </button>
        </div>
      )}
    </article>
  )
}
