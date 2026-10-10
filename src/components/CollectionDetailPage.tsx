import { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Icon, Stars } from './Icons';

export interface CollectionListing {
  id: number;
  name: string;
  date: string;
  images: string[];
  type: 'artist' | 'equipment';
}

// ─── Static data keyed by listing type ───────────────────────────────────────

const ARTIST_DATA = {
  genre: 'R&B / Soul · Jazz',
  location: 'Los Angeles, CA',
  rating: 4.9,
  reviewCount: 312,
  bookings: 847,
  responseTime: '< 2 hrs',
  price: '$450 / hr',
  verified: true,
  memberSince: '2021',
  bio: `A vocalist whose voice sits at the intersection of classic soul and modern R&B — crafting performances that feel both timeless and acutely present. Trained at Berklee College of Music and shaped by a decade of live residencies across Los Angeles, New York, and London.`,
  career: [
    { year: '2024', event: 'Headlined the Wiltern Theatre — sold out in 48 hours' },
    { year: '2023', event: 'Featured artist, Hollywood Bowl Summer Series' },
    { year: '2022', event: 'Toured with Sade Alumni Band across North America' },
    { year: '2019', event: 'Released debut LP "Midnight Meridian" — 4M streams' },
  ],
  services: [
    { label: 'Intimate Dinner Serenade', price: '$450/hr', desc: 'Solo vocal set with acoustic accompaniment, ideal for private dining.' },
    { label: 'Corporate Gala Headliner', price: '$2,200/event', desc: 'Full PA system, live band, up to 90-min set.' },
    { label: 'Wedding Reception Package', price: 'From $1,800', desc: 'Ceremony & reception sets, song requests, MC coordination.' },
  ],
  genres: ['R&B', 'Soul', 'Jazz Standards', 'Neo-Soul'],
  languages: ['English', 'French (basic)'],
  reviews: [
    {
      author: 'James K.',
      role: 'Event Director — Meridian Corp',
      date: 'Oct 2026',
      rating: 5,
      text: 'Absolutely transformative. The room went silent the moment she started — then erupted. We have already re-booked for next year.',
    },
    {
      author: 'Priya S.',
      role: 'Private Client',
      date: 'Sep 2026',
      rating: 5,
      text: 'She made our wedding ceremony unforgettable. Completely professional, arrived early, worked with our sound team seamlessly.',
    },
    {
      author: 'Tom B.',
      role: 'Venue Manager, The Ace Hotel',
      date: 'Aug 2026',
      rating: 5,
      text: 'We host live music every week. She is in the top three performers we have ever had on our stage.',
    },
  ],
};

const EQUIPMENT_DATA = {
  genre: 'Professional Audio',
  location: 'Los Angeles, CA · Delivery available',
  rating: 4.8,
  reviewCount: 94,
  bookings: 320,
  responseTime: '< 4 hrs',
  price: '$280 / day',
  verified: true,
  memberSince: '2020',
  bio: `A fully-maintained professional audio and lighting rig designed for events from 50 to 2,000 guests. Every piece of equipment is PAT-tested, flight-cased, and available with optional in-house technician support. Trusted by 300+ event producers across Southern California.`,
  career: [
    { year: '2024', event: 'Primary audio supplier — Coachella After-Parties (3 nights)' },
    { year: '2023', event: 'Full production for LA Fashion Week closing ceremony' },
    { year: '2022', event: 'Supplied audio and lighting for Dodger Stadium corporate gala' },
    { year: '2020', event: 'Launched with industry-grade d&b audiotechnik line arrays' },
  ],
  services: [
    { label: 'Full PA System (Small Venue)', price: '$280/day', desc: 'Up to 300 guests. Includes mains, monitors, and mixing desk.' },
    { label: 'Stage Lighting Package', price: '$180/day', desc: 'Moving heads, LED wash, hazer. Programmer available on request.' },
    { label: 'Full Production Bundle', price: '$580/day', desc: 'Audio + lighting + technician. Ideal for conferences and concerts.' },
  ],
  genres: ['Live Concert', 'Corporate Events', 'Weddings', 'Festivals'],
  languages: ['English', 'Spanish'],
  reviews: [
    {
      author: 'Sarah M.',
      role: 'Production Manager',
      date: 'Oct 2026',
      rating: 5,
      text: 'Gear arrived on time, in perfect condition. The technician knew exactly what we needed without being told twice.',
    },
    {
      author: 'Daniel R.',
      role: 'Event Promoter',
      date: 'Sep 2026',
      rating: 5,
      text: 'Used the full production bundle for a 500-person show. Sound was pristine, lighting was tight. No notes.',
    },
    {
      author: 'Chloe W.',
      role: 'Wedding Planner',
      date: 'Aug 2026',
      rating: 4,
      text: 'Really professional setup and great communication throughout. Would absolutely use again.',
    },
  ],
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function LiquidGlassTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors duration-300 cursor-pointer outline-none"
      style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill={i <= rating ? '#f59e0b' : 'none'}
          stroke={i <= rating ? '#f59e0b' : '#334155'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CollectionDetailPageProps {
  listing: CollectionListing;
  onBack: () => void;
}

export default function CollectionDetailPage({ listing, onBack }: CollectionDetailPageProps) {
  const isArtist = listing.type === 'artist';
  const data = isArtist ? ARTIST_DATA : EQUIPMENT_DATA;

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews'>('overview');
  const [bannerType] = useState<'photo' | 'video'>('photo');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittedReview, setSubmittedReview] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const bannerParallax = useTransform(scrollY, [0, 400], [0, -80]);
  const bannerScale = useTransform(scrollY, [0, 400], [1, 1.08]);

  const tabs = [
    { key: 'overview', label: isArtist ? 'About' : 'Details' },
    { key: 'portfolio', label: 'Gallery' },
    { key: 'reviews', label: `Reviews (${data.reviewCount})` },
  ] as const;

  const easeSpring = { type: 'spring', stiffness: 340, damping: 32 };
  const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { ...easeSpring, delay: i * 0.08 },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen"
      style={{ background: '#07090f' }}
    >
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative h-[480px] md:h-[560px] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: bannerParallax, scale: bannerScale }}
        >
          {bannerType === 'photo' ? (
            <img
              src={listing.images[0]}
              alt={listing.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <video autoPlay loop muted playsInline className="w-full h-full object-cover" />
          )}
        </motion.div>

        {/* Scrim */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7,9,15,0.18) 0%, rgba(7,9,15,0.55) 60%, rgba(7,9,15,1) 100%)',
          }}
        />

        {/* Back button — floating liquid glass */}
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, ...easeSpring }}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <Icon.ChevronLeft className="w-4 h-4" />
          {isArtist ? 'Browse Artists' : 'Rent Equipment'}
        </motion.button>

        {/* Verified badge floating */}
        {data.verified && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, ...easeSpring }}
            className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300"
            style={{
              background: 'rgba(16,185,129,0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <Icon.CheckCircle className="w-3.5 h-3.5" />
            StageLink Verified
          </motion.div>
        )}

        {/* Hero title area — bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-10">
          <div className="max-w-6xl mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-bold tracking-[0.22em] uppercase text-violet-400 mb-2"
            >
              {isArtist ? data.genre : 'Equipment Listing'}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, ...easeSpring }}
              className="font-display text-4xl md:text-6xl font-black text-white mb-3 leading-tight"
            >
              {listing.name}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="flex flex-wrap items-center gap-4 text-sm text-slate-300"
            >
              <span className="flex items-center gap-1.5">
                <Icon.MapPin className="w-3.5 h-3.5 text-slate-400" />
                {data.location}
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="#f59e0b" className="w-3.5 h-3.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="font-semibold text-white">{data.rating}</span>
                <span className="text-slate-400">({data.reviewCount} reviews)</span>
              </span>
              <span className="text-slate-400">{data.bookings} bookings</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* ── Left Column ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Transparent Tab Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-1 mb-8 p-1 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {tabs.map((t) => (
                <LiquidGlassTab
                  key={t.key}
                  label={t.label}
                  active={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                />
              ))}
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-10"
                >
                  {/* Bio */}
                  <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
                    <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500 mb-4">
                      {isArtist ? 'About the Artist' : 'About this Listing'}
                    </h2>
                    <p className="text-slate-300 text-base leading-[1.8]">{data.bio}</p>
                  </motion.div>

                  {/* Tags */}
                  <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
                    <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500 mb-4">
                      {isArtist ? 'Genres' : 'Event Types'}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {data.genres.map((g) => (
                        <span
                          key={g}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </motion.div>

                  {/* Career Timeline */}
                  <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
                    <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500 mb-6">
                      {isArtist ? 'Career Highlights' : 'Track Record'}
                    </h2>
                    <div className="relative">
                      {/* Vertical line */}
                      <div
                        className="absolute left-[52px] top-0 bottom-0 w-px"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      />
                      <div className="space-y-6">
                        {data.career.map((item, i) => (
                          <motion.div
                            key={item.year}
                            custom={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="show"
                            className="flex gap-6 items-start"
                          >
                            <div className="w-[52px] shrink-0 text-right">
                              <span className="font-mono text-xs font-bold text-violet-400">
                                {item.year}
                              </span>
                            </div>
                            {/* Dot */}
                            <div
                              className="mt-1 w-2 h-2 rounded-full shrink-0 ring-4"
                              style={{
                                background: '#7c3aed',
                                ringColor: 'rgba(124,58,237,0.18)',
                                boxShadow: '0 0 0 4px rgba(124,58,237,0.14)',
                              }}
                            />
                            <p className="text-sm text-slate-300 leading-relaxed">{item.event}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Services */}
                  <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
                    <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500 mb-4">
                      Services &amp; Packages
                    </h2>
                    <div className="space-y-3">
                      {data.services.map((svc, i) => (
                        <motion.button
                          key={svc.label}
                          onClick={() => setSelectedService(selectedService === i ? null : i)}
                          className="w-full text-left rounded-2xl p-5 transition-all duration-300 cursor-pointer"
                          style={{
                            background:
                              selectedService === i
                                ? 'rgba(124,58,237,0.10)'
                                : 'rgba(255,255,255,0.03)',
                            border:
                              selectedService === i
                                ? '1px solid rgba(124,58,237,0.35)'
                                : '1px solid rgba(255,255,255,0.07)',
                          }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white text-sm">{svc.label}</span>
                            <span className="font-mono text-amber-400 text-sm font-bold">
                              {svc.price}
                            </span>
                          </div>
                          <AnimatePresence>
                            {selectedService === i && (
                              <motion.p
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28 }}
                                className="text-xs text-slate-400 leading-relaxed mt-2 overflow-hidden"
                              >
                                {svc.desc}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* ── PORTFOLIO/GALLERY TAB ────────────────────────────────── */}
              {activeTab === 'portfolio' && (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-500 mb-6">
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {listing.images.map((src, i) => (
                      <motion.div
                        key={src}
                        className={`overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2' : ''}`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.07, ...easeSpring }}
                        whileHover={{ scale: 1.015 }}
                      >
                        <img
                          src={src}
                          alt={`${listing.name} ${i + 1}`}
                          className={`w-full object-cover ${i === 0 ? 'aspect-[16/7]' : 'aspect-[4/3]'}`}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── REVIEWS TAB ─────────────────────────────────────────── */}
              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-8"
                >
                  {/* Aggregate */}
                  <motion.div
                    custom={0}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex items-center gap-6 p-6 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="text-center">
                      <div className="font-display text-5xl font-black text-white mb-1">
                        {data.rating}
                      </div>
                      <StarRow rating={Math.round(data.rating)} />
                      <div className="text-xs text-slate-500 mt-1">{data.reviewCount} reviews</div>
                    </div>
                    <div className="h-16 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3].map((star) => {
                        const pct = star === 5 ? 82 : star === 4 ? 14 : 4;
                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-2">{star}</span>
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ background: 'rgba(255,255,255,0.07)' }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: '#f59e0b' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.2 + (5 - star) * 0.1, duration: 0.7 }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-7 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Review cards */}
                  <div className="space-y-4">
                    {data.reviews.map((rev, i) => (
                      <motion.div
                        key={rev.author}
                        custom={i + 1}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        className="rounded-2xl p-6"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-white text-sm">{rev.author}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{rev.role}</div>
                          </div>
                          <span className="text-xs text-slate-600">{rev.date}</span>
                        </div>
                        <StarRow rating={rev.rating} />
                        <p className="mt-3 text-sm text-slate-300 leading-[1.75]">{rev.text}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Write a review */}
                  <motion.div
                    custom={data.reviews.length + 1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="rounded-2xl p-6"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <h3 className="text-sm font-semibold text-white mb-4">Leave a Review</h3>

                    {submittedReview ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 text-emerald-400 text-sm font-medium"
                      >
                        <Icon.CheckCircle className="w-5 h-5" />
                        Review submitted — thank you.
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {/* Star picker */}
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              onClick={() => setReviewRating(s)}
                              className="cursor-pointer transition-transform hover:scale-110"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-6 h-6"
                                fill={s <= reviewRating ? '#f59e0b' : 'none'}
                                stroke={s <= reviewRating ? '#f59e0b' : '#334155'}
                                strokeWidth="2"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          placeholder="Share your experience…"
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          className="input resize-none text-sm"
                          style={{ borderRadius: 12 }}
                        />
                        <button
                          disabled={reviewText.trim().length < 10}
                          onClick={() => setSubmittedReview(true)}
                          className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ borderRadius: 10 }}
                        >
                          Submit Review
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Sticky Panel ──────────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, ...easeSpring }}
            className="lg:w-[320px] shrink-0 lg:sticky lg:top-28 lg:self-start space-y-4"
          >
            {/* Booking card — Apple-style liquid glass */}
            <div
              className="rounded-3xl p-6"
              style={{
                background: 'rgba(255,255,255,0.055)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.13)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              <div className="mb-5">
                <div className="font-mono text-3xl font-black text-white mb-0.5">{data.price}</div>
                <div className="text-xs text-slate-400">Starting rate · custom quotes available</div>
              </div>

              {/* Quick stats */}
              <div
                className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-2xl"
                style={{
                  background: 'rgba(0,0,0,0.20)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {[
                  { label: 'Rating', val: String(data.rating) },
                  { label: 'Bookings', val: `${data.bookings}+` },
                  { label: 'Response', val: data.responseTime },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-sm font-bold text-white">{s.val}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <motion.button
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white mb-3"
                style={{
                  background: 'rgba(124,58,237,0.85)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(124,58,237,0.6)',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
                }}
                whileHover={{ scale: 1.02, boxShadow: '0 6px 32px rgba(124,58,237,0.5)' }}
                whileTap={{ scale: 0.98 }}
              >
                {isArtist ? 'Book Now' : 'Request Rental'}
              </motion.button>

              <motion.button
                className="w-full py-3 rounded-xl font-semibold text-sm text-slate-300"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.09)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon.MessageCircle className="w-4 h-4" />
                  Message
                </span>
              </motion.button>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-600">
                <Icon.Shield className="w-3.5 h-3.5" />
                StageLink Secure Payment &amp; Escrow
              </div>
            </div>

            {/* Meta card */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {[
                {
                  icon: <Icon.Calendar className="w-4 h-4 text-slate-500" />,
                  label: 'Listed',
                  val: listing.date,
                },
                {
                  icon: <Icon.Clock className="w-4 h-4 text-slate-500" />,
                  label: 'Response time',
                  val: data.responseTime,
                },
                {
                  icon: <Icon.Award className="w-4 h-4 text-slate-500" />,
                  label: 'Member since',
                  val: data.memberSince,
                },
                {
                  icon: <Icon.Globe className="w-4 h-4 text-slate-500" />,
                  label: isArtist ? 'Languages' : 'Coverage',
                  val: data.languages.join(', '),
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {row.icon}
                    {row.label}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">{row.val}</span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </div>
    </motion.div>
  );
}
