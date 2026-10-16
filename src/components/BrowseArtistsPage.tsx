import { useDashboard } from '../lib/DashboardContext';
import { collectionsFor } from '../lib/catalogPresentation';
import { motion } from 'motion/react';
import ArtistCollectionCard from './ArtistCollectionCard';
import type { CollectionListing } from './CollectionDetailPage';

export default function BrowseArtistsPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
  const { state } = useDashboard();
  const browseArtistsData = collectionsFor(state, 'artist');
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="py-12 relative restored-collections"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-16">
          <div>
            <motion.h2 
              className="font-display text-4xl font-bold text-white mb-4"
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              initial="hidden"
              animate="show"
            >
              Browse Collections
            </motion.h2>
            <motion.p 
              className="text-slate-400"
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              initial="hidden"
              animate="show"
            >
              Curated artist portfolios and recent drops
            </motion.p>
          </div>
        </div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8 pt-8 pb-12"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.2 }
            }
          }}
        >
          {!browseArtistsData.length && <p className="text-slate-400 col-span-full">No published listings yet. Check back after a provider publishes one.</p>}
          {browseArtistsData.map((artist) => (
            <motion.div 
              key={artist.id}
              variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
            >
              <ArtistCollectionCard 
                listing={{ ...artist, type: 'artist' }}
                onOpen={onOpenCollection}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
