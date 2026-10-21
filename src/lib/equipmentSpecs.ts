import { defaultDepositTerms } from './securityDeposit.ts';

export const specFields = [
  ['specWattage', 'Wattage (W)'], ['specSpl', 'Max SPL (dB)'],
  ['specFrequency', 'Frequency response'], ['specWeight', 'Weight (kg)'],
  ['packageInclusions', 'Package inclusions'],
] as const;
export type SpecKey = typeof specFields[number][0];
export type EquipmentFields = Partial<Record<SpecKey | 'specSource', string>>;
export type EquipmentForm = EquipmentFields & { title: string; description: string; depositMode?: string; depositValue?: string; depositTerms?: string; depositCurrency?: string };
export type SuggestionKey = SpecKey | 'description' | 'deposit';
export type EquipmentSuggestion = { model: string; fields: Partial<Record<SpecKey | 'description', string>>; depositUSD: string; source: string; partial: boolean };
export type LookupOutcome = { kind: 'match'; suggestion: EquipmentSuggestion } | { kind: 'no-match' | 'unavailable' | 'invalid' };
export const equipmentTitleKey = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ');
const source = 'Illustrative demo catalog · not manufacturer-verified';
export const equipmentFixtures: EquipmentSuggestion[] = [
  { model: 'Yamaha DXR15', source, partial: false, depositUSD: '100.00', fields: {
    specWattage: '1100', specSpl: '133', specFrequency: '56 Hz – 20 kHz', specWeight: '22.5',
    packageInclusions: 'Power cable\nXLR cable\nSoft pouch',
    description: 'Powered speaker for event sound. Confirm the unit, accessories, power and setup requirements before collection.',
  } },
  { model: 'Chauvet Intimidator', source, partial: true, depositUSD: '100.00', fields: {
    packageInclusions: 'Power cable\nMounting bracket',
    description: 'Moving-head lighting fixture for stage use. Confirm the exact model variant, wattage, weight and accessories before collection.',
  } },
];
export function equipmentErrors(fields: EquipmentFields) {
  const errors: Partial<Record<keyof EquipmentFields, string>> = {};
  for (const [key, label, max] of [['specWattage', 'wattage', 1000000], ['specSpl', 'SPL', 250], ['specWeight', 'weight', 100000]] as const) {
    const value = fields[key];
    if (value !== undefined && (typeof value !== 'string' || (value.trim() && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > max))))
      errors[key] = `Enter a positive ${label} up to ${max.toLocaleString('en-US')}, with up to two decimals, or leave blank.`;
  }
  for (const [key, max] of [['specFrequency', 120], ['packageInclusions', 1000], ['specSource', 200]] as const) {
    if (fields[key] !== undefined && (typeof fields[key] !== 'string' || fields[key].length > max)) errors[key] = `Keep this under ${max.toLocaleString('en-US')} characters.`;
  }
  return errors;
}
export function validSuggestion(value: unknown): value is EquipmentSuggestion {
  if (!value || typeof value !== 'object') return false;
  const s = value as EquipmentSuggestion;
  if (typeof s.model !== 'string' || !s.model.trim() || s.model.length > 140 || typeof s.source !== 'string' || s.source.length > 200 || typeof s.partial !== 'boolean' || !s.fields || typeof s.fields !== 'object') return false;
  if (typeof s.depositUSD !== 'string' || !/^\d+(\.\d{1,2})?$/.test(s.depositUSD) || Number(s.depositUSD) <= 0 || Number(s.depositUSD) > 1000000) return false;
  const allowed = [...specFields.map(([key]) => key), 'description'];
  if (!Object.keys(s.fields).length || Object.entries(s.fields).some(([key, text]) => !allowed.includes(key) || typeof text !== 'string' || !text.trim())) return false;
  if (Object.keys(equipmentErrors(s.fields)).length) return false;
  const d = s.fields.description;
  return d === undefined || (d.trim().length >= 20 && d.length <= 2000);
}
export async function lookupEquipment(title: string, scenario: 'normal' | 'unavailable' | 'invalid', signal: AbortSignal, delay = 700): Promise<LookupOutcome> {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (scenario === 'unavailable') return { kind: 'unavailable' };
  if (scenario === 'invalid') return { kind: 'invalid' };
  const match = equipmentFixtures.find(s => equipmentTitleKey(s.model) === equipmentTitleKey(title));
  return match && validSuggestion(match) ? { kind: 'match', suggestion: structuredClone(match) } : { kind: 'no-match' };
}
export function suggestionChoices(form: EquipmentForm, s: EquipmentSuggestion): SuggestionKey[] {
  return (Object.keys(s.fields) as (SpecKey | 'description')[]).filter(key => !form[key]?.trim());
}
export function applyEquipmentSuggestion(form: EquipmentForm, baseline: EquipmentForm, requestedTitle: string, suggestion: EquipmentSuggestion, selected: SuggestionKey[]): { patch?: EquipmentFields & Partial<EquipmentForm>; error?: string } {
  if (equipmentTitleKey(form.title) !== equipmentTitleKey(requestedTitle) || equipmentTitleKey(suggestion.model) !== equipmentTitleKey(requestedTitle)) return { error: 'Equipment name changed. Run a new lookup before applying suggestions.' };
  if (!validSuggestion(suggestion) || !selected.length || new Set(selected).size !== selected.length || selected.some(key => key !== 'deposit' && suggestion.fields[key] === undefined)) return { error: 'Select available suggestions to apply.' };
  const keys = selected.flatMap(key => key === 'deposit' ? ['depositMode', 'depositValue', 'depositTerms', 'depositCurrency'] : [key]) as (keyof EquipmentForm)[];
  if (keys.some(key => (form[key] ?? '') !== (baseline[key] ?? ''))) return { error: 'A selected field changed during review. Run a new lookup to keep your latest edits safe.' };
  const patch: EquipmentFields & Partial<EquipmentForm> = {};
  for (const key of selected) {
    if (key === 'deposit') Object.assign(patch, { depositMode: 'fixed', depositValue: suggestion.depositUSD, depositTerms: defaultDepositTerms, depositCurrency: 'USD' });
    else patch[key] = suggestion.fields[key];
  }
  if (selected.some(key => specFields.some(([field]) => field === key))) patch.specSource = `${suggestion.model} · ${suggestion.source}`.slice(0, 200);
  return { patch };
}
