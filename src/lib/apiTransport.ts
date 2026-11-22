export function parseApiOrigin(raw: string | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return null;
    return raw === url.origin || raw === url.origin + '/' ? url.origin : null;
  } catch { return null; }
}

export const configuredApiOrigin = parseApiOrigin(import.meta.env?.VITE_STAGELINK_API_ORIGIN);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  constructor(status: number, code: string, message: string, requestId: string | null = null) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.requestId = requestId;
  }
}
export type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  accessToken?: string;
  csrfToken?: string;
  signal?: AbortSignal;
};
const reference = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) ? value : null;
export function apiObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected response.');
  return value as Record<string, unknown>;
}

export function createApiTransport(rawOrigin: string, send: typeof fetch = fetch, credentials: 'include' | 'omit' = 'include') {
  const origin = parseApiOrigin(rawOrigin);
  if (!origin) throw new Error('Configure an HTTPS StageLink API origin, or a loopback development origin.');
  return {
    origin,
    async request(path: string, options: ApiRequest = {}): Promise<unknown> {
      if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) throw new Error('Use a relative StageLink API path.');
      const url = new URL('/api/v1/' + path, origin);
      for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
      const method = options.method ?? 'GET';
      const writes = method !== 'GET';
      if (!writes && options.body !== undefined) throw new Error('GET requests cannot have a body.');
      const headers = new Headers({ Accept: 'application/json' });
      if (options.accessToken) headers.set('Authorization', 'Bearer ' + options.accessToken);
      if (writes) {
        headers.set('Content-Type', 'application/json');
        if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);
      }
      let response: Response;
      try {
        response = await send(url, {
          method, headers, credentials, redirect: 'error', cache: 'no-store',
          signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
          ...(writes ? { body: JSON.stringify(options.body ?? {}) } : {}),
        });
      } catch {
        throw new ApiError(0, options.signal?.aborted ? 'REQUEST_ABORTED' : 'API_UNAVAILABLE', options.signal?.aborted ? 'The request was cancelled.' : 'StageLink could not be reached. Try again.');
      }
      const requestId = reference(response.headers.get('X-Request-ID'));
      let value: unknown = null;
      if (response.status !== 204) {
        const isJson = response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() === 'application/json';
        if (!isJson) {
          await response.body?.cancel().catch(() => undefined);
          throw new ApiError(response.status, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected response.', requestId);
        }
        try { value = await response.json(); }
        catch { throw new ApiError(response.status, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected response.', requestId); }
      }
      if (!response.ok) {
        const details = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
        const code = typeof details.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(details.code) ? details.code : 'API_REQUEST_FAILED';
        const message = typeof details.message === 'string' && details.message.length > 0 && details.message.length <= 500 && !/[\x00-\x1f<>]/.test(details.message) ? details.message : 'StageLink could not complete this request.';
        throw new ApiError(response.status, code, message, requestId ?? reference(details.requestId));
      }
      return value;
    },
  };
}
