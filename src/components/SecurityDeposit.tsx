import { money } from '../lib/booking';
import { depositPolicy, snapshotDeposit, type DepositFields, type DepositSnapshot } from '../lib/securityDeposit';
import '../security-deposit.css';

export function DepositSummary({ snapshot, legacy = false, preview = false }: { snapshot?: DepositSnapshot; legacy?: boolean; preview?: boolean }) {
  if (!snapshot && !legacy) return null;
  return <aside className="sl-deposit-summary" aria-label="Refundable security deposit">
    <span className="sl-eyebrow">{preview ? 'POLICY PREVIEW' : 'EQUIPMENT / SECURITY DEPOSIT'}</span>
    <h3>{snapshot ? snapshot.policy.mode === 'none' ? 'No security deposit' : `${money(snapshot.amountCents)} refundable deposit` : 'No deposit policy recorded'}</h3>
    {snapshot && snapshot.policy.mode !== 'none' && <><p>{snapshot.policy.mode === 'percentage' ? `${snapshot.policy.value}% of the ${money(snapshot.rentalSubtotalCents)} rental subtotal` : 'Fixed amount per booking · independent of quantity'} · {snapshot.policy.currency}</p><p>{snapshot.policy.terms}</p></>}
    <p className="mg-muted">{legacy ? 'This earlier booking has no agreed deposit policy. Current listing edits do not add one.' : preview ? 'Rental subtotal excludes the security deposit, payment fees and overtime. New booking requests copy this policy; later listing edits do not change it.' : 'Policy copied with this request. A percentage follows the rental quote until accepted; then its amount is fixed. Listing edits do not change this agreement.'}</p>
    {snapshot && snapshot.policy.mode !== 'none' && <p className="mg-muted">Separate from the rental advance and provider payout. Policy preview only: this demo does not collect, hold or refund the security deposit.</p>}
  </aside>;
}
export function DepositPolicyEditor({ fields, errors, onChange }: { fields: DepositFields & { price: string }; errors: Partial<Record<keyof DepositFields, string>>; onChange: (key: keyof DepositFields, value: string) => void }) {
  const policy = depositPolicy(fields);
  const snapshot = snapshotDeposit(fields, Math.round((Number(fields.price) || 0) * 100));
  return <fieldset className="sl-deposit-editor"><legend>Refundable security deposit</legend>
    <p className="mg-muted">Choose how this equipment is protected. Currency: USD.</p>
    <div className="sl-deposit-modes">{([['none', 'No deposit'], ['fixed', 'Fixed amount'], ['percentage', 'Percentage']] as const).map(([mode, label]) => <label key={mode}><input type="radio" name="deposit-policy" checked={policy.mode === mode} onChange={() => onChange('depositMode', mode)} />{label}</label>)}</div>
    {errors.depositMode && <p className="mg-error" role="alert">{errors.depositMode}</p>}
    {policy.mode !== 'none' && <><label className="mg-field">{policy.mode === 'percentage' ? 'Deposit percentage (%)' : 'Fixed deposit (USD per booking)'}<input name="deposit-value" inputMode="decimal" type="number" min="0.01" step="0.01" max={policy.mode === 'percentage' ? '100' : '1000000'} value={policy.value} onChange={e => onChange('depositValue', e.target.value)} aria-invalid={!!errors.depositValue} aria-describedby="deposit-value-help deposit-value-error" /><small id="deposit-value-help">{policy.mode === 'percentage' ? 'Based on the agreed rental subtotal, including booked quantity. Deposit, fees and overtime are excluded.' : 'One fixed deposit per booking, regardless of rented quantity.'}</small>{errors.depositValue && <small id="deposit-value-error" role="alert" className="mg-error">{errors.depositValue}</small>}</label>
    <label className="mg-field">Refund conditions<textarea rows={4} maxLength={1000} value={policy.terms} onChange={e => onChange('depositTerms', e.target.value)} aria-invalid={!!errors.depositTerms} aria-describedby={errors.depositTerms ? 'deposit-terms-error' : undefined} />{errors.depositTerms && <small id="deposit-terms-error" role="alert" className="mg-error">{errors.depositTerms}</small>}</label></>}
    <div aria-live="polite">{snapshot ? <DepositSummary snapshot={snapshot} preview /> : <p className="mg-muted">Enter a valid policy to preview the deposit.</p>}</div>
    {snapshot && <p className="mg-muted">Preview: 1 unit × {money(snapshot.rentalSubtotalCents)} / {fields.price ? 'listed unit' : 'unit'}. The customer’s actual booking quantity determines the rental subtotal.</p>}
  </fieldset>;
}
