import type { CSSProperties, HTMLAttributes } from 'react';

// Scoped to the payment experience so existing dashboard surfaces keep their palette.
export default function PaymentGlass({ children, className = '', style, ...props }: HTMLAttributes<HTMLElement>) {
  return <section
    {...props}
    onPointerMove={event => {
      if (event.pointerType === 'touch') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--glass-x', `${event.clientX - bounds.left}px`);
      event.currentTarget.style.setProperty('--glass-y', `${event.clientY - bounds.top}px`);
    }}
    style={{ '--glass-x': '50%', '--glass-y': '0%', ...style } as CSSProperties}
    className={`relative isolate overflow-hidden rounded-[24px] border border-white/15 bg-gradient-to-br from-white/[0.09] via-[#131020]/70 to-[#0d1120]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(167,139,250,0.08),0_24px_70px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(400px_circle_at_var(--glass-x)_var(--glass-y),rgba(167,139,250,0.14),transparent_70%)] after:pointer-events-none after:absolute after:inset-px after:rounded-[inherit] after:border after:border-white/[0.035] ${className}`}
  >{children}</section>;
}
