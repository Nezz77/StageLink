'use client';

import { Component, Suspense, lazy, type ReactNode } from 'react';
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
  return <div className="dna-field fixed inset-0 pointer-events-none" aria-hidden="true" data-dna-state={reducedMotion ? 'still' : pageVisible ? 'scrolling' : 'paused'}>
    {reducedMotion ? <StillMusicNotes /> : <SceneBoundary><Suspense fallback={<StillMusicNotes />}><MusicNoteScene isDark={isDark} active={pageVisible} /></Suspense></SceneBoundary>}
  </div>;
}
