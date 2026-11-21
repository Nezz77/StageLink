import { useRef, useState, type FormEvent } from 'react';
import { createSmsPreferencesApi, SmsApiError, type SmsChannel, type SmsContact, type SmsSession } from '../lib/smsPreferences';

type Notice = { kind: 'status' | 'alert'; message: string };

const stopped: Record<SmsChannel, string> = {
  booking: 'Booking texts are off.',
  marketing: 'Promotional texts are off.',
  all: 'Booking and promotional texts are off.',
};
const field = 'rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 focus-visible:outline-2 focus-visible:outline-violet-400';

export default function SmsPreferences({ apiOrigin }: { apiOrigin: string | null }) {
  const [session, setSession] = useState<SmsSession | null>(null);
  const [contact, setContact] = useState<SmsContact | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
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
      let message = 'StageLink could not complete the request. Try again.';
      if (error instanceof SmsApiError && error.status === 401) {
        setSession(null);
        setContact(null);
        message = 'Your sign-in expired. Sign in again to continue.';
      }
      if (error instanceof SmsApiError && error.status === 429) message = 'Too many requests. Wait a moment and try again.';
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
              <div className="grid gap-4">
                <p className="text-sm text-slate-300">{contact.verified && contact.last4 ? 'Verified phone ending in ' + contact.last4 : 'No verified SMS contact.'}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-semibold">Booking texts</h2><p className="text-sm text-slate-300">{contact.bookingConsent ? 'On' : 'Off'}</p></div>
                  <button className="btn-ghost" type="button" disabled={busy || !contact.bookingConsent} onClick={() => stop('booking')}>Stop booking texts</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-semibold">Promotional texts</h2><p className="text-sm text-slate-300">{contact.marketingConsent ? 'On' : 'Off'}</p></div>
                  <button className="btn-ghost" type="button" disabled={busy || !contact.marketingConsent} onClick={() => stop('marketing')}>Stop promotional texts</button>
                </div>
                {contact.bookingConsent && contact.marketingConsent && <button className="btn-primary justify-self-start" type="button" disabled={busy} onClick={() => stop('all')}>Stop both types of texts</button>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  </main>;
}
