import type { BookingRole } from './booking.ts';
import type { DashboardAction, DashboardState, MemberRole, CaseKind } from './dashboard.ts';
import { defaultAvailability, type Availability } from './catalog.ts';
export type ProviderRole = 'artist' | 'renter';
export type BankAccount = { holder: string; bank: string; branch: string; number: string; status: 'pending' | 'verified' | 'rejected'; reason: string };
export type Evidence = { id: string; owner: MemberRole; name: string; url: string; type: string; size: number };
export type Inquiry = { id: string; listingId: string; title: string; provider: ProviderRole; providerName: string; customerName: string; messages: { text: string; sender: MemberRole; at: string }[]; read: Partial<Record<MemberRole,string>> };
export type CommunityState = { savedListings: string[]; inquiries: Inquiry[]; payoutAccounts: Record<ProviderRole,BankAccount>; availability: Record<ProviderRole,Availability>; evidence: Evidence[]; verifiedEmails: Partial<Record<MemberRole,string>> };
export type CommunityAction =
 | { type: 'save_listing'; id: string }
 | { type: 'inquiry'; listingId: string }
 | { type: 'inquiry_send'; id: string; text: string }
 | { type: 'inquiry_read'; id: string }
 | { type: 'bank_account'; account: Pick<BankAccount,'holder'|'bank'|'branch'|'number'> }
 | { type: 'review_bank'; provider: ProviderRole; approved: boolean; reason: string }
 | { type: 'availability'; schedule: Availability }
 | { type: 'evidence'; file: Evidence }
 | { type: 'submit_case'; kind: CaseKind; subject: string; body: string; bookingId?: string; evidenceIds: string[] }
 | { type: 'member_reply'; id: string; text: string }
 | { type: 'verify_email'; email: string; code: string };
export function initialCommunity(): CommunityState {
 const account = (holder:string,number:string):BankAccount => ({holder,bank:'StageLink Demo Bank',branch:'Demo branch',number,status:'verified',reason:'Seeded demo destination. No real account connected.'});
 return {savedListings:[],inquiries:[],payoutAccounts:{artist:account('Aria Nova','0000000001'),renter:account('AudioVault Rentals','0000000002')},availability:{artist:defaultAvailability(),renter:defaultAvailability()},evidence:[],verifiedEmails:{}};
}
const member=(actor:BookingRole):actor is MemberRole=>['customer','artist','renter'].includes(actor);
const provider=(actor:BookingRole):actor is ProviderRole=>actor==='artist'||actor==='renter';
const text=(value:unknown,min=1,max=2000):value is string=>typeof value==='string'&&value.trim().length>=min&&value.length<=max;
export function bankErrors(account:Pick<BankAccount,'holder'|'bank'|'branch'|'number'>) {
 const errors:Partial<Record<keyof BankAccount,string>>={};
 if(!text(account.holder,2,100))errors.holder='Enter the account holder’s name.';
 if(!text(account.bank,2,100))errors.bank='Enter the bank name.';
 if(!text(account.branch,2,100))errors.branch='Enter the branch or routing reference.';
 if(!/^\d{6,18}$/.test(account.number))errors.number='Use 6–18 digits for this demo account.';
 return errors;
}
export const maskAccount=(account:BankAccount)=>`${account.bank} · •••• ${account.number.slice(-4)}`;
export function scheduleError(schedule:Availability) {
 const time=(v:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 if(!schedule.days.length||schedule.days.some(day=>!Number.isInteger(day)||day<0||day>6))return 'Choose at least one available weekday.';
 if(!time(schedule.start)||!time(schedule.end)||schedule.start>=schedule.end)return 'Available hours must finish after they start.';
 if(schedule.blocks.length>10||schedule.blocks.some(block=>(!/^\d{4}-\d{2}-\d{2}$/.test(block.date)||Number.isNaN(Date.parse(block.date))||new Date(block.date).toISOString().slice(0,10)!==block.date)||!time(block.start)||!time(block.end)||block.start>=block.end||!text(block.reason,1,160)))return 'Each blocked period needs a date, valid times and a short reason.';
 return '';
}
export const inquiryUnread=(item:Inquiry,actor:MemberRole)=>item.messages.filter(message=>message.sender!==actor&&Date.parse(message.at)>Date.parse(item.read[actor]??'1970-01-01')).length;
export function reduceCommunity(state:DashboardState,action:DashboardAction,actor:BookingRole,at:string):DashboardState|undefined {
 const clear=(key:string)=>{const drafts={...state.drafts};delete drafts[`${actor}:${key}`];return drafts;};
 switch(action.type){
 case 'save_listing':
  if(actor!=='customer'||!state.listings.some(item=>item.id===action.id))return state;
  return {...state,savedListings:state.savedListings.includes(action.id)?state.savedListings.filter(id=>id!==action.id):[...state.savedListings,action.id]};
 case 'inquiry':{
  const listing=state.listings.find(item=>item.id===action.listingId&&item.status==='live');
  if(actor!=='customer'||!listing||state.inquiries.some(item=>item.listingId===listing.id))return state;
  return {...state,inquiries:[{id:`INQ-${listing.id}`,listingId:listing.id,title:listing.title,provider:listing.owner,providerName:state.profiles[listing.owner].name,customerName:state.profiles.customer.name,messages:[],read:{}},...state.inquiries]};
 }
 case 'inquiry_send': case 'inquiry_read':{
  const item=state.inquiries.find(item=>item.id===action.id);
  if(!item||!member(actor)||(actor!=='customer'&&actor!==item.provider))return state;
  if(action.type==='inquiry_send'&&!text(action.text,1,4000))return state;
  return {...state,inquiries:state.inquiries.map(row=>row.id!==item.id?row:action.type==='inquiry_read'?{...row,read:{...row.read,[actor]:at}}:{...row,messages:[...row.messages,{text:action.text.trim(),sender:actor,at}],read:{...row.read,[actor]:at}})};
 }
 case 'bank_account':
  if(!provider(actor)||Object.keys(bankErrors(action.account)).length)return state;
  return {...state,payoutAccounts:{...state.payoutAccounts,[actor]:{...action.account,status:'pending',reason:'Awaiting admin review before transfers can resume.'}},drafts:clear('bank')};
 case 'review_bank':
  if(actor!=='admin'||!provider(action.provider)||typeof action.approved!=='boolean'||state.payoutAccounts[action.provider].status!=='pending'||!text(action.reason,10))return state;
  return {...state,payoutAccounts:{...state.payoutAccounts,[action.provider]:{...state.payoutAccounts[action.provider],status:action.approved?'verified':'rejected',reason:action.reason.trim()}},audit:[{label:`${action.provider} payout account ${action.approved?'verified':'rejected'} (demo)`,at},...state.audit]};
 case 'availability':
  if(!provider(actor)||scheduleError(action.schedule))return state;
  return {...state,availability:{...state.availability,[actor]:{...action.schedule,days:[...action.schedule.days],blocks:action.schedule.blocks.map(block=>({...block}))}},drafts:clear('availability')};
 case 'evidence':
  if(!member(actor)||action.file.owner!==actor||!action.file.url.startsWith('blob:')||!text(action.file.name,1,200)||!['image/png','image/jpeg','application/pdf'].includes(action.file.type)||action.file.size<1||action.file.size>5*1024*1024||state.evidence.filter(file=>file.owner===actor).length>=20||state.evidence.some(file=>file.id===action.file.id))return state;
  return {...state,evidence:[...state.evidence,{...action.file}]};
 case 'submit_case':{
  if(!member(actor)||!['verification','support','disputes'].includes(action.kind)||!text(action.subject,3,140)||!text(action.body,20,2000)||action.evidenceIds.length>5||new Set(action.evidenceIds).size!==action.evidenceIds.length||action.evidenceIds.some(id=>!state.evidence.some(file=>file.id===id&&file.owner===actor)))return state;
  if(action.kind==='verification'&&(!provider(actor)||action.evidenceIds.length<2||state.cases.some(item=>item.owner===actor&&item.kind==='verification'&&item.status!=='rejected')))return state;
  if(action.kind==='disputes'&&!text(action.bookingId,1,100))return state;
  const id=`${action.kind==='verification'?'VRF':action.kind==='support'?'SUP':'DSP'}-${at.replace(/\D/g,'')}-${state.cases.length}`;
  return {...state,cases:[{id,kind:action.kind,owner:actor,name:state.profiles[actor].name,subject:action.subject.trim(),body:action.body.trim(),submitted:at,priority:'normal',status:'pending',bookingId:action.bookingId||undefined,evidenceIds:[...action.evidenceIds],documents:action.evidenceIds.map(id=>state.evidence.find(file=>file.id===id)!.name),notes:[]},...state.cases],drafts:clear(`intake:${action.kind}`)};
 }
 case 'member_reply':{
  const item=state.cases.find(item=>item.id===action.id&&item.owner===actor);
  if(!member(actor)||!item||['approved','rejected','resolved'].includes(item.status)||!text(action.text,10))return state;
  return {...state,cases:state.cases.map(row=>row.id===item.id?{...row,notes:[...row.notes,{text:action.text.trim(),at,kind:'reply',author:actor}]}:row),drafts:clear(`reply:${item.id}`)};
 }
 case 'verify_email':
  if(!member(actor)||action.email!==state.profiles[actor].email||action.code!=='246810')return state;
  return {...state,verifiedEmails:{...state.verifiedEmails,[actor]:action.email}};
 default:return undefined;
 }
}
