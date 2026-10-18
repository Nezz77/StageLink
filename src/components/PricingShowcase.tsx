import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Award, Globe2, Mic2, MoveHorizontal, Music2, Sparkles } from 'lucide-react';
import { MotionCarousel } from './MotionCarousel';
import PricingCard from './PricingCard';
import '../pricing-showcase.css';

const priceBands = [
  { label: 'Budget', range: '$100 – $400', unit: '/ hour', count: '2,400+ artists', note: 'Small room. Big feeling.', icon: Music2, accent: '#f0c578', rgb: '240,197,120', tone: 'amber' },
  { label: 'Mid-Range', range: '$400 – $1,000', unit: '/ hour', count: '1,800+ artists', note: 'Bring the room together.', icon: Mic2, accent: '#89e3cb', rgb: '137,227,203', tone: 'mint' },
  { label: 'Premium', range: '$1,000 – $3,000', unit: '/ event', count: '640+ artists', note: 'A moment in the spotlight.', icon: Award, accent: '#c3a6ff', rgb: '195,166,255', tone: 'violet' },
  { label: 'Enterprise', range: 'Custom quote', unit: 'Let’s talk', count: '120+ artists', note: 'Your vision. A bigger stage.', icon: Globe2, accent: '#9dc6ff', rgb: '157,198,255', tone: 'blue' },
];

export default function PricingShowcase({ onBrowse }: { onBrowse: () => void }) {
  const section = useRef<HTMLElement>(null);
  const entered = useInView(section, { once: true, amount: .12 });
  const reduced = useReducedMotion();
  const entrance = (delay: number) => ({
    initial: reduced ? false as const : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: .4 },
    transition: { duration: reduced ? 0 : .65, delay: reduced ? 0 : delay, ease: [.22, 1, .36, 1] as [number, number, number, number] },
  });

  return <section ref={section} className={`ps-section${entered ? ' is-revealed' : ''}`} aria-labelledby="pricing-showcase-title">
    <div className="ps-stage-light" aria-hidden="true" /><div className="ps-stage-floor" aria-hidden="true" />
    <div className="ps-inner">
      <div className="ps-masthead"><span>STAGELINK / FIND YOUR RANGE</span><span>THE STAGE IS YOURS <Sparkles size={13} aria-hidden="true" /></span></div>
      <header className="ps-heading">
        <motion.p className="ps-eyebrow" data-reveal {...entrance(0)}><span /> A LITTLE PLANNING. A GREAT NIGHT.</motion.p>
        <motion.h2 id="pricing-showcase-title" data-reveal {...entrance(.07)}>Every budget.<br /><em>Extraordinary possibilities.</em></motion.h2>
        <motion.p className="ps-description" data-reveal {...entrance(.14)}>Find a price range that feels right. Then find the artist who makes it yours.</motion.p>
      </header>
      <MotionCarousel options={{ loop: true, startIndex: 1 }} labels={priceBands.map(band => band.label)} slides={priceBands.map((band, index) => <PricingCard key={band.label} band={band} index={index} />)} />
      <motion.div className="ps-bottom" data-reveal {...entrance(0)}>
        <div><span className="ps-drag-hint"><MoveHorizontal size={16} aria-hidden="true" /> Drag to explore the lineup</span><p>Illustrative demo prices. Final quotes are agreed with your artist.</p></div>
        <button type="button" className="ps-explore" onClick={onBrowse}>Explore artist collections <ArrowUpRight size={19} aria-hidden="true" /></button>
      </motion.div>
    </div>
  </section>;
}
