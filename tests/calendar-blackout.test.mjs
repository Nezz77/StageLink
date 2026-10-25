import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
import { initialPipeline, reducePipeline, validateForm, availabilityError } from '../src/lib/pipeline.ts';
import { catalogFor } from '../src/lib/catalog.ts';
import { calendarBlockError, calendarImpacts, scheduleRevision, isFullDayBlock } from '../src/lib/calendar.ts';
const at='2026-10-22T09:00:00Z';
const period=(patch={})=>({id:'private-day',date:'2026-12-05',start:'00:00',end:'23:59',reason:'Personal leave',...patch});
const request=(patch={})=>({id:'BK-BLACKOUT',serviceId:'aria',event:'Winter reception',date:'2026-12-05',start:'18:00',end:'21:00',venue:'Grand Hall',guests:'60',quantity:'1',requirements:'',...patch});
const options=dashboard=>({catalog:catalogFor(dashboard),availability:dashboard.availability});
const add=(dashboard,block=period(),role='artist',revision=scheduleRevision(dashboard.availability[role]))=>reduceDashboard(dashboard,{type:'calendar_block',block,revision},role,at);
const remove=(dashboard,id='private-day',role='artist',revision=scheduleRevision(dashboard.availability[role]))=>reduceDashboard(dashboard,{type:'calendar_unblock',id,revision},role,at);

test('calendar blocks update shared availability and reject new requests without private reason disclosure',()=>{
 const before=initialDashboard(),after=add(before),form=request();
 assert.equal(before.availability.artist.blocks.length,0);
 assert.equal(after.availability.artist.blocks[0].reason,'Personal leave');
 assert.equal(after.availability.renter,before.availability.renter);
 const error=availabilityError(form,options(after));assert.match(error,/blocked/);assert.ok(!error.includes('Personal leave'));
 assert.match(validateForm(form,initialPipeline().bookings,new Date(at),options(after)).serviceId,/blocked/);
 assert.equal(isFullDayBlock(after.availability.artist.blocks[0]),true);
});
test('a block after a request prevents provider acceptance and unblocking restores acceptance',()=>{
 let dashboard=initialDashboard(),pipeline=initialPipeline();
 pipeline=reducePipeline(pipeline,{type:'submit',form:request()},'customer',at,false,options(dashboard));
 const pending=pipeline.bookings.find(record=>record.id==='BK-BLACKOUT');assert.ok(pending);
 dashboard=add(dashboard);
 assert.equal(reducePipeline(pipeline,{type:'respond',id:pending.id,accept:true},'artist',at,false,options(dashboard)),pipeline);
 assert.equal(pending.status,'pending');assert.equal(pipeline.bookings.find(record=>record.id===pending.id),pending);
 dashboard=remove(dashboard);
 assert.notEqual(reducePipeline(pipeline,{type:'respond',id:pending.id,accept:true},'artist',at,false,options(dashboard)),pipeline);
});
test('partial blocks allow adjacent times and other dates while blocking any overlapping slot',()=>{
 const dashboard=add(initialDashboard(),period({start:'18:00',end:'20:00'}));
 assert.equal(availabilityError(request({start:'16:00',end:'18:00'}),options(dashboard)),'');
 assert.equal(availabilityError(request({start:'20:00',end:'22:00'}),options(dashboard)),'');
 assert.match(availabilityError(request({start:'19:59',end:'21:00'}),options(dashboard)),/blocked/);
 assert.equal(availabilityError(request({date:'2026-12-06'}),options(dashboard)),'');
});
test('calendar validation rejects past/impossible dates, invalid ranges and missing or long reasons',()=>{
 const schedule=initialDashboard().availability.artist;
 for(const block of [period({date:'2026-02-30'}),period({date:'2026-10-21'}),period({start:'22:00',end:'18:00'}),period({start:'24:00'}),period({reason:'   '}),period({reason:'x'.repeat(161)})])assert.ok(calendarBlockError(schedule,block,'2026-10-22'));
 assert.equal(calendarBlockError(schedule,period({date:'2026-10-22'}),'2026-10-22'),'');
});
test('duplicate, overlapping and excess calendar blocks cannot be saved',()=>{
 const initial=initialDashboard(),one=add(initial,period({start:'18:00',end:'20:00'}));
 assert.equal(add(one,period()),one);
 assert.equal(add(one,period({id:'overlap',start:'19:00',end:'21:00'})),one);
 const adjacent=add(one,period({id:'adjacent',start:'20:00',end:'22:00'}));assert.equal(adjacent.availability.artist.blocks.length,2);
 let ten=initial;for(let i=0;i<10;i++)ten=add(ten,period({id:`block-${i}`,date:`2026-12-${String(i+10).padStart(2,'0')}`}));
 assert.equal(ten.availability.artist.blocks.length,10);assert.equal(add(ten,period({id:'eleven'})),ten);
});
test('calendar actions are provider scoped and stale confirmations cannot overwrite a newer schedule',()=>{
 const initial=initialDashboard(),revision=scheduleRevision(initial.availability.artist);
 for(const actor of ['customer','visitor','admin']){assert.equal(reduceDashboard(initial,{type:'calendar_block',block:period(),revision},actor,at),initial);assert.equal(reduceDashboard(initial,{type:'calendar_unblock',id:'private-day',revision},actor,at),initial);}
 const renter=add(initial,period(),'renter');assert.equal(renter.availability.artist,initial.availability.artist);assert.equal(renter.availability.renter.blocks.length,1);
 const one=add(initial);assert.equal(add(one,period({id:'second',date:'2026-12-06'}),'artist',revision),one);
 assert.equal(remove(one,'private-day','artist',revision),one);
 assert.equal(remove(one,'missing'),one);
 const noLongerBlocked=remove(one);assert.equal(remove(noLongerBlocked),noLongerBlocked);
});
test('unblock removes only its own period and retains hours, weekdays, other blocks and drafts for other forms',()=>{
 let state=initialDashboard();state=reduceDashboard(state,{type:'draft',key:'availability',values:{schedule:JSON.stringify(state.availability.artist)}},'artist',at);
 state=reduceDashboard(state,{type:'draft',key:'profile',values:{name:'Draft name'}},'artist',at);
 state=add(state);assert.equal(state.drafts['artist:availability'],undefined);assert.ok(state.drafts['artist:profile']);
 state=add(state,period({id:'another',date:'2026-12-06'}));const before=state.availability.artist;state=remove(state);
 assert.deepEqual(state.availability.artist.days,before.days);assert.equal(state.availability.artist.start,before.start);assert.equal(state.availability.artist.end,before.end);
 assert.deepEqual(state.availability.artist.blocks,[before.blocks[1]]);
});
test('impact warnings cover live and pending provider bookings across gigs without including unrelated records',()=>{
 const base={id:'BK-1',event:'Reception',date:'2026-12-05',start:'18:00',end:'21:00',status:'accepted',role:'artist'};
 const records=[base,{...base,id:'pending',status:'pending'},{...base,id:'active',status:'active'},{...base,id:'finished',status:'completed'},{...base,id:'cancelled',status:'cancelled'},{...base,id:'rental',role:'renter'},{...base,id:'adjacent',start:'21:00',end:'22:00'},{...base,id:'other-day',date:'2026-12-06'}];
 assert.deepEqual(calendarImpacts(period({start:'18:00',end:'21:00'}),records,'artist').map(record=>record.id),['BK-1','pending','active']);
 assert.equal(records[0].status,'accepted');assert.equal(records.length,8);
});
