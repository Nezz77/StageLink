import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import ArtistCollectionCard from './ArtistCollectionCard';
import BrowseArtistsPage from './BrowseArtistsPage';
import RentEquipmentPage from './RentEquipmentPage';
import CollectionDetailPage, { type CollectionListing } from './CollectionDetailPage';
import { Icon, Stars } from './Icons';
import { SwitchMode } from './SwitchMode';
import { FaFire } from 'react-icons/fa';
import { MdFavorite } from 'react-icons/md';
import { MorphingDiscoveryBar, type Category } from './watermelon/morphing-discovery-bar';
import { MotionCarousel } from './MotionCarousel';

const DISCOVERY_CATEGORIES: Category[] = [
  {
    id: 'popular',
    label: 'Popular',
    icon: <FaFire size={20} className="fill-current" />,
    activeColor: '#F9EBEF',
    activeTextColor: '#FF3B30',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: <MdFavorite size={20} className="fill-current" />,
    activeColor: '#F9EBEF',
    activeTextColor: '#FD2649',
  },
];

const trendingArtists = [
  { id: 1, name: 'Aria Nova', category: 'Solo Vocalist', genre: 'R&B / Soul', rating: 4.9, reviews: 312, price: '$450/hr', location: 'Los Angeles, CA', image: 'photo-1516450360452-9312f5e86fc7', bookings: 847, verified: true },
  { id: 2, name: 'The Midnight Collective', category: 'Live Band', genre: 'Jazz / Funk', rating: 4.8, reviews: 198, price: '$1,200/event', location: 'New York, NY', image: 'photo-1470225620780-dba8ba36b745', bookings: 523, verified: true },
  { id: 3, name: 'DJ Neon Pulse', category: 'DJ', genre: 'Electronic / House', rating: 4.7, reviews: 445, price: '$600/hr', location: 'Miami, FL', image: 'photo-1571266028243-e4733b0f0bb0', bookings: 1203, verified: true },
  { id: 4, name: 'Luna Dance Co.', category: 'Dance Troupe', genre: 'Contemporary', rating: 4.9, reviews: 87, price: '$800/event', location: 'Chicago, IL', image: 'photo-1504609813442-a8924e83f76e', bookings: 234, verified: true },
  { id: 5, name: 'Marco Strings', category: 'Solo Violinist', genre: 'Classical / Crossover', rating: 5.0, reviews: 63, price: '$350/hr', location: 'Boston, MA', image: 'photo-1493225457124-a3eb161ffa5f', bookings: 189, verified: true },
  { id: 6, name: 'Sunset Brass', category: 'Brass Quartet', genre: 'Wedding / Events', rating: 4.6, reviews: 271, price: '$950/event', location: 'Austin, TX', image: 'photo-1511192336575-5a79af67a629', bookings: 678, verified: true },
];

const priceBands = [
  { label: 'Budget', range: '$100 – $400/hr', icon: <Icon.Music className="w-8 h-8 text-amber-400" />, count: '2,400+ artists', color: 'from-amber-400/20 to-amber-500/5', border: 'hover:border-amber-500/50', glow: 'bg-amber-500/20' },
  { label: 'Mid-Range', range: '$400 – $1,000/hr', icon: <Icon.Mic className="w-8 h-8 text-emerald-400" />, count: '1,800+ artists', color: 'from-emerald-400/20 to-emerald-500/5', border: 'hover:border-emerald-500/50', glow: 'bg-emerald-500/20' },
  { label: 'Premium', range: '$1,000 – $3,000/event', icon: <Icon.Award className="w-8 h-8 text-violet-400" />, count: '640+ artists', color: 'from-violet-400/20 to-violet-500/5', border: 'hover:border-violet-500/50', glow: 'bg-violet-500/20' },
  { label: 'Enterprise', range: 'Custom quote', icon: <Icon.Globe className="w-8 h-8 text-blue-400" />, count: '120+ artists', color: 'from-blue-400/20 to-blue-500/5', border: 'hover:border-blue-500/50', glow: 'bg-blue-500/20' },
];

const stats = [
  { label: 'Artists on Platform', value: '12,400+' },
  { label: 'Events Booked', value: '89,200+' },
  { label: 'Cities Covered', value: '340+' },
  { label: 'Avg. Response Time', value: '< 2 hrs' },
];

export default function LandingPage({ onAuth, isDark, onThemeChange, isSplashLogoTransition, onReturnToDashboard }: {
  onAuth: (type: 'login' | 'register_customer' | 'register_artist' | 'register_renter') => void;
  isDark: boolean;
  onThemeChange: (isDark: boolean, event: ReactMouseEvent<HTMLButtonElement>) => void;
  isSplashLogoTransition: boolean;
  onReturnToDashboard?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'rent' | 'detail'>('home');
  const [selectedListing, setSelectedListing] = useState<CollectionListing | null>(null);
  const [listingOrigin, setListingOrigin] = useState<'browse' | 'rent'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Use absolute scrollY to trigger the animation instantly without being delayed by the nav bar height
  const { scrollY } = useScroll();
  // Gracefully fade in over the first 300px of scroll
  const textOpacity = useTransform(scrollY, [0, 50, 300], [0, 0, 1]);
  const textY = useTransform(scrollY, [0, 50, 300], [40, 40, 0]);
  const filters = ['All', 'Vocalist', 'Band', 'DJ', 'Dancer', 'Classical'];

  const openCollection = (listing: CollectionListing) => {
    setSelectedListing(listing);
    setListingOrigin(activeTab === 'rent' ? 'rent' : 'browse');
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const heroItem = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="landing-page min-h-screen relative bg-[#07090f]">
      {/* Fixed Background Video */}
      {activeTab === 'home' && (
        <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover opacity-60"
            src="/Stage-Link-Background.mp4"
          />
          {/* Gradient overlay to blend the bottom of the video into the background color */}
          <div className="landing-video-overlay absolute inset-0 bg-gradient-to-b from-transparent via-[#07090f]/50 to-[#07090f]"></div>
        </div>
      )}

      {/* Nav */}
      <motion.nav
        className="landing-nav sticky top-0 z-50"
        initial={isSplashLogoTransition ? false : { y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-nav-shell">
          <a href="#" className="landing-nav-brand" aria-label="StageLink home" onClick={event => { event.preventDefault(); setActiveTab('home'); }}>
            <motion.img layoutId="stagelink-logo" src="/stagelink-logo.png" alt="StageLink" className="h-10 w-auto object-contain" transition={{ layout: { type: 'spring', stiffness: 52, damping: 19, mass: 1.25 } }} style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.4))' }} />
          </a>
          <div className="landing-nav-center">
            <div className="landing-nav-links" aria-label="Main navigation">
              {([
                { id: 'home', label: 'How It Works' },
                { id: 'browse', label: 'Browse Artists' },
                { id: 'rent', label: 'Rent Equipment' },
              ] as const).map(item => (
                <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`landing-nav-link ${activeTab === item.id ? 'is-active' : ''}`}>
                  {activeTab === item.id && <motion.span layoutId="landing-nav-active" className="landing-nav-active" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="landing-nav-actions">
            <div className="landing-theme-control">
            <SwitchMode
              width={64}
              height={32}
              isDark={isDark}
              onChange={onThemeChange}
              darkColor="#111"
              lightColor="#F9F9F9"
              knobDarkColor="#1C1C1C"
              knobLightColor="#F3F3F7"
              borderDarkColor="#444"
              borderLightColor="#DDD"
            />
            </div>
            <button className="landing-nav-cta" onClick={onReturnToDashboard ?? (() => onAuth('login'))}>
              <span>{onReturnToDashboard ? 'Back to dashboard' : 'Log in'}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10" /></svg>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero — Scroll Linked Animation */}
            <div className="relative h-[200vh] w-full z-10">
              <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                  <div style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)', filter: 'blur(40px)' }} />
                  <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)', filter: 'blur(40px)' }} />
                </div>
                <motion.div
                  className="max-w-4xl mx-auto relative z-10 text-center px-6"
                  style={{ opacity: textOpacity, y: textY }}
                >
                  <h1 className="font-display text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                    Book the Perfect <span className="gradient-text">Performance</span><br />for Any Event
                  </h1>
                  <p className="text-slate-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                    Connect world-class performing artists with audiences that deserve them &#8212; rent premium event equipment, and create unforgettable live experiences.
                  </p>
                  <div className="flex justify-center mb-12">
                    <MorphingDiscoveryBar categories={DISCOVERY_CATEGORIES} />
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Stats */}
            <section style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }} className="py-8 px-6 relative z-10">
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map(s => (
                  <div key={s.label} className="text-center">
                    <div className="font-display text-2xl md:text-3xl font-bold text-white mb-1">{s.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Trending Artists */}
            <section className="py-16 px-6 relative z-10 bg-[#07090f]">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-white mb-1">Trending Artists</h2>
                    <p className="text-slate-500 text-sm">Most booked performers this month</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {filters.map(f => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${activeFilter === f ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row h-[500px] w-full gap-4">
                  {trendingArtists.slice(0, 5).map((artist, i) => (
                    <div key={artist.id} onClick={() => onAuth('login')} className="relative group overflow-hidden rounded-3xl flex-1 hover:flex-[4] transition-all duration-700 ease-in-out cursor-pointer shadow-lg border border-slate-800/50 hover:border-violet-500/50" style={{ animationDelay: `${i * 0.05}s` }}>
                      <img
                        src={`https://images.unsplash.com/${artist.image}?w=800&h=800&fit=crop&auto=format`}
                        alt={artist.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />

                      {/* Content (Visible on Hover) */}
                      <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                        <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                          <span className="badge badge-violet mb-3 inline-block">{artist.category}</span>
                          <div className="flex items-center gap-2 mb-1 overflow-hidden">
                            <h3 className="font-display text-2xl font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">{artist.name}</h3>
                            {artist.verified && <Icon.CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-300 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="flex items-center gap-1 shrink-0"><Icon.Star className="w-4 h-4 text-amber-400" /> {artist.rating}</span>
                            <span className="font-mono text-amber-400 font-bold shrink-0">{artist.price}</span>
                          </div>
                          <button className="btn-primary w-full text-sm shrink-0 whitespace-nowrap">View Profile & Book</button>
                        </div>
                      </div>

                      {/* Vertical Label (Visible when NOT hovered) */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:group-hover:opacity-0 transition-opacity duration-300 w-full px-2">
                        <div className="flex flex-col items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-slate-900/60 border border-slate-700/50 backdrop-blur-md flex items-center justify-center text-slate-300 shadow-md">
                            <Icon.Star className="w-4 h-4" />
                          </span>
                          <h3 className="font-display font-bold text-white text-sm md:text-base text-center drop-shadow-md line-clamp-2 w-full px-1">{artist.name}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>


            {/* Price Bands - Premium Redesign */}
            <section className="py-24 px-6 relative overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              {/* Background ambient glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-16">
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-violet-400 font-semibold tracking-widest uppercase text-sm mb-3 block"
                  >
                    Pricing Models
                  </motion.span>
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="font-display text-4xl md:text-5xl font-bold text-white mb-4"
                  >
                    Every Budget, Every Event
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400 text-lg max-w-2xl mx-auto"
                  >
                    Transparent pricing across all talent tiers, with no hidden fees.
                  </motion.p>
                </div>
                
                <div className="w-full">
                  <MotionCarousel 
                    options={{ loop: true }}
                    slides={priceBands.map((band, i) => (
                      <div 
                        key={band.label} 
                        className={`relative group rounded-3xl p-px bg-gradient-to-b from-slate-700/50 to-slate-900/50 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500 h-full`}
                      >
                        {/* Animated Glow on Hover */}
                        <div className={`absolute -inset-2 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 ${band.glow}`}></div>
                        
                        {/* Card Content */}
                        <div className={`relative h-full bg-slate-950 rounded-[23px] p-8 flex flex-col items-center text-center border border-transparent transition-colors duration-500 ${band.border}`}>
                          {/* Top Gradient Mesh */}
                          <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${band.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-t-[23px]`}></div>
                          
                          <div className="relative mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            {band.icon}
                          </div>
                          
                          <h3 className="font-display text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                            {band.label}
                          </h3>
                          
                          <div className="h-px w-12 bg-slate-800 my-4 group-hover:w-full group-hover:bg-slate-700 transition-all duration-500"></div>
                          
                          <div className="font-mono text-slate-300 font-medium mb-3 group-hover:text-white transition-colors">{band.range}</div>
                          <div className="text-sm text-slate-500 mt-auto">{band.count}</div>
                        </div>
                      </div>
                    ))}
                  />
                </div>
              </div>
            </section>

            {/* CTA Banner */}
            <section className="py-16 px-6 relative z-10 bg-[#07090f]">
              <div className="max-w-4xl mx-auto">
                <div className="card p-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(245,158,11,0.1))', borderColor: 'rgba(124,58,237,0.3)' }}>
                  <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: 160, height: 160, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', filter: 'blur(30px)' }} />
                  <img src="/stagelink-logo.png" alt="StageLink" className="w-32 h-auto object-contain mx-auto mb-4" />
                  <h2 className="font-display text-3xl font-bold text-white mb-3">Are You a Performer or Equipment Supplier?</h2>
                  <p className="text-slate-400 mb-8 max-w-lg mx-auto">Join thousands of artists and renters earning on StageLink. Set your own rates, manage bookings, and grow your brand.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button className="btn-primary flex items-center gap-2 justify-center" onClick={() => onAuth('register_artist')}>
                      <Icon.Mic className="w-4 h-4" />
                      Join as Artist
                    </button>
                    <button className="btn-ghost flex items-center gap-2 justify-center" onClick={() => onAuth('register_renter')}>
                      <Icon.Package className="w-4 h-4" />
                      Join as Equipment Renter
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--color-border)' }} className="py-8 px-6 relative z-10 bg-[#07090f]">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <img src="/stagelink-logo.png" alt="StageLink" className="h-8 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.3))' }} />
                </div>
                <div className="text-xs text-slate-600">© 2026 StageLink Technologies, Inc. All rights reserved.</div>
                <div className="flex gap-5 text-xs text-slate-600">
                  <span className="cursor-pointer hover:text-slate-400">Privacy</span>
                  <span className="cursor-pointer hover:text-slate-400">Terms</span>
                  <span className="cursor-pointer hover:text-slate-400">Support</span>
                </div>
              </div>
            </footer>
          </motion.div>
        )}

        {activeTab === 'browse' && (
          <BrowseArtistsPage key="browse" onOpenCollection={openCollection} />
        )}

        {activeTab === 'rent' && (
          <RentEquipmentPage key="rent" onOpenCollection={openCollection} />
        )}

        {activeTab === 'detail' && selectedListing && (
          <CollectionDetailPage
            key={`detail-${selectedListing.id}`}
            listing={selectedListing}
            onBack={() => setActiveTab(listingOrigin)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
