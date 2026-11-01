import { createServer } from 'node:http';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { readConfig } from '../../shared/config.js';
import { resources, closeResources, readiness } from '../../shared/resources.js';
import { consume, dispatchBatch, QUEUE } from '../../shared/outbox.js';
import { log } from '../../shared/log.js';

async function main() {
  const config = readConfig();
  const deps = resources(config);
  const publisher = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 1000, commandTimeout: 2000 });
  const subscriber = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 1000 });
  for (const connection of [publisher, subscriber]) connection.on('error', () => {});
  const queue = new Queue(QUEUE, { connection: publisher, defaultJobOptions: {
    attempts: 5, backoff: { type: 'exponential', delay: 500 }, removeOnComplete: true, removeOnFail: true,
  } });
  const worker = new Worker(QUEUE, async job => { await consume(deps.db, String(job.data.eventId)); }, {
    connection: subscriber, concurrency: 4,
  });
  worker.on('error', () => log('worker.error', { code: 'WORKER_CONNECTION_ERROR' }));
  worker.on('failed', () => log('worker.job_failed', { code: 'RETRY_OR_REDISPATCH' }));
  queue.on('error', () => log('queue.error', { code: 'QUEUE_CONNECTION_ERROR' }));
  let stopping = false;
  let running = false;
  let lastScan = 0;
  async function scan() {
    if (running || stopping) return;
    running = true;
    try { await dispatchBatch(deps.db, queue); lastScan = Date.now(); }
    catch { log('outbox.scan_failed', { code: 'DATABASE_OR_QUEUE_UNAVAILABLE' }); }
    finally { running = false; }
  }
  const timer = setInterval(() => void scan(), 1000);
  void scan();
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/health/live') { res.end(JSON.stringify({ status: 'alive', service: 'worker' })); return; }
    if (req.url !== '/health/ready') { res.writeHead(404); res.end('{"code":"NOT_FOUND"}'); return; }
    const health = await readiness(deps);
    const active = !stopping && Date.now() - lastScan < 5000 && worker.isRunning() && subscriber.status === 'ready' && publisher.status === 'ready';
    res.writeHead(health.status === 'ready' && active ? 200 : 503);
    res.end(JSON.stringify({ ...health, status: health.status === 'ready' && active ? 'ready' : 'unavailable', dispatcher: active ? 'up' : 'down' }));
  });
  server.listen(config.WORKER_HEALTH_PORT, '0.0.0.0');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    stopping = true; clearInterval(timer); server.close();
    void (async () => {
      while (running) await new Promise(resolve => setTimeout(resolve, 50));
      await worker.close(); await queue.close();
      await Promise.allSettled([publisher.quit(), subscriber.quit(), closeResources(deps)]);
    })().catch(() => { process.exitCode = 1; });
  });
  log('service.started', { service: 'worker' });
}
main().catch(() => { log('service.start_failed', { service: 'worker', code: 'STARTUP_FAILED' }); process.exitCode = 1; });
