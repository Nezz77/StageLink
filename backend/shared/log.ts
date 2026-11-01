// Explicit allowlist: never log bodies, headers, tokens, credentials or raw errors.
export function log(event: string, fields: {
  requestId?: string; method?: string; status?: number; durationMs?: number;
  eventId?: string; code?: string; service?: string;
} = {}): void {
  process.stdout.write(JSON.stringify({ time: new Date().toISOString(), event, ...fields }) + '\n');
}
