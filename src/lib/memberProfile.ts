import { ApiError, apiObject } from './apiTransport.ts';

export const memberProfileLimits = {
  displayName: 80, city: 100, phone: 32, organization: 120, bio: 2000,
} as const;
export type ProfileField = keyof typeof memberProfileLimits;
export type MemberProfileInput = Record<ProfileField, string> & { revision: number };
export type SavedMemberProfile = MemberProfileInput & {
  email: string;
  emailVerified: boolean;
  updatedAt: string | null;
};

const validRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483646;
export const profileFields = Object.keys(memberProfileLimits) as ProfileField[];

export function memberProfileErrors(value: MemberProfileInput) {
  const errors: Partial<Record<ProfileField, string>> = {};
  for (const key of profileFields) {
    const max = memberProfileLimits[key];
    if (value[key].trim().length > max) errors[key] = `Use no more than ${max.toLocaleString()} characters.`;
  }
  if (value.displayName.trim().length < 2) errors.displayName = 'Use at least 2 characters.';
  const phone = value.phone.trim();
  if (phone && !/^[+0-9() -]{7,32}$/.test(phone)) errors.phone = 'Use a valid phone number or leave this empty.';
  return errors;
}

export function memberProfileBody(input: MemberProfileInput): MemberProfileInput {
  if (!validRevision(input.revision) || Object.keys(memberProfileErrors(input)).length) {
    throw new ApiError(0, 'INVALID_PROFILE', 'Check your profile details before saving.');
  }
  const { revision, displayName, city, phone, organization, bio } = input;
  return { revision, displayName: displayName.trim(), city: city.trim(), phone: phone.trim(), organization: organization.trim(), bio: bio.trim() };
}

export function parseMemberProfile(value: unknown): SavedMemberProfile {
  const row = apiObject(value);
  const { revision, displayName, city, phone, organization, bio, email, emailVerified, updatedAt } = row;
  const validTimestamp = updatedAt === null || typeof updatedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(updatedAt) && Number.isFinite(Date.parse(updatedAt));
  if (!validRevision(revision) || typeof displayName !== 'string' || displayName.trim().length < 2 ||
      typeof city !== 'string' || typeof phone !== 'string' || typeof organization !== 'string' || typeof bio !== 'string' ||
      typeof email !== 'string' || !email.includes('@') || email.length > 200 || typeof emailVerified !== 'boolean' ||
      !validTimestamp || profileFields.some(key => (row[key] as string).length > memberProfileLimits[key])) {
    throw new ApiError(0, 'INVALID_API_RESPONSE', 'StageLink returned an unexpected profile response.');
  }
  return { revision, displayName, city, phone, organization, bio, email, emailVerified, updatedAt: updatedAt as string | null };
}
