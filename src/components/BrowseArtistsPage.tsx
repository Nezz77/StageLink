import { motion } from 'motion/react';
import ArtistCollectionCard from './ArtistCollectionCard';
import type { CollectionListing } from './CollectionDetailPage';

const browseArtistsData = [
  { 
    id: 101, 
    name: 'MOE4SFW', 
    date: '05 Dec', 
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552346154-21d32810baa3?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=500&h=600&fit=crop'
    ]
  },
  { 
    id: 102, 
    name: 'VIBES', 
    date: '12 Jan', 
    images: [
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=600&fit=crop'
    ]
  },
  { 
    id: 103, 
    name: 'STREET', 
    date: '28 Feb', 
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1485230895905-ef31ba762ee5?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=500&h=600&fit=crop',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&h=600&fit=crop'
    ]
  }
];

export default function BrowseArtistsPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="py-12 relative"
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
