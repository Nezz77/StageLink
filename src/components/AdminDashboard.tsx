import { useState } from 'react';
import { Icon } from './Icons';

const chartData = [
  { month: 'Apr', gmv: 180, users: 420, revenue: 21 },
  { month: 'May', gmv: 240, users: 510, revenue: 28 },
  { month: 'Jun', gmv: 310, users: 640, revenue: 37 },
  { month: 'Jul', gmv: 290, users: 720, revenue: 34 },
  { month: 'Aug', gmv: 380, users: 890, revenue: 45 },
  { month: 'Sep', gmv: 420, users: 980, revenue: 50 },
  { month: 'Oct', gmv: 510, users: 1120, revenue: 61 },
];
const maxGMV = Math.max(...chartData.map(d => d.gmv));

const pendingVerifications = [
  { id: 'VRF-881', name: 'Carlos Mendes', type: 'Artist', category: 'Live Band', submitted: 'Oct 10, 2026', doc: 'Government ID + Tax Form', img: 'photo-1493225457124-a3eb161ffa5f' },
  { id: 'VRF-882', name: 'SoundScape AV Rentals', type: 'Equipment Renter', category: 'Audio / Lighting', submitted: 'Oct 11, 2026', doc: 'Business License + Insurance', img: null },
  { id: 'VRF-884', name: 'Elena Vasquez', type: 'Artist', category: 'Dancer', submitted: 'Oct 12, 2026', doc: 'Government ID + Portfolio Link', img: 'photo-1504609813442-a8924e83f76e' },
];

const disputes = [
  { id: 'DSP-114', parties: ['Jordan Rivera', 'DJ Neon Pulse'], issue: 'Artist no-show on Oct 3rd. Full refund requested.', amount: '$1,800', status: 'open', severity: 'high' },
  { id: 'DSP-115', parties: ['TechCorp Events', 'AudioVault Rentals'], issue: 'Equipment arrived damaged. Deposit dispute.', amount: '$350', status: 'reviewing', severity: 'medium' },
];

const supportMessages = [
  { id: 1, user: 'Jordan Rivera', issue: 'Cannot access booking confirmation email', time: '10 min ago', resolved: false },
  { id: 2, user: 'Elena Vasquez', issue: 'Profile photo not updating after upload', time: '34 min ago', resolved: false },
  { id: 3, user: 'AudioVault Rentals', issue: 'Payout delayed — need urgent assistance', time: '1 hr ago', resolved: true },
];

const recentActivity = [
  { type: 'booking', text: 'New booking BK-2901 confirmed', time: '2 min ago' },
  { type: 'signup', text: 'New artist signup: Elena Vasquez', time: '15 min ago' },
  { type: 'dispute', text: 'Dispute DSP-114 escalated', time: '28 min ago' },
  { type: 'payment', text: 'Payout $4,200 processed to AudioVault', time: '1 hr ago' },
];

const navItems = [
  { id: 'analytics', icon: Icon.BarChart, label: 'Analytics' },
  { id: 'verification', icon: Icon.Shield, label: 'Verification' },
  { id: 'disputes', icon: Icon.AlertCircle, label: 'Disputes' },
  { id: 'system', icon: Icon.Cpu, label: 'System' },
  { id: 'support', icon: Icon.MessageCircle, label: 'Support' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-5 gap-2 flex-shrink-0 sticky top-0 h-screen z-10"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
        <div className="mb-4 flex items-center justify-center">
          <img src="/stagelink-logo.png" alt="StageLink" className="w-11 h-11 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
        </div>

        <div className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-1 w-full text-center" style={{ fontSize: 9 }}>ADMIN</div>

        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${activeTab === item.id
              ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            <item.icon className="w-4.5 h-4.5" />
            <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700">
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-rose-500" />
            )}
            {/* Notification badge for disputes */}
            {item.id === 'disputes' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ fontSize: 9 }}>2</span>
            )}
            {item.id === 'verification' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ fontSize: 9 }}>3</span>
            )}
          </button>
        ))}

        <div className="flex-1" />
        <div className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-1 w-full text-center" style={{ fontSize: 9 }}>ADMIN</div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform">AD</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'analytics' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Platform Analytics</h1>
                <p className="text-slate-500 text-sm mt-0.5">Real-time overview of StageLink marketplace performance.</p>
              </div>
              <span className="badge badge-emerald flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Systems Operational
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Platform GMV', value: '$510K', icon: Icon.DollarSign, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', change: '+21%' },
                { label: 'Total Users', value: '12,400+', icon: Icon.Users, color: 'text-violet-400', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', change: '+8%' },
                { label: 'Monthly Revenue', value: '$61K', icon: Icon.TrendingUp, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', change: '+12%' },
                { label: 'Open Disputes', value: '2', icon: Icon.AlertCircle, color: 'text-rose-400', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', change: '' },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-white">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                    {s.change && <div className="text-xs font-semibold text-emerald-400 mt-0.5">{s.change}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-5">
              {/* GMV Chart */}
              <div className="col-span-12 lg:col-span-8 card p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-white text-sm">Monthly GMV ($K)</h2>
                  <div className="flex gap-2">
                    {['GMV', 'Users', 'Revenue'].map((m, i) => (
                      <button key={m} className={`text-xs px-3 py-1 rounded-lg border transition-all ${i === 0 ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-3 h-40">
                  {chartData.map((d, i) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${(d.gmv / maxGMV) * 130}px`,
                          background: i === chartData.length - 1 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : 'rgba(124,58,237,0.3)',
                          minHeight: 4
                        }} />
                      <span className="text-xs text-slate-500 font-mono">{d.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="col-span-12 lg:col-span-4 card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Icon.Activity className="w-4 h-4 text-violet-400" />
                  <h2 className="font-semibold text-white text-sm">Live Activity</h2>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                </div>
                <div className="space-y-3">
                  {recentActivity.map((act, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${act.type === 'dispute' ? 'bg-rose-400' : act.type === 'booking' ? 'bg-emerald-400' : act.type === 'payment' ? 'bg-amber-400' : 'bg-violet-400'}`} />
                      <div>
                        <p className="text-xs text-slate-300">{act.text}</p>
                        <p className="text-xs text-slate-600">{act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Metrics */}
              <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Artists on Platform', value: '89,200+' },
                  { label: 'Events Booked', value: '340+' },
                  { label: 'Cities Covered', value: '< 2 hrs' },
                  { label: 'Avg. Response Time', value: '4.8 ★' },
                ].map(m => (
                  <div key={m.label} className="card-2 p-4 text-center">
                    <div className="font-display text-2xl font-bold text-white mb-1">{m.value}</div>
                    <div className="text-xs text-slate-500">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Identity Verification Queue</h1>
              <span className="badge badge-amber">{pendingVerifications.length} Pending</span>
            </div>
            <div className="space-y-4">
              {pendingVerifications.map(v => (
                <div key={v.id} className="card p-5 flex items-center gap-5">
                  {v.img ? (
                    <img src={`https://images.unsplash.com/${v.img}?w=56&h=56&fit=crop`} alt={v.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Icon.Briefcase className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white">{v.name}</span>
                      <span className={`badge ${v.type === 'Artist' ? 'badge-amber' : 'badge-violet'}`}>{v.type}</span>
                    </div>
                    <div className="text-xs text-slate-500">{v.category} · Submitted: {v.submitted}</div>
                    <div className="text-xs text-slate-600 mt-0.5">Docs: {v.doc}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="btn-ghost text-xs py-2 px-3 flex items-center gap-1">
                      <Icon.Eye className="w-3 h-3" /> Review
                    </button>
                    <button className="btn-ghost text-xs py-2 px-3 text-rose-400 hover:text-rose-300">Reject</button>
                    <button className="btn-primary text-xs py-2 px-3 text-emerald-400" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Icon.CheckCircle className="w-4 h-4 inline mr-1" />Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Disputes & Escalations</h1>
              <span className="badge badge-rose">{disputes.length} Open</span>
            </div>
            <div className="space-y-4">
              {disputes.map(d => (
                <div key={d.id} className="card p-5" style={{ borderColor: d.severity === 'high' ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{d.id}</span>
                      <span className={`badge ${d.status === 'open' ? 'badge-rose' : 'badge-amber'}`}>{d.status}</span>
                      <span className={`badge ${d.severity === 'high' ? 'badge-rose' : 'badge-amber'}`}>{d.severity} priority</span>
                    </div>
                    <span className="font-mono text-amber-400 font-bold">{d.amount}</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    {d.parties.map(p => (
                      <span key={p} className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">{p}</span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{d.issue}</p>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs py-2 px-3">View Thread</button>
                    <button className="btn-ghost text-xs py-2 px-3">Contact Parties</button>
                    <button className="btn-primary text-xs py-2 px-3 ml-auto">Issue Ruling</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">System Controls</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {[
                { label: 'API Health', value: '99.98% uptime', status: 'good' },
                { label: 'Database', value: 'PostgreSQL · 2.1ms avg', status: 'good' },
                { label: 'CDN Edge', value: '12 nodes active', status: 'good' },
                { label: 'Queue Workers', value: '8 running', status: 'good' },
              ].map(s => (
                <div key={s.label} className="card p-4 flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{s.label}</div>
                    <div className="text-xs text-slate-500">{s.value}</div>
                  </div>
                  <span className="badge badge-emerald">Healthy</span>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Platform Controls</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 card-2 rounded-xl">
                  <div>
                    <div className="font-medium text-white text-sm">Maintenance Mode</div>
                    <div className="text-xs text-slate-500">Temporarily disable public access to the platform</div>
                  </div>
                  <button
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${maintenanceMode ? 'bg-rose-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {[
                  { label: 'Force User Re-authentication', desc: 'Log out all active sessions platform-wide' },
                  { label: 'Clear CDN Cache', desc: 'Purge all cached assets and force fresh delivery' },
                  { label: 'Send Platform Announcement', desc: 'Broadcast a message to all registered users' },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between p-4 card-2 rounded-xl">
                    <div>
                      <div className="font-medium text-white text-sm">{c.label}</div>
                      <div className="text-xs text-slate-500">{c.desc}</div>
                    </div>
                    <button className="btn-ghost text-xs py-2 px-3 text-rose-400">Execute</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Support Tickets</h1>
              <span className="badge badge-amber">{supportMessages.filter(m => !m.resolved).length} Open</span>
            </div>
            <div className="space-y-3">
              {supportMessages.map(msg => (
                <div key={msg.id} className="card p-5 flex items-center gap-5" style={{ opacity: msg.resolved ? 0.6 : 1 }}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${msg.resolved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{msg.user}</div>
                    <div className="text-sm text-slate-400">{msg.issue}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{msg.time}</div>
                  </div>
                  <span className={`badge flex-shrink-0 ${msg.resolved ? 'badge-emerald' : 'badge-amber'}`}>
                    {msg.resolved ? 'Resolved' : 'Open'}
                  </span>
                  {!msg.resolved && <button className="btn-primary text-xs py-2 px-3 flex-shrink-0">Respond</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
