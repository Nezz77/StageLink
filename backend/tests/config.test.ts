import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../shared/config.js';
const valid = { DATABASE_URL: 'postgresql://user:secret@localhost/db', REDIS_URL: 'redis://localhost:6379' };
test('configuration rejects missing, malformed and unsafe settings without leaking secrets', () => {
  assert.throws(() => readConfig({}), /DATABASE_URL, REDIS_URL/);
  for (const extra of [{ PORT: '0' }, { PORT: 'invalid' }, { DATABASE_URL: 'https://user:secret@example.com' }, { WEB_ORIGIN: '*' }, { WEB_ORIGIN: 'http://localhost:3000/path' }]) {
    assert.throws(() => readConfig({ ...valid, ...extra }), error =>
      error instanceof Error && error.message.startsWith('Invalid configuration:') && !error.message.includes('secret'));
  }
  assert.equal(readConfig(valid).PORT, 4000);
});
