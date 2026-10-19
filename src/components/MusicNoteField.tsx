'use client';

import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMotionEnvironment } from '../lib/useMotionEnvironment';
import '../music-note-field.css';

const MusicNoteScene = lazy(() => import('./MusicNoteScene'));

export function StillMusicNotes() {
  return <div className="dna-still" data-dna-fallback>{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ left: `${i % 2 ? 86 + Math.sin(i) * 7 : 7 + Math.sin(i) * 6}%`, top: `${(i * 17) % 100}%`, transform: `rotate(${i * 21 - 30}deg)`, fontSize: 18 + i % 4 * 7 }}>{['♩', '♪', '♫', '♬'][i % 4]}</span>)}</div>;
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <StillMusicNotes /> : this.props.children; }
}

export default function MusicNoteField({ isDark }: { isDark: boolean }) {
  const { reducedMotion, pageVisible } = useMotionEnvironment();
  const field = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState({ visible: false, loaded: false });
  useEffect(() => {
    const pricing = document.querySelector<HTMLElement>('.ps-section');
    const footer = document.querySelector<HTMLElement>('.landing-page footer');
    if (!pricing || !footer || !field.current) return;
    let wasVisible = false;
    const update = () => {
      if (!field.current) return;
      const rect = pricing.getBoundingClientRect();
      const bottom = footer.getBoundingClientRect().top;
      const visible = bottom > 0 && rect.top < innerHeight;
      // Clip the fixed canvas (including static/error fallbacks) to the actual
      // start and footer edges, so foreground notes cannot cross either boundary.
      field.current.style.clipPath = `inset(${Math.max(0, rect.top)}px ${Math.max(0, innerWidth - rect.right)}px ${Math.max(0, innerHeight - bottom)}px ${Math.max(0, rect.left)}px)`;
      field.current.style.visibility = visible ? 'visible' : 'hidden';
      if (visible !== wasVisible) {
        wasVisible = visible;
        setSection(previous => ({ visible, loaded: previous.loaded || visible }));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(pricing);
    observer.observe(footer);
    const page = document.querySelector('.landing-page');
    if (page) observer.observe(page);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  const active = pageVisible && section.visible;
  return <div ref={field} className="dna-field fixed inset-0 pointer-events-none" aria-hidden="true" data-dna-scope="pricing-to-footer" data-dna-state={!section.visible ? 'outside' : reducedMotion ? 'still' : active ? 'scrolling' : 'paused'}>
    {section.loaded && (reducedMotion ? <StillMusicNotes /> : <SceneBoundary><Suspense fallback={null}><MusicNoteScene isDark={isDark} active={active} /></Suspense></SceneBoundary>)}
  </div>;
}
