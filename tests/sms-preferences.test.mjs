import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSmsPreferencesApi, parseApiOrigin, SmsApiError } from '../src/lib/smsPreferences.ts';

const origin = 'https://api.stagelink.example';
const session = { email: 'member@stagelink.test', accessToken: 'test.account.signature', csrfToken: 'c'.repeat(43) };
const contact = { verified: true, last4: '4567', bookingConsent: true, marketingConsent: true };

test('SMS preferences requires a canonical HTTPS staging origin or loopback HTTP', () => {
  assert.equal(parseApiOrigin(origin + '/'), origin);
  assert.equal(parseApiOrigin('http://127.0.0.1:4000'), 'http://127.0.0.1:4000');
  for (const candidate of ['', 'http://api.stagelink.example', 'https://user@api.stagelink.example', origin + '/api/v1', origin + '?a=b']) {
    assert.equal(parseApiOrigin(candidate), null);
  }
});

test('SMS controls use a scoped bearer session and off-only endpoints', async () => {
  const replies = [
    ['auth/login', { email: session.email, password: 'fixture password' }, { accessToken: session.accessToken, csrfToken: session.csrfToken, user: { email: session.email } }],
    ['me/sms-contact', null, { ...contact, revision: 7 }],
    ['me/sms-contact/opt-out', { channel: 'marketing' }, { ...contact, marketingConsent: false }],
    ['me/sms-contact/opt-out', { channel: 'booking' }, { ...contact, bookingConsent: false, marketingConsent: false }],
    ['me/sms-contact/opt-out', { channel: 'all' }, { ...contact, bookingConsent: false, marketingConsent: false }],
    ['auth/logout', {}, null],
  ];
  const api = createSmsPreferencesApi(origin, async (url, init) => {
    const [path, body, result] = replies.shift();
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, '/api/v1/' + path);
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.method, body ? 'POST' : 'GET');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Authorization'), path === 'auth/login' ? null : 'Bearer ' + session.accessToken);
    assert.equal(headers.get('X-CSRF-Token'), body && path !== 'auth/login' ? session.csrfToken : null);
    assert.deepEqual(init.body === undefined ? null : JSON.parse(init.body), body);
    return result === null ? new Response(null, { status: 204 }) : Response.json(result);
  });

  const signedIn = await api.signIn(session.email, 'fixture password');
  assert.deepEqual(signedIn, session);
  assert.deepEqual(await api.contact(signedIn), contact);
  assert.deepEqual(await api.stop(signedIn, 'marketing'), { ...contact, marketingConsent: false });
  assert.deepEqual(await api.stop(signedIn, 'booking'), { ...contact, bookingConsent: false, marketingConsent: false });
  assert.deepEqual(await api.stop(signedIn, 'all'), { ...contact, bookingConsent: false, marketingConsent: false });
  await api.signOut(signedIn);
  assert.equal(replies.length, 0);
});

test('SMS preferences rejects expired sessions and an unconfirmed opt-out', async () => {
  const expired = createSmsPreferencesApi(origin, async () => new Response(null, { status: 401 }));
  await assert.rejects(expired.contact(session), error => error instanceof SmsApiError && error.status === 401);

  const unchanged = createSmsPreferencesApi(origin, async () => Response.json(contact));
  await assert.rejects(unchanged.stop(session, 'marketing'), /did not confirm/);
  const unmasked = createSmsPreferencesApi(origin, async () => Response.json({ ...contact, last4: '+94771234567' }));
  await assert.rejects(unmasked.contact(session), /Unexpected SMS contact/);
});
