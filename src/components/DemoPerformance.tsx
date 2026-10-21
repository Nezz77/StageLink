import { requiresEscrow } from '../lib/booking';
import { useState } from 'react';
import { Play, Check } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { refundBlocks, bookingService, type RecordBooking } from '../lib/pipeline';
import ConfirmDialog from './ConfirmDialog';

export default function DemoPerformance({ record }: { record: RecordBooking }) {
  const { actor, dispatch } = useBooking();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  if (actor !== bookingService(record).role || record.ledger.quoteStatus !== 'accepted' || !['active', 'accepted', 'completed'].includes(record.status) || refundBlocks(record)) return null;
  const done = record.ledger.performance !== 'upcoming';
  const performer = bookingService(record).role === 'artist';
  const pending = record.ledger.overtime.some(item => item.status === 'pending');
  const started = !!record.demoStartedAt;
  const awaitingEscrow = requiresEscrow(record.ledger) && record.ledger.advance !== 'paid';
  return <section className="pw-callout pw-demo-performance" aria-label="Demo event controls">
    <span className="sl-eyebrow">TRY THE WHOLE BOOKING / DEMO</span>
    <h3>{done ? 'Completion reported.' : started ? 'The demo event is live.' : 'Ready for a rehearsal?'}</h3>
    <p>{done ? 'The customer can now pay the balance. An admin verifies completion before releasing the final payment.' : started ? (performer ? 'Agree on any overtime, then finish the event to open final payment.' : 'Finish the rental event to open final payment.') : (performer ? 'Start this event now to try overtime and final payment, even if the scheduled date is in the future.' : 'Start this rental event now to try completion and final payment, even if the scheduled date is in the future.')}</p>
    {!done && <button className="btn-ghost sl-action" disabled={awaitingEscrow || (started && pending)} onClick={() => {
      if (started) setConfirm(true);
      else if (!dispatch({ type: 'demo_start', id: record.id })) setError('This event is no longer available. Review its latest status.');
    }}>{started ? <Check size={16} /> : <Play size={16} />}{started ? 'Finish demo event' : 'Start demo event'}</button>}
    {awaitingEscrow && <p>Waiting for the required 50% demo escrow payment before this event can start.</p>}
    {started && pending && <p>Approve or decline the pending overtime before finishing.</p>}
    <p className="pw-caption">Only this demo advances. The scheduled date stays unchanged. Refresh resets progress.</p>
    {error && <p role="alert" className="pw-error">{error}</p>}
    {confirm && <ConfirmDialog title="Finish this demo event?" confirm="Finish demo event" onClose={() => setConfirm(false)} onConfirm={() => {
      if (!dispatch({ type: 'demo_finish', id: record.id })) setError('Resolve any pending overtime before finishing this event.');
      setConfirm(false);
    }}>This reports completion and makes the final balance due. The admin still needs to verify the event before transferring that payment.</ConfirmDialog>}
  </section>;
}
