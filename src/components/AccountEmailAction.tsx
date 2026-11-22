import { AppearanceProvider } from '../lib/AppearanceContext';
import { SwitchMode } from './SwitchMode';
import { useState } from 'react';
import { configuredSessionApi } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
import type { EmailAction } from '../lib/emailAction';
import ConnectedAccountRecovery from './ConnectedAccountRecovery';

function EmailActionView({ action }: { action: EmailAction }) {
  const [done, setDone] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const title = action.kind === 'verify' ? 'Verify your email' : action.kind === 'emailchange' ? 'Confirm your new email' : 'Reset your password';
  async function confirm() {
    if (!configuredSessionApi || !action.token || busy) return;
    setBusy(true); setError('');
    try {
      if (action.kind === 'verify') {
        await configuredSessionApi.confirmEmail(action.token); setDone(true);
        if (configuredSessionApi.snapshot()) await configuredSessionApi.me().catch(() => {});
      } else { await configuredSessionApi.confirmEmailChange(action.token); setDone(true); }
    } catch (issue) { setError(issue instanceof ApiError ? issue.message : 'This email action could not be completed. Try again.'); }
    finally { setBusy(false); }
  }
  const back = () => window.location.assign('/');
  if (action.kind === 'reset' && action.token && configuredSessionApi) return <main className="sl-email-page"><div className="sl-email-card"><h1>Reset your password</h1><p>Use your email link to choose a new password.</p></div><ConnectedAccountRecovery initialEmail="" initialToken={action.token} onClose={back} /></main>;
  return <main className="sl-email-page"><section className="sl-email-card" aria-label={title}>
    <p className="sl-eyebrow">STAGELINK / ACCOUNT</p><h1>{done ? 'Email confirmed' : title}</h1>
    {!action.token ? <p role="alert">This email link is incomplete or invalid. Request a new message from your account.</p> : !configuredSessionApi ? <p role="alert">Account access is unavailable on this site. Please open the link on the StageLink site that sent your email.</p> : done ? <p role="status">{action.kind === 'emailchange' ? 'Your email has been updated and previous sessions revoked. Sign in with your new email.' : 'Your email is verified. Return to StageLink to continue.'}</p> : <><p>{action.kind === 'verify' ? 'Confirm this email address to unlock protected account features.' : 'Your existing email stays active until you confirm this change.'}</p><button className="btn-primary" type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Confirming…' : 'Confirm email'}</button></>}
    {error && <p role="alert" className="sl-auth-message is-error">{error}</p>}
    <button className="btn-ghost" type="button" onClick={back} style={{ marginTop: 20 }}>Back to StageLink</button>
  </section></main>;
}

export default function AccountEmailAction({ action }: { action: EmailAction }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme !== 'light');
  const change = (next: boolean) => { setIsDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; };
  return <AppearanceProvider isDark={isDark} onThemeChange={change}><div className="sl-email-theme-control"><SwitchMode width={80} height={38} isDark={isDark} onChange={change} /></div><EmailActionView action={action} /></AppearanceProvider>;
}
