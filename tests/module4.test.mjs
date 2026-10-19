import test from "node:test"
import assert from "node:assert/strict"
import {
  initialPipeline,
  reducePipeline,
  unreadFor,
  messageSeen,
  bookingService,
} from "../src/lib/pipeline.ts"
import { checkoutFor, settlement } from "../src/lib/booking.ts"
import { quoteError, parseMoney } from "../src/lib/quotations.ts"
import { initialDashboard, reduceDashboard } from "../src/lib/dashboard.ts"
import { catalogFor } from "../src/lib/catalog.ts"
import { bookingDocument } from "../src/lib/bookingDocuments.ts"
const now = "2026-10-19T09:00:00Z",
  id = "BK-2901"
const options = () => ({
  catalog: catalogFor(initialDashboard()),
  availability: initialDashboard().availability,
})
const seed = () => initialPipeline(new Date(now))
const record = (state) => state.bookings.find((item) => item.id === id)
const run = (state, action, actor = "customer", at = now) =>
  reducePipeline(state, action, actor, at, false, options())
const input = (amount = 200000) => ({
  description: "Three-hour jazz performance",
  lines: [{ description: "Live set", quantity: 1, unitCents: amount }],
  included: "Soundcheck and selected songs",
  notes: "Load in at 17:00.",
})
const offer = (state, amount = 200000, actor = "artist") =>
  run(
    state,
    {
      type: "quotation",
      id,
      expectedVersion: record(state).ledger.quoteVersion,
      input: input(amount),
    },
    actor,
  )
const answer = (state, actor = "customer", accept = true) =>
  run(
    state,
    {
      type: "quote_response",
      id,
      quotationId: record(state).quotations.at(-1).id,
      accept,
    },
    actor,
  )
const settle = (state, action, actor = "customer") =>
  run(state, { type: "settle", id, action }, actor)
const collect = (state) => {
  const due = checkoutFor(record(state).ledger)
  return settle(state, {
    type: "collect",
    ...due,
    totalCents: due.amountCents,
    quoteVersion: record(state).ledger.quoteVersion,
    method: "wallet",
  })
}
test("structured quote -> counteroffer -> provider agreement updates one ledger and notification targets", () => {
  let state = offer(seed(), 220000)
  state = offer(state, 200000, "customer")
  state = answer(state, "artist")
  const r = record(state)
  assert.equal(r.ledger.quoteCents, 200000)
  assert.equal(r.ledger.quoteVersion, 3)
  assert.equal(r.ledger.quoteStatus, "accepted")
  assert.deepEqual(
    r.quotations.map((q) => q.status),
    ["superseded", "superseded", "accepted"],
  )
  assert.equal(checkoutFor(r.ledger).amountCents, 20000)
  assert.equal(settlement(r.ledger).feeCents, 10000)
  assert.equal(r.activity.at(-1).actor, "artist")
  assert.equal(state.notifications[0].section, "chat")
  assert.deepEqual(state.notifications[0].recipients, ["customer"])
})
test("outdated, own, unrelated and duplicate quotation acceptances cannot mutate state", () => {
  let state = offer(seed())
  const q = record(state).quotations.at(-1)
  for (const [quotationId, actor] of [
    [`${id}-Q1`, "customer"],
    [q.id, "artist"],
    [q.id, "renter"],
    [q.id, "admin"],
  ])
    assert.equal(
      run(
        state,
        { type: "quote_response", id, quotationId, accept: true },
        actor,
      ),
      state,
    )
  state = answer(state)
  assert.equal(answer(state), state)
  assert.equal(offer(state), state)
  assert.equal(
    settle(state, {
      type: "collect",
      kind: "advance",
      totalCents: 20000,
      quoteVersion: 1,
      method: "card",
    }),
    state,
  )
})
test("quotation validation rejects malformed amounts and item lines; parsing uses integer cents", () => {
  assert.equal(parseMoney("101.29"), 10129)
  for (const value of ["-1", "NaN", "1e3", "1.001", "Infinity"])
    assert.equal(parseMoney(value), null)
  let state = seed()
  for (const amount of [-1, 0, 1.5, Infinity, 100000001])
    assert.equal(offer(state, amount), state)
  assert.ok(quoteError({ ...input(), lines: [] }))
  assert.ok(
    quoteError({
      ...input(),
      lines: [{ description: "x", quantity: 0, unitCents: 100 }],
    }),
  )
  const issued = input()
  const next = run(
    state,
    { type: "quotation", id, expectedVersion: 1, input: issued },
    "artist",
  )
  issued.lines[0].unitCents = 1
  assert.equal(record(next).quotations.at(-1).lines[0].unitCents, 200000)
})
test("decline stays in history; provider can issue a fresh quote without reviving an old one", () => {
  let state = answer(offer(seed()), "customer", false)
  assert.equal(record(state).ledger.quoteStatus, "declined")
  assert.equal(checkoutFor(record(state).ledger), null)
  const old = record(state).quotations.at(-1).id
  state = offer(state, 190000)
  assert.equal(record(state).quotations.at(-2).status, "declined")
  assert.equal(
    run(state, { type: "quote_response", id, quotationId: old, accept: true }),
    state,
  )
})
test("equipment quotations retain matching provider and acceptance rechecks availability and capacity", () => {
  let state = seed()
  const rid = "BK-2902"
  const action = {
    type: "quotation",
    id: rid,
    expectedVersion: 1,
    input: input(22000),
  }
  assert.equal(run(state, action, "artist"), state)
  state = run(state, action, "renter")
  assert.equal(
    state.bookings.find((r) => r.id === rid).quotations.at(-1).providerName,
    "AudioVault Rentals",
  )
  const respond = {
    type: "quote_response",
    id: rid,
    quotationId: `${rid}-Q2`,
    accept: true,
  }
  const blocked = options()
  blocked.availability.renter = { ...blocked.availability.renter, days: [] }
  assert.equal(
    reducePipeline(state, respond, "customer", now, false, blocked),
    state,
  )
  state = run(state, respond)
  assert.equal(
    state.bookings.find((r) => r.id === rid).ledger.quoteStatus,
    "accepted",
  )
})
test("new quote cannot bypass payment, skipped advance, overtime or event progress locks", () => {
  let state = answer(offer(seed()))
  state = collect(state)
  assert.equal(offer(state, 180000), state)
  const skipped = settle(answer(offer(seed())), { type: "skip_advance" })
  assert.equal(offer(skipped), skipped)
  assert.equal(
    run(state, {
      type: "legacy",
      action: { type: "counter", amountCents: 10000 },
    }),
    state,
  )
})
test("advance release, overtime and final release charge exactly one original-price fee", () => {
  let state = collect(answer(offer(seed())))
  state = settle(state, { type: "release", kind: "advance" }, "admin")
  state = run(state, { type: "demo_start", id }, "artist")
  state = settle(state, {
    type: "propose_overtime",
    id: "OT-1",
    minutes: 60,
    amountCents: 30000,
  })
  assert.equal(run(state, { type: "demo_finish", id }, "artist"), state)
  state = settle(
    state,
    { type: "resolve_overtime", id: "OT-1", accept: true },
    "artist",
  )
  state = run(state, { type: "demo_finish", id }, "artist")
  assert.equal(checkoutFor(record(state).ledger).amountCents, 210000)
  state = collect(state)
  assert.equal(
    settle(state, { type: "release", kind: "final" }, "admin"),
    state,
  )
  state = settle(state, { type: "confirm_performance" }, "admin")
  state = settle(state, { type: "release", kind: "final" }, "admin")
  assert.equal(settlement(record(state).ledger).feeChargedCents, 10000)
  assert.equal(settlement(record(state).ledger).paidOutCents, 220000)
  assert.equal(settlement(record(state).ledger).remainingCents, 0)
})
test("failed payment is an activity entry, leaves ledger unchanged and permits retry", () => {
  const state = answer(offer(seed()))
  const failed = run(state, {
    type: "payment_failed",
    id,
    version: 2,
    amountCents: 20000,
  })
  assert.equal(record(failed).ledger, record(state).ledger)
  assert.match(record(failed).activity.at(-1).label, /declined/)
  assert.equal(settlement(record(collect(failed)).ledger).receivedCents, 20000)
})
test("saved references work for artist and equipment, do not book, and removed listings can be unsaved", () => {
  const pipeline = seed()
  let state = initialDashboard()
  state = reduceDashboard(
    state,
    { type: "save_listing", id: "GIG-001" },
    "customer",
  )
  state = reduceDashboard(
    state,
    { type: "save_listing", id: "EQ-001" },
    "customer",
  )
  assert.deepEqual(state.savedListings, ["GIG-001", "EQ-001"])
  assert.equal(pipeline.bookings.length, 5)
  state = reduceDashboard(
    state,
    { type: "remove_listing", id: "EQ-001" },
    "renter",
  )
  assert.ok(state.savedListings.includes("EQ-001"))
  state = reduceDashboard(
    state,
    { type: "save_listing", id: "EQ-001" },
    "customer",
  )
  assert.deepEqual(state.savedListings, ["GIG-001"])
  assert.equal(
    reduceDashboard(state, { type: "save_listing", id: "missing" }, "customer"),
    state,
  )
})
test("chat simulations route sender, unread, seen and notifications only to matching participants", () => {
  let state = seed()
  state = run(state, { type: "read", id })
  state = run(state, { type: "demo_reply", id, text: "Demo reply" })
  const message = state.messages.at(-1)
  assert.equal(message.sender, "artist")
  assert.equal(message.bookingId, id)
  assert.equal(message.simulated, true)
  assert.equal(unreadFor(state, record(state), "customer"), 1)
  assert.deepEqual(state.notifications[0].recipients, ["customer"])
  assert.equal(
    run(state, { type: "demo_reply", id, text: "x" }, "renter"),
    state,
  )
  state = run(state, {
    type: "send",
    message: { id: "outgoing", bookingId: id, text: "Confirmed" },
  })
  const outgoing = state.messages.at(-1)
  assert.equal(messageSeen(state, outgoing, record(state)), false)
  state = run(state, { type: "demo_seen", id })
  assert.equal(messageSeen(state, outgoing, record(state)), true)
  state = run(state, { type: "read", id })
  assert.equal(unreadFor(state, record(state), "customer"), 0)
  assert.ok(
    state.notifications
      .filter((n) => n.recipients.includes("customer") && n.section === "chat")
      .every((n) => n.readBy.includes("customer")),
  )
})
test("message drafts are participant and conversation scoped and all seed resets are fresh", () => {
  let state = run(seed(), {
    type: "message_draft",
    id,
    text: "Soundcheck draft",
  })
  state = run(
    state,
    { type: "message_draft", id, text: "Provider draft" },
    "artist",
  )
  assert.equal(state.messageDrafts[`customer:${id}`], "Soundcheck draft")
  assert.equal(state.messageDrafts[`artist:${id}`], "Provider draft")
  assert.deepEqual(seed().messageDrafts, {})
  assert.equal(seed().notifications.length, 0)
  assert.equal(record(seed()).ledger.installments.length, 0)
  assert.equal(initialDashboard().savedListings.length, 0)
})
test("invoice, receipt and provider settlement derive from current ledger with no customer fee", () => {
  assert.equal(bookingDocument(record(seed()), "invoice"), null)
  let state = collect(answer(offer(seed())))
  const invoice = bookingDocument(record(state), "invoice"),
    receipt = bookingDocument(record(state), "receipt", "advance")
  assert.equal(invoice.number, `INV-${id}-V2`)
  assert.ok(JSON.stringify(invoice).includes("$1,800.00"))
  assert.ok(JSON.stringify(receipt).includes("$200.00"))
  assert.ok(
    JSON.stringify(invoice).includes(
      '"Platform fee charged to customer","$0.00"',
    ),
  )
  assert.equal(bookingDocument(record(state), "receipt", "final"), null)
  const provider = bookingDocument(record(state), "settlement")
  assert.ok(provider.sections.some((s) => s.title === "Provider payout only"))
  assert.ok(!invoice.sections.some((s) => s.title === "Provider payout only"))
  state = run(state, {
    type: "refund",
    id,
    reason: "The event was cancelled before the performance.",
  })
  state = run(
    state,
    {
      type: "resolve_refund",
      id,
      approve: true,
      reason: "Refund approved before performance and transfer.",
    },
    "admin",
  )
  const refunded = bookingDocument(record(state), "receipt", "advance")
  assert.ok(JSON.stringify(refunded).includes("Refund date"))
  assert.ok(JSON.stringify(refunded).includes('"Outstanding balance","$0.00"'))
})

test('reading an acceptance update clears its notification even without a new chat message', () => {
  let state = offer(seed());
  state = run(state, { type: 'read', id });
  const messagesBefore = state.messages.length;
  state = answer(state);
  assert.equal(state.messages.length, messagesBefore);
  assert.ok(state.notifications[0].recipients.includes('artist'));
  const ledger = record(state).ledger;
  state = run(state, { type: 'read', id }, 'artist');
  assert.ok(state.notifications[0].readBy.includes('artist'));
  assert.equal(record(state).ledger, ledger);
});

test('fresh sessions isolate all nested booking and catalog collections', () => {
  const first = run(seed(), { type: 'message_draft', id, text: 'Only this session' });
  let second = seed();
  second = answer(offer(second, 195000));
  assert.equal(record(first).ledger.quoteCents, 225000);
  assert.equal(second.messageDrafts[`customer:${id}`], undefined);
  assert.notEqual(first.bookings, second.bookings);
  assert.notEqual(first.messages, second.messages);
  assert.notEqual(first.bookings[0].quotations, second.bookings[0].quotations);
});
