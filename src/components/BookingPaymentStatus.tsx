import { Check, Clock3, Landmark, Mic2, ShieldCheck } from 'lucide-react';
import PaymentGlass from './PaymentGlass';
import { useBooking } from '../lib/BookingContext';
import { amounts, bookingDetails, bookingStatus, money } from '../lib/booking';

export default function BookingPaymentStatus({ onPay }: { onPay?: () => void }) {
  const { booking, actor, act, storageUnavailable } = useBooking();
  const paid = booking.payment !== 'unpaid';
  const released = booking.payment === 'released';
  const steps = [
    { title: 'Quote agreed', detail: money(booking.quoteCents), done: booking.quoteStatus === 'accepted', icon: Check },
    { title: 'Payment held', detail: 'In StageLink holding balance', done: paid, icon: Landmark },
    { title: 'Performance complete', detail: booking.performance === 'reported' ? 'Artist reported · Admin review pending' : 'Admin verifies the performance', done: booking.performance === 'confirmed', icon: Mic2 },
    { title: 'Released to artist', detail: 'Admin approves the payout', done: released, icon: ShieldCheck },
  ];
  return <PaymentGlass aria-label="Booking payment status">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/40 p-5">
      <div><p className="text-[10px] uppercase tracking-[0.2em] text-violet-400">{bookingDetails.id} · Payment protection</p><h2 className="mt-2 font-display text-xl text-white">{bookingDetails.event}</h2><p className="mt-1 text-xs text-slate-400">{bookingDetails.artist} · {bookingDetails.date}</p></div>
      <span className={`badge ${released ? 'badge-emerald' : 'badge-amber'}`}>{bookingStatus(booking)}</span>
    </div>
    <div className="p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-violet-400/10 to-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl p-4">
        <div><p className="text-xs text-slate-400">{released ? 'Paid to artist' : paid ? 'StageLink holding balance' : 'Total due after agreement'}</p><p className="mt-1 font-mono text-2xl text-white">{money(released ? booking.quoteCents : amounts(booking.quoteCents).totalCents)}</p></div>
        <Landmark size={28} className="text-violet-400" />
      </div>
      <ol className="space-y-5">{steps.map((step, i) => <li key={step.title} className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${step.done ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{step.done ? <Check size={15} /> : <step.icon size={15} />}</span>
        <div><p className={`text-sm font-medium ${step.done ? 'text-white' : 'text-slate-400'}`}><span className="mr-2 text-xs text-slate-500">0{i + 1}</span>{step.title}</p><p className="mt-1 text-xs text-slate-500">{step.detail}</p></div>
      </li>)}</ol>
      {booking.payoutBlocked && <p role="status" className="mt-5 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">An admin has paused this payout for review. Funds remain held by StageLink.</p>}
      {actor === 'customer' && booking.quoteStatus === 'accepted' && !paid && onPay && <button className="btn-primary mt-6 w-full" onClick={onPay}>Continue to payment →</button>}
      {actor === 'artist' && paid && booking.performance === 'upcoming' && <button className="btn-primary mt-6 w-full" onClick={() => act({ type: 'report_performance' })}>Mark performance complete</button>}
      {actor === 'artist' && booking.performance === 'reported' && <p className="mt-5 flex items-center gap-2 text-sm text-amber-300"><Clock3 size={15} /> Performance reported. Awaiting admin verification.</p>}
      {paid && !released && <p className="mt-5 text-xs leading-relaxed text-slate-400">The singer receives {money(booking.quoteCents)} only after the performance is verified and an admin releases payment. StageLink’s service fee is {money(amounts(booking.quoteCents).feeCents)}.</p>}
      <p className="mt-4 text-[11px] text-slate-500">Demo ledger · No real bank transfer{storageUnavailable ? ' · Browser storage unavailable; progress lasts for this visit only.' : ''}</p>
    </div>
  </PaymentGlass>;
}
