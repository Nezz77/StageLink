import { useEffect, useState, type RefObject } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';

type Phase = 'stacked' | 'scrubbing' | 'settled';
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** One reversible pose for every page-scroll position. No timers or replay jobs. */
export function usePricingDeck(api: EmblaCarouselType | undefined, root: RefObject<HTMLDivElement | null>) {
  const [phase, setPhase] = useState<Phase>('stacked');
  useEffect(() => {
    const region = root.current;
    if (!api || !region) return;
    const viewport = api.rootNode();
    const slides = api.slideNodes();
    const cards = slides.map(slide => slide.querySelector<HTMLElement>('.mc-reveal')!);
    const visuals = slides.map(slide => slide.querySelector<HTMLElement>('.mc-slide-visual')!);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let previousPhase: Phase | undefined;
    function render() {
      raf = 0;
      const bounds = viewport.getBoundingClientRect();
      const progress = reduced.matches ? 1 : clamp((innerHeight * .9 - bounds.top) / (innerHeight * .62));
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      const selected = api!.selectedScrollSnap();
      const left = (selected - 1 + cards.length) % cards.length;
      const right = (selected + 1) % cards.length;
      const center = bounds.left + bounds.width / 2;
      region!.dataset.deckProgress = progress.toFixed(4);
      const next: Phase = progress === 1 ? 'settled' : progress === 0 ? 'stacked' : 'scrubbing';
      if (next !== previousPhase) { previousPhase = next; setPhase(next); }
      slides.forEach((slide, i) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.min(1, Math.abs(center - rect.left - rect.width / 2) / rect.width);
        const offset = i === selected ? 12 : i === left ? -15 : 0;
        const rotation = i === selected ? -4 : i === left ? 5 : 0;
        const shift = center - rect.left - rect.width / 2 + offset;
        const scale = i === selected ? .97 : .94;
        const member = i === selected || i === left || i === right;
        cards[i].style.transform = `translate3d(${shift * (1 - eased)}px,${(16 - Math.sin(Math.PI * eased) * 15) * (1 - eased)}px,0) rotate(${rotation * (1 - eased)}deg) scale(${scale + (1 - scale) * eased})`;
        cards[i].style.opacity = '1';
        cards[i].style.visibility = member || progress === 1 ? '' : 'hidden';
        slide.style.zIndex = progress === 1 ? '' : i === selected ? '7' : i === left ? '6' : '5';
        visuals[i].style.transform = `translateY(${reduced.matches ? 0 : 18 * distance * eased}px) scale(${reduced.matches ? 1 : 1 - .08 * distance * eased})`;
        visuals[i].style.opacity = String(reduced.matches ? 1 : 1 - .1 * distance * eased);
      });
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
    render();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    const resize = new ResizeObserver(schedule); resize.observe(viewport);
    api.on('scroll', schedule).on('select', schedule).on('reInit', schedule);
    return () => {
      cancelAnimationFrame(raf); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
      api.off('scroll', schedule).off('select', schedule).off('reInit', schedule);
    };
  }, [api, root]);
  return { phase, busy: phase !== 'settled' };
}
