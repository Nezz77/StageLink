export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type ReminderChannel = 'sms' | 'email';
export type ReminderEvent = { id:string; title:string; startsAt:string; status:'active'|'cancelled'; bookingId?:string };
export type ReminderJob = { id:string; eventId:string; channel:ReminderChannel; recipient:string; deliveryKey:string; scheduledAt:string; updatedAt:string; status:ReminderStatus; attempts:number; retries:number; version:number; error:string; history:{at:string;detail:string}[] };
export type ReminderState = { loaded:boolean; health:'ready'|'stale'|'error'; clock:string; checkedAt:string; events:ReminderEvent[]; jobs:ReminderJob[] };
export type ReminderBooking = { id:string; event:string; date:string; start:string; status:string };
export type ReminderAction = { command:'load'|'failure_example'|'refresh'|'stale'|'error' } | { command:'run'; outcome:'success'|'failure' } | { command:'retry'|'cancel'|'cancel_event'; id:string; version:number };
export const REMINDER_ZONE='Asia/Colombo';
const hour=3600000,iso=(ms:number)=>new Date(ms).toISOString();
export const initialReminders=():ReminderState=>({loaded:false,health:'ready',clock:'',checkedAt:'',events:[],jobs:[]});
const update=(job:ReminderJob,at:string,patch:Partial<ReminderJob>,detail:string):ReminderJob=>({...job,...patch,version:job.version+1,updatedAt:at,history:[...job.history,{at,detail}].slice(-12)});
export function loadReminderFixtures(at:string):ReminderState {
 const clock=Date.parse(at),events:ReminderEvent[]=[],jobs:ReminderJob[]=[];
 for(let i=0;i<28;i++){
  const scheduled=i<7,sendAt=scheduled?clock+(i+1)*30*60000:clock-(i-6)*hour;
  const event:ReminderEvent={id:`DEMO-EVT-${i+1}`,title:['Sunset garden reception','Rooftop jazz evening','City lights celebration'][i%3]+` · ${i+1}`,startsAt:iso(sendAt+24*hour),status:'active'};events.push(event);
  for(const channel of ['sms','email'] as const){const n=jobs.length+1,id=`RM-${String(n).padStart(3,'0')}`;jobs.push({id,eventId:event.id,channel,recipient:channel==='sms'?'+94 ••• ••1204':'j••••@example.com',deliveryKey:`${event.id}:24h:${channel}:organizer`,scheduledAt:iso(sendAt),updatedAt:iso(sendAt),status:scheduled?'scheduled':'sent',attempts:scheduled?0:1,retries:0,version:1,error:'',history:[{at:iso(sendAt),detail:scheduled?'Scheduled in demo queue':'Simulated delivery recorded; no message sent'}]});}
 }
 return {loaded:true,health:'ready',clock:iso(clock),checkedAt:iso(clock),events,jobs};
}
export function syncReminderBookings(state:ReminderState,bookings:ReminderBooking[]):ReminderState {
 if(!state.loaded)return state;
 const clock=Date.parse(state.clock);let events=state.events,jobs=state.jobs,changed=false;
 const replaceEvent=(event:ReminderEvent)=>{events=events.some(e=>e.id===event.id)?events.map(e=>e.id===event.id?event:e):[...events,event];changed=true;};
 for(const record of bookings){
  const id=`booking:${record.id}`,event=events.find(e=>e.id===id),startsAt=`${record.date}T${record.start}:00+05:30`,time=Date.parse(startsAt),active=['accepted','active'].includes(record.status)&&time>clock;
  if(!active&&!event)continue;
  const next:ReminderEvent={id,title:record.event,startsAt:Number.isFinite(time)?iso(time):state.clock,status:active?'active':'cancelled',bookingId:record.id};
  if(!event||JSON.stringify(event)!==JSON.stringify(next))replaceEvent(next);
  if(!active)continue;
  for(const channel of ['sms','email'] as const){const key=`${id}:${next.startsAt}:24h:${channel}:member`;
   if(jobs.some(j=>j.deliveryKey===key))continue;
   jobs=[...jobs,{id:`${record.id}-${channel}-${time}`,eventId:id,channel,recipient:channel==='sms'?'+94 ••• ••5570':'m••••@example.com',deliveryKey:key,scheduledAt:iso(Math.max(clock+60000,time-24*hour)),updatedAt:state.clock,status:'scheduled',attempts:0,retries:0,version:1,error:'',history:[{at:state.clock,detail:'Scheduled for the accepted booking (demo)'}]}];changed=true;
  }
 }
 jobs=jobs.map(job=>{if(!['scheduled','failed'].includes(job.status))return job;const event=events.find(e=>e.id===job.eventId);const booking=event?.bookingId?bookings.find(b=>b.id===event.bookingId):undefined;const obsolete=event?.bookingId&&!job.deliveryKey.includes(event.startsAt);
  const reason=!event||event.status==='cancelled'||(event.bookingId&&!booking)?'Event cancelled or no longer active':Date.parse(event.startsAt)<=clock?'Event has already started':obsolete?'Booking time changed':'';
  if(!reason)return job;changed=true;return update(job,state.clock,{status:'cancelled',error:reason},reason+' · no further delivery');
 });
 return changed?{...state,events,jobs}:state;
}
export function reminderActionError(state:ReminderState,job:ReminderJob,command:'retry'|'cancel'|'cancel_event') {
 if(!state.loaded||state.health!=='ready')return 'Refresh the demo snapshot before changing jobs.';
 const event=state.events.find(e=>e.id===job.eventId);
 if(!event||event.status!=='active'||Date.parse(event.startsAt)<=Date.parse(state.clock))return 'This event is no longer eligible for reminders.';
 if(command==='cancel_event')return event.bookingId?'Change the linked booking from its booking desk.': ['scheduled','failed'].includes(job.status)?'':'Only events with active reminders can be cancelled here.';
 if(command==='retry'){
  if(job.status!=='failed')return 'Only a failed job can be retried.';
  if(job.attempts>=3)return 'The demo retry limit has been reached (3 attempts).';
  if(state.jobs.some(j=>j.deliveryKey===job.deliveryKey&&j.status==='sent'))return 'This reminder has already been sent.';
 }else if(!['scheduled','failed'].includes(job.status))return 'Only scheduled or failed jobs can be cancelled.';
 return '';
}
export function reduceReminders(state:ReminderState,action:ReminderAction,at:string):ReminderState {
 if(!Number.isFinite(Date.parse(at)))return state;
 if(action.command==='load')return state.loaded?state:loadReminderFixtures(at);
 if(!state.loaded)return state;
 if(['refresh','stale','error'].includes(action.command)){const health=action.command==='refresh'?'ready':action.command as 'stale'|'error';return {...state,health,checkedAt:health==='ready'?state.clock:state.checkedAt};}
 if(state.health!=='ready')return state;
 if(action.command==='failure_example'){
  if(state.jobs.some(j=>j.id==='RM-001'&&j.status==='failed'))return state;
  const job=state.jobs.find(j=>j.id==='RM-001'&&j.status==='scheduled');if(!job)return state;
  return {...state,jobs:state.jobs.map(j=>j.id===job.id?update(j,state.clock,{status:'failed',attempts:j.attempts+1,error:'SIM_GATEWAY_TIMEOUT · Demo SMS provider timed out. No real message was sent.'},'Simulated delivery attempt failed'):j)};
 }
 if(action.command==='run'){
  if(!['success','failure'].includes(action.outcome))return state;
  const clock=iso(Date.parse(state.clock)+hour),delivered=new Set(state.jobs.filter(j=>j.status==='sent').map(j=>j.deliveryKey));
  // Linked bookings are reconciled by the pipeline; do not remove their event snapshots here.
  const jobs=state.jobs.map(job=>{
   if(job.status!=='scheduled'||Date.parse(job.scheduledAt)>Date.parse(clock))return job;
   const event=state.events.find(e=>e.id===job.eventId);
   if(!event||event.status==='cancelled'||Date.parse(event.startsAt)<=Date.parse(clock))return update(job,clock,{status:'cancelled',error:'Event is no longer eligible'},'Skipped: cancelled or started event');
   if(delivered.has(job.deliveryKey))return update(job,clock,{status:'cancelled',error:'Duplicate delivery prevented'},'Skipped duplicate delivery');
   if(action.outcome==='success')delivered.add(job.deliveryKey);
   return update(job,clock,{status:action.outcome==='success'?'sent':'failed',attempts:job.attempts+1,error:action.outcome==='failure'?'SIM_GATEWAY_TIMEOUT · Demo provider timed out; no message sent.':''},action.outcome==='success'?'Simulated delivery completed; no real message sent':'Simulated provider timeout');
  });
  return {...state,clock,checkedAt:clock,jobs};
 }
 if('id'in action){const job=state.jobs.find(j=>j.id===action.id);if(!job||job.version!==action.version||reminderActionError(state,job,action.command))return state;
  if(action.command==='cancel_event')return {...state,events:state.events.map(e=>e.id===job.eventId?{...e,status:'cancelled'}:e),jobs:state.jobs.map(j=>j.eventId===job.eventId&&['scheduled','failed'].includes(j.status)?update(j,state.clock,{status:'cancelled',error:'Demo event cancelled'},'Event cancelled in demo; delivery suppressed'):j)};
  return {...state,jobs:state.jobs.map(j=>j.id!==job.id?j:action.command==='retry'?update(j,state.clock,{status:'scheduled',scheduledAt:iso(Date.parse(state.clock)+60000),retries:j.retries+1,error:''},'Retry confirmed; next demo run will attempt delivery'):update(j,state.clock,{status:'cancelled',error:'Cancelled by admin in demo'},'Admin cancelled this reminder'))};
 }
 return state;
}
export type ReminderFilters={status:'all'|ReminderStatus;channel:'all'|ReminderChannel;window:'activity'|'all';query:string};
export function reminderView(state:ReminderState,filters:ReminderFilters){
 const clock=Date.parse(state.clock),query=filters.query.trim().toLowerCase();
 const scope=state.jobs.filter(job=>{const event=state.events.find(e=>e.id===job.eventId);const time=Date.parse(job.status==='scheduled'?job.scheduledAt:job.updatedAt);return (filters.channel==='all'||job.channel===filters.channel)&&(filters.window==='all'||(job.status==='scheduled'?time>clock&&time<=clock+24*hour:time>=clock-24*hour&&time<=clock))&&(!query||`${job.id} ${event?.title} ${event?.bookingId??''} ${job.recipient}`.toLowerCase().includes(query));});
 const counts={scheduled:0,sent:0,failed:0,cancelled:0};for(const job of scope)counts[job.status]++;
 return {counts,jobs:scope.filter(job=>filters.status==='all'||job.status===filters.status).sort((a,b)=>({scheduled:0,failed:1,sent:2,cancelled:3}[a.status]-{scheduled:0,failed:1,sent:2,cancelled:3}[b.status])||a.scheduledAt.localeCompare(b.scheduledAt))};
}
export function reminderTime(value:string,zone:string=REMINDER_ZONE){return new Intl.DateTimeFormat('en-GB',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
