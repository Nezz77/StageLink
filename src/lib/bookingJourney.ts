import { advancePercent, money, settlement } from './booking.ts'
import type { RecordBooking } from './pipeline.ts'

export type JourneyStep = { title: string; detail: string; state: 'complete' | 'current' | 'waiting' | 'skipped' }

// Read the shared booking record; presentation never advances the booking.
export function bookingJourney(record: RecordBooking) {
  const ledger = record.ledger
  const totals = settlement(ledger)
  const ended = record.status === 'cancelled' || record.status === 'rejected'
  const refunded = ledger.payment === 'refunded' || record.refund?.status === 'refunded'
  const paused = record.refund?.status === 'requested' || ledger.payoutBlocked
  const agreed = ledger.quoteStatus === 'accepted'
  const escrowPaid = ledger.advance === 'paid' && ledger.installments.some(item => item.kind === 'advance')
  const checkedIn = !!record.venueCheckIn
  const completed = ledger.performance !== 'upcoming'
  const released = completed && ledger.performance === 'confirmed' && totals.remainingCents === 0 && totals.heldCents === 0 && totals.paidOutCents > 0 && ledger.payment === 'released'
  const steps: JourneyStep[] = [
    { title: 'Requested', detail: record.status === 'pending' ? 'Waiting for provider review' : 'Booking request recorded', state: record.status === 'pending' ? 'current' : 'complete' },
    { title: 'Quote Accepted', detail: agreed ? `Version ${ledger.quoteVersion} agreed · ${money(ledger.quoteCents)}` : ledger.quoteStatus === 'declined' ? 'Quote declined · a new offer is needed' : 'Waiting for agreement on the current quote', state: agreed ? 'complete' : 'current' },
    { title: 'Escrow Paid', detail: refunded ? 'Payment refunded · payment history retained' : escrowPaid ? `${advancePercent(ledger)}% advance recorded · ${money(totals.heldCents)} currently held` : ledger.advance === 'skipped' ? 'Legacy booking · advance was skipped' : `${advancePercent(ledger)}% advance not paid`, state: escrowPaid ? 'complete' : ledger.advance === 'skipped' ? 'skipped' : agreed ? 'current' : 'waiting' },
    { title: 'Venue Check-in', detail: record.venueCheckIn ? `${record.venueCheckIn.mode === 'demo' ? 'Demo' : 'Manual'} check-in · ${record.venueCheckIn.venue}` : 'No provider check-in recorded', state: checkedIn ? 'complete' : (escrowPaid || ledger.advance === 'skipped') ? 'current' : 'waiting' },
    { title: 'Completed & Payout Released', detail: released ? `${money(totals.paidOutCents)} paid to provider · fee ${money(totals.feeChargedCents)}` : !completed ? 'Event completion and payout are still pending' : ledger.performance === 'reported' ? 'Completion reported · admin verification pending' : totals.remainingCents > 0 ? `Completion verified · ${money(totals.remainingCents)} balance due` : totals.heldCents > 0 ? `Completion verified · ${money(totals.heldCents)} awaiting payout${ledger.payoutBlocked ? ' · on hold' : ''}` : 'Completion verified · payout not recorded', state: released ? 'complete' : completed || checkedIn ? 'current' : 'waiting' },
  ]
  // Only the next unmet milestone is current; historical missing evidence stays visible.
  let currentFound = false
  for (const step of steps) {
    if (step.state === 'current') {
      if (currentFound) step.state = 'waiting'
      currentFound = true
    }
  }
  const branch = refunded ? 'Refunded — funds were returned; this booking will not progress to payout.'
    : ended ? `Booking ${record.status} — remaining steps are stopped. Existing payment records are retained.`
    : record.refund?.status === 'requested' ? 'Refund under review — booking actions and payout are paused.'
    : ledger.payoutBlocked ? 'Payout on hold — resolve the payment or dispute review before releasing funds.'
    : ledger.quoteStatus === 'declined' ? 'Quote declined — a new quotation is needed before payment.'
    : null
  return { steps, totals, agreed, escrowPaid, checkedIn, completed, released, stopped: ended || refunded, paused, branch }
}
