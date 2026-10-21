import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDashboard } from '../src/lib/dashboard.ts';
import { catalogFor } from '../src/lib/catalog.ts';
import { initialPipeline, reducePipeline, validateForm } from '../src/lib/pipeline.ts';
import { initialStock, stockAvailability, stockRequestError, stockPhase } from '../src/lib/stock.ts';
import { checkoutFor, settlement } from '../src/lib/booking.ts';
const at='2026-10-21T10:00:00Z', later='2026-10-21T10:16:00Z', date='2026-11-24';
const dashboard=initialDashboard();dashboard.listings=dashboard.listings.map(l=>l.id==='EQ-001'?{...l,quantity:'5'}:l);
const options={catalog:catalogFor(dashboard),availability:dashboard.availability};
const service=options.catalog.find(s=>s.id==='pa');
const form={id:'BK-STOCK',serviceId:'pa',event:'Stock demo',date,start:'18:00',end:'21:00',quantity:'2',venue:'Hall',guests:'80',requirements:''};
const seed=()=>initialPipeline(new Date(at));
const act=(s,a,actor='customer',when=at,opts=options)=>reducePipeline(s,a,actor,when,false,opts);
const sample=(s,units=3,kind='confirmed')=>act(s,{type:'stock_sample',scenario:'reserve',serviceId:'pa',date,units,kind});
const view=(s,when=at)=>stockAvailability(service,date,s.bookings,s.stock,new Date(when));
const rec=s=>s.bookings.find(r=>r.id===form.id);
const submit=s=>act(s,{type:'submit',form});
test('date-specific availability sums full-day quantities and hides counts for unknown data',()=>{
 const s=sample(seed());assert.equal(view(s).available,2);assert.equal(view(s).reserved,3);assert.equal(view(s).state,'low');
 assert.equal(stockAvailability(service,'2026-11-25',s.bookings,s.stock,new Date(at)).available,5);
 assert.equal(stockAvailability(service,'2026-02-30',[],initialStock(at)).state,'choose-date');
 for(const status of ['stale','unavailable'])assert.equal(stockAvailability(service,date,[],{...initialStock(at),status}).available,null);
 assert.equal(stockAvailability({...service,available:false,listingStatus:'maintenance'},date,[]).state,'maintenance');
});
test('stale, unavailable, sold-out and excess-quantity requests are blocked',()=>{
 let s=sample(seed());assert.match(validateForm({...form,quantity:'3'},s.bookings,new Date(at),{...options,stock:s.stock}).quantity,/Only 2/);
 assert.equal(act(s,{type:'submit',form:{...form,quantity:'3'}}),s);
 for(const scenario of ['stale','unavailable']){const bad=act(s,{type:'stock_sample',scenario,serviceId:'pa',date});assert.equal(submit(bad),bad);}
 s=sample(s,2);assert.equal(view(s).state,'sold-out');assert.equal(submit(s),s);
});
test('sequential request writes cannot overbook the same day, even at different times',()=>{
 const s=submit(sample(seed()));assert.equal(view(s).available,0);assert.equal(view(s).pending,2);
 assert.equal(act(s,{type:'submit',form:{...form,id:'BK-SECOND',quantity:'1',start:'08:00',end:'09:00'}}),s);
 assert.equal(stockRequestError(rec(s),service,s.bookings,s.stock,new Date(at)), '');
 assert.equal(act(s,{type:'submit',form}),s);
});
test('expired request holds release units and renewal rechecks competing stock',()=>{
 const s=submit(sample(seed()));assert.equal(view(s,later).available,2);assert.equal(stockPhase(rec(s),date,new Date(later)),'expired');
 const competitor=act(s,{type:'stock_sample',scenario:'reserve',serviceId:'pa',date,units:2,kind:'confirmed'},'renter',later);
 assert.equal(act(competitor,{type:'renew_stock',id:form.id},'customer',later),competitor);
 const renewed=act(s,{type:'renew_stock',id:form.id},'customer',later);assert.equal(view(renewed,later).available,0);assert.notEqual(rec(renewed).stockHold.expiresAt,rec(s).stockHold.expiresAt);
 assert.equal(act(s,{type:'renew_stock',id:form.id},'renter',later),s);
 assert.equal(act(s,{type:'respond',id:form.id,accept:true},'renter',later),s);
});
test('temporary sample expiry restores stock; release touches only sample records',()=>{
 let s=submit(sample(seed(),2,'temporary'));assert.equal(view(s).reserved,4);
 s=act(s,{type:'stock_sample',scenario:'expire',serviceId:'pa',date});assert.equal(view(s).reserved,2);assert.equal(rec(s).status,'pending');
 s=act(s,{type:'stock_sample',scenario:'release',serviceId:'pa',date});assert.equal(view(s).reserved,2);
 assert.equal(sample(s,4),s);assert.equal(act(s,{type:'stock_sample',scenario:'reserve',serviceId:'pa',date,units:0,kind:'confirmed'}),s);
 assert.equal(act(s,{type:'stock_sample',scenario:'reserve',serviceId:'pa',date,units:1,kind:'confirmed'},'artist'),s);
});
test('accepted quotes keep allocation after the temporary hold time and cancellation releases it',()=>{
 let s=submit(sample(seed()));s=act(s,{type:'respond',id:form.id,accept:true},'renter');
 assert.equal(rec(s).ledger.quoteStatus,'accepted');assert.equal(view(s,later).reserved,5);
 assert.equal(act(s,{type:'expire_stock',id:form.id}),s);
 s=act(s,{type:'cancel',id:form.id});assert.equal(view(s).available,2);
});
test('capacity changes and stale stock reject a previously opened checkout; refresh permits retry',()=>{
 let s=act(submit(sample(seed())),{type:'respond',id:form.id,accept:true},'renter');const r=rec(s),offer=checkoutFor(r.ledger);
 const payment={type:'settle',id:form.id,action:{type:'collect',kind:offer.kind,totalCents:offer.amountCents,quoteVersion:r.ledger.quoteVersion,method:'card'}};
 const reduced={...options,catalog:options.catalog.map(v=>v.id==='pa'?{...v,capacity:4}:v)};
 assert.equal(act(s,payment,'customer',at,reduced),s);
 assert.equal(act(s,payment,'customer',at,{...options,catalog:options.catalog.filter(v=>v.id!=='pa')}),s);
 s=act(s,{type:'stock_sample',scenario:'stale',serviceId:'pa',date});assert.equal(act(s,payment),s);assert.equal(settlement(rec(s).ledger).receivedCents,0);
 s=act(s,{type:'stock_sample',scenario:'refresh',serviceId:'pa',date});const paid=act(s,payment);assert.equal(settlement(rec(paid).ledger).receivedCents,offer.amountCents);assert.equal(act(paid,payment),paid);
});
test('out equipment and completed rentals awaiting inspection remain reserved on later dates',()=>{
 let s=submit(seed());const r=rec(s);for(const status of ['active','completed']){const booking={...r,status,ledger:{...r.ledger,quoteStatus:'accepted'}};assert.equal(stockAvailability(service,'2026-11-25',[booking],initialStock(at)).available,3);}
 const returned={...r,status:'completed',stockReturnedAt:at};assert.equal(stockAvailability(service,'2026-11-25',[returned]).available,5);
 const reduced=stockAvailability({...service,capacity:1},date,[{...r,ledger:{...r.ledger,quoteStatus:'accepted'}}]);assert.equal(reduced.state,'overallocated');assert.equal(reduced.available,0);
});
