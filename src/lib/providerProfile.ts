import { ApiError, apiObject } from './apiTransport.ts';

export type ProviderKind = 'artist' | 'renter';
export const artistCategories = ['Vocalist', 'Band', 'DJ', 'Dancer', 'Instrumentalist'] as const;
export const equipmentCategories = ['Sound', 'Lighting', 'Stage', 'Instruments', 'Other'] as const;
export type ArtistDetails = {
  category: typeof artistCategories[number];
  genres: string[];
  experienceYears: number;
  baseRateMinor: number;
  currency: 'LKR';
};
export type DayHours = { day: number; opens: string | null; closes: string | null };
export type RenterDetails = {
  equipmentCategories: (typeof equipmentCategories[number])[];
  operatingHours: DayHours[];
  rentalTerms: string;
  deliveryOffered: boolean;
};
export type ProviderInput = {
  revision: number;
  displayName: string;
  bio: string;
  city: string;
  serviceRadiusKm: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  details: ArtistDetails | RenterDetails;
};
const reviewStatuses = ['draft', 'pending', 'approved', 'rejected'] as const;
export type ProviderProfile = ProviderInput & {
  kind: ProviderKind;
  reviewStatus: typeof reviewStatuses[number];
  reviewReason: string | null;
  approvedRevision: number | null;
  updatedAt: string;
};
const invalid = () => new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected provider profile.');
const integer = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
const oneOf = <T extends string>(value: unknown, choices: readonly T[]): value is T =>
  typeof value === 'string' && (choices as readonly string[]).includes(value);
const short = (s: unknown, max: number): s is string => typeof s === 'string' && s.length <= max;
const coord = (n: unknown, max: number): n is number | null =>
  n === null || typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max;
const time = (n: unknown): n is string => typeof n === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(n);

function hours(value: unknown): DayHours {
  const { day, opens, closes } = apiObject(value);
  if (!integer(day, 0, 6)) throw invalid();
  if (opens === null && closes === null) return { day, opens, closes };
  if (!time(opens) || !time(closes) || opens >= closes) throw invalid();
  return { day, opens, closes };
}

function artist(value: unknown): ArtistDetails {
  const { category, genres, experienceYears, baseRateMinor, currency } = apiObject(value);
  if (!oneOf(category, artistCategories) || !Array.isArray(genres) || genres.length < 1 || genres.length > 8 ||
      !genres.every(g => short(g, 40) && g.length > 0) || !integer(experienceYears, 0, 80) ||
      !integer(baseRateMinor, 0, 100000000) || currency !== 'LKR') throw invalid();
  return { category, genres, experienceYears, baseRateMinor, currency };
}

function renter(value: unknown): RenterDetails {
  const { equipmentCategories: categories, operatingHours, rentalTerms, deliveryOffered } = apiObject(value);
  if (!Array.isArray(categories) || !categories.length || categories.length > 5 ||
      !categories.every(c => oneOf(c, equipmentCategories)) || !Array.isArray(operatingHours) ||
      operatingHours.length !== 7 || !short(rentalTerms, 2000) || typeof deliveryOffered !== 'boolean') throw invalid();
  const days = operatingHours.map(hours).sort((a, b) => a.day - b.day);
  if (new Set(days.map(day => day.day)).size !== 7) throw invalid();
  return { equipmentCategories: categories, operatingHours: days, rentalTerms, deliveryOffered };
}

export function parseProviderProfile(value: unknown, kind: ProviderKind): ProviderProfile | null {
  const { profile } = apiObject(value);
  if (profile === null) return null;
  const { revision, displayName, bio, city, serviceRadiusKm, address, latitude, longitude, details,
    reviewStatus, reviewReason, approvedRevision, updatedAt, kind: responseKind } = apiObject(profile);
  if (responseKind !== kind || !integer(revision, 0, 2147483646) || !short(displayName, 120) ||
      !short(bio, 2000) || !short(city, 100) || !integer(serviceRadiusKm, 1, 500) || !short(address, 200) ||
      !coord(latitude, 90) || !coord(longitude, 180) || (latitude === null) !== (longitude === null) ||
      !oneOf(reviewStatus, reviewStatuses) || (reviewReason !== null && !short(reviewReason, 2000)) ||
      (approvedRevision !== null && !integer(approvedRevision, 0, revision)) ||
      typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) throw invalid();
  return { revision, displayName, bio, city, serviceRadiusKm, address, latitude, longitude, kind,
    details: kind === 'artist' ? artist(details) : renter(details), reviewStatus, reviewReason, approvedRevision, updatedAt };
}

export function lkrToMinor(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim())) throw Error('Enter a valid LKR amount with up to two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (minor > 100000000) throw Error('The starting rate must be LKR 1,000,000 or less.');
  return minor;
}
