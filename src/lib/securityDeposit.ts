// Refundable equipment deposit policy. USD demo; no custody, collection or refund ledger.
export type DepositFields = { depositMode?: 'none' | 'fixed' | 'percentage'; depositValue?: string; depositTerms?: string; depositCurrency?: 'USD' };
export type DepositPolicy = { mode: 'none' | 'fixed' | 'percentage'; value: string; terms: string; currency: 'USD' };
export type DepositSnapshot = { policy: DepositPolicy; rentalSubtotalCents: number; amountCents: number };
export const defaultDepositTerms = 'Refundable after the return inspection confirms the equipment is complete and in the agreed condition. Any proposed deduction requires evidence and review.';
export function depositPolicy(fields: DepositFields): DepositPolicy {
  return { mode: fields.depositMode ?? 'none', value: fields.depositValue ?? '', terms: fields.depositTerms ?? defaultDepositTerms, currency: fields.depositCurrency ?? 'USD' };
}
export function depositErrors(fields: DepositFields) {
  const p = depositPolicy(fields), errors: Partial<Record<keyof DepositFields, string>> = {};
  if (!['none', 'fixed', 'percentage'].includes(p.mode)) errors.depositMode = 'Choose no deposit, a fixed amount or a percentage.';
  if (p.currency !== 'USD') errors.depositCurrency = 'This demo uses USD.';
  if (p.mode !== 'none') {
    const max = p.mode === 'percentage' ? 100 : 1000000;
    if (typeof p.value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(p.value) || Number(p.value) <= 0 || Number(p.value) > max)
      errors.depositValue = p.mode === 'percentage' ? 'Enter more than 0 and up to 100%, with up to two decimals.' : 'Enter $0.01–$1,000,000 with up to two decimals.';
    if (typeof p.terms !== 'string' || p.terms.trim().length < 20 || p.terms.length > 1000) errors.depositTerms = 'Explain the refund conditions in 20–1,000 characters.';
  }
  return errors;
}
export function snapshotDeposit(fields: DepositFields, rentalSubtotalCents: number): DepositSnapshot | undefined {
  if (Object.keys(depositErrors(fields)).length || !Number.isSafeInteger(rentalSubtotalCents) || rentalSubtotalCents < 0) return undefined;
  const policy = depositPolicy(fields);
  const valueMinor = Math.round(Number(policy.value) * 100);
  const amountCents = policy.mode === 'none' ? 0 : policy.mode === 'fixed' ? valueMinor : Math.round(rentalSubtotalCents * valueMinor / 10000);
  return { policy: { ...policy, value: policy.mode === 'none' ? '' : policy.value, terms: policy.mode === 'none' ? '' : policy.terms.trim() }, rentalSubtotalCents, amountCents };
}
export function repriceDeposit(snapshot: DepositSnapshot | undefined, rentalSubtotalCents: number) {
  if (!snapshot) return undefined;
  const p = snapshot.policy;
  return snapshotDeposit({ depositMode: p.mode, depositValue: p.value, depositTerms: p.terms, depositCurrency: p.currency }, rentalSubtotalCents);
}
