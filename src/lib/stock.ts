import type { Service } from './catalog.ts';
import type { BookingForm, RecordBooking } from './pipeline.ts';

export const STOCK_HOLD_MS = 15 * 60 * 1000;
export type SampleStockHold = { id: string; serviceId: string; date: string; units: number; kind: 'confirmed' | 'temporary'; expiresAt?: string };
export type StockState = { status: 'current' | 'stale' | 'unavailable'; checkedAt: string; samples: SampleStockHold[] };
export const initialStock = (at = new Date().toISOString()): StockState => ({ status: 'current', checkedAt: at, samples: [] });
export type StockPhase = 'none' | 'pending' | 'confirmed' | 'out' | 'inspection' | 'expired';
export function stockPhase(record: RecordBooking, date: string, now = new Date()): StockPhase {
  if (record.status === 'cancelled' || record.status === 'rejected' || record.ledger.quoteStatus === 'declined' || record.ledger.payment === 'refunded') return 'none';
  if (record.status === 'completed') return date >= record.date && !record.stockReturnedAt ? 'inspection' : 'none';
  if (record.status === 'active') return date >= record.date ? 'out' : 'none';
  if (record.date !== date) return 'none';
  if (record.ledger.quoteStatus === 'accepted') return 'confirmed';
  if (record.stockHold && Date.parse(record.stockHold.expiresAt) <= now.getTime()) return 'expired';
  return 'pending';
}
export type StockView = {
  state: 'choose-date' | 'available' | 'low' | 'sold-out' | 'maintenance' | 'paused' | 'stale' | 'unavailable' | 'overallocated';
  total: number; available: number | null; reserved: number; pending: number; confirmed: number; out: number; inspection: number; sample: number; expired: number;
};
export function stockAvailability(service: Service, date: string, bookings: RecordBooking[], stock: StockState = initialStock(), now = new Date(), excludeId?: string): StockView {
  const total = Number.isSafeInteger(service.capacity) && service.capacity >= 0 ? service.capacity : 0;
  const result: StockView = { state: 'available', total, available: total, reserved: 0, pending: 0, confirmed: 0, out: 0, inspection: 0, sample: 0, expired: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T12:00:00')) || new Date(date+'T12:00:00').getDate() !== Number(date.slice(-2))) return { ...result, state: 'choose-date', available: null };
  if (stock.status !== 'current') return { ...result, state: stock.status, available: null };
  for (const record of bookings.filter(r => r.serviceId === service.id && r.id !== excludeId)) {
    const units = Number(record.quantity ?? '1'); if (!Number.isSafeInteger(units) || units < 1) continue;
    const phase = stockPhase(record, date, now);
    if (phase === 'expired') { result.expired += units; continue; }
    if (phase === 'none') continue;
    const key = phase === 'out' ? 'out' : phase;
    result[key] += units; result.reserved += units;
  }
  for (const hold of stock.samples.filter(h => h.serviceId === service.id && h.date === date)) {
    if (hold.kind === 'temporary' && (!hold.expiresAt || Date.parse(hold.expiresAt) <= now.getTime())) { result.expired += hold.units; continue; }
    result.sample += hold.units; result.reserved += hold.units;
    if (hold.kind === 'temporary') result.pending += hold.units; else result.confirmed += hold.units;
  }
  result.available = Math.max(0, total - result.reserved);
  result.state = result.reserved > total ? 'overallocated' : result.available === 0 ? 'sold-out' : result.available <= Math.max(1, Math.floor(total * .4)) ? 'low' : 'available';
  if (!service.available) { result.available = 0; result.state = service.listingStatus === 'maintenance' ? 'maintenance' : 'paused'; }
  return result;
}
export function stockRequestError(form: Pick<BookingForm, 'id' | 'serviceId' | 'date' | 'quantity'> & { stockHold?: { expiresAt: string } }, service: Service, bookings: RecordBooking[], stock: StockState | undefined, now = new Date(), checkExpiry = false) {
  if (service.role !== 'renter') return '';
  const view = stockAvailability(service, form.date, bookings, stock, now, form.id);
  if (view.state === 'choose-date') return 'Choose a valid rental date to check stock.';
  if (view.state === 'stale') return 'Stock information needs a refresh. Refresh availability before continuing.';
  if (view.state === 'unavailable') return 'Availability could not be confirmed. Retry before continuing.';
  if (view.state === 'maintenance') return 'This equipment is under maintenance and cannot be booked.';
  if (view.state === 'paused') return 'This listing is paused or unavailable.';
  if (checkExpiry && form.stockHold && Date.parse(form.stockHold.expiresAt) <= now.getTime()) return 'Your temporary stock hold expired. Review availability and renew the hold before continuing.';
  const quantity = Number(form.quantity ?? '1');
  if (!Number.isSafeInteger(quantity) || quantity < 1) return 'Choose a whole number of equipment units.';
  if (view.available === null || quantity > view.available) return `Only ${view.available ?? 0} of ${view.total} units are available for this date. You requested ${quantity}.`;
  return '';
}
