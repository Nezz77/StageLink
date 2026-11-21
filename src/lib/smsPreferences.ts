import { configuredApiOrigin, parseApiOrigin } from './apiTransport.ts';
export const smsPreferencesPath = '/account/sms-preferences';

export type SmsChannel = 'booking' | 'marketing' | 'all';
export type SmsSession = { accessToken: string; csrfToken: string; email: string };
export type SmsContact = {
  verified: boolean;
  last4: string | null;
  bookingConsent: boolean;
  marketingConsent: boolean;
};

export class SmsApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('The StageLink API request failed.');
    this.status = status;
  }
}

export { parseApiOrigin } from './apiTransport.ts';
export const configuredSmsApiOrigin = configuredApiOrigin;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Unexpected API response.');
  return value as Record<string, unknown>;
}

async function readContact(response: Response): Promise<SmsContact> {
  const { verified, last4, bookingConsent, marketingConsent } = object(await response.json());
  if (typeof verified !== 'boolean' || typeof bookingConsent !== 'boolean' || typeof marketingConsent !== 'boolean' ||
    (last4 !== null && (typeof last4 !== 'string' || !/^\d{4}$/.test(last4)))) {
    throw new Error('Unexpected SMS contact response.');
  }
  return { verified, last4, bookingConsent, marketingConsent };
}

export function createSmsPreferencesApi(rawOrigin: string, send = fetch) {
  const origin = parseApiOrigin(rawOrigin);
  if (!origin) throw new Error('A StageLink API origin is required.');
  const prefix = new URL('/api/v1/', origin);

  async function request(path: string, body?: object, session?: SmsSession) {
    const response = await send(new URL(path, prefix), {
      method: body ? 'POST' : 'GET',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json',
        ...(session ? { Authorization: 'Bearer ' + session.accessToken } : {}),
        ...(body ? { 'Content-Type': 'application/json', ...(session ? { 'X-CSRF-Token': session.csrfToken } : {}) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new SmsApiError(response.status);
    }
    return response;
  }

  return {
    async signIn(email: string, password: string): Promise<SmsSession> {
      const response = await request('auth/login', { email, password });
      const { accessToken, csrfToken, user } = object(await response.json());
      const { email: signedInEmail } = object(user);
      if (typeof accessToken !== 'string' || accessToken.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken) ||
        typeof csrfToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken) ||
        typeof signedInEmail !== 'string' || !signedInEmail || signedInEmail.length > 200) {
        throw new Error('Unexpected session response.');
      }
      return { accessToken, csrfToken, email: signedInEmail };
    },
    async contact(session: SmsSession) {
      return readContact(await request('me/sms-contact', undefined, session));
    },
    async stop(session: SmsSession, channel: SmsChannel) {
      const updated = await readContact(await request('me/sms-contact/opt-out', { channel }, session));
      if ((channel !== 'marketing' && updated.bookingConsent) || (channel !== 'booking' && updated.marketingConsent)) {
        throw new Error('The API did not confirm the requested opt-out.');
      }
      return updated;
    },
    async signOut(session: SmsSession) {
      await request('auth/logout', {}, session);
    },
  };
}
