import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon, Stars } from './Icons';
import BrowseArtistsPage from './BrowseArtistsPage';
import BookingPaymentStatus from './BookingPaymentStatus';

const trendingArtists = [
  { id: 1, name: 'Aria Nova', category: 'Solo Vocalist', rating: 4.9, price: '$450/hr', image: 'photo-1516450360452-9312f5e86fc7', verified: true },
  { id: 2, name: 'The Midnight Collective', category: 'Live Band', rating: 4.8, price: '$1,200/event', image: 'photo-1470225620780-dba8ba36b745', verified: true },
  { id: 3, name: 'DJ Neon Pulse', category: 'DJ', rating: 4.7, price: '$600/hr', image: 'photo-1571266028243-e4733b0f0bb0', verified: true },
  { id: 4, name: 'Luna Dance Co.', category: 'Dance Troupe', rating: 4.9, price: '$800/event', image: 'photo-1504609813442-a8924e83f76e', verified: true },
  { id: 5, name: 'Marco Strings', category: 'Solo Violinist', rating: 5.0, price: '$350/hr', image: 'photo-1493225457124-a3eb161ffa5f', verified: true },
];

const recommendedArtists = [
  { id: 6, name: 'Sunset Brass', category: 'Brass Quartet', rating: 4.6, price: '$950/event', image: 'photo-1511192336575-5a79af67a629', verified: true },
  { id: 7, name: 'Crystal Voices', category: 'Acapella Group', rating: 4.9, price: '$700/event', image: 'photo-1516450360452-9312f5e86fc7', verified: false },
  { id: 8, name: 'Electric Dreams', category: 'Synth Pop Duo', rating: 4.8, price: '$550/hr', image: 'photo-1571266028243-e4733b0f0bb0', verified: true },
  { id: 9, name: 'The Jazz Cats', category: 'Jazz Trio', rating: 4.7, price: '$800/event', image: 'photo-1470225620780-dba8ba36b745', verified: true },
];

export default function CustomerDashboard({ onOpenBooking }: { onOpenBooking: () => void }) {
  const [activeTab, setActiveTab] = useState<'home' | 'saved' | 'booking' | 'profile' | 'browse'>('home');

  if (activeTab === 'browse') {
    return (
      <div className="bg-[#07090f] min-h-screen">
        <BrowseArtistsPage />
        <button 
          onClick={() => setActiveTab('home')} 
          className="fixed bottom-6 left-6 btn-primary rounded-full px-6 py-3 z-50 shadow-xl"
        >
          <Icon.ChevronLeft className="w-5 h-5 inline mr-2" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#07090f] overflow-x-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07090f]/80 to-[#07090f]"></div>
        </div>
      )}

      {/* Nav */}
      <motion.nav
        className="sticky top-0 z-50 app-header bg-[#07090f]/80 backdrop-blur-md border-b border-slate-800"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/stagelink-logo.png" alt="StageLink" className="h-10 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.4))' }} />
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['home', 'saved', 'booking', 'profile'].map(tab => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-sm font-semibold tracking-wider uppercase cursor-pointer transition-all ${
                  activeTab === tab 
                    ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:scale-105 transition-transform border-2 border-white/10">JR</div>
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
            className="relative z-10"
          >
            {/* Hero Section */}
            <div className="pt-24 pb-16 px-6 text-center max-w-4xl mx-auto">
              <h1 className="font-display text-5xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-2xl">
                Good evening, Jordan 👋
              </h1>
              <p className="text-slate-300 text-lg md:text-xl font-medium drop-shadow-lg">
                Discover your next big performer and track your active bookings.
              </p>
            </div>

            {/* Recommended Artists Section */}
            <section className="py-12 px-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-white mb-1">Recommended for You</h2>
                    <p className="text-slate-500 text-sm">Curated picks based on your recent searches</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recommendedArtists.map((artist, i) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="card overflow-hidden group cursor-pointer hover:border-violet-500/40 transition-all bg-slate-900/50 backdrop-blur-md border-slate-800 hover:-translate-y-1 shadow-lg"
                    >
                      <div className="h-48 relative overflow-hidden">
                        <img src={`https://images.unsplash.com/${artist.image}?w=400&h=300&fit=crop`} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div style={{ background: 'linear-gradient(to top, rgba(7,9,15,0.95), transparent)' }} className="absolute inset-0" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="badge badge-violet text-[10px] py-0.5">{artist.category}</span>
                            <div className="flex items-center gap-1"><Stars rating={Math.floor(artist.rating)} /></div>
                          </div>
                          <div className="font-display font-bold text-white text-lg leading-tight truncate">{artist.name}</div>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between bg-[#0b0e17]">
                        <span className="font-mono text-amber-400 text-sm font-bold">{artist.price}</span>
                        <button className="btn-primary text-xs py-1.5 px-4" onClick={() => setActiveTab('browse')}>Book</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Available Artists Section */}
            <section className="py-12 px-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-white mb-1">Available Artists</h2>
                    <p className="text-slate-500 text-sm">Explore our trending talent pool</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row h-[400px] w-full gap-4">
                  {trendingArtists.map((artist, i) => (
                    <div key={artist.id} onClick={() => setActiveTab('browse')} className="relative group overflow-hidden rounded-3xl flex-1 hover:flex-[3] transition-all duration-700 ease-in-out cursor-pointer shadow-lg border border-slate-800/50 hover:border-violet-500/50">
                      <img
                        src={`https://images.unsplash.com/${artist.image}?w=800&h=800&fit=crop&auto=format`}
                        alt={artist.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />

                      {/* Content (Visible on Hover) */}
                      <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                        <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                          <span className="badge badge-violet mb-2 inline-block text-xs">{artist.category}</span>
                          <div className="flex items-center gap-2 mb-1 overflow-hidden">
                            <h3 className="font-display text-xl font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">{artist.name}</h3>
                            {artist.verified && <Icon.CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-300 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="flex items-center gap-1 shrink-0"><Icon.Star className="w-4 h-4 text-amber-400" /> {artist.rating}</span>
                            <span className="font-mono text-amber-400 font-bold shrink-0">{artist.price}</span>
                          </div>
                          <button className="btn-primary w-full text-sm shrink-0 whitespace-nowrap">View Profile</button>
                        </div>
                      </div>

                      {/* Vertical Label (Visible when NOT hovered) */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:group-hover:opacity-0 transition-opacity duration-300 w-full px-2">
                        <div className="flex flex-col items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700/50 backdrop-blur-md flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
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

            {/* Explore More Button */}
            <div className="flex justify-center pb-24 pt-8 relative z-10">
              <button 
                onClick={() => setActiveTab('browse')}
                className="btn-primary px-10 py-5 text-lg font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)] transition-all hover:scale-105 hover:-translate-y-1"
              >
                <Icon.Search className="w-6 h-6" />
                Explore More Artists
              </button>
            </div>
          </motion.div>
        )}

        {/* Other Tabs */}
        {activeTab === 'booking' && <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 pb-32"><h1 className="mb-6 font-display text-3xl text-white">My booking</h1><BookingPaymentStatus onPay={onOpenBooking} /><button onClick={onOpenBooking} className="btn-ghost mt-4">Open booking & quotation →</button></div>}
        {activeTab !== 'home' && activeTab !== 'booking' && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-6 py-12 relative z-10"
          >
             <h1 className="font-display text-4xl font-bold text-white capitalize mb-8">{activeTab}</h1>
             <div className="card p-12 text-center border-slate-800 bg-slate-900/50 backdrop-blur-sm">
               <Icon.LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
               <h3 className="text-xl text-white font-medium mb-2">Coming Soon</h3>
               <p className="text-slate-400">The {activeTab} section is currently under development.</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
