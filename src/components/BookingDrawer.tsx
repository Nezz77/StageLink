import { GigPackageSummary } from './GigPackages'
import StockAvailability from './StockAvailability'
import { useEffect, useId, useRef } from 'react'
import { ArrowUpRight, CalendarDays, MessageCircle, X } from 'lucide-react'
import { bookingService, type RecordBooking } from '../lib/pipeline'
import { money, settlement } from '../lib/booking'
import BookingMilestones from './BookingMilestones'
import '../journey.css'

export default function BookingDrawer({ record, onClose, onDetails, onChat }: { record: RecordBooking; onClose: () => void; onDetails: () => void; onChat: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const totals = settlement(record.ledger)
  const unquoted = record.gigPackage?.pricing === 'custom' && !record.quotations.length
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current!.showModal()
    return () => {
      ref.current?.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
      else document.querySelector<HTMLElement>('[data-booking-desk]')?.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className="sl-booking-drawer" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
  }}>
    <header className="sl-drawer-header"><div><span className="sl-eyebrow">{record.id} / BOOKING OVERVIEW</span><h2 id={titleId}>{record.event}</h2><p>{bookingService(record).name}</p></div><button autoFocus className="pw-icon" aria-label="Close booking details" onClick={onClose}><X size={20} /></button></header>
    <div className="sl-drawer-content"><div className="sl-drawer-date"><CalendarDays size={20} /><div><strong>{new Date(`${record.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {record.start}–{record.end}</strong><p>{record.venue}</p></div></div>
      <dl className="sl-drawer-money"><div><dt>{record.ledger.quoteStatus === 'accepted' ? 'Agreed total' : 'Requested total'}</dt><dd>{unquoted ? 'Custom quote required' : money(totals.totalCents)}</dd></div><div><dt>Held in escrow</dt><dd>{money(totals.heldCents)}</dd></div><div><dt>Remaining balance</dt><dd>{unquoted ? 'To be agreed' : money(totals.remainingCents)}</dd></div></dl>
      <GigPackageSummary snapshot={record.gigPackage} />
      <StockAvailability serviceId={record.serviceId} date={record.date} record={record} compact />
      <BookingMilestones record={record} compact />
      <p className="pw-caption">Temporary frontend demo · refreshing resets this booking’s progress.</p>
    </div>
    <footer className="sl-drawer-footer"><button className="btn-ghost sl-action" onClick={onChat}><MessageCircle size={16} /> Booking chat</button><button className="btn-primary sl-action" onClick={onDetails}>Full booking details <ArrowUpRight size={16} /></button></footer>
  </dialog>
}
