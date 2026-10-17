import { useLayoutEffect, useRef } from 'react';

const entranceTargets = [
  '.sl-discovery-hero', '.mg-provider-hero', '.sl-section-heading',
  '.sl-talent-card', '.sl-lineup-item', '.mg-stat', '.mg-panel', '.mg-catalog-card',
].join(',');
const ease = 'cubic-bezier(.22,1,.36,1)';

/** Coordinate each view in place, so transitions never remount forms or reset drafts. */
export function usePanelEntrance(view: string) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || preference.matches || typeof element.animate !== 'function') return;

    const compact = window.matchMedia('(max-width: 640px)').matches;
    const animations: Animation[] = [];
    const enter = (target: HTMLElement, delay: number, heading = false) => {
      const animation = target.animate([
        { opacity: 0, translate: `0 ${heading ? 10 : compact ? 10 : 20}px` },
        { opacity: 1, translate: '0 0' },
      ], { duration: compact ? 420 : heading ? 580 : 640, delay, easing: ease, fill: 'backwards' });
      animation.id = heading ? 'dashboard-heading-enter' : 'dashboard-panel-enter';
      animations.push(animation);
    };

    element.querySelectorAll<HTMLElement>('.sl-intro .sl-eyebrow, .sl-intro h1, .sl-intro p, .sl-intro-action')
      .forEach((target, index) => enter(target, Math.min(index, 3) * 55 + 45, true));

    const panels = Array.from(element.querySelectorAll<HTMLElement>(entranceTargets))
      .filter(target => !target.parentElement?.closest(entranceTargets))
      .filter(target => !target.closest('dialog, [role="dialog"], .restored-detail'))
      .slice(0, 16);
    panels.forEach((target, index) => enter(target, Math.min(140 + index * 50, compact ? 280 : 420)));

    // Forms and booking views without cards still get a quick, unobtrusive crossfade.
    if (!panels.length) {
      const animation = element.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 260, easing: ease });
      animation.id = 'dashboard-view-enter';
      animations.push(animation);
    }
    const cancel = () => animations.forEach(animation => animation.cancel());
    const onPreference = () => { if (preference.matches) cancel(); };
    // Keyboard or pointer interaction immediately reveals the active controls.
    element.addEventListener('focusin', cancel);
    preference.addEventListener('change', onPreference);
    return () => {
      cancel();
      element.removeEventListener('focusin', cancel);
      preference.removeEventListener('change', onPreference);
    };
  }, [view]);
  return ref;
}
