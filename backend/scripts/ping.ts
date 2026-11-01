import { createDb } from '../shared/resources.js';
import { readConfig } from '../shared/config.js';
import { insertPing } from '../shared/outbox.js';
async function main() {
  const config = readConfig();
  if (config.NODE_ENV === 'production') throw new Error('Local diagnostics are disabled in production');
  const db = createDb(config);
  try {
    const event = await db.$transaction(insertPing);
    console.log(JSON.stringify({ eventId: event.id, status: 'committed', note: 'Await worker receipt; not a business transaction' }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Unable to commit diagnostic event'); process.exitCode = 1; });
