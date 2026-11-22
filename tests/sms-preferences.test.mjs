import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSmsPreferencesApi, normalizeSmsNumber, parseApiOrigin, SmsApiError } from '../src/lib/smsPreferences.ts';

const origin = 'https://api.stagelink.example';
const session = { email: 'member@stagelink.test', emailVerified: true, accessToken: 'test.account.signature', csrfToken: 'c'.repeat(43) };
const contact = { revision: 7, enabled: true, verified: true, last4: '4567', bookingConsent: true, marketingConsent: true, pending: null };

test('SMS preferences requires a canonical HTTPS staging origin or loopback HTTP', () => {
  assert.equal(parseApiOrigin(origin + '/'), origin);
  assert.equal(parseApiOrigin('http://127.0.0.1:4000'), 'http://127.0.0.1:4000');
  for (const candidate of ['', 'http://api.stagelink.example', 'https://user@api.stagelink.example', origin + '/api/v1', origin + '?a=b']) {
    assert.equal(parseApiOrigin(candidate), null);
  }
});

test('SMS controls use a scoped bearer session and off-only endpoints', async () => {
  const replies = [
    ['auth/login', { email: session.email, password: 'fixture password' }, { accessToken: session.accessToken, csrfToken: session.csrfToken, user: { email: session.email, emailVerified: true } }],
    ['me/sms-contact', null, contact],
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

test('SMS enrollment uses revisioned mutations and preserves the other text preference', async () => {
  assert.equal(normalizeSmsNumber(' 077-123 4567 '), '+94771234567');
  assert.equal(normalizeSmsNumber('+94 77 123 4567'), '+94771234567');
  assert.equal(normalizeSmsNumber('94771234567'), '+94771234567');
  for (const invalid of ['+44771234567', '07123456', '+94771234567 / 0771234567']) assert.equal(normalizeSmsNumber(invalid), null);

  const pending = { id: 'cc570238-c517-41c0-9b6b-3bbd456fe108', last4: '8901', expiresAt: '2026-11-22T08:10:00.000Z', status: 'queued' };
  const requested = { ...contact, revision: 8, pending };
  const confirmed = { ...contact, revision: 9, last4: '8901', bookingConsent: false, marketingConsent: false };
  const enabled = { ...confirmed, revision: 10, marketingConsent: true };
  const removed = { ...confirmed, revision: 11, verified: false, last4: null };
  const replies = [
    ['verification', 'POST', { revision: 7, number: '+94771238901' }, { ...requested, pending: { ...pending, number: '+94771238901' } }],
    ['confirm', 'POST', { challengeId: pending.id, code: '012345' }, confirmed],
    ['consent', 'PUT', { revision: 9, bookingConsent: false, marketingConsent: true }, enabled],
    ['consent', 'PUT', { revision: 10, bookingConsent: true, marketingConsent: true }, { code: 'SMS_REVISION_CONFLICT' }, 409],
    ['revoke', 'POST', { revision: 10 }, removed],
  ];
  const api = createSmsPreferencesApi(origin, async (url, init) => {
    const [action, method, body, result, status] = replies.shift();
    assert.equal(url.pathname, '/api/v1/me/sms-contact/' + action);
    assert.equal(init.method, method);
    assert.equal(init.credentials, 'omit');
    assert.equal(new Headers(init.headers).get('X-CSRF-Token'), session.csrfToken);
    assert.deepEqual(JSON.parse(init.body), body);
    return Response.json(result, { status });
  });

  assert.deepEqual(await api.requestCode(session, contact.revision, '+94771238901'), requested);
  assert.deepEqual(await api.confirmCode(session, pending.id, '012345'), confirmed);
  assert.deepEqual(await api.enable(session, confirmed, 'marketing'), enabled);
  await assert.rejects(api.enable(session, enabled, 'booking'), { status: 409, code: 'SMS_REVISION_CONFLICT' });
  assert.deepEqual(await api.remove(session, enabled.revision), removed);
  assert.equal(replies.length, 0);
});

test('SMS history reads masked verification and reminder records for the signed-in member', async () => {
  const id = 'cc570238-c517-41c0-9b6b-3bbd456fe108';
  const time = '2026-11-22T08:10:00.000Z';
  const verification = { id, status: 'delivered', last4: '4567', createdAt: time, confirmedAt: null };
  const reminder = { id, status: 'queued', startsAt: time, dueAt: '2026-11-22T06:10:00.000Z', offsetHours: 2 };
  const responses = new Map([
    ['/api/v1/me/sms-verifications', { items: [{ ...verification, lastCode: 'INTERNAL_PROVIDER_STATE', number: '+94771234567' }] }],
    ['/api/v1/me/booking-sms-reminders', { items: [{ ...reminder, bookingId: id, checkedAt: null }] }],
  ]);
  const api = createSmsPreferencesApi(origin, async (url, init) => {
    const headers = new Headers(init.headers);
    assert.equal(init.method, 'GET');
    assert.equal(init.credentials, 'omit');
    assert.equal(headers.get('Authorization'), 'Bearer ' + session.accessToken);
    assert.equal(headers.get('X-CSRF-Token'), null);
    assert.equal(init.body, undefined);
    assert.ok(responses.has(url.pathname));
    return Response.json(responses.get(url.pathname));
  });

  assert.deepEqual(await api.history(session), { verifications: [verification], reminders: [reminder] });
  responses.set('/api/v1/me/sms-verifications', { items: [{ ...verification, last4: '+94771234567' }] });
  await assert.rejects(api.history(session), /Unexpected SMS verification history/);
  responses.set('/api/v1/me/sms-verifications', { items: [] });
  responses.set('/api/v1/me/booking-sms-reminders', { items: [] });
  assert.deepEqual(await api.history(session), { verifications: [], reminders: [] });
});
