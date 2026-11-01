import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { readConfig } from '../shared/config.js';
import { resources, closeResources, readiness } from '../shared/resources.js';
import { consume, dispatchBatch, insertPing, QUEUE } from '../shared/outbox.js';

const config = readConfig();
if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test')) {
  throw new Error('Integration tests require NODE_ENV=test and a dedicated *_test database');
}
async function until(check: () => Promise<boolean>, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Timed out waiting for integration condition');
}
test('migrations, transactional outbox, recovery, duplicate delivery and actual worker restart', { timeout: 90000 }, async () => {
  const deps = resources(config);
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1 });
  const queue = new Queue(QUEUE, { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });
  const ids: string[] = [];
  let worker: ChildProcess | undefined;
  async function stopWorker() {
    if (worker && worker.exitCode === null) {
      const exited = once(worker, 'exit'); worker.kill('SIGTERM'); await exited;
    }
    worker = undefined;
  }
  async function startWorker() {
    worker = spawn(process.execPath, ['dist/worker/src/main.js'], {
      env: { ...process.env, WORKER_HEALTH_PORT: process.env.WORKER_HEALTH_PORT ?? '14001' }, stdio: 'ignore',
    });
    await until(async () => {
      try { return (await fetch(`http://127.0.0.1:${process.env.WORKER_HEALTH_PORT ?? '14001'}/health/ready`)).status === 200; }
      catch { return false; }
    });
  }
  try {
    assert.equal((await readiness(deps)).status, 'ready');
    // Check actual refused connections, not only mocked health responses.
    for (const failure of ['postgres', 'redis'] as const) {
      const broken = resources({ ...config,
        DATABASE_URL: failure === 'postgres' ? 'postgresql://unused:unused@127.0.0.1:1/unavailable' : config.DATABASE_URL,
        REDIS_URL: failure === 'redis' ? 'redis://127.0.0.1:1' : config.REDIS_URL,
      });
      try {
        const result = await readiness(broken);
        assert.equal(result.status, 'unavailable');
        assert.equal(result.dependencies[failure], 'down');
        assert.equal(result.dependencies[failure === 'postgres' ? 'redis' : 'postgres'], 'up');
      } finally { await closeResources(broken); }
    }
    const rolledBack = randomUUID();
    await assert.rejects(deps.db.$transaction(async tx => {
      await tx.outboxEvent.create({ data: { id: rolledBack, topic: 'foundation.ping.v1', payload: { version: 1 } } });
      throw new Error('roll back');
    }));
    assert.equal(await deps.db.outboxEvent.count({ where: { id: rolledBack } }), 0);

    const first = await deps.db.$transaction(insertPing); ids.push(first.id);
    await until(async () => {
      await dispatchBatch(deps.db, { add: async () => { throw new Error('queue offline'); } });
      return (await deps.db.outboxEvent.findUniqueOrThrow({ where: { id: first.id } })).lastErrorCode === 'QUEUE_UNAVAILABLE';
    });
    assert.equal((await deps.db.outboxEvent.findUniqueOrThrow({ where: { id: first.id } })).processedAt, null);
    await deps.db.outboxEvent.update({ where: { id: first.id }, data: { lockedUntil: null } });
    // Delivery is asynchronous; allow timestamp precision and normal relay scheduling.
    await until(async () => {
      await dispatchBatch(deps.db, queue);
      return Boolean(await queue.getJob(first.id));
    });
    assert.ok(await queue.getJob(first.id));
    // Simulate Redis loss after publication. DB remains authority and republishes.
    await (await queue.getJob(first.id))!.remove();
    await deps.db.outboxEvent.update({ where: { id: first.id }, data: { lockedUntil: null } });
    // Delivery is asynchronous; allow timestamp precision and normal relay scheduling.
    await until(async () => {
      await dispatchBatch(deps.db, queue);
      return Boolean(await queue.getJob(first.id));
    });
    await startWorker();
    await until(async () => (await deps.db.foundationReceipt.count({ where: { eventId: first.id } })) === 1);
    await stopWorker();

    // Commit while worker is stopped; persisted event is consumed after process restart.
    const second = await deps.db.$transaction(insertPing); ids.push(second.id);
    await startWorker();
    await until(async () => (await deps.db.foundationReceipt.count({ where: { eventId: second.id } })) === 1);
    await stopWorker();
    await Promise.all(Array.from({ length: 8 }, () => consume(deps.db, second.id)));
    assert.equal(await deps.db.foundationReceipt.count({ where: { eventId: second.id } }), 1);
    assert.equal(await deps.db.consumedEvent.count({ where: { eventId: second.id } }), 1);

    // Competing first deliveries, before any worker has consumed this event.
    const concurrent = await deps.db.$transaction(insertPing); ids.push(concurrent.id);
    await Promise.all(Array.from({ length: 8 }, () => consume(deps.db, concurrent.id)));
    assert.equal(await deps.db.foundationReceipt.count({ where: { eventId: concurrent.id } }), 1);
    assert.equal(await deps.db.consumedEvent.count({ where: { eventId: concurrent.id } }), 1);


    const invalid = await deps.db.outboxEvent.create({ data: { topic: 'unknown.v1', payload: {} } }); ids.push(invalid.id);
    await consume(deps.db, invalid.id);
    const rejected = await deps.db.outboxEvent.findUniqueOrThrow({ where: { id: invalid.id } });
    assert.ok(rejected.deadLetteredAt); assert.equal(rejected.processedAt, null);
    assert.equal(await deps.db.foundationReceipt.count({ where: { eventId: invalid.id } }), 0);
  } finally {
    await stopWorker();
    // Only remove this test's records; never flush a shared Redis or DB.
    for (const id of ids) { const job = await queue.getJob(id); if (job) await job.remove(); }
    await deps.db.foundationReceipt.deleteMany({ where: { eventId: { in: ids } } });
    await deps.db.consumedEvent.deleteMany({ where: { eventId: { in: ids } } });
    await deps.db.outboxEvent.deleteMany({ where: { id: { in: ids } } });
    await queue.close(); await connection.quit(); await closeResources(deps);
  }
});
