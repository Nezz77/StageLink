import { useState } from "react"
import { Download, FileText } from "lucide-react"
import { useBooking } from "../lib/BookingContext"
import { bookingDocument, type BookingDocument } from "../lib/bookingDocuments"
import type { RecordBooking } from "../lib/pipeline"
import { Modal, Notice } from "./DashboardUI"

export default function BookingDocuments({
  record,
}: {
  record: RecordBooking
}) {
  const { actor } = useBooking()
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const docs = [
    bookingDocument(record, "invoice"),
    ...record.ledger.installments.map((item) =>
      bookingDocument(record, "receipt", item.kind),
    ),
    ...(actor === "customer" ? [] : [bookingDocument(record, "settlement")]),
  ].filter((item): item is BookingDocument => !!item)
  const shown = docs.find((doc) => doc.number === selected)
  const download = async (doc: BookingDocument) => {
    setBusy(true)
    setError("")
    try {
      const { downloadBookingPdf } = await import("../lib/documentPdf")
      await downloadBookingPdf(doc)
    } catch {
      setError(
        "The PDF could not be generated. Please try again; your booking is unchanged.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="pw-panel pw-review m4-documents">
      <span className="sl-eyebrow">THE PAPER TRAIL</span>
      <h2>Invoices & receipts</h2>
      <p>
        Live document details from this booking. Demo documents only; no real
        payment processed.
      </p>
      <Notice error>{error}</Notice>
      {!docs.length && (
        <p className="pw-callout">
          An invoice becomes available after the price is agreed. Receipts
          appear after a successful demo payment.
        </p>
      )}
      {docs.map((doc) => (
        <article className="m4-document-row" key={doc.number}>
          <FileText size={20} />
          <div>
            <strong>{doc.title}</strong>
            <small>{doc.number}</small>
          </div>
          <button className="btn-ghost" onClick={() => setSelected(doc.number)}>
            Preview
          </button>
          <button
            className="btn-primary sl-action"
            disabled={busy}
            onClick={() => void download(doc)}
            aria-label={`Download ${doc.title} ${doc.number}`}
          >
            <Download size={15} />
            PDF
          </button>
        </article>
      ))}
      {shown && (
        <Modal title={shown.title} onClose={() => setSelected(null)}>
          <div className="m4-document-preview">
            <p className="sl-eyebrow">{shown.number} · DEMO ONLY</p>
            <Notice error>{error}</Notice>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => void download(shown)}
            >
              {busy ? "Generating PDF…" : "Download PDF"}
            </button>
            {shown.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
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
          </div>
        </Modal>
      )}
    </section>
  )
}
