// Local-only connection check. Requires the separately built backend and a migrated disposable database.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApiSession } from '../src/lib/apiSession.ts';

async function check() {
  const checkout = process.env.STAGELINK_BACKEND_CHECKOUT;
  const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
  const redis = new URL(process.env.REDIS_URL ?? 'http://invalid');
  if (!checkout || !isAbsolute(checkout) || process.env.NODE_ENV !== 'test' ||
      database.protocol !== 'postgresql:' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || !database.pathname.endsWith('_test') ||
      redis.protocol !== 'redis:' || !['localhost', '127.0.0.1', '[::1]'].includes(redis.hostname)) {
    throw Error('Use a built backend checkout and isolated loopback test services.');
  }
  const pkg = JSON.parse(await readFile(join(checkout, 'backend/package.json'), 'utf8'));
  assert.equal(pkg.name, '@stagelink/backend');
  const module = relative => import(pathToFileURL(join(checkout, 'backend/dist', relative)).href);
  const [{ createApp }, { readConfig }, { resources, ensureRedis }, { hashPassword }] = await Promise.all([
    module('api/src/app.js'), module('shared/config.js'), module('shared/resources.js'), module('api/src/auth/security.js'),
  ]);
  const config = readConfig({ ...process.env, AUTH_RATE_PREFIX: 'frontend-session-' + randomUUID() });
  const deps = resources(config), { app } = await createApp(config, deps);
  const userIds = []; let remaining = -1;
  try {
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const password = randomBytes(24).toString('base64url');
    const user = await deps.db.authUser.create({ data: { email: randomUUID() + '@stagelink.test', displayName: 'Frontend API session fixture', passwordHash: await hashPassword(password), roles: ['customer', 'artist'], emailVerifiedAt: new Date() } });
    userIds.push(user.id);
    const jar = new Map(), counts = new Map();
    async function browserFetch(input, init) {
      const url = new URL(input); assert.equal(url.origin, base);
      assert.equal(init.credentials, 'include'); assert.equal(init.redirect, 'error');
      counts.set(url.pathname, (counts.get(url.pathname) ?? 0) + 1);
      const headers = new Headers(init.headers); headers.set('Origin', config.WEB_ORIGIN);
      if (jar.size) headers.set('Cookie', [...jar].map(([name, value]) => name + '=' + value).join('; '));
      const response = await fetch(url, { ...init, headers });
      for (const cookie of response.headers.getSetCookie()) {
        const first = cookie.split(';')[0], index = first.indexOf('=');
        const name = first.slice(0, index), value = first.slice(index + 1);
        if (!value || /(?:^|;)\s*Max-Age=0(?:;|$)/i.test(cookie)) jar.delete(name); else jar.set(name, value);
      }
      return response;
    }
    const client = createApiSession(base, browserFetch);
    const login = await client.signIn(user.email, password);
    assert.equal(login.user.id, user.id); assert.equal(login.user.activeRole, 'artist'); assert.equal(jar.size, 1);
    assert.equal((await client.me()).email, user.email);
    assert.equal((await client.changeRole('customer')).activeRole, 'customer');
    const before = counts.get('/api/v1/auth/refresh') ?? 0;
    const first = client.refreshSession(), second = client.refreshSession(); assert.equal(first, second);
    await Promise.all([first, second]); assert.equal(counts.get('/api/v1/auth/refresh'), before + 1);
    assert.equal((await client.me()).activeRole, 'customer');
    const oldToken = client.snapshot().accessToken;
    await client.signOut(); assert.equal(client.snapshot(), null); assert.equal(jar.size, 0);
    assert.equal(await client.restoreSession(), null);
    const revoked = await fetch(base + '/api/v1/me', { headers: { Authorization: 'Bearer ' + oldToken, Origin: config.WEB_ORIGIN } });
    assert.equal(revoked.status, 401);
  } finally {
    try {
      await deps.db.authUser.deleteMany({ where: { id: { in: userIds } } });
      remaining = await deps.db.authUser.count({ where: { id: { in: userIds } } }); assert.equal(remaining, 0);
      await ensureRedis(deps.redis); let cursor = '0';
      do { const result = await deps.redis.scan(cursor, 'MATCH', config.AUTH_RATE_PREFIX + ':*', 'COUNT', 100); cursor = result[0]; if (result[1].length) await deps.redis.del(...result[1]); } while (cursor !== '0');
    } finally { await app.close(); }
  }
  return { passed: true, checks: ['login', 'server-account', 'role-change', 'single-refresh', 'logout', 'revoked-token', 'fixture-cleanup'], fixtureAccountsRemaining: remaining, externalMessagesSent: false };
}
try { console.log(JSON.stringify(await check())); }
catch { console.error(JSON.stringify({ passed: false, code: 'API_SESSION_CHECK_FAILED' })); process.exitCode = 1; }
