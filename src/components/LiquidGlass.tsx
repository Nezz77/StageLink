import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

declare global {
  interface Window {
    liquidGlass: (
      el: HTMLElement,
      opts?: {
        scale?: number;
        chroma?: number;
        border?: number;
        mapBlur?: number;
        blur?: number;
        saturate?: number;
        radius?: number | null;
        fallbackBlur?: number;
      }
    ) => { supported: boolean; refresh: () => void; destroy: () => void };
  }
}

interface LiquidGlassOptions {
  scale?: number;
  chroma?: number;
  border?: number;
  mapBlur?: number;
  blur?: number;
  saturate?: number;
  radius?: number | null;
  fallbackBlur?: number;
}

/**
 * React hook to apply liquid glass to any element ref.
 */
export function useLiquidGlass<T extends HTMLElement>(opts?: LiquidGlassOptions) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.liquidGlass !== 'function') return;

    const glass = window.liquidGlass(el, opts);
    return () => glass.destroy();
  }, []);

  return ref;
}

/**
 * Wrapper component that applies liquid glass to its children container.
 */
interface LiquidGlassProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  opts?: LiquidGlassOptions;
}

export default function LiquidGlass({ children, className = '', style, opts }: LiquidGlassProps) {
  const ref = useLiquidGlass<HTMLDivElement>(opts);

  return (
    <div
      ref={ref}
      className={`liquid-glass ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
