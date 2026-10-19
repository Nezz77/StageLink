import { useState, type ReactNode } from 'react';
import SavedItems from './SavedItems';
import { Package, LifeBuoy } from 'lucide-react';
import { collectionsFor } from '../lib/catalogPresentation';
import { money } from '../lib/booking';
import { serviceIdFor } from '../lib/catalog';
import { useBooking } from '../lib/BookingContext';
import CasePortal from './CasePortal';
import RentEquipmentPage from './RentEquipmentPage';
import { Icon } from './Icons';
import { useDashboard } from '../lib/DashboardContext';
import MemberProfile from './MemberProfile';
import { requestDashboardNavigation } from './DashboardUI';
import DashboardShell, { DashboardIntro, GlassSurface } from './DashboardShell';
import BrowseArtistsPage from './BrowseArtistsPage';
import CollectionDetailPage, { type CollectionListing } from './CollectionDetailPage';

type CustomerTab = 'home' | 'saved' | 'booking' | 'profile' | 'browse' | 'equipment' | 'support';
type SpotlightListing = {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: string;
  image: string;
  collection: CollectionListing;
};
const navItems = [
  { id: 'home', label: 'Discover', icon: Icon.Home },
  { id: 'saved', label: 'Saved items', icon: Icon.Heart },
  { id: 'booking', label: 'My bookings', icon: Icon.Calendar },
  { id: 'payments', label: 'Payments', icon: Icon.DollarSign },
  { id: 'messages', label: 'Messages', icon: Icon.MessageCircle },
  { id: 'profile', label: 'My profile', icon: Icon.User },
  { id: 'equipment', label: 'Equipment', icon: Package },
  { id: 'support', label: 'Help & disputes', icon: LifeBuoy },
];

export default function CustomerDashboard({ onOpenChat, onOpenBooking, onOpenPayments, onGoToLanding, roleControl }: { roleControl?: ReactNode; onOpenChat?: () => void, onOpenPayments?: () => void, onOpenBooking?: () => void, onGoToLanding?: () => void }) {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [collection, setCollection] = useState<CollectionListing | null>(null);
  const { state: dashboard, dispatch } = useDashboard();
  const { state: bookings } = useBooking();
  const savedIds = dashboard.savedListings;
  const recommendedArtists = collectionsFor(dashboard, 'artist').map((collection, index) => {
    const item = dashboard.listings.find(item => item.id === collection.catalogId)!;
    const profile = dashboard.profiles[item.owner];
    const reviews = bookings.bookings.filter(record => record.serviceId === serviceIdFor(item.id) && record.review);
    const photos = ['photo-1511192336575-5a79af67a629','photo-1516450360452-9312f5e86fc7','photo-1598488035139-bdbb2231ce04','photo-1492684223066-81342ee5ff30'];
    return { id:item.id, name:profile.name, category:item.title, rating:reviews.length ? reviews.reduce((sum, record)=>sum+record.review!.rating,0)/reviews.length : 0, price:`${money(Number(item.price)*100)}/${item.unit}`, image:photos[index%photos.length], collection };
  });
  const featuredEquipment: SpotlightListing[] = collectionsFor(dashboard, 'equipment').slice(0, 3).map((collection, index) => {
    const item = dashboard.listings.find(item => item.id === collection.catalogId)!;
    const profile = dashboard.profiles[item.owner];
    const reviews = bookings.bookings.filter(record => record.serviceId === serviceIdFor(item.id) && record.review);
    const photos = ['photo-1598488035139-bdbb2231ce04', 'photo-1470225620780-dba8ba36b745', 'photo-1514525253161-7a46d19cd819'];
    return {
      id: item.id,
      name: profile.name,
      category: item.title,
      rating: reviews.length ? reviews.reduce((sum, record) => sum + record.review!.rating, 0) / reviews.length : 0,
      price: `${money(Number(item.price) * 100)}/${item.unit}`,
      image: photos[index],
      collection,
    };
  });
  const trendingArtists = recommendedArtists;
  const openCollection = (listing: CollectionListing) => { setCollection(listing); setActiveTab(listing.type === 'artist' ? 'browse' : 'equipment'); };
  const navigate = (tab: string) => requestDashboardNavigation(() => { if (tab === 'booking') onOpenBooking?.(); else if (tab === 'payments') onOpenPayments?.(); else if (tab === 'messages') onOpenChat?.(); else { setActiveTab(tab as CustomerTab); setCollection(null); } });
  const toggleSaved = (id: string) => dispatch({ type: 'save_listing', id });
  const spotlightCard = (artist: SpotlightListing, index: number) => (
    <article className="card sl-talent-card" key={artist.id}>
      <div className="sl-talent-photo">
        <img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} loading="lazy" src={`https://images.unsplash.com/${artist.image}?w=500&h=500&fit=crop&auto=format`} alt={artist.name} />
        <span className="sl-talent-number">SELECT / 0{index + 1}</span>
        {<button className="sl-save-button" aria-label={`${savedIds.includes(artist.id) ? 'Unsave' : 'Save'} ${artist.category}`} aria-pressed={savedIds.includes(artist.id)} onClick={() => toggleSaved(artist.id)}><Icon.Heart filled={savedIds.includes(artist.id)} /></button>}
      </div>
      <div className="sl-talent-details">
        <div className="sl-talent-meta"><span>{artist.category}</span><span>{artist.rating ? `★ ${artist.rating.toFixed(1)}` : 'New'}</span></div>
        <h3>{artist.name}</h3>
        <div className="sl-talent-footer"><span>{artist.price}</span><button className="btn-ghost" onClick={() => openCollection(artist.collection)}>Explore ↗</button></div>
      </div>
    </article>
  );

  return <DashboardShell controls={roleControl} role="customer" navItems={navItems} activeTab={activeTab} onNavigate={navigate} onGoToLanding={() => requestDashboardNavigation(() => onGoToLanding?.())} onOpenChat={() => navigate('messages')}>
    <div key={activeTab} className="animate-slide-up">
      {activeTab === 'home' && <>
        <DashboardIntro eyebrow="YOUR BACKSTAGE PASS" title="Good evening," emphasis={`${dashboard.profiles.customer.name.split(' ')[0]}.`} description="A little inspiration. A little planning. An unforgettable night." action={<button className="btn-ghost sl-action" onClick={onOpenBooking}><Icon.Calendar className="w-4 h-4" /> My bookings</button>} />
        <section className="sl-discovery-hero" aria-label="Discover your next performer">
          <div><div className="sl-eyebrow">THE NIGHT STARTS WITH YOU</div><h2>Find your<br /><em>main character.</em></h2><p>From intimate sets to full-stage spectacles. Discover the talent that makes your event feel like yours.</p><button className="btn-primary sl-action" onClick={() => setActiveTab('browse')}><Icon.Search className="w-4 h-4" /> Find a performer <span>↗</span></button></div>
          <GlassSurface className="sl-event-ticket"><div className="sl-eyebrow">YOUR NEXT GREAT NIGHT</div><h3>One stage.<br />Endless possibilities.</h3><p>Live music, movement, and a room full of moments worth keeping.</p><div className="sl-ticket-bottom"><span>ADMIT ONE<br />YOUR IMAGINATION</span><Icon.Music /></div></GlassSurface>
        </section>
        <section aria-labelledby="curated-title"><div className="sl-section-heading"><div><h2 id="curated-title">In the spotlight</h2><p>A handpicked lineup for your next occasion.</p></div></div><div className="sl-artist-grid sl-featured-grid">{recommendedArtists.slice(0, 3).map(spotlightCard)}</div><div className="sl-section-action"><button className="btn-ghost sl-action" onClick={() => navigate('browse')}>Browse all artists <span>↗</span></button></div></section>
        <section aria-labelledby="equipment-title"><div className="sl-section-heading"><div><h2 id="equipment-title">Equipment for your event</h2><p>A few essentials from our rental partners.</p></div></div><div className="sl-artist-grid sl-featured-grid">{featuredEquipment.map((item, index) => spotlightCard(item, index))}</div><div className="sl-section-action"><button className="btn-ghost sl-action" onClick={() => navigate('equipment')}>Browse all equipment <span>↗</span></button></div></section>
        <section aria-labelledby="lineup-title"><div className="sl-section-heading"><div><h2 id="lineup-title">Your next headliner</h2><p>Meet the artists making a little noise.</p></div><span className="sl-eyebrow">THE SHORTLIST / {String(trendingArtists.length).padStart(2,'0')}</span></div><div className="sl-lineup">{trendingArtists.map((artist, index) => <button className="sl-lineup-item" key={artist.id} onClick={() => openCollection(artist.collection)}><span>0{index + 1}</span><img onError={event => { event.currentTarget.src = '/dashboard-stage-fallback.svg'; }} loading="lazy" src={`https://images.unsplash.com/${artist.image}?w=120&h=120&fit=crop&auto=format`} alt="" /><span><strong>{artist.name}</strong><small>{artist.category}{artist.rating ? ` · ★ ${artist.rating.toFixed(1)}` : ''}</small></span><span>↗</span></button>)}</div></section>
      </>}
      {activeTab === 'saved' && <SavedItems onOpen={openCollection} onBrowse={() => navigate('browse')} />}
      {activeTab === 'support' && <div className="mg-page"><CasePortal mode="support" /></div>}
      {activeTab === 'equipment' && <><button className="btn-ghost sl-collection-back mb-6" onClick={() => navigate('home')}>← Back to Discover</button>{collection ? <CollectionDetailPage listing={collection} onBack={() => setCollection(null)} /> : <RentEquipmentPage onOpenCollection={setCollection} />}</>}
      {activeTab === 'profile' && <MemberProfile />}
      {activeTab === 'browse' && <><button className="btn-ghost sl-collection-back mb-6" onClick={() => navigate('home')}>← Back to Discover</button>{collection ? <CollectionDetailPage listing={collection} onBack={() => setCollection(null)} /> : <BrowseArtistsPage onOpenCollection={setCollection} />}</>}
    </div>
  </DashboardShell>;
}
