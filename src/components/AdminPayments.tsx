import { useState } from 'react';
import { ArrowUpRight, Check, Clock3, Landmark, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { amounts, bookingDetails, money } from '../lib/booking';
import BookingPaymentStatus from './BookingPaymentStatus';
import PaymentGlass from './PaymentGlass';

export default function AdminPayments() {
  const { booking, actor, act } = useBooking();
  const [verified, setVerified] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const held = booking.payment === 'held';
  const released = booking.payment === 'released';
  const ready = held && booking.performance === 'confirmed' && !booking.payoutBlocked;
  const { feeCents, totalCents } = amounts(booking.quoteCents);
  if (actor !== 'admin') return null;

  return <div className="relative isolate mx-auto max-w-6xl pb-24">
    <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(ellipse_at_10%_10%,rgba(124,58,237,0.13),transparent_50%),radial-gradient(ellipse_at_100%_70%,rgba(245,158,11,0.06),transparent_50%)]" />
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-400">StageLink / Settlement desk</p><h1 className="font-display text-3xl font-bold text-white">Payments & payouts</h1><p className="mt-2 text-sm text-slate-400">Hold the funds. Verify the performance. Release with confidence.</p></div>
      <span className="badge badge-amber">Frontend demo · No real transfers</span>
    </div>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {[
        { label: 'Held by StageLink', value: held ? totalCents : 0, icon: Landmark, color: 'text-violet-300' },
        { label: 'Awaiting admin release', value: ready ? booking.quoteCents : 0, icon: Clock3, color: 'text-amber-300' },
        { label: 'Released to artist', value: released ? booking.quoteCents : 0, icon: ArrowUpRight, color: 'text-emerald-300' },
      ].map(item => <PaymentGlass key={item.label} className="flex items-center gap-4 p-5"><item.icon size={22} className={item.color} /><div><p className="text-xs text-slate-400">{item.label}</p><p className={`mt-1 font-mono text-xl ${item.color}`}>{money(item.value)}</p></div></PaymentGlass>)}
    </div>
    <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
      <BookingPaymentStatus />
      <div className="space-y-5">
        <PaymentGlass className="p-5 sm:p-6" aria-label="Release controls">
          <div className="mb-5 flex items-center gap-3"><ShieldCheck className="text-rose-400" size={21} /><h2 className="font-display text-xl text-white">Admin release controls</h2></div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-400">Payee</dt><dd className="text-white">{bookingDetails.artist}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-400">Performance fee</dt><dd className="font-mono text-white">{money(booking.quoteCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-400">StageLink service fee</dt><dd className="font-mono text-slate-300">{money(feeCents)}</dd></div>
          </dl>
          {!held && !released && <div className="mt-5 rounded-xl border border-slate-700/70 p-4 text-sm text-slate-400">Waiting for the customer to accept the quote and pay. No funds are available for release.</div>}
          {held && <>
            <div className="mb-5 mt-6 rounded-xl border border-slate-700/60 bg-slate-900/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">01 · Verify performance</p>
              {booking.performance === 'upcoming' ? <p className="text-sm text-slate-400">Waiting for the singer to mark the performance complete.</p> : booking.performance === 'reported' ? <>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-300"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="mt-1 accent-rose-500" />I have verified that the agreed performance was completed.</label>
                <button disabled={!verified} onClick={() => { act({ type: 'confirm_performance' }); setVerified(false); }} className="btn-ghost mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40">Confirm performance</button>
              </> : <p className="flex items-center gap-2 text-sm text-emerald-300"><Check size={15} /> Performance verified by admin</p>}
            </div>
            <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-400">{booking.payoutBlocked ? 'Payout is paused for review' : 'Need to review a booking issue?'}</p><button onClick={() => { act({ type: 'toggle_hold' }); setConfirmRelease(false); }} className="shrink-0 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/10">{booking.payoutBlocked ? 'Clear payout hold' : 'Place payout on hold'}</button></div>
            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-300">02 · Release to singer</p>
            {!ready && <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><LockKeyhole size={14} className="shrink-0" />Release stays locked until performance verification is complete and any payout hold is cleared.</p>}
            {confirmRelease && ready ? <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-4" role="group" aria-label="Confirm artist payout">
              <p className="text-sm leading-relaxed text-white">Release {money(booking.quoteCents)} to {bookingDetails.artist}? StageLink retains the {money(feeCents)} service fee.</p>
              <div className="mt-4 flex gap-3"><button onClick={() => setConfirmRelease(false)} className="btn-ghost flex-1">Cancel</button><button onClick={() => { act({ type: 'release' }); setConfirmRelease(false); }} className="btn-primary flex-1">Confirm demo release</button></div>
            </div> : <button disabled={!ready} onClick={() => setConfirmRelease(true)} className="flex w-full items-center justify-between rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/20 to-violet-400/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl px-4 py-3 text-sm font-semibold text-violet-200 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-35"><span>Release {money(booking.quoteCents)} to artist</span><ArrowUpRight size={16} /></button>}
          </>}
          {released && <p role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-300"><Check size={21} className="shrink-0" />Demo payout complete. {money(booking.quoteCents)} released to {bookingDetails.artist}; {money(feeCents)} retained as the StageLink fee.</p>}
        </PaymentGlass>
        <PaymentGlass className="p-5" aria-label="Payment activity"><h2 className="mb-4 text-sm font-semibold text-white">Booking activity</h2>{booking.history.length === 0 ? <p className="text-xs text-slate-500">Activity will appear when this quote is agreed.</p> : <ol className="space-y-4">{booking.history.map((entry, i) => <li key={`${entry.at}-${i}`} className="flex gap-3 text-xs"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" /><div><p className="leading-relaxed text-slate-300">{entry.label}</p><time dateTime={entry.at} className="mt-1 block text-[10px] text-slate-500">{new Date(entry.at).toLocaleString()}</time></div></li>)}</ol>}</PaymentGlass>
      </div>
    </div>
  </div>;
}
