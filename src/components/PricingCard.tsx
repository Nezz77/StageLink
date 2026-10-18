'use client';

import { useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform, type MotionStyle } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { useMotionEnvironment } from '../lib/useMotionEnvironment';

type Band = { label: string; range: string; unit: string; count: string; note: string; icon: LucideIcon; accent: string; rgb: string; tone: string };
export default function PricingCard({ band, index }: { band: Band; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: .15 });
  const { reducedMotion, pageVisible } = useMotionEnvironment();
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-.5, .5], [4, -4]), { stiffness: 180, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-.5, .5], [-5, 5]), { stiffness: 180, damping: 30 });
  const running = !reducedMotion && pageVisible && inView;
  return <motion.article ref={ref} className={`ps-card ps-${band.tone}`} style={{ '--ps-accent': band.accent, '--ps-rgb': band.rgb, rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, transformPerspective: 1000 } as MotionStyle}
    onPointerMove={event => {
      if (event.pointerType !== 'mouse' || reducedMotion || event.currentTarget.closest('.mc-deck-running')) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      x.set((event.clientX - bounds.left) / bounds.width - .5); y.set((event.clientY - bounds.top) / bounds.height - .5);
      event.currentTarget.style.setProperty('--ps-spot-x', `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty('--ps-spot-y', `${event.clientY - bounds.top}px`);
    }} onPointerLeave={() => { x.set(0); y.set(0); }}>
    <div className="ps-border-ring" aria-hidden="true"><motion.div className="ps-border-light" animate={{ rotate: running ? 360 : 0 }} transition={running ? { duration: 10 + index, ease: 'linear', repeat: Infinity } : { duration: 0 }} /></div>
    <div className="ps-card-sheen" aria-hidden="true" />
    <div className="ps-card-top"><span><i /> STAGE PASS</span><span>No. {String(index + 1).padStart(2, '0')}</span></div>
    <div className="ps-art" aria-hidden="true"><div className="ps-orbit" /><div className="ps-art-icon"><band.icon strokeWidth={1.25} /></div><span className="ps-art-number">0{index + 1}</span><div className="ps-sound-bars">{[12, 23, 16, 34, 24, 42, 29, 18, 30, 12].map((height, i) => <i key={i} style={{ height }} />)}</div></div>
    <div className="ps-card-copy"><h3>{band.label}</h3><p>{band.note}</p></div>
    <div className="ps-card-price"><span className="ps-range-label">YOUR STARTING RANGE</span><div><strong>{band.range}</strong><span>{band.unit}</span></div></div>
    <div className="ps-card-footer"><span>{band.count}</span><span className="ps-barcode" aria-hidden="true" /></div>
  </motion.article>;
}
