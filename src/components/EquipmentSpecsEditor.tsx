import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { applyEquipmentSuggestion, equipmentTitleKey, lookupEquipment, specFields, suggestionChoices, type EquipmentForm, type EquipmentSuggestion, type SuggestionKey } from '../lib/equipmentSpecs';
import type { Listing } from '../lib/dashboard';
import '../equipment-specs.css';

export default function EquipmentSpecsEditor({ form, errors, onChange, onApply }: { form: Listing; errors: Partial<Record<keyof Listing, string>>; onChange: (key: keyof Listing, value: string) => void; onApply: (patch: Partial<Listing>) => void }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [scenario, setScenario] = useState<'normal' | 'unavailable' | 'invalid'>('normal');
  const [review, setReview] = useState<{ suggestion: EquipmentSuggestion; baseline: EquipmentForm; title: string } | null>(null);
  const [selected, setSelected] = useState<SuggestionKey[]>([]);
  const pending = useRef<{ controller: AbortController; title: string } | null>(null);
  const titleKey = equipmentTitleKey(form.title);
  useEffect(() => () => pending.current?.controller.abort(), []);
  useEffect(() => { if (pending.current && pending.current.title !== titleKey) { pending.current.controller.abort(); pending.current = null; setBusy(false); } setReview(previous => previous && equipmentTitleKey(previous.title) === titleKey ? previous : null); setNotice(''); }, [titleKey]);
  async function lookup() {
    pending.current?.controller.abort(); const controller = new AbortController(); pending.current = { controller, title: titleKey };
    const baseline = { ...form }; setBusy(true); setNotice(''); setReview(null);
    try {
      const result = await lookupEquipment(form.title, scenario, controller.signal);
      if (controller.signal.aborted) return;
      if (result.kind === 'match') { setReview({ suggestion: result.suggestion, baseline, title: form.title }); setSelected(suggestionChoices(baseline, result.suggestion)); }
      else setNotice(result.kind === 'unavailable' ? 'Sample service is unavailable. Retry or enter the specs manually; your fields are unchanged.' : result.kind === 'invalid' ? 'The sample response could not be read safely. Nothing was applied. Retry or enter specs manually.' : 'No sample match. Try Yamaha DXR15 or Chauvet Intimidator, or enter the specs manually.');
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Lookup failed. Your fields are unchanged; you can enter specs manually.'); }
    finally { if (pending.current?.controller === controller) setBusy(false); }
  }
  return <fieldset className="sl-specs"><legend>Equipment specifications</legend>
    <div className="sl-specs-actions"><button type="button" className="btn-ghost" disabled={busy || form.title.trim().length < 3} onClick={lookup}>{busy ? <LoaderCircle size={16} className="sl-specs-spin" /> : <Sparkles size={16} />}{busy ? 'Looking up sample specs…' : 'Auto-Fill Specs with AI'}</button>{busy && <button type="button" className="btn-ghost" onClick={() => { pending.current?.controller.abort(); setBusy(false); setNotice('Lookup cancelled. Your fields are unchanged.'); }}>Cancel lookup</button>}</div>
    <p className="mg-muted">Demo catalog · no AI service connected. Suggestions are illustrative, not manufacturer-verified. Confirm the exact model and nameplate before publishing.</p>
    <details><summary>Try sample outcomes</summary><label className="mg-field">Demo response<select value={scenario} disabled={busy} onChange={e => setScenario(e.target.value as typeof scenario)}><option value="normal">Sample catalog</option><option value="unavailable">Service unavailable</option><option value="invalid">Unreadable response</option></select></label><p className="mg-muted">Yamaha DXR15: full sample. Chauvet Intimidator: partial sample. Other names: no match.</p></details>
    {busy && <p role="status">Looking up sample specs. Your listing is unchanged.</p>}
    {!!notice && <p className="sl-specs-notice" role="status">{notice}</p>}
    {review && <section className="sl-specs-review" aria-label="Review suggested specifications"><span className="sl-eyebrow">REVIEW BEFORE APPLYING</span><h3>{review.suggestion.partial ? 'Partial suggestions' : 'Suggested specifications'}</h3><p>{review.suggestion.model} · {review.suggestion.source}</p>{review.suggestion.partial && <p>Exact model details are missing. Unavailable specs stay unchanged; enter missing details manually.</p>}
      <div className="sl-specs-choices">{([...specFields.map(([key, label]) => [key, label] as const), ['description', 'Description'] as const, ['deposit', 'Recommended fixed deposit (USD)'] as const]).map(([key, label]) => {
        const value = key === 'deposit' ? `$${review.suggestion.depositUSD} per booking` : review.suggestion.fields[key];
        if (!value) return <p key={key} className="mg-muted">{label}: not supplied · enter manually</p>;
        const current = key === 'deposit' ? `${form.depositMode ?? 'none'} ${form.depositValue ?? ''}` : form[key];
        return <label className="sl-specs-choice" key={key}><input type="checkbox" checked={selected.includes(key)} onChange={e => setSelected(previous => e.target.checked ? [...previous, key] : previous.filter(k => k !== key))} /><span><strong>{label}</strong><small>Current: {current?.trim() || 'Empty'} → Suggested: {value}</small>{key === 'deposit' && <small>Optional. Replaces the current deposit policy with this fixed amount and standard editable refund terms. No money is charged.</small>}</span></label>;
      })}</div>
      <p className="mg-muted">Existing values start unselected. Apply only the fields you approve; price, quantity, status and equipment name stay unchanged.</p>
      <div className="sl-specs-actions"><button type="button" className="btn-primary" disabled={!selected.length} onClick={() => { const result = applyEquipmentSuggestion(form, review.baseline, review.title, review.suggestion, selected); if (result.patch) { onApply(result.patch as Partial<Listing>); setReview(null); setNotice('Selected suggestions applied. Review or edit the fields, then save your listing.'); } else setNotice(result.error ?? 'Nothing was applied.'); }}>Apply selected suggestions</button><button type="button" className="btn-ghost" onClick={() => { setReview(null); setNotice('Suggestions dismissed. Your fields are unchanged.'); }}>Keep my fields</button></div>
    </section>}
    <div className="sl-specs-grid">{specFields.map(([key, label]) => <label className={`mg-field ${key === 'packageInclusions' ? 'sl-specs-wide' : ''}`} key={key}>{label}{key === 'packageInclusions' ? <textarea aria-label={label} rows={3} maxLength={1000} value={form[key] ?? ''} onChange={e => onChange(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} /> : <input aria-label={label} type={key === 'specFrequency' ? 'text' : 'number'} inputMode={key === 'specFrequency' ? undefined : 'decimal'} min={key === 'specFrequency' ? undefined : '.01'} step={key === 'specFrequency' ? undefined : '.01'} maxLength={key === 'specFrequency' ? 120 : undefined} value={form[key] ?? ''} onChange={e => onChange(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} />}{errors[key] && <small className="mg-error" role="alert" id={`${key}-error`}>{errors[key]}</small>}</label>)}</div>
    <p className="mg-muted">Optional fields. Leave unknown values blank. Package inclusions: one item per line.</p>
    {form.specSource && <p className="mg-muted">Suggestion origin: {form.specSource}. Fields may have been edited; verify before publishing.</p>}
  </fieldset>;
}
