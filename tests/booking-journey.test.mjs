import test from 'node:test'
import assert from 'node:assert/strict'
import { initialPipeline, reducePipeline } from '../src/lib/pipeline.ts'
import { bookingJourney } from '../src/lib/bookingJourney.ts'
import { settlement } from '../src/lib/booking.ts'

const id = 'BK-2901', at = '2026-10-21T10:00:00Z'
const record = state => state.bookings.find(item => item.id === id)
const run = (state, action, actor = 'customer', time = at) => reducePipeline(state, action, actor, time)
const settle = (state, action, actor = 'customer') => run(state, { type: 'settle', id, action }, actor)
function agreed() {
  let state = initialPipeline()
  state = { ...state, bookings: state.bookings.map(item => item.id === id ? { ...item, date: '2026-10-24' } : item) }
  return run(state, { type: 'quote_response', id, quotationId: record(state).quotations.at(-1).id, accept: true, advancePolicy: 'escrow-50' })
}
const paid = () => settle(agreed(), { type: 'collect', kind: 'advance', totalCents: 112500, quoteVersion: 1, method: 'card' })
const checkIn = state => run(state, { type: 'venue_check_in', id, mode: 'demo' }, 'artist')

test('explicit provider check-in gates new escrow events and completion never implies payout release', () => {
  let state = agreed()
  assert.equal(bookingJourney(record(state)).steps[2].state, 'current')
  assert.equal(bookingJourney(record(state)).escrowPaid, false)
  state = paid()
  assert.equal(run(state, { type: 'demo_start', id }, 'artist'), state)
  assert.equal(run(state, { type: 'complete', id }, 'artist', '2026-10-25T22:00:00Z'), state)
  state = checkIn(state)
  assert.equal(record(state).venueCheckIn.venue, record(state).venue)
  assert.equal(record(state).venueCheckIn.actor, 'artist')
  assert.equal(record(state).demoStartedAt, undefined)
  assert.equal(checkIn(state), state)
  state = run(state, { type: 'demo_start', id }, 'artist')
  state = run(state, { type: 'demo_finish', id }, 'artist')
  assert.equal(bookingJourney(record(state)).completed, true)
  assert.equal(bookingJourney(record(state)).released, false)
  assert.match(bookingJourney(record(state)).steps[4].detail, /verification pending/)
  state = settle(state, { type: 'collect', kind: 'final', totalCents: 112500, quoteVersion: 1, method: 'wallet' })
  state = settle(state, { type: 'confirm_performance' }, 'admin')
  assert.equal(bookingJourney(record(state)).released, false)
  state = settle(state, { type: 'release', kind: 'advance' }, 'admin')
  assert.equal(bookingJourney(record(state)).released, false)
  state = settle(state, { type: 'release', kind: 'final' }, 'admin')
  assert.equal(bookingJourney(record(state)).released, true)
  assert.equal(bookingJourney(record(state)).steps.every(step => step.state === 'complete'), true)
  assert.equal(settlement(record(state).ledger).paidOutCents, 213750)
})

test('check-in rejects wrong participants, unpaid, stopped, refund-paused and invalid manual times', () => {
  const state = paid(), action = { type: 'venue_check_in', id, mode: 'demo' }
  for (const actor of ['customer', 'renter', 'admin', 'visitor']) assert.equal(run(state, action, actor), state)
  assert.equal(run(agreed(), action, 'artist').bookings.find(item => item.id === id).venueCheckIn, undefined)
  assert.equal(run(state, { ...action, mode: 'invented' }, 'artist'), state)
  assert.equal(run(state, { ...action, mode: 'manual' }, 'artist'), state)
  // Scheduled times use the same local-date contract as the existing booking calendar.
  const localWindow = new Date('2026-10-24T19:30:00').toISOString()
  assert.notEqual(run(state, { ...action, mode: 'manual' }, 'artist', localWindow), state)
  const refunded = run(state, { type: 'refund', id, reason: 'Our gala has been postponed.' })
  assert.equal(run(refunded, action, 'artist'), refunded)
  const held = settle(state, { type: 'toggle_hold' }, 'admin')
  assert.equal(run(held, action, 'artist'), held)
  const cancelled = run(agreed(), { type: 'cancel', id })
  assert.equal(run(cancelled, action, 'artist'), cancelled)
})

test('legacy demo start is not venue check-in, and refund/cancel/hold branches remain visible', () => {
  let legacy = run(initialPipeline(), { type: 'agree', id })
  legacy = settle(legacy, { type: 'skip_advance' })
  legacy = run(legacy, { type: 'demo_start', id }, 'artist')
  assert.ok(record(legacy).demoStartedAt)
  assert.equal(bookingJourney(record(legacy)).checkedIn, false)
  assert.equal(bookingJourney(record(legacy)).steps[2].state, 'skipped')
  let state = run(paid(), { type: 'refund', id, reason: 'Our gala has been postponed.' })
  assert.equal(bookingJourney(record(state)).paused, true)
  assert.match(bookingJourney(record(state)).branch, /Refund under review/)
  state = run(state, { type: 'resolve_refund', id, approve: true, reason: 'Verified with both booking participants.' }, 'admin')
  assert.equal(bookingJourney(record(state)).stopped, true)
  assert.match(bookingJourney(record(state)).branch, /Refunded/)
  assert.equal(bookingJourney(record(state)).released, false)
  assert.match(bookingJourney(record(settle(paid(), { type: 'toggle_hold' }, 'admin'))).branch, /Payout on hold/)
})
