import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, Download, FileText, ReceiptText, X } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { bookingDocument, type BookingDocument } from "../lib/bookingDocuments"
import type { RecordBooking } from "../lib/pipeline"
import { Notice } from "./DashboardUI"
import "../documents.css"

function usePdfDownload() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false)
  const lock = useRef(false)
  const download = async (doc: BookingDocument) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    setReady(false)
    try {
      const { downloadBookingPdf } = await import("../lib/documentPdf")
      await downloadBookingPdf(doc)
      setReady(true)
    } catch {
      setError(
        "The PDF could not be generated. Please try again; your booking is unchanged.",
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { busy, error, ready, download }
}

export function BookingDocumentPreview({
  document: doc,
  onClose,
}: {
  document: BookingDocument
  onClose: () => void
}) {
  const { busy, error, ready, download } = usePdfDownload()
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId()
  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const dialog = ref.current!
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = oldOverflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      else
        document
          .querySelector<HTMLElement>(
            `[data-checkout-return="${doc.bookingId}"]`,
          )
          ?.focus({ preventScroll: true })
    }
  }, [doc.bookingId])
  return (
    <dialog
      ref={ref}
      className="sl-document-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="sl-document-toolbar">
        <div>
          <span className="sl-eyebrow">THE PAPER TRAIL / DEMO VOUCHER</span>
          <h2 id={titleId}>{doc.title}</h2>
        </div>
        <button
          autoFocus
          className="pw-icon"
          aria-label="Close document preview"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="sl-document-actions">
        <button
          className="btn-primary sl-action"
          disabled={busy}
          onClick={() => void download(doc)}
        >
          <Download size={16} />
          {busy ? "Generating PDF…" : "Download PDF"}
        </button>
        <span>{doc.number}</span>
      </div>
      <div className="sl-document-feedback">
        <Notice error>{error}</Notice>
        {ready && (
          <p className="sl-document-ready" role="status">
            <Check size={15} /> PDF download started.
          </p>
        )}
      </div>
      <article
        className="sl-document-paper"
        data-document-kind={doc.kind}
        data-document-number={doc.number}
      >
        <div className="sl-document-brand">
          <strong>
            StageLink<span>.</span>
          </strong>
          <span>DEMONSTRATION DOCUMENT</span>
        </div>
        <h3>{doc.title}</h3>
        <p className="sl-document-number">{doc.number}</p>
        <p className="sl-document-generated">Generated: {doc.generatedAt}</p>
        <div className="sl-document-total">
          <span>{doc.summary.label}</span>
          <strong>{doc.summary.amount}</strong>
          <p>{doc.summary.status}</p>
        </div>
        {doc.sections.map((section) => (
          <section className="sl-document-section" key={section.title}>
            <h4>{section.title}</h4>
            <dl>
              {section.rows.map(([label, value], index) => (
                <div key={index}>
                  <dt>{label}</dt>
                  <dd>{value || "Not specified"}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <footer>
          StageLink demo · {doc.bookingId} · No real payment or tax invoice.
        </footer>
      </article>
    </dialog>
  )
}

export default function BookingDocuments({
  record,
}: {
  record: RecordBooking
}) {
  const { actor } = useBooking()
  const [selected, setSelected] = useState<string | null>(null)
  const { busy, error, ready, download } = usePdfDownload()
  const docs = useMemo(
    () =>
      [
        bookingDocument(record, "invoice"),
        ...record.ledger.installments.map((item) =>
          bookingDocument(record, "receipt", item.kind),
        ),
        ...(actor === "customer"
          ? []
          : [bookingDocument(record, "settlement")]),
      ].filter((item): item is BookingDocument => !!item),
    [record, actor],
  )
  const shown = docs.find((doc) => doc.number === selected)
  return (
    <section
      className="pw-panel pw-review m4-documents"
      aria-label="Booking invoices and receipts"
    >
      <span className="sl-eyebrow">THE PAPER TRAIL</span>
      <h2>Invoices & receipts</h2>
      <p>
        Documents from this booking’s agreed quote and recorded payments. Demo
        documents only.
      </p>
      <Notice error>{error}</Notice>
      {ready && (
        <p className="sl-document-ready" role="status">
          <Check size={15} /> PDF download started.
        </p>
      )}
      {!docs.length && (
        <p className="pw-callout">
          An invoice becomes available after the price is agreed. Receipts
          appear after a successful demo payment.
        </p>
      )}
      {docs.map((doc) => (
        <article
          className="m4-document-row"
          key={doc.number}
          data-document-kind={doc.kind}
          data-document-number={doc.number}
        >
          {doc.kind === "receipt" ? (
            <ReceiptText size={20} />
          ) : (
            <FileText size={20} />
          )}
          <div>
            <strong>{doc.title}</strong>
            <small>{doc.number}</small>
            <span className="sl-document-row-amount">
              {doc.summary.label}: {doc.summary.amount}
            </span>
          </div>
          <button
            className="btn-ghost"
            aria-label={`Preview ${doc.title} ${doc.number}`}
            onClick={() => setSelected(doc.number)}
          >
            Preview
          </button>
          <button
            className="btn-primary sl-action"
            disabled={busy}
            onClick={() => void download(doc)}
            aria-label={`Download ${doc.title} ${doc.number}`}
          >
            <Download size={15} />
            {busy ? "Generating…" : "PDF"}
          </button>
        </article>
      ))}
      {shown && (
        <BookingDocumentPreview
          document={shown}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
