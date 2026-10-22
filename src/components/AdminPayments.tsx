import { EquipmentInspectionQueue } from './EquipmentInspection';
import BookingDocuments from './BookingDocuments';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Landmark, ShieldCheck, X } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { canRelease, requiresEscrow, money, settlement, type BookingAction, type Installment } from '../lib/booking';
import { refundBlocks, bookingService } from '../lib/pipeline';
import { InstallmentHistory, SettlementSummary } from './BookingSettlement';
import { useDashboard } from '../lib/DashboardContext';
import { maskAccount } from '../lib/community';
import { PayoutAccountReview } from './PayoutAccount';
import RefundReview from './RefundReview';
import '../pipeline.css';

function TransferDialog({ name, amount, fee, onClose, onConfirm }: { name: string; amount: number; fee: number; onClose: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const trigger = document.activeElement as HTMLElement; const dialog = ref.current!; dialog.showModal(); return () => { dialog.close(); trigger?.focus(); }; }, []);
  return <dialog className="pw-dialog" ref={ref} aria-labelledby="transfer-title" onCancel={event => { event.preventDefault(); onClose(); }}><div className="pw-dialog-content">
    <button className="pw-icon pw-dialog-close" aria-label="Close transfer confirmation" onClick={onClose}><X size={18} /></button>
    <span className="sl-eyebrow">ADMIN / DEMO BANK TRANSFER</span><h2 id="transfer-title">Release {money(amount)}?</h2>
    <p>Transfer to {name}’s linked bank account. StageLink retains {money(fee)} from this payment. {fee === 0 ? 'The booking fee has already been deducted.' : 'This is the one-time booking fee.'}</p>
    <p>No real bank account is connected in this demo.</p><div className="pw-actions"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onConfirm}>Confirm demo transfer</button></div>
  </div></dialog>;
}
export default function AdminPayments({ initialBookingId }: { initialBookingId?: string }) {
  const { state, actor, dispatch } = useBooking();
  const [id, setId] = useState(initialBookingId ?? 'BK-2901');
  const [verified, setVerified] = useState(false);
  const [confirm, setConfirm] = useState<Installment['kind'] | null>(null);
  const [error, setError] = useState('');
  const record = state.bookings.find(record => record.id === id)!;
  const { state: dashboard } = useDashboard();
  const account = dashboard.payoutAccounts[bookingService(record).role];
  const bankReady = account.status === 'verified';
  const totals = settlement(record.ledger);
  const provider = bookingService(record).name;
  const item = record.ledger.installments.find(item => item.kind === confirm);
  const apply = (action: BookingAction) => {
    if (!dispatch({ type: 'settle', id, action })) { setError('The booking changed or this action is unavailable. Review the latest amounts and status.'); return false; }
    setError(''); return true;
  };
  if (actor !== 'admin') return null;
  return <div className="pw-workspace sl-admin-settlement">
    <div className="mb-7"><p className="sl-eyebrow">STAGELINK / SETTLEMENT DESK</p><h1 className="font-display text-3xl font-bold mt-3">Payments & payouts</h1><p className="pw-muted mt-3">Every payment enters StageLink. Every provider transfer needs an admin.</p><span className="badge badge-amber mt-3">Temporary demo · Refresh to reset · No real transfers</span></div>
    <div className="pw-stats pw-payment-stats">{[
      ['Held by StageLink', state.bookings.reduce((sum, record) => sum + (record.refund?.status === 'refunded' ? 0 : settlement(record.ledger).heldCents), 0)],
      ['Transferred to providers', state.bookings.reduce((sum, record) => sum + settlement(record.ledger).paidOutCents, 0)],
      ['StageLink fees collected', state.bookings.reduce((sum, record) => sum + settlement(record.ledger).feeChargedCents, 0)],
    ].map(([label,value]) => <div className="pw-stat" key={label}><div><span>{label}</span><Landmark size={17} /></div><strong>{money(value as number)}</strong></div>)}</div>
    {state.bookings.some(record => record.refund?.status === 'requested') && <section className="pw-panel pw-refund-queue" aria-label="Refund review queue"><span className="sl-eyebrow">NEEDS YOUR REVIEW</span><h2>Refund requests</h2>{state.bookings.filter(record => record.refund?.status === 'requested').map(record => <button className="pw-notification-item" key={record.id} onClick={() => { setId(record.id); setVerified(false); setConfirm(null); setError(''); }}><span><strong>{record.event}</strong><small>{record.id} · {money(record.refund!.amountCents)} held for review</small></span><ArrowUpRight size={17} /></button>)}</section>}
    <EquipmentInspectionQueue />
    <PayoutAccountReview />
    <label className="pw-field">Booking to settle<select value={id} onChange={event => { setId(event.target.value); setVerified(false); setConfirm(null); setError(''); }}>{state.bookings.map(record => <option key={record.id} value={record.id}>{record.id} · {record.event}</option>)}</select></label>
    <div className="pw-two-col">
      <div className="pw-stack"><SettlementSummary record={record} /><InstallmentHistory record={record} /><BookingDocuments record={record} /></div>
      <div className="pw-stack">
        <RefundReview key={record.id} record={record} />
        <section className="pw-panel pw-review" aria-label="Release controls">
          <div className="pw-panel-heading"><span className="sl-eyebrow">ADMIN TRANSFER CONTROLS</span><ShieldCheck size={20} /></div><h2>{provider}</h2><p>Destination: {maskAccount(account)} (simulated).</p>{!bankReady && <p className="pw-alert">Transfers paused: the provider’s payout account needs admin verification.</p>}
          {!record.ledger.adjudicatedAt && record.refund?.status !== 'refunded' && <div className="pw-callout"><h3>Verify the performance</h3>
            {record.ledger.performance === 'upcoming' ? <p>{requiresEscrow(record.ledger) ? "Waiting for verified completion and full payment. The 50% advance remains held in demo escrow." : "Waiting for the provider to report completion. An optional advance can be released before the gig."}</p> : record.ledger.performance === 'reported' ? <><label className="pw-check"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />I have verified that the performance was completed.</label><button className="btn-ghost" disabled={!verified || refundBlocks(record)} onClick={() => { if (apply({ type: 'confirm_performance' })) setVerified(false); }}>Confirm performance</button></> : <p className="sl-transfer-status"><Check size={17} />Performance verified by admin</p>}
          </div>}
          {refundBlocks(record) && <p className="pw-alert">{record.refund?.status === 'refunded' ? 'Refund completed. This booking is cancelled; no payout is available.' : 'Refund under review. Transfers are paused until a decision is made.'}</p>}
          {!record.ledger.installments.length && <p className="pw-muted">{requiresEscrow(record.ledger) ? "No funds received. The required 50% demo escrow payment is pending." : "No funds have been received. The customer may skip the advance and pay after the gig."}</p>}
          {record.ledger.installments.filter(item => !item.releasedAt && !item.refundedAt && !item.allocation).map(item => {
            const ready = bankReady && !refundBlocks(record) && canRelease(record.ledger, item.kind);
            const fee = item.kind !== 'advance' && record.ledger.installments.some(other => other.kind === 'advance' && !other.releasedAt) ? 0 : totals.feeDueCents;
            return <article className="sl-installment" key={item.kind}><h3>{item.kind === 'advance' ? 'Release advance' : 'Release final payment'}</h3>
              <dl className="sl-settlement-lines"><div><dt>Held for this payment</dt><dd>{money(item.grossCents)}</dd></div><div><dt>{fee ? 'One-time StageLink fee' : 'No additional fee'}</dt><dd>{money(fee)}</dd></div><div className="sl-settlement-total"><dt>Transfer to provider</dt><dd>{money(item.grossCents - fee)}</dd></div></dl>
              {!ready && <p className="pw-caption">{!bankReady ? 'Verify the payout account before transferring funds.' : record.ledger.payoutBlocked || refundBlocks(record) ? 'Transfer paused for review.' : record.ledger.installments.some(other => other.kind === 'advance' && !other.releasedAt) && item.kind !== 'advance' ? 'Release the advance first; it carries the one-time fee.' : 'Final payout requires admin verification of the completed performance.'}</p>}
              <button className="btn-primary sl-action" disabled={!ready} onClick={() => setConfirm(item.kind)}>Transfer {item.kind === 'advance' ? 'advance' : 'final payment'} · {money(item.grossCents - fee)}<ArrowUpRight size={15} /></button>
            </article>;
          })}
          {totals.heldCents > 0 && !refundBlocks(record) && <button className="btn-ghost mt-5" onClick={() => { apply({ type: 'toggle_hold' }); setConfirm(null); }}>{record.ledger.payoutBlocked ? 'Clear payout hold' : 'Place payout on hold'}</button>}
          {error && <p className="pw-error" role="alert">{error}</p>}
        </section>
        <section className="pw-panel pw-review"><span className="sl-eyebrow">BOOKING ACTIVITY</span><ul className="pw-activity">{record.activity.map((entry, index) => <li key={`${entry.at}-${index}`}><span /><div><p>{entry.label}</p><time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time></div></li>)}</ul></section>
      </div>
    </div>
    {confirm && item && bankReady && !refundBlocks(record) && canRelease(record.ledger, confirm) && <TransferDialog name={`${provider} (${maskAccount(account)})`} amount={item.grossCents - totals.feeDueCents} fee={totals.feeDueCents} onClose={() => setConfirm(null)} onConfirm={() => { apply({ type: 'release', kind: confirm }); setConfirm(null); }} />}
  </div>;
}
