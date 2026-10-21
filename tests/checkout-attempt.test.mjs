import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoPaymentAttempt} from '../src/lib/demoCheckout.ts';
import {initialPipeline,reducePipeline} from '../src/lib/pipeline.ts';
import {settlement} from '../src/lib/booking.ts';

const id='BK-2901',at='2026-10-21T10:00:00Z';
const booking=s=>s.bookings.find(r=>r.id===id);
function accepted(){const s=initialPipeline();return reducePipeline(s,{type:'quote_response',id,quotationId:booking(s).quotations.at(-1).id,accept:true,advancePolicy:'escrow-50'},'customer',at);}
test('closing processing or a delayed demo response cannot collect, while one confirmed retry collects exactly once',()=>{
 let state=accepted(),calls=0;
 const version=booking(state).ledger.quoteVersion;
 const collect=()=>{calls++;const next=reducePipeline(state,{type:'settle',id,action:{type:'collect',kind:'advance',totalCents:112500,quoteVersion:version,method:'card'}},'customer',at);const ok=next!==state;state=next;return ok;};
 const cancelled=createDemoPaymentAttempt(collect);cancelled.cancel();assert.equal(cancelled.resolve('success'),'cancelled');assert.equal(calls,0);
 const delayed=createDemoPaymentAttempt(collect);assert.equal(delayed.resolve('pending'),'pending');assert.equal(settlement(booking(state).ledger).heldCents,0);delayed.cancel();assert.equal(delayed.resolve('success'),'cancelled');assert.equal(calls,0);
 const retried=createDemoPaymentAttempt(collect);assert.equal(retried.resolve('pending'),'pending');assert.equal(retried.resolve('success'),'success');assert.equal(retried.resolve('success'),'success');assert.equal(calls,1);assert.equal(settlement(booking(state).ledger).heldCents,112500);
});
test('declined and stale confirmations never record a payment or invoke collection twice',()=>{
 let state=accepted(),failed=0,calls=0;
 const originalVersion=booking(state).ledger.quoteVersion;
 const collect=()=>{calls++;const next=reducePipeline(state,{type:'settle',id,action:{type:'collect',kind:'advance',totalCents:112500,quoteVersion:originalVersion,method:'card'}},'customer',at);const ok=next!==state;state=next;return ok;};
 const decline=createDemoPaymentAttempt(collect,()=>failed++);assert.equal(decline.resolve('declined'),'declined');decline.resolve('success');decline.resolve('declined');assert.equal(calls,0);assert.equal(failed,1);
 state=reducePipeline(state,{type:'cancel',id},'customer',at);assert.equal(booking(state).status,'cancelled');
 const attempt=createDemoPaymentAttempt(collect);assert.equal(attempt.resolve('pending'),'pending');assert.equal(attempt.resolve('success'),'stale');assert.equal(attempt.resolve('success'),'stale');assert.equal(calls,1);assert.equal(settlement(booking(state).ledger).receivedCents,0);
});
