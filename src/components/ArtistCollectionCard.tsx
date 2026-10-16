import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CollectionListing } from './CollectionDetailPage';

interface ArtistCollectionCardProps {
  listing: CollectionListing;
  onOpen: (listing: CollectionListing) => void;
}

export default function ArtistCollectionCard({ listing, onOpen }: ArtistCollectionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);

  // Take up to 5 images
  const displayImages = listing.images.slice(0, 5);

  return (
    <motion.div
      className="relative isolate z-0 w-[300px] max-w-full h-[350px] select-none rounded-[40px] bg-[#F5F5F0] cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-500 mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsExpanded(false); }}
      onDoubleClick={(event) => {
        event.preventDefault();
        setIsExpanded((expanded) => !expanded);
      }}
    >
      {/* Container for images (behind the dark overlay) */}
      <div className="absolute inset-0 pt-8 flex justify-center z-10">
        {displayImages.map((src, index) => {
          // Calculate reverse index (0 is top image, 4 is bottom-most image)
          // But actually we want the first image in array to be front-most, so z-index should be higher for lower index.
          // Calculate arch positions
          let archX = 0;
          let archY = 0;
          let archRotate = 0;

          if (isExpanded) {
            if (index === 0) {
              archX = 0; archY = -180; archRotate = 0;
            } else if (index === 1) {
              archX = -130; archY = -140; archRotate = -15;
            } else if (index === 2) {
              archX = 130; archY = -140; archRotate = 15;
            } else if (index === 3) {
              archX = -240; archY = -60; archRotate = -30;
            } else if (index === 4) {
              archX = 240; archY = -60; archRotate = 30;
            }
          }

          // When expanded, bring to top so they overlap properly (index 0 is front)
          let zIndex = isExpanded ? 100 - index : 50 - index;
          // Bring hovered image to absolute front
          if (hoveredImageIndex === index) {
            zIndex = 200;
          }
          
          return (
            <motion.div
              key={`${src}-${index}`}
              className="absolute w-[200px] h-[250px] rounded-[24px] overflow-hidden shadow-xl bg-white border border-black/5 pointer-events-auto"
              style={{ zIndex }}
              onMouseEnter={() => setHoveredImageIndex(index)}
              onMouseLeave={() => setHoveredImageIndex(null)}
              initial={{ y: 50 + (index * 4), scale: 0.95 - (index * 0.05), opacity: index === 0 ? 1 : 0, rotate: 0, x: 0 }}
              animate={{ 
                y: isExpanded ? archY : (isHovered ? (index * -5) + 30 : 50 + (index * 4)),
                x: isExpanded ? archX : 0,
                rotate: isExpanded ? archRotate : 0,
                scale: isExpanded ? 1 : (isHovered ? 1 - (index * 0.05) : 0.95 - (index * 0.05)),
                opacity: isExpanded ? 1 : (isHovered ? 1 - (index * 0.15) : (index === 0 ? 1 : 0))
              }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 25,
                delay: isExpanded ? index * 0.05 : (isHovered ? index * 0.05 : 0) // Stagger
              }}
            >
              <img src={src} alt={`${listing.name} collection ${index + 1}`} className="w-full h-full object-cover" />
              
              {/* Optional ID tag on the first image like in the screenshot */}
              {index === 0 && (
                <div className="absolute top-3 right-3 text-[10px] font-bold text-white/80 tracking-wider">
                  {listing.name.toUpperCase().replace(/\s+/g, '').substring(0, 8)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dark Overlay (Folder Tab Shape) */}
      <motion.div 
        className="absolute bottom-0 w-full h-[180px] z-50 pointer-events-none"
        initial={{ y: 0 }}
        animate={{ y: isHovered ? 20 : 0 }} // Slight push down of overlay on hover
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        {/* We use an SVG to draw the precise curved tab shape for the dark overlay */}
        <svg viewBox="0 0 300 180" className="absolute bottom-0 w-full h-full drop-shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
          <path 
            d="M 0,80 
               C 0,80 0,60 20,60 
               L 80,60 
               C 100,60 110,80 130,80
               L 280,80
               C 300,80 300,100 300,100
               L 300,140
               A 40,40 0 0,1 260,180
               L 40,180
               A 40,40 0 0,1 0,140 Z" 
            fill="#1A1A1A"
            className="pointer-events-auto cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`View ${listing.name} ${listing.type === 'artist' ? 'collection' : 'listing'}`}
            onClick={() => onOpen(listing)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(listing);
              }
            }}
          />
        </svg>

        {/* Overlay Content */}
        <div
          className="pointer-events-auto absolute inset-0 px-8 py-6 flex flex-col justify-between text-white/90 cursor-pointer"
          onClick={() => onOpen(listing)}
        >
          <div className="mt-14">
            <h3 className="text-xl font-medium leading-tight">
              View<br />{listing.type === 'artist' ? 'Collection' : 'Listing'}
            </h3>
          </div>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-light">{listing.date.split(' ')[0]}</span>
            <span className="text-sm text-white/50 mb-1">{listing.date.split(' ')[1]}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
