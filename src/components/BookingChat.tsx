import { Fragment, useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';
import { useReducedMotion } from 'motion/react';
import { GlassSurface } from './DashboardShell';
import '../booking-chat.css';
import PaymentCheckout from './PaymentCheckout';
import { useBooking } from '../lib/BookingContext';
import { amounts, bookingDetails } from '../lib/booking';

const initialMessages = [
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

function NegotiationCard({ onClose, onAccept, onCounter }: { onClose: () => void; onAccept: () => void; onCounter: (amount: string, note: string) => void }) {
  const [mode, setMode] = useState<'view' | 'counter' | 'accepted'>('view');
  const [amount, setAmount] = useState('2000');
  const [note, setNote] = useState('');
  return (
    <div className="bc-quote animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Icon.FileText className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">Your evening, arranged.</span>
        <span className="badge badge-violet ml-auto">{mode === 'accepted' ? 'Accepted' : 'Quotation'}</span>
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
          <button className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all" onClick={() => { setMode('accepted'); onAccept(); }}>
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
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><input aria-label="Counter offer amount" type="number" min="1" step="0.01" className="input pl-7 font-mono" value={amount} onChange={event => setAmount(event.target.value)} /></div>
          </div>
          <textarea aria-label="Counter offer note" className="input resize-none h-16 text-sm" placeholder="Optional note to Aria..." value={note} onChange={event => setNote(event.target.value)} />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 text-sm" onClick={() => setMode('view')}>Back</button>
            <button className="btn-primary flex-1 text-sm" disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0} onClick={() => { onCounter(amount, note); onClose(); }}>Send Counter</button>
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

function CheckoutTab({ onViewTracker }: { onViewTracker: () => void }) {
  const { booking, act } = useBooking();
  const { feeCents } = amounts(booking.quoteCents);
  return (
    <PaymentCheckout
      bookingId={bookingDetails.id}
      artist={bookingDetails.artist}
      event={bookingDetails.event}
      quoteCents={booking.quoteCents}
      feeCents={feeCents}
      onPaid={() => act({ type: 'pay', quoteVersion: booking.quoteVersion, totalCents: booking.quoteCents + feeCents })}
      onBack={() => {}}
      onViewBooking={onViewTracker}
    />
  );
}

type ChatMessage = { id: number; from: string; sender?: string; text: string; time: string; read: boolean };
const conversations = [
  { id: 'aria', name: 'Aria Nova', role: 'Jazz & soul vocalist', initials: 'AN', preview: 'Your custom quotation is ready.', time: '2:26 PM', image: 'photo-1516450360452-9312f5e86fc7' },
  { id: 'neon', name: 'DJ Neon Pulse', role: 'DJ & producer', initials: 'NP', preview: 'Let me check my calendar for you.', time: 'Yesterday', image: 'photo-1493225457124-a3eb161ffa5f' },
  { id: 'audiovault', name: 'AudioVault Rentals', role: 'Equipment partner', initials: 'AV', preview: 'The PA system will be delivered.', time: 'Oct 9', image: '' },
];
const tabLabels: Record<string, string> = { chat: 'Conversations', checkout: 'Checkout', tracker: 'Booking journey', saved: 'Saved collection', invoices: 'Invoices' };

export default function BookingChat({ onBack, initialTab = 'chat' }: { onBack: () => void; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeContact, setActiveContact] = useState('aria');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showNegotiation, setShowNegotiation] = useState(true);
  const [quoteAccepted, setQuoteAccepted] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [backdropPaused, setBackdropPaused] = useState(false);
  const [attachment, setAttachment] = useState('');
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({
    aria: initialMessages,
    neon: [{ id: 1, from: 'other', text: 'Let me check my calendar for you. What date did you have in mind?', time: 'Yesterday', read: true }],
    audiovault: [{ id: 1, from: 'other', text: 'The PA system will be delivered before your event. Let us know the venue access details.', time: 'Oct 9', read: true }],
  });
  const studioRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const contact = conversations.find(item => item.id === activeContact)!;
  const currentMessages = threads[activeContact];
  const tabs = ['chat', 'checkout', 'tracker', 'saved', 'invoices'];
  const completedStep = depositPaid ? 3 : quoteAccepted ? 2 : 1;
  // Small optical surfaces keep the real SVG refraction affordable. Text and
  // controls remain ordinary DOM; the upstream module refracts the backdrop.
  useEffect(() => {
    if (reduceMotion || !studioRef.current) return;
    const surfaces = studioRef.current.querySelectorAll<HTMLElement>(
      '.bc-thread-header, .bc-composer, .bc-tabs > button[aria-current], .bc-back, .bc-send'
    );
    const effects = Array.from(surfaces, element => window.liquidGlass(element, {
      scale: -78, chroma: 2, blur: 6, border: .1, fallbackBlur: 18,
    }));
    return () => effects.forEach(effect => effect.destroy());
  }, [activeTab, activeContact, reduceMotion]);
  const currentBookingSteps = bookingSteps.map((step, index) => ({ ...step, done: index <= completedStep, active: index === completedStep, date: index > 1 && index <= completedStep ? 'This session' : step.date }));
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
  }, [currentMessages.length, activeContact, activeTab]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (backdropPaused || reduceMotion) video.pause();
    else void video.play().catch(() => {});
  }, [backdropPaused, reduceMotion]);

  const appendMessage = (text: string) => {
    const message = { id: Date.now(), from: 'user', text, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), read: false };
    setThreads(previous => ({ ...previous, [activeContact]: [...previous[activeContact], message] }));
  };
  const handleSend = () => {
    if (!input.trim() && !attachment) return;
    appendMessage([input.trim(), attachment ? `Attachment selected: ${attachment} (demo — not uploaded)` : ''].filter(Boolean).join('\n'));
    setInput(''); setAttachment('');
    if (attachmentRef.current) attachmentRef.current.value = '';
  };
  const selectContact = (id: string) => { setActiveContact(id); setInput(''); setAttachment(''); setShowDetails(false); };

  return (
    <div ref={studioRef} className="bc-studio">
      <div className="bc-backdrop" aria-hidden="true"><video ref={videoRef} src="/Stage-Link-Background.mp4" autoPlay={!reduceMotion} muted loop playsInline preload="metadata" /><div /></div>
      <header className="bc-masthead">
        <div className="bc-brand"><img src="/stagelink-logo.png" alt="StageLink" /><span>BOOKING STUDIO</span></div>
        <div className="bc-top-actions"><button className="bc-icon-button" onClick={() => setBackdropPaused(value => !value)} aria-label={backdropPaused ? 'Play background video' : 'Pause background video'} disabled={!!reduceMotion}><Icon.Play className="w-3.5 h-3.5" /><span>{backdropPaused || reduceMotion ? 'Motion off' : 'Motion on'}</span></button><button className="bc-back" onClick={onBack}>← <span>Dashboard</span></button></div>
      </header>
      <div className="bc-page">
        <div className="bc-intro"><div><span className="bc-eyebrow">THE SPACE BETWEEN IDEA & ENCORE</span><h1>Let’s make <em>it happen.</em></h1></div><p>Good conversations.<br /><span>Unforgettable performances.</span></p></div>
        <nav className="bc-tabs" aria-label="Booking workspace">{tabs.map(t => <button key={t} aria-current={activeTab === t ? 'page' : undefined} onClick={() => setActiveTab(t)}>{tabLabels[t]}{t === 'chat' && <span>03</span>}</button>)}<span className="bc-demo"><i /> Demo workspace</span></nav>
        {activeTab === 'chat' && (
          <div className="bc-layout">
            <aside className="bc-inbox bc-pane" aria-label="Conversations">
              <div className="bc-panel-heading"><h2>Your circle</h2><span>03</span></div>
              <label className="bc-search"><Icon.Search className="w-4 h-4" /><input aria-label="Search conversations" placeholder="Find a conversation" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <div className="bc-inbox-label">RECENT CONVERSATIONS</div>
              <div className="bc-contacts">{conversations.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} className={`bc-contact ${activeContact === item.id ? 'is-selected' : ''}`} aria-pressed={activeContact === item.id} onClick={() => selectContact(item.id)}><span className="bc-avatar">{item.image ? <img src={`https://images.unsplash.com/${item.image}?w=100&h=100&fit=crop`} alt="" onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} /> : item.initials}</span><span className="bc-contact-copy"><span><strong>{item.name}</strong><small>{item.time}</small></span><span>{item.preview}</span></span></button>)}{!conversations.some(item => item.name.toLowerCase().includes(search.toLowerCase())) && <p className="bc-no-results">No conversations match “{search}”.</p>}</div>
              <div className="bc-inbox-note"><span className="bc-orbit" aria-hidden="true">✳</span><h3>Every great show<br />starts with a hello.</h3><p>Keep the details close.<br />Let the possibilities unfold.</p><span className="bc-eyebrow">PEOPLE · TALENT · EVENTS</span></div>
            </aside>
            <section className="bc-thread bc-pane" aria-label={`Conversation with ${contact.name}`}>
              <header className="bc-thread-header"><span className="bc-avatar">{contact.initials}</span><div><h2>{contact.name}<Icon.CheckCircle className="w-3.5 h-3.5" /></h2><p>{contact.role}</p></div><button className="bc-icon-button bc-details-button" onClick={() => setShowDetails(value => !value)} aria-expanded={showDetails}><Icon.FileText className="w-4 h-4" /><span>Details</span></button></header>
              <div className="bc-pinned"><Icon.Calendar className="w-3.5 h-3.5" /><span>{activeContact === 'aria' ? 'TechVentures Corporate Gala' : 'Event planning conversation'}</span>{activeContact === 'aria' && <small>OCT 18</small>}</div>
              <div key={activeContact} className="bc-messages" ref={scrollRef} role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions">
                <div className="bc-date-marker"><span>THE CONVERSATION SO FAR</span></div>
                {currentMessages.map((message, index) => <Fragment key={message.id}><div className={`bc-message ${message.from === 'user' ? 'is-mine' : ''}`}><div className="bc-message-label">{message.from === 'user' ? 'You' : contact.name}<time>{message.time}</time></div><div className="bc-bubble">{message.text}</div>{index === currentMessages.length - 1 && message.from === 'user' && <span className="bc-delivery">Added to this demo conversation ✓</span>}</div>{message.id === 5 && activeContact === 'aria' && showNegotiation && <NegotiationCard onClose={() => setShowNegotiation(false)} onAccept={() => { setQuoteAccepted(true); setActiveTab('checkout'); }} onCounter={(amount, note) => appendMessage(`Counter offer: $${Number(amount).toLocaleString()}.${note ? ' ' + note : ''}`)} />}</Fragment>)}
                
              </div>
              <form className="bc-composer" onSubmit={event => { event.preventDefault(); handleSend(); }}>
                {attachment && <div className="bc-attachment"><Icon.Paperclip className="w-3 h-3" /><span>{attachment} · local demo</span><button type="button" aria-label="Remove attachment" onClick={() => { setAttachment(''); if (attachmentRef.current) attachmentRef.current.value = ''; }}>×</button></div>}
                <div className="bc-compose-row"><textarea aria-label="Message" placeholder={`Message ${contact.name.split(' ')[0]}…`} rows={2} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); handleSend(); } }} /><button className="bc-send" type="submit" aria-label="Send message" disabled={!input.trim() && !attachment}><Icon.Send className="w-4 h-4" /></button></div>
                <div className="bc-compose-tools"><input ref={attachmentRef} type="file" className="sr-only" tabIndex={-1} aria-label="Choose attachment" onChange={event => setAttachment(event.target.files?.[0]?.name ?? '')} /><button type="button" onClick={() => attachmentRef.current?.click()}><Icon.Paperclip className="w-3.5 h-3.5" /> Add attachment</button><span>Enter to send · Shift + Enter for a new line</span></div>
              </form>
            </section>
            <aside className={`bc-event-column ${showDetails ? 'is-open' : ''}`} aria-label="Conversation details">
              <GlassSurface className="bc-event-pass"><div className="bc-eyebrow">{activeContact === 'aria' ? 'YOUR NEXT GREAT NIGHT' : 'IN YOUR CIRCLE'}</div><div className="bc-pass-top"><span>{activeContact === 'aria' ? '18' : contact.initials}</span><div>{activeContact === 'aria' ? <>OCTOBER<br />2026</> : <>STAGELINK<br />PARTNER</>}</div><Icon.Music className="w-5 h-5" /></div><h2>{activeContact === 'aria' ? 'TechVentures Corporate Gala' : contact.name}</h2><p>{activeContact === 'aria' ? 'Black tie. Jazz & soul. A night to remember.' : contact.role}</p><div className="bc-perforation" />{activeContact === 'aria' ? <><dl><div><dt>CURTAIN CALL</dt><dd>7:00 PM</dd></div><div><dt>THE AUDIENCE</dt><dd>250 guests</dd></div></dl><div className="bc-pass-footer"><span>BK—2901</span><span>{quoteAccepted ? 'CONFIRMED' : 'IN NEGOTIATION'}</span></div></> : <div className="bc-pass-footer"><span>EVENT PARTNER</span><span>DEMO</span></div>}</GlassSurface>
              {activeContact === 'aria' && <div className="bc-journey bc-pane"><div className="bc-panel-heading"><h2>From hello to encore</h2><span>0{completedStep + 1}/05</span></div><ol>{['Request sent','Fine-tuning the details','Booking confirmed','Deposit paid','Showtime'].map((step,index) => <li key={step} className={index <= completedStep ? 'is-done' : ''}><span>{index < completedStep ? '✓' : `0${index + 1}`}</span>{step}</li>)}</ol><button onClick={() => setActiveTab('tracker')}>View booking journey <span>↗</span></button></div>}
              <p className="bc-session-note"><Icon.Shield className="w-3.5 h-3.5" /> Messages stay in this demo session. Live delivery requires a connected chat service.</p>
            </aside>
          </div>
        )}
        {activeTab === 'checkout' && (
          <div className="animate-slide-up w-full pb-12">
            <CheckoutTab onViewTracker={() => setActiveTab('tracker')} />
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
                <span className="badge badge-amber">{depositPaid ? 'Deposit paid' : quoteAccepted ? 'Confirmed' : 'In-Negotiation'}</span>
              </div>
              <div className="space-y-0">
                {currentBookingSteps.map((step, i) => (
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
