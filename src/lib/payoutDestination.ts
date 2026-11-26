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
    throw new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected payout destination.');
  }
  return { holder, bank, branch, revision, accountLast4, status, reviewReason, updatedAt };
}
