import { z } from 'zod';

const networkUrl = (protocols: string[]) => z.string().url().refine(value =>
  { try { return protocols.includes(new URL(value).protocol); } catch { return false; } }, 'Unsupported protocol');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: networkUrl(['postgresql:', 'postgres:']),
  REDIS_URL: networkUrl(['redis:', 'rediss:']),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000').refine(value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    } catch { return false; }
  }, 'Must be an HTTP origin without a trailing slash or path'),
});
export type Config = z.infer<typeof schema>;
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  // Never include values, passwords or URLs in configuration errors.
  if (!result.success) throw new Error('Invalid configuration: ' +
    [...new Set(result.error.issues.map(issue => issue.path.join('.')))].join(', '));
  return result.data;
}
