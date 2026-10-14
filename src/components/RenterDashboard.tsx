import { useState } from 'react';
import DashboardShell, { DashboardIntro } from './DashboardShell';
import { useBooking } from '../lib/BookingContext';
import { money, amounts } from '../lib/booking';
import { serviceFor } from '../lib/pipeline';
import type { WorkspaceSection } from './BookingWorkspace';
import { Icon } from './Icons';

const inventory = [
  { id: 'EQ-001', name: 'JBL SRX900 Line Array System (2×)', category: 'Audio', price: '$280/day', status: 'available', condition: 'Excellent' },
  { id: 'EQ-002', name: 'Martin MAC Ultra 400 Moving Head (4×)', category: 'Lighting', price: '$150/day', status: 'rented', condition: 'Good' },
  { id: 'EQ-003', name: 'ROE Carbon 2.6mm LED Video Wall (12m²)', category: 'LED / Video', price: '$450/day', status: 'rented', condition: 'Excellent' },
  { id: 'EQ-004', name: 'Sennheiser Digital 6000 Wireless System', category: 'Audio', price: '$90/day', status: 'available', condition: 'Excellent' },
  { id: 'EQ-005', name: 'Claypaky Mythos 2 Hybrid (6×)', category: 'Lighting', price: '$200/day', status: 'maintenance', condition: 'Servicing' },
];

const activeRentals = [
  { id: 'RNT-228', client: 'Meridian Events', item: 'JBL SRX900 Line Array + Amplifiers', returnDate: 'Oct 16, 2026', total: '$840', status: 'Active' },
  { id: 'RNT-231', client: 'TechVentures Corp', item: 'ROE Carbon LED Wall (12m²)', returnDate: 'Oct 19, 2026', total: '$1,350', status: 'Active' },
];



const revenueData = [
  { month: 'Apr', amount: 4100 },
  { month: 'May', amount: 5800 },
  { month: 'Jun', amount: 4700 },
  { month: 'Jul', amount: 7200 },
  { month: 'Aug', amount: 6500 },
  { month: 'Sep', amount: 8900 },
  { month: 'Oct', amount: 7400 },
];
const maxRevenue = Math.max(...revenueData.map(d => d.amount));

const navItems = [
  { id: 'overview', icon: Icon.LayoutDashboard, label: 'Overview' },
  { id: 'bookingdesk', icon: Icon.Calendar, label: 'Booking desk' },
  { id: 'messages', icon: Icon.MessageCircle, label: 'Messages' },
  { id: 'inventory', icon: Icon.Package, label: 'Inventory' },
  { id: 'rentals', icon: Icon.Repeat, label: 'Active Rentals' },
  { id: 'requests', icon: Icon.Bell, label: 'Requests' },
  { id: 'earnings', icon: Icon.DollarSign, label: 'Earnings' },
  { id: 'profile', icon: Icon.User, label: 'Profile' },
];

export default function RenterDashboard({ onGoToLanding, onOpenWorkspace }: { onGoToLanding?: () => void; onOpenWorkspace: (section?: WorkspaceSection) => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [category, setCategory] = useState('All');
  const { state, actor } = useBooking();
  const requests = state.bookings.filter(record => record.status === 'pending' && serviceFor(record.serviceId).role === actor).map(record => ({ id: record.id, client: 'Jordan Rivera', event: record.event, item: record.event, date: record.date, offer: money(amounts(record.ledger.quoteCents).totalCents), budget: money(amounts(record.ledger.quoteCents).totalCents) }));
  const [notice, setNotice] = useState('');
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const respondToRequest = (_id: string, _accepted: boolean) => onOpenWorkspace('requests');

  return (
    <DashboardShell role="renter" navItems={navItems} activeTab={activeTab} onNavigate={tab => { if (tab === 'bookingdesk') onOpenWorkspace('bookings'); else if (tab === 'messages') onOpenWorkspace('chat'); else if (tab === 'requests') onOpenWorkspace('requests'); else if (tab === 'calendar') onOpenWorkspace('calendar'); else setActiveTab(tab); }} onGoToLanding={onGoToLanding} onOpenChat={() => onOpenWorkspace('chat')}>
      {notice && <p role="status" className="sl-feedback">{notice}</p>}
        {activeTab === 'overview' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            <DashboardIntro eyebrow="RENTAL OPERATIONS · OCTOBER 2026" title="Behind the" emphasis="great nights." description="Your equipment, out in the world. Keep every production moving." action={<button className="btn-primary sl-action" onClick={() => setActiveTab('inventory')}><Icon.Package className="w-4 h-4" /> Manage inventory <span>↗</span></button>} />
            <div className="grid grid-cols-12 gap-5">
              {/* Hero Equipment Card */}
              <div className="sl-spotlight sl-equipment-spotlight col-span-12 lg:col-span-7 rounded-2xl overflow-hidden relative" style={{ minHeight: 260 }}>
                <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }}
                  src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=320&fit=crop"
                  alt="Equipment"
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,9,15,0.95) 0%, rgba(7,9,15,0.5) 60%, transparent 100%)' }} />
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        Verified Renter
                      </span>
                      <h2 className="font-display text-xl font-bold text-white leading-tight">Premium AV Equipment<br />& Lighting Systems</h2>
                      <p className="text-slate-400 text-sm mt-1">Los Angeles, CA · Delivery Available</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-amber-400">$7,400</div>
                      <div className="text-xs text-slate-500">This Month</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Items in Stock', value: '5' },
                      { label: 'Currently Rented', value: '2' },
                      { label: 'Utilization Rate', value: '68%' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(7,9,15,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="font-bold font-mono text-white">{s.value}</div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                {[
                  { label: 'Total Revenue (2026)', value: '$44,700', icon: Icon.DollarSign, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                  { label: 'Active Rentals', value: '2', icon: Icon.Repeat, color: 'text-sky-400', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
                  { label: 'Total Equipment', value: '5 items', icon: Icon.Package, color: 'text-violet-400', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
                ].map(s => (
                  <div key={s.label} className="sl-stat flex items-center gap-4 p-4 rounded-2xl flex-1"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-mono text-white">{s.value}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Rentals */}
              <div className="col-span-12 lg:col-span-7 card p-5">
                <h2 className="font-semibold text-white text-sm mb-4">Active Rentals</h2>
                <div className="space-y-3">
                  {activeRentals.map(r => (
                    <div key={r.id} className="card-2 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-mono">{r.id}</span>
                        <span className="badge badge-emerald">{r.status}</span>
                      </div>
                      <div className="font-medium text-white text-sm mb-1">{r.item}</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500">{r.client}</span>
                          <span className="text-xs text-slate-600 mx-2">·</span>
                          <span className="text-xs text-slate-500">Return: {r.returnDate}</span>
                        </div>
                        <span className="font-mono text-amber-400 font-bold text-sm">{r.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incoming Requests */}
              <div className="col-span-12 lg:col-span-5 card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold text-white text-sm">New Requests</h2>
                  <span className="badge badge-violet ml-auto">{requests.length} new</span>
                </div>
                <div className="space-y-3">
                  {requests.length === 0 && <p className="text-sm text-slate-400 py-4">All caught up. No pending requests.</p>}
                  {requests.map(req => (
                    <div key={req.id} className="card-2 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-mono">{req.id}</span>
                        <span className="badge badge-amber">Pending</span>
                      </div>
                      <div className="font-medium text-white text-sm">{req.item}</div>
                      <div className="text-xs text-slate-500 mb-2">{req.client} · {req.date}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-amber-400 font-bold text-sm">{req.budget}</span>
                        <div className="flex gap-2">
                          <button onClick={() => respondToRequest(req.id, true)} className="btn-primary text-xs py-1.5 px-3">Review request</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-slide-up max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Equipment Inventory</h1>
              <button className="btn-primary flex items-center gap-2"><Icon.Plus className="w-4 h-4" /> Add Item</button>
            </div>
            <div className="flex gap-2 mb-6">
              {['All', 'Audio', 'Lighting', 'LED / Video'].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} aria-pressed={category === cat} className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${category === cat ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{cat}</button>
              ))}
            </div>
            <div className="space-y-3">
              {inventory.filter(item => category === 'All' || item.category === category).map(item => (
                <div key={item.id} className="card p-5 flex items-center gap-5 hover:border-sky-500/30 transition-colors">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.status === 'available' ? 'bg-emerald-400' : item.status === 'rented' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.category} · {item.id} · Condition: {item.condition}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-amber-400 font-bold">{item.price}</div>
                    <span className={`badge mt-1 ${item.status === 'available' ? 'badge-emerald' : item.status === 'rented' ? 'badge-amber' : 'badge-rose'}`}>{item.status}</span>
                  </div>
                  <button className="btn-ghost text-xs py-2 px-3 flex-shrink-0">Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rentals' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Active Rentals</h1>
            <div className="space-y-4">
              {activeRentals.map(r => (
                <div key={r.id} className="card p-5 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon.Package className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{r.item}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{r.client} · Return by {r.returnDate}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-amber-400 font-bold">{r.total}</div>
                    <span className="badge badge-emerald mt-1">{r.status}</span>
                  </div>
                  <button className="btn-ghost text-xs py-2 px-3 flex-shrink-0">Manage</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Rental Requests</h1>
            <div className="space-y-4">
              {requests.length === 0 && <p className="text-sm text-slate-400 py-4">All caught up. No pending requests.</p>}
                  {requests.map(req => (
                <div key={req.id} className="card p-5 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon.Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{req.item}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{req.client} · {req.date}</div>
                  </div>
                  <span className="font-mono text-amber-400 font-bold flex-shrink-0">{req.budget}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => respondToRequest(req.id, true)} className="btn-primary text-xs py-2 px-3">Review request</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Earnings</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Revenue (2026)', value: '$44,700', color: 'text-amber-400' },
                { label: 'This Month', value: '$7,400', color: 'text-emerald-400' },
                { label: 'Pending Payout', value: '$3,850', color: 'text-sky-400' },
              ].map(s => (
                <div key={s.label} className="card p-5">
                  <div className={`text-2xl font-bold font-mono ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-white text-sm mb-6">Monthly Revenue — 2026</h2>
              <div className="flex items-end gap-3 h-48">
                {revenueData.map((d, i) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">${(d.amount / 1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${(d.amount / maxRevenue) * 160}px`,
                        background: i === revenueData.length - 1 ? 'linear-gradient(to top, rgba(var(--sl-accent-rgb), .35), var(--sl-accent))' : 'rgba(var(--sl-accent-rgb), .18)',
                        minHeight: 4
                      }} />
                    <span className="text-xs text-slate-500 font-mono">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Business Profile</h1>
            <div className="card p-6 mb-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold font-display">AV</div>
                <div>
                  <div className="font-display text-xl font-bold text-white">AudioVault Rentals</div>
                  <div className="text-slate-500 text-sm">audioault@stagelink.com</div>
                  <span className="badge badge-emerald mt-1">Verified Renter</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Business Name', 'AudioVault Rentals'], ['Owner', 'Samuel Park'], ['Phone', '+1 (555) 440-2291'], ['City', 'Los Angeles, CA']].map(([label, val]) => (
                  <div key={label}>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">{label}</label>
                    <input aria-label={label} className="input" value={profileValues[label] ?? val} onChange={event => setProfileValues(values => ({ ...values, [label]: event.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => setNotice('Profile changes kept for this demo session.')}>Save Changes</button>
          </div>
        )}
    </DashboardShell>
  );
}
