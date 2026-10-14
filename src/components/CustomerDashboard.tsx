import { useState } from 'react';
import { Icon } from './Icons';
import DashboardShell, { DashboardIntro, GlassSurface } from './DashboardShell';
import BrowseArtistsPage from './BrowseArtistsPage';
import CollectionDetailPage, { type CollectionListing } from './CollectionDetailPage';

const trendingArtists = [
  { id: 1, name: 'Aria Nova', category: 'Solo Vocalist', rating: 4.9, price: '$450/hr', image: 'photo-1516450360452-9312f5e86fc7', verified: true },
  { id: 2, name: 'The Midnight Collective', category: 'Live Band', rating: 4.8, price: '$1,200/event', image: 'photo-1470225620780-dba8ba36b745', verified: true },
  { id: 3, name: 'DJ Neon Pulse', category: 'DJ', rating: 4.7, price: '$600/hr', image: 'photo-1493225457124-a3eb161ffa5f', verified: true },
  { id: 4, name: 'Luna Dance Co.', category: 'Dance Troupe', rating: 4.9, price: '$800/event', image: 'photo-1504609813442-a8924e83f76e', verified: true },
  { id: 5, name: 'Marco Strings', category: 'Solo Violinist', rating: 5.0, price: '$350/hr', image: 'photo-1493225457124-a3eb161ffa5f', verified: true },
];

const recommendedArtists = [
  { id: 6, name: 'Sunset Brass', category: 'Brass Quartet', rating: 4.6, price: '$950/event', image: 'photo-1511192336575-5a79af67a629', verified: true },
  { id: 7, name: 'Crystal Voices', category: 'Acapella Group', rating: 4.9, price: '$700/event', image: 'photo-1516450360452-9312f5e86fc7', verified: false },
  { id: 8, name: 'Electric Dreams', category: 'Synth Pop Duo', rating: 4.8, price: '$550/hr', image: 'photo-1493225457124-a3eb161ffa5f', verified: true },
  { id: 9, name: 'The Jazz Cats', category: 'Jazz Trio', rating: 4.7, price: '$800/event', image: 'photo-1470225620780-dba8ba36b745', verified: true },
];

type CustomerTab = 'home' | 'saved' | 'booking' | 'profile' | 'browse';
const navItems = [
  { id: 'home', label: 'Discover', icon: Icon.Home },
  { id: 'saved', label: 'Saved artists', icon: Icon.Heart },
  { id: 'booking', label: 'My bookings', icon: Icon.Calendar },
  { id: 'payments', label: 'Payments', icon: Icon.DollarSign },
  { id: 'messages', label: 'Messages', icon: Icon.MessageCircle },
  { id: 'profile', label: 'My profile', icon: Icon.User },
];

export default function CustomerDashboard({ onOpenChat, onOpenBooking, onOpenPayments, onGoToLanding }: { onOpenChat?: () => void, onOpenPayments?: () => void, onOpenBooking?: () => void, onGoToLanding?: () => void }) {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [collection, setCollection] = useState<CollectionListing | null>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState({ name: 'Jordan Rivera', email: 'jordan.rivera@example.com', city: 'Los Angeles, CA' });
  const navigate = (tab: string) => { if (tab === 'booking') onOpenBooking?.(); else if (tab === 'payments') onOpenPayments?.(); else if (tab === 'messages') onOpenChat?.(); else setActiveTab(tab as CustomerTab); };
  const toggleSaved = (id: number) => setSavedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  const artistCard = (artist: typeof recommendedArtists[number], index: number) => (
    <article className="card sl-talent-card" key={artist.id}>
      <div className="sl-talent-photo">
        <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} loading="lazy" src={`https://images.unsplash.com/${artist.image}?w=500&h=500&fit=crop&auto=format`} alt={artist.name} />
        <span className="sl-talent-number">SELECT / 0{index + 1}</span>
        <button className="sl-save-button" aria-label={`${savedIds.includes(artist.id) ? 'Unsave' : 'Save'} ${artist.name}`} aria-pressed={savedIds.includes(artist.id)} onClick={() => toggleSaved(artist.id)}><Icon.Heart filled={savedIds.includes(artist.id)} /></button>
      </div>
      <div className="sl-talent-details">
        <div className="sl-talent-meta"><span>{artist.category}</span><span>★ {artist.rating.toFixed(1)}</span></div>
        <h3>{artist.name}</h3>
        <div className="sl-talent-footer"><span>{artist.price}</span><button className="btn-ghost" onClick={() => setActiveTab('browse')}>Explore ↗</button></div>
      </div>
    </article>
  );

  return <DashboardShell role="customer" navItems={navItems} activeTab={activeTab} onNavigate={navigate} onGoToLanding={onGoToLanding} onOpenChat={onOpenChat}>
    <div key={activeTab} className="animate-slide-up">
      {activeTab === 'home' && <>
        <DashboardIntro eyebrow="YOUR BACKSTAGE PASS" title="Good evening," emphasis="Jordan." description="A little inspiration. A little planning. An unforgettable night." action={<button className="btn-ghost sl-action" onClick={onOpenBooking}><Icon.Calendar className="w-4 h-4" /> My bookings</button>} />
        <section className="sl-discovery-hero" aria-label="Discover your next performer">
          <div><div className="sl-eyebrow">THE NIGHT STARTS WITH YOU</div><h2>Find your<br /><em>main character.</em></h2><p>From intimate sets to full-stage spectacles. Discover the talent that makes your event feel like yours.</p><button className="btn-primary sl-action" onClick={() => setActiveTab('browse')}><Icon.Search className="w-4 h-4" /> Find a performer <span>↗</span></button></div>
          <GlassSurface className="sl-event-ticket"><div className="sl-eyebrow">YOUR NEXT GREAT NIGHT</div><h3>One stage.<br />Endless possibilities.</h3><p>Live music, movement, and a room full of moments worth keeping.</p><div className="sl-ticket-bottom"><span>ADMIT ONE<br />YOUR IMAGINATION</span><Icon.Music /></div></GlassSurface>
        </section>
        <section aria-labelledby="curated-title"><div className="sl-section-heading"><div><h2 id="curated-title">In the spotlight</h2><p>A handpicked lineup for your next occasion.</p></div><button className="sl-text-link" onClick={() => setActiveTab('browse')}>All artists <span>↗</span></button></div><div className="sl-artist-grid">{recommendedArtists.map(artistCard)}</div></section>
        <section aria-labelledby="lineup-title"><div className="sl-section-heading"><div><h2 id="lineup-title">Your next headliner</h2><p>Meet the artists making a little noise.</p></div><span className="sl-eyebrow">THE SHORTLIST / 05</span></div><div className="sl-lineup">{trendingArtists.map((artist, index) => <button className="sl-lineup-item" key={artist.id} onClick={() => setActiveTab('browse')}><span>0{index + 1}</span><img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} loading="lazy" src={`https://images.unsplash.com/${artist.image}?w=120&h=120&fit=crop&auto=format`} alt="" /><span><strong>{artist.name}</strong><small>{artist.category} · ★ {artist.rating}</small></span><span>↗</span></button>)}</div></section>
      </>}
      {activeTab === 'saved' && <>
        <DashboardIntro eyebrow="YOUR PERSONAL LINEUP" title="Keep them" emphasis="on the list." description={`${savedIds.length} saved artists. Your next great lineup starts with a shortlist.`} />
        {savedIds.length ? <div className="sl-artist-grid">{recommendedArtists.filter(artist => savedIds.includes(artist.id)).map(artistCard)}</div> : <div className="card sl-empty-state"><Icon.Heart /><h2>A little room for favorites.</h2><p>Tap the heart on an artist in Discover to keep them here for your next event.</p><button className="btn-primary" onClick={() => setActiveTab('home')}>Discover artists ↗</button></div>}
      </>}
      {activeTab === 'profile' && <>
        <DashboardIntro eyebrow="THE PERSON BEHIND THE EVENT" title="Make it" emphasis="personal." description="The details that help artists get to know you." />
        <form className="card p-6 max-w-2xl" onSubmit={event => { event.preventDefault(); setProfileSaved(true); }}>
          {profileSaved && <p role="status" className="sl-feedback">Profile updated for this demo session.</p>}
          <div className="space-y-5">{([['name', 'Full name'], ['email', 'Email'], ['city', 'City']] as const).map(([key,label]) => <label className="block text-sm text-slate-400" key={key}>{label}<input className="input mt-2" type={key === 'email' ? 'email' : 'text'} required value={profile[key]} onChange={event => { setProfileSaved(false); setProfile({ ...profile, [key]: event.target.value }); }} /></label>)}<button className="btn-primary" type="submit">Save profile ↗</button></div>
        </form>
      </>}
      {activeTab === 'browse' && <><button className="btn-ghost mb-6" onClick={() => setActiveTab('home')}>← Back to Discover</button>{collection ? <CollectionDetailPage listing={collection} onBack={() => setCollection(null)} /> : <BrowseArtistsPage onOpenCollection={setCollection} />}</>}
    </div>
  </DashboardShell>;
}
