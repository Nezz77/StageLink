import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

const messages = [
  { id: 1, from: 'other', sender: 'Aria Nova', text: 'Hi Jordan! I saw your corporate gala brief. I would love to perform at your TechVentures event. What musical style are you envisioning for the evening?', time: '2:14 PM', read: true },
  { id: 2, from: 'user', text: 'Hi Aria! We\'re looking for a sophisticated jazz-soul set for 250 guests. Black tie event. The vibe should be elegant but energetic.', time: '2:18 PM', read: true },
  { id: 3, from: 'other', sender: 'Aria Nova', text: 'Perfect — that is exactly my specialty! I\'m thinking a curated 3-hour set: cocktail hour classics, dinner ambient jazz, then a soulful main set as the evening picks up.', time: '2:21 PM', read: true },
  { id: 4, from: 'user', text: 'That sounds incredible. What\'s your availability on October 18?', time: '2:24 PM', read: true },
  { id: 5, from: 'other', sender: 'Aria Nova', text: 'October 18 is open! I\'ve just sent you a custom quotation for review.', time: '2:26 PM', read: false },
];

const bookingSteps = [
  { label: 'Request Sent', done: true, date: 'Oct 10' },
  { label: 'In Negotiation', done: true, active: true, date: 'Oct 12' },
  { label: 'Confirmed', done: false, date: '—' },
  { label: 'Deposit Paid', done: false, date: '—' },
  { label: 'Event Complete', done: false, date: '—' },
];

function NegotiationCard({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'view' | 'counter' | 'accepted'>('view');
  return (
    <div className="card p-4 border-violet-500/40 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Icon.FileText className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">Custom Quotation from Aria Nova</span>
        <span className="badge badge-violet ml-auto">Pending</span>
      </div>
      <div className="card-2 p-3 mb-3 space-y-2">
        {[
          ['Event', 'TechVentures Corporate Gala'],
          ['Date', 'October 18, 2026 — 7:00 PM'],
          ['Duration', '3 hours (incl. setup)'],
          ['Performance', 'Solo Jazz-Soul Vocalist + backing track'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-slate-400">{k}</span><span className="text-white">{v}</span>
          </div>
        ))}
        <div className="border-t border-slate-700 pt-2 flex justify-between">
          <span className="text-slate-400 text-sm">Total</span>
          <span className="font-mono font-bold text-amber-400 text-lg">$2,250</span>
        </div>
      </div>
      {mode === 'view' && (
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all" onClick={() => setMode('accepted')}>
            ✓ Accept Quote
          </button>
          <button className="flex-1 py-2 rounded-lg text-sm font-semibold bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all" onClick={() => setMode('counter')}>
            ↕ Counter Offer
          </button>
          <button className="px-3 py-2 rounded-lg text-sm text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-all" onClick={onClose}>
            Decline
          </button>
        </div>
      )}
      {mode === 'counter' && (
        <div className="animate-fade-in space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Your Counter Offer</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input className="input pl-7 font-mono" defaultValue="2000" /></div>
          </div>
          <textarea className="input resize-none h-16 text-sm" placeholder="Optional note to Aria..." />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 text-sm" onClick={() => setMode('view')}>Back</button>
            <button className="btn-primary flex-1 text-sm">Send Counter</button>
          </div>
        </div>
      )}
      {mode === 'accepted' && (
        <div className="text-center py-2 animate-fade-in">
          <Icon.CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-300 font-semibold">Quote Accepted! Proceeding to checkout...</p>
        </div>
      )}
    </div>
  );
}

function CheckoutPanel() {
  const [paid, setPaid] = useState(false);
  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-white mb-4">Secure Checkout</h3>
      <div className="space-y-3 mb-4">
        <div className="card-2 p-3">
          <div className="text-xs text-slate-500 font-medium mb-2">Booking: BK-2901</div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Aria Nova — 3hr Performance</span>
            <span className="text-white font-mono">$2,250</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Service fee (5%)</span>
            <span className="text-white font-mono">$112.50</span>
          </div>
          <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between font-bold">
            <span className="text-white">Advance Deposit (30%)</span>
            <span className="text-amber-400 font-mono">$697.75</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium mb-2">Payment Milestones</div>
          <div className="space-y-2">
            {[
              { label: 'Advance Deposit (30%)', amount: '$697.75', when: 'Due now', paid: false },
              { label: 'Mid-booking (40%)', amount: '$930.00', when: '7 days before event', paid: false },
              { label: 'Final Balance (30%)', amount: '$697.75', when: 'Post-event', paid: false },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-3 text-xs">
                <div className={`w-2 h-2 rounded-full ${m.paid ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                <span className="text-slate-300 flex-1">{m.label}</span>
                <span className="font-mono text-amber-400">{m.amount}</span>
                <span className="text-slate-500">{m.when}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <input className="input" placeholder="Card number" defaultValue="4242 4242 4242 4242" />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="MM / YY" defaultValue="09/28" />
            <input className="input" placeholder="CVV" defaultValue="•••" />
          </div>
        </div>
      </div>

      {!paid ? (
        <button className="btn-primary w-full flex items-center gap-2 justify-center py-3" onClick={() => setPaid(true)}>
          <Icon.CreditCard className="w-4 h-4" />
          Pay Advance $697.75
        </button>
      ) : (
        <div className="text-center animate-fade-in py-2">
          <Icon.CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-semibold mb-1">Payment Confirmed!</p>
          <p className="text-xs text-slate-500 mb-3">Booking BK-2901 is now active</p>
          <button className="btn-ghost text-xs flex items-center gap-1 mx-auto">
            <Icon.Download className="w-3.5 h-3.5" />
            Download Invoice PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookingChat() {
  const [activeTab, setActiveTab] = useState('chat');
  const [input, setInput] = useState('');
  const [showNegotiation, setShowNegotiation] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const tabs = ['chat', 'checkout', 'tracker', 'saved', 'invoices'];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab]);

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }} className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/stagelink-logo.png" alt="StageLink" className="h-9 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.35))' }} />
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === t ? 'bg-violet-500/15 text-violet-300' : 'text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'chat' && (
          <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-3 gap-6 h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
            {/* Contacts list */}
            <div className="card p-4 flex flex-col">
              <div className="relative mb-4">
                <Icon.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input pl-9 text-sm" placeholder="Search conversations..." />
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { name: 'Aria Nova', preview: 'October 18 is open! I\'ve just...', time: '2:26 PM', unread: 1, avatar: 'photo-1516450360452-9312f5e86fc7', active: true },
                  { name: 'DJ Neon Pulse', preview: 'Let me check my calendar for...', time: 'Yesterday', unread: 0, avatar: 'photo-1571266028243-e4733b0f0bb0', active: false },
                  { name: 'AudioVault Rentals', preview: 'The PA system will be delivered...', time: 'Oct 9', unread: 0, avatar: null, active: false },
                ].map(c => (
                  <div key={c.name} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${c.active ? 'bg-violet-500/10 border border-violet-500/20' : 'hover:bg-slate-800/50'}`}>
                    <div className="relative flex-shrink-0">
                      {c.avatar ? (
                        <img src={`https://images.unsplash.com/${c.avatar}?w=40&h=40&fit=crop`} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full gradient-amber flex items-center justify-center text-white font-bold text-sm">{c.name[0]}</div>
                      )}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${c.active ? 'text-violet-200' : 'text-white'}`}>{c.name}</span>
                        <span className="text-xs text-slate-500">{c.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.preview}</p>
                    </div>
                    {c.unread > 0 && (
                      <div className="w-5 h-5 rounded-full gradient-violet flex items-center justify-center text-white text-xs font-bold">{c.unread}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2 card flex flex-col">
              <div style={{ borderBottom: '1px solid var(--color-border)' }} className="p-4 flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=40&h=40&fit=crop" alt="Aria" className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-semibold text-white">Aria Nova</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online · Replies in ~10 mins
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button className="btn-ghost text-xs py-1.5 px-3">View Profile</button>
                </div>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto" style={{ minHeight: 300 }}>
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {m.from === 'other' && (
                      <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=28&h=28&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto" />
                    )}
                    <div className={m.from === 'user' ? 'chat-bubble-user' : 'chat-bubble-other'}>
                      {m.text}
                      <div className={`text-xs mt-1 ${m.from === 'user' ? 'text-violet-200 text-right' : 'text-slate-500'}`}>
                        {m.time} {m.from === 'user' && (m.read ? '✓✓' : '✓')}
                      </div>
                    </div>
                  </div>
                ))}
                {showNegotiation && (
                  <div className="flex justify-start gap-2">
                    <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=28&h=28&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto" />
                    <div className="max-w-xs w-full">
                      <NegotiationCard onClose={() => setShowNegotiation(false)} />
                    </div>
                  </div>
                )}
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=28&h=28&fit=crop" alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    <div className="chat-bubble-other flex gap-1 items-center py-3 px-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)' }} className="p-4 flex gap-3">
                <button className="text-slate-400 hover:text-white transition-colors"><Icon.Paperclip className="w-5 h-5" /></button>
                <input
                  className="input flex-1 text-sm"
                  placeholder="Type a message..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button className="btn-primary px-4 flex items-center gap-1" onClick={handleSend}>
                  <Icon.Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checkout' && (
          <div className="animate-slide-up max-w-lg">
            <CheckoutPanel />
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="animate-slide-up max-w-lg">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Booking Lifecycle</h1>
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-mono text-xs text-slate-500">Booking ID</div>
                  <div className="font-display font-bold text-white">BK-2901</div>
                </div>
                <span className="badge badge-amber">In-Negotiation</span>
              </div>
              <div className="space-y-0">
                {bookingSteps.map((step, i) => (
                  <div key={step.label}>
                    <div className="tracker-step">
                      <div className={`tracker-dot ${step.done ? (step.active ? 'bg-violet-500 glow-violet' : 'bg-emerald-500') : 'bg-slate-700 border-2 border-slate-600'}`} style={{ boxShadow: step.active ? '0 0 12px rgba(124,58,237,0.6)' : undefined }} />
                      <div className="flex-1 flex items-center justify-between">
                        <span className={`text-sm font-medium ${step.done ? (step.active ? 'text-violet-300' : 'text-white') : 'text-slate-500'}`}>{step.label}</span>
                        <span className="font-mono text-xs text-slate-500">{step.date}</span>
                      </div>
                    </div>
                    {i < bookingSteps.length - 1 && (
                      <div className="tracker-line ml-1.5" style={{ background: step.done ? 'var(--color-violet)' : 'var(--color-border)' }} />
                    )}
                  </div>
                ))}
              </div>
              <button className="btn-primary w-full mt-6" onClick={() => setActiveTab('checkout')}>
                Proceed to Payment →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="animate-slide-up">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Saved Items</h1>
            <div className="flex gap-2 mb-6 flex-wrap">
              {['All', 'Artists', 'Gigs', 'Equipment', 'Rental Packages', 'Venues'].map((cat, i) => (
                <button key={cat} className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${i === 0 ? 'bg-violet-500/10 border-violet-500 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { type: 'Artist', name: 'Aria Nova', detail: 'Jazz-Soul Vocalist · 4.9 ★', img: 'photo-1516450360452-9312f5e86fc7' },
                { type: 'Equipment', name: 'QSC K12.2 PA System', detail: 'AudioVault Rentals · $180/day', img: 'photo-1470225620780-dba8ba36b745' },
                { type: 'Gig', name: 'Soulful Elegance Package', detail: 'Aria Nova · 3hr set · $2,250', img: 'photo-1493225457124-a3eb161ffa5f' },
                { type: 'Venue', name: 'The Ebell of Los Angeles', detail: 'Capacity 800 · Koreatown · $4,500/day', img: 'photo-1511192336575-5a79af67a629' },
              ].map(item => (
                <div key={item.name} className="card p-4 flex items-center gap-4">
                  <img src={`https://images.unsplash.com/${item.img}?w=56&h=56&fit=crop`} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="badge badge-violet mb-1">{item.type}</span>
                    <div className="font-semibold text-white text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.detail}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="btn-primary text-xs py-1.5 px-3">Book</button>
                    <button className="text-xs text-slate-500 hover:text-rose-400 transition-colors">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="animate-slide-up">
            <h1 className="font-display text-2xl font-bold text-white mb-6">Invoices & Receipts</h1>
            <div className="space-y-3">
              {[
                { id: 'INV-20261008', booking: 'BK-2847 · Aria Nova · Corporate Gala', amount: '$2,250', date: 'Oct 8, 2026', status: 'Paid' },
                { id: 'INV-20260928', booking: 'BK-2790 · Luna Dance Co. · Wedding', amount: '$1,600', date: 'Sep 28, 2026', status: 'Paid' },
                { id: 'INV-20260915', booking: 'BK-2701 · DJ Neon Pulse · Birthday', amount: '$1,200', date: 'Sep 15, 2026', status: 'Paid' },
              ].map(inv => (
                <div key={inv.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl card-2 flex items-center justify-center flex-shrink-0">
                    <Icon.FileText className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-slate-500">{inv.id}</div>
                    <div className="text-sm font-medium text-white">{inv.booking}</div>
                    <div className="text-xs text-slate-500">{inv.date}</div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="font-mono font-bold text-amber-400">{inv.amount}</div>
                    <span className="badge badge-emerald">{inv.status}</span>
                  </div>
                  <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                    <Icon.Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
