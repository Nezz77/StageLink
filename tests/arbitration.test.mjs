import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPipeline, reducePipeline } from '../src/lib/pipeline.ts';
import { settlement, checkoutFor, canRelease } from '../src/lib/booking.ts';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
import { arbitrationFingerprint, arbitrationAmounts } from '../src/lib/arbitration.ts';
import { stockPhase } from '../src/lib/stock.ts';
import { bookingDocument } from '../src/lib/bookingDocuments.ts';
const at='2026-10-22T10:00:00Z',options={disputes:initialDashboard().cases,payoutDestinations:{renter:{id:'verified-demo-account',label:'Demo bank · 0042'},artist:{id:'verified-artist',label:'Demo bank · 0001'}}};
const record=s=>s.bookings.find(r=>r.id==='BK-2898');
const act=(s,command,actor='admin',expectedVersion=record(s).arbitration?.version??0,opts=options)=>reducePipeline(s,{type:'arbitration',id:'BK-2898',expectedVersion,command},actor,at,false,opts);
const prepare=(s,mode='split',refundCents=Math.round(settlement(record(s).ledger).heldCents/2))=>({kind:'prepare',caseId:'DSP-115',mode,refundCents,reason:'Reviewed the sample evidence and agreed allocation.',reviewed:true,fingerprint:arbitrationFingerprint(record(s))});
test('arbitration requires an open linked case, admin, evidence, valid integer allocation and current ledger',()=>{
 const s=initialPipeline(new Date(at)),c=prepare(s);for(const actor of ['customer','renter','artist','visitor'])assert.equal(act(s,c,actor),s);
 for(const change of [{caseId:'DSP-114'},{caseId:'unknown'},{reason:'short'},{reviewed:false},{fingerprint:'old'},{refundCents:1.1},{refundCents:-1},{refundCents:999999},{mode:'unknown'},{mode:'refund',refundCents:0},{mode:'provider',refundCents:10}])assert.equal(act(s,{...c,...change}),s);
 assert.equal(act(s,c,'admin',1),s);assert.equal(act(s,c,'admin',0,{...options,disputes:options.disputes.map(x=>({...x,status:'resolved'}))}),s);
});
test('confirmed decision reserves money but failure does not allocate or close the case',()=>{
 let s=initialPipeline(new Date(at)),before=structuredClone(record(s).ledger);s=act(s,prepare(s));assert.equal(record(s).arbitration.status,'processing');assert.equal(settlement(record(s).ledger).heldCents,25200);assert.equal(record(s).ledger.adjudicatedAt,undefined);
 for(const action of [{type:'settle',id:'BK-2898',action:{type:'release',kind:'legacy'}},{type:'refund',id:'BK-2898',reason:'Refund this booking please'},{type:'settle',id:'BK-2898',action:{type:'toggle_hold'}}])assert.equal(reducePipeline(s,action,'admin',at),s);
 s=act(s,{kind:'finish',outcome:'failure'});assert.equal(record(s).arbitration.status,'failed');assert.deepEqual(record(s).ledger.installments,before.installments);assert.equal(settlement(record(s).ledger).heldCents,25200);assert.equal(act(s,{kind:'finish',outcome:'success'}),s);
});
test('retry allocates exactly once and case closure is a separate coordinated dashboard commit',()=>{
 let s=initialPipeline(new Date(at));s=act(s,prepare(s));s=act(s,{kind:'finish',outcome:'failure'});s=act(s,{kind:'retry'});const version=record(s).arbitration.version;s=act(s,{kind:'finish',outcome:'success'});const r=record(s),t=settlement(r.ledger);assert.equal(r.arbitration.status,'settled');assert.deepEqual([t.heldCents,t.refundedCents,t.paidOutCents,t.feeChargedCents,t.remainingCents],[0,12600,11400,1200,0]);assert.equal(t.refundedCents+t.paidOutCents+t.feeChargedCents,t.receivedCents);assert.equal(checkoutFor(r.ledger),null);assert.equal(canRelease(r.ledger,'legacy'),false);assert.equal(act(s,{kind:'finish',outcome:'success'},'admin',version),s);assert.equal(act(s,prepare(s)),s);
 const d=initialDashboard();assert.notEqual(d.cases.find(c=>c.id==='DSP-115').status,'resolved');const closed=reduceDashboard(d,{type:'decide_case',id:'DSP-115',status:'resolved',reason:r.arbitration.reason},'admin',at);assert.equal(closed.cases.find(c=>c.id==='DSP-115').status,'resolved');
 const doc=bookingDocument(r,'settlement');assert.ok(doc.sections.some(section=>section.title==='Dispute arbitration (demo)'));assert.equal(doc.sections.find(x=>x.title==='Customer account').rows.find(x=>x[0]==='Outstanding balance')[1],'$0.00');
});
test('full refund takes no fee and full release deducts only the remaining original fee',()=>{
 for(const [mode,refund,expected]of [['refund',25200,[25200,0,0]],['provider',0,[0,24000,1200]]]){let s=initialPipeline(new Date(at));s=act(s,prepare(s,mode,refund));s=act(s,{kind:'finish',outcome:'success'});const t=settlement(record(s).ledger);assert.deepEqual([t.refundedCents,t.paidOutCents,t.feeChargedCents],expected);assert.equal(t.heldCents,0);}
 let s=initialPipeline(new Date(at));record(s).ledger.installments[0].grossCents=1;const a=arbitrationAmounts(record(s).ledger,0);assert.deepEqual([a.feeCents,a.payoutCents],[1,0]);
});
test('already released or refunded payments are immutable; only the remaining held balance is allocated',()=>{
 let s=initialPipeline(new Date(at));const r=record(s);r.ledger.installments=[{kind:'advance',grossCents:10000,paidAt:at,method:'card',releasedAt:at,feeCents:1200,payoutCents:8800},{kind:'final',grossCents:15000,paidAt:at,method:'card'},{kind:'legacy',grossCents:200,paidAt:at,method:'card',refundedAt:at}];const original=structuredClone(r.ledger.installments);s=act(s,prepare(s,'split',7500));s=act(s,{kind:'finish',outcome:'success'});assert.deepEqual(record(s).ledger.installments[0],original[0]);assert.deepEqual(record(s).ledger.installments[2],original[2]);const t=settlement(record(s).ledger);assert.deepEqual([t.refundedCents,t.paidOutCents,t.feeChargedCents],[7700,16300,1200]);assert.equal(t.refundedCents+t.paidOutCents+t.feeChargedCents,t.receivedCents);
});
test('payout account, changed funds, cancellation and stale attempts are guarded',()=>{
 let s=initialPipeline(new Date(at));assert.equal(act(s,prepare(s),'admin',0,{...options,payoutDestinations:{}}),s);s=act(s,prepare(s));const c=structuredClone(s);record(c).ledger.installments[0].grossCents++;assert.equal(act(c,{kind:'finish',outcome:'success'}),c);assert.equal(act(s,{kind:'finish',outcome:'success'},'admin',record(s).arbitration.version,{...options,payoutDestinations:{renter:{id:'different',label:'Changed bank'}}}),s);
 s=act(s,{kind:'cancel'});assert.equal(record(s).arbitration.status,'cancelled');assert.equal(record(s).ledger.payoutBlocked,false);assert.equal(settlement(record(s).ledger).heldCents,25200);const oldVersion=record(s).arbitration.version;s=act(s,prepare(s));assert.equal(act(s,{kind:'finish',outcome:'success'},'admin',oldVersion),s);
 const empty=initialPipeline(new Date(at));record(empty).ledger.installments=[];assert.equal(act(empty,prepare(empty)),empty);
});

test('refunding an out rental does not release physical stock; pre-dispatch refund cancels the reservation',()=>{
 let s=initialPipeline(new Date(at));s=act(s,prepare(s,'refund',25200));s=act(s,{kind:'finish',outcome:'success'});const r=record(s);assert.equal(r.status,'active');assert.equal(stockPhase(r,'2026-10-25',new Date(at)),'out');assert.equal(checkoutFor(r.ledger),null);r.stockReturnedAt=at;assert.equal(stockPhase(r,'2026-10-25',new Date(at)),'none');
 s=initialPipeline(new Date(at));record(s).status='accepted';s=act(s,prepare(s,'refund',25200));s=act(s,{kind:'finish',outcome:'success'});assert.equal(record(s).status,'cancelled');assert.equal(stockPhase(record(s),'2026-10-25',new Date(at)),'none');
});
