import { useState } from 'react';
import { useBackendAccount } from '../lib/BackendAccountContext';
import { configuredSessionApi } from '../lib/apiSession';
import { ApiError } from '../lib/apiTransport';
export default function AccountVerificationNotice() {
  const { account } = useBackendAccount();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  if (!account || account.emailVerified) return null;
  async function request() {
    if (busy || !configuredSessionApi) return; setBusy(true); setNotice('');
    try { await configuredSessionApi.requestVerification(); setNotice('If eligible, a verification email will arrive. Open its link to confirm your address.'); }
    catch (issue) { setNotice(issue instanceof ApiError ? issue.message : 'The email could not be requested. Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="mg-workspace-banner" role="status"><strong>Verify your email</strong><p>Confirm {account.email} before using protected StageLink features.</p><button type="button" className="btn-ghost" disabled={busy} onClick={() => void request()}>{busy ? 'Requesting…' : 'Request verification email'}</button>{notice && <p>{notice}</p>}</div>;
}
