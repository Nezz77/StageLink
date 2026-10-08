import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBooking, amounts, transitionBooking, restoreBooking, validateDemoCard } from '../src/lib/booking.ts';

const at = '2026-10-18T23:00:00.000Z';
const move = (state, action, actor) => transitionBooking(state, action, actor, at);
const accept = () => move(initialBooking, { type: 'accept' }, 'customer');
const pay = state => move(state, { type: 'pay', quoteVersion: state.quoteVersion, totalCents: amounts(state.quoteCents).totalCents }, 'customer');
const ready = () => move(move(pay(accept()), { type: 'report_performance' }, 'artist'), { type: 'confirm_performance' }, 'admin');

test('checkout requires an agreed quote and can only be paid by the customer', () => {
  assert.equal(pay(initialBooking), initialBooking);
  for (const role of ['artist', 'renter', 'visitor', 'admin']) {
    const agreed = accept();
    assert.equal(move(agreed, { type: 'pay', quoteVersion: 1, totalCents: 236250 }, role), agreed);
  }
  assert.equal(pay(accept()).payment, 'held');
});

test('counter offers need the other party approval; checkout uses the revised amount', () => {
  const counter = move(initialBooking, { type: 'counter', amountCents: 200001 }, 'customer');
  assert.equal(counter.quoteStatus, 'awaiting_artist');
  assert.equal(move(counter, { type: 'accept' }, 'customer'), counter);
  assert.equal(pay(counter), counter);
  const agreed = move(counter, { type: 'accept' }, 'artist');
  assert.equal(agreed.quoteStatus, 'accepted');
  assert.deepEqual(amounts(agreed.quoteCents), { feeCents: 10000, totalCents: 210001 });
  assert.equal(pay(agreed).payment, 'held');
  assert.equal(move(agreed, { type: 'pay', quoteVersion: 1, totalCents: 236250 }, 'customer'), agreed);
});

test('rejects invalid counter amounts, wrong totals and duplicate payment', () => {
  for (const amountCents of [NaN, Infinity, -1, 0, 1, 100.1, 100000001]) {
    assert.equal(move(initialBooking, { type: 'counter', amountCents }, 'customer'), initialBooking);
  }
  const agreed = accept();
  assert.equal(move(agreed, { type: 'pay', quoteVersion: 1, totalCents: 123400 }, 'customer'), agreed);
  const held = pay(agreed);
  assert.equal(pay(held), held);
  assert.equal(move(held, { type: 'counter', amountCents: 1000 }, 'customer'), held);
});

test('funds cannot be released before reported and admin-verified performance', () => {
  const held = pay(accept());
  assert.equal(move(held, { type: 'release' }, 'admin'), held);
  assert.equal(move(held, { type: 'confirm_performance' }, 'admin'), held);
  for (const role of ['customer', 'admin', 'renter', 'visitor']) {
    assert.equal(move(held, { type: 'report_performance' }, role), held);
  }
  const reported = move(held, { type: 'report_performance' }, 'artist');
  assert.equal(move(reported, { type: 'release' }, 'admin'), reported);
  assert.equal(move(reported, { type: 'confirm_performance' }, 'artist'), reported);
  assert.equal(move(reported, { type: 'confirm_performance' }, 'customer'), reported);
});

test('only admin can release a verified payout, exactly once', () => {
  const verified = ready();
  for (const role of ['customer', 'artist', 'renter', 'visitor']) {
    assert.equal(move(verified, { type: 'release' }, role), verified);
  }
  const released = move(verified, { type: 'release' }, 'admin');
  assert.equal(released.payment, 'released');
  assert.equal(released.history.length, 5);
  assert.equal(move(released, { type: 'release' }, 'admin'), released);
});

test('an admin review hold blocks release even after verification', () => {
  const verified = ready();
  assert.equal(move(verified, { type: 'toggle_hold' }, 'artist'), verified);
  const paused = move(verified, { type: 'toggle_hold' }, 'admin');
  assert.equal(move(paused, { type: 'release' }, 'admin'), paused);
  const cleared = move(paused, { type: 'toggle_hold' }, 'admin');
  assert.equal(move(cleared, { type: 'release' }, 'admin').payment, 'released');
});

test('declined quotes cannot be paid', () => {
  const declined = move(initialBooking, { type: 'decline' }, 'customer');
  assert.equal(pay(declined), declined);
});

test('demo ledger survives refresh and rejects corrupted or impossible history', () => {
  const events = [
    { actor: 'customer', action: { type: 'accept' }, at },
    { actor: 'customer', action: { type: 'pay', quoteVersion: 1, totalCents: 236250 }, at },
  ];
  assert.equal(restoreBooking(JSON.stringify(events)).state.payment, 'held');
  for (const raw of ['{', 'null', '[null]', '{"payment":"released"}', JSON.stringify([{ actor: 'admin', action: { type: 'release' }, at }])]) {
    assert.equal(restoreBooking(raw).state, initialBooking);
  }
  events[0].action.cardNumber = 'must not persist';
  const restored = restoreBooking(JSON.stringify(events));
  assert.equal(JSON.stringify(restored.events).includes('cardNumber'), false);
});

test('demo form validates all fields and never accepts a real card number', () => {
  const card = { name: 'CODEXR', number: '4242 4242 4242 4242', expiry: '10/26', cvv: '123' };
  const now = new Date('2026-10-08T12:00:00Z');
  assert.deepEqual(validateDemoCard(card, now), {});
  for (const expiry of ['00/30', '13/30', '09/26', '10/25', '10', '']) {
    assert.ok(validateDemoCard({ ...card, expiry }, now).expiry);
  }
  assert.ok(validateDemoCard({ ...card, number: '4111 1111 1111 1111' }, now).number);
  assert.ok(validateDemoCard({ ...card, cvv: '12' }, now).cvv);
  assert.ok(validateDemoCard({ ...card, name: ' ' }, now).name);
});
