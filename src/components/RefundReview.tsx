import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { money } from '../lib/booking';
import type { RecordBooking } from '../lib/pipeline';
import ConfirmDialog from './ConfirmDialog';

export default function RefundReview({ record }: { record: RecordBooking }) {
  const { actor, dispatch } = useBooking();
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  if (actor !== 'admin' || !record.refund) return null;
  const refund = record.refund;
  const decide = (approve: boolean) => {
    if (reason.trim().length < 10) { setError('Add at least 10 characters explaining your decision.'); return; }
    setError(''); setDecision(approve);
  };
  return <section className="pw-panel pw-review" aria-label="Refund review">
    <div className="pw-panel-heading"><span className="sl-eyebrow">REFUND / ADMIN REVIEW</span><RotateCcw size={19} /></div>
    <h2>{refund.status === 'requested' ? 'A change of plans.' : refund.status === 'refunded' ? 'Returned to the customer.' : 'Refund declined.'}</h2>
    <strong>{money(refund.amountCents)}</strong><p>{refund.reason}</p>
    <p className="pw-caption">Requested {new Date(refund.at).toLocaleString()} · {record.id}</p>
    {refund.status === 'requested' ? <>
      <p>Approval returns all held funds to the original payment method and cancels this booking. No StageLink fee is taken. Declining keeps the booking active; any earlier admin hold remains.</p>
      <label className="pw-field">Decision reason<textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={2000} placeholder="Explain the outcome to both participants…" /></label>
      <div className="pw-actions"><button className="btn-ghost" onClick={() => decide(false)}>Decline refund</button><button className="btn-primary" onClick={() => decide(true)}>Approve refund · {money(refund.amountCents)}</button></div>
    </> : <><p>{refund.decisionReason}</p><p className="pw-caption">{refund.decidedAt && new Date(refund.decidedAt).toLocaleString()} · {refund.status === 'refunded' ? 'Refund complete (demo). No further payments or transfers.' : 'Both participants can continue the booking.'}</p></>}
    {error && <p className="pw-error" role="alert">{error}</p>}
    {decision !== null && <ConfirmDialog title={decision ? `Refund ${money(refund.amountCents)}?` : 'Decline this refund?'} confirm={decision ? 'Confirm demo refund' : 'Confirm refund decline'} onClose={() => setDecision(null)} onConfirm={() => {
      if (!dispatch({ type: 'resolve_refund', id: record.id, approve: decision, reason })) setError('This refund has already changed. Review its latest status.');
      setDecision(null);
    }}>{decision ? 'The booking will be cancelled and held funds returned to the original payment method. This is a simulation; no money moves.' : 'The customer and provider will receive your decision. The booking will continue with its existing payment schedule.'}</ConfirmDialog>}
  </section>;
}
