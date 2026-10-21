import { Check, MapPin, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { bookingJourney } from '../lib/bookingJourney'
import { useBooking } from '../lib/BookingContext'
import { bookingService, type RecordBooking } from '../lib/pipeline'
import '../journey.css'

export default function BookingMilestones({ record, compact = false }: { record: RecordBooking; compact?: boolean }) {
  const { actor, dispatch } = useBooking()
  const journey = bookingJourney(record)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const provider = actor === bookingService(record).role
  const canCheckIn = provider && journey.agreed && !journey.stopped && !journey.paused && !journey.completed && (!record.ledger.advancePolicy || journey.escrowPaid)
  return <section className={`pw-panel sl-journey ${compact ? 'is-compact' : ''}`} aria-label="Booking milestone tracker">
    <div className="sl-journey-heading"><div><span className="sl-eyebrow">FROM REQUEST TO FINAL ENCORE</span><h2>Booking journey</h2></div><ShieldCheck size={22} aria-hidden="true" /></div>
    <p className="pw-muted">One booking. Every milestone. Completion and payout are confirmed separately.</p>
    {journey.branch && <p className="sl-journey-branch" role="status">{journey.branch}</p>}
    <ol className={`sl-journey-steps ${journey.stopped ? 'is-stopped' : ''}`}>
      {journey.steps.map((step, index) => <li key={step.title} className={`is-${step.state}`} aria-current={!journey.stopped && step.state === 'current' ? 'step' : undefined}>
        <span className="sl-journey-marker" aria-hidden="true">{step.state === 'complete' ? <Check size={16} /> : index + 1}</span>
        <div><span className="sl-journey-step-state">{journey.stopped ? step.state === 'complete' ? 'Recorded' : 'Stopped' : step.state === 'complete' ? 'Confirmed' : step.state === 'current' ? journey.paused ? 'Paused' : 'Current step' : step.state === 'skipped' ? 'Skipped' : 'Up next'}</span><strong>{step.title}</strong><p>{step.detail}</p>
          {index === 4 && <div className="sl-journey-substeps"><span>Event: {journey.completed ? record.ledger.performance === 'confirmed' ? 'verified' : 'reported' : 'pending'}</span><span>Payout: {journey.released ? 'released' : record.ledger.payoutBlocked ? 'on hold' : 'pending'}</span></div>}
        </div>
      </li>)}
    </ol>
    <div className="sl-journey-checkin">
      <h3><MapPin size={17} /> Provider venue check-in</h3>
      {record.venueCheckIn ? <><p>{record.venueCheckIn.venue}</p><p className="pw-caption">{record.venueCheckIn.mode === 'demo' ? 'Simulated' : 'Manually confirmed'} by {record.venueCheckIn.actor} · <time dateTime={record.venueCheckIn.at}>{new Date(record.venueCheckIn.at).toLocaleString()}</time></p></>
        : <><p>{record.venue}</p><p className="pw-caption">{provider ? 'Confirm arrival as a separate step. Starting the rehearsal does not record a check-in.' : 'Your provider records arrival here. No check-in has been confirmed.'}</p>
          {canCheckIn && <><label className="pw-check"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} /> I confirm this is a simulated venue check-in for this booking.</label><button className="btn-primary sl-action" disabled={!confirm} onClick={() => {
            if (!dispatch({ type: 'venue_check_in', id: record.id, mode: 'demo' })) setError('Check-in is no longer available. Review the latest booking status.')
            setConfirm(false)
          }}>Record demo venue check-in</button><p className="pw-caption">Demo only · scheduled date stays unchanged. No location is tracked.</p></>}
          {provider && journey.agreed && !journey.escrowPaid && record.ledger.advancePolicy && <p className="pw-caption">The required 50% escrow payment is needed before check-in.</p>}
        </>}
      {error && <p role="alert" className="pw-error">{error}</p>}
    </div>
    {record.ledger.overtime.some(item => item.status === 'pending') && <p className="sl-journey-branch">Overtime approval is pending. Final checkout is blocked.</p>}
    {!compact && <details className="sl-journey-history"><summary>Activity history · {record.activity.length} updates</summary><ol className="pw-activity">{record.activity.map((item, index) => <li key={`${item.at}-${index}`}><span><strong>{item.actor ?? 'Demo seed'}</strong> · {item.label}</span><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></li>)}</ol></details>}
  </section>
}
