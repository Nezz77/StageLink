import { useState, useEffect, useRef } from 'react';
import DashboardShell, { DashboardIntro } from './DashboardShell';
import { Icon, Stars } from './Icons';
import BookingPaymentStatus from './BookingPaymentStatus';

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const bookedDates = [4, 11, 12, 18, 25, 26];
const blockedDates = [7, 14, 21];

const gigs = [
  { id: 1, title: 'Intimate Dinner Serenade — Solo Performance', tier: 'Standard', price: '$450/hr', status: 'live', bookings: 23 },
  { id: 2, title: 'Corporate Gala Headliner with PA System', tier: 'Premium', price: '$2,200/event', status: 'live', bookings: 8 },
  { id: 3, title: 'Wedding Package with Band Collaboration', tier: 'Custom', price: 'Quote', status: 'draft', bookings: 0 },
];

const portfolioItems = [
  { type: 'photo', src: 'photo-1516450360452-9312f5e86fc7', label: 'Jazz Night at The Ace Hotel' },
  { type: 'photo', src: 'photo-1470225620780-dba8ba36b745', label: 'Corporate Gala — Salesforce HQ' },
  { type: 'video', src: 'photo-1493225457124-a3eb161ffa5f', label: '▶ Live Demo Reel 2026' },
  { type: 'photo', src: 'photo-1511192336575-5a79af67a629', label: 'Beverly Hills Wedding Reception' },
];

const earningsData = [
  { month: 'Apr', amount: 3200 },
  { month: 'May', amount: 4100 },
  { month: 'Jun', amount: 3800 },
  { month: 'Jul', amount: 5200 },
  { month: 'Aug', amount: 4700 },
  { month: 'Sep', amount: 6100 },
  { month: 'Oct', amount: 5800 },
];
const maxEarnings = Math.max(...earningsData.map(d => d.amount));

const incomingRequests = [
  { id: 'REQ-441', client: 'Meridian Corp', event: 'Annual Gala', date: 'Dec 5, 2026', offer: '$3,200', status: 'new' },
  { id: 'REQ-438', client: 'Private Client', event: 'Wedding Reception', date: 'Nov 22, 2026', offer: '$1,800', status: 'new' },
];

function AIListingModal({ onClose }: { onClose: () => void }) {
  const [keywords, setKeywords] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus(); };
  }, []);
  const [generated, setGenerated] = useState(false);
  return (
    <dialog ref={dialogRef} className="sl-dialog" aria-labelledby="listing-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="card w-full max-w-lg mx-4 animate-slide-up">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Icon.Zap className="w-5 h-5 text-violet-400" />
            <h3 id="listing-dialog-title" className="font-display text-lg font-bold text-white">AI Auto-Generate Listing</h3>
          </div>
          <button aria-label="Close listing generator" onClick={onClose}><Icon.X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Enter keywords about your act</label>
            <input aria-label="Keywords about your act" className="input" placeholder="e.g. soul vocalist, jazz standards, wedding, intimate" value={keywords} onChange={e => setKeywords(e.target.value)} />
          </div>
          {!generated ? (
            <button className="btn-primary w-full flex items-center gap-2 justify-center" onClick={() => setGenerated(true)}>
              <Icon.Zap className="w-4 h-4" /> Generate with AI
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="card-2 p-4">
                <div className="text-xs text-violet-400 font-medium mb-2">Generated Gig Title</div>
                <div className="font-display text-base font-bold text-white">"Soulful Elegance — Jazz Vocalist for Luxury Events & Intimate Gatherings"</div>
              </div>
              <div className="card-2 p-4">
                <div className="text-xs text-violet-400 font-medium mb-2">Generated Description</div>
                <p className="text-sm text-slate-300 leading-relaxed">Transform your event into an unforgettable sensory experience with a performance that weaves rich soul harmonics through timeless jazz standards. With over 8 years of live performance experience at 5-star venues across Los Angeles and New York, every set is tailored to your atmosphere.</p>
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setGenerated(false)}>Regenerate</button>
                <button className="btn-primary flex-1" onClick={onClose}>Use This Listing</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

const navItems = [
  { id: 'overview', icon: Icon.LayoutDashboard, label: 'Overview' },
  { id: 'gigs', icon: Icon.Music, label: 'My Gigs' },
  { id: 'calendar', icon: Icon.Calendar, label: 'Calendar' },
  { id: 'portfolio', icon: Icon.Image, label: 'Portfolio' },
  { id: 'earnings', icon: Icon.DollarSign, label: 'Earnings' },
  { id: 'profile', icon: Icon.User, label: 'Profile' },
];

export default function ArtistDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [requests, setRequests] = useState(incomingRequests);
  const [notice, setNotice] = useState('');
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const respondToRequest = (id: string, accepted: boolean) => {
    setRequests(items => items.filter(item => item.id !== id));
    setNotice(`${id} ${accepted ? 'accepted' : 'declined'} in this demo session.`);
  };
  const [showAIModal, setShowAIModal] = useState(false);

  return (
    <DashboardShell role="artist" navItems={navItems} activeTab={activeTab} onNavigate={setActiveTab}>
      {notice && <p role="status" className="sl-feedback">{notice}</p>}
      {showAIModal && <AIListingModal onClose={() => setShowAIModal(false)} />}

        {activeTab === 'overview' && (
          <div className="animate-slide-up max-w-6xl mx-auto">
            <DashboardIntro eyebrow="YOUR ARTIST STUDIO · OCTOBER 2026" title="The stage is" emphasis="yours, Aria." description="Your next booking. Your next big moment. All in one place." action={<button className="btn-primary sl-action" onClick={() => setShowAIModal(true)}><Icon.Zap className="w-4 h-4" /> AI Generate Gig <span>↗</span></button>} />
            <div className="grid grid-cols-12 gap-5">
              {/* Profile Hero Card */}
              <div className="sl-spotlight sl-artist-spotlight col-span-12 lg:col-span-5 rounded-2xl overflow-hidden relative" style={{ minHeight: 260 }}>
                <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }}
                  src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=320&fit=crop"
                  alt="Aria Nova"
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,9,15,0.97) 0%, rgba(7,9,15,0.6) 50%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Verified Artist
                      </span>
                      <h2 className="font-display text-xl font-bold text-white">Aria Nova</h2>
                      <p className="text-slate-400 text-sm">Soul & Jazz Vocalist · Los Angeles, CA</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Stars rating={5} />
                        <span className="text-xs text-slate-400">4.9 (187 reviews)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-amber-400">$450/hr</div>
                      <div className="text-xs text-slate-500">Starting rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Column */}
              <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-4">
                {[
                  { label: 'Monthly Revenue', value: '$5,800', icon: Icon.DollarSign, color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', change: '+12%' },
                  { label: 'Profile Views', value: '2,847', icon: Icon.Eye, color: 'text-violet-400', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', change: '+31%' },
                  { label: 'Active Gigs', value: '2', icon: Icon.Music, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', change: '' },
                  { label: 'Bookings This Month', value: '7', icon: Icon.Calendar, color: 'text-rose-400', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', change: '+3' },
                ].map(s => (
                  <div key={s.label} className="sl-stat flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className="text-xl font-bold font-mono text-white">{s.value}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                    {s.change && (
                      <div className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{s.change}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Incoming Requests */}
              <div className="sl-request-panel col-span-12 lg:col-span-5 card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <Icon.Bell className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <h2 className="font-semibold text-white text-sm">Incoming Requests</h2>
                  <span className="badge badge-rose ml-auto">{requests.length} new</span>
                </div>
                <div className="space-y-3">
                  {requests.length === 0 && <p className="text-sm text-slate-400 py-4">All caught up. No pending requests.</p>}
                  {requests.map(req => (
                    <div key={req.id} className="card-2 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 font-mono">{req.id}</span>
                        <span className="badge badge-violet">New</span>
                      </div>
                      <div className="font-medium text-white text-sm">{req.event}</div>
                      <div className="text-xs text-slate-500 mb-2">{req.client} · {req.date}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-amber-400 font-bold text-sm">{req.offer}</span>
                        <div className="flex gap-2">
                          <button onClick={() => respondToRequest(req.id, false)} className="btn-ghost text-xs py-1.5 px-3">Decline</button>
                          <button onClick={() => respondToRequest(req.id, true)} className="btn-primary text-xs py-1.5 px-3">Accept</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Calendar */}
              <div className="col-span-12 lg:col-span-4 card p-5">
                <h2 className="font-semibold text-white text-sm mb-4">October 2026</h2>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-xs text-slate-500 font-medium py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Offset for Oct 1 = Thursday */}
                  {[0, 1, 2, 3].map(i => <div key={`off-${i}`} />)}
                  {calendarDays.map(d => (
                    <div key={d}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-colors
                        ${bookedDates.includes(d) ? 'bg-violet-500/30 text-violet-300 font-bold' : ''}
                        ${blockedDates.includes(d) ? 'bg-slate-800 text-slate-600' : ''}
                        ${!bookedDates.includes(d) && !blockedDates.includes(d) ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : ''}
                      `}
                    >{d}</div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500/30 inline-block" />Booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-800 inline-block" />Blocked</span>
                </div>
              </div>

              {/* Earnings mini chart */}
              <div className="col-span-12 lg:col-span-3 card p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white text-sm">Earnings Trend</h2>
                  <span className="badge badge-emerald">+12%</span>
                </div>
                <div className="flex items-end gap-1.5 flex-1 min-h-[90px]">
                  {earningsData.map((d, i) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${(d.amount / maxEarnings) * 80}px`,
                          background: i === earningsData.length - 1 ? 'linear-gradient(to top, rgba(var(--sl-accent-rgb), .35), var(--sl-accent))' : 'rgba(var(--sl-accent-rgb), .18)',
                          minHeight: 4
                        }} />
                      <span className="text-xs text-slate-600 font-mono" style={{ fontSize: 9 }}>{d.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gigs' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">My Gig Listings</h1>
              <div className="flex gap-2">
                <button className="btn-ghost flex items-center gap-2" onClick={() => setShowAIModal(true)}>
                  <Icon.Zap className="w-4 h-4" /> AI Generate
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <Icon.Plus className="w-4 h-4" /> New Gig
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {gigs.map(gig => (
                <div key={gig.id} className="card p-5 flex items-center gap-5 hover:border-amber-500/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: gig.status === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.15)', border: `1px solid ${gig.status === 'live' ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}` }}>
                    <Icon.Music className={`w-5 h-5 ${gig.status === 'live' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{gig.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{gig.tier} Tier · {gig.bookings} bookings total</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-amber-400 font-bold">{gig.price}</div>
                    <span className={`badge mt-1 ${gig.status === 'live' ? 'badge-emerald' : 'badge-amber'}`}>{gig.status}</span>
                  </div>
                  <button className="btn-ghost text-xs py-2 px-3 flex-shrink-0">Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Availability Calendar</h1>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-white">October 2026</h2>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs py-1.5 px-3">← Prev</button>
                  <button className="btn-ghost text-xs py-1.5 px-3">Next →</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-xs text-slate-500 font-medium py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3].map(i => <div key={`off-${i}`} />)}
                {calendarDays.map(d => (
                  <div key={d}
                    className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium cursor-pointer transition-colors
                      ${bookedDates.includes(d) ? 'gradient-violet text-white shadow-lg' : ''}
                      ${blockedDates.includes(d) ? 'bg-slate-800 text-slate-600' : ''}
                      ${!bookedDates.includes(d) && !blockedDates.includes(d) ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : ''}
                    `}
                  >{d}</div>
                ))}
              </div>
              <div className="flex gap-6 mt-6 text-xs text-slate-400">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded gradient-violet inline-block" />Booked Event</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-800 inline-block" />Blocked / Unavailable</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-700 inline-block" />Available</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-bold text-white">Portfolio</h1>
              <button className="btn-primary flex items-center gap-2"><Icon.Upload className="w-4 h-4" /> Upload Media</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {portfolioItems.map((item, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden aspect-square cursor-pointer">
                  <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} src={`https://images.unsplash.com/${item.src}?w=300&h=300&fit=crop`} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                    <div className="p-3 w-full">
                      {item.type === 'video' && <Icon.Play className="w-8 h-8 text-white mx-auto mb-2" />}
                      <p className="text-xs text-white font-medium text-center">{item.label}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl aspect-square border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-violet-500 transition-colors group">
                <div className="text-center">
                  <Icon.Plus className="w-8 h-8 text-slate-600 group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
                  <p className="text-xs text-slate-600 group-hover:text-violet-400 transition-colors">Add Media</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="animate-slide-up max-w-4xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Earnings</h1>
            <div className="mb-6"><BookingPaymentStatus /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Earned (2026)', value: '$33,200', color: 'text-amber-400' },
                { label: 'This Month', value: '$5,800', color: 'text-emerald-400' },
                { label: 'Pending Payout', value: '$2,450', color: 'text-violet-400' },
              ].map(s => (
                <div key={s.label} className="card p-5">
                  <div className={`text-2xl font-bold font-mono ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-white text-sm mb-6">Monthly Earnings — 2026</h2>
              <div className="flex items-end gap-3 h-48">
                {earningsData.map((d, i) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">${(d.amount / 1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${(d.amount / maxEarnings) * 160}px`,
                        background: i === earningsData.length - 1 ? 'linear-gradient(to top, rgba(var(--sl-accent-rgb), .35), var(--sl-accent))' : 'rgba(var(--sl-accent-rgb), .18)',
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
            <h1 className="font-display text-2xl font-bold text-white mb-6">Artist Profile</h1>
            <div className="card p-6 mb-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-amber-500/40">
                  <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=64&h=64&fit=crop" alt="Aria Nova" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-display text-xl font-bold text-white">Aria Nova</div>
                  <div className="text-slate-500 text-sm">aria.nova@stagelink.com</div>
                  <span className="badge badge-emerald mt-1">Verified Artist</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Artist Name', 'Aria Nova'], ['Genre', 'Soul / Jazz'], ['Phone', '+1 (555) 201-8847'], ['City', 'Los Angeles, CA']].map(([label, val]) => (
                  <div key={label}>
                    <label className="text-xs text-slate-400 font-medium block mb-1.5">{label}</label>
                    <input aria-label={label} className="input" value={profileValues[label] ?? val} onChange={event => setProfileValues(values => ({ ...values, [label]: event.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-xs text-slate-400 font-medium block mb-1.5">Bio</label>
                <textarea aria-label="Bio" className="input resize-none h-24" value={profileValues.Bio ?? "Award-winning vocalist Aria Nova brings a rare fusion of classical training and contemporary soul to every stage. Featured at The Ritz Carlton, Four Seasons Beverly Hills, and Sundance Film Festival."} onChange={event => setProfileValues(values => ({ ...values, Bio: event.target.value }))} />
              </div>
            </div>
            <button className="btn-primary" onClick={() => setNotice('Profile changes kept for this demo session.')}>Save Changes</button>
          </div>
        )}
    </DashboardShell>
  );
}
