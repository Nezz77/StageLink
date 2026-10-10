import { motion } from 'motion/react';
import ArtistCollectionCard from './ArtistCollectionCard';
import type { CollectionListing } from './CollectionDetailPage';

const rentEquipmentData = [
  { 
    id: 201, 
    name: 'PRO AUDIO RIG', 
    date: '10 Aug', 
    images: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&h=600&fit=crop', // Mixer/Audio
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=600&fit=crop', // Piano/Studio
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=600&fit=crop', // Concert audio
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&h=600&fit=crop'  // Studio lights
    ]
  },
  { 
    id: 202, 
    name: 'STAGE LIGHTS', 
    date: '02 Sep', 
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=600&fit=crop', // Event stage
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=600&fit=crop', // Festival lights
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=600&fit=crop'  // DJ lights
    ]
  },
  { 
    id: 203, 
    name: 'DJ ESSENTIALS', 
    date: '15 Oct', 
    images: [
      'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=500&h=600&fit=crop', // DJ deck
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=600&fit=crop', // Turntable
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=600&fit=crop', // Party crowd
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&h=600&fit=crop', // Horns
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=600&fit=crop'  // Concert performance
    ]
  }
];

export default function RentEquipmentPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
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
              Rent Equipment
            </motion.h2>
            <motion.p 
              className="text-slate-400"
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              initial="hidden"
              animate="show"
            >
              Top-tier audio, lighting, and stage gear for your events
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
          {rentEquipmentData.map((equipment) => (
            <motion.div 
              key={equipment.id}
              variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
            >
              <ArtistCollectionCard 
                listing={{ ...equipment, type: 'equipment' }}
                onOpen={onOpenCollection}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
