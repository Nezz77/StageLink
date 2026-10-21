import test from 'node:test';
import assert from 'node:assert/strict';
import { depositErrors, snapshotDeposit, defaultDepositTerms } from '../src/lib/securityDeposit.ts';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
import { catalogFor } from '../src/lib/catalog.ts';
import { initialPipeline, reducePipeline } from '../src/lib/pipeline.ts';
import { checkoutFor, settlement } from '../src/lib/booking.ts';
const fields = (mode = 'percentage', value = '15') => ({ depositMode: mode, depositValue: value, depositTerms: defaultDepositTerms, depositCurrency: 'USD' });
const at = '2026-10-21T09:00:00Z';
const form = { id: 'BK-DEPOSIT', serviceId: 'pa', event: 'A sound evening', date: '2026-12-10', start: '19:00', end: '22:00', venue: 'Grand Hall', guests: '100', requirements: '', quantity: '2' };
function setup(policy = fields()) {
 const dashboard = initialDashboard();
 const item = dashboard.listings.find(x => x.id === 'EQ-001');
 const saved = reduceDashboard(dashboard, { type: 'listing', listing: { ...item, price: '500', quantity: '5', ...policy } }, 'renter', at);
 const options = { catalog: catalogFor(saved) };
 const pipeline = reducePipeline(initialPipeline(), { type: 'submit', form }, 'customer', at, false, options);
 return { dashboard: saved, pipeline, options, record: pipeline.bookings[0] };
}
test('15% of a $1,000 rental subtotal is $150; cents round once', () => {
 assert.equal(snapshotDeposit(fields(), 100000).amountCents, 15000);
 assert.equal(snapshotDeposit(fields('percentage', '12.55'), 999).amountCents, 125);
 assert.equal(snapshotDeposit(fields('percentage', '100'), 12345).amountCents, 12345);
 assert.equal(snapshotDeposit(fields('fixed', '100.01'), 100000).amountCents, 10001);
 assert.equal(snapshotDeposit(fields('none', 'invalid'), 100000).amountCents, 0);
});
test('invalid values, terms, currencies and unsafe bases cannot produce a deposit', () => {
 for (const policy of [fields('percentage', '101'), fields('percentage', '0'), fields('fixed', '-1'), fields('fixed', '1.001'), fields('fixed', '1000001'), fields('fixed', 'NaN'), fields('other'), {...fields(), depositTerms: 'short'}, {...fields(), depositCurrency: 'LKR'}]) {
  assert.ok(Object.keys(depositErrors(policy)).length); assert.equal(snapshotDeposit(policy, 100000), undefined);
 }
 for (const base of [-1, 0.1, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(snapshotDeposit(fields(), base), undefined);
 assert.equal(snapshotDeposit({}, 1000).amountCents, 0);
});
test('provider policy validates on publish; drafts retain mode, values and terms without changing the listing', () => {
 const state = initialDashboard(), listing = {...state.listings.find(x => x.owner === 'renter'), ...fields()};
 for (const actor of ['artist', 'customer', 'admin', 'visitor']) assert.equal(reduceDashboard(state, {type:'listing', listing}, actor, at), state);
 assert.equal(reduceDashboard(state, {type:'listing', listing:{...listing, depositValue:'101'}}, 'renter', at), state);
 const draft = reduceDashboard(state, {type:'draft', key:`listing:${listing.id}`, values:{...listing}}, 'renter', at);
 assert.deepEqual(draft.drafts[`renter:listing:${listing.id}`], listing);
 assert.deepEqual(draft.listings, state.listings);
 const saved = reduceDashboard(draft, {type:'listing',listing}, 'renter', at);
 assert.equal(saved.drafts[`renter:listing:${listing.id}`], undefined);
 assert.equal(saved.listings.find(x=>x.id===listing.id).depositValue, '15');
});
test('booking copies policy and quantity basis; later listing edits cannot rewrite it', () => {
 const { dashboard, record } = setup();
 assert.equal(record.securityDeposit.rentalSubtotalCents, 100000);
 assert.equal(record.securityDeposit.amountCents, 15000);
 const listing = dashboard.listings.find(x=>x.id==='EQ-001');
 const changed = reduceDashboard(dashboard, {type:'listing',listing:{...listing,...fields('fixed','250')}}, 'renter', at);
 assert.equal(catalogFor(changed).find(x=>x.id==='pa').depositPolicy.value, '250');
 assert.equal(record.securityDeposit.policy.value, '15');
 assert.notEqual(record.securityDeposit.policy, record.service.depositPolicy);
 assert.equal(record.securityDeposit.amountCents, 15000);
});
test('fixed deposit is once per booking; none and historical records stay explicit', () => {
 assert.equal(setup(fields('fixed','100')).record.securityDeposit.amountCents, 10000);
 assert.equal(setup(fields('none','')).record.securityDeposit.amountCents, 0);
 assert.equal(initialPipeline().bookings.find(x=>x.serviceId==='pa').securityDeposit, undefined);
});
test('quotation changes use the copied policy; accepted amount excludes overtime, fees, advances and rental ledger', () => {
 const {pipeline, options} = setup();
 let state = reducePipeline(pipeline, {type:'quotation',id:form.id,expectedVersion:1,input:{description:'Updated equipment rental',lines:[{description:'Rental package',quantity:1,unitCents:120000}],notes:'',included:'Speakers and cables'}}, 'renter', at, false, options);
 let r = state.bookings.find(x=>x.id===form.id);
 assert.equal(r.securityDeposit.amountCents,18000);
 assert.equal(r.securityDeposit.rentalSubtotalCents,120000);
 state = reducePipeline(state,{type:'quote_response',id:r.id,quotationId:r.quotations.at(-1).id,accept:true,advancePolicy:'escrow-50'},'customer',at,false,options);
 r = state.bookings.find(x=>x.id===form.id);
 assert.equal(checkoutFor(r.ledger).amountCents,60000);
 state = reducePipeline(state,{type:'settle',id:r.id,action:{type:'collect',kind:'advance',quoteVersion:r.ledger.quoteVersion,totalCents:60000,method:'wallet'}},'customer',at,false,options);
 r = state.bookings.find(x=>x.id===form.id);
 assert.equal(settlement(r.ledger).receivedCents,60000);
 assert.equal(settlement(r.ledger).feeCents,6000);
 assert.equal(settlement(r.ledger).remainingCents,60000);
 const snapshot = structuredClone(r.securityDeposit);
 state = reducePipeline(state,{type:'settle',id:r.id,action:{type:'propose_overtime',id:'EXTRA',minutes:30,amountCents:10000}},'renter',at,false,options);
 assert.deepEqual(state.bookings.find(x=>x.id===form.id).securityDeposit,snapshot);
 assert.equal(reducePipeline(state,{type:'quotation',id:r.id,expectedVersion:r.ledger.quoteVersion,input:{description:'Changed after acceptance',lines:[{description:'Rental',quantity:1,unitCents:99999}],notes:'',included:''}},'renter',at,false,options),state);
});
