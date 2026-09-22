import { useState } from 'react';
import { Icon, Stars } from './Icons';

const savedArtists = [
  { name: 'Aria Nova', category: 'Solo Vocalist', price: '$450/hr', rating: 4.9, image: 'photo-1516450360452-9312f5e86fc7' },
  { name: 'DJ Neon Pulse', category: 'DJ', price: '$600/hr', rating: 4.7, image: 'photo-1571266028243-e4733b0f0bb0' },
  { name: 'Luna Dance Co.', category: 'Dance Troupe', price: '$800/event', rating: 4.9, image: 'photo-1504609813442-a8924e83f76e' },
];

const upcomingBookings = [
  { id: 'BK-2847', artist: 'Aria Nova', event: 'Corporate Gala – TechVentures Annual', date: 'Oct 18, 2026', status: 'Confirmed', amount: '$2,250' },
  { id: 'BK-2901', artist: 'DJ Neon Pulse', event: 'Birthday Party – Private Residence', date: 'Nov 2, 2026', status: 'In-Negotiation', amount: '$1,800' },
];

const aiRecommendations = [
  { name: 'The Midnight Collective', match: 97, reason: 'Matches jazz requirement + corporate event history', price: '$1,200/event', rating: 4.8 },
  { name: 'Marco Strings', match: 91, reason: 'Classical crossover fits gala ambiance perfectly', price: '$350/hr', rating: 5.0 },
  { name: 'Sunset Brass', match: 88, reason: 'Brass ensembles score highest for corporate galas', price: '$950/event', rating: 4.6 },
];

const eventTypes = ['Corporate Gala', 'Wedding', 'Birthday Party', 'Festival', 'Private Dinner', 'Product Launch'];

function MultiStepPostWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = ['Event Type', 'Date & Location', 'Requirements', 'Budget & Post'];
  const [form, setForm] = useState({ type: '', date: '', location: '', headcount: '', budget: '2000' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="card w-full max-w-lg mx-4 animate-slide-up">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-white">Post an Event Brief</h3>
            <p className="text-xs text-slate-500 mt-1">Step {step + 1} of {steps.length}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><Icon.X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b border-slate-800 flex gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'gradient-violet text-white' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</div>
              <span className={`text-xs font-medium ${i === step ? 'text-violet-400' : 'text-slate-600'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-violet-700' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>
        <div className="p-6">
          {step === 0 && (
            <div>
              <p className="text-slate-400 text-sm mb-4">What type of event are you planning?</p>
              <div className="grid grid-cols-2 gap-3">
                {eventTypes.map(t => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${form.type === t ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Event Date</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Location / Venue</label>
                <input className="input" placeholder="e.g. The Ritz Carlton, New York" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Expected Headcount</label>
                <input className="input" placeholder="e.g. 200 guests" value={form.headcount} onChange={e => setForm({ ...form, headcount: e.target.value })} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">What do you need for the event?</p>
              <div className="space-y-3">
                {['Professional Sound System', 'Stage Lighting', 'LED Video Wall', 'Wireless Microphones', 'Fog / Special Effects'].map(item => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-violet-500 w-4 h-4" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Custom Notes</label>
                <textarea className="input resize-none h-20" placeholder="Any special requirements..." />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium flex justify-between mb-2">
                  <span>Budget Range</span>
                  <span className="text-amber-400 font-mono">${parseInt(form.budget).toLocaleString()}</span>
                </label>
                <input type="range" min="500" max="50000" step="500" value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  className="w-full accent-violet-500" />
                <div className="flex justify-between text-xs text-slate-600 mt-1"><span>$500</span><span>$50,000</span></div>
              </div>
              <div className="card-2 p-4">
                <div className="text-xs text-slate-500 font-medium mb-3">Your Event Brief Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Event Type</span><span className="text-white">{form.type || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Location</span><span className="text-white">{form.location || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Budget</span><span className="text-amber-400 font-mono">${parseInt(form.budget).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-800 flex gap-3">
          {step > 0 && <button className="btn-ghost flex-1" onClick={() => setStep(s => s - 1)}>Back</button>}
          <button className="btn-primary flex-1" onClick={() => step < 3 ? setStep(s => s + 1) : onClose()}>
            {step === 3 ? '🚀 Post Brief & Get AI Matches' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { id: 'overview', icon: Icon.LayoutDashboard, label: 'Overview' },
  { id: 'search', icon: Icon.Search, label: 'Find Artists' },
  { id: 'bookings', icon: Icon.Calendar, label: 'Bookings' },
  { id: 'saved', icon: Icon.Heart, label: 'Saved' },
  { id: 'profile', icon: Icon.User, label: 'Profile' },
];

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {showWizard && <MultiStepPostWizard onClose={() => setShowWizard(false)} />}

      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-5 gap-2 flex-shrink-0 sticky top-0 h-screen z-10"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
        {/* Logo */}
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
              ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_12px_rgba(124,58,237,0.3)]'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
          >
            <item.icon className="w-4.5 h-4.5" />
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-slate-800 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700">
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-violet-500" />
            )}
          </button>
        ))}

        <div className="flex-1" />
        <div className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-1 w-full text-center" style={{ fontSize: 9 }}>USER</div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform">JR</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-full">
        {activeTab === 'overview' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Good evening, Jordan 👋</h1>
                <p className="text-slate-500 text-sm mt-0.5">You have 2 upcoming bookings and 1 pending negotiation.</p>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowWizard(true)}>
                <Icon.Plus className="w-4 h-4" />
                Post New Event
              </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-5">
              {/* Hero Booking Card */}
              <div className="col-span-12 lg:col-span-7 rounded-2xl overflow-hidden relative" style={{ minHeight: 260 }}>
                <img
                  src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=320&fit=crop"
                  alt="Active Booking"
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,9,15,0.92) 0%, rgba(7,9,15,0.55) 60%, transparent 100%)' }} />
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Confirmed
                      </span>
                      <h2 className="font-display text-xl font-bold text-white leading-tight">Corporate Gala<br />TechVentures Annual</h2>
                      <p className="text-slate-400 text-sm mt-1">with <span className="text-violet-300 font-medium">Aria Nova</span></p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-amber-400">$2,250</div>
                      <div className="text-xs text-slate-500">Booking BK-2847</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Icon.Calendar className="w-4 h-4 text-violet-400" />
                      Oct 18, 2026
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Icon.MapPin className="w-4 h-4 text-violet-400" />
                      The Grand Ballroom, NYC
                    </div>
                    <button className="ml-auto btn-primary text-xs py-2 px-4">View Details</button>
                  </div>
                </div>
              </div>

              {/* Stats Column */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                {[
                  { label: 'Total Spent', value: '$12,450', icon: Icon.DollarSign, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                  { label: 'Events Booked', value: '8', icon: Icon.Calendar, color: 'text-violet-400', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
                  { label: 'Avg. Rating Given', value: '4.6 ★', icon: Icon.Star, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
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

              {/* AI Recommendations */}
              <div className="col-span-12 lg:col-span-8 card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg gradient-violet flex items-center justify-center">
                    <Icon.Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="font-semibold text-white text-sm">AI Recommendations for Your Next Gala</h2>
                  <span className="badge badge-violet ml-auto">AI Powered</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiRecommendations.map((rec, i) => (
                    <div key={rec.name} className="card-2 p-4 hover:border-violet-500/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-mono">#{i + 1} Match</span>
                        <span className="font-mono text-sm font-bold" style={{ color: i === 0 ? '#10b981' : i === 1 ? '#a78bfa' : '#f59e0b' }}>{rec.match}%</span>
                      </div>
                      <div className="font-semibold text-white text-sm mb-1">{rec.name}</div>
                      <p className="text-xs text-slate-500 mb-3">{rec.reason}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-amber-400 text-xs">{rec.price}</span>
                        <Stars rating={Math.floor(rec.rating)} />
                      </div>
                      <button className="btn-primary w-full text-xs py-2">Book Now</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="col-span-12 lg:col-span-4 card p-5">
                <h2 className="font-semibold text-white text-sm mb-4">Upcoming Bookings</h2>
                <div className="space-y-3">
                  {upcomingBookings.map(b => (
                    <div key={b.id} className="card-2 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-mono">{b.id}</span>
                        <span className={`badge ${b.status === 'Confirmed' ? 'badge-emerald' : 'badge-amber'}`}>{b.status}</span>
                      </div>
                      <div className="font-medium text-white text-sm mb-1 truncate">{b.event}</div>
                      <div className="text-xs text-slate-500 mb-2">{b.artist} · {b.date}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-amber-400 text-sm font-bold">{b.amount}</span>
                        <button className="text-xs text-violet-400 hover:text-violet-300 font-medium">Details →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Find Your Artist</h1>
            </div>
            <div className="card p-5 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">Search</label>
                  <div className="relative"><Icon.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input pl-9" placeholder="Artist name, genre, style..." /></div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">Location</label>
                  <div className="relative"><Icon.MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className="input pl-9" placeholder="City or zip code" /></div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">Genre</label>
                  <select className="input">
                    <option>All Genres</option>
                    <option>R&B / Soul</option>
                    <option>Jazz / Funk</option>
                    <option>Electronic</option>
                    <option>Classical</option>
                    <option>Pop</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 font-medium flex justify-between mb-1.5"><span>Budget Range</span><span className="text-amber-400 font-mono">$500 – $5,000</span></label>
                  <input type="range" min="100" max="20000" className="w-full accent-violet-500" defaultValue="5000" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">Min. Rating</label>
                  <select className="input">
                    <option>Any Rating</option><option>4+ Stars</option><option>4.5+ Stars</option><option>5 Stars Only</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedArtists.map(a => (
                <div key={a.name} className="card overflow-hidden group cursor-pointer hover:border-violet-500/40 transition-all">
                  <div className="h-40 relative overflow-hidden">
                    <img src={`https://images.unsplash.com/${a.image}?w=400&h=200&fit=crop`} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div style={{ background: 'linear-gradient(to top, rgba(7,9,15,0.9), transparent)' }} className="absolute inset-0" />
                    <div className="absolute bottom-2 left-3">
                      <div className="font-display font-bold text-white">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.category}</div>
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <Stars rating={Math.floor(a.rating)} />
                    <span className="font-mono text-amber-400 text-sm">{a.price}</span>
                  </div>
                  <div className="px-3 pb-3 flex gap-2">
                    <button className="btn-primary flex-1 text-xs py-1.5">Book</button>
                    <button className="btn-ghost text-xs py-1.5 px-3"><Icon.Heart className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">My Bookings</h1>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowWizard(true)}>
                <Icon.Plus className="w-4 h-4" /> Post New Event
              </button>
            </div>
            <div className="flex gap-2 mb-6">
              {['All', 'Confirmed', 'In-Negotiation', 'Completed', 'Cancelled'].map((s, i) => (
                <button key={s} className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${i === 0 ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{s}</button>
              ))}
            </div>
            <div className="space-y-3">
              {upcomingBookings.map(b => (
                <div key={b.id} className="card p-5 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl gradient-violet flex items-center justify-center flex-shrink-0">
                    <Icon.Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{b.event}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{b.artist} · {b.date}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-amber-400 font-bold">{b.amount}</div>
                    <span className={`badge mt-1 ${b.status === 'Confirmed' ? 'badge-emerald' : 'badge-amber'}`}>{b.status}</span>
                  </div>
                  <button className="btn-ghost text-xs py-2 px-3 flex-shrink-0">View</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Saved Items</h1>
            <div className="flex gap-2 mb-6">
              {['Artists', 'Gigs', 'Equipment', 'Venues'].map((cat, i) => (
                <button key={cat} className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${i === 0 ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedArtists.map(a => (
                <div key={a.name} className="card p-4 flex items-center gap-4 hover:border-violet-500/40 transition-colors">
                  <img src={`https://images.unsplash.com/${a.image}?w=56&h=56&fit=crop`} alt={a.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.category}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Stars rating={Math.floor(a.rating)} />
                      <span className="font-mono text-amber-400 text-xs">{a.price}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="btn-primary text-xs py-1.5 px-3">Book</button>
                    <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"><Icon.X className="w-3 h-3" />Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-slide-up max-w-2xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">My Profile</h1>
            <div className="card p-6 mb-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold font-display">J</div>
                <div>
                  <div className="font-display text-xl font-bold text-white">Jordan Rivera</div>
                  <div className="text-slate-500 text-sm">jordan.rivera@email.com</div>
                  <span className="badge badge-emerald mt-1">Verified Customer</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['First Name', 'Jordan'], ['Last Name', 'Rivera'], ['Phone', '+1 (555) 823-4910'], ['City', 'Los Angeles, CA']].map(([label, val]) => (
                  <div key={label}>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">{label}</label>
                    <input className="input" defaultValue={val} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-white text-sm mb-4">Event Preferences</h3>
              <div className="space-y-3">
                {['Corporate Events', 'Weddings', 'Private Parties', 'Outdoor Festivals'].map(pref => (
                  <label key={pref} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-violet-500 w-4 h-4" defaultChecked={pref !== 'Outdoor Festivals'} />
                    <span className="text-sm text-slate-300">{pref}</span>
                  </label>
                ))}
              </div>
              <button className="btn-primary mt-4">Save Preferences</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
