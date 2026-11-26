import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Landmark } from 'lucide-react';
import { configuredSessionApi } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import type { PayoutDestination } from '../lib/payoutDestination';
import ConfirmDialog from './ConfirmDialog';
import { DashboardIntro } from './DashboardShell';
import { Badge, Notice, Panel, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

const labels = { pending: 'Awaiting review', approved: 'Destination approved', rejected: 'Changes requested' };
const publicError = (issue: unknown) => issue instanceof ApiError ? issue.message : 'The payout destination request could not be completed. Try again.';

export default function ConnectedPayoutDestination({ emailVerified }: { emailVerified: boolean }) {
  const api = configuredSessionApi;
  const [current, setCurrent] = useState<PayoutDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmLastFour, setConfirmLastFour] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const request = useRef<AbortController | null>(null);
  const guard = useDraftGuard(dirty, 'Your changes have not been submitted. Return to finish them, or discard these details before leaving.');

  const apply = useCallback((destination: PayoutDestination | null) => {
    setCurrent(destination);
    setLoaded(true);
    setDirty(false);
    setFormVersion(value => value + 1);
  }, []);

  const reload = useCallback(async () => {
    if (!api || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const destination = await api.payoutDestination(controller.signal);
      if (!controller.signal.aborted) apply(destination);
    } catch (issue) {
      if (!controller.signal.aborted) setError(publicError(issue));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api, apply]);

  useEffect(() => {
    void reload();
    return () => { request.current?.abort(); request.current = null; };
  }, [reload]);

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || !emailVerified) return;
    const data = new FormData(event.currentTarget);
    const number = String(data.get('number') ?? '').trim();
    if (!/^\d{6,18}$/.test(number)) {
      setError('Enter a 6–18 digit account number.');
      return;
    }
    if (['holder', 'bank', 'branch'].some(key => String(data.get(key) ?? '').trim().length < 2)) {
      setError('Fill in the holder, bank and branch.');
      return;
    }
    setError('');
    setConfirmLastFour(number.slice(-4));
  }

  async function submit() {
    if (!api || !formRef.current || request.current || !emailVerified || !confirmLastFour) return;
    const data = new FormData(formRef.current);
    const value = (key: string) => String(data.get(key) ?? '');
    const input = { revision: current?.revision ?? 0, holder: value('holder').trim(),
      bank: value('bank').trim(), branch: value('branch').trim(), number: value('number').trim(), password: value('password') };
    const password = formRef.current.elements.namedItem('password');
    if (password instanceof HTMLInputElement) password.value = '';
    setConfirmLastFour('');
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const destination = await api.savePayoutDestination(input, controller.signal);
      if (!destination) throw Error('Missing saved destination');
      if (!controller.signal.aborted) {
        apply(destination);
        setNotice('Payout destination submitted for review.');
      }
    } catch (issue) {
      if (!controller.signal.aborted) setError(publicError(issue));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (!api) return <Notice error>Payout destination access is unavailable.</Notice>;
  return <div className="mg-page" aria-busy={loading || saving}>
    <DashboardIntro eyebrow="PAYOUT DESTINATION" title="Manage your" emphasis="payout account." description="Submit your bank destination for administrator review." />
    <Notice error>{error}</Notice>
    <Notice>{notice}</Notice>
    {loading && <p role="status">Loading your payout destination…</p>}
    {!loading && !loaded && <button className="btn-primary" onClick={() => void reload()}>Retry loading</button>}
    {!loading && loaded && <div className="mg-split">
      <Panel title={current ? 'Replace payout destination' : 'Add payout destination'}>
        {!emailVerified && <Notice>Verify your email before submitting a payout destination.</Notice>}
        <form ref={formRef} key={formVersion} onSubmit={start} onChange={() => { setDirty(true); setNotice(''); }}>
          <fieldset className="m-0 min-w-0 border-0 p-0" disabled={saving || !emailVerified}>
            <div className="mg-fields">
              <label className="mg-field">Account holder<input name="holder" required minLength={2} maxLength={100} defaultValue={current?.holder} /></label>
              <label className="mg-field">Bank name<input name="bank" required minLength={2} maxLength={100} defaultValue={current?.bank} /></label>
              <label className="mg-field">Branch / routing reference<input name="branch" required minLength={2} maxLength={100} defaultValue={current?.branch} /></label>
              <label className="mg-field">Account number<input name="number" required inputMode="numeric" pattern="[0-9]{6,18}" autoComplete="off" maxLength={18} /></label>
            </div>
            <label className="mg-field">Current account password<input name="password" type="password" required maxLength={128} autoComplete="current-password" /></label>
          </fieldset>
          <div className="mg-actions">
            <button className="btn-primary" disabled={saving || !emailVerified}>{saving ? 'Submitting…' : 'Review details'}</button>
            <button className="btn-ghost" type="button" disabled={saving} onClick={() => requestDashboardNavigation(() => { void reload(); })}>Reload latest destination</button>
          </div>
        </form>
      </Panel>
      <Panel title="Current destination" className="mg-profile-pass">
        <Landmark size={32} />
        {current ? <>
          <h3>{current.holder}</h3>
          <p>{current.bank} · {current.branch}</p>
          <p>Account ending {current.accountLast4}</p>
          <Badge value={current.status}>{labels[current.status]}</Badge>
          {current.reviewReason && <p className="break-words">{current.reviewReason}</p>}
        </> : <p>No payout destination submitted.</p>}
        <p>Bank destination review and payout execution are separate steps.</p>
      </Panel>
    </div>}
    {confirmLastFour && <ConfirmDialog title="Submit this payout destination?" confirm="Submit for review"
      onClose={() => setConfirmLastFour('')} onConfirm={() => void submit()}>
      <p>Account ending {confirmLastFour}.</p>
      <p>{current ? 'This replaces the current destination. The replacement requires a new review.' : 'StageLink will send this destination for review.'}</p>
    </ConfirmDialog>}
    {guard}
  </div>;
}
