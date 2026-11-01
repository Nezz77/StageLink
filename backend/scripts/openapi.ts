import { writeFile } from 'node:fs/promises';
import { createApp } from '../api/src/app.js';
import { readConfig } from '../shared/config.js';
async function main() {
  // Contract generation never opens connections or needs real credentials.
  const { app, document } = await createApp(readConfig({ NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused?connect_timeout=1',
    REDIS_URL: 'redis://127.0.0.1:1',
  }));
  await writeFile('../contracts/openapi.json', JSON.stringify(document, null, 2) + '\n');
  await app.close();
}
void main();
