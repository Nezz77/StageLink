import { useDashboard } from '../lib/DashboardContext';
import { collectionsFor } from '../lib/catalogPresentation';
import { motion } from 'motion/react';
import ArtistCollectionCard from './ArtistCollectionCard';
import type { CollectionListing } from './CollectionDetailPage';
import '../collections.css';

export default function RentEquipmentPage({ onOpenCollection }: { onOpenCollection: (listing: CollectionListing) => void }) {
  const { state } = useDashboard();
  const rentEquipmentData = collectionsFor(state, 'equipment');
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
          {!rentEquipmentData.length && <p className="text-slate-400 col-span-full">No published listings yet. Check back after a provider publishes one.</p>}
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
