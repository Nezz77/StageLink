import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaOptionsType } from 'embla-carousel';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = { slides: ReactNode[]; labels?: string[]; options?: EmblaOptionsType };

export function MotionCarousel({ slides, labels = [], options }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const revealed = useInView(root, { once: true, amount: .18 });
  const reduced = useReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', containScroll: false, duration: 32, ...options });
  const [selectedIndex, setSelectedIndex] = useState(options?.startIndex ?? 0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => emblaApi.reInit({ duration: preference.matches ? 0 : options?.duration ?? 32 });
    updateMotion();
    preference.addEventListener('change', updateMotion);
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
      preference.removeEventListener('change', updateMotion);
    };
  }, [emblaApi, onSelect, options?.duration]);

  const previous = () => emblaApi?.scrollPrev(prefersStill());
  const next = () => emblaApi?.scrollNext(prefersStill());
  const goTo = (index: number) => emblaApi?.scrollTo(index, prefersStill());
  const show = revealed || reduced;

  return <div ref={root} className={`mc-carousel${show ? ' is-revealed' : ''}`} role="region" aria-roledescription="carousel" aria-label="Performance price ranges" tabIndex={0}
    onFocusCapture={() => { root.current?.classList.add('mc-has-focus'); }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      if (event.key === 'End') { event.preventDefault(); goTo(slides.length - 1); }
    }}>
    <div className="mc-viewport" ref={emblaRef}>
      <div className="mc-track">
        {slides.map((slide, index) => {
          const active = index === selectedIndex;
          // Keep Embla's loop positioning on the outer slide, separate from visual motion.
          return <div className={`mc-slide${active ? ' is-active' : ''}`} key={labels[index] ?? index} role="group" aria-roledescription="slide" aria-label={`${labels[index] ?? 'Price range'}, ${index + 1} of ${slides.length}`}>
            <motion.div className="mc-reveal" initial={reduced ? false : { opacity: 0, y: 60, rotateX: 8 }}
              animate={show ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 60, rotateX: 8 }}
              transition={{ duration: reduced ? 0 : .75, delay: reduced ? 0 : .06 + Math.abs(index - (options?.startIndex ?? 0)) * .09, ease: [.22, 1, .36, 1] }}>
              <motion.div className="mc-slide-visual" initial={false}
                animate={{ scale: active ? 1 : .92, y: active ? 0 : 18, opacity: active ? 1 : .9 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24, mass: .85 }}>
                {slide}
              </motion.div>
            </motion.div>
          </div>;
        })}
      </div>
    </div>
    <div className="mc-controls">
      <button type="button" className="mc-arrow" onClick={previous} disabled={!canPrev} aria-label="Previous price range"><ArrowLeft size={21} aria-hidden="true" /></button>
      <div className="mc-pagination">
        <div className="mc-status" role="status" aria-live="polite" aria-atomic="true"><span>{labels[selectedIndex] ?? 'Price range'}</span><span className="mc-position">{String(selectedIndex + 1).padStart(2, '0')} <i>/ {String(slides.length).padStart(2, '0')}</i></span></div>
        <div className="mc-dots" aria-label="Choose a price range">{slides.map((_, index) => <button type="button" key={index} className={selectedIndex === index ? 'is-active' : ''} onClick={() => goTo(index)} aria-label={`Show ${labels[index] ?? `price range ${index + 1}`}`} aria-pressed={selectedIndex === index}><span /></button>)}</div>
      </div>
      <button type="button" className="mc-arrow" onClick={next} disabled={!canNext} aria-label="Next price range"><ArrowRight size={21} aria-hidden="true" /></button>
    </div>
  </div>;
}
