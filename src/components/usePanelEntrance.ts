import { useEffect, useRef } from 'react';

/** Replay a short entrance without remounting forms or losing dashboard state. */
export function usePanelEntrance(view: string) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || preference.matches) return;
    const animation = element.animate(
      [{ opacity: 0.4, translate: '0 10px' }, { opacity: 1, translate: '0 0' }],
      { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
    const cancel = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener('change', cancel);
    return () => { animation.cancel(); preference.removeEventListener('change', cancel); };
  }, [view]);
  return ref;
}
