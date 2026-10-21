import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDashboard, reduceDashboard } from '../src/lib/dashboard.ts';
import { catalogFor, defaultAvailability, serviceIdFor } from '../src/lib/catalog.ts';
import { initialPipeline, reducePipeline, validateForm, quoteFor, bookingService, conflicts, availabilityError } from '../src/lib/pipeline.ts';
import { bankErrors, inquiryUnread, scheduleError } from '../src/lib/community.ts';
const at='2026-10-15T09:00:00Z';
const manage=(s,a,role='artist',when=at)=>reduceDashboard(s,a,role,when);
const options=state=>({catalog:catalogFor(state),availability:state.availability,organizer:state.profiles.customer.name});
const form=(patch={})=>({id:'BK-NEW',serviceId:'GIG-CUSTOM',event:'Moonlit sessions',date:'2026-12-05',start:'18:00',end:'21:00',venue:'Grand Hall',guests:'80',quantity:'1',requirements:'',...patch});
const booking=(s,a,role='customer',dashboard=initialDashboard())=>reducePipeline(s,a,role,at,false,options(dashboard));
function catalogState(){let state=initialDashboard();return manage(state,{type:'listing',listing:{...state.listings[0],id:'GIG-CUSTOM',title:'Moonlit set',price:'425',unit:'hour',status:'live'}});}

test('published provider data feeds booking selection and fixes its agreed service and price',()=>{
 let dashboard=catalogState();const input=form();const pipeline=initialPipeline();
 assert.deepEqual(validateForm(input,pipeline.bookings,new Date(at),options(dashboard)),{});
 assert.equal(quoteFor(input,catalogFor(dashboard)),127500);
 let next=booking(pipeline,{type:'submit',form:input},'customer',dashboard);const record=next.bookings.find(r=>r.id===input.id);
 assert.equal(record.ledger.quoteCents,127500);assert.equal(record.service.name,'Aria Nova · Moonlit set');
 dashboard=manage(dashboard,{type:'listing',listing:{...dashboard.listings[0],price:'900',title:'Changed title'}});
 assert.equal(bookingService(record).rate,42500);assert.equal(record.ledger.quoteCents,127500);
 dashboard=manage(dashboard,{type:'remove_listing',id:'GIG-CUSTOM'});
 assert.match(availabilityError(form(),options(dashboard)),/unavailable/);
 assert.equal(booking(next,{type:'respond',id:record.id,accept:true},'artist',dashboard),next);
 assert.equal(record.service.name,'Aria Nova · Moonlit set');
});
test('paused listings cannot create requests and artist conflicts cover different gigs',()=>{
 let dashboard=catalogState();const pipeline=booking(initialPipeline(),{type:'submit',form:form()},'customer',dashboard);
 const overlap=form({id:'BK-SECOND',serviceId:'aria',start:'20:00',end:'22:00'});
 assert.equal(conflicts(overlap,pipeline.bookings,catalogFor(dashboard),new Date(at)).length,1);
 assert.equal(booking(pipeline,{type:'submit',form:overlap},'customer',dashboard),pipeline);
 dashboard=manage(dashboard,{type:'listing_status',id:'GIG-CUSTOM',status:'paused'});
 assert.equal(booking(initialPipeline(),{type:'submit',form:form()},'customer',dashboard).bookings.length,initialPipeline().bookings.length);
});
test('rental capacity sums units across the entire day and acceptance checks reduced stock',()=>{
 let dashboard=initialDashboard();const equipment=dashboard.listings.find(item=>item.id==='EQ-001');
 dashboard=manage(dashboard,{type:'listing',listing:{...equipment,quantity:'3',status:'live'}},'renter');
 const first=form({serviceId:'pa',quantity:'2'});let pipeline=booking(initialPipeline(),{type:'submit',form:first},'customer',dashboard);
 assert.equal(pipeline.bookings[0].ledger.quoteCents,Number(equipment.price)*100*2);
 const second=form({id:'BK-SECOND',serviceId:'pa',quantity:'2',start:'08:00',end:'09:00'});
 assert.equal(conflicts(second,pipeline.bookings,catalogFor(dashboard),new Date(at)).length,1);
 assert.equal(conflicts({...second,quantity:'1'},pipeline.bookings,catalogFor(dashboard),new Date(at)).length,0);
 dashboard=manage(dashboard,{type:'listing',listing:{...equipment,quantity:'1'}},'renter');
 assert.equal(booking(pipeline,{type:'respond',id:first.id,accept:true},'renter',dashboard),pipeline);
});
test('available weekdays, hours and blocked dates apply at request and acceptance',()=>{
 let dashboard=catalogState();const request=form();let pipeline=booking(initialPipeline(),{type:'submit',form:request},'customer',dashboard);
 const schedule={...defaultAvailability(),blocks:[{id:'holiday',date:request.date,start:'17:00',end:'22:00',reason:'Private rehearsal'}]};
 assert.equal(manage(dashboard,{type:'availability',schedule},'customer'),dashboard);
 dashboard=manage(dashboard,{type:'availability',schedule});
 assert.match(availabilityError(request,options(dashboard)),/blocked/);
 assert.equal(booking(pipeline,{type:'respond',id:request.id,accept:true},'artist',dashboard),pipeline);
 assert.ok(scheduleError({...schedule,blocks:[{...schedule.blocks[0],date:'2026-02-30'}]}));
 assert.ok(scheduleError({...schedule,days:[]}));assert.ok(scheduleError({...schedule,start:'22:00',end:'09:00'}));
 assert.match(availabilityError({...request,date:'2026-12-06'}, {...options(dashboard),availability:{artist:{...defaultAvailability(),days:[1]}}}),/available hours/);
});
test('bank changes require provider validation and a separate admin decision',()=>{
 let state=initialDashboard();const account={holder:'Aria Demo',bank:'Sample Bank',branch:'Colombo',number:'1234567890'};
 for(const actor of ['customer','admin','visitor'])assert.equal(manage(state,{type:'bank_account',account},actor),state);
 assert.ok(bankErrors({...account,number:'abc'}).number);
 state=manage(state,{type:'bank_account',account});assert.equal(state.payoutAccounts.artist.status,'pending');
 const action={type:'review_bank',provider:'artist',approved:true,reason:'Demo destination matches the submitted profile.'};
 assert.equal(manage(state,action),state);state=manage(state,action,'admin');assert.equal(state.payoutAccounts.artist.status,'verified');
 assert.equal(manage(state,action,'admin'),state);
 state=manage(state,{type:'bank_account',account:{...account,number:'9876543210'}});assert.equal(state.payoutAccounts.artist.status,'pending');
 state=manage(state,{...action,approved:false},'admin');assert.equal(state.payoutAccounts.artist.status,'rejected');
});
test('enquiries are unique, private to the matching roles, and have per-role unread counts',()=>{
 let state=catalogState();state=manage(state,{type:'inquiry',listingId:'GIG-CUSTOM'},'customer');const item=state.inquiries[0];
 assert.equal(manage(state,{type:'inquiry',listingId:'GIG-CUSTOM'},'customer'),state);
 assert.equal(manage(state,{type:'inquiry_send',id:item.id,text:'Hello performer'},'renter'),state);
 state=manage(state,{type:'inquiry_send',id:item.id,text:'Hello performer'},'customer');assert.equal(inquiryUnread(state.inquiries[0],'artist'),1);assert.equal(inquiryUnread(state.inquiries[0],'customer'),0);
 state=manage(state,{type:'inquiry_read',id:item.id},'artist','2026-10-15T09:01:00Z');assert.equal(inquiryUnread(state.inquiries[0],'artist'),0);
 state=manage(state,{type:'inquiry_send',id:item.id,text:'Happy to discuss the event'},'artist','2026-10-15T09:02:00Z');assert.equal(inquiryUnread(state.inquiries[0],'customer'),1);
});
test('verification requires distinct owned evidence, preserves rejected submissions and allows resubmission',()=>{
 let state=initialDashboard();const file=id=>({id,owner:'artist',name:`${id}.png`,url:`blob:${id}`,type:'image/png',size:100});
 for(const id of ['one','two'])state=manage(state,{type:'evidence',file:file(id)});
 const action={type:'submit_case',kind:'verification',subject:'Artist verification',body:'Please review my sample identity and performance documents.',evidenceIds:['one','two']};
 for(const ids of [[],['one'],['one','one'],['one','missing']])assert.equal(manage(state,{...action,evidenceIds:ids}),state);
 assert.equal(manage(state,action,'renter'),state);
 state=manage(state,action);const submitted=state.cases[0];assert.equal(submitted.owner,'artist');
 assert.equal(manage(state,action),state);
 state=manage(state,{type:'decide_case',id:submitted.id,status:'rejected',reason:'The second sample document is unreadable.',documentsReviewed:true},'admin');
 state=manage(state,action);assert.equal(state.cases.filter(c=>c.owner==='artist').length,2);assert.equal(state.cases[1].status,'rejected');
});
test('support replies remain scoped to the submitting member and terminal cases reject new replies',()=>{
 let state=initialDashboard();const action={type:'submit_case',kind:'support',subject:'Stage setup support',body:'Please help me coordinate the stage setup for the booking.',evidenceIds:[]};
 state=manage(state,action,'customer');const id=state.cases[0].id;
 assert.equal(manage(state,{type:'member_reply',id,text:'Can you check this for me?'},'artist'),state);
 state=manage(state,{type:'member_reply',id,text:'Can you check this for me?'},'customer');assert.equal(state.cases[0].notes[0].author,'customer');
 state=manage(state,{type:'case_note',id,text:'This note is for admin coordination only.',kind:'internal'},'admin');
 assert.equal(state.cases[0].notes.filter(n=>n.kind!=='internal').length,1);
 state=manage(state,{type:'decide_case',id,status:'resolved',reason:'The setup plan has been agreed with the provider.'},'admin');
 assert.equal(manage(state,{type:'member_reply',id,text:'Can you check this for me?'},'customer'),state);
 assert.equal(manage(state,{...action,kind:'disputes'},'customer'),state);
});
test('completed bookings permit exactly one customer review; invalid ratings and other roles fail',()=>{
 let state=initialPipeline();const complete=state.bookings.find(r=>r.status==='completed'),pending=state.bookings.find(r=>r.status==='pending');
 const action={type:'review',id:complete.id,rating:5,text:'Wonderful performance and excellent communication.'};
 for(const actor of ['artist','renter','admin','visitor'])assert.equal(booking(state,action,actor),state);
 assert.equal(booking(state,{...action,id:pending.id}),state);
 for(const rating of [0,6,2.5,NaN])assert.equal(booking(state,{...action,rating}),state);
 state=booking(state,action);assert.equal(state.bookings.find(r=>r.id===complete.id).review.rating,5);
 assert.equal(booking(state,action),state);
});
test('email verification binds to the current email and a fresh session clears all community data',()=>{
 let state=initialDashboard();const email=state.profiles.artist.email;
 assert.equal(manage(state,{type:'verify_email',email,code:'123456'}),state);
 state=manage(state,{type:'verify_email',email,code:'246810'});assert.equal(state.verifiedEmails.artist,email);
 state=manage(state,{type:'profile',profile:{...state.profiles.artist,email:'changed@example.com'}});assert.notEqual(state.verifiedEmails.artist,state.profiles.artist.email);
 assert.equal(manage(state,{type:'verify_email',email,code:'246810'}),state);
 const fresh=initialDashboard();assert.deepEqual(fresh.inquiries,[]);assert.deepEqual(fresh.evidence,[]);assert.deepEqual(fresh.verifiedEmails,{});assert.deepEqual(fresh.savedListings,[]);assert.deepEqual(fresh.availability.artist,defaultAvailability());
});
