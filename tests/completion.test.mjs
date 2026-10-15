import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPipeline, reducePipeline, canCancel, canRefund, performanceStarted, notificationsFor, messageSeen, unreadFor, conflicts, paymentLabel } from '../src/lib/pipeline.ts';
import { checkoutFor, canRelease, settlement, transitionBooking } from '../src/lib/booking.ts';
const at = '2026-10-14T09:00:00.000Z', id = 'BK-2901';
const run = (state, action, actor = 'customer', time = at) => reducePipeline(state, action, actor, time);
const settle = (state, action, actor = 'customer') => run(state, { type: 'settle', id, action }, actor);
const record = state => state.bookings.find(item => item.id === id);
const agreed = () => run(initialPipeline(), { type: 'agree', id });
const paid = () => settle(agreed(), { type: 'collect', kind: 'advance', totalCents: 22500, quoteVersion: 1, method: 'card' });
const requested = state => run(state, { type: 'refund', id, reason: 'Our event has been postponed.' });
const decision = approve => ({ type: 'resolve_refund', id, approve, reason: 'Reviewed the cancellation with both participants.' });

test('only admin can resolve a pending refund, with a reason and explicit boolean decision', () => {
  const state = requested(paid());
  for (const actor of ['customer', 'artist', 'renter', 'visitor']) assert.equal(run(state, decision(true), actor), state);
  for (const action of [{ ...decision(true), reason: 'no' }, { ...decision(true), approve: 'yes' }]) assert.equal(run(state, action, 'admin'), state);
  assert.equal(run(paid(), decision(true), 'admin').bookings[0].refund, undefined);
});
test('approved refund returns held funds once, cancels booking, frees availability and disables future charges', () => {
  const state = requested(paid()), next = run(state, decision(true), 'admin'), booking = record(next), totals = settlement(booking.ledger);
  assert.equal(booking.refund.status, 'refunded'); assert.equal(booking.status, 'cancelled');
  assert.equal(totals.receivedCents, 22500); assert.equal(totals.refundedCents, 22500); assert.equal(totals.heldCents, 0);
  assert.equal(totals.remainingCents, 0); assert.equal(totals.paidOutCents, 0); assert.equal(totals.feeChargedCents, 0);
  assert.equal(checkoutFor(booking.ledger), null); assert.equal(canRelease(booking.ledger, 'advance'), false);
  assert.equal(run(next, decision(true), 'admin'), next);
  assert.equal(settle(next, { type: 'release', kind: 'advance' }, 'admin'), next);
  assert.equal(transitionBooking(booking.ledger, { type: 'toggle_hold' }, 'admin'), booking.ledger);
  assert.equal(conflicts({ ...booking, id: 'BK-NEW' }, next.bookings).length, 0);
});
test('declined refund resumes booking and preserves any hold that existed before the request', () => {
  for (const held of [false, true]) {
    let state = paid(); if (held) state = settle(state, { type: 'toggle_hold' }, 'admin');
    state = run(requested(state), decision(false), 'admin');
    const booking = record(state);
    assert.equal(booking.refund.status, 'declined'); assert.equal(booking.status, 'active');
    assert.equal(booking.ledger.payoutBlocked, held); assert.equal(canRelease(booking.ledger, 'advance'), !held);
    assert.notEqual(paymentLabel(booking), 'Refund requested');
    const started = run(state, { type: 'demo_start', id }, 'artist'); assert.notEqual(started, state);
    if (held) state = settle(state, { type: 'toggle_hold' }, 'admin');
    state = settle(state, { type: 'release', kind: 'advance' }, 'admin');
    assert.equal(settlement(record(state).ledger).feeChargedCents, 11250);
  }
});
test('started demo and already released advance are ineligible for refunds', () => {
  assert.equal(canRefund(record(run(paid(), { type: 'demo_start', id }, 'artist')), new Date(at)), false);
  assert.equal(canRefund(record(settle(paid(), { type: 'release', kind: 'advance' }, 'admin')), new Date(at)), false);
  assert.equal(run(requested(paid()), { type: 'demo_start', id }, 'artist').bookings[0].demoStartedAt, undefined);
});
test('demo advances only the matching provider and respects pending overtime, final payment and one fee', () => {
  let state = paid();
  for (const actor of ['customer', 'renter', 'admin', 'visitor']) assert.equal(run(state, { type: 'demo_start', id }, actor), state);
  assert.equal(run(state, { type: 'demo_finish', id }, 'artist'), state);
  state = run(state, { type: 'demo_start', id }, 'artist');
  assert.equal(record(state).date, '2026-10-18'); assert.equal(performanceStarted(record(state), new Date(at)), true);
  assert.equal(run(state, { type: 'demo_start', id }, 'artist'), state);
  state = settle(state, { type: 'propose_overtime', id: 'OT-DEMO', minutes: 60, amountCents: 40000 });
  assert.equal(run(state, { type: 'demo_finish', id }, 'artist'), state);
  state = settle(state, { type: 'resolve_overtime', id: 'OT-DEMO', accept: true }, 'artist');
  state = run(state, { type: 'demo_finish', id }, 'artist');
  assert.deepEqual(checkoutFor(record(state).ledger), { kind: 'final', amountCents: 242500 });
  state = settle(state, { type: 'collect', kind: 'final', totalCents: 242500, quoteVersion: 2, method: 'wallet' });
  assert.equal(canRelease(record(state).ledger, 'final'), false);
  state = settle(state, { type: 'release', kind: 'advance' }, 'admin');
  state = settle(state, { type: 'confirm_performance' }, 'admin');
  state = settle(state, { type: 'release', kind: 'final' }, 'admin');
  const totals = settlement(record(state).ledger);
  assert.equal(totals.paidOutCents, 253750); assert.equal(totals.feeChargedCents, 11250); assert.equal(totals.heldCents, 0);
});
test('skipping advance still allows cancellation before start and full final checkout after a demo gig', () => {
  let state = settle(agreed(), { type: 'skip_advance' });
  assert.equal(canCancel(record(state), new Date(at)), true);
  assert.equal(record(run(state, { type: 'cancel', id })).status, 'cancelled');
  state = run(state, { type: 'demo_start', id }, 'artist');
  assert.equal(run(state, { type: 'cancel', id }), state);
  state = run(state, { type: 'demo_finish', id }, 'artist');
  assert.deepEqual(checkoutFor(record(state).ledger), { kind: 'final', amountCents: 225000 });
});
test('notifications are scoped to participants, notify admins only for settlement tasks, and read separately', () => {
  let state = paid();
  assert.equal(notificationsFor(state, 'visitor').length, 0); assert.equal(notificationsFor(state, 'renter').length, 0);
  assert.equal(notificationsFor(state, 'admin').length, 1); assert.equal(notificationsFor(state, 'customer').length, 0);
  const note = notificationsFor(state, 'admin')[0]; assert.equal(note.section, 'payments'); assert.equal(note.bookingId, id);
  assert.equal(run(state, { type: 'read_notification', id: note.id }, 'customer'), state);
  state = run(state, { type: 'read_notification', id: note.id }, 'admin');
  assert.deepEqual(notificationsFor(state, 'admin')[0].readBy, ['admin']);
  assert.equal(state.read[`artist:${id}`], undefined);
  state = requested(state); assert.match(notificationsFor(state, 'admin')[0].title, /Refund requested/);
  state = run(state, decision(true), 'admin');
  assert.match(notificationsFor(state, 'customer')[0].title, /approved refund/);
  assert.match(notificationsFor(state, 'artist')[0].title, /approved refund/);
});
test('seen status reflects only the other participant read time and handles equivalent timestamp formats', () => {
  let state = run(agreed(), { type: 'send', message: { id: 'M-NEW', bookingId: id, text: 'Can we soundcheck now?' } });
  const message = state.messages.at(-1); assert.equal(messageSeen(state, message, record(state)), false);
  state = run(state, { type: 'read', id }); assert.equal(messageSeen(state, message, record(state)), false);
  state = run(state, { type: 'read', id }, 'artist', '2026-10-14T09:00:00Z');
  assert.equal(messageSeen(state, message, record(state)), true); assert.equal(unreadFor(state, record(state), 'artist'), 0);
  state = run(state, { type: 'send', message: { id: 'M-LATER', bookingId: id, text: 'And the encore?' } }, 'customer', '2026-10-14T09:00:01.000Z');
  assert.equal(messageSeen(state, state.messages.at(-1), record(state)), false); assert.equal(unreadFor(state, record(state), 'artist'), 1);
});
test('fresh initialization has no notifications, read indicators, refund requests or simulated progress', () => {
  const fresh = initialPipeline(); assert.deepEqual(fresh.notifications, []); assert.deepEqual(fresh.read, {});
  assert.equal(record(fresh).demoStartedAt, undefined); assert.equal(record(fresh).refund, undefined);
  assert.equal(settlement(fresh.bookings.find(item => item.id === 'BK-2780').ledger).heldCents, 0);
});
