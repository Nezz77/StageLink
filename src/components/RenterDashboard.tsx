import { useState } from 'react';
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

const incomingRequests = [
  { id: 'REQ-119', client: 'Starlit Weddings', item: 'Full PA System + Lighting Rig', date: 'Nov 8, 2026', budget: '$600/day' },
  { id: 'REQ-121', client: 'Private Corporate', item: 'LED Video Wall 8m²', date: 'Nov 14, 2026', budget: '$320/day' },
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
  { id: 'inventory', icon: Icon.Package, label: 'Inventory' },
  { id: 'rentals', icon: Icon.Repeat, label: 'Active Rentals' },
  { id: 'requests', icon: Icon.Bell, label: 'Requests' },
  { id: 'earnings', icon: Icon.DollarSign, label: 'Earnings' },
  { id: 'profile', icon: Icon.User, label: 'Profile' },
];

export default function RenterDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-5 gap-2 flex-shrink-0 sticky top-0 h-screen z-10"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
        <div className="mb-4 flex items-center justify-center">
          <img src="/stagelink-logo.png" alt="StageLink" className="w-11 h-11 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
        </div>

        <div className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-1 w-full text-center" style={{ fontSize: 9 }}>MAIN</div>

        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${activeTab === item.id
              ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.3)]'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            <item.icon className="w-4.5 h-4.5" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700">
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-sky-500" />
            )}
          </button>
        ))}

        <div className="flex-1" />
        <div className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-1 w-full text-center" style={{ fontSize: 9 }}>ME</div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform">AV</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">AudioVault Rentals 🎛️</h1>
                <p className="text-slate-500 text-sm mt-0.5">2 active rentals · 2 new requests · 2 items available</p>
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Icon.Plus className="w-4 h-4" /> Add Equipment
              </button>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* Hero Equipment Card */}
              <div className="col-span-12 lg:col-span-7 rounded-2xl overflow-hidden relative" style={{ minHeight: 260 }}>
                <img
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
                  <div key={s.label} className="flex items-center gap-4 p-4 rounded-2xl flex-1"
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
                  <span className="badge badge-violet ml-auto">{incomingRequests.length} new</span>
                </div>
                <div className="space-y-3">
                  {incomingRequests.map(req => (
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
                          <button className="btn-ghost text-xs py-1.5 px-3">Decline</button>
                          <button className="btn-primary text-xs py-1.5 px-3">Accept</button>
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
              {['All', 'Audio', 'Lighting', 'LED / Video'].map((cat, i) => (
                <button key={cat} className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${i === 0 ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{cat}</button>
              ))}
            </div>
            <div className="space-y-3">
              {inventory.map(item => (
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
              {incomingRequests.map(req => (
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
                    <button className="btn-ghost text-xs py-2 px-3">Decline</button>
                    <button className="btn-primary text-xs py-2 px-3">Accept</button>
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
                        background: i === revenueData.length - 1 ? 'linear-gradient(to top, #0ea5e9, #38bdf8)' : 'rgba(14,165,233,0.25)',
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
                    <input className="input" defaultValue={val} />
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary">Save Changes</button>
          </div>
        )}
      </main>
    </div>
  );
}
