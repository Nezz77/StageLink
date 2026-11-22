import { useAppearance } from '../lib/AppearanceContext';
import { SwitchMode } from './SwitchMode';
import { useState } from 'react';
import { Modal, Notice } from './DashboardUI';
import { configuredSessionApi } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';

type Props = { initialEmail: string; onClose: () => void; initialToken?: string };
export default function ConnectedAccountRecovery({ initialEmail, onClose, initialToken }: Props) {
  const appearance = useAppearance();
  const [linkMode, setLinkMode] = useState(Boolean(initialToken));
  const [step, setStep] = useState<'email' | 'token' | 'password' | 'done'>(initialToken ? 'token' : 'email');
  const [email, setEmail] = useState(initialEmail), [token, setToken] = useState(initialToken ?? '');
  const [grant, setGrant] = useState<{ value: string; expires: number } | null>(null);
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setError('');
    if (!configuredSessionApi) { setError('Account access is unavailable.'); return; }
    if (step === 'password' && (password.length < 12 || password.length > 128 || password !== confirmation)) { setError(password !== confirmation ? 'The passwords do not match.' : 'Use a password with 12–128 characters.'); return; }
    if (step === 'password' && (!grant || Date.now() >= grant.expires)) { setError('This reset session expired. Request a new email.'); setStep('email'); setLinkMode(false); setGrant(null); setPassword(''); setConfirmation(''); return; }
    setBusy(true);
    try {
      if (step === 'email') {
        await configuredSessionApi.requestPasswordReset(email.trim()); setStep('token'); setNotice('If this email is eligible, a reset message will arrive. Open its link or paste the reset token below.');
      } else if (step === 'token') {
        const result = await configuredSessionApi.verifyPasswordReset(token.trim()); setGrant({ value: result.grant, expires: Date.now() + result.expiresIn * 1000 }); setToken(''); setNotice(''); setStep('password');
      } else if (step === 'password' && grant) {
        await configuredSessionApi.completePasswordReset(grant.value, password); setGrant(null); setPassword(''); setConfirmation(''); setStep('done');
      }
    } catch (issue) { setError(issue instanceof ApiError ? issue.message : 'Account recovery is unavailable. Try again.'); }
    finally { setBusy(false); }
  }
  return <Modal title={step === 'done' ? 'Password updated' : step === 'password' ? 'Choose a new password' : 'Recover your account'} onClose={onClose}>
    <div className="sl-recovery-theme"><SwitchMode width={80} height={38} isDark={appearance.isDark} onChange={appearance.onThemeChange} /></div>
    {step === 'done' ? <div className="mg-page"><Notice>Your password has been updated and existing sessions have been revoked. Sign in with your new password.</Notice><button className="btn-primary" type="button" onClick={onClose}>Back to sign in</button></div> : <form className="mg-page" onSubmit={submit}>
      {notice && <Notice>{notice}</Notice>}
      {step === 'email' ? <label className="mg-field">Recovery email<input type="email" aria-label="Recovery email" autoComplete="email" maxLength={200} required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} /></label> : step === 'token' ? linkMode ? <p>Your email link is ready. Continue to choose a new password.</p> : <label className="mg-field">Reset token<input aria-label="Reset token" autoComplete="off" spellCheck={false} minLength={43} maxLength={43} required disabled={busy} value={token} onChange={event => setToken(event.target.value)} /></label> : <>
        <label className="mg-field">New password<input type="password" aria-label="New password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label className="mg-field">Confirm new password<input type="password" aria-label="Confirm new password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      </>}
      <Notice error>{error}</Notice>
      <div className="mg-actions"><button className="btn-ghost" type="button" disabled={busy} onClick={() => { setStep('email'); setLinkMode(false); setToken(''); setGrant(null); setPassword(''); setConfirmation(''); setError(''); setNotice(''); }}>Start again</button><button className="btn-primary" disabled={busy}>{busy ? 'Please wait…' : step === 'email' ? 'Send reset email' : step === 'token' ? 'Continue securely' : 'Update password'}</button></div>
    </form>}
  </Modal>;
}
