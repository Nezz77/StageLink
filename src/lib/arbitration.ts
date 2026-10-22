import { settlement, type BookingState } from './booking.ts';
import type { BookingOptions, RecordBooking } from './pipeline.ts';
export type ArbitrationMode = 'refund' | 'provider' | 'split';
export type Arbitration = {
  caseId: string; version: number; status: 'processing' | 'failed' | 'settled' | 'cancelled'; mode: ArbitrationMode;
  heldCents: number; refundCents: number; providerGrossCents: number; feeCents: number; payoutCents: number;
  reason: string; at: string; fingerprint: string; previousHold: boolean; destination?: string;
  attempts: { at: string; status: 'processing' | 'failed' | 'settled' | 'cancelled' }[];
};
export type ArbitrationCommand =
  | { kind: 'prepare'; caseId: string; mode: ArbitrationMode; refundCents: number; reason: string; reviewed: boolean; fingerprint: string }
  | { kind: 'finish'; outcome: 'success' | 'failure' }
  | { kind: 'retry' | 'cancel' };
export const arbitrationLocked = (r: RecordBooking) => ['processing','failed'].includes(r.arbitration?.status ?? '');
export function arbitrationFingerprint(r: RecordBooking) { return JSON.stringify([r.ledger.quoteVersion,r.ledger.quoteCents,r.ledger.installments,r.ledger.overtime,r.ledger.adjudicatedAt ?? null,r.refund ?? null]); }
export function arbitrationAmounts(ledger: BookingState, refundCents: number) {
  const t=settlement(ledger),providerGrossCents=t.heldCents-refundCents,feeCents=Math.min(t.feeDueCents,Math.max(0,providerGrossCents));
  return {heldCents:t.heldCents,refundCents,providerGrossCents,feeCents,payoutCents:providerGrossCents-feeCents};
}
export function applyArbitration(r: RecordBooking, command: ArbitrationCommand, version: number, actor: string, at: string, options: BookingOptions): {patch: Partial<RecordBooking>; label: string} | null {
  const previous=r.arbitration;if(actor!=='admin'||(previous?.version??0)!==version)return null;
  const caseId=command.kind==='prepare'?command.caseId:previous?.caseId;
  const item=options.disputes?.find(c=>c.id===caseId&&c.bookingId===r.id&&c.kind==='disputes');
  if(!item||['resolved','approved','rejected'].includes(item.status))return null;
  const destination=options.payoutDestinations?.[r.service?.role??(r.serviceId==='aria'?'artist':'renter')];
  const validDestination=(a:Arbitration)=>a.payoutCents===0||!!destination&&destination.id===a.destination;
  if(command.kind==='prepare') {
    if(previous&&previous.status!=='cancelled'||r.ledger.adjudicatedAt||command.fingerprint!==arbitrationFingerprint(r)||r.refund?.status==='refunded'||!['refund','provider','split'].includes(command.mode)||!command.reviewed||typeof command.reason!=='string'||command.reason.trim().length<10||command.reason.length>2000||!Number.isSafeInteger(command.refundCents))return null;
    const totals=arbitrationAmounts(r.ledger,command.refundCents);
    if(!Number.isSafeInteger(totals.heldCents)||totals.heldCents<=0||command.refundCents<0||command.refundCents>totals.heldCents||(command.mode==='refund'&&command.refundCents!==totals.heldCents)||(command.mode==='provider'&&command.refundCents!==0))return null;
    const next:Arbitration={...totals,caseId:item.id,mode:command.mode,version:version+1,status:'processing',reason:command.reason.trim(),at,fingerprint:command.fingerprint,previousHold:r.ledger.payoutBlocked,destination:destination?.id,attempts:[...(previous?.attempts??[]),{at,status:'processing'}]};
    if(!validDestination(next))return null;
    return {patch:{arbitration:next,ledger:{...r.ledger,payoutBlocked:true}},label:`${item.id} · Arbitration confirmed; demo transfer processing · no funds allocated yet`};
  }
  if(!previous||!arbitrationLocked(r))return null;
  const next={...previous,version:version+1};
  const record=(status:Arbitration['status'],label:string,patch:Partial<RecordBooking>={})=>({patch:{...patch,arbitration:{...next,status,attempts:[...next.attempts,{at,status}]}},label});
  if(command.kind==='cancel')return record('cancelled',`${item.id} · Pending arbitration cancelled; funds remain held`,{ledger:{...r.ledger,payoutBlocked:previous.previousHold}});
  if(previous.fingerprint!==arbitrationFingerprint(r)||!validDestination(previous))return null;
  if(command.kind==='retry')return previous.status==='failed'?record('processing',`${item.id} · Demo settlement retry; funds still held`):null;
  if(command.kind!=='finish'||previous.status!=='processing'||!['success','failure'].includes(command.outcome))return null;
  if(command.outcome==='failure')return record('failed',`${item.id} · Demo transfer failed; no ledger allocation, case remains open`);
  let refund=previous.refundCents,fee=previous.feeCents,payout=previous.payoutCents;
  const installments=r.ledger.installments.map(payment=>{
    if(payment.releasedAt||payment.refundedAt||payment.allocation)return payment;
    let room=payment.grossCents;const refundCents=Math.min(room,refund);refund-=refundCents;room-=refundCents;
    const feeCents=Math.min(room,fee);fee-=feeCents;room-=feeCents;
    const payoutCents=Math.min(room,payout);payout-=payoutCents;room-=payoutCents;
    if(room!==0)throw Error('Invalid arbitration allocation');
    return {...payment,allocation:{caseId:item.id,at,refundCents,feeCents,payoutCents}};
  });
  if(refund||fee||payout)return null;
  return record('settled',`${item.id} · Arbitration settled (demo); refund ${previous.refundCents/100}, provider ${previous.payoutCents/100}, fee ${previous.feeCents/100} USD`,{ledger:{...r.ledger,installments,payoutBlocked:false,adjudicatedAt:at,payment:previous.providerGrossCents===0?'refunded':'released',history:[...r.ledger.history,{at,label:`${item.id} · Demo arbitration allocated remaining held funds; no real money moved`}]},...(r.refund?.status==='requested'?{refund:{...r.refund,status:'declined' as const,decidedAt:at,decisionReason:'Superseded by the linked arbitration allocation.'}}:{}),...(previous.providerGrossCents===0&&!((r.service?.role??(r.serviceId==='aria'?'artist':'renter'))==='renter'&&(['active','completed'].includes(r.status)||!!r.inspection?.dispatchAckAt))?{status:'cancelled' as const}:{})});
}
