import { apiObject, configuredApiOrigin, createApiTransport } from './apiTransport.ts';
export { ApiError as SmsApiError, parseApiOrigin } from './apiTransport.ts';
export const smsPreferencesPath = '/account/sms-preferences';
export const configuredSmsApiOrigin = configuredApiOrigin;

export type SmsTopic = 'booking' | 'marketing';
export type SmsChannel = SmsTopic | 'all';
export type SmsSession = { accessToken: string; csrfToken: string; email: string; emailVerified: boolean };
type SmsChallenge = { id: string; last4: string; expiresAt: string; status: string };
type SmsDelivery = { id: string; status: string };
export type SmsHistory = {
  verifications: (SmsDelivery & { last4: string; createdAt: string; confirmedAt: string | null })[];
  reminders: (SmsDelivery & { startsAt: string; dueAt: string; offsetHours: 2 | 24 })[];
};
export type SmsContact = {
  revision: number;
  enabled: boolean;
  verified: boolean;
  last4: string | null;
  bookingConsent: boolean;
  marketingConsent: boolean;
  pending: SmsChallenge | null;
};

export function normalizeSmsNumber(value: string) {
  const digits = value.trim().replace(/[ -]/g, '');
  if (!/^(?:0|\+?94)7\d{8}$/.test(digits)) return null;
  return '+' + digits.replace(/^\+/, '').replace(/^0/, '94');
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function isMaskedNumber(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

function readDelivery({ id, status }: Record<string, unknown>): SmsDelivery {
  if (typeof id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) ||
    typeof status !== 'string' || !/^[a-z_]{1,32}$/.test(status)) {
    throw new Error('Unexpected SMS delivery response.');
  }
  return { id, status };
}

function readChallenge(value: unknown): SmsChallenge | null {
  if (value === null) return null;
  const entry = apiObject(value);
  const { last4, expiresAt } = entry;
  if (!isMaskedNumber(last4) || !isTimestamp(expiresAt)) {
    throw new Error('Unexpected SMS verification response.');
  }
  return { ...readDelivery(entry), last4, expiresAt };
}

function historyItems(value: unknown) {
  const { items } = apiObject(value);
  if (!Array.isArray(items) || items.length > 20) throw new Error('Unexpected SMS history response.');
  return items.map(apiObject);
}

function readHistory(verifications: unknown, reminders: unknown): SmsHistory {
  return {
    verifications: historyItems(verifications).map(entry => {
      const { last4, createdAt, confirmedAt } = entry;
      if (!isMaskedNumber(last4) || !isTimestamp(createdAt) || (confirmedAt !== null && !isTimestamp(confirmedAt))) {
        throw new Error('Unexpected SMS verification history response.');
      }
      return { ...readDelivery(entry), last4, createdAt, confirmedAt };
    }),
    reminders: historyItems(reminders).map(entry => {
      const { startsAt, dueAt, offsetHours } = entry;
      if (!isTimestamp(startsAt) || !isTimestamp(dueAt) || (offsetHours !== 2 && offsetHours !== 24)) {
        throw new Error('Unexpected SMS reminder history response.');
      }
      return { ...readDelivery(entry), startsAt, dueAt, offsetHours };
    }),
  };
}

function readContact(value: unknown): SmsContact {
  const { revision, enabled, verified, last4, bookingConsent, marketingConsent, pending } = apiObject(value);
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0 || revision > 2147483646 ||
    typeof enabled !== 'boolean' || typeof verified !== 'boolean' ||
    typeof bookingConsent !== 'boolean' || typeof marketingConsent !== 'boolean' ||
    (last4 !== null && !isMaskedNumber(last4))) {
    throw new Error('Unexpected SMS contact response.');
  }
  return { revision, enabled, verified, last4, bookingConsent, marketingConsent, pending: readChallenge(pending) };
}

export function createSmsPreferencesApi(rawOrigin: string, send = fetch) {
  const api = createApiTransport(rawOrigin, send, 'omit');
  const contactPath = 'me/sms-contact';

  return {
    async signIn(email: string, password: string): Promise<SmsSession> {
      const { accessToken, csrfToken, user } = apiObject(await api.request('auth/login', { method: 'POST', body: { email, password } }));
      const { email: signedInEmail, emailVerified } = apiObject(user);
      if (typeof accessToken !== 'string' || accessToken.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken) ||
        typeof csrfToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(csrfToken) ||
        typeof signedInEmail !== 'string' || !signedInEmail || signedInEmail.length > 200 || typeof emailVerified !== 'boolean') {
        throw new Error('Unexpected session response.');
      }
      return { accessToken, csrfToken, email: signedInEmail, emailVerified };
    },
    async contact(session: SmsSession) {
      return readContact(await api.request(contactPath, session));
    },
    async history(session: SmsSession) {
      const [verifications, reminders] = await Promise.all([
        api.request('me/sms-verifications', session),
        api.request('me/booking-sms-reminders', session),
      ]);
      return readHistory(verifications, reminders);
    },
    async requestCode(session: SmsSession, revision: number, number: string) {
      return readContact(await api.request(contactPath + '/verification', { ...session, method: 'POST', body: { revision, number } }));
    },
    async confirmCode(session: SmsSession, challengeId: string, code: string) {
      return readContact(await api.request(contactPath + '/confirm', { ...session, method: 'POST', body: { challengeId, code } }));
    },
    async enable(session: SmsSession, contact: SmsContact, topic: SmsTopic) {
      const body = {
        revision: contact.revision,
        bookingConsent: topic === 'booking' || contact.bookingConsent,
        marketingConsent: topic === 'marketing' || contact.marketingConsent,
      };
      const updated = readContact(await api.request(contactPath + '/consent', { ...session, method: 'PUT', body }));
      if (topic === 'booking' ? !updated.bookingConsent : !updated.marketingConsent) {
        throw new Error('The API did not confirm the requested opt-in.');
      }
      return updated;
    },
    async stop(session: SmsSession, channel: SmsChannel) {
      const updated = readContact(await api.request(contactPath + '/opt-out', { ...session, method: 'POST', body: { channel } }));
      if ((channel !== 'marketing' && updated.bookingConsent) || (channel !== 'booking' && updated.marketingConsent)) {
        throw new Error('The API did not confirm the requested opt-out.');
      }
      return updated;
    },
    async remove(session: SmsSession, revision: number) {
      const updated = readContact(await api.request(contactPath + '/revoke', { ...session, method: 'POST', body: { revision } }));
      if (updated.verified || updated.last4 || updated.pending || updated.bookingConsent || updated.marketingConsent) {
        throw new Error('The API did not confirm contact removal.');
      }
      return updated;
    },
    async signOut(session: SmsSession) {
      await api.request('auth/logout', { ...session, method: 'POST' });
    },
  };
}
