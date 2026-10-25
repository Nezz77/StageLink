import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPipeline, reducePipeline } from '../src/lib/pipeline.ts';
import { initialReminders, loadReminderFixtures, syncReminderBookings, reduceReminders, reminderView, reminderTime, reminderActionError } from '../src/lib/reminders.ts';
const at='2026-10-23T04:30:00.000Z',filters={status:'all',channel:'all',window:'activity',query:''};
const counts=s=>reminderView(s,filters).counts;
const change=(s,action)=>reduceReminders(s,action,at);
const fail=s=>change(s,{command:'failure_example'});
const target=s=>s.jobs.find(j=>j.id==='RM-001');
const retry=s=>change(s,{command:'retry',id:'RM-001',version:target(s).version});

test('queue starts disconnected and derives 14 scheduled, 42 sent and 0 failed from real fixture rows',()=>{
 const empty=initialReminders();assert.equal(empty.loaded,false);assert.deepEqual(counts(empty),{scheduled:0,sent:0,failed:0,cancelled:0});
 const q=change(empty,{command:'load'});assert.equal(q.jobs.length,56);assert.deepEqual(counts(q),{scheduled:14,sent:42,failed:0,cancelled:0});
 assert.equal(reminderView(q,{...filters,channel:'sms'}).counts.scheduled,7);assert.equal(reminderView(q,{...filters,channel:'email'}).counts.sent,21);
 assert.equal(change(q,{command:'load'}),q);assert.match(reminderTime(at),/10:00/);assert.match(reminderTime(at,'UTC'),/04:30/);
});
test('only admin may manage queue state and booking data is retained',()=>{
 const state=initialPipeline(new Date(at)),action={type:'reminders',action:{command:'load'}};
 for(const role of ['visitor','customer','artist','renter'])assert.equal(reducePipeline(state,action,role,at),state);
 const next=reducePipeline(state,action,'admin',at);assert.equal(next.bookings,state.bookings);assert.equal(next.messages,state.messages);assert.equal(next.reminders.loaded,true);
 assert.equal(reducePipeline(state,null,'admin',at),state);
});
test('retry retains job and delivery identity, rejects stale confirmation and never retries a sent job',()=>{
 let q=fail(loadReminderFixtures(at));assert.deepEqual(counts(q),{scheduled:13,sent:42,failed:1,cancelled:0});const failed=target(q),key=failed.deliveryKey;
 q=retry(q);assert.equal(target(q).status,'scheduled');assert.equal(target(q).deliveryKey,key);assert.equal(target(q).retries,1);assert.equal(q.jobs.length,56);
 assert.equal(change(q,{command:'retry',id:failed.id,version:failed.version}),q);
 q=change(q,{command:'run',outcome:'success'});assert.equal(target(q).status,'sent');assert.equal(target(q).attempts,2);assert.deepEqual(counts(q),{scheduled:10,sent:46,failed:0,cancelled:0});
 assert.equal(retry(q),q);assert.equal(change(q,{command:'cancel',id:failed.id,version:target(q).version}),q);
});
test('failed retries stop at three attempts and stale/error snapshots pause mutations until refresh',()=>{
 let q=fail(loadReminderFixtures(at));q=change(retry(q),{command:'run',outcome:'failure'});q=change(retry(q),{command:'run',outcome:'failure'});
 assert.equal(target(q).attempts,3);assert.match(reminderActionError(q,target(q),'retry'),/limit/);assert.equal(retry(q),q);
 const fresh=q;
 for(const command of ['stale','error']){q=change(fresh,{command});assert.equal(change(q,{command:'run',outcome:'success'}),q);assert.equal(change(q,{command:'cancel',id:target(q).id,version:target(q).version}),q);q=change(q,{command:'refresh'});assert.equal(q.health,'ready');assert.deepEqual(q.jobs,fresh.jobs);}
});
test('cancelling a single reminder retains its companion channel and all sent history',()=>{
 const q=loadReminderFixtures(at),sent=q.jobs.filter(j=>j.status==='sent');const next=change(q,{command:'cancel',id:'RM-001',version:1});
 assert.equal(target(next).status,'cancelled');assert.equal(next.jobs.find(j=>j.id==='RM-002').status,'scheduled');assert.deepEqual(next.jobs.filter(j=>j.status==='sent'),sent);
 assert.equal(change(next,{command:'cancel',id:'RM-001',version:1}),next);
});
test('sample event cancellation suppresses every active channel and makes old retry confirmations invalid',()=>{
 let q=fail(loadReminderFixtures(at));const failed=target(q);q=change(q,{command:'cancel_event',id:failed.id,version:failed.version});
 assert.equal(q.events.find(e=>e.id===failed.eventId).status,'cancelled');assert.ok(q.jobs.filter(j=>j.eventId===failed.eventId).every(j=>j.status==='cancelled'));assert.equal(counts(q).cancelled,2);
 assert.equal(change(q,{command:'retry',id:failed.id,version:failed.version}),q);
 q=change(q,{command:'run',outcome:'success'});assert.ok(q.jobs.filter(j=>j.eventId===failed.eventId).every(j=>j.status==='cancelled'));
});
test('accepted booking reminders share the pipeline and customer cancellation suppresses them immediately',()=>{
 let state=initialPipeline(new Date(at));state=reducePipeline(state,{type:'reminders',action:{command:'load'}},'admin',at);
 const form={id:'BK-REMINDER',serviceId:'aria',event:'Winter reception',date:'2026-12-05',start:'18:00',end:'21:00',venue:'Grand Hall',guests:'50',quantity:'1',requirements:''};
 state=reducePipeline(state,{type:'submit',form},'customer',at);state=reducePipeline(state,{type:'respond',id:form.id,accept:true},'artist',at);
 assert.equal(state.bookings.find(b=>b.id===form.id).status,'accepted');const event=state.reminders.events.find(e=>e.bookingId===form.id);assert.ok(event);assert.equal(state.reminders.jobs.filter(j=>j.eventId===event.id).length,2);
 const before=state;state=reducePipeline(state,{type:'cancel',id:form.id},'customer',at);assert.notEqual(state,before);assert.equal(state.bookings.find(b=>b.id===form.id).status,'cancelled');assert.ok(state.reminders.jobs.filter(j=>j.eventId===event.id).every(j=>j.status==='cancelled'));
});
test('event changes cancel obsolete jobs, preserve sent history and do not duplicate schedules on sync',()=>{
 const record={id:'BK-SYNC',event:'A private evening',date:'2026-11-06',start:'18:00',status:'accepted'};let q=syncReminderBookings(loadReminderFixtures(at),[record]);assert.equal(syncReminderBookings(q,[record]),q);
 const event=q.events.find(e=>e.bookingId===record.id),old=q.jobs.filter(j=>j.eventId===event.id);q={...q,jobs:q.jobs.map(j=>j.id===old[0].id?{...j,status:'sent'}:j)};
 q=syncReminderBookings(q,[{...record,start:'19:00'}]);assert.equal(q.jobs.find(j=>j.id===old[0].id).status,'sent');assert.equal(q.jobs.find(j=>j.id===old[1].id).status,'cancelled');assert.equal(q.jobs.filter(j=>j.eventId===event.id&&j.status==='scheduled').length,2);
 q=syncReminderBookings(q,[{...record,status:'completed'}]);assert.ok(q.jobs.filter(j=>j.eventId===event.id).every(j=>['sent','cancelled'].includes(j.status)));
});
test('due processing prevents duplicate delivery keys within the same batch and skips started events',()=>{
 let q=loadReminderFixtures(at);q={...q,jobs:[...q.jobs,{...q.jobs[0],id:'DUPLICATE'}]};q=change(q,{command:'run',outcome:'success'});const key=target(q).deliveryKey;
 assert.equal(q.jobs.filter(j=>j.deliveryKey===key&&j.status==='sent').length,1);assert.equal(q.jobs.find(j=>j.id==='DUPLICATE').status,'cancelled');
 const initial=loadReminderFixtures(at);const started={...initial,events:initial.events.map((e,i)=>i===0?{...e,startsAt:at}:e)};q=change(started,{command:'run',outcome:'success'});assert.ok(q.jobs.filter(j=>j.eventId===initial.events[0].id).every(j=>j.status==='cancelled'));
});
test('status filtering does not distort counters and empty search/window handling is derived',()=>{
 const q=fail(loadReminderFixtures(at)),view=reminderView(q,{...filters,status:'failed'});assert.equal(view.jobs.length,1);assert.equal(view.counts.scheduled,13);assert.equal(view.counts.sent,42);
 const empty=reminderView(q,{...filters,query:'no such event'});assert.equal(empty.jobs.length,0);assert.deepEqual(empty.counts,{scheduled:0,sent:0,failed:0,cancelled:0});
 const all=reminderView(q,{...filters,window:'all'});assert.equal(all.jobs.length,56);assert.equal(new Set(q.jobs.map(j=>j.deliveryKey)).size,56);
});
