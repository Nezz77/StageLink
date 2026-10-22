import type { RecordBooking } from './pipeline.ts';
import type { Service } from './catalog.ts';
export type InspectionPhase = 'dispatch' | 'return' | 'clearance';
export type InspectionPhoto = { id: string; name: string; size: number; type: string; source: 'sample' | 'upload' };
export type UnitObservation = { serial: string; verified: boolean; condition: 'good' | 'worn' | 'damaged' | 'missing'; notes: string };
export type InspectionInput = { units: UnitObservation[]; accessories: boolean[]; photos: InspectionPhoto[]; notes: string; signer: string; acknowledged: boolean };
export type InspectionReport = InspectionInput & { at: string; by: 'renter' };
export type RentalInspection = { version: number; openedAt: string; serials: string[]; accessories: string[]; revisions?: {phase: 'dispatch' | 'return'; report: InspectionReport; reason: string; at: string}[]; stage: 'dispatch-draft' | 'dispatch-ack' | 'out' | 'return-draft' | 'return-ack' | 'review' | 'resolved' | 'clearance-draft'; draft?: InspectionInput; dispatch?: InspectionReport; returned?: InspectionReport; clearance?: InspectionReport; dispatchAckAt?: string; returnAckAt?: string; proposal?: { cents: number; reason: string; at: string; response: 'pending' | 'accepted' | 'disputed'; responseReason?: string; responseAt?: string }; resolution?: { deductionCents: number; refundCents: number; reason: string; at: string; by: 'admin' } };
export type InspectionCommand =
  | { kind: 'open' }
  | { kind: 'save' | 'submit'; phase: InspectionPhase; input: InspectionInput }
  | { kind: 'acknowledge'; phase: 'dispatch' | 'return'; agrees: boolean }
  | { kind: 'correct'; phase: 'dispatch' | 'return'; reason: string }
  | { kind: 'start-return' | 'start-clearance' }
  | { kind: 'propose'; cents: number; reason: string }
  | { kind: 'respond'; accept: boolean; reason: string }
  | { kind: 'resolve'; approve: boolean; reason: string };
export const sampleInspectionPhoto = (phase: InspectionPhase): InspectionPhoto => ({ id: `inspection-sample-${phase}`, name: `Illustrative ${phase} sample — not real evidence`, size: 0, type: 'image/svg+xml', source: 'sample' });
export function blankInspection(i: Pick<RentalInspection, 'serials' | 'accessories'>): InspectionInput { return { units: i.serials.map(() => ({ serial: '', verified: false, condition: 'good', notes: '' })), accessories: i.accessories.map(() => false), photos: [], notes: '', signer: '', acknowledged: false }; }
export function hasDiscrepancy(input: InspectionInput) { return input.units.some(u => ['damaged','missing'].includes(u.condition)) || input.accessories.some(v => !v); }
export function safeInspectionInput(input: InspectionInput, i: RentalInspection): boolean {
  return !!input && Array.isArray(input.units) && input.units.length === i.serials.length && input.units.every(u => u && typeof u.serial === 'string' && u.serial.length <= 100 && typeof u.verified === 'boolean' && ['good','worn','damaged','missing'].includes(u.condition) && typeof u.notes === 'string' && u.notes.length <= 1000) && Array.isArray(input.accessories) && input.accessories.length === i.accessories.length && input.accessories.every(v => typeof v === 'boolean') && Array.isArray(input.photos) && input.photos.length <= 4 && new Set(input.photos.map(p => p.id)).size === input.photos.length && input.photos.every(p => p && typeof p.id === 'string' && p.id.length <= 160 && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 240 && Number.isSafeInteger(p.size) && (p.source === 'sample' ? p.size === 0 && /^inspection-sample-(dispatch|return|clearance)$/.test(p.id) && p.type === 'image/svg+xml' : p.source === 'upload' && p.size > 0 && p.size <= 8 * 1024 * 1024 && ['image/jpeg','image/png','image/webp'].includes(p.type))) && typeof input.notes === 'string' && input.notes.length <= 2000 && typeof input.signer === 'string' && input.signer.length <= 100 && typeof input.acknowledged === 'boolean';
}
export function inspectionErrors(input: InspectionInput, i: RentalInspection, phase: InspectionPhase): string[] {
  if (!safeInspectionInput(input, i)) return ['The inspection data could not be read. Reopen the saved draft.'];
  const errors: string[] = [];
  input.units.forEach((u, index) => { const missing = phase === 'return' && u.condition === 'missing'; if ((!missing || u.serial) && u.serial.trim().toUpperCase() !== i.serials[index]) errors.push(`Unit ${index+1}: serial must match ${i.serials[index]}.`); if (missing && u.verified) errors.push(`Unit ${index+1}: a missing unit cannot be marked physically verified.`); if (!missing && !u.verified) errors.push(`Unit ${index+1}: verify the physical serial label.`); if (phase !== 'return' && ['damaged','missing'].includes(u.condition)) errors.push(`Unit ${index+1}: resolve damage or missing equipment before handover.`); if (['damaged','missing'].includes(u.condition) && u.notes.trim().length < 10) errors.push(`Unit ${index+1}: describe the damage or missing unit in at least 10 characters.`); });
  if (phase !== 'return' && input.accessories.some(v => !v)) errors.push('Check every required package inclusion before handover.');
  if (phase === 'return' && input.accessories.some(v => !v) && input.notes.trim().length < 10) errors.push('Describe the missing accessories in at least 10 characters.');
  if (!input.photos.length) errors.push('Add at least one condition photo or an explicitly labelled sample.');
  if (input.signer.trim().length < 2) errors.push('Enter the provider’s sign-off name.');
  if (!input.acknowledged) errors.push('Confirm that the condition and discrepancies have been recorded.');
  return errors;
}
export const copyInspection = (input: InspectionInput): InspectionInput => ({ ...input, units: input.units.map(u => ({ ...u, serial: u.serial.trim().toUpperCase(), notes: u.notes.trim() })), accessories: [...input.accessories], photos: input.photos.map(p => ({ ...p })), signer: input.signer.trim(), notes: input.notes.trim() });
export function inspectionManifest(record: RecordBooking, bookings: RecordBooking[], service: Service): Pick<RentalInspection,'serials'|'accessories'> | null {
  const quantity=Number(record.quantity ?? 1);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>service.capacity)return null;
  const pool=Array.from({length:service.capacity},(_,n)=>`${service.id.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,24)}-${String(n+1).padStart(3,'0')}`),used=new Set<string>();
  for(const other of bookings.filter(r=>r.id!==record.id&&r.serviceId===record.serviceId&&!r.stockReturnedAt&&!['cancelled','rejected'].includes(r.status))){if(other.inspection && (other.date===record.date || !!other.inspection.dispatchAckAt))for(const serial of other.inspection.serials)used.add(serial);}
  for(const other of bookings.filter(r=>r.id!==record.id&&r.serviceId===record.serviceId&&!r.stockReturnedAt&&r.status==='active'&&!r.inspection)){let remaining=Number(other.quantity ?? 1);for(const serial of pool)if(!used.has(serial)&&remaining>0){used.add(serial);remaining--;}}
  const serials=pool.filter(s=>!used.has(s)).slice(0,quantity);if(serials.length!==quantity)return null;
  return {serials,accessories:service.packageInclusions?.length ? [...service.packageInclusions] : ['Power cable','Signal cable','Protective case']};
}
/** Pure, version-checked client-side workflow. Resolution records a decision, never moves money. */
export function applyInspection(record: RecordBooking, command: InspectionCommand, expectedVersion: number, actor: string, at: string, bookings: RecordBooking[], service: Service): { patch: Partial<RecordBooking>; label: string } | null {
  const current=record.inspection;if((current?.version ?? 0)!==expectedVersion || service.role!=='renter'||['pending','cancelled','rejected'].includes(record.status))return null;
  if(command.kind==='open') {if(actor!=='renter'||!service.available||current||record.ledger.quoteStatus!=='accepted'||record.status==='completed'||record.refund?.status==='requested'||record.ledger.payoutBlocked||(record.ledger.advancePolicy==='escrow-50'&&record.ledger.advance!=='paid'))return null;const manifest=inspectionManifest(record,bookings,service);if(!manifest)return null;const next:RentalInspection={...manifest,version:1,openedAt:at,stage:'dispatch-draft'};next.draft=blankInspection(next);return{patch:{inspection:next},label:'Provider opened demo unit manifest and dispatch inspection'};}
  if(!current)return null;let next:RentalInspection={...current,version:current.version+1};const patch:Partial<RecordBooking>={};let label='';
  if(command.kind==='save'||command.kind==='submit'){
    if(actor!=='renter'||current.stage!==command.phase+'-draft'||!safeInspectionInput(command.input,current))return null;
    if(command.kind==='save'){next.draft=copyInspection(command.input);label='Provider saved '+command.phase+' inspection draft';}
    else{if(inspectionErrors(command.input,current,command.phase).length)return null;const report:InspectionReport={...copyInspection(command.input),at,by:'renter'};next.draft=undefined;if(command.phase==='dispatch'){next.dispatch=report;next.stage='dispatch-ack';}else if(command.phase==='return'){next.returned=report;next.stage='return-ack';}else{next.clearance=report;next.stage='resolved';patch.stockReturnedAt=at;}label='Provider signed '+command.phase+' inspection'+(command.phase==='clearance'?' and cleared equipment for reuse':' · awaiting customer acknowledgment');}
  }else if(command.kind==='correct'){
    if(actor!=='customer'||current.stage!==command.phase+'-ack'||typeof command.reason!=='string'||command.reason.trim().length<10||command.reason.length>2000)return null;const report=command.phase==='dispatch'?current.dispatch:current.returned;if(!report)return null;next.revisions=[...(current.revisions??[]),{phase:command.phase,report:{...copyInspection(report),at:report.at,by:report.by},reason:command.reason.trim(),at}];next.stage=command.phase==='dispatch'?'dispatch-draft':'return-draft';next.draft=copyInspection(report);label='Customer requested '+command.phase+' inspection correction';
  }else if(command.kind==='acknowledge'){
    if(actor!=='customer'||command.agrees!==true||current.stage!==command.phase+'-ack')return null;
    if(command.phase==='dispatch'){next.dispatchAckAt=at;next.stage='out';patch.status='active';}else{next.returnAckAt=at;next.stage='review';patch.status='completed';if(record.ledger.performance==='upcoming')patch.ledger={...record.ledger,performance:'reported'};if(current.returned&&!hasDiscrepancy(current.returned))patch.stockReturnedAt=at;}label='Customer acknowledged '+command.phase+' condition'+(command.phase==='return'?' · deposit decision pending':' · equipment out on rental');
  }else if(command.kind==='start-return'){
    if(actor!=='renter'||current.stage!=='out'||!current.dispatchAckAt)return null;next.stage='return-draft';next.draft=blankInspection(current);label='Provider opened return inspection with dispatch comparison';
  }else if(command.kind==='start-clearance'){
    if(actor!=='renter'||current.stage!=='resolved'||!current.returned||!hasDiscrepancy(current.returned)||record.stockReturnedAt)return null;next.stage='clearance-draft';next.draft=blankInspection(current);label='Provider opened repair or recovery inspection';
  }else if(command.kind==='propose'){
    const max=record.securityDeposit?.amountCents ?? 0;if(actor!=='renter'||current.stage!=='review'||current.proposal||!current.returned||!Number.isSafeInteger(command.cents)||command.cents<0||command.cents>max||typeof command.reason!=='string'||command.reason.trim().length<10||command.reason.length>2000||(command.cents>0&&(!hasDiscrepancy(current.returned)||!current.returned.photos.length)))return null;next.proposal={cents:command.cents,reason:command.reason.trim(),at,response:'pending'};label='Provider proposed demo deposit deduction · customer review required';
  }else if(command.kind==='respond'){
    if(actor!=='customer'||current.stage!=='review'||!current.proposal||current.proposal.response!=='pending'||typeof command.accept!=='boolean'||typeof command.reason!=='string'||command.reason.length>2000||(!command.accept&&command.reason.trim().length<10))return null;next.proposal={...current.proposal,response:command.accept?'accepted':'disputed',responseReason:command.reason.trim(),responseAt:at};label=command.accept?'Customer accepted the proposed deposit decision · admin recording required':'Customer disputed deposit deduction · admin review required';
  }else if(command.kind==='resolve'){
    if(actor!=='admin'||current.stage!=='review'||!current.proposal||current.proposal.response==='pending'||typeof command.approve!=='boolean'||typeof command.reason!=='string'||command.reason.trim().length<10||command.reason.length>2000)return null;const max=record.securityDeposit?.amountCents ?? 0,cents=command.approve?current.proposal.cents:0;if(!Number.isSafeInteger(max)||max<0||cents>max)return null;next.stage='resolved';next.resolution={deductionCents:cents,refundCents:max-cents,reason:command.reason.trim(),at,by:'admin'};label='Admin recorded demo deposit decision · no money transferred';
  }else return null;
  return{patch:{...patch,inspection:next},label};
}
