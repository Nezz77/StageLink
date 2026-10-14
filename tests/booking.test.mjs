import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBooking, amounts, checkoutFor, canRelease, settlement, transitionBooking, restoreBooking, validateDemoCard } from '../src/lib/booking.ts';
const at = '2026-10-18T23:00:00.000Z';
const move = (state, action, actor = 'customer') => transitionBooking(state, action, actor, at);
const accept = () => move(initialBooking, { type: 'accept' });
const collect = state => { const due = checkoutFor(state); return move(state, { type: 'collect', kind: due?.kind, totalCents: due?.amountCents, quoteVersion: state.quoteVersion, method: 'wallet' }); };
const complete = state => move(state, { type: 'report_performance' }, 'artist');
const verify = state => move(state, { type: 'confirm_performance' }, 'admin');
const release = (state, kind) => move(state, { type: 'release', kind }, 'admin');

test('price includes no customer surcharge; fractional cents round consistently', () => {
  assert.deepEqual(amounts(200001), { feeCents: 10000, totalCents: 200001 });
  const state = move(move(initialBooking, { type: 'counter', amountCents: 200001 }), { type: 'accept' }, 'artist');
  assert.equal(checkoutFor(state).amountCents, 20000);
  const final = release(verify(collect(complete(release(collect(state), 'advance')))), 'final');
  const totals = settlement(final);
  assert.equal(totals.receivedCents, 200001);
  assert.equal(totals.paidOutCents + totals.feeChargedCents, 200001);
});
test('quote agreement, amount, version, payment kind and customer role are required', () => {
  assert.equal(checkoutFor(initialBooking), null);
  const state = accept();
  const valid = { type: 'collect', kind: 'advance', totalCents: 22500, quoteVersion: 1, method: 'card' };
  for (const role of ['admin','artist','renter','visitor']) assert.equal(move(state, valid, role), state);
  for (const invalid of [{ totalCents: 225000 }, { totalCents: 1 }, { quoteVersion: 2 }, { kind: 'final' }, { method: 'cash' }]) assert.equal(move(state, { ...valid, ...invalid }), state);
  const paid = collect(state); assert.equal(paid.payment, 'held'); assert.equal(collect(paid), paid);
  assert.equal(move(state, { type: 'pay', totalCents: 236250, quoteVersion: 1 }), state);
});
test('optional advance is held until admin transfer and is releasable before the gig', () => {
  const state = collect(accept());
  assert.equal(settlement(state).heldCents, 22500); assert.equal(settlement(state).paidOutCents, 0);
  for (const role of ['customer','artist','renter','visitor']) assert.equal(move(state, { type:'release', kind:'advance' }, role), state);
  const next = release(state,'advance');
  assert.equal(next.performance,'upcoming'); assert.equal(next.payment,'partial');
  assert.equal(settlement(next).paidOutCents,11250); assert.equal(settlement(next).feeChargedCents,11250);
  assert.equal(settlement(next).remainingCents,202500); assert.equal(release(next,'advance'),next);
});
test('advance then final payment deducts the 5% fee once across both admin transfers', () => {
  let state = release(collect(accept()),'advance');
  assert.equal(checkoutFor(state),null);
  state = complete(state); assert.deepEqual(checkoutFor(state), { kind:'final',amountCents:202500 });
  state = collect(state); assert.equal(settlement(state).heldCents,202500);
  assert.equal(release(state,'final'),state);
  state = release(verify(state),'final');
  assert.equal(state.payment,'released'); assert.equal(state.installments[1].feeCents,0);
  assert.equal(settlement(state).paidOutCents,213750); assert.equal(settlement(state).feeChargedCents,11250);
  assert.equal(collect(state),state);
});
test('skipping advance permits performance and collects 100% afterward', () => {
  let state = move(accept(), { type:'skip_advance' });
  assert.equal(state.advance,'skipped'); assert.equal(checkoutFor(state),null);
  assert.equal(move(state, { type:'skip_advance' }),state);
  state = complete(state); assert.deepEqual(checkoutFor(state),{ kind:'final',amountCents:225000 });
  state = release(verify(collect(state)),'final');
  assert.equal(settlement(state).feeChargedCents,11250); assert.equal(settlement(state).paidOutCents,213750);
});
test('customer can pay after completion without choosing advance or skip first', () => {
  const state = complete(accept()); assert.deepEqual(checkoutFor(state),{ kind:'final',amountCents:225000 });
});
test('unreleased advance must settle first; payout holds block every transfer', () => {
  let state = verify(collect(complete(collect(accept()))));
  assert.equal(canRelease(state,'final'),false); assert.equal(release(state,'final'),state);
  state = move(state,{ type:'toggle_hold' },'admin'); assert.equal(release(state,'advance'),state);
  state = move(state,{ type:'toggle_hold' },'admin'); state=release(state,'advance');
  assert.equal(canRelease(state,'final'),true); state=release(state,'final'); assert.equal(settlement(state).feeChargedCents,11250);
});
test('overtime requires another party approval and changes final balance, never the original fee', () => {
  let state = release(collect(accept()),'advance');
  const request={ type:'propose_overtime',id:'OT-1',minutes:60,amountCents:40000 };
  state=move(state,request); assert.equal(settlement(state).overtimeCents,0);
  assert.equal(move(state,{type:'resolve_overtime',id:'OT-1',accept:true}),state);
  for(const role of ['admin','renter','visitor']) assert.equal(move(state,{type:'resolve_overtime',id:'OT-1',accept:true},role),state);
  state=move(state,{type:'resolve_overtime',id:'OT-1',accept:true},'artist');
  state=complete(state); assert.deepEqual(checkoutFor(state),{kind:'final',amountCents:242500});
  state=release(verify(collect(state)),'final');
  assert.equal(settlement(state).receivedCents,265000); assert.equal(settlement(state).paidOutCents,253750);
  assert.equal(state.installments[1].feeCents,0); assert.equal(move(state,{...request,id:'OT-2'}),state);
});
test('pending overtime blocks final checkout, rejected overtime adds nothing, and stale quotes fail', () => {
  let state = complete(move(accept(),{type:'skip_advance'}));
  const version=state.quoteVersion;
  state=move(state,{type:'propose_overtime',id:'OT-2',minutes:30,amountCents:10000},'artist');
  assert.equal(checkoutFor(state),null);
  state=move(state,{type:'resolve_overtime',id:'OT-2',accept:false});
  assert.equal(settlement(state).overtimeCents,0);
  assert.equal(move(state,{type:'collect',kind:'final',totalCents:225000,quoteVersion:version,method:'card'}),state);
  assert.equal(collect(state).payment,'held');
});
test('malformed and duplicate overtime cannot create charges', () => {
  const state=accept(); const request={type:'propose_overtime',id:'ot',minutes:60,amountCents:10000};
  for(const invalid of [{minutes:0},{minutes:1.5},{minutes:1441},{amountCents:0},{amountCents:1.5},{amountCents:NaN},{id:''}]) assert.equal(move(state,{...request,...invalid}),state);
  const proposed=move(state,request); assert.equal(move(proposed,request),proposed);
});
test('historical demo payments restore without silently changing previously charged amounts', () => {
  const events=[{actor:'customer',action:{type:'accept',cardNumber:'must not persist'},at},{actor:'customer',action:{type:'pay',quoteVersion:1,totalCents:236250},at},{actor:'artist',action:{type:'report_performance'},at},{actor:'admin',action:{type:'confirm_performance'},at},{actor:'admin',action:{type:'release'},at}];
  const restored=restoreBooking(JSON.stringify(events));
  assert.equal(restored.state.payment,'released'); assert.equal(settlement(restored.state).receivedCents,236250);
  assert.equal(settlement(restored.state).paidOutCents,225000); assert.equal(JSON.stringify(restored.events).includes('cardNumber'),false);
  for (const raw of ['{','null','[null]',JSON.stringify([{actor:'admin',action:{type:'release'},at}])]) assert.equal(restoreBooking(raw).state,initialBooking);
});
test('declines and invalid counteroffers cannot proceed to checkout', () => {
  const declined=move(initialBooking,{type:'decline'}); assert.equal(checkoutFor(declined),null);
  for(const amountCents of [NaN,Infinity,-1,0,1,100.1,100000001]) assert.equal(move(initialBooking,{type:'counter',amountCents}),initialBooking);
  const counter=move(initialBooking,{type:'counter',amountCents:200000}); assert.equal(move(counter,{type:'accept'}),counter);
});
test('demo card validation rejects real numbers and invalid expiry or CVV', () => {
  const card={name:'DEMO USER',number:'4242 4242 4242 4242',expiry:'12/30',cvv:'123'}, now=new Date('2026-10-15');
  assert.deepEqual(validateDemoCard(card,now),{});
  for(const expiry of ['00/30','13/30','09/26','10/25','10','']) assert.ok(validateDemoCard({...card,expiry},now).expiry);
  assert.ok(validateDemoCard({...card,number:'4111111111111111'},now).number); assert.ok(validateDemoCard({...card,cvv:'12'},now).cvv);
});
