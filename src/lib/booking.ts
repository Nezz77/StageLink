// Browser demo only. Production authorization, custody and transfers require a server.
export type BookingRole = 'visitor' | 'customer' | 'artist' | 'renter' | 'admin';
export type QuoteStatus = 'awaiting_customer' | 'awaiting_artist' | 'accepted' | 'declined';
export type PaymentKind = 'advance' | 'final';
export type Installment = {
  kind: PaymentKind | 'legacy'; grossCents: number; paidAt: string;
  method: 'card' | 'wallet'; releasedAt?: string; feeCents?: number;
  payoutCents?: number; legacySurchargeCents?: number;
};
export type Overtime = {
  id: string; minutes: number; amountCents: number;
  proposedBy: 'customer' | 'artist'; status: 'pending' | 'accepted' | 'rejected';
  at: string; decidedAt?: string;
};
export type BookingAction =
  | { type: 'counter'; amountCents: number }
  | { type: 'accept' } | { type: 'decline' }
  | { type: 'pay'; quoteVersion: number; totalCents: number }
  | { type: 'skip_advance' }
  | { type: 'collect'; kind: PaymentKind; quoteVersion: number; totalCents: number; method: 'card' | 'wallet' }
  | { type: 'propose_overtime'; id: string; minutes: number; amountCents: number }
  | { type: 'resolve_overtime'; id: string; accept: boolean }
  | { type: 'report_performance' } | { type: 'confirm_performance' }
  | { type: 'toggle_hold' } | { type: 'release'; kind?: PaymentKind | 'legacy' };
export interface BookingState {
  quoteCents: number; quoteVersion: number; quoteStatus: QuoteStatus;
  payment: 'unpaid' | 'held' | 'partial' | 'released';
  performance: 'upcoming' | 'reported' | 'confirmed'; payoutBlocked: boolean;
  advance: 'offered' | 'skipped' | 'paid'; installments: Installment[]; overtime: Overtime[];
  history: { label: string; at: string }[];
}
export const bookingDetails = {
  id: 'BK-2901', artist: 'Aria Nova', customer: 'Jordan Rivera',
  event: 'TechVentures Corporate Gala', date: 'October 18, 2026 · 7:00 PM',
  performance: 'Solo jazz & soul · 3 hours',
};
export const initialBooking: BookingState = {
  quoteCents: 225_000, quoteVersion: 1, quoteStatus: 'awaiting_customer',
  payment: 'unpaid', performance: 'upcoming', payoutBlocked: false,
  advance: 'offered', installments: [], overtime: [], history: [],
};
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
export function amounts(quoteCents: number) {
  return { feeCents: Math.round(quoteCents * 0.05), totalCents: quoteCents };
}
export function settlement(state: BookingState) {
  const overtimeCents = state.overtime.filter(item => item.status === 'accepted').reduce((sum, item) => sum + item.amountCents, 0);
  const receivedCents = state.installments.reduce((sum, item) => sum + item.grossCents, 0);
  const legacyExtra = state.installments.reduce((sum, item) => sum + (item.legacySurchargeCents ?? 0), 0);
  const totalCents = state.quoteCents + overtimeCents + legacyExtra;
  const heldCents = state.installments.filter(item => !item.releasedAt).reduce((sum, item) => sum + item.grossCents, 0);
  const feeChargedCents = state.installments.reduce((sum, item) => sum + (item.feeCents ?? 0), 0);
  const paidOutCents = state.installments.reduce((sum, item) => sum + (item.payoutCents ?? 0), 0);
  const feeCents = amounts(state.quoteCents).feeCents;
  return { totalCents, overtimeCents, receivedCents, heldCents, feeCents, feeChargedCents, paidOutCents,
    remainingCents: Math.max(0, totalCents - receivedCents),
    feeDueCents: Math.max(0, feeCents - feeChargedCents), advanceCents: Math.round(state.quoteCents * 0.1) };
}
export function checkoutFor(state: BookingState): { kind: PaymentKind; amountCents: number } | null {
  if (state.quoteStatus !== 'accepted') return null;
  const totals = settlement(state);
  if (state.performance !== 'upcoming') {
    if (!totals.remainingCents || state.overtime.some(item => item.status === 'pending')) return null;
    return { kind: 'final', amountCents: totals.remainingCents };
  }
  return state.advance === 'offered' && state.installments.length === 0
    ? { kind: 'advance', amountCents: totals.advanceCents } : null;
}
export function canRelease(state: BookingState, kind: Installment['kind']) {
  const item = state.installments.find(item => item.kind === kind);
  if (!item || item.releasedAt || state.payoutBlocked) return false;
  // Settle the advance first so the fee is captured exactly once there.
  if (kind !== 'advance' && state.installments.some(item => item.kind === 'advance' && !item.releasedAt)) return false;
  return kind === 'advance' || state.performance === 'confirmed';
}
export function canRespond(state: BookingState, actor: BookingRole) {
  return state.installments.length === 0 && state.advance === 'offered' && state.performance === 'upcoming' && !state.overtime.length && (
    (actor === 'customer' && state.quoteStatus === 'awaiting_customer') ||
    (actor === 'artist' && state.quoteStatus === 'awaiting_artist'));
}
export function bookingStatus(state: BookingState) {
  const totals = settlement(state);
  if (state.payoutBlocked) return 'Payout on hold';
  if (state.payment === 'released') return 'Paid to provider';
  if (state.performance !== 'upcoming' && totals.remainingCents) return state.overtime.some(item => item.status === 'pending') ? 'Overtime approval pending' : 'Final payment due';
  if (totals.heldCents) return 'Held by StageLink';
  if (state.advance === 'paid') return 'Advance transferred';
  if (state.advance === 'skipped') return 'Pay after performance';
  if (state.quoteStatus === 'accepted') return 'Optional advance available';
  if (state.quoteStatus === 'declined') return 'Quote declined';
  return state.quoteStatus === 'awaiting_artist' ? 'Awaiting artist approval' : 'Awaiting customer approval';
}
// replayLegacy is used only to read historical demo events, never by live UI actions.
export function transitionBooking(state: BookingState, action: BookingAction, actor: BookingRole, at = new Date().toISOString(), replayLegacy = false): BookingState {
  let patch: Partial<BookingState>; let label: string;
  switch (action.type) {
    case 'counter':
      if (!canRespond(state, actor) || !Number.isSafeInteger(action.amountCents) || action.amountCents < 100 || action.amountCents > 100_000_000) return state;
      patch = { quoteCents: action.amountCents, quoteVersion: state.quoteVersion + 1, quoteStatus: actor === 'customer' ? 'awaiting_artist' : 'awaiting_customer' };
      label = `${actor === 'customer' ? 'Customer' : 'Artist'} proposed ${money(action.amountCents)}`; break;
    case 'accept':
      if (!canRespond(state, actor)) return state;
      patch = { quoteStatus: 'accepted' }; label = `Quote agreed at ${money(state.quoteCents)}`; break;
    case 'decline':
      if (!canRespond(state, actor)) return state;
      patch = { quoteStatus: 'declined' }; label = 'Quote declined'; break;
    case 'skip_advance':
      if (actor !== 'customer' || checkoutFor(state)?.kind !== 'advance') return state;
      patch = { advance: 'skipped' }; label = 'Advance skipped · full agreed price due after performance'; break;
    case 'collect': {
      const due = checkoutFor(state);
      if (actor !== 'customer' || !due || action.kind !== due.kind || action.totalCents !== due.amountCents || action.quoteVersion !== state.quoteVersion || !['card', 'wallet'].includes(action.method)) return state;
      patch = { installments: [...state.installments, { kind: action.kind, grossCents: action.totalCents, paidAt: at, method: action.method }], ...(action.kind === 'advance' ? { advance: 'paid' as const } : {}) };
      label = `${action.kind === 'advance' ? '10% advance' : 'Final payment'} of ${money(action.totalCents)} received by StageLink (demo)`; break;
    }
    case 'pay': {
      const fee = amounts(state.quoteCents).feeCents;
      if (!replayLegacy || actor !== 'customer' || state.quoteStatus !== 'accepted' || state.installments.length || action.quoteVersion !== state.quoteVersion || action.totalCents !== state.quoteCents + fee) return state;
      patch = { installments: [{ kind: 'legacy', grossCents: action.totalCents, legacySurchargeCents: fee, paidAt: at, method: 'card' }], advance: 'skipped' };
      label = `${money(action.totalCents)} received into StageLink holding balance (previous demo)`; break;
    }
    case 'propose_overtime':
      if (!['customer', 'artist'].includes(actor) || state.quoteStatus !== 'accepted' || state.installments.some(item => item.kind !== 'advance') || state.overtime.some(item => item.status === 'pending' || item.id === action.id) || typeof action.id !== 'string' || !action.id || !Number.isSafeInteger(action.minutes) || action.minutes < 1 || action.minutes > 1440 || !Number.isSafeInteger(action.amountCents) || action.amountCents < 100 || action.amountCents > 100_000_000) return state;
      patch = { overtime: [...state.overtime, { id: action.id, minutes: action.minutes, amountCents: action.amountCents, proposedBy: actor as 'customer' | 'artist', status: 'pending', at }] };
      label = `${actor === 'customer' ? 'Customer' : 'Performer'} requested ${action.minutes} minutes overtime for ${money(action.amountCents)}`; break;
    case 'resolve_overtime': {
      const item = state.overtime.find(item => item.id === action.id && item.status === 'pending');
      if (!item || !['customer', 'artist'].includes(actor) || actor === item.proposedBy || typeof action.accept !== 'boolean') return state;
      patch = { overtime: state.overtime.map(item => item.id === action.id ? { ...item, status: action.accept ? 'accepted' : 'rejected', decidedAt: at } : item), quoteVersion: state.quoteVersion + 1 };
      label = `Overtime ${action.accept ? 'approved' : 'declined'} · ${item.minutes} minutes / ${money(item.amountCents)}`; break;
    }
    case 'report_performance':
      if (actor !== 'artist' || state.quoteStatus !== 'accepted' || state.performance !== 'upcoming') return state;
      patch = { performance: 'reported' }; label = 'Provider reported completion · final payment due immediately'; break;
    case 'confirm_performance':
      if (actor !== 'admin' || state.performance !== 'reported') return state;
      patch = { performance: 'confirmed' }; label = 'Admin verified performance completion'; break;
    case 'toggle_hold':
      if (actor !== 'admin' || !settlement(state).heldCents) return state;
      patch = { payoutBlocked: !state.payoutBlocked }; label = state.payoutBlocked ? 'Admin cleared payout hold' : 'Admin placed payout on hold'; break;
    case 'release': {
      const kind = action.kind ?? 'legacy';
      if (actor !== 'admin' || !canRelease(state, kind)) return state;
      const item = state.installments.find(item => item.kind === kind)!;
      const feeCents = settlement(state).feeDueCents;
      if (feeCents > item.grossCents) return state;
      const payoutCents = item.grossCents - feeCents;
      patch = { installments: state.installments.map(item => item.kind === kind ? { ...item, releasedAt: at, feeCents, payoutCents } : item) };
      label = `Admin transferred ${money(payoutCents)} ${kind === 'advance' ? 'advance' : 'final payout'} to provider bank account · StageLink fee ${money(feeCents)} (demo)`; break;
    }
    default: return state;
  }
  const next = { ...state, ...patch, history: [...state.history, { label, at }] };
  const totals = settlement(next);
  next.payment = !totals.receivedCents ? 'unpaid' : totals.heldCents ? 'held' : totals.remainingCents ? 'partial' : 'released';
  return next;
}
export const BOOKING_STORAGE_KEY = 'stagelink:demo-booking:v1';
export interface StoredEvent { action: BookingAction; actor: BookingRole; at: string }
export function restoreBooking(raw: string | null): { state: BookingState; events: StoredEvent[] } {
  try {
    const events: StoredEvent[] = JSON.parse(raw ?? '[]');
    if (!Array.isArray(events) || events.length > 500) throw new Error('Invalid ledger');
    const safeEvents: StoredEvent[] = [];
    let state = initialBooking;
    for (const event of events) {
      if (!event?.action || !['counter','accept','decline','pay','report_performance','confirm_performance','toggle_hold','release'].includes(event.action.type) || !['customer','artist','admin'].includes(event.actor) || !Number.isFinite(Date.parse(event.at))) throw new Error('Invalid event');
      const action: BookingAction = event.action.type === 'pay' ? { type: 'pay', quoteVersion: event.action.quoteVersion, totalCents: event.action.totalCents }
        : event.action.type === 'counter' ? { type: 'counter', amountCents: event.action.amountCents } : { type: event.action.type as 'accept' | 'decline' | 'report_performance' | 'confirm_performance' | 'toggle_hold' | 'release' };
      const next = transitionBooking(state, action, event.actor, event.at, true);
      if (next === state) throw new Error('Invalid transition');
      state = next; safeEvents.push({ action, actor: event.actor, at: event.at });
    }
    return { state, events: safeEvents };
  } catch { return { state: initialBooking, events: [] }; }
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
