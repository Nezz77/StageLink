import { depositPolicy, type DepositPolicy } from './securityDeposit.ts';
import type { DashboardState } from './dashboard';
export type Service = { depositPolicy?: DepositPolicy; id: string; listingId?: string; name: string; provider: string; detail: string; role: 'artist' | 'renter'; rate: number; unit: 'hour' | 'event' | 'day'; initials: string; capacity: number; available: boolean };
export type Availability = { days: number[]; start: string; end: string; blocks: { id: string; date: string; start: string; end: string; reason: string }[] };
export const defaultAvailability = (): Availability => ({ days: [0,1,2,3,4,5,6], start: '00:00', end: '23:59', blocks: [] });
export const serviceIdFor = (listingId: string) => ({ 'GIG-001': 'aria', 'EQ-001': 'pa', 'EQ-002': 'lights' }[listingId] ?? listingId);
export function catalogFor(state: DashboardState): Service[] {
  return state.listings.map(item => { const profile = state.profiles[item.owner]; return {
    depositPolicy: item.owner === 'renter' ? depositPolicy(item) : undefined,
    id: serviceIdFor(item.id), listingId: item.id, name: `${profile.name} · ${item.title}`, provider: profile.name, detail: item.description, role: item.owner,
    rate: Math.round(Number(item.price) * 100), unit: item.unit, initials: profile.name.split(/\s+/).map(part => part[0]).slice(0,2).join(''),
    capacity: item.owner === 'artist' ? 1 : Number(item.quantity), available: item.status === 'live',
  }; });
}
