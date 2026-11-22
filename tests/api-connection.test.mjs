import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiTransport, parseApiOrigin } from '../src/lib/apiTransport.ts';
import { createApiSession } from '../src/lib/apiSession.ts';

const origin = 'https://api.example.test';
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'member@stagelink.test', displayName: 'Synthetic member', roles: ['customer', 'artist'], activeRole: 'customer', emailVerified: true, createdAt: '2026-11-21T00:00:00.000Z' };
const saved = { accessToken: 'fixture.access.signature', csrfToken: 'c'.repeat(43), user };
const json = value => Response.json(value);
const tick = () => new Promise(resolve => setImmediate(resolve));

test('shared API transport confines credentials to a canonical trusted API origin and safe paths', async () => {
  for (const value of ['https://u:p@api.example.test', origin + '?token=secret', origin + '/api', 'http://example.test', 'file:///tmp/test']) assert.equal(parseApiOrigin(value), null);
  assert.equal(parseApiOrigin('http://localhost:4000/'), 'http://localhost:4000');
  let calls = 0;
  const api = createApiTransport(origin, async (url, init) => {
    calls++; assert.equal(url.origin, origin); assert.equal(url.pathname, '/api/v1/me/active-role');
    assert.equal(url.searchParams.get('q'), 'a&token=not-a-token');
    assert.equal(init.credentials, 'include'); assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Authorization'), 'Bearer ' + saved.accessToken); assert.equal(headers.get('X-CSRF-Token'), saved.csrfToken);
    assert.equal(headers.get('Origin'), null, 'The browser owns Origin');
    assert.deepEqual(JSON.parse(init.body), { role: 'artist' }); return json({ ok: true });
  });
  for (const path of ['https://evil.test', '//evil.test', '../me', 'me/../auth/login', 'me?token=x', 'me%2f../auth', 'me\\auth']) await assert.rejects(api.request(path));
  await assert.rejects(api.request('me', { body: {} }));
  assert.equal(calls, 0);
  await api.request('me/active-role', { method: 'POST', body: { role: 'artist' }, query: { q: 'a&token=not-a-token', ignored: undefined }, accessToken: saved.accessToken, csrfToken: saved.csrfToken });
  assert.equal(calls, 1);
});

test('transport retains safe error references and never automatically retries writes or exposes raw network errors', async () => {
  const requestId = '00000000-0000-4000-8000-000000000002'; let calls = 0;
  const api = createApiTransport(origin, async () => { calls++; return new Response(JSON.stringify({ code: 'MAINTENANCE_MODE', message: 'Temporarily unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }); });
  await assert.rejects(api.request('me/active-role', { method: 'POST' }), error => error instanceof ApiError && error.status === 503 && error.requestId === requestId && error.code === 'MAINTENANCE_MODE');
  assert.equal(calls, 1);
  const failed = createApiTransport(origin, async () => { throw Error('Authorization: Bearer sensitive-value'); });
  await assert.rejects(failed.request('me'), error => error.code === 'API_UNAVAILABLE' && !error.message.includes('sensitive-value'));
  const html = createApiTransport(origin, async () => new Response('<h1>private stack trace</h1>', { status: 502 }));
  await assert.rejects(html.request('me'), error => error.code === 'INVALID_API_RESPONSE' && !error.message.includes('private'));
});

test('main sessions use server roles, in-memory copies and CSRF-protected role changes', async () => {
  const calls = [];
  const api = createApiSession(origin, async (url, init) => {
    const path = url.pathname; calls.push(path);
    const headers = new Headers(init.headers); assert.equal(init.credentials, 'include');
    if (path.endsWith('/auth/login')) { assert.equal(headers.get('Authorization'), null); return json(saved); }
    assert.equal(headers.get('Authorization'), 'Bearer ' + saved.accessToken);
    if (path.endsWith('/me/active-role')) { assert.equal(headers.get('X-CSRF-Token'), saved.csrfToken); return json({ ...user, activeRole: 'artist' }); }
    return json(user);
  });
  const signedIn = await api.signIn(user.email, 'fixture password'); signedIn.user.roles.push('admin');
  assert.deepEqual(api.snapshot(), saved, 'Caller mutation cannot add roles to the saved session');
  assert.equal((await api.me()).activeRole, 'customer');
  assert.equal((await api.changeRole('artist')).activeRole, 'artist');
  assert.equal(api.snapshot().user.activeRole, 'artist');
  assert.equal(calls.length, 3);
});

test('simultaneous session restore uses one cookie refresh and gets fresh CSRF without a bearer token', async () => {
  const paths = [];
  const api = createApiSession(origin, async (url, init) => {
    paths.push(url.pathname); const headers = new Headers(init.headers); assert.equal(headers.get('Authorization'), null);
    if (url.pathname.endsWith('/csrf')) return json({ csrfToken: saved.csrfToken });
    assert.equal(headers.get('X-CSRF-Token'), saved.csrfToken); assert.equal(init.method, 'POST'); assert.equal(init.body, '{}'); return json(saved);
  });
  const first = api.restoreSession(), second = api.restoreSession(); assert.equal(first, second);
  assert.deepEqual(await first, saved); assert.deepEqual(await second, saved);
  assert.deepEqual(paths, ['/api/v1/auth/csrf', '/api/v1/auth/refresh']);
  await api.restoreSession(); assert.equal(paths.length, 2, 'Restoring a memory session does not rotate cookies again');
});

test('expired cookies leave the client signed out and registration never invents a session', async () => {
  const expired = createApiSession(origin, async () => new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
  assert.equal(await expired.restoreSession(), null); assert.equal(expired.snapshot(), null);
  const fresh = createApiSession(origin, async () => json({ message: 'If eligible, an email will arrive.' }));
  await fresh.register({ displayName: user.displayName, email: user.email, password: 'fixture password', role: 'customer' });
  assert.equal(fresh.snapshot(), null); await assert.rejects(fresh.me(), error => error.status === 401);
});

test('malformed sessions and unconfirmed role changes cannot change account state', async () => {
  for (const value of [{ ...saved, csrfToken: 'wrong' }, { ...saved, accessToken: 'wrong' }, { ...saved, user: { ...user, roles: ['superadmin'] } }]) {
    const api = createApiSession(origin, async () => json(value)); await assert.rejects(api.signIn(user.email, 'fixture password')); assert.equal(api.snapshot(), null);
  }
  let loggedIn = false;
  const api = createApiSession(origin, async () => { if (!loggedIn) { loggedIn = true; return json(saved); } return json(user); });
  await api.signIn(user.email, 'fixture password'); await assert.rejects(api.changeRole('artist')); assert.equal(api.snapshot().user.activeRole, 'customer');
});

test('logout serializes cookie changes and a late login cannot resurrect the local session', async () => {
  let release, started; const gate = new Promise(resolve => { release = resolve; }), begin = new Promise(resolve => { started = resolve; }); const paths = [];
  const api = createApiSession(origin, async url => {
    paths.push(url.pathname);
    if (url.pathname.endsWith('/login')) { started(); await gate; return json(saved); }
    if (url.pathname.endsWith('/csrf')) return json({ csrfToken: saved.csrfToken });
    return new Response(null, { status: 204 });
  });
  const login = api.signIn(user.email, 'fixture password'); const rejected = assert.rejects(login, error => error.code === 'SESSION_SUPERSEDED');
  await begin; const logout = api.signOut(); assert.equal(api.snapshot(), null); release(); await rejected; await logout;
  assert.deepEqual(paths, ['/api/v1/auth/login', '/api/v1/auth/csrf', '/api/v1/auth/logout']); assert.equal(api.snapshot(), null);
});

test('a newer sign-in wins and failed commands do not poison the cookie operation queue', async () => {
  let release, started; const gate = new Promise(resolve => { release = resolve; }), begin = new Promise(resolve => { started = resolve; }); let calls = 0;
  const newer = { ...saved, accessToken: 'newer.access.signature' };
  const api = createApiSession(origin, async () => { calls++; if (calls === 1) { started(); await gate; return json(saved); } return json(newer); });
  const first = api.signIn(user.email, 'first'); const rejected = assert.rejects(first, error => error.code === 'SESSION_SUPERSEDED');
  await begin; const second = api.signIn(user.email, 'second'); release(); await rejected; await second; assert.equal(api.snapshot().accessToken, newer.accessToken);
  let tries = 0; const recovering = createApiSession(origin, async () => { if (++tries === 1) throw Error('offline'); return json(saved); });
  await assert.rejects(recovering.signIn(user.email, 'first')); await recovering.signIn(user.email, 'second'); assert.deepEqual(recovering.snapshot(), saved);
});

test('server session revocation clears memory without replaying the protected request', async () => {
  let calls = 0;
  const api = createApiSession(origin, async () => ++calls === 1 ? json(saved) : new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
  await api.signIn(user.email, 'fixture password'); await assert.rejects(api.me(), error => error.status === 401); assert.equal(api.snapshot(), null); assert.equal(calls, 2);
});

test('caller cancellation produces a safe cancellation error', async () => {
  const controller = new AbortController(); controller.abort();
  const api = createApiTransport(origin, async (_url, init) => { assert.equal(init.signal.aborted, true); throw new DOMException('Private cancellation detail', 'AbortError'); });
  await assert.rejects(api.request('me', { signal: controller.signal }), error => error.code === 'REQUEST_ABORTED' && !error.message.includes('Private'));
});

test('a subsequent sign-in cannot cancel the preceding server logout', async () => {
  const paths = [];
  const api = createApiSession(origin, async url => {
    paths.push(url.pathname);
    if (url.pathname.endsWith('/login')) return json(saved);
    if (url.pathname.endsWith('/csrf')) return json({ csrfToken: saved.csrfToken });
    return new Response(null, { status: 204 });
  });
  await api.signIn(user.email, 'fixture password');
  const logout = api.signOut(), nextLogin = api.signIn(user.email, 'another login');
  await logout; await nextLogin;
  assert.deepEqual(paths, ['/api/v1/auth/login', '/api/v1/auth/csrf', '/api/v1/auth/logout', '/api/v1/auth/login']);
  assert.deepEqual(api.snapshot(), saved);
});

test('independent clients coordinate cookie refresh rather than replaying the same credential', { skip: !globalThis.navigator?.locks }, async () => {
  let cookieVersion = 0; const paths = [];
  const token = () => String(cookieVersion).repeat(43);
  async function send(url, init) {
    paths.push(url.pathname);
    if (url.pathname.endsWith('/csrf')) { const captured = token(); await tick(); return json({ csrfToken: captured }); }
    if (new Headers(init.headers).get('X-CSRF-Token') !== token()) return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    cookieVersion++; await tick(); return json({ ...saved, csrfToken: token() });
  }
  const first = createApiSession(origin, send), second = createApiSession(origin, send);
  const results = await Promise.all([first.restoreSession(), second.restoreSession()]);
  assert.ok(results.every(result => result?.user.id === user.id));
  assert.deepEqual(paths, ['/api/v1/auth/csrf', '/api/v1/auth/refresh', '/api/v1/auth/csrf', '/api/v1/auth/refresh']);
});

test('connected account subscriptions expose the public account and follow role changes and sign-out', async () => {
  const api = createApiSession(origin, async url => {
    if (url.pathname.endsWith('/login')) return json(saved);
    if (url.pathname.endsWith('/active-role')) return json({ ...user, activeRole: 'artist' });
    if (url.pathname.endsWith('/csrf')) return json({ csrfToken: saved.csrfToken });
    return new Response(null, { status: 204 });
  });
  const changes = [];
  const credentialFields = [];
  const unsubscribe = api.subscribe(value => {
    changes.push(value?.activeRole ?? null);
    if (value) {
      credentialFields.push(...Object.keys(value).filter(key => key === 'accessToken' || key === 'csrfToken'));
      value.roles.push('admin');
    }
  });
  await api.signIn(user.email, 'fixture password');
  await api.changeRole('artist');
  assert.deepEqual(api.snapshot().user.roles, ['customer', 'artist']);
  await api.signOut();
  unsubscribe();
  await api.signIn(user.email, 'fixture password');
  assert.deepEqual(changes, [null, 'customer', 'artist', null]);
  assert.deepEqual(credentialFields, []);
});
