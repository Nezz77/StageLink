import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, Save, UserRound } from 'lucide-react';
import { configuredSessionApi, type ApiAccount } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import { memberProfileErrors, memberProfileLimits, profileFields, type MemberProfileInput, type ProfileField, type SavedMemberProfile } from '../lib/memberProfile';
import { configuredSmsApiOrigin, smsPreferencesPath } from '../lib/smsPreferences';
import AccountEmailSettings from './AccountEmailSettings';
import { DashboardIntro } from './DashboardShell';
import { Badge, Notice, Panel, requestDashboardNavigation, useDraftGuard } from './DashboardUI';

const fields = [
  { key: 'displayName', label: 'Display name', type: 'text', autoComplete: 'name' },
  { key: 'city', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { key: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
  { key: 'organization', label: 'Organization / role', type: 'text', autoComplete: 'organization' },
] as const;
const errorMessage = (issue: unknown) => issue instanceof ApiError ?
  issue.message + (issue.requestId ? ' Reference: ' + issue.requestId : '') :
  'Your profile could not be loaded or saved. Try again.';
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function ConnectedMemberProfile({ account }: { account: ApiAccount }) {
  const api = configuredSessionApi;
  const [saved, setSaved] = useState<SavedMemberProfile | null>(null);
  const [form, setForm] = useState<MemberProfileInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof memberProfileErrors>>({});
  const [emailSettings, setEmailSettings] = useState(false);
  const request = useRef<AbortController | null>(null);
  const dirty = Boolean(saved && form && profileFields.some(key => form[key] !== saved[key]));
  const guard = useDraftGuard(dirty, 'Your profile changes have not been saved. Return to save them, or discard these edits before leaving.');

  const load = useCallback(async () => {
    if (!api || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const profile = await api.memberProfile(controller.signal);
      if (!controller.signal.aborted) {
        setSaved(profile);
        setForm(profile);
        setErrors({});
      }
    } catch (issue) {
      if (!controller.signal.aborted) setError(errorMessage(issue));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [load]);

  function change(key: ProfileField, value: string) {
    setForm(current => current && { ...current, [key]: value });
    setErrors(current => ({ ...current, [key]: undefined }));
    setNotice('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!api || !form || !dirty || request.current) return;
    const issues = memberProfileErrors(form);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const profile = await api.saveMemberProfile(form, controller.signal);
      if (controller.signal.aborted) return;
      setSaved(profile);
      setForm(profile);
      setNotice('Your profile is saved to your account.');
      await api.me().catch(() => {
        if (!controller.signal.aborted) setNotice('Your profile is saved. Your account name will refresh the next time your session is restored.');
      });
    } catch (issue) {
      if (!controller.signal.aborted) setError(errorMessage(issue));
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (!api) return <Notice error>Profile access is unavailable.</Notice>;
  return <div className="mg-page" aria-busy={loading || saving}>
    <DashboardIntro eyebrow="THE PEOPLE BEHIND THE PERFORMANCE" title="Make it" emphasis="personal." description="Keep your contact details and introduction up to date." />
    {loading && <p role="status"><LoaderCircle className="mg-spin inline" size={20} /> Loading your saved profile…</p>}
    {!loading && (!saved || !form) && <Panel title="Your profile">
      <Notice error>{error}</Notice>
      <button className="btn-primary" type="button" onClick={() => void load()}>Retry loading profile</button>
    </Panel>}
    {!loading && saved && form && <div className="mg-split">
      <Panel title="Your profile" eyebrow="YOUR DETAILS">
        <p>Your contact details and introduction stay private.</p>
        <form noValidate onSubmit={event => void save(event)}>
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <div className="mg-fields">{fields.map(({ key, label, type, autoComplete }) => <label className="mg-field" key={key}>
              {label}
              <input type={type} value={form[key]} autoComplete={autoComplete}
                required={key === 'displayName'} minLength={key === 'displayName' ? 2 : undefined}
                maxLength={memberProfileLimits[key]} aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `member-${key}-error` : undefined}
                onChange={event => change(key, event.target.value)} />
              {errors[key] && <small id={`member-${key}-error`} className="mg-error">{errors[key]}</small>}
            </label>)}</div>
            <label className="mg-field">
              About you
              <textarea rows={5} value={form.bio} maxLength={memberProfileLimits.bio}
                aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? 'member-bio-error' : undefined}
                onChange={event => change('bio', event.target.value)} />
              <small>{form.bio.length.toLocaleString()}/2,000</small>
              {errors.bio && <small id="member-bio-error" className="mg-error">{errors.bio}</small>}
            </label>
          </fieldset>
          <Notice error>{error}</Notice>
          <Notice>{notice}</Notice>
          <div className="mg-actions">
            <button className="btn-primary" disabled={saving || !dirty}>
              {saving ? <LoaderCircle className="mg-spin" size={15} /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button className="btn-ghost" type="button" disabled={saving} onClick={() => requestDashboardNavigation(() => { void load(); })}>
              Reload latest profile
            </button>
          </div>
        </form>
      </Panel>
      <Panel title="Your backstage pass" eyebrow="SAVED PROFILE" className="mg-profile-pass">
        <div className="mg-profile-symbol"><UserRound size={32} /></div>
        <h3>{saved.displayName}</h3>
        {saved.organization && <p>{saved.organization}</p>}
        {saved.city && <p>{saved.city}</p>}
        <div className="mg-rule" />
        {saved.updatedAt && <p>Last saved <time dateTime={saved.updatedAt}>{dateFormat.format(new Date(saved.updatedAt))}</time>.</p>}
      </Panel>
    </div>}
    <Panel title="Sign-in email" eyebrow="ACCOUNT ACCESS">
      <p className="break-all">{account.email}</p>
      <Badge value={account.emailVerified ? 'approved' : 'pending'}>{account.emailVerified ? 'Email verified' : 'Verification required'}</Badge>
      <p>Your current email remains active until you confirm a new address.</p>
      <button className="btn-ghost" type="button" disabled={saving} onClick={() => setEmailSettings(true)}>Manage sign-in email</button>
    </Panel>
    {configuredSmsApiOrigin && <Panel title="SMS preferences"><a className="text-violet-300 underline underline-offset-4" href={smsPreferencesPath}>Manage booking and promotional texts</a></Panel>}
    {emailSettings && <AccountEmailSettings email={account.email} onClose={() => setEmailSettings(false)} />}
    {guard}
  </div>;
}
