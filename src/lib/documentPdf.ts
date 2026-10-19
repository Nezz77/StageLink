import { jsPDF } from "jspdf"
import type { BookingDocument } from "./bookingDocuments"

export type PdfFonts = { regular: string; bold: string }
const base64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  let text = ""
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(text)
}
let fontsPromise: Promise<PdfFonts> | undefined
async function loadFonts() {
  if (!fontsPromise)
    fontsPromise = Promise.all(
      ["Regular", "Bold"].map(async (weight) => {
        const response = await fetch(`/fonts/NotoSans-${weight}.ttf`)
        if (!response.ok)
          throw new Error("Document fonts could not load. Please try again.")
        return base64(await response.arrayBuffer())
      }),
    )
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((error) => {
        fontsPromise = undefined
        throw error
      })
  return fontsPromise
}
/** Plain text only: never evaluate HTML or user-supplied PDF operations. */
export function renderBookingPdf(document: BookingDocument, fonts: PdfFonts) {
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  })
  pdf.addFileToVFS("NotoSans-Regular.ttf", fonts.regular)
  pdf.addFont("NotoSans-Regular.ttf", "StageLink", "normal")
  pdf.addFileToVFS("NotoSans-Bold.ttf", fonts.bold)
  pdf.addFont("NotoSans-Bold.ttf", "StageLink", "bold")
  pdf.setProperties({
    title: `StageLink · ${document.title}`,
    subject: "Demo only - no real payment processed",
    author: "StageLink demo",
  })
  let y = 0
  const header = () => {
    pdf.setFillColor(25, 18, 44)
    pdf.rect(0, 0, 210, 34, "F")
    pdf.setFont("StageLink", "bold")
    pdf.setFontSize(20)
    pdf.setTextColor(255, 255, 255)
    pdf.text("StageLink", 17, 17)
    pdf.setFontSize(8)
    pdf.text("DEMONSTRATION DOCUMENT · NO REAL PAYMENT", 17, 25)
    y = 45
    pdf.setTextColor(34, 30, 44)
  }
  const nextPage = () => {
    pdf.addPage()
    header()
  }
  const ensure = (height: number) => {
    if (y + height > 275) nextPage()
  }
  const text = (value: string, size = 10, bold = false) => {
    pdf.setFont("StageLink", bold ? "bold" : "normal")
    pdf.setFontSize(size)
    const lines = pdf.splitTextToSize(
      value.replace(/[\u0000-\u0008\u000b-\u001f]/g, ""),
      176,
    ) as string[]
    for (const line of lines) {
      ensure(size * 0.48 + 2)
      pdf.text(line, 17, y)
      y += size * 0.48 + 1
    }
  }
  header()
  text(document.title, 17, true)
  text(document.number, 10)
  text(`Generated: ${document.generatedAt}`, 8)
  y += 5
  for (const section of document.sections) {
    ensure(24)
    pdf.setFillColor(239, 234, 249)
    pdf.roundedRect(15, y - 5, 180, 10, 2, 2, "F")
    text(section.title, 11, true)
    y += 5
    for (const [label, value] of section.rows) {
      ensure(17)
      text(label, 9, true)
      text(value || "Not specified", 10)
      y += 3
    }
    y += 5
  }
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    pdf.setDrawColor(215, 208, 228)
    pdf.line(17, 282, 193, 282)
    pdf.setFont("StageLink", "normal")
    pdf.setFontSize(7)
    pdf.setTextColor(95, 88, 105)
    pdf.text(`${document.number} · DEMO ONLY`, 17, 288)
    pdf.text(`${page} / ${pages}`, 193, 288, { align: "right" })
  }
  return pdf
}
export async function downloadBookingPdf(document: BookingDocument) {
  const pdf = renderBookingPdf(document, await loadFonts())
  pdf.save(document.filename)
}
