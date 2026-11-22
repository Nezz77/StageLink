import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { configuredSessionApi, type PendingEmailChange } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import { Modal, Notice } from './DashboardUI';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'StageLink could not complete this email settings request. Try again.';

export default function AccountEmailSettings({ email, onClose }: { email: string; onClose: () => void }) {
  const api = configuredSessionApi;
  const [pending, setPending] = useState<PendingEmailChange | null | undefined>(undefined);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);

  const run = useCallback(async (write?: () => Promise<unknown>, message = '') => {
    if (!api || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (write) {
        await write();
        if (controller.signal.aborted) return;
        setNotice(message);
        setPending(undefined);
      }
      const latest = await api.pendingEmailChange(controller.signal);
      if (!controller.signal.aborted) setPending(latest);
    } catch (issue) {
      if (!controller.signal.aborted) setError(errorMessage(issue));
    } finally {
      if (!controller.signal.aborted) {
        operation.current = null;
        setBusy(false);
      }
    }
  }, [api]);

  useEffect(() => {
    void run();
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [run]);

  function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || operation.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const address = String(fields.get('email') ?? '').trim().toLowerCase();
    const password = String(fields.get('password') ?? '');
    if (address === email.toLowerCase()) {
      setNotice('');
      setError('Enter an email address different from your current address.');
      return;
    }
    const passwordField = form.elements.namedItem('password');
    if (passwordField instanceof HTMLInputElement) passwordField.value = '';
    void run(
      () => api.requestEmailChange(address, password),
      'If the address is available, a confirmation link will arrive. Your current email stays active until you confirm.',
    );
  }

  return <Modal title="Email settings" onClose={onClose}>
    <div className="mg-page" aria-busy={busy}>
      <p>Current email <strong className="break-all">{email}</strong></p>
      {pending === undefined && busy && <p role="status">Checking for a pending change…</p>}
      {pending && <section className="grid gap-2" aria-label="Pending email change">
        <p>Awaiting confirmation for <strong className="break-all">{pending.email}</strong>.</p>
        <p>The link expires <time dateTime={pending.expiresAt}>{dateFormat.format(new Date(pending.expiresAt))}</time>.</p>
        <button className="btn-ghost justify-self-start" type="button" disabled={busy} onClick={() => {
          if (api) void run(() => api.cancelEmailChange(), 'Pending email change cancelled.');
        }}>Cancel pending change</button>
      </section>}
      <Notice>{notice}</Notice>
      <Notice error>{error}</Notice>
      <button className="btn-ghost justify-self-start" type="button" disabled={busy} onClick={() => void run()}>Refresh status</button>
      {pending !== undefined && <form className="grid gap-3" onSubmit={request}>
        <label className="mg-field">New email address
          <input type="email" name="email" autoComplete="email" maxLength={200} required disabled={busy} />
        </label>
        <label className="mg-field">Current password
          <input type="password" name="password" autoComplete="current-password" maxLength={128} required disabled={busy} />
        </label>
        {pending && <p className="text-sm">Requesting another change expires the previous link.</p>}
        <button className="btn-primary justify-self-start" type="submit" disabled={busy}>Send confirmation link</button>
      </form>}
    </div>
  </Modal>;
}
