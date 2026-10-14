// Demo ledger only. Production transitions must be authorized by a server and
// reconciled with payment-provider webhooks, never trusted from browser storage.
export type BookingRole = 'visitor' | 'customer' | 'artist' | 'renter' | 'admin';
export type QuoteStatus = 'awaiting_customer' | 'awaiting_artist' | 'accepted' | 'declined';
export type BookingAction =
  | { type: 'counter'; amountCents: number }
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'pay'; quoteVersion: number; totalCents: number }
  | { type: 'report_performance' }
  | { type: 'confirm_performance' }
  | { type: 'toggle_hold' }
  | { type: 'release' };

export interface BookingState {
  quoteCents: number;
  quoteVersion: number;
  quoteStatus: QuoteStatus;
  payment: 'unpaid' | 'held' | 'released';
  performance: 'upcoming' | 'reported' | 'confirmed';
  payoutBlocked: boolean;
  history: { label: string; at: string }[];
}

export const bookingDetails = {
  id: 'BK-2901', artist: 'Aria Nova', customer: 'Jordan Rivera',
  event: 'TechVentures Corporate Gala', date: 'October 18, 2026 · 7:00 PM',
  performance: 'Solo jazz & soul · 3 hours',
};

export const initialBooking: BookingState = {
  quoteCents: 225_000, quoteVersion: 1, quoteStatus: 'awaiting_customer',
  payment: 'unpaid', performance: 'upcoming', payoutBlocked: false, history: [],
};

export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function amounts(quoteCents: number) {
  const feeCents = Math.round(quoteCents * 0.05);
  return { feeCents, totalCents: quoteCents + feeCents };
}

export function canRespond(state: BookingState, actor: BookingRole) {
  return state.payment === 'unpaid' && (
    (actor === 'customer' && state.quoteStatus === 'awaiting_customer') ||
    (actor === 'artist' && state.quoteStatus === 'awaiting_artist')
  );
}

export function bookingStatus(state: BookingState) {
  if (state.payment === 'released') return 'Released to artist';
  if (state.payoutBlocked) return 'Payout on hold';
  if (state.performance === 'confirmed') return 'Ready for admin release';
  if (state.performance === 'reported') return 'Awaiting admin verification';
  if (state.payment === 'held') return 'Funds held by StageLink';
  if (state.quoteStatus === 'accepted') return 'Ready for payment';
  if (state.quoteStatus === 'declined') return 'Quote declined';
  return state.quoteStatus === 'awaiting_artist' ? 'Awaiting artist approval' : 'Awaiting customer approval';
}

// Invalid, stale or duplicate actions leave the ledger unchanged.
export function transitionBooking(state: BookingState, action: BookingAction, actor: BookingRole, at = new Date().toISOString()): BookingState {
  let patch: Partial<BookingState>;
  let label: string;
  switch (action.type) {
    case 'counter':
      if (!canRespond(state, actor) || !Number.isSafeInteger(action.amountCents) || action.amountCents < 100 || action.amountCents > 100_000_000) return state;
      patch = { quoteCents: action.amountCents, quoteVersion: state.quoteVersion + 1, quoteStatus: actor === 'customer' ? 'awaiting_artist' : 'awaiting_customer' };
      label = `${actor === 'customer' ? 'Customer' : 'Artist'} proposed ${money(action.amountCents)}`;
      break;
    case 'accept':
      if (!canRespond(state, actor)) return state;
      patch = { quoteStatus: 'accepted' };
      label = `Quote agreed at ${money(state.quoteCents)}`;
      break;
    case 'decline':
      if (!canRespond(state, actor)) return state;
      patch = { quoteStatus: 'declined' };
      label = 'Quote declined';
      break;
    case 'pay':
      if (actor !== 'customer' || state.quoteStatus !== 'accepted' || state.payment !== 'unpaid' || action.quoteVersion !== state.quoteVersion || action.totalCents !== amounts(state.quoteCents).totalCents) return state;
      patch = { payment: 'held' };
      label = `${money(action.totalCents)} received into StageLink holding balance (demo)`;
      break;
    case 'report_performance':
      if (actor !== 'artist' || state.payment !== 'held' || state.performance !== 'upcoming') return state;
      patch = { performance: 'reported' };
      label = 'Artist reported performance complete';
      break;
    case 'confirm_performance':
      if (actor !== 'admin' || state.payment !== 'held' || state.performance !== 'reported') return state;
      patch = { performance: 'confirmed' };
      label = 'Admin verified performance completion';
      break;
    case 'toggle_hold':
      if (actor !== 'admin' || state.payment !== 'held') return state;
      patch = { payoutBlocked: !state.payoutBlocked };
      label = state.payoutBlocked ? 'Admin cleared payout hold' : 'Admin placed payout on hold';
      break;
    case 'release':
      if (actor !== 'admin' || state.payment !== 'held' || state.performance !== 'confirmed' || state.payoutBlocked) return state;
      patch = { payment: 'released' };
      label = `${money(state.quoteCents)} released to ${bookingDetails.artist} (demo)`;
      break;
  }
  return { ...state, ...patch, history: [...state.history, { label, at }] };
}

export const BOOKING_STORAGE_KEY = 'stagelink:demo-booking:v1';

// Persist only accepted domain events. Replay also rejects malformed/out-of-order data.
export interface StoredEvent { action: BookingAction; actor: BookingRole; at: string }
export function restoreBooking(raw: string | null): { state: BookingState; events: StoredEvent[] } {
  try {
    const events: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(events) || events.length > 500) throw new Error('Invalid ledger');
    let state = initialBooking;
    for (const event of events) {
      if (!event || typeof event !== 'object' || !event.action || typeof event.action !== 'object' || !['counter', 'accept', 'decline', 'pay', 'report_performance', 'confirm_performance', 'toggle_hold', 'release'].includes(event.action.type) || !['customer', 'artist', 'admin'].includes(event.actor) || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at))) throw new Error('Invalid event');
      const next = transitionBooking(state, event.action, event.actor, event.at);
      if (next === state) throw new Error('Invalid transition');
      state = next;
    }
    // Reconstruct a whitelist so arbitrary properties cannot leak into storage.
    const safeEvents = events.map((event): StoredEvent => ({
      actor: event.actor, at: event.at,
      action: event.action.type === 'pay' ? { type: 'pay', quoteVersion: event.action.quoteVersion, totalCents: event.action.totalCents }
        : event.action.type === 'counter' ? { type: 'counter', amountCents: event.action.amountCents }
        : { type: event.action.type },
    }));
    return { state, events: safeEvents };
  } catch {
    return { state: initialBooking, events: [] };
  }
}

export function validateDemoCard(details: { name: string; number: string; expiry: string; cvv: string }, now = new Date()) {
  const errors: Partial<Record<keyof typeof details, string>> = {};
  if (details.name.trim().length < 2) errors.name = 'Enter the cardholder name.';
  if (!['4242424242424242', '4000000000000002'].includes(details.number.replace(/\s/g, ''))) errors.number = 'Use a provided demo card. Do not enter real card details.';
  const expiry = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(details.expiry);
  if (!expiry || new Date(2000 + Number(expiry[2]), Number(expiry[1]), 1) <= now) errors.expiry = 'Enter a future expiry as MM/YY.';
  if (!/^\d{3}$/.test(details.cvv)) errors.cvv = 'Enter a 3-digit demo CVV.';
  return errors;
}
