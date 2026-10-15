import { EmailVerification } from './AccountRecovery';
import { useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { useDashboard } from '../lib/DashboardContext';
import { draftKey, profileErrors, type MemberRole, type Profile } from '../lib/dashboard';
import { DashboardIntro } from './DashboardShell';
import { Badge, Notice, Panel, useDraftGuard } from './DashboardUI';

export default function MemberProfile() {
  const { actor } = useBooking();
  const { state, dispatch } = useDashboard();
  const role = actor as MemberRole;
  const savedDraft = state.drafts[draftKey(actor, 'profile')];
  const [form, setForm] = useState<Profile>(() => ({ ...state.profiles[role], ...savedDraft }));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [notice, setNotice] = useState(savedDraft ? 'Your saved profile draft is ready to continue.' : '');
  const guard = useDraftGuard(dirty);
  const title = role === 'customer' ? 'Your profile' : role === 'artist' ? 'Artist profile' : 'Business profile';
  const change = (key: keyof Profile, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setDirty(true); setErrors(previous => ({ ...previous, [key]: undefined })); setNotice(''); };
  return <div className="mg-page">
    <DashboardIntro eyebrow="THE PEOPLE BEHIND THE PERFORMANCE" title="Make it" emphasis="personal." description="Keep your contact details and introduction up to date." />
    <div className="mg-split">
      <Panel title={title} eyebrow="YOUR DETAILS"><Notice>{notice}</Notice>
        <form noValidate onSubmit={event => {
          event.preventDefault(); const issues = profileErrors(form); setErrors(issues);
          if (Object.keys(issues).length) return;
          if (dispatch({ type: 'profile', profile: form })) { setDirty(false); setNotice('Profile saved for this demo session.'); }
        }}>
          <div className="mg-fields">{([['name', role === 'renter' ? 'Business name' : 'Display name'], ['email', 'Email address'], ['city', 'City'], ['phone', 'Phone number'], ['specialty', role === 'artist' ? 'Genre / specialty' : role === 'renter' ? 'Equipment specialty' : 'Organization / role']] as const).map(([key, label]) => <label className="mg-field" key={key}>{label}<input aria-label={label} value={form[key]} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} maxLength={key === 'email' ? 200 : 120} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `profile-${key}-error` : undefined} onChange={event => change(key, event.target.value)} />{errors[key] && <small id={`profile-${key}-error`} className="mg-error">{errors[key]}</small>}</label>)}</div>
          <label className="mg-field">About you<textarea aria-label="About you" value={form.bio} rows={5} maxLength={2000} onChange={event => change('bio', event.target.value)} /><small>{form.bio.length}/2,000</small></label>
          <div className="mg-actions"><button className="btn-ghost" type="button" onClick={() => { if (dispatch({ type: 'draft', key: 'profile', values: form })) { setDirty(false); setNotice('Profile draft saved for later in this session.'); } }}><Save size={15} />Save for later</button><button className="btn-primary">Save profile</button></div>
        </form>
      </Panel>
      <Panel title="Your backstage pass" eyebrow="SAVED PROFILE" className="mg-profile-pass"><div className="mg-profile-symbol"><UserRound size={32} /></div><h3>{state.profiles[role].name}</h3><p>{state.profiles[role].specialty}</p><p>{state.profiles[role].city}</p><Badge value="live">Demo account</Badge><div className="mg-rule" /><p>Saved details stay available when you navigate or switch roles. Drafts and changes reset on refresh.</p></Panel>
    </div><EmailVerification />{guard}
  </div>;
}
