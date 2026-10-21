import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { initialPipeline, reducePipeline } from "../src/lib/pipeline.ts"
import { bookingDocument } from "../src/lib/bookingDocuments.ts"
import { renderBookingPdf, loadPdfFonts } from "../src/lib/documentPdf.ts"

const id = "BK-2901",
  at = "2026-10-21T10:00:00Z"
const rec = (s) => s.bookings.find((r) => r.id === id)
const run = (s, a, actor = "customer") => reducePipeline(s, a, actor, at)
const settle = (s, a, actor = "customer") =>
  run(s, { type: "settle", id, action: a }, actor)
function agreed() {
  const s = initialPipeline()
  return run(s, {
    type: "quote_response",
    id,
    quotationId: rec(s).quotations.at(-1).id,
    accept: true,
    advancePolicy: "escrow-50",
  })
}
const paid = () =>
  settle(agreed(), {
    type: "collect",
    kind: "advance",
    totalCents: 112500,
    quoteVersion: 1,
    method: "card",
  })
const find = (d, section, label) =>
  d.sections
    .find((s) => s.title === section)
    ?.rows.find(([l]) => l === label)?.[1]

test("invoice and payment receipt keep separate identities, transaction amounts and the required 50% policy", () => {
  const a = agreed(),
    s = paid(),
    invoice = bookingDocument(rec(s), "invoice", undefined, at),
    receipt = bookingDocument(rec(s), "receipt", "advance", at)
  assert.equal(bookingDocument(rec(a), "receipt", "advance"), null)
  assert.equal(invoice.number, "INV-BK-2901-V1")
  assert.equal(invoice.summary.amount, "$2,250.00")
  assert.equal(receipt.number, "RCT-BK-2901-ADVANCE")
  assert.equal(receipt.summary.amount, "$1,125.00")
  assert.equal(
    find(invoice, "Customer account", "Advance policy"),
    "Required 50% escrow advance",
  )
  assert.equal(
    find(invoice, "Customer account", "Outstanding balance"),
    "$1,125.00",
  )
  assert.equal(
    find(receipt, "Receipt transaction", "Transaction"),
    "TX-BK-2901-ADVANCE",
  )
  assert.equal(
    find(receipt, "Receipt transaction", "Payment kind"),
    "50% advance",
  )
  assert.equal(find(receipt, "Receipt transaction", "Method"), "Demo card")
  assert.equal(
    find(receipt, "Receipt transaction", "Status"),
    "Held by StageLink",
  )
  assert.ok(!invoice.sections.some((s) => s.title === "Receipt transaction"))
  assert.ok(!receipt.sections.some((s) => s.title === "Provider payout only"))
})

test("final and refunded receipts show their own installment and current ledger disposition", () => {
  let s = paid()
  s = run(s, { type: "venue_check_in", id, mode: "demo" }, "artist")
  s = run(s, { type: "demo_start", id }, "artist")
  s = run(s, { type: "demo_finish", id }, "artist")
  assert.equal(bookingDocument(rec(s), "receipt", "final"), null)
  s = settle(s, {
    type: "collect",
    kind: "final",
    totalCents: 112500,
    quoteVersion: 1,
    method: "wallet",
  })
  const final = bookingDocument(rec(s), "receipt", "final", at)
  assert.equal(final.number, "RCT-BK-2901-FINAL")
  assert.equal(find(final, "Receipt transaction", "Method"), "Demo wallet")
  assert.equal(find(final, "Customer account", "Outstanding balance"), "$0.00")
  let refund = run(paid(), {
    type: "refund",
    id,
    reason: "The organizer has postponed this event.",
  })
  refund = run(
    refund,
    {
      type: "resolve_refund",
      id,
      approve: true,
      reason: "Both booking participants confirmed the cancellation.",
    },
    "admin",
  )
  const receipt = bookingDocument(rec(refund), "receipt", "advance", at)
  assert.equal(receipt.summary.status, "Refunded to customer")
  assert.equal(find(receipt, "Receipt transaction", "Status"), "Refunded")
  assert.equal(find(receipt, "Customer account", "Net customer paid"), "$0.00")
})

const fonts = Object.fromEntries(
  ["regular", "bold"].map((weight) => [
    weight,
    readFileSync(
      new URL(
        `../public/fonts/NotoSans-${
          weight === "regular" ? "Regular" : "Bold"
        }.ttf`,
        import.meta.url,
      ),
    ).toString("base64"),
  ]),
)
test("real embedded-font PDF bytes support distinct document types and long multi-page records", () => {
  const doc = bookingDocument(rec(paid()), "receipt", "advance", at),
    pdf = renderBookingPdf(doc, fonts),
    bytes = Buffer.from(pdf.output("arraybuffer"))
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-")
  assert.ok(bytes.includes(Buffer.from("/FontFile2")))
  assert.ok(pdf.getNumberOfPages() >= 1)
  const long = {
    ...doc,
    sections: [
      ...doc.sections,
      {
        title: "Long event notes",
        rows: [
          [
            "Details",
            Array(400)
              .fill("Café performance - equipment and handover notes.")
              .join(" "),
          ],
        ],
      },
    ],
  }
  assert.ok(
    renderBookingPdf(long, fonts).getNumberOfPages() > pdf.getNumberOfPages(),
  )
})

test("document font loading retries after failure and caches successful font assets", async () => {
  const previous = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = async () => {
      calls++
      return { ok: false }
    }
    await assert.rejects(loadPdfFonts(), /fonts could not load/)
    globalThis.fetch = async (url) => {
      calls++
      const weight = String(url).includes("Bold") ? "bold" : "regular"
      const bytes = Buffer.from(fonts[weight], "base64")
      return {
        ok: true,
        arrayBuffer: async () =>
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
      }
    }
    const loaded = await loadPdfFonts()
    assert.deepEqual(loaded, fonts)
    const before = calls
    assert.equal(await loadPdfFonts(), loaded)
    assert.equal(calls, before)
  } finally {
    globalThis.fetch = previous
  }
})
