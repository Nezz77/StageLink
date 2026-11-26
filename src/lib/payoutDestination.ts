import { ApiError, apiObject } from './apiTransport.ts';

export type PayoutDestinationInput = {
  holder: string;
  bank: string;
  branch: string;
  number: string;
  password: string;
  revision: number;
};
export type PayoutDestination = Pick<PayoutDestinationInput, 'holder' | 'bank' | 'branch' | 'revision'> & {
  accountLast4: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewReason: string | null;
  updatedAt: string;
};
export type PayoutSubmission = PayoutDestination & { userId: string; displayName: string; kind: 'payout' };
const invalidDestination = () => new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected payout destination.');

export function parsePayoutDestination(value: unknown): PayoutDestination | null {
  const { destination } = apiObject(value);
  if (destination === null) return null;
  const { holder, bank, branch, revision, accountLast4, status, reviewReason, updatedAt } = apiObject(destination);
  const text = (entry: unknown): entry is string => typeof entry === 'string' && entry.length >= 2 && entry.length <= 100;
  if (!text(holder) || !text(bank) || !text(branch) ||
      typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1 || revision > 2147483646 ||
      typeof accountLast4 !== 'string' || !/^\d{4}$/.test(accountLast4) ||
      (status !== 'pending' && status !== 'approved' && status !== 'rejected') ||
      (reviewReason !== null && (typeof reviewReason !== 'string' || reviewReason.length > 2000)) ||
      typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) {
    throw invalidDestination();
  }
  return { holder, bank, branch, revision, accountLast4, status, reviewReason, updatedAt };
}

export function parsePayoutSubmissions(value: unknown): PayoutSubmission[] {
  const { payouts } = apiObject(value);
  if (!Array.isArray(payouts) || payouts.length > 25) throw invalidDestination();
  return payouts.map(value => {
    const { userId, displayName, destination } = apiObject(value);
    const saved = parsePayoutDestination({ destination });
    if (!saved || saved.status !== 'pending' || typeof displayName !== 'string' || displayName.length > 120 ||
        typeof userId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId)) {
      throw invalidDestination();
    }
    return { ...saved, userId, displayName, kind: 'payout' };
  });
}
