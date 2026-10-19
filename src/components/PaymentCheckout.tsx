import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CreditCard, Landmark, LoaderCircle, LockKeyhole, ShieldCheck, Wifi } from 'lucide-react';
import { money, validateDemoCard } from '../lib/booking';
import PaymentGlass from './PaymentGlass';

type PaymentState = 'form' | 'processing' | 'success';
type CardFields = { name: string; number: string; expiry: string; cvv: string };
interface PaymentCheckoutProps {
  bookingId: string;
  artist: string;
  event: string;
  quoteCents: number;
  feeCents: number;
  paymentKind: 'advance' | 'final';
  paymentCents: number;
  paidCents: number;
  overtimeCents: number;
  onFailed?: () => void;
  onPaid: (method: 'card' | 'wallet') => boolean;
  onBack: () => void;
  onViewBooking: () => void;
}

const emptyCard: CardFields = { name: '', number: '', expiry: '', cvv: '' };
const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/15 aria-invalid:border-rose-500';

/** Frontend simulation: card fields never leave this component or enter storage. */
export default function PaymentCheckout({ bookingId, artist, event, quoteCents, feeCents, paymentKind, paymentCents, paidCents, overtimeCents, onPaid, onFailed, onBack, onViewBooking }: PaymentCheckoutProps) {
  const [method, setMethod] = useState<'card' | 'wallet'>('card');
  const [phase, setPhase] = useState<PaymentState>('form');
  const [fields, setFields] = useState<CardFields>(emptyCard);
  const [errors, setErrors] = useState<Partial<Record<keyof CardFields, string>>>({});
  const [flipped, setFlipped] = useState(false);
  const [failure, setFailure] = useState('');
  const [formGone, setFormGone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const totalCents = paymentCents;
  const layoutTransition = { duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] as const };

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (phase === 'success') successRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const update = (key: keyof CardFields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setFailure('');
  };

  const fillDemo = () => {
    setFields({ name: 'CODEXR', number: '4242 4242 4242 4242', expiry: `12/${String(new Date().getFullYear() + 3).slice(-2)}`, cvv: '123' });
    setErrors({});
    setFailure('');
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return;
    const nextErrors = method === 'card' ? validateDemoCard(fields) : {};
    setErrors(nextErrors);
    const invalidField = Object.keys(nextErrors)[0];
    if (invalidField) {
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${invalidField}"]`)?.focus();
      return;
    }
    busy.current = true;
    setFlipped(false);
    setPhase('processing');
    timer.current = setTimeout(() => {
      timer.current = null;
      if (method === 'card' && fields.number.replace(/\s/g, '') === '4000000000000002') {
        onFailed?.();
        busy.current = false; setFormGone(false); setPhase('form'); setFailure('Demo payment declined. No funds were taken. Use the demo card button to retry.');
      } else if (onPaid(method)) {
        setFields(emptyCard);
        setPhase('success');
      } else {
        busy.current = false;
        setFormGone(false);
        setPhase('form');
        setFailure('This quote has changed or has already been paid. Return to booking to review its status.');
      }
    }, 2500);
  };

  return (
    <section aria-label="Payment checkout" className="relative isolate mx-auto w-full max-w-6xl rounded-[32px] bg-[#07090f] p-2 text-white sm:p-5 lg:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <motion.div animate={reduceMotion ? {} : { x: [0, 35, 0], y: [0, 25, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-16 top-4 h-80 w-80 rounded-full bg-violet-600/30 blur-[75px]" />
        <motion.div animate={reduceMotion ? {} : { x: [0, -25, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-500/15 blur-[70px]" />
        <div className="absolute right-[20%] top-[15%] h-52 w-52 rounded-full bg-fuchsia-500/10 blur-[65px]" />
      </div>
      <PaymentGlass className="rounded-[26px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-8">
          <nav aria-label="Checkout progress" className="flex flex-wrap items-center gap-2 text-[11px] font-medium sm:gap-3 sm:text-sm">
            <button type="button" disabled={phase !== 'form'} onClick={onBack} className="flex items-center gap-1 text-slate-400 transition hover:text-violet-200 disabled:cursor-default"><ArrowLeft size={13} /> Main page</button>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-slate-400">Booking details</span>
            <ChevronRight size={13} className="text-slate-500" />
            <span aria-current="step" className="text-violet-300">Payment method</span>
          </nav>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1.5 text-[10px] font-bold tracking-wider text-violet-200"><ShieldCheck size={13} /> STAGELINK / SECURE CHECKOUT</span>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-violet-400/[0.035] px-5 py-3 text-xs text-slate-300 sm:px-8">
          <span><span className="font-semibold text-white">Demo mode.</span> Use test details only. No money moves.</span>
          <span className="font-mono text-[10px] tracking-wider">{bookingId}</span>
        </div>

        <motion.div layout transition={layoutTransition} className={`relative flex min-h-[590px] flex-col items-center justify-center gap-8 px-5 py-9 sm:px-10 lg:gap-12 lg:py-12 ${!formGone ? 'lg:flex-row' : ''}`}>
          <motion.div layout="position" transition={layoutTransition} className="relative w-full max-w-[390px] shrink-0 self-center">
            <motion.div layout="position" className="mb-5 flex items-center justify-between text-[10px] font-semibold tracking-[0.2em] text-slate-400">
              <span>YOUR BACKSTAGE PASS</span><span>01 / PAYMENT</span>
            </motion.div>
            <div className="relative aspect-[1.586] w-full [perspective:1200px]" aria-label={method === 'wallet' ? 'Demo wallet' : flipped ? 'Credit card back' : 'Credit card front'}>
              <motion.div
                style={{ visibility: method === 'wallet' ? 'hidden' : 'visible' }}
                data-testid="payment-card"
                data-side={flipped ? 'back' : 'front'}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative h-full w-full [transform-style:preserve-3d]"
              >
                <div aria-hidden={flipped} className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/15 bg-gradient-to-br from-[#1a4fad] via-[#0f2d7a] to-[#071440] p-[6%] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_25px_45px_-18px_rgba(0,0,0,0.7)] [backface-visibility:hidden]">
                  <div className="pointer-events-none absolute -right-[20%] -top-[70%] aspect-square w-full rounded-full border-[25px] border-white/[0.025] ring-[30px] ring-white/[0.025]" />
                  <div className="pointer-events-none absolute -left-[10%] bottom-[-100%] aspect-square w-full rounded-full border border-violet-200/15 ring-[40px] ring-violet-200/[0.04]" />
                  <div className="relative flex items-start justify-between">
                    <span className="text-sm font-semibold tracking-tight sm:text-base">StageLink<span className="text-amber-300">.</span></span>
                    <span className="text-[9px] tracking-[0.23em] text-slate-300">PLATINUM</span>
                  </div>
                  <div className="relative mt-[8%] flex items-center gap-3">
                    <svg width="38" height="28" viewBox="0 0 38 28" fill="none" aria-hidden="true"><rect x=".5" y=".5" width="37" height="27" rx="5" fill="#cfbc87" stroke="#f7eac2" /><path d="M14 0v8H0m38 0H24V0M14 28v-8H0m38 0H24v8M14 8h10v12H14zM0 14h14m10 0h14" stroke="#80744f" strokeWidth=".8" /></svg>
                    <Wifi size={23} strokeWidth={1.4} className="rotate-90 text-slate-300" />
                  </div>
                  <p className="relative mt-[6%] whitespace-nowrap font-mono text-[clamp(12px,3.7vw,21px)] tracking-[0.08em] text-slate-100">{phase === 'form' ? (fields.number || '•••• •••• •••• ••••') : '•••• •••• •••• 4242'}</p>
                  <div className="absolute inset-x-[6%] bottom-[9%] flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1"><p className="mb-1 text-[7px] tracking-[0.16em] text-slate-400">CARDHOLDER NAME</p><p className="truncate text-[10px] font-medium uppercase tracking-[0.1em]">{fields.name || 'CODEXR'}</p></div>
                    <div><p className="mb-1 text-[7px] tracking-[0.16em] text-slate-400">VALID THRU</p><p className="text-[10px] tracking-widest">{fields.expiry || 'MM/YY'}</p></div>
                    <span className="ml-2 text-2xl font-black italic tracking-tighter text-amber-100 sm:text-3xl">VISA</span>
                  </div>
                </div>
                <div aria-hidden={!flipped} className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/15 bg-gradient-to-br from-[#1a4fad] to-[#071440] text-white shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="mt-[10%] h-[22%] bg-black/90" />
                  <div className="mx-[7%] mt-[7%] flex h-[18%] items-center rounded-sm bg-slate-100 px-3 text-slate-800"><span className="flex-1 truncate font-serif italic text-slate-400">{fields.name || 'CODEXR'}</span><span className="border-l border-slate-300 pl-3 font-mono text-sm">{fields.cvv || '•••'}</span></div>
                  <div className="mx-[7%] mt-2 text-right text-[8px] tracking-widest text-slate-400">SECURITY CODE</div>
                  <p className="absolute bottom-[8%] left-[7%] text-[9px] text-slate-400">StageLink · Demo card preview</p>
                </div>
              </motion.div>
              {method === 'wallet' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] border border-violet-300/30 bg-gradient-to-br from-violet-950 to-[#171126] text-violet-100 shadow-xl"><Landmark size={36} /><strong className="text-xl">StageLink demo wallet</strong><span className="text-xs text-violet-300">Simulated payment · no real balance</span><span className="text-2xl">{money(totalCents)}</span></div>}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {phase === 'form' ? (
                <motion.div key="protection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-violet-300 shadow-sm"><Landmark size={18} /></span>
                  <div><p className="text-sm font-semibold">{paymentKind === 'advance' ? 'An advance, held until admin release.' : 'The encore, settled through StageLink.'}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{paymentKind === 'advance' ? 'StageLink holds your advance. An admin can release it to the provider before the performance, after deducting the one-time booking fee.' : 'StageLink holds your final payment until an admin verifies the completed performance and approves the provider’s payout.'}</p></div>
                </motion.div>
              ) : formGone ? (
                <motion.div key={phase} initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }} onAnimationComplete={() => { if (phase === 'success') successRef.current?.focus({ preventScroll: true }); }} className="mt-9 text-center" role="status" aria-live="polite">
                  {phase === 'processing' ? <>
                    <LoaderCircle size={28} className="mx-auto mb-4 animate-spin text-violet-300 motion-reduce:animate-none" />
                    <h2 className="text-lg font-semibold tracking-tight">Processing Secure Transaction...</h2>
                    <p className="mt-2 text-xs text-slate-400">Simulating your payment to StageLink.</p>
                  </> : <>
                    <motion.div initial={{ scale: reduceMotion ? 1 : 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={25} strokeWidth={3} /></motion.div>
                    <h2 ref={successRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">Payment Successful!</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">Your demo transaction of <strong className="font-semibold text-slate-100">{money(totalCents)}</strong> has been processed successfully.</p>
                    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-violet-200"><LockKeyhole size={13} /> Funds held by StageLink · Not yet paid to provider</p>
                    <button onClick={onViewBooking} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">View booking <ArrowRight size={15} /></button>
                  </>}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence onExitComplete={() => setFormGone(true)}>
            {phase === 'form' && (
              <motion.form key="payment-form" noValidate onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: reduceMotion ? 0 : 20 }} transition={{ duration: reduceMotion ? 0 : 0.25 }} className="w-full max-w-[390px] min-w-0">
                <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">Payment details</h1>
                <p className="mt-2 text-sm text-slate-400">One step closer to an unforgettable performance.</p>
                <fieldset className="mt-5 flex gap-3 border-0 p-0"><legend className="mb-2 text-xs text-slate-300">Payment method</legend>{(['card', 'wallet'] as const).map(value => <label key={value} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${method === value ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-white/15 text-slate-400'}`}><input type="radio" name="payment-method" value={value} checked={method === value} onChange={() => { setMethod(value); setErrors({}); setFailure(''); }} />{value === 'card' ? 'Demo card' : 'Demo wallet'}</label>)}</fieldset>
                {method === 'card' ? <><div className="mb-6 mt-4 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Test Visa ending in 4242</span>
                  <button type="button" onClick={fillDemo} className="rounded-md px-2 py-1.5 font-semibold text-violet-300 transition hover:bg-violet-500/15 focus-visible:outline-2 focus-visible:outline-violet-400">Use demo card</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="payment-name" className="text-xs font-semibold text-slate-200">Cardholder name</label>
                    <input id="payment-name" name="name" autoComplete="off" maxLength={60} placeholder="CODEXR" value={fields.name} onChange={e => update('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'payment-name-error' : undefined} className={inputClass} />
                    {errors.name && <p id="payment-name-error" className="mt-1 text-xs text-rose-300">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="payment-number" className="text-xs font-semibold text-slate-200">Card number</label>
                    <div className="relative"><input id="payment-number" name="number" inputMode="numeric" autoComplete="off" maxLength={19} placeholder="4242 4242 4242 4242" value={fields.number} onChange={e => update('number', e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())} aria-invalid={!!errors.number} aria-describedby={errors.number ? 'payment-number-error' : undefined} className={`${inputClass} pr-16 font-mono`} /><span className="pointer-events-none absolute right-4 top-1/2 text-sm font-black italic text-amber-200">VISA</span></div>
                    {errors.number && <p id="payment-number-error" className="mt-1 text-xs text-rose-300">{errors.number}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="payment-expiry" className="text-xs font-semibold text-slate-200">Expiry date</label>
                      <input id="payment-expiry" name="expiry" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="MM/YY" value={fields.expiry} onChange={e => { const digits = e.target.value.replace(/\D/g, '').slice(0, 4); update('expiry', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} aria-invalid={!!errors.expiry} aria-describedby={errors.expiry ? 'payment-expiry-error' : undefined} className={inputClass} />
                      {errors.expiry && <p id="payment-expiry-error" className="mt-1 text-xs text-rose-300">{errors.expiry}</p>}
                    </div>
                    <div>
                      <label htmlFor="payment-cvv" className="text-xs font-semibold text-slate-200">CVV / CVC</label>
                      <div className="relative"><input id="payment-cvv" name="cvv" type="password" inputMode="numeric" autoComplete="off" maxLength={3} placeholder="123" value={fields.cvv} onFocus={() => setFlipped(true)} onBlur={() => setFlipped(false)} onChange={e => update('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))} aria-invalid={!!errors.cvv} aria-describedby={errors.cvv ? 'payment-cvv-error' : undefined} className={`${inputClass} pr-10`} /><LockKeyhole size={15} className="pointer-events-none absolute right-3 top-1/2 text-slate-400" /></div>
                      {errors.cvv && <p id="payment-cvv-error" className="mt-1 text-xs text-rose-300">{errors.cvv}</p>}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-slate-400">To preview a declined payment, use test card 4000 0000 0000 0002 with a future expiry and any 3-digit test CVV.</p></> : <p className="my-6 text-sm leading-relaxed text-slate-300">This demo wallet lets you preview checkout without entering card details. No real money or wallet balance is used.</p>}
                <div className="mb-5 mt-6 border-t border-white/[0.07] pt-4">
                  <p className="text-xs font-semibold text-slate-100">{artist} <span className="font-normal text-slate-400">/ {event}</span></p>
                  <dl className="mt-3 space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between gap-3"><dt>Agreed performance fee</dt><dd>{money(quoteCents)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Approved overtime</dt><dd>{money(overtimeCents)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Already paid to StageLink</dt><dd>{money(paidCents)}</dd></div><div className="flex items-center justify-between gap-3 pt-2 text-white"><dt className="font-medium">{paymentKind === 'advance' ? 'Optional 10% advance' : 'Final balance due'}</dt><dd className="text-xl font-semibold tracking-tight">{money(totalCents)}</dd></div>
                  </dl>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-slate-400">{paymentKind === 'advance' ? 'Your advance goes to StageLink. An admin can transfer it to the provider before the gig.' : 'Your final payment goes to StageLink. An admin transfers it after performance verification.'} The {money(feeCents)} StageLink fee is deducted once from the provider’s payout; it is not added to your payment.</p>
                {failure && <p role="alert" className="mb-3 text-sm text-rose-300">{failure}</p>}
                <motion.button whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }} type="submit" className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.55)] transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400"><CreditCard size={17} /><span>PAY {money(totalCents)}</span><ArrowRight size={17} /></motion.button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400"><LockKeyhole size={10} /> Demo checkout · Card details are never saved</p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
        <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.07] px-5 py-4 text-[10px] font-medium text-slate-400">
          <span className="flex items-center gap-1.5"><Check size={12} /> Quote agreed</span><span className="flex items-center gap-1.5"><Landmark size={12} /> Held in StageLink account</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Admin approves artist payout</span>
        </footer>
      </PaymentGlass>
    </section>
  );
}
