import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailActionFromHash } from '../src/lib/emailAction.ts';
import { createApiSession } from '../src/lib/apiSession.ts';
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'member@stagelink.test', displayName: 'Synthetic member', roles: ['customer'], activeRole: 'customer', emailVerified: false, createdAt: '2026-11-21T00:00:00.000Z' };
const saved = { accessToken: 'fixture.access.signature', csrfToken: 'c'.repeat(43), user };

test('email actions accept only known single-use token links and flag malformed tokens', () => {
  const token = 'a'.repeat(43);
  for (const kind of ['verify', 'reset', 'emailchange']) assert.deepEqual(emailActionFromHash('#' + kind + '=' + token), { kind, token });
  assert.equal(emailActionFromHash('#portfolio'), null);
  assert.deepEqual(emailActionFromHash('#verify=bad'), { kind: 'verify', token: null });
  assert.deepEqual(emailActionFromHash('#reset=%ZZ'), { kind: 'reset', token: null });
  assert.deepEqual(emailActionFromHash('#verify=' + token + '&next=https://other.test'), { kind: 'verify', token: null });
});

test('session subscribers receive copied changes and can unsubscribe without affecting account state', async () => {
  const client = createApiSession('https://api.example.test', async url => Response.json(url.pathname.endsWith('/login') ? saved : user));
  const changes = [];
  client.subscribe(() => { throw Error('Consumer failure'); });
  const unsubscribe = client.subscribe(value => { changes.push(value); if (value) { assert.equal('accessToken' in value, false); assert.equal('csrfToken' in value, false); value.roles.push('admin'); } });
  await client.signIn(user.email, 'fixture password');
  assert.equal(changes.length, 2); assert.equal(changes[0], null);
  assert.deepEqual(client.snapshot().user.roles, ['customer']);
  unsubscribe(); await client.me(); assert.equal(changes.length, 2); client.dispose();
});

test('real email and reset endpoints keep tokens out of URLs and invalidate local sessions after password change', async () => {
  const paths = [], bodies = [];
  const client = createApiSession('https://api.example.test', async (url, init) => {
    paths.push(url.pathname); bodies.push(init.body ? JSON.parse(init.body) : null);
    assert.equal(url.search, ''); assert.equal(url.hash, '');
    if (url.pathname.endsWith('/login')) return Response.json(saved);
    if (url.pathname.endsWith('/password-reset/verify')) return Response.json({ grant: 'g'.repeat(43), expiresIn: 300 });
    return Response.json({ message: 'Completed.' });
  });
  await client.signIn(user.email, 'fixture password');
  await client.requestVerification(); await client.confirmEmail('v'.repeat(43));
  await client.requestPasswordReset(user.email);
  const grant = await client.verifyPasswordReset('r'.repeat(43)); assert.equal(grant.expiresIn, 300);
  await client.completePasswordReset(grant.grant, 'A new fixture password');
  assert.equal(client.snapshot(), null);
  assert.deepEqual(paths, ['/api/v1/auth/login', '/api/v1/auth/email-verification', '/api/v1/auth/email-verification/confirm', '/api/v1/auth/password-reset', '/api/v1/auth/password-reset/verify', '/api/v1/auth/password-reset/complete']);
  assert.deepEqual(bodies.at(-1), { grant: 'g'.repeat(43), password: 'A new fixture password' }); client.dispose();
});

test('malformed reset grants never become usable and confirmed email changes discard the old identity', async () => {
  const invalid = createApiSession('https://api.example.test', async () => Response.json({ grant: 'unsafe', expiresIn: 300 }));
  await assert.rejects(invalid.verifyPasswordReset('r'.repeat(43))); invalid.dispose();
  let calls = 0;
  const client = createApiSession('https://api.example.test', async () => ++calls === 1 ? Response.json(saved) : Response.json({ message: 'Email changed.' }));
  await client.signIn(user.email, 'fixture password'); await client.confirmEmailChange('e'.repeat(43)); assert.equal(client.snapshot(), null); client.dispose();
});
