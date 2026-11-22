import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailActionFromHash } from '../src/lib/emailAction.ts';

test('email actions recognize backend fragments and accept only one well-formed token', () => {
  const token = 'v'.repeat(43);
  for (const kind of ['verify', 'reset', 'emailchange']) {
    assert.deepEqual(emailActionFromHash('#' + kind + '=' + token), { kind, token });
  }
  assert.equal(emailActionFromHash('#bookings'), null);
  assert.deepEqual(emailActionFromHash('#verify=%'), { kind: 'verify', token: null });
  assert.deepEqual(emailActionFromHash('#reset=' + token + '&next=anything'), { kind: 'reset', token: null });
});
