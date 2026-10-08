import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaOptionsType } from 'embla-carousel';
import { motion } from 'motion/react';
import { Icon } from './Icons';

type PropType = {
  slides: React.ReactNode[];
  options?: EmblaOptionsType;
};

export const MotionCarousel: React.FC<PropType> = ({ slides, options }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    ...options
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 md:px-12">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex -ml-4 items-center">
          {slides.map((slide, index) => {
            const isActive = index === selectedIndex;
            return (
              <motion.div
                key={index}
                className="flex-[0_0_80%] sm:flex-[0_0_50%] lg:flex-[0_0_35%] min-w-0 pl-4 relative py-8"
                initial={false}
                animate={{
                  scale: isActive ? 1 : 0.85,
                  opacity: isActive ? 1 : 0.4,
                  zIndex: isActive ? 10 : 0
                }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.1 }}
              >
                {slide}
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <button 
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-white shadow-xl backdrop-blur-md z-20 transition-all hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-white shadow-xl backdrop-blur-md z-20 transition-all hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      
      {/* Pagination Dots */}
      <div className="flex justify-center items-center mt-6 gap-3">
        <span className="text-xs text-slate-300 font-medium mr-4 bg-white/10 px-4 py-1.5 rounded-full border border-white/5 shadow-inner backdrop-blur">
          Slide {selectedIndex + 1}
        </span>
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${index === selectedIndex ? 'bg-white w-8 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-slate-600 w-2.5 hover:bg-slate-400'}`}
          />
        ))}
      </div>
    </div>
  );
};
