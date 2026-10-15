import { initialCommunity, reduceCommunity, type CommunityState, type CommunityAction } from './community.ts';
import type { BookingRole } from './booking.ts';

export type MemberRole = 'customer' | 'artist' | 'renter';
export type Profile = { name: string; email: string; city: string; phone: string; specialty: string; bio: string };
export type Listing = {
  id: string; owner: 'artist' | 'renter'; title: string; category: string; description: string;
  price: string; unit: 'hour' | 'event' | 'day'; quantity: string;
  status: 'live' | 'paused' | 'maintenance'; condition: string;
};
export type MediaItem = { id: string; caption: string; src: string; type: 'image' | 'video'; fileName: string; featured: boolean };
export type CaseKind = 'verification' | 'disputes' | 'support';
export type CaseStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'resolved';
export type ReviewCase = {
  id: string; kind: CaseKind; name: string; subject: string; body: string; submitted: string;
  priority: 'normal' | 'high'; status: CaseStatus; bookingId?: string; documents: string[]; owner?: MemberRole; evidenceIds?: string[];
  notes: { text: string; at: string; kind: 'reply' | 'internal' | 'decision'; author?: MemberRole | 'admin' }[];
};
export type DashboardState = CommunityState & {
  profiles: Record<MemberRole, Profile>; savedArtists: number[]; listings: Listing[]; media: MediaItem[];
  drafts: Record<string, Record<string, string>>; cases: ReviewCase[];
  maintenance: boolean; announcement: string; audit: { label: string; at: string }[];
};
export type DashboardAction = CommunityAction
  | { type: 'profile'; profile: Profile }
  | { type: 'favorite'; id: number }
  | { type: 'draft'; key: string; values: Record<string, string> }
  | { type: 'discard_draft'; key: string }
  | { type: 'listing'; listing: Listing }
  | { type: 'listing_status'; id: string; status: Listing['status'] }
  | { type: 'remove_listing'; id: string }
  | { type: 'add_media'; item: MediaItem }
  | { type: 'edit_media'; id: string; caption: string }
  | { type: 'feature_media' | 'remove_media'; id: string }
  | { type: 'review_case'; id: string }
  | { type: 'case_note'; id: string; text: string; kind: 'reply' | 'internal' }
  | { type: 'decide_case'; id: string; status: 'approved' | 'rejected' | 'resolved'; reason: string; documentsReviewed?: boolean }
  | { type: 'reopen_case'; id: string }
  | { type: 'maintenance'; enabled: boolean }
  | { type: 'announcement'; text: string }
  | { type: 'system_action'; command: 'cache' | 'sessions' };

const member = (actor: BookingRole): actor is MemberRole => ['customer', 'artist', 'renter'].includes(actor);
export const draftKey = (actor: BookingRole, key: string) => `${actor}:${key}`;
export const terminalCase = (item: ReviewCase) => ['approved', 'rejected', 'resolved'].includes(item.status);
const validText = (value: unknown, min = 0, max = 2000): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
export function profileErrors(profile: Profile) {
  const errors: Partial<Record<keyof Profile, string>> = {};
  if (!validText(profile.name, 2, 100)) errors.name = 'Enter a name with 2–100 characters.';
  if (!validText(profile.email, 3, 200) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Enter a valid email address.';
  if (!validText(profile.city, 2, 100)) errors.city = 'Add your city.';
  if (!validText(profile.phone, 0, 40) || (profile.phone && !/^[+\d\s().-]{7,40}$/.test(profile.phone))) errors.phone = 'Use 7–40 phone-number characters, or leave this blank.';
  if (!validText(profile.specialty, 0, 120)) errors.specialty = 'Keep this under 120 characters.';
  if (!validText(profile.bio, 0, 2000)) errors.bio = 'Keep this under 2,000 characters.';
  return errors;
}
export function listingErrors(item: Listing) {
  const errors: Partial<Record<keyof Listing, string>> = {};
  if (!validText(item.title, 3, 140)) errors.title = 'Enter a title with 3–140 characters.';
  if (!validText(item.description, 20, 2000)) errors.description = 'Describe the listing in 20–2,000 characters.';
  if (!validText(item.category, 2, 80)) errors.category = 'Choose a category.';
  if (!/^\d+(\.\d{1,2})?$/.test(item.price) || Number(item.price) < 1 || Number(item.price) > 1000000) errors.price = 'Enter $1–$1,000,000 with up to two decimals.';
  if (!/^\d+$/.test(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 1000) errors.quantity = 'Enter 1–1,000 units.';
  if (!['hour', 'event', 'day'].includes(item.unit)) errors.unit = 'Choose a pricing unit.';
  if (!['live', 'paused', 'maintenance'].includes(item.status) || (item.owner === 'artist' && item.status === 'maintenance')) errors.status = 'Choose an available listing status.';
  if (!validText(item.condition, 0, 100)) errors.condition = 'Keep the condition under 100 characters.';
  return errors;
}
export function initialDashboard(): DashboardState {
  const base = { city: 'Los Angeles, CA', phone: '', bio: '' };
  const submitted = '2026-10-12T09:00:00Z';
  return {
    ...initialCommunity(),
    profiles: {
      customer: { ...base, name: 'Jordan Rivera', email: 'jordan.rivera@example.com', specialty: 'Event organizer' },
      artist: { ...base, name: 'Aria Nova', email: 'aria.nova@example.com', specialty: 'Soul / Jazz', bio: 'Live jazz and soul for intimate evenings, celebrations and corporate events.' },
      renter: { ...base, name: 'AudioVault Rentals', email: 'audiovault@example.com', specialty: 'Audio & lighting', bio: 'Sound and lighting equipment for live events, with setup coordinated through booking chat.' },
    },
    savedArtists: [], drafts: {}, maintenance: false, announcement: '', audit: [],
    listings: [
      { id: 'GIG-001', owner: 'artist', title: 'Intimate Dinner Serenade', category: 'Jazz / Soul', description: 'A solo jazz and soul performance, with the set list tailored to your evening.', price: '750', unit: 'hour', quantity: '1', status: 'live', condition: '' },
      { id: 'GIG-002', owner: 'artist', title: 'Corporate Gala Headliner', category: 'Corporate', description: 'An evening of live vocals with a soundcheck and event plan agreed in advance.', price: '2250', unit: 'event', quantity: '1', status: 'live', condition: '' },
      { id: 'EQ-001', owner: 'renter', title: 'PA system · speakers, mixer & microphones', category: 'Audio', description: 'A complete PA package for your event. Confirm delivery, power and setup in booking chat.', price: '180', unit: 'day', quantity: '2', status: 'live', condition: 'Excellent' },
      { id: 'EQ-002', owner: 'renter', title: 'Moving heads & stage lighting', category: 'Lighting', description: 'Stage lighting package with fixtures and control. Setup details agreed before collection.', price: '240', unit: 'day', quantity: '4', status: 'live', condition: 'Good' },
      { id: 'EQ-003', owner: 'renter', title: 'LED video wall', category: 'LED / Video', description: 'A modular screen package for stage visuals and presentations. Dimensions agreed per event.', price: '450', unit: 'day', quantity: '1', status: 'paused', condition: 'Excellent' },
      { id: 'EQ-004', owner: 'renter', title: 'Wireless microphone system', category: 'Audio', description: 'Wireless microphones for speeches and live performances, with receiver and accessories.', price: '90', unit: 'day', quantity: '4', status: 'maintenance', condition: 'Servicing' },
    ],
    media: [
      { id: 'MEDIA-1', caption: 'Jazz night · live performance', src: '/dashboard-stage-fallback.svg', type: 'image', fileName: 'stage-preview.svg', featured: true },
      { id: 'MEDIA-2', caption: 'The stage before the encore', src: '/dashboard-stage-fallback.svg', type: 'image', fileName: 'stage-preview.svg', featured: false },
    ],
    cases: [
      { id: 'VRF-881', kind: 'verification', name: 'Carlos Mendes', subject: 'Artist · Live band', body: 'Review the sample identity and artist information before approving the profile.', documents: ['Sample identity document', 'Sample artist declaration'], priority: 'normal', status: 'pending', submitted, notes: [] },
      { id: 'VRF-882', kind: 'verification', name: 'SoundScape AV Rentals', subject: 'Equipment rental business', body: 'Business information and equipment coverage are ready for a demo review.', documents: ['Sample business registration', 'Sample insurance declaration'], priority: 'normal', status: 'pending', submitted, notes: [] },
      { id: 'VRF-884', kind: 'verification', name: 'Elena Vasquez', subject: 'Artist · Dancer', body: 'Identity and portfolio information submitted for verification.', documents: ['Sample identity document', 'Sample portfolio declaration'], priority: 'normal', status: 'pending', submitted, notes: [] },
      { id: 'DSP-114', kind: 'disputes', name: 'Jordan Rivera · Aria Nova', subject: 'Arrival and soundcheck arrangements', body: 'The organizer and performer need help agreeing on load-in access and the soundcheck time. Review the arrangement and record an outcome.', bookingId: 'BK-2901', documents: ['Sample event brief'], priority: 'high', status: 'pending', submitted, notes: [] },
      { id: 'DSP-115', kind: 'disputes', name: 'Jordan Rivera · AudioVault Rentals', subject: 'Equipment condition review', body: 'The organizer reported a concern about the lighting package condition. Confirm the next steps with both parties. Any payment adjustment must be reviewed in Payments.', bookingId: 'BK-2898', documents: ['Sample condition checklist'], priority: 'normal', status: 'reviewing', submitted, notes: [{ kind: 'internal', text: 'Condition report requested for review.', at: submitted }] },
      { id: 'SUP-001', kind: 'support', name: 'Jordan Rivera', subject: 'Finding a booking confirmation', body: 'Where can I find my booking details and payment receipt?', bookingId: 'BK-2901', documents: [], priority: 'normal', status: 'pending', submitted, notes: [] },
      { id: 'SUP-002', kind: 'support', name: 'Elena Vasquez', subject: 'Portfolio upload help', body: 'I need help choosing the right file type for a portfolio image.', documents: [], priority: 'normal', status: 'pending', submitted, notes: [] },
      { id: 'SUP-003', kind: 'support', name: 'AudioVault Rentals', subject: 'Understanding admin payouts', body: 'When will my held payment be transferred?', bookingId: 'BK-2898', documents: [], priority: 'high', status: 'resolved', submitted, notes: [{ kind: 'reply', text: 'Payments stay held until admin review. The settlement desk shows the current status.', at: submitted }] },
    ],
  };
}
export function reduceDashboard(state: DashboardState, action: DashboardAction, actor: BookingRole, at = new Date().toISOString()): DashboardState {
  if (actor === 'visitor' || !Number.isFinite(Date.parse(at))) return state;
  const community = reduceCommunity(state, action, actor, at);
  if (community !== undefined) return community;
  const withoutDraft = (key: string) => { const drafts = { ...state.drafts }; delete drafts[draftKey(actor, key)]; return drafts; };
  switch (action.type) {
    case 'profile':
      if (!member(actor) || Object.keys(profileErrors(action.profile)).length) return state;
      return { ...state, profiles: { ...state.profiles, [actor]: { ...action.profile, name: action.profile.name.trim() } }, drafts: withoutDraft('profile') };
    case 'favorite':
      if (actor !== 'customer' || !Number.isSafeInteger(action.id) || action.id < 1) return state;
      return { ...state, savedArtists: state.savedArtists.includes(action.id) ? state.savedArtists.filter(id => id !== action.id) : [...state.savedArtists, action.id] };
    case 'draft':
      if (!validText(action.key, 1, 200) || !action.values || Object.keys(action.values).length > 20 || Object.values(action.values).some(value => !validText(value, 0, 3000))) return state;
      return { ...state, drafts: { ...state.drafts, [draftKey(actor, action.key)]: { ...action.values } } };
    case 'discard_draft': return { ...state, drafts: withoutDraft(action.key) };
    case 'listing': {
      const item = action.listing, previous = state.listings.find(value => value.id === item.id);
      if (!['artist', 'renter'].includes(actor) || item.owner !== actor || (previous && previous.owner !== actor) || !validText(item.id, 1, 100) || Object.keys(listingErrors(item)).length) return state;
      return { ...state, listings: previous ? state.listings.map(value => value.id === item.id ? { ...item } : value) : [{ ...item }, ...state.listings], drafts: withoutDraft(`listing:${item.id}`) };
    }
    case 'listing_status':
    case 'remove_listing': {
      const item = state.listings.find(value => value.id === action.id && value.owner === actor);
      if (!item) return state;
      if (action.type === 'remove_listing') return { ...state, listings: state.listings.filter(value => value.id !== item.id), drafts: withoutDraft(`listing:${item.id}`) };
      if (Object.keys(listingErrors({ ...item, status: action.status })).length) return state;
      return { ...state, listings: state.listings.map(value => value.id === item.id ? { ...value, status: action.status } : value) };
    }
    case 'add_media':
      if (actor !== 'artist' || state.media.length >= 30 || state.media.some(item => item.id === action.item.id) || !validText(action.item.caption, 1, 160) || !action.item.src.startsWith('blob:') || !['image', 'video'].includes(action.item.type)) return state;
      return { ...state, media: [...state.media, { ...action.item, featured: state.media.length === 0 }] };
    case 'edit_media':
    case 'feature_media':
    case 'remove_media': {
      if (actor !== 'artist' || !state.media.some(item => item.id === action.id)) return state;
      if (action.type === 'edit_media') return validText(action.caption, 1, 160) ? { ...state, media: state.media.map(item => item.id === action.id ? { ...item, caption: action.caption.trim() } : item) } : state;
      if (action.type === 'feature_media') return { ...state, media: state.media.map(item => ({ ...item, featured: item.id === action.id })) };
      const media = state.media.filter(item => item.id !== action.id);
      if (media.length && !media.some(item => item.featured)) media[0] = { ...media[0], featured: true };
      return { ...state, media };
    }
  }
  if (actor !== 'admin') return state;
  const audit = (label: string) => [{ label, at }, ...state.audit];
  if (action.type === 'maintenance') return typeof action.enabled === 'boolean' ? { ...state, maintenance: action.enabled, audit: audit(`Demo maintenance banner ${action.enabled ? 'enabled' : 'disabled'}`) } : state;
  if (action.type === 'announcement') return validText(action.text, 0, 500) ? { ...state, announcement: action.text.trim(), drafts: withoutDraft('announcement'), audit: audit(action.text.trim() ? 'Workspace announcement updated (demo)' : 'Workspace announcement removed') } : state;
  if (action.type === 'system_action') return ['cache', 'sessions'].includes(action.command) ? { ...state, audit: audit(action.command === 'cache' ? 'Cache purge simulated · no network cache changed' : 'Session refresh simulated · current demo remains signed in') } : state;
  const item = state.cases.find(item => "id" in action && item.id === action.id);
  if (!item) return state;
  const update = (value: ReviewCase, label: string, clearDraft = false) => ({ ...state, cases: state.cases.map(row => row.id === item.id ? value : row), audit: audit(`${item.id} · ${label}`), drafts: clearDraft ? withoutDraft(`case:${item.id}`) : state.drafts });
  if (action.type === 'review_case') return item.status === 'pending' ? update({ ...item, status: 'reviewing' }, 'Review started') : state;
  if (action.type === 'reopen_case') return item.status === 'resolved' ? update({ ...item, status: 'reviewing' }, 'Case reopened') : state;
  if (terminalCase(item)) return state;
  if (action.type === 'case_note') return validText(action.text, 10, 2000) && ['reply', 'internal'].includes(action.kind) ? update({ ...item, notes: [...item.notes, { text: action.text.trim(), at, kind: action.kind }] }, action.kind === 'reply' ? 'Reply added to demo thread' : 'Internal note added', true) : state;
  if (action.type === 'decide_case') {
    if (!validText(action.reason, 10, 2000) || (item.kind === 'verification' ? !['approved', 'rejected'].includes(action.status) || !action.documentsReviewed : action.status !== 'resolved')) return state;
    return update({ ...item, status: action.status, notes: [...item.notes, { text: action.reason.trim(), at, kind: 'decision' }] }, `Marked ${action.status}`, true);
  }
  return state;
}
