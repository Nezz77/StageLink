import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../api/src/app.js';
import { readConfig } from '../shared/config.js';
import { MIGRATION, type Resources } from '../shared/resources.js';
const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@localhost/test', REDIS_URL: 'redis://localhost:6379' });
function fakeResources(up: boolean): Resources {
  return { db: {
    $queryRaw: async () => { if (!up) throw new Error('password=do-not-leak'); return [{ migration_name: MIGRATION }]; },
    $disconnect: async () => {},
  }, redis: { status: 'ready', ping: async () => { if (!up) throw new Error('redis secret'); return 'PONG'; }, quit: async () => {}, disconnect: () => {} } } as unknown as Resources;
}
for (const up of [true, false]) test(`API health and errors when dependencies are ${up ? 'available' : 'unavailable'}`, async () => {
  const { app, document } = await createApp(config, fakeResources(up));
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const live = await fetch(base + '/api/v1/health/live');
    assert.equal(live.status, 200);
    assert.equal((await live.json() as any).status, 'alive');
    const ready = await fetch(base + '/api/v1/health/ready');
    assert.equal(ready.status, up ? 200 : 503);
    const body = await ready.text(); assert.ok(!body.includes('secret') && !body.includes('password'));
    if (up) assert.equal(JSON.parse(body).schemaVersion, MIGRATION);
    const missing = await fetch(base + '/api/v1/not-real?token=do-not-log', { headers: { 'X-Request-ID': 'untrusted', Authorization: 'Bearer secret' } });
    assert.equal(missing.status, 404);
    const error = await missing.json() as any;
    assert.equal(error.code, 'NOT_FOUND');
    assert.match(error.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(error.requestId, missing.headers.get('X-Request-ID'));
    assert.notEqual(error.requestId, 'untrusted');
    assert.ok(document.paths['/api/v1/health/ready']);
    const cors = await fetch(base + '/api/v1/health/live', { headers: { Origin: 'http://evil.example' } });
    assert.equal(cors.headers.get('Access-Control-Allow-Origin'), config.WEB_ORIGIN);
  } finally { await app.close(); }
});
