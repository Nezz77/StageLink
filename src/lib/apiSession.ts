import { ApiError, apiObject, configuredApiOrigin, createApiTransport } from './apiTransport.ts';

export type AccountRole = 'customer' | 'artist' | 'renter' | 'admin';
export type ApiAccount = {
  id: string; email: string; displayName: string; roles: AccountRole[];
  activeRole: AccountRole; emailVerified: boolean; createdAt: string;
};
export type ApiSession = { accessToken: string; csrfToken: string; user: ApiAccount };
const roles: string[] = ['customer', 'artist', 'renter', 'admin'];
const invalid = () => new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected account response.');
function account(value: unknown): ApiAccount {
  const row = apiObject(value);
  if (typeof row.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.id) ||
      typeof row.email !== 'string' || !row.email.includes('@') || row.email.length > 320 ||
      typeof row.displayName !== 'string' || !row.displayName.trim() || row.displayName.length > 200 ||
      !Array.isArray(row.roles) || !row.roles.length || row.roles.some(role => typeof role !== 'string' || !roles.includes(role)) ||
      new Set(row.roles).size !== row.roles.length || typeof row.activeRole !== 'string' || !row.roles.includes(row.activeRole) ||
      typeof row.emailVerified !== 'boolean' || typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(row.createdAt) || !Number.isFinite(Date.parse(row.createdAt))) throw invalid();
  return { id: row.id, email: row.email, displayName: row.displayName, roles: [...row.roles] as AccountRole[], activeRole: row.activeRole as AccountRole, emailVerified: row.emailVerified, createdAt: row.createdAt };
}
function csrf(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw invalid();
  return value;
}
function session(value: unknown): ApiSession {
  const row = apiObject(value);
  if (typeof row.accessToken !== 'string' || row.accessToken.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(row.accessToken)) throw invalid();
  return { accessToken: row.accessToken, csrfToken: csrf(row.csrfToken), user: account(row.user) };
}
const copy = (value: ApiSession): ApiSession => ({ ...value, user: { ...value.user, roles: [...value.user.roles] } });
const superseded = () => new ApiError(0, 'SESSION_SUPERSEDED', 'A newer sign-in action replaced this request.');

export function createApiSession(rawOrigin: string, send: typeof fetch = fetch) {
  const api = createApiTransport(rawOrigin, send);
  let current: ApiSession | null = null, epoch = 0;
  let refreshFlight: Promise<ApiSession | null> | null = null;
  let cookieQueue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = cookieQueue.then(async () => {
      const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
      if (!locks) return action();
      let entered = false;
      try {
        return await locks.request('stagelink-api-session:' + api.origin, () => { entered = true; return action(); });
      } catch (error) {
        if (entered) throw error;
        throw new ApiError(0, 'SESSION_COORDINATION_UNAVAILABLE', 'Open StageLink in its own browser tab and try again.');
      }
    });
    cookieQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  function requireSession() {
    if (!current) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
    return copy(current);
  }
  function check(version: number) { if (epoch !== version) throw superseded(); }
  function clear() { epoch++; current = null; refreshFlight = null; return epoch; }
  function refreshSession(): Promise<ApiSession | null> {
    if (refreshFlight) return refreshFlight;
    const version = epoch;
    const result = enqueue(async () => {
      check(version);
      try {
        const token = csrf(apiObject(await api.request('auth/csrf')).csrfToken);
        check(version);
        const updated = session(await api.request('auth/refresh', { method: 'POST', csrfToken: token }));
        check(version); current = updated; return copy(updated);
      } catch (error) {
        check(version);
        if (error instanceof ApiError && error.status === 401) { clear(); return null; }
        throw error;
      }
    });
    const flight = result.finally(() => { if (refreshFlight === flight) refreshFlight = null; });
    refreshFlight = flight;
    return flight;
  }
  return {
    origin: api.origin,
    snapshot: () => current ? copy(current) : null,
    async signIn(email: string, password: string) {
      const version = clear();
      return enqueue(async () => {
        check(version);
        const updated = session(await api.request('auth/login', { method: 'POST', body: { email, password } }));
        check(version); current = updated; return copy(updated);
      });
    },
    restoreSession: () => current ? Promise.resolve(copy(current)) : refreshSession(),
    refreshSession,
    async signOut() {
      const previous = current ? copy(current) : null;
      clear();
      return enqueue(async () => {
        try {
          const token = csrf(apiObject(await api.request('auth/csrf')).csrfToken);
          await api.request('auth/logout', { method: 'POST', csrfToken: token, accessToken: previous?.accessToken });
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        }
      });
    },
    async me() {
      const saved = requireSession(), version = epoch;
      try {
        const user = account(await api.request('me', { accessToken: saved.accessToken }));
        check(version);
        if (current) current = { ...current, user };
        return { ...user, roles: [...user.roles] };
      } catch (error) { check(version); if (error instanceof ApiError && error.status === 401) clear(); throw error; }
    },
    async changeRole(role: AccountRole) {
      const saved = requireSession(), version = epoch;
      try {
        const user = account(await api.request('me/active-role', { method: 'POST', body: { role }, accessToken: saved.accessToken, csrfToken: saved.csrfToken }));
        check(version);
        if (user.activeRole !== role) throw invalid();
        if (current) current = { ...current, user };
        return { ...user, roles: [...user.roles] };
      } catch (error) { check(version); if (error instanceof ApiError && error.status === 401) clear(); throw error; }
    },
    async register(input: { displayName: string; email: string; password: string; role: Exclude<AccountRole, 'admin'> }) {
      const reply = apiObject(await api.request('auth/register', { method: 'POST', body: input }));
      if (typeof reply.message !== 'string' || !reply.message || reply.message.length > 500) throw invalid();
      return { message: reply.message };
    },
  };
}
export const configuredSessionApi = configuredApiOrigin ? createApiSession(configuredApiOrigin) : null;
