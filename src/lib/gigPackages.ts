export const tierIds = ['standard', 'deluxe', 'vip'] as const;
export type TierId = typeof tierIds[number];
export type PackageDraft = { id: TierId; title: string; pricing: 'fixed' | 'custom'; duration: string; performers: string; price: string; included: string; excluded: string; addons: { id: string; title: string; price: string }[] };
export type GigPackage = { id: TierId; title: string; pricing: 'fixed' | 'custom'; durationMinutes: number; performers: number; baseCents: number | null; included: string[]; excluded: string[]; addons: { id: string; title: string; cents: number }[] };
export type PackageChoice = { packageId?: string; packageVersion?: string; packageAddonIds?: string };
export type PackageCatalog = { gigPackages?: GigPackage[]; gigPackageVersion?: string };
export type PackageSnapshot = Omit<GigPackage, 'addons'> & { version: string; addons: GigPackage['addons']; totalCents: number | null };
export const demoPackages = (): PackageDraft[] => [
  { id: 'standard', title: 'Acoustic Solo', pricing: 'fixed', duration: '120', performers: '1', price: '900', included: 'Solo vocal performance\nTailored set list\nSoundcheck', excluded: 'PA system\nLighting', addons: [{ id: 'sound', title: 'Compact PA setup', price: '150' }] },
  { id: 'deluxe', title: 'Full Band & Sound', pricing: 'fixed', duration: '240', performers: '4', price: '2400', included: 'Four-piece live band\nPA & sound engineer\nSoundcheck', excluded: 'Stage lighting\nTravel outside the city', addons: [{ id: 'lights', title: 'Stage lighting', price: '300' }] },
  { id: 'vip', title: 'Your Signature Show', pricing: 'custom', duration: '240', performers: '4', price: '', included: 'Custom repertoire planning\nExtended encores by agreement', excluded: 'Final scope & price require a quotation', addons: [] },
];
export function readPackageDrafts(raw?: string): PackageDraft[] { try { const value = JSON.parse(raw ?? ''); return Array.isArray(value) ? value : []; } catch { return []; } }
const moneyValid = (value: unknown) => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 1 && Number(value) <= 1000000;
const textValid = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
export function packageErrors(raw?: string): string {
  if (!raw) return '';
  if (typeof raw !== 'string' || raw.length > 3000) return 'Keep package details under 3,000 characters.';
  const rows = readPackageDrafts(raw);
  if (rows.length !== 3 || rows.some((p, i) => !p || p.id !== tierIds[i])) return 'Configure Standard, Deluxe and VIP in order.';
  for (const p of rows) {
    const label = p.id.toUpperCase();
    if (!textValid(p.title, 3, 60)) return `${label}: enter a title with 3–60 characters.`;
    if (!['fixed', 'custom'].includes(p.pricing) || (p.id !== 'vip' && p.pricing !== 'fixed')) return `${label}: Standard and Deluxe require a fixed price.`;
    if (!/^\d+$/.test(p.duration) || Number(p.duration) < 30 || Number(p.duration) > 720 || Number(p.duration) % 15) return `${label}: choose 30–720 minutes in 15-minute steps.`;
    if (!/^\d+$/.test(p.performers) || Number(p.performers) < 1 || Number(p.performers) > 50) return `${label}: enter 1–50 performers.`;
    if (p.pricing === 'fixed' ? !moneyValid(p.price) : p.price !== '') return `${label}: ${p.pricing === 'fixed' ? 'enter $1–$1,000,000 with up to two decimals.' : 'leave the price empty for a custom quote.'}`;
    if (!textValid(p.included, 3, 350) || !textValid(p.excluded, 3, 250)) return `${label}: describe included and excluded services (up to 350 / 250 characters).`;
    if (!Array.isArray(p.addons) || p.addons.length > 3 || (p.pricing === 'custom' && p.addons.length)) return `${label}: use up to three add-ons on fixed packages only.`;
    if (p.addons.some(a => !a || !/^[a-z0-9-]{1,24}$/.test(a.id) || !textValid(a.title, 3, 60) || !moneyValid(a.price)) || new Set(p.addons.map(a => a.id)).size !== p.addons.length) return `${label}: give every add-on a unique ID, title and valid price.`;
    if (p.pricing === 'fixed' && Number(p.price) + p.addons.reduce((s, a) => s + Number(a.price), 0) > 1000000) return `${label}: package plus all add-ons must stay within $1,000,000.`;
  }
  return '';
}
export function parsePackages(raw?: string): GigPackage[] | undefined {
  if (!raw || packageErrors(raw)) return undefined;
  const lines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
  return readPackageDrafts(raw).map(p => ({ id: p.id, title: p.title.trim(), pricing: p.pricing, durationMinutes: Number(p.duration), performers: Number(p.performers), baseCents: p.pricing === 'fixed' ? Math.round(Number(p.price) * 100) : null, included: lines(p.included), excluded: lines(p.excluded), addons: p.addons.map(a => ({ id: a.id, title: a.title.trim(), cents: Math.round(Number(a.price) * 100) })) }));
}
export function choiceError(catalog: PackageCatalog, choice: PackageChoice): string {
  if (!catalog.gigPackages?.length) return choice.packageId || choice.packageVersion || choice.packageAddonIds ? 'Packages changed. Clear the old selection and review this listing.' : '';
  const p = catalog.gigPackages.find(p => p.id === choice.packageId);
  if (!p) return 'Choose Standard, Deluxe or VIP before continuing.';
  if (choice.packageVersion !== catalog.gigPackageVersion) return 'Packages changed since your selection. Select your package again.';
  if (typeof choice.packageAddonIds !== 'string' || choice.packageAddonIds.length > 80) return 'Select valid add-ons.';
  const ids = choice.packageAddonIds ? choice.packageAddonIds.split(',') : [];
  if (new Set(ids).size !== ids.length || ids.some(id => !p.addons.some(a => a.id === id))) return 'An add-on is no longer available. Select your package again.';
  return '';
}
export function packageSnapshot(catalog: PackageCatalog, choice: PackageChoice): PackageSnapshot | undefined {
  if (choiceError(catalog, choice)) return undefined;
  const p = catalog.gigPackages?.find(p => p.id === choice.packageId);
  if (!p) return undefined;
  const addons = p.addons.filter(a => choice.packageAddonIds?.split(',').includes(a.id)).map(a => ({ ...a }));
  return { ...p, included: [...p.included], excluded: [...p.excluded], addons, version: catalog.gigPackageVersion!, totalCents: p.baseCents === null ? null : p.baseCents + addons.reduce((s, a) => s + a.cents, 0) };
}
export function packageEnd(start: string, durationMinutes: number): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return '';
  const end = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + durationMinutes;
  return end >= 1440 ? '' : `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}
export const durationLabel = (minutes: number) => `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`;
export function packagePriceLabel(catalog: PackageCatalog, format: (c: number) => string) { const fixed = catalog.gigPackages?.filter(p => p.baseCents !== null).map(p => p.baseCents!); return fixed?.length ? `From ${format(Math.min(...fixed))} / package` : 'Custom quote required'; }
