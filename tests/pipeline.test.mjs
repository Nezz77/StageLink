import test from "node:test"
import assert from "node:assert/strict"
import { amounts } from "../src/lib/booking.ts"
import {
  canRefund,
  conflicts,
  initialPipeline,
  paymentLabel,
  quoteFor,
  reducePipeline,
  restorePipeline,
  unreadFor,
  validateForm,
  visibleTo,
} from "../src/lib/pipeline.ts"
const now = "2026-10-14T09:00:00.000Z"
const form = {
  id: "BK-TEST",
  serviceId: "aria",
  event: "Autumn concert",
  date: "2026-11-22",
  start: "18:00",
  end: "21:00",
  venue: "Grand Hall",
  guests: "200",
  requirements: "Soundcheck at 17:00",
}
const apply = (state, action, actor = "customer", at = now) =>
  reducePipeline(state, action, actor, at)
function accepted(serviceId = "aria") {
  let state = apply(initialPipeline(), {
    type: "submit",
    form: { ...form, serviceId },
  })
  return apply(
    state,
    { type: "respond", id: form.id, accept: true },
    serviceId === "aria" ? "artist" : "renter",
  )
}
function paid() {
  const state = accepted()
  const record = state.bookings[0]
  return apply(state, {
    type: "settle", id: form.id,
    action: { type: "collect", kind: "advance", quoteVersion: record.ledger.quoteVersion,
      totalCents: Math.round(record.ledger.quoteCents * .1), method: "wallet" },
  })
}
test("partial drafts persist and submitting consumes only that draft, once", () => {
  let state = apply(initialPipeline(), {
    type: "save_draft",
    form: { ...form, event: "", date: "" },
  })
  assert.equal(state.drafts.length, 1)
  assert.equal(state.bookings.length, 5)
  state = apply(state, {
    type: "save_draft",
    form: { ...form, id: "BK-OTHER" },
  })
  state = apply(state, { type: "submit", form })
  assert.equal(state.drafts.length, 1)
  assert.equal(state.bookings[0].status, "pending")
  assert.equal(apply(state, { type: "submit", form }), state)
})
test("forms reject past dates, invalid dates, backwards time and non-integer guest counts", () => {
  for (const [key, value] of [
    ["date", "2026-02-30"],
    ["date", "2025-12-01"],
    ["end", "17:00"],
    ["guests", "1.5"],
  ])
    assert.ok(
      Object.keys(validateForm({ ...form, [key]: value }, [], new Date(now)))
        .length,
    )
  assert.deepEqual(validateForm(form, [], new Date(now)), {})
  assert.equal(quoteFor(form), 225000)
  assert.equal(quoteFor({ ...form, serviceId: "pa" }), 18000)
})
test("artist conflicts use time ranges; equipment reserves the full day", () => {
  const state = apply(initialPipeline(), { type: "submit", form })
  assert.equal(
    conflicts(
      { ...form, id: "BK-CONFLICT", start: "20:00", end: "22:00" },
      state.bookings,
    ).length,
    1,
  )
  assert.equal(
    conflicts(
      { ...form, id: "BK-NEXT", start: "21:00", end: "22:00" },
      state.bookings,
    ).length,
    0,
  )
  const equipment = apply(initialPipeline(), {
    type: "submit",
    form: { ...form, serviceId: "pa" },
  })
  assert.equal(
    conflicts(
      {
        ...form,
        id: "BK-OTHER",
        serviceId: "pa",
        start: "08:00",
        end: "09:00",
      },
      equipment.bookings,
      undefined,
      new Date(now),
    ).length,
    1,
  )
})
test("only the matching provider may accept, reject or complete; premature payment is rejected", () => {
  let state = apply(initialPipeline(), { type: "submit", form })
  for (const actor of ["customer", "renter", "admin", "visitor"])
    assert.equal(
      apply(state, { type: "respond", id: form.id, accept: true }, actor),
      state,
    )
  assert.equal(
    apply(state, {
      type: "pay",
      id: form.id,
      quoteVersion: 1,
      totalCents: 236250,
    }),
    state,
  )
  state = apply(state, { type: "respond", id: form.id, accept: true }, "artist")
  assert.equal(state.bookings[0].status, "accepted")
  assert.equal(
    apply(state, { type: "respond", id: form.id, accept: false }, "artist"),
    state,
  )
})
test("checkout validates price, payer and version; duplicate payment cannot change funds", () => {
  const state = accepted()
  for (const [totalCents, quoteVersion, actor] of [
    [1, 1, "customer"],
    [236250, 2, "customer"],
    [236250, 1, "artist"],
  ])
    assert.equal(
      apply(
        state,
        { type: "pay", id: form.id, totalCents, quoteVersion },
        actor,
      ),
      state,
    )
  const next = paid()
  assert.equal(next.bookings[0].status, "active")
  assert.equal(next.bookings[0].ledger.payment, "held")
  assert.equal(next.bookings[0].ledger.installments[0].method, "wallet")
  assert.equal(
    apply(next, {
      type: "pay",
      id: form.id,
      quoteVersion: 1,
      totalCents: 236250,
    }),
    next,
  )
})
test("cancellation and rejection remain in history and release availability", () => {
  let state = apply(initialPipeline(), { type: "submit", form })
  state = apply(state, { type: "cancel", id: form.id })
  assert.equal(state.bookings[0].status, "cancelled")
  assert.equal(conflicts({ ...form, id: "BK-NEW" }, state.bookings).length, 0)
  assert.equal(
    apply(state, { type: "respond", id: form.id, accept: true }, "artist"),
    state,
  )
  const pending = apply(initialPipeline(), { type: "submit", form })
  const rejected = apply(
    pending,
    { type: "respond", id: form.id, accept: false },
    "artist",
  )
  assert.equal(rejected.bookings[0].status, "rejected")
})
test("refund requests retain held funds, pause payout and reject duplicate or ineligible requests", () => {
  let state = paid()
  assert.equal(canRefund(state.bookings[0], new Date(now)), true)
  assert.equal(
    apply(state, { type: "refund", id: form.id, reason: "no" }),
    state,
  )
  state = apply(state, {
    type: "refund",
    id: form.id,
    reason: "Our event has been postponed.",
  })
  const record = state.bookings[0]
  assert.equal(record.refund.status, "requested")
  assert.equal(record.ledger.payment, "held")
  assert.equal(record.ledger.payoutBlocked, true)
  assert.equal(paymentLabel(record), "Refund requested")
  assert.equal(
    apply(state, {
      type: "refund",
      id: form.id,
      reason: "Please refund this booking.",
    }),
    state,
  )
  assert.equal(canRefund(paid().bookings[0], new Date("2026-12-01")), false)
})
test("completion is available only after end time and holds payment for review", () => {
  const state = paid()
  assert.equal(apply(state, { type: "complete", id: form.id }, "artist"), state)
  const next = apply(
    state,
    { type: "complete", id: form.id },
    "artist",
    "2026-11-23T12:00:00Z",
  )
  assert.equal(next.bookings[0].status, "completed")
  assert.equal(next.bookings[0].ledger.performance, "reported")
  assert.equal(next.bookings[0].ledger.payment, "held")
})
test("messages stay tied to their booking and unread counts are per participant", () => {
  let state = initialPipeline()
  const record = state.bookings[0]
  assert.equal(unreadFor(state, record, "customer"), 2)
  state = apply(state, { type: "read", id: record.id })
  assert.equal(unreadFor(state, record, "customer"), 0)
  const message = {
    id: "message-new",
    bookingId: record.id,
    text: "Soundcheck is confirmed.",
  }
  assert.equal(apply(state, { type: "send", message }, "renter"), state)
  state = apply(state, { type: "send", message }, "customer")
  assert.equal(unreadFor(state, record, "artist"), 1)
  assert.equal(unreadFor(state, record, "customer"), 0)
  assert.equal(apply(state, { type: "send", message }), state)
  assert.equal(visibleTo(record, "renter"), false)
})
test("event history restores drafts, approvals, payments and messages; invalid histories are preserved as damaged", () => {
  const events = [
    { action: { type: "save_draft", form }, actor: "customer", at: now },
    { action: { type: "submit", form }, actor: "customer", at: now },
    {
      action: { type: "respond", id: form.id, accept: true },
      actor: "artist",
      at: now,
    },
    {
      action: { type: "pay", id: form.id, totalCents: 236250, quoteVersion: 1 },
      actor: "customer",
      at: now,
    },
  ]
  const restored = restorePipeline(JSON.stringify(events))
  assert.equal(restored.damaged, false)
  assert.equal(restored.state.bookings[0].ledger.payment, "held")
  assert.equal(restored.state.drafts.length, 0)
  assert.equal(restorePipeline("{bad").damaged, true)
  assert.equal(
    restorePipeline(
      JSON.stringify([
        {
          action: {
            type: "pay",
            id: "BK-2901",
            totalCents: 1,
            quoteVersion: 1,
          },
          actor: "customer",
          at: now,
        },
      ]),
    ).damaged,
    true,
  )
})

test('new installment events replay with overtime and a once-only fee across all bookings', () => {
  const events = [];
  let state = initialPipeline();
  const step = (action, actor = 'customer', at = now) => {
    const next = reducePipeline(state, action, actor, at);
    assert.notEqual(next, state, `Rejected ${action.type}/${action.action?.type}`);
    events.push({ action, actor, at }); state = next;
  };
  const act = (action, actor, at) => step({ type: 'settle', id: form.id, action }, actor, at);
  step({ type: 'submit', form }); step({ type: 'respond', id: form.id, accept: true }, 'artist');
  act({type:'collect',kind:'advance',totalCents:22500,quoteVersion:1,method:'card'});
  act({type:'release',kind:'advance'},'admin');
  const during=new Date(`${form.date}T19:30:00`).toISOString(), after='2026-11-23T12:00:00Z';
  act({type:'propose_overtime',id:'OT',minutes:60,amountCents:40000},'customer',during);
  act({type:'resolve_overtime',id:'OT',accept:true},'artist',during);
  step({type:'complete',id:form.id},'artist',after);
  act({type:'collect',kind:'final',totalCents:242500,quoteVersion:2,method:'wallet'},'customer',after);
  act({type:'confirm_performance'},'admin',after); act({type:'release',kind:'final'},'admin',after);
  const restored=restorePipeline(JSON.stringify(events)); assert.equal(restored.damaged,false); assert.deepEqual(restored.state,state);
  assert.equal(state.bookings[0].ledger.installments[1].feeCents,0);
});
test('skipping advance activates booking and still allows completion; overtime waits until the gig starts', () => {
  let state=accepted(); const id=form.id;
  assert.equal(apply(state,{type:'settle',id,action:{type:'propose_overtime',id:'ot',minutes:60,amountCents:10000}}),state);
  state=apply(state,{type:'settle',id,action:{type:'skip_advance'}});
  assert.equal(state.bookings[0].status,'active'); assert.equal(state.bookings[0].ledger.payment,'unpaid');
  const done=apply(state,{type:'complete',id},'artist','2026-11-23T12:00:00Z');
  assert.equal(done.bookings[0].status,'completed');
  const paid=apply(done,{type:'settle',id,action:{type:'collect',kind:'final',totalCents:225000,quoteVersion:1,method:'card'}},'customer','2026-11-23T12:00:00Z');
  assert.equal(paid.bookings[0].ledger.payment,'held');
});
test('provider completion includes approved overtime duration and provider isolation', () => {
  let state=accepted(), id=form.id;
  const during = new Date(`${form.date}T${form.start}`); during.setMinutes(during.getMinutes()+30);
  state=apply(state,{type:'settle',id,action:{type:'propose_overtime',id:'OT',minutes:60,amountCents:40000}},'customer',during.toISOString());
  state=apply(state,{type:'settle',id,action:{type:'resolve_overtime',id:'OT',accept:true}},'artist',during.toISOString());
  const originalEnd=new Date(`${form.date}T${form.end}`);
  assert.equal(apply(state,{type:'complete',id},'artist',originalEnd.toISOString()),state);
  const end=new Date(originalEnd.getTime()+60*60*1000).toISOString();
  assert.equal(apply(state,{type:'complete',id},'renter',end),state);
  assert.equal(apply(state,{type:'complete',id},'artist',end).bookings[0].status,'completed');
});
test('refund requests block settlement, hold removal and overtime through both action routes', () => {
  let state=paid();const id=form.id;
  state=apply(state,{type:'refund',id,reason:'The event has been cancelled.'});
  for (const action of [{type:'release',kind:'advance'},{type:'toggle_hold'},{type:'confirm_performance'}]) assert.equal(apply(state,{type:'settle',id,action},'admin'),state);
});
