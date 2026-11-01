import { createApp } from './app.js';
import { readConfig } from '../../shared/config.js';
import { log } from '../../shared/log.js';

async function main() {
  const config = readConfig();
  const { app } = await createApp(config);
  await app.listen(config.PORT, '0.0.0.0');
  log('service.started', { service: 'api' });
}
main().catch(() => {
  log('service.start_failed', { service: 'api', code: 'STARTUP_FAILED' });
  process.exitCode = 1;
});
