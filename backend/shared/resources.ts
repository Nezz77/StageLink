import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import type { Config } from './config.js';

export const MIGRATION = '20261101000000_foundation';
export function createDb(config: Config) {
  return new PrismaClient({ adapter: new PrismaPg({
    connectionString: config.DATABASE_URL, connectionTimeoutMillis: 3000,
    max: 10, idleTimeoutMillis: 1000, statement_timeout: 5000,
  }) });
}
export function resources(config: Config) {
  const db = createDb(config);
  const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
    connectTimeout: 1000, commandTimeout: 1500, retryStrategy: () => null,
  });
  // Errors are reported by health checks without leaking connection credentials.
  redis.on('error', () => {});
  return { db, redis };
}
export type Resources = ReturnType<typeof resources>;

export async function readiness({ db, redis }: Resources) {
  const checks = await Promise.allSettled([
    db.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY started_at DESC LIMIT 1`,
    (async () => {
      if (redis.status === 'wait' || redis.status === 'end') await redis.connect();
      if (await redis.ping() !== 'PONG') throw new Error('Redis unavailable');
    })(),
  ]);
  const postgres = checks[0]?.status === 'fulfilled' && checks[0].value[0]?.migration_name === MIGRATION;
  const redisOk = checks[1]?.status === 'fulfilled';
  return {
    status: postgres && redisOk ? 'ready' as const : 'unavailable' as const,
    dependencies: { postgres: postgres ? 'up' : 'down', redis: redisOk ? 'up' : 'down' },
    schemaVersion: postgres ? MIGRATION : null,
  };
}
export async function closeResources({ db, redis }: Resources) {
  await Promise.allSettled([db.$disconnect(), redis.quit()]);
  redis.disconnect();
}
