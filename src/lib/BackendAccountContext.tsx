import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiConnectionRequested, ApiError } from './apiTransport';
import { configuredSessionApi, type AccountRole, type ApiAccount } from './apiSession';

type AccountState = {
  connected: boolean; account: ApiAccount | null; checking: boolean; busy: boolean;
  error: string; retry: () => void; dismiss: () => void;
  signIn: (email: string, password: string) => Promise<ApiAccount>;
  register: (input: { displayName: string; email: string; password: string; role: 'customer' | 'artist' | 'renter' }) => Promise<void>;
  changeRole: (role: AccountRole) => Promise<void>; signOut: () => Promise<void>;
};
const unavailable = async (): Promise<never> => { throw new Error('Account sign-in is unavailable.'); };
const Context = createContext<AccountState>({ connected: false, account: null, checking: false, busy: false, error: '', retry: () => {}, dismiss: () => {}, signIn: unavailable, register: unavailable, changeRole: unavailable, signOut: unavailable });
const message = (error: unknown) => error instanceof ApiError ? error.message + (error.requestId ? ' Reference: ' + error.requestId : '') : 'Account access is unavailable. Try again.';

export function BackendAccountProvider({ children }: { children: ReactNode }) {
  const api = configuredSessionApi;
  const connected = apiConnectionRequested;
  const [account, setAccount] = useState<ApiAccount | null>(() => api?.snapshot()?.user ?? null);
  const [checking, setChecking] = useState(connected && Boolean(api));
  const [pending, setPending] = useState(0);
  const [error, setError] = useState(connected && !api ? 'Account access is not configured correctly. Please contact StageLink support.' : '');
  const mounted = useRef(false), restoreVersion = useRef(0), retryAction = useRef<() => Promise<void>>(() => Promise.resolve());
  function requireApi() { if (!api) throw new Error('Account access is not configured correctly.'); return api; }
  async function run<T>(action: () => Promise<T>, report = false): Promise<T> {
    if (mounted.current) setPending(count => count + 1);
    try { const result = await action(); if (mounted.current && report) setError(''); return result; }
    catch (issue) { if (mounted.current && report && !(issue instanceof ApiError && issue.code === 'SESSION_SUPERSEDED')) setError(message(issue)); throw issue; }
    finally { if (mounted.current) setPending(count => Math.max(0, count - 1)); }
  }
  async function restore() {
    if (!api) return;
    const version = ++restoreVersion.current;
    if (mounted.current) setChecking(true);
    try { await api.refreshSession(); if (mounted.current && version === restoreVersion.current) setError(''); }
    catch (issue) {
      if (mounted.current && version === restoreVersion.current && !(issue instanceof ApiError && issue.code === 'SESSION_SUPERSEDED')) {
        setError(message(issue)); retryAction.current = restore;
      }
    } finally { if (mounted.current && version === restoreVersion.current) setChecking(false); }
  }
  useEffect(() => {
    mounted.current = true;
    if (!api) return () => { mounted.current = false; };
    const unsubscribe = api.subscribe(value => { if (mounted.current) setAccount(value?.user ?? null); });
    setAccount(api.snapshot()?.user ?? null);
    void restore();
    return () => { mounted.current = false; restoreVersion.current++; unsubscribe(); };
  }, [api]);
  useEffect(() => {
    if (!api || !account) return;
    let lastRefresh = performance.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || performance.now() - lastRefresh < 60_000) return;
      lastRefresh = performance.now(); void restore();
    };
    const timer = window.setInterval(refresh, 8 * 60_000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, account?.id]);
  async function signOut() { retryAction.current = signOut; await run(() => requireApi().signOut(), true); }
  async function changeRole(role: AccountRole) { retryAction.current = () => changeRole(role); await run(() => requireApi().changeRole(role), true); }
  return <Context.Provider value={{
    connected, account, checking, busy: pending > 0, error,
    retry: () => { void retryAction.current().catch(() => {}); }, dismiss: () => setError(''),
    signIn: (email, password) => run(() => requireApi().signIn(email, password)).then(value => value.user),
    register: input => run(() => requireApi().register(input)).then(() => undefined), changeRole, signOut,
  }}>{children}</Context.Provider>;
}
export const useBackendAccount = () => useContext(Context);
