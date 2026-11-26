import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiSession } from '../src/lib/apiSession.ts';

const profile = {
  displayName: 'Morgan Silva', email: 'morgan@example.test', emailVerified: true,
  organization: 'Night Sky Events', city: 'Colombo', phone: '', bio: '',
  revision: 1, updatedAt: '2026-11-22T05:00:00.000Z',
};
const session = {
  accessToken: 'fixture.access.signature', csrfToken: 'c'.repeat(43),
  user: {
    id: '00000000-0000-4000-8000-000000000001', email: profile.email,
    displayName: profile.displayName, roles: ['customer'], activeRole: 'customer',
    emailVerified: true, createdAt: profile.updatedAt,
  },
};

test('member profile saves send the revision and editable fields only, without replaying a conflict', async () => {
  const writes = [];
  const api = createApiSession('https://api.example.test', async (url, request) => {
    if (url.pathname === '/api/v1/auth/login') return Response.json(session);
    assert.equal(url.pathname, '/api/v1/me/profile');
    if (request.method === 'GET') return Response.json(profile);
    writes.push(request);
    return Response.json({ code: 'REVISION_CONFLICT', message: 'Reload the latest version.' }, { status: 409 });
  });
  await api.signIn(session.user.email, 'fixture password');
  const current = await api.memberProfile();
  await assert.rejects(api.saveMemberProfile({ ...current, phone: 'bad' }), { code: 'INVALID_PROFILE' });
  await assert.rejects(api.saveMemberProfile({
    ...current, city: ' Galle ', email: 'different@example.test',
  }), { status: 409, code: 'REVISION_CONFLICT' });
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0].body), {
    revision: 1, displayName: 'Morgan Silva', city: 'Galle',
    phone: '', organization: 'Night Sky Events', bio: '',
  });
  const headers = new Headers(writes[0].headers);
  assert.equal(headers.get('Authorization'), 'Bearer ' + session.accessToken);
  assert.equal(headers.get('X-CSRF-Token'), session.csrfToken);
  api.dispose();
});

test('malformed member profile responses are rejected before populating the form', async () => {
  const api = createApiSession('https://api.example.test', async url => Response.json(
    url.pathname === '/api/v1/auth/login' ? session : { ...profile, revision: '1' },
  ));
  await api.signIn(session.user.email, 'fixture password');
  await assert.rejects(api.memberProfile(), { code: 'INVALID_API_RESPONSE' });
  api.dispose();
});
