import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDashboard, reduceDashboard, listingErrors } from '../src/lib/dashboard.ts';
import { catalogFor } from '../src/lib/catalog.ts';
import { initialPipeline, reducePipeline, validateForm, quoteFor } from '../src/lib/pipeline.ts';
import { checkoutFor } from '../src/lib/booking.ts';
import { bookingDocument } from '../src/lib/bookingDocuments.ts';
import { demoPackages, packageErrors, parsePackages, choiceError, packageSnapshot, packageEnd } from '../src/lib/gigPackages.ts';
const at='2026-10-22T08:00:00Z', now=new Date(at);
const publish=(state=initialDashboard(),packages=demoPackages())=>reduceDashboard(state,{type:'listing',listing:{...state.listings[0],gigPackages:JSON.stringify(packages)}},'artist',at);
const dash=publish(),catalog=catalogFor(dash),service=catalog.find(s=>s.id==='aria'),options={catalog};
const form=(tier='standard',addons='')=>({id:'BK-PACKAGE',serviceId:'aria',event:'Package performance',date:'2026-12-10',start:'16:00',end:tier==='standard'?'18:00':'20:00',venue:'Colombo',guests:'80',requirements:'Venue soundcheck at 15:00.',packageId:tier,packageVersion:service.gigPackageVersion,packageAddonIds:addons});
const submit=(f=form(),o=options,state=initialPipeline(now))=>reducePipeline(state,{type:'submit',form:f},'customer',at,false,o);
const rec=s=>s.bookings.find(b=>b.id==='BK-PACKAGE');
test('publishing validates three tiers, changes edition only on package changes, and drafts do not publish',()=>{
 assert.equal(service.gigPackageVersion,'1');assert.equal(service.gigPackages.length,3);
 const same=publish(dash);assert.equal(same.listings[0].gigPackageVersion,'1');
 const changed=demoPackages();changed[0].price='950';const next=publish(dash,changed);assert.equal(next.listings[0].gigPackageVersion,'2');
 const original=initialDashboard();const draft=reduceDashboard(original,{type:'draft',key:'listing:GIG-001',values:{...original.listings[0],gigPackages:JSON.stringify(demoPackages())}},'artist',at);assert.equal(draft.listings[0].gigPackages,undefined);assert.ok(draft.drafts['artist:listing:GIG-001']);
 assert.equal(reduceDashboard(original,{type:'listing',listing:{...dash.listings[0],gigPackageVersion:'99'}},'customer',at),original);
 assert.equal(listingErrors({...dash.listings[0],price:''}).price,undefined);
});
test('fixed package price includes selected add-ons once and updates duration instead of multiplying hourly rate',()=>{
 assert.equal(quoteFor(form(),catalog),90000);assert.equal(quoteFor(form('standard','sound'),catalog),105000);assert.equal(quoteFor(form('deluxe','lights'),catalog),270000);
 assert.equal(validateForm({...form(),end:'19:00'},[],now,options).end?.includes('duration'),true);
 assert.equal(Object.keys(validateForm(form('deluxe','lights'),[],now,options)).length,0);
 const r=rec(submit(form('deluxe','lights')));assert.equal(r.ledger.quoteCents,270000);assert.deepEqual(r.quotations[0].lines.map(l=>l.unitCents),[240000,30000]);assert.equal(r.gigPackage.performers,4);assert.match(r.quotations[0].included,/PA & sound engineer/);
});
test('missing, removed, stale, duplicate, forged add-ons and oversized choices never use old hourly price',()=>{
 for(const f of [{...form(),packageId:undefined},{...form(),packageVersion:'0'},form('missing'),form('standard','sound,sound'),form('standard','free'),{...form(),packageAddonIds:'x'.repeat(81)}]){
  assert.ok(validateForm(f,[],now,options).packageId);assert.equal(quoteFor(f,catalog),0);const initial=initialPipeline(now);assert.equal(submit(f,options,initial),initial);
 }
 const removed={catalog:catalogFor(initialDashboard())};assert.ok(validateForm(form(),[],now,removed).packageId);const initial=initialPipeline(now);assert.equal(submit(form(),removed,initial),initial);
});
test('changing a published package makes old selections stale and preserves submitted booking snapshots',()=>{
 const state=submit(form('standard','sound')),before=JSON.stringify(rec(state));
 const rows=demoPackages();rows[0].title='New solo show';rows[0].price='999';rows[0].included='Different included services';
 const next=publish(dash,rows),updated={catalog:catalogFor(next)};
 assert.ok(choiceError(updated.catalog.find(s=>s.id==='aria'),form()));
 assert.equal(JSON.stringify(rec(state)),before);assert.equal(rec(state).gigPackage.totalCents,105000);assert.equal(rec(state).service.gigPackages[0].title,'Acoustic Solo');
 const paused=reduceDashboard(next,{type:'listing_status',id:'GIG-001',status:'paused'},'artist',at);assert.equal(submit({...form(),packageVersion:'2'},{catalog:catalogFor(paused)},state),state);
});
test('custom VIP sends an unpriced request, blocks free quotation/payment, then uses a real provider quotation',()=>{
 const state=submit(form('vip')),r=rec(state);assert.ok(r);assert.equal(r.gigPackage.totalCents,null);assert.equal(r.quotations.length,0);assert.equal(checkoutFor(r.ledger),null);assert.match(state.messages.at(-1).text,/Custom quote requested/);assert.equal(bookingDocument(r,'invoice'),null);assert.equal(bookingDocument(r,'settlement'),null);
 assert.equal(reducePipeline(state,{type:'respond',id:r.id,accept:true},'artist',at,false,options),state);
 const input={description:'VIP · Agreed signature show',included:'Four musicians, custom repertoire and encore.',notes:'Sound included.',lines:[{description:'Agreed VIP performance',quantity:1,unitCents:0}]};
 assert.equal(reducePipeline(state,{type:'quotation',id:r.id,expectedVersion:r.ledger.quoteVersion,input},'artist',at,false,options),state);
 input.lines[0].unitCents=360000;
 const offered=reducePipeline(state,{type:'quotation',id:r.id,expectedVersion:r.ledger.quoteVersion,input},'artist',at,false,options);assert.notEqual(offered,state);assert.equal(checkoutFor(rec(offered).ledger),null);
 const accepted=reducePipeline(offered,{type:'quote_response',id:r.id,quotationId:rec(offered).quotations.at(-1).id,accept:true,advancePolicy:'escrow-50'},'customer',at,false,options);
 assert.deepEqual(checkoutFor(rec(accepted).ledger),{kind:'advance',amountCents:180000});assert.equal(rec(accepted).gigPackage.totalCents,null);assert.ok(bookingDocument(rec(accepted),'invoice').sections.some(s=>s.title==='Original requested package'));
});
test('fixed tier quotation/escrow is exact, snapshot is included on invoices, historical hourly bookings remain intact',()=>{
 const state=submit(form('standard','sound')),r=rec(state);
 const accepted=reducePipeline(state,{type:'respond',id:r.id,accept:true},'artist',at,false,options);
 const final=reducePipeline(accepted,{type:'quote_response',id:r.id,quotationId:rec(accepted).quotations.at(-1).id,accept:true,advancePolicy:'escrow-50'},'customer',at,false,options);
 assert.deepEqual(checkoutFor(rec(final).ledger),{kind:'advance',amountCents:52500});
 const invoice=bookingDocument(rec(final),'invoice');assert.match(JSON.stringify(invoice),/Compact PA setup/);assert.match(JSON.stringify(invoice),/edition 1/);
 const legacy={...form(),packageId:undefined,packageVersion:undefined,packageAddonIds:undefined};assert.equal(quoteFor(legacy),150000);assert.equal(initialPipeline(now).bookings[0].gigPackage,undefined);
});
test('package validation rejects invalid duration, amounts, hidden custom prices and excessive add-on totals',()=>{
 const mutate=(fn)=>{const p=demoPackages();fn(p);assert.ok(packageErrors(JSON.stringify(p)));assert.equal(parsePackages(JSON.stringify(p)),undefined);};
 mutate(p=>p[0].price='0');mutate(p=>p[0].price='1.001');mutate(p=>p[1].duration='125');mutate(p=>p[0].performers='0');mutate(p=>p[2].price='999');mutate(p=>p[0].pricing='custom');mutate(p=>p[0].addons.push({...p[0].addons[0]}));mutate(p=>{p[0].price='999999';p[0].addons[0].price='2';});mutate(p=>p.pop());
 assert.equal(packageErrors('not json').length>0,true);assert.equal(packageErrors(JSON.stringify(demoPackages())), '');
 assert.equal(packageEnd('22:00',120),'');assert.equal(packageEnd('20:00',120),'22:00');assert.equal(packageEnd('bad',120),'');
 assert.equal(packageSnapshot(service,form('vip')).baseCents,null);
});
