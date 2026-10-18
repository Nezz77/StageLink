import { useSyncExternalStore } from 'react';

const reducedQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (listener: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const subscribeVisibility = (listener: () => void) => {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
};
export function useMotionEnvironment() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(reducedQuery).matches, () => true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  return { reducedMotion, pageVisible };
}
