import { useId, useState } from 'react';
import { LockKeyhole, PackageCheck, RefreshCw } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { serviceFor, bookingStockService, type RecordBooking } from '../lib/pipeline';
import { stockAvailability, stockPhase, stockRequestError } from '../lib/stock';
import '../stock.css';

/** Same-tab reservation simulation. No network request or database lock is implied. */
export default function StockAvailability({ serviceId, date, quantity, record, compact = false, demo = false }: { serviceId: string; date: string; quantity?: string; record?: RecordBooking; compact?: boolean; demo?: boolean }) {
  const { state, options, dispatch, actor, now } = useBooking();
  const service = record ? bookingStockService(record, options.catalog) : serviceFor(serviceId, options.catalog);
  const view = stockAvailability(service, date, state.bookings, options.stock, now);
  const [units, setUnits] = useState('1'), [kind, setKind] = useState<'confirmed' | 'temporary'>('confirmed'), [notice, setNotice] = useState('');
  const id = useId();
  if (service.role !== 'renter') return null;
  const phase = record ? stockPhase(record, date, now) : 'none';
  const expired = phase === 'expired';
  const issue = quantity || record && !['cancelled','rejected'].includes(record.status) ? stockRequestError({ id: record?.id ?? '', serviceId, date, quantity: quantity ?? record?.quantity }, service, state.bookings, options.stock, now) : '';
  const label = { 'choose-date': 'Choose a rental date', available: 'Available to request', low: 'Limited availability', 'sold-out': 'Fully reserved', maintenance: 'Under maintenance', paused: 'Listing paused', stale: 'Refresh required', unavailable: 'Availability unavailable', overallocated: 'Inventory needs review' }[view.state];
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date+'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const run = (scenario: 'reserve' | 'release' | 'expire' | 'stale' | 'unavailable' | 'refresh') => setNotice(dispatch({ type: 'stock_sample', serviceId, date, scenario, units: Number(units), kind }) ? 'Sample stock updated in this tab.' : 'No change. Check the date and available quantity.');
  return <section className={`sl-stock ${compact ? 'sl-stock-compact' : ''}`} aria-label={`Stock availability for ${service.name}`}>
    <div className="sl-stock-heading"><span className="sl-eyebrow"><PackageCheck size={14} /> DATE-SPECIFIC STOCK</span><span className={`sl-stock-tag sl-stock-${view.state}`}>{label}</span></div>
    <div aria-live="polite" aria-atomic="true"><h3>{view.available === null ? label : `${view.available} of ${view.total} units available`}</h3><p>{dateLabel && `For ${dateLabel} · `}{view.available === null ? 'Availability must be confirmed before continuing.' : `${view.reserved} reserved across this calendar day${record && !['none','expired'].includes(phase) ? ' (including this booking)' : ''}.`}</p></div>
    {view.available !== null && <div className="sl-stock-meter" role="meter" aria-label="Available equipment units" aria-valuenow={view.available} aria-valuemin={0} aria-valuemax={Math.max(1, view.total)}><span style={{ width: `${view.total ? view.available / view.total * 100 : 0}%` }} /></div>}
    {!compact && view.available !== null && <><dl className="sl-stock-breakdown"><div><dt>Temporary holds</dt><dd>{view.pending}</dd></div><div><dt>Confirmed</dt><dd>{view.confirmed}</dd></div><div><dt>Out / inspection</dt><dd>{view.out + view.inspection}</dd></div></dl>{view.sample > 0 && <p className="sl-stock-note">Includes {view.sample} sample-reserved units.</p>}{view.inspection > 0 && <p className="sl-stock-warning">Returned equipment remains reserved until its return inspection is recorded.</p>}</>}
    {record && <p className={expired ? 'sl-stock-warning' : 'sl-stock-allocation'}><LockKeyhole size={14} />{expired ? 'Your temporary hold expired. Your request remains saved.' : phase === 'none' ? 'This booking no longer reserves stock.' : phase === 'inspection' ? 'Awaiting return inspection; units remain reserved.' : phase === 'out' ? 'Equipment is out; units remain reserved until returned.' : phase === 'confirmed' ? `${record.quantity ?? 1} units allocated to this accepted booking.` : record.stockHold ? `${record.quantity ?? 1} units held until ${new Date(record.stockHold.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : `${record.quantity ?? 1} units reserved by this demo request.`}</p>}
    {issue && <p className="sl-stock-warning" role="status">{issue}</p>}
    {(view.state === 'stale' || view.state === 'unavailable') && <button type="button" className="btn-ghost" onClick={() => run('refresh')}><RefreshCw size={14} />Refresh availability</button>}
    {expired && actor === 'customer' && <button type="button" className="btn-primary" onClick={() => setNotice(dispatch({ type: 'renew_stock', id: record!.id }) ? 'Stock rechecked. Hold renewed for 15 minutes.' : 'Hold could not be renewed. Review availability or change your request.')}>Recheck & renew hold</button>}
    {!compact && <p className="sl-stock-note">Demo availability updates in this tab. Requests hold units for 15 minutes; accepted quotes reserve them until cancellation or return. Refreshing the page resets demo changes.</p>}
    {demo && date && ['customer', 'renter', 'admin'].includes(actor) && <details className="sl-stock-demo"><summary>Try stock scenarios</summary><p>These controls change sample reservations only. They do not modify another customer’s booking.</p><div className="sl-stock-demo-fields"><label htmlFor={id+'units'}>Sample units<input id={id+'units'} aria-label="Sample reserved units" type="number" min="1" max={view.total} value={units} onChange={e => setUnits(e.target.value)} /></label><label htmlFor={id+'kind'}>Reservation type<select id={id+'kind'} value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="confirmed">Confirmed sample</option><option value="temporary">15-minute sample hold</option></select></label></div><div className="sl-stock-demo-actions">{([['reserve','Reserve sample units'],['release','Release sample units'],['expire','Expire sample holds'],['stale','Simulate stale stock'],['unavailable','Simulate unavailable stock'],['refresh','Refresh availability']] as const).map(([scenario, text]) => <button type="button" key={scenario} className="btn-ghost" onClick={() => run(scenario)}>{text}</button>)}{record?.stockHold && phase === 'pending' && actor === 'customer' && <button type="button" className="btn-ghost" onClick={() => setNotice(dispatch({ type: 'expire_stock', id: record.id }) ? 'Sample request hold expired.' : 'This hold cannot be expired.')}>Expire my request hold</button>}</div></details>}
    {notice && <p role="status" className="sl-stock-note">{notice}</p>}
  </section>;
}
