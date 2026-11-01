import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

export const QUEUE = 'stagelink-outbox-v1';
export const PING_TOPIC = 'foundation.ping.v1';
const CONSUMER = 'foundation-v1';
type Publisher = { add(name: string, data: { eventId: string }, options: { jobId: string }): Promise<unknown> };

// Future business commands insert their event inside the same transaction as their state change.
export function insertPing(tx: Prisma.TransactionClient) {
  return tx.outboxEvent.create({ data: { id: randomUUID(), topic: PING_TOPIC, payload: { version: 1 } } });
}
export async function dispatchBatch(db: PrismaClient, queue: Publisher) {
  // Short lease + SKIP LOCKED allow competing dispatchers; no network call holds a DB transaction.
  const claimed = await db.$queryRaw<Array<{ id: string }>>`
    WITH pending AS (
      SELECT id FROM outbox_events
      WHERE processed_at IS NULL AND dead_lettered_at IS NULL AND available_at <= NOW()
        AND (locked_until IS NULL OR locked_until < NOW())
      ORDER BY created_at LIMIT 25 FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox_events e SET locked_until = NOW() + INTERVAL '10 seconds', attempts = attempts + 1
    FROM pending WHERE e.id = pending.id RETURNING e.id`;
  for (const event of claimed) {
    try {
      await queue.add('deliver', { eventId: event.id }, { jobId: event.id });
      await db.outboxEvent.update({ where: { id: event.id }, data: {
        enqueuedAt: new Date(), lastErrorCode: null,
      } });
      // Not marked processed here. Redis loss or a crash is repaired by later redispatch.
    } catch {
      await db.outboxEvent.update({ where: { id: event.id }, data: {
        lastErrorCode: 'QUEUE_UNAVAILABLE',
      } });
    }
  }
  return claimed.length;
}
export async function consume(db: PrismaClient, eventId: string) {
  await db.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ topic: string; payload: unknown; processed_at: Date | null; dead_lettered_at: Date | null }>>`
      SELECT topic, payload, processed_at, dead_lettered_at FROM outbox_events
      WHERE id = ${eventId}::uuid FOR UPDATE`;
    const event = rows[0];
    if (!event) throw new Error('EVENT_NOT_FOUND');
    if (event.processed_at || event.dead_lettered_at) return;
    if (event.topic !== PING_TOPIC || JSON.stringify(event.payload) !== '{"version":1}') {
      await tx.outboxEvent.update({ where: { id: eventId }, data: {
        deadLetteredAt: new Date(), lastErrorCode: 'UNSUPPORTED_EVENT', lockedUntil: null,
      } });
      return;
    }
    const receipt = await tx.consumedEvent.createMany({
      data: { consumer: CONSUMER, eventId }, skipDuplicates: true,
    });
    if (receipt.count) await tx.foundationReceipt.create({ data: { eventId } });
    await tx.outboxEvent.update({ where: { id: eventId }, data: {
      processedAt: new Date(), lockedUntil: null, lastErrorCode: null,
    } });
  });
}
