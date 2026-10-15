import { performanceEndsAt, refundBlocks } from '../lib/pipeline';
import { useBooking } from '../lib/BookingContext';
import { InstallmentHistory, PaymentChoice, SettlementSummary } from './BookingSettlement';
import '../pipeline.css';
export default function BookingPaymentStatus({ onPay }: { onPay?: () => void }) {
  const { state, actor, dispatch } = useBooking();
  const record = state.bookings.find(record => record.id === 'BK-2901')!;
  return <div className="pw-stack"><SettlementSummary record={record} />
    {onPay && <PaymentChoice record={record} onPay={onPay} />}
    {actor === 'artist' && record.ledger.quoteStatus === 'accepted' && record.ledger.performance === 'upcoming' && <div className="pw-panel pw-review"><button className="btn-primary" disabled={performanceEndsAt(record) > new Date() || refundBlocks(record)} onClick={() => dispatch({ type: 'complete', id: record.id })}>Mark performance complete</button><p className="pw-caption">Available after the gig ends, even when the customer skips the advance. Final payment is then due through StageLink.</p></div>}
    <InstallmentHistory record={record} />
  </div>;
}
