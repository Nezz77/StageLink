import { useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { useBooking } from '../lib/BookingContext';
import { useDashboard } from '../lib/DashboardContext';
import { money, settlement } from '../lib/booking';
import { terminalCase } from '../lib/dashboard';
import { DashboardIntro } from './DashboardShell';
import { Badge, Empty, Panel, Stats, downloadCSV } from './DashboardUI';

export default function AdminAnalytics({ onNavigate, onPayment }: { onNavigate: (tab: string) => void; onPayment: (id: string) => void }) {
  const { state } = useBooking(); const { state: dashboard } = useDashboard();
  const [period, setPeriod] = useState('all'), [metric, setMetric] = useState<'received' | 'payouts' | 'fees'>('received');
  const months = [...new Set(state.bookings.flatMap(record => record.ledger.installments.flatMap(item => [item.paidAt.slice(0, 7), ...(item.releasedAt ? [item.releasedAt.slice(0, 7)] : []), ...(item.refundedAt ? [item.refundedAt.slice(0, 7)] : [])])))].sort();
  const items = state.bookings.flatMap(record => record.ledger.installments.map(item => ({ record, item })));
  const inPeriod = (at?: string) => !!at && (period === 'all' || at.startsWith(period));
  const received = items.filter(({ item }) => inPeriod(item.paidAt)).reduce((sum, { item }) => sum + item.grossCents, 0);
  const payouts = items.filter(({ item }) => inPeriod(item.releasedAt)).reduce((sum, { item }) => sum + (item.payoutCents ?? 0), 0);
  const fees = items.filter(({ item }) => inPeriod(item.releasedAt)).reduce((sum, { item }) => sum + (item.feeCents ?? 0), 0);
  const refunded = items.filter(({ item }) => inPeriod(item.refundedAt)).reduce((sum, { item }) => sum + item.grossCents, 0);
  const chart = (period === 'all' ? months : [period]).map(month => ({ month, value: items.reduce((sum, { item }) => sum + (metric === 'received' ? item.paidAt.startsWith(month) ? item.grossCents : 0 : item.releasedAt?.startsWith(month) ? metric === 'fees' ? item.feeCents ?? 0 : item.payoutCents ?? 0 : 0), 0) }));
  const max = Math.max(1, ...chart.map(item => item.value));
  const activity = state.bookings.flatMap(record => record.activity.map(item => ({ ...item, id: record.id, event: record.event }))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
  return <div className="mg-page"><DashboardIntro eyebrow="PLATFORM OPERATIONS / DEMO DATA" title="A pulse on" emphasis="every performance." description="A live summary of the bookings and transactions in this demo session." action={<button className="btn-ghost" onClick={() => downloadCSV('StageLink-platform-summary.csv', [['Period', 'Customer payments USD', 'Provider payouts USD', 'Fees USD', 'Refunds USD'], [period, received / 100, payouts / 100, fees / 100, refunded / 100]])}><Download size={15} />Export report</button>} />
    <div className="mg-toolbar"><label className="mg-filter">Report period<select aria-label="Report period" value={period} onChange={event => setPeriod(event.target.value)}><option value="all">All transactions</option>{months.map(month => <option key={month}>{month}</option>)}</select></label><Badge value="live">{state.bookings.length} demo bookings</Badge></div>
    <Stats values={[{ label: 'Customer payments', value: money(received), note: 'Gross payments collected in period' }, { label: 'Provider transfers', value: money(payouts), note: 'Net payouts in period' }, { label: 'StageLink fees', value: money(fees), note: 'Deducted once per booking' }, { label: 'Customer refunds', value: money(refunded), note: 'Refunded in period' }]} />
    <div className="mg-split"><Panel title="The money behind the moments" eyebrow="PAYMENT ACTIVITY" action={<label className="mg-filter">Chart<select aria-label="Chart" value={metric} onChange={event => setMetric(event.target.value as typeof metric)}><option value="received">Customer payments</option><option value="payouts">Provider payouts</option><option value="fees">StageLink fees</option></select></label>}><div className="mg-chart" role="img" aria-label={chart.map(item => `${item.month}: ${money(item.value)}`).join(', ') || 'No payment activity'}>{chart.map(item => <div key={item.month}><span>{money(item.value)}</span><i style={{ height: `${Math.max(3, item.value / max * 155)}px` }} /><small>{new Date(`${item.month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</small></div>)}</div>{!chart.length && <Empty title="No payment activity yet." />}</Panel>
    <Panel title="On your radar" eyebrow="WORK THAT NEEDS A HUMAN">{(['verification', 'disputes', 'support'] as const).map(kind => <button className="mg-row mg-row-button" key={kind} onClick={() => onNavigate(kind)}><div><h3>{kind === 'verification' ? 'Verification requests' : kind === 'disputes' ? 'Open disputes' : 'Support tickets'}</h3></div><strong>{dashboard.cases.filter(item => item.kind === kind && !terminalCase(item)).length}</strong><ArrowUpRight size={16} /></button>)}<button className="mg-row mg-row-button" onClick={() => onNavigate('payments')}><div><h3>Funds held now</h3><p>Across all demo bookings</p></div><strong>{money(state.bookings.reduce((sum, record) => sum + settlement(record.ledger).heldCents, 0))}</strong><ArrowUpRight size={16} /></button></Panel></div>
    <Panel title="Recent booking activity" eyebrow="FOLLOW THE TRAIL">{activity.map((item, index) => <button className="mg-row mg-row-button" key={`${item.id}:${index}`} onClick={() => onPayment(item.id)}><div><span className="sl-eyebrow">{item.id} · {item.event}</span><h3>{item.label}</h3><p>{new Date(item.at).toLocaleString()}</p></div><ArrowUpRight size={17} /></button>)}</Panel>
  </div>;
}
