import { useRef, useState, type FormEvent } from 'react';
import ConfirmDialog from './ConfirmDialog';
import {
  createSmsPreferencesApi, normalizeSmsNumber, SmsApiError,
  type SmsChannel, type SmsContact, type SmsHistory, type SmsSession, type SmsTopic,
} from '../lib/smsPreferences';

type Notice = { kind: 'status' | 'alert'; message: string };

const stopped: Record<SmsChannel, string> = {
  booking: 'Booking texts are off.',
  marketing: 'Promotional texts are off.',
  all: 'Booking and promotional texts are off.',
};
const topics = [
  { id: 'booking', label: 'Booking texts' },
  { id: 'marketing', label: 'Promotional texts' },
] as const;
const deliveryStatus = new Map([
  ['queued', 'Queued'],
  ['sending', 'Sending'],
  ['accepted', 'Sent to SMS provider'],
  ['delivered', 'Delivered'],
  ['failed', 'Delivery failed'],
  ['unknown', 'Delivery unconfirmed'],
  ['cancelled', 'Cancelled'],
]);
function formatDeliveryStatus(status: string) {
  return deliveryStatus.get(status) ?? 'Delivery status unavailable';
}

const smsDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function SmsDate({ value }: { value: string }) {
  return <time dateTime={value}>{smsDateFormat.format(new Date(value))}</time>;
}

function DeliveryHistory({ history }: { history: SmsHistory }) {
  return <>
    <p className="text-sm text-slate-300">Up to 20 recent entries per category. Times are shown in your local time.</p>
    <div className="grid gap-2">
      <h3 className="font-medium">Verification codes</h3>
      {history.verifications.length === 0 ? <p className="text-sm text-slate-300">No verification messages yet.</p> : (
        <ul className="grid gap-2">
          {history.verifications.map(item => (
            <li key={item.id} className="rounded-xl border border-slate-700 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">Number ending in {item.last4}</span>
                <span>{formatDeliveryStatus(item.status)}</span>
              </div>
              <p className="mt-1 text-slate-300">Requested <SmsDate value={item.createdAt} /></p>
              {item.confirmedAt && <p className="text-slate-300">Verified <SmsDate value={item.confirmedAt} /></p>}
            </li>
          ))}
        </ul>
      )}
    </div>
    <div className="grid gap-2">
      <h3 className="font-medium">Booking reminders</h3>
      {history.reminders.length === 0 ? <p className="text-sm text-slate-300">No booking reminder texts yet.</p> : (
        <ul className="grid gap-2">
          {history.reminders.map(item => (
            <li key={item.id} className="rounded-xl border border-slate-700 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{item.offsetHours}-hour reminder</span>
                <span>{formatDeliveryStatus(item.status)}</span>
              </div>
              <p className="mt-1 text-slate-300">Scheduled for <SmsDate value={item.dueAt} /></p>
              <p className="text-slate-300">Booking starts <SmsDate value={item.startsAt} /></p>
            </li>
          ))}
        </ul>
      )}
    </div>
  </>;
}

const actionErrors: Record<string, string> = {
  MAINTENANCE_MODE: 'StageLink is temporarily read-only. You can still stop texts or remove your SMS contact.',
  SMS_DISABLED: 'SMS verification is temporarily unavailable.',
  SMS_VERIFICATION_REQUIRED: 'Verify your email address and mobile number before enabling texts.',
  EMAIL_VERIFICATION_REQUIRED: 'Verify your email address before requesting or confirming an SMS code.',
  SMS_CODE_INVALID: 'That code could not be confirmed. Check the code and delivery status, or request a new code.',
};
const field = 'rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 focus-visible:outline-2 focus-visible:outline-violet-400';

export default function SmsPreferences({ apiOrigin }: { apiOrigin: string | null }) {
  const [session, setSession] = useState<SmsSession | null>(null);
  const [contact, setContact] = useState<SmsContact | null>(null);
  const [history, setHistory] = useState<SmsHistory | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const api = apiOrigin ? createSmsPreferencesApi(apiOrigin) : null;

  async function perform(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      let failure = error;
      if (failure instanceof SmsApiError && failure.code === 'SMS_REVISION_CONFLICT' && api && session) {
        setContact(null);
        try {
          setContact(await api.contact(session));
          setNotice({ kind: 'alert', message: 'Your SMS preferences changed. Review the refreshed settings before trying again.' });
          return;
        } catch (refreshError) {
          failure = refreshError;
        }
      }

      let message = 'StageLink could not complete the request. Try again.';
      if (failure instanceof SmsApiError) {
        if (failure.status === 401) {
          setSession(null);
          setContact(null);
          setHistory(null);
          message = 'Your sign-in expired. Sign in again to continue.';
        } else if (failure.status === 429) {
          message = 'Too many requests. Wait a moment and try again.';
        } else {
          message = actionErrors[failure.code] ?? message;
        }
      }
      setNotice({ kind: 'alert', message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || busyRef.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    const passwordField = form.elements.namedItem('password');
    if (passwordField instanceof HTMLInputElement) passwordField.value = '';
    void perform(async () => {
      let signedIn: SmsSession;
      try {
        signedIn = await api.signIn(email, password);
      } catch (error) {
        if (!(error instanceof SmsApiError) || error.status !== 401) throw error;
        setNotice({ kind: 'alert', message: 'Check your email address and password.' });
        return;
      }
      setSession(signedIn);
      setContact(await api.contact(signedIn));
    });
  }

  function readPreferences() {
    if (!api || !session) return;
    void perform(async () => setContact(await api.contact(session)));
  }

  function readHistory() {
    if (!api || !session) return;
    void perform(async () => {
      setHistory(await api.history(session));
      setNotice({ kind: 'status', message: 'SMS delivery history loaded.' });
    });
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || !session?.emailVerified || !contact?.enabled || busyRef.current) return;
    const input = event.currentTarget.elements.namedItem('number') as HTMLInputElement;
    const number = normalizeSmsNumber(input.value);
    if (!number) {
      setNotice({ kind: 'alert', message: 'Enter a Sri Lankan mobile number, such as 07X XXX XXXX or +94 7X XXX XXXX.' });
      return;
    }
    input.value = '';
    void perform(async () => {
      const updated = await api.requestCode(session, contact.revision, number);
      setContact(updated);
      if (updated.pending) setNotice({ kind: 'status', message: 'Verification code requested.' });
    });
  }

  function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || !session?.emailVerified || !contact?.pending || busyRef.current) return;
    const challengeId = contact.pending.id;
    const input = event.currentTarget.elements.namedItem('code') as HTMLInputElement;
    const code = input.value.trim();
    if (!/^\d{6}$/.test(code)) {
      setNotice({ kind: 'alert', message: 'Enter the six-digit verification code.' });
      return;
    }
    input.value = '';
    void perform(async () => {
      const updated = await api.confirmCode(session, challengeId, code);
      setContact(updated);
      if (updated.verified) setNotice({ kind: 'status', message: 'Phone number verified. Choose which texts to receive below.' });
    });
  }

  function enable(topic: SmsTopic) {
    if (!api || !session?.emailVerified || !contact?.verified) return;
    void perform(async () => {
      setContact(await api.enable(session, contact, topic));
      setNotice({ kind: 'status', message: topic === 'booking' ? 'Booking texts are on.' : 'Promotional texts are on.' });
    });
  }

  function removeContact() {
    if (!api || !session || !contact) return;
    setConfirmRemoval(false);
    void perform(async () => {
      setContact(await api.remove(session, contact.revision));
      setNotice({ kind: 'status', message: 'SMS contact removed and both text preferences turned off.' });
    });
  }

  function stop(channel: SmsChannel) {
    if (!api || !session) return;
    void perform(async () => {
      setContact(await api.stop(session, channel));
      setNotice({ kind: 'status', message: stopped[channel] });
    });
  }

  function signOut() {
    if (!api || !session) return;
    void perform(async () => {
      await api.signOut(session);
      setSession(null);
      setContact(null);
      setHistory(null);
      setNotice({ kind: 'status', message: 'Signed out of SMS preferences.' });
    });
  }

  return <main className="relative min-h-screen px-5 py-10 sm:px-8">
    <div className="mx-auto max-w-xl">
      <a className="text-sm text-violet-300 underline underline-offset-4" href="/">Back to StageLink</a>
      <h1 className="mt-6 mb-5 font-display text-4xl font-bold">SMS preferences</h1>
      <section className="card p-5 sm:p-7" aria-busy={busy}>
        {notice && <p role={notice.kind} className={notice.kind === 'alert' ? 'mb-4 text-rose-300' : 'mb-4 text-emerald-300'}>{notice.message}</p>}
        {!api ? <p>SMS preferences are unavailable on this site.</p> : !session ? (
          <form className="grid gap-4" onSubmit={signIn}>
            <p className="text-slate-300">Sign in to the StageLink account that receives the texts.</p>
            <label className="grid gap-2 text-sm">Email address
              <input className={field} name="email" type="email" autoComplete="username" maxLength={200} disabled={busy} required />
            </label>
            <label className="grid gap-2 text-sm">Password
              <input className={field} name="password" type="password" autoComplete="current-password" maxLength={128} disabled={busy} required />
            </label>
            <button className="btn-primary justify-self-start" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="break-all text-sm text-slate-300">Signed in as {session.email}</p>
              <button className="btn-ghost" type="button" disabled={busy} onClick={signOut}>Sign out</button>
            </div>
            {!contact ? <button className="btn-primary" type="button" disabled={busy} onClick={readPreferences}>{busy ? 'Loading SMS preferences…' : 'Retry loading preferences'}</button> : (
              <div className="grid gap-5">
                <section aria-labelledby="sms-contact-title" className="grid gap-4 border-t border-slate-800 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 id="sms-contact-title" className="font-semibold">Mobile number</h2>
                      <p className="text-sm text-slate-300">{contact.verified && contact.last4 ? 'Verified phone ending in ' + contact.last4 : 'No verified SMS contact.'}</p>
                    </div>
                    <button className="btn-ghost" type="button" disabled={busy} onClick={readPreferences}>Refresh status</button>
                  </div>
                  {!session.emailVerified && <p className="text-sm text-slate-300">Verify your email, then sign in again to verify a number or enable texts.</p>}
                  {!contact.enabled && <p className="text-sm text-slate-300">New verification codes are temporarily unavailable.</p>}
                  {contact.pending && (
                    <div className="grid gap-3 rounded-xl border border-slate-700 p-4">
                      <p className="text-sm text-slate-300">
                        Code for number ending in {contact.pending.last4}. {formatDeliveryStatus(contact.pending.status)}.
                        {' '}Expires at <time dateTime={contact.pending.expiresAt}>{new Date(contact.pending.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>.
                      </p>
                      {session.emailVerified && !['failed', 'cancelled'].includes(contact.pending.status) && (
                        <form key={contact.pending.id} className="grid gap-3" onSubmit={confirmCode}>
                          <label className="grid gap-2 text-sm">Six-digit code
                            <input className={field} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} required />
                          </label>
                          <button className="btn-primary justify-self-start" type="submit" disabled={busy}>Verify number</button>
                        </form>
                      )}
                    </div>
                  )}
                  {session.emailVerified && contact.enabled && (
                    <form className="grid gap-3" onSubmit={requestCode}>
                      <label className="grid gap-2 text-sm">{contact.verified ? 'Replacement mobile number' : 'Sri Lankan mobile number'}
                        <input className={field} name="number" type="tel" autoComplete="off" placeholder="07X XXX XXXX" maxLength={24} disabled={busy} required />
                      </label>
                      {contact.verified && <p className="text-sm text-slate-300">Confirming a replacement number turns off both text preferences.</p>}
                      {contact.pending && <p className="text-sm text-slate-300">Requesting a new code cancels the current code.</p>}
                      <button className="btn-ghost justify-self-start" type="submit" disabled={busy}>{contact.pending ? 'Send a new code' : 'Send verification code'}</button>
                    </form>
                  )}
                  {(contact.verified || contact.pending) && (
                    <button className="btn-ghost justify-self-start" type="button" disabled={busy} onClick={() => setConfirmRemoval(true)}>
                      {contact.verified ? 'Remove SMS contact' : 'Cancel verification'}
                    </button>
                  )}
                </section>
                <section aria-labelledby="sms-consent-title" className="grid gap-4 border-t border-slate-800 pt-5">
                  <h2 id="sms-consent-title" className="font-semibold">Text preferences</h2>
                  {topics.map(({ id, label }) => {
                    const active = id === 'booking' ? contact.bookingConsent : contact.marketingConsent;
                    const topicLabel = label.toLowerCase();
                    return <div key={id} className="flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="font-medium">{label}</h3><p className="text-sm text-slate-300">{active ? 'On' : 'Off'}</p></div>
                      {active ? (
                        <button className="btn-ghost" type="button" disabled={busy} onClick={() => stop(id)}>Stop {topicLabel}</button>
                      ) : (
                        <button className="btn-ghost" type="button" disabled={busy || !session.emailVerified || !contact.verified} onClick={() => enable(id)}>Enable {topicLabel}</button>
                      )}
                    </div>;
                  })}
                  {!contact.verified && session.emailVerified && <p className="text-sm text-slate-300">Verify your mobile number to enable texts.</p>}
                  {contact.bookingConsent && contact.marketingConsent && <button className="btn-primary justify-self-start" type="button" disabled={busy} onClick={() => stop('all')}>Stop both types of texts</button>}
                </section>
                <section aria-labelledby="sms-history-title" className="grid gap-4 border-t border-slate-800 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="sms-history-title" className="font-semibold">SMS delivery history</h2>
                    <button className="btn-ghost" type="button" disabled={busy} onClick={readHistory}>{history ? 'Refresh history' : 'Load history'}</button>
                  </div>
                  {history && <DeliveryHistory history={history} />}
                </section>
                {confirmRemoval && (
                  <ConfirmDialog
                    title={contact.verified ? 'Remove your SMS contact?' : 'Cancel this verification?'}
                    confirm={contact.verified ? 'Remove contact' : 'Cancel verification'}
                    onClose={() => setConfirmRemoval(false)}
                    onConfirm={removeContact}
                  >
                    {contact.verified ? 'This removes your verified number, turns off both text preferences and cancels any pending code.' : 'The verification code will expire immediately.'}
                  </ConfirmDialog>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  </main>;
}
