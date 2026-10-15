import { useState, type ReactNode } from 'react';
import { ArrowUpRight, CalendarDays, Check, Clock3, CreditCard, Image, LayoutDashboard, MessageCircle, Music2, Package, Plus, Repeat, UserRound } from 'lucide-react';
import DashboardShell, { DashboardIntro, type DashboardNav } from './DashboardShell';
import { useBooking } from '../lib/BookingContext';
import { useDashboard } from '../lib/DashboardContext';
import { money, settlement } from '../lib/booking';
import { serviceFor } from '../lib/pipeline';
import type { WorkspaceSection } from './BookingWorkspace';
import ListingManager from './ListingManager';
import MemberProfile from './MemberProfile';
import PortfolioManager from './PortfolioManager';
import ProviderFinances from './ProviderFinances';
import { Badge, Empty, Panel, SearchField, Stats, requestDashboardNavigation } from './DashboardUI';

export type ProviderDashboardProps = { onGoToLanding?: () => void; roleControl?: ReactNode; onOpenWorkspace: (section?: WorkspaceSection, id?: string) => void };
export default function ProviderDashboard({ role, onGoToLanding, roleControl, onOpenWorkspace }: ProviderDashboardProps & { role: 'artist' | 'renter' }) {
  const { state } = useBooking(); const { state: dashboard } = useDashboard();
  const [tab, setTab] = useState('overview'), [newListing, setNewListing] = useState(false), [search, setSearch] = useState(''), [rentalFilter, setRentalFilter] = useState('active');
  const profile = dashboard.profiles[role], artist = role === 'artist';
  const bookings = state.bookings.filter(record => serviceFor(record.serviceId).role === role);
  const requests = bookings.filter(record => record.status === 'pending');
  const upcoming = bookings.filter(record => ['accepted', 'active'].includes(record.status)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const earnings = bookings.reduce((sum, record) => sum + settlement(record.ledger).paidOutCents, 0);
  const held = bookings.reduce((sum, record) => sum + settlement(record.ledger).heldCents, 0);
  const listings = dashboard.listings.filter(item => item.owner === role);
  const nav: DashboardNav[] = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'bookingdesk', icon: CalendarDays, label: 'Booking desk' },
    { id: 'requests', icon: Clock3, label: 'Requests', count: requests.length }, { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: artist ? 'gigs' : 'inventory', icon: artist ? Music2 : Package, label: artist ? 'My Gigs' : 'Inventory' },
    ...(!artist ? [{ id: 'rentals', icon: Repeat, label: 'Active Rentals' }] : []), { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    ...(artist ? [{ id: 'portfolio', icon: Image, label: 'Portfolio' }] : []), { id: 'earnings', icon: CreditCard, label: 'Earnings' }, { id: 'profile', icon: UserRound, label: 'Profile' },
  ];
  const navigate = (next: string) => requestDashboardNavigation(() => {
    if (['bookingdesk', 'messages', 'requests', 'calendar'].includes(next)) onOpenWorkspace(next === 'bookingdesk' ? 'bookings' : next === 'messages' ? 'chat' : next as WorkspaceSection);
    else { setTab(next); setNewListing(false); }
  });
  const rentals = bookings.filter(record => ['accepted', 'active', 'completed'].includes(record.status) && (rentalFilter === 'all' || (rentalFilter === 'active' ? record.status !== 'completed' : record.status === 'completed')) && `${record.event} ${record.id}`.toLowerCase().includes(search.toLowerCase()));
  return <DashboardShell role={role} controls={roleControl} navItems={nav} activeTab={tab} onNavigate={navigate} onGoToLanding={() => requestDashboardNavigation(() => onGoToLanding?.())} onOpenChat={() => navigate('messages')}>
    <div className="mg-page"><p className="mg-session-note">Demo workspace · Changes and saved drafts stay in this tab until refresh.</p>
      {tab === 'overview' && <><DashboardIntro eyebrow={artist ? 'YOUR ARTIST STUDIO' : 'RENTAL OPERATIONS'} title={artist ? 'The stage is' : 'Behind the'} emphasis={artist ? `yours, ${profile.name.split(' ')[0]}.` : 'great nights.'} description={artist ? 'Your next set, your next booking, and the work behind the music.' : 'Your equipment and events, ready for the next production.'} action={<button className="btn-primary" onClick={() => { setNewListing(true); setTab(artist ? 'gigs' : 'inventory'); }}><Plus size={16} />{artist ? 'Create a gig' : 'Add equipment'}</button>} />
        <section className="mg-provider-hero"><div><span className="sl-eyebrow">{artist ? 'ON THE BILL / ARTIST' : 'BACKSTAGE / RENTAL PARTNER'}</span><h2>{profile.name}</h2><p>{profile.specialty} · {profile.city}</p><div className="mg-actions"><button className="btn-ghost" onClick={() => setTab('profile')}>Edit profile<ArrowUpRight size={16} /></button><button className="btn-ghost" onClick={() => onOpenWorkspace('calendar')}>View calendar<CalendarDays size={16} /></button></div></div><div className="mg-hero-symbol" aria-hidden="true">{artist ? <Music2 /> : <Package />}<span>READY FOR<br />YOUR NEXT ENCORE</span></div></section>
        <Stats values={[{ label: 'Upcoming / active', value: upcoming.length }, { label: 'Requests to review', value: requests.length }, { label: 'Held by StageLink', value: money(held) }, { label: 'Transferred to you', value: money(earnings) }]} />
        <div className="mg-split"><Panel title="Next on your calendar" eyebrow="YOUR RUN OF SHOW" action={<button className="mg-text-link" onClick={() => onOpenWorkspace('bookings')}>All bookings ↗</button>}>{upcoming.length ? upcoming.slice(0, 4).map(record => <button className="mg-row mg-row-button" key={record.id} onClick={() => onOpenWorkspace('bookings', record.id)}><span className="mg-day"><strong>{new Date(`${record.date}T12:00:00`).getDate()}</strong><small>{new Date(`${record.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}</small></span><div><h3>{record.event}</h3><p>{record.start}–{record.end} · {record.venue}</p></div><Badge value={record.status} /><ArrowUpRight size={16} /></button>) : <Empty title="Room for your next booking.">Accepted requests appear here.</Empty>}</Panel>
        <Panel title="Waiting in the wings" eyebrow="REQUESTS & CATALOG">{requests.length ? requests.map(record => <article className="mg-request" key={record.id}><Badge value="pending">New request</Badge><h3>{record.event}</h3><p>{record.date} · {money(record.ledger.quoteCents)}</p><button className="btn-primary" onClick={() => onOpenWorkspace('requests', record.id)}>Review request<ArrowUpRight size={16} /></button></article>) : <p className="mg-muted"><Check size={16} /> You’re all caught up on booking requests.</p>}<div className="mg-rule" /><p className="mg-muted">{listings.filter(item => item.status === 'live').length} published listings · {listings.filter(item => item.status !== 'live').length} paused or servicing</p><button className="btn-ghost" onClick={() => setTab(artist ? 'gigs' : 'inventory')}>{artist ? 'Manage gigs' : 'Manage inventory'}</button></Panel></div>
      </>}
      {(tab === 'gigs' || tab === 'inventory') && <ListingManager owner={role} initiallyNew={newListing} />}
      {tab === 'portfolio' && <PortfolioManager />}
      {tab === 'profile' && <MemberProfile />}
      {tab === 'earnings' && <ProviderFinances onPayment={id => onOpenWorkspace('payments', id)} />}
      {tab === 'rentals' && <><DashboardIntro eyebrow="EQUIPMENT / OUT IN THE WORLD" title="Keep every" emphasis="production moving." description="Track accepted rentals, coordinate handover and report completion from the linked booking." /><div className="mg-toolbar"><SearchField value={search} onChange={setSearch} label="Search rentals" /><label className="mg-filter">Rental status<select aria-label="Rental status" value={rentalFilter} onChange={event => setRentalFilter(event.target.value)}><option value="active">Upcoming & active</option><option value="completed">Completed</option><option value="all">All rentals</option></select></label></div><Panel title="Your rental schedule">{rentals.length ? rentals.map(record => <article className="mg-row" key={record.id}><Package size={24} /><div><Badge value={record.status} /><h3>{record.event}</h3><p>{serviceFor(record.serviceId).name} · {record.date} · {record.start}–{record.end}</p><p>{record.venue}</p></div><strong>{money(record.ledger.quoteCents)}</strong><button className="btn-primary" onClick={() => onOpenWorkspace('bookings', record.id)}>Manage rental<ArrowUpRight size={15} /></button></article>) : <Empty title="No rentals match this view.">Accepted equipment bookings appear here.</Empty>}</Panel></>}
    </div>
  </DashboardShell>;
}
