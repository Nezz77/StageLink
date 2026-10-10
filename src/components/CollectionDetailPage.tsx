import { motion } from 'motion/react';

export interface CollectionListing {
  id: number;
  name: string;
  date: string;
  images: string[];
  type: 'artist' | 'equipment';
}

interface CollectionDetailPageProps {
  listing: CollectionListing;
  onBack: () => void;
}

export default function CollectionDetailPage({ listing, onBack }: CollectionDetailPageProps) {
  const [day, month] = listing.date.split(' ');

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-[calc(100vh-73px)] px-6 py-10 text-white"
    >
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to {listing.type === 'artist' ? 'artists' : 'equipment'}
        </button>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {listing.images.map((image, index) => (
              <img
                key={image}
                src={image}
                alt={`${listing.name} ${listing.type === 'artist' ? 'collection' : 'equipment'} photo ${index + 1}`}
                className={`aspect-[4/3] w-full rounded-2xl bg-slate-900 object-cover ${index === 0 ? 'col-span-2 aspect-[16/9]' : ''}`}
              />
            ))}
          </div>

          <section className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              {listing.type === 'artist' ? 'Artist collection' : 'Equipment listing'}
            </p>
            <h1 className="mb-5 font-display text-3xl font-bold sm:text-4xl">{listing.name}</h1>
            <div className="mb-8 flex items-center gap-2 text-slate-300">
              <span aria-hidden="true">◷</span>
              <span>Listed {day} {month}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="mb-2 text-lg font-semibold">About this {listing.type === 'artist' ? 'collection' : 'listing'}</h2>
              <p className="text-sm leading-6 text-slate-400">
                {listing.type === 'artist'
                  ? 'Explore this artist’s collection and portfolio.'
                  : 'Explore photos from this equipment listing.'}
              </p>
            </div>
          </section>
        </div>
      </div>
    </motion.main>
  );
}
