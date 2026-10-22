import { DepositSummary } from './SecurityDeposit';
import { bookingService } from '../lib/pipeline';
import { useState } from 'react';
import { ArrowRight, Check, Clock3, Landmark, Plus, ShieldCheck } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { checkoutFor, requiresEscrow, advancePercent, money, settlement, type BookingAction } from '../lib/booking';
import { paymentLabel, refundBlocks, performanceStarted, type RecordBooking } from '../lib/pipeline';

export function SettlementSummary({ record }: { record: RecordBooking }) {
  const totals = settlement(record.ledger);
  const refunded = record.refund?.status === 'refunded';
  return <section className="pw-panel pw-review sl-settlement" aria-label="Payment breakdown">
    <div className="pw-panel-heading"><span className="sl-eyebrow">ONE BOOKING · EVERY PAYMENT</span><ShieldCheck size={19} /></div>
    <h2>{money(totals.totalCents)}</h2><p>{paymentLabel(record)}</p>
    <dl className="sl-settlement-lines">
      <div><dt>Agreed booking price</dt><dd>{money(record.ledger.quoteCents)}</dd></div>
      <div><dt>Approved overtime</dt><dd>{money(totals.overtimeCents)}</dd></div>
      {record.ledger.installments.some(item => item.kind === 'legacy') && <div><dt>Previous demo surcharge</dt><dd>{money(totals.totalCents - record.ledger.quoteCents - totals.overtimeCents)}</dd></div>}
      <div><dt>Customer paid to StageLink</dt><dd>{money(totals.receivedCents)}</dd></div>
      <div className="sl-settlement-total"><dt>{refunded ? 'Refunded to customer' : 'Still due after performance'}</dt><dd>{money(refunded ? totals.refundedCents : totals.remainingCents)}</dd></div>
    </dl>
    {bookingService(record).role === 'renter' && <DepositSummary snapshot={record.securityDeposit} legacy={!record.securityDeposit} />}
    <div className="sl-money-grid">
      <div><Landmark size={17} /><span>Held by StageLink</span><strong>{money(refunded ? 0 : totals.heldCents)}</strong></div>
      <div><Check size={17} /><span>Transferred to provider</span><strong>{money(totals.paidOutCents)}</strong></div>
    </div>
    {record.ledger.adjudicatedAt ? <p className="pw-caption">Arbitration closed the remaining payment obligation. Customer refunded {money(totals.refundedCents)}; provider received {money(totals.paidOutCents)}; StageLink fee charged {money(totals.feeChargedCents)}. The original agreed price remains in the audit trail.</p> : refunded ? <p className="pw-caption">The held payment was returned in full. No StageLink fee was collected. There is no remaining payment due for this cancelled booking.</p> : <p className="pw-caption">StageLink fee: {money(totals.feeCents)} (5% of the original booking). Deducted once from the provider’s payout. {totals.feeChargedCents ? 'Already deducted — no further fee.' : 'Deducted when the admin releases the first payment.'} Approved overtime is paid to the performer without an additional fee.</p>}
    {record.arbitration && <p className="pw-caption">{record.arbitration.caseId} · Arbitration {record.arbitration.status}. {record.arbitration.status==='settled' ? `Refunded ${money(record.arbitration.refundCents)} from the held balance; the remaining booking obligation was closed by this decision.` : 'No arbitration allocation is complete until the demo transfer succeeds.'}</p>}
    <p className="pw-caption">All payments go through StageLink. Only an admin can transfer held funds to the provider’s bank account.</p>
  </section>;
}

export function PaymentChoice({ record, onPay }: { record: RecordBooking; onPay: () => void }) {
  const { actor, dispatch } = useBooking();
  const [error, setError] = useState('');
  if (record.ledger.adjudicatedAt || actor !== 'customer' || refundBlocks(record) || ['pending', 'rejected', 'cancelled'].includes(record.status) || record.ledger.quoteStatus !== 'accepted') return null;
  const due = checkoutFor(record.ledger);
  const totals = settlement(record.ledger);
  return <div className="pw-callout sl-payment-choice">
    <span className="sl-eyebrow">{record.ledger.performance === 'upcoming' ? 'BEFORE THE SHOW' : 'AFTER THE ENCORE'}</span>
    <h3>{due?.kind === 'advance' ? requiresEscrow(record.ledger) ? 'Your 50% escrow advance is required.' : 'An advance is your choice.' : due?.kind === 'final' ? 'Your final payment is due.' : totals.remainingCents ? 'Your booking is confirmed.' : 'The agreed amount is fully paid.'}</h3>
    <p>{due?.kind === 'advance' ? requiresEscrow(record.ledger) ? `Pay ${money(due.amountCents)} now (50%). Demo escrow holds this advance until verified completion and full payment.` : `Pay ${money(due.amountCents)} now (10%), or pay the full price after the performance. StageLink holds the advance until an admin releases it.` : due?.kind === 'final' ? `${money(due.amountCents)} is due immediately after the performance, including approved overtime and less any advance already paid.` : record.ledger.overtime.some(item => item.status === 'pending') && record.ledger.performance !== 'upcoming' ? 'Approve or decline the pending overtime request before making the final payment.' : totals.remainingCents ? `${money(totals.remainingCents)} is due after the performance. Any approved overtime will be added to this amount.` : 'StageLink holds each payment until an admin transfers it to the provider.'}</p>
    {due && <div className="pw-actions">
      {due.kind === 'advance' && !requiresEscrow(record.ledger) && <button className="btn-ghost" onClick={() => { if (!dispatch({ type: 'settle', id: record.id, action: { type: 'skip_advance' } })) setError('This booking changed. Review the payment status.'); }}>Skip advance · pay after gig</button>}
      <button className="btn-primary sl-action" onClick={onPay}>{due.kind === 'advance' ? `Pay ${advancePercent(record.ledger)}% ${requiresEscrow(record.ledger) ? "escrow" : "advance"} · ${money(due.amountCents)}` : `Pay final balance · ${money(due.amountCents)}`}<ArrowRight size={15} /></button>
    </div>}
    {error && <p className="pw-error" role="alert">{error}</p>}
  </div>;
}

export function InstallmentHistory({ record }: { record: RecordBooking }) {
  return <section className="pw-panel pw-review" aria-label="Payment installments">
    <span className="sl-eyebrow">STAGELINK / TRANSACTION TRAIL</span><h2>From payment to payout.</h2>
    {!record.ledger.installments.length && <p>{requiresEscrow(record.ledger) ? "No payment received yet. The 50% escrow advance is required." : "No payment received yet. The advance is optional."}</p>}
    {record.ledger.installments.map(item => <article className="sl-installment" key={item.kind}>
      <div className="pw-panel-heading"><h3>{item.kind === 'advance' ? `${advancePercent(record.ledger)}% advance` : item.kind === 'final' ? 'Final payment' : 'Previous demo payment'}</h3><strong>{money(item.grossCents)}</strong></div>
      <p className="pw-caption">TX-{record.id}-{item.kind.toUpperCase()} · {new Date(item.paidAt).toLocaleString()} · Demo {item.method}</p>
      {item.allocation && <div className="pw-callout"><h3>Arbitration allocation · {item.allocation.caseId}</h3><p>Customer refund {money(item.allocation.refundCents)} · provider payout {money(item.allocation.payoutCents)} · StageLink fee {money(item.allocation.feeCents)}</p><p className="pw-caption">Settled {new Date(item.allocation.at).toLocaleString()} (demo). Original payment retained for audit.</p></div>}
      {!item.allocation && <p className="sl-transfer-status">{item.releasedAt ? <Check size={16} /> : <Clock3 size={16} />}{item.refundedAt ? 'Refunded to original payment method (demo)' : item.releasedAt ? 'Admin transferred to provider bank account' : 'Held in StageLink account · awaiting admin transfer'}</p>}
      {item.refundedAt && <p className="pw-caption">Refunded {new Date(item.refundedAt).toLocaleString()} · {money(item.grossCents)}</p>}
      {item.releasedAt && <dl className="sl-settlement-lines"><div><dt>StageLink fee deducted</dt><dd>{money(item.feeCents ?? 0)}</dd></div><div><dt>Provider received</dt><dd>{money(item.payoutCents ?? 0)}</dd></div><div><dt>Transferred</dt><dd>{new Date(item.releasedAt).toLocaleString()}</dd></div></dl>}
    </article>)}
    <p className="pw-caption">Frontend demo. No money moves between bank accounts.</p>
  </section>;
}

export function OvertimePanel({ record }: { record: RecordBooking }) {
  const { actor, dispatch } = useBooking();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState('60');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  if (bookingService(record).role !== 'artist' || record.ledger.quoteStatus !== 'accepted' || ['rejected','cancelled','pending'].includes(record.status)) return null;
  const pending = record.ledger.overtime.some(item => item.status === 'pending');
  const closed = !!record.ledger.adjudicatedAt || record.ledger.installments.some(item => item.kind !== 'advance') || refundBlocks(record);
  const started = performanceStarted(record);
  const participant = actor === 'customer' || actor === 'artist';
  const apply = (action: BookingAction) => {
    if (!dispatch({ type: 'settle', id: record.id, action })) { setError('This request changed or is no longer available. Review the latest booking.'); return false; }
    setError(''); return true;
  };
  return <section className="pw-panel pw-review" aria-label="Overtime requests">
    <div className="pw-panel-heading"><span className="sl-eyebrow">KEEP THE MUSIC GOING</span><Clock3 size={19} /></div>
    <h2>A little longer on stage.</h2><p>Agree on extra time and its price together. Only approved overtime is added to the final StageLink payment.</p>
    {record.ledger.overtime.map(item => <article className="sl-installment" key={item.id}>
      <div className="pw-panel-heading"><strong>{item.minutes} minutes · {money(item.amountCents)}</strong><span className={`pw-status pw-${item.status}`}>{item.status}</span></div>
      <p className="pw-caption">Requested by {item.proposedBy === 'customer' ? 'the customer' : 'the performer'} · {new Date(item.at).toLocaleString()}</p>
      {item.status === 'pending' && (actor === item.proposedBy ? <p>Waiting for the other party to approve this amount.</p> : participant && !closed && <div className="pw-actions"><button className="btn-ghost" onClick={() => apply({ type: 'resolve_overtime', id: item.id, accept: false })}>Decline overtime</button><button className="btn-primary" onClick={() => apply({ type: 'resolve_overtime', id: item.id, accept: true })}>Approve overtime · {money(item.amountCents)}</button></div>)}
    </article>)}
    {participant && !closed && !pending && (open ? <form className="sl-overtime-form" onSubmit={event => {
      event.preventDefault();
      if (!/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 1440 || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) < 1 || Number(amount) > 1000000) { setError('Enter 1–1,440 minutes and an amount from $1 to $1,000,000, with up to two decimal places.'); return; }
      if (apply({ type: 'propose_overtime', id: crypto.randomUUID(), minutes: Number(minutes), amountCents: Math.round(Number(amount) * 100) })) { setOpen(false); setAmount(''); }
    }}>
      <div className="pw-detail-grid"><label className="pw-field">Extra time (minutes)<input value={minutes} onChange={e => setMinutes(e.target.value)} type="number" min="1" max="1440" step="1" required /></label><label className="pw-field">Overtime amount (USD)<input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" max="1000000" step="0.01" placeholder="Agreed extra price" required /></label></div>
      <p className="pw-caption">This sends a proposal. The final bill changes only when the other party approves.</p>
      <div className="pw-actions"><button className="btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary">Send overtime request</button></div>
    </form> : <button className="btn-ghost sl-action" disabled={!started} onClick={() => setOpen(true)}><Plus size={15} />Request overtime</button>)}
    {!started && !closed && <p className="pw-caption">Overtime requests become available when the gig starts.</p>}
    {closed && <p className="pw-caption">Overtime changes are closed once final payment is received or a refund is under review.</p>}
    {error && <p className="pw-error" role="alert">{error}</p>}
  </section>;
}
