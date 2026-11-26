import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { configuredSessionApi, type ApiAccount } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import type { ProviderSubmission } from '../lib/providerProfile';
import ConfirmDialog from './ConfirmDialog';
import { DashboardIntro } from './DashboardShell';
import { Badge, Empty, Notice, Panel, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const rate = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' });
const key = (item: ProviderSubmission) => item.userId + ':' + item.kind;
const message = (issue: unknown) => issue instanceof ApiError ? issue.message : 'The review request could not be completed. Try again.';

export default function ProviderProfileReview({ account }: { account: ApiAccount }) {
  const api = configuredSessionApi;
  const [queue, setQueue] = useState<ProviderSubmission[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const operation = useRef<AbortController | null>(null);
  const selected = queue.find(item => key(item) === selection);
  const draftGuard = useDraftGuard(Boolean(reason.trim()), 'Your review decision has not been submitted. Return to finish it, or discard the reason.');

  const load = useCallback(async () => {
    if (!api || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    setError('');
    try {
      const items = await api.pendingProviderProfiles(controller.signal);
      if (!controller.signal.aborted) {
        setQueue(items);
        setSelection(previous => items.some(item => key(item) === previous) ? previous : null);
        setReason('');
      }
    } catch (issue) {
      if (!controller.signal.aborted) setError(message(issue));
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [load]);

  async function decide(approved: boolean) {
    if (!api || !selected || operation.current || !account.emailVerified || account.id === selected.userId) return;
    const explanation = reason.trim();
    if (explanation.length < 10 || explanation.length > 2000) return;
    const item = selected;
    const controller = new AbortController();
    operation.current = controller;
    setConfirmation(null);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.reviewProviderProfile(item.userId, item.kind, {
        revision: item.revision, approved, reason: explanation,
      }, controller.signal);
      if (!controller.signal.aborted) {
        setNotice(result);
        setQueue(previous => previous.filter(candidate => key(candidate) !== key(item)));
        setSelection(null);
        setReason('');
      }
    } catch (issue) {
      if (!controller.signal.aborted) setError(message(issue));
    } finally {
      if (operation.current === controller) operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!selected || operation.current) return;
    if (reason.trim().length < 10) {
      setError('Enter a reason with at least 10 characters.');
      return;
    }
    setError('');
    setConfirmation(submitter instanceof HTMLButtonElement && submitter.value === 'approve');
  }

  if (!api) return <Notice error>Provider review is unavailable.</Notice>;
  const reviewingOwnProfile = selected?.userId === account.id;
  return <div className="mg-page" aria-busy={busy || loading}>
    <DashboardIntro eyebrow="PUBLICATION REVIEW" title="Provider" emphasis="profiles" description="Review the public information submitted by artists and equipment providers." />
    <Notice error>{error}</Notice>
    <Notice>{notice}</Notice>
    <button className="btn-ghost" type="button" disabled={busy || loading} onClick={() => requestDashboardNavigation(() => { void load(); })}>Refresh submissions</button>
    {loading && <p role="status">Loading pending submissions…</p>}
    {!loading && !error && !queue.length && <Empty title="No profiles awaiting review" />}
    {!loading && queue.length > 0 && <div className="mg-review-layout">
      <Panel title="Awaiting review">
        <div className="mg-case-list">{queue.map(item => <button key={key(item)} type="button" disabled={busy} aria-pressed={selection === key(item)} className={selection === key(item) ? 'selected' : ''} onClick={() => {
          if (selection === key(item)) return;
          requestDashboardNavigation(() => { setSelection(key(item)); setReason(''); setError(''); setNotice(''); });
        }}>
          <strong>{item.displayName}</strong>
          <p>{item.kind === 'artist' ? 'Artist' : 'Equipment provider'} · {item.city}</p>
        </button>)}</div>
        {queue.length === 25 && <p>Showing the first 25 pending profiles. Refresh to see further submissions after reviewing these.</p>}
      </Panel>
      {selected ? <Panel title={selected.displayName} eyebrow="SUBMITTED PROFILE">
        <Badge value="pending">Under review</Badge>
        <p>{selected.city} · {selected.serviceRadiusKm} km service radius</p>
        <p className="break-words whitespace-pre-wrap">{selected.bio}</p>
        {'category' in selected.details ? <>
          <p>{selected.details.category} · {selected.details.genres.join(', ')}</p>
          <p>{selected.details.experienceYears} years of experience · {rate.format(selected.details.baseRateMinor / 100)} starting rate</p>
        </> : <>
          <p>{selected.details.equipmentCategories.join(', ')} · {selected.details.deliveryOffered ? 'Delivery offered' : 'Collection only'}</p>
          <p className="break-words whitespace-pre-wrap">{selected.details.rentalTerms}</p>
          <ul>{selected.details.operatingHours.map(({day, opens, closes}) => <li key={day}>{dayNames[day]} {opens && closes ? opens + '–' + closes : 'closed'}</li>)}</ul>
        </>}
        <p>Revision {selected.revision} · <time dateTime={selected.updatedAt}>{dateFormat.format(new Date(selected.updatedAt))}</time></p>
        {!account.emailVerified && <Notice>Verify your email before deciding on submissions.</Notice>}
        {reviewingOwnProfile && <Notice>Another administrator must review your submission.</Notice>}
        <form onSubmit={start}>
          <label className="mg-field">Decision reason<textarea value={reason} required minLength={10} maxLength={2000} rows={4} disabled={busy || reviewingOwnProfile || !account.emailVerified} onChange={event => setReason(event.target.value)} /></label>
          <div className="mg-actions">
            <button className="btn-ghost" value="changes" disabled={busy || reviewingOwnProfile || !account.emailVerified}>Request changes</button>
            <button className="btn-primary" value="approve" disabled={busy || reviewingOwnProfile || !account.emailVerified}>Approve profile</button>
          </div>
        </form>
      </Panel> : <Empty title="Select a profile to review" />}
    </div>}
    {confirmation !== null && selected && <ConfirmDialog
      title={confirmation ? 'Approve this profile?' : 'Request profile changes?'}
      confirm={confirmation ? 'Confirm approval' : 'Send decision'}
      onClose={() => setConfirmation(null)}
      onConfirm={() => void decide(confirmation)}
    >{confirmation ? 'The approved profile will appear publicly.' : 'The provider will see your reason and can submit a new revision.'}</ConfirmDialog>}
    {draftGuard}
  </div>;
}
