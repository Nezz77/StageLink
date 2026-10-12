import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { Icon } from './Icons';
import '../vendor/liquid-glass.js';
import '../dashboard.css';
import '../signed-in-motion.css';
import { usePanelEntrance } from './usePanelEntrance';

type GlassInstance = { destroy: () => void; refresh: () => void; supported: boolean };
declare global {
  interface Window {
    liquidGlass: (element: HTMLElement, options?: { scale?: number; chroma?: number; blur?: number; border?: number; fallbackBlur?: number }) => GlassInstance;
  }
}

/** A small optical surface. Large content panels use CSS frost to limit GPU cost. */
export function GlassSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let glass: GlassInstance | undefined;
    const update = () => {
      glass?.destroy();
      glass = undefined;
      if (!preference.matches) glass = window.liquidGlass(element, { scale: -48, chroma: 1.5, blur: 10, border: .14, fallbackBlur: 18 });
    };
    update();
    preference.addEventListener('change', update);
    return () => { glass?.destroy(); preference.removeEventListener('change', update); };
  }, []);
  return <div ref={ref} className={`sl-glass ${className}`}>{children}</div>;
}

export type DashboardNav = { id: string; label: string; icon: ComponentType<{ className?: string }>; count?: number };
const identities = {
  customer: { title: 'Your backstage', name: 'Jordan Rivera', initials: 'JR', tag: 'Event organizer', note: 'Great nights start here.' },
  artist: { title: 'Artist studio', name: 'Aria Nova', initials: 'AN', tag: 'Verified artist', note: 'Make your next encore.' },
  renter: { title: 'Equipment studio', name: 'AudioVault Rentals', initials: 'AV', tag: 'Verified rental partner', note: 'Behind every great show.' },
  admin: { title: 'Control room', name: 'StageLink Admin', initials: 'AD', tag: 'Platform operations', note: 'Keep the show running.' },
};

export default function DashboardShell({ role, navItems, activeTab, onNavigate, onOpenChat, children }: {
  role: keyof typeof identities; navItems: DashboardNav[]; activeTab: string;
  onNavigate: (tab: string) => void; onOpenChat?: () => void; children: ReactNode;
}) {
  const identity = identities[role];
  const contentRef = usePanelEntrance(activeTab);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [activeTab, role]);
  return <MotionConfig reducedMotion="user">
    <div className={`sl-dashboard sl-${role}`}>
      <a className="sl-skip" href="#dashboard-content">Skip to dashboard</a>
      <aside className="sl-sidebar">
        <button className="sl-brand" onClick={() => onNavigate(navItems[0].id)} aria-label="StageLink dashboard home">
          <span className="sl-brand-icon"><Icon.Music /></span><span>stage<span className="sl-brand-light">link</span><sup>®</sup></span>
        </button>
        <div className="sl-sidebar-caption">{identity.title}</div>
        <nav className="sl-navigation" aria-label={`${identity.title} navigation`}>
          {navItems.map((item, index) => <button key={item.id} onClick={() => onNavigate(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`sl-nav-item ${activeTab === item.id ? 'is-active' : ''}`}>
            <item.icon className="sl-nav-icon" /><span>{item.label}</span>
            {item.count ? <span className="sl-nav-count">{item.count}</span> : <span className="sl-nav-index">0{index + 1}</span>}
          </button>)}
        </nav>
        {role !== 'admin' && <GlassSurface className="sl-access-pass">
          <span className="sl-eyebrow">ALL ACCESS</span>
          <div className="sl-pass-symbol" aria-hidden="true">✳</div>
          <p>{identity.note}</p><div className="sl-barcode" aria-hidden="true" />
          <span className="sl-pass-id">STAGELINK / {role.toUpperCase()}</span>
        </GlassSurface>}
        <div className="sl-account"><span className="sl-avatar">{identity.initials}</span><div><strong>{identity.name}</strong><small>{identity.tag}</small></div></div>
      </aside>
      <div className="sl-workspace">
        <header className="sl-topbar">
          <div><span className="sl-topbar-label">WORKSPACE</span><span className="sl-topbar-divider">/</span><span>{navItems.find(item => item.id === activeTab)?.label ?? 'Discover'}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="sl-demo-indicator"><i /> Demo workspace</span>
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                aria-label="Open booking chat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  background: 'rgba(124,58,237,0.18)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: '1px solid rgba(124,58,237,0.45)',
                  color: '#c4b5fd',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 12px rgba(124,58,237,0.25)',
                  transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  const t = e.currentTarget;
                  t.style.background = 'rgba(124,58,237,0.30)';
                  t.style.borderColor = 'rgba(167,139,250,0.65)';
                  t.style.color = '#ede9fe';
                  t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 3px rgba(124,58,237,0.14), 0 6px 22px rgba(124,58,237,0.40)';
                  t.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  const t = e.currentTarget;
                  t.style.background = 'rgba(124,58,237,0.18)';
                  t.style.borderColor = 'rgba(124,58,237,0.45)';
                  t.style.color = '#c4b5fd';
                  t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 12px rgba(124,58,237,0.25)';
                  t.style.transform = 'translateY(0)';
                }}
              >
                <Icon.MessageCircle className="w-3.5 h-3.5" />
                Open Chat
              </button>
            )}
          </div>
        </header>
        <main ref={contentRef} id="dashboard-content" className="sl-main" tabIndex={-1}>{children}</main>
        <footer className="sl-footer"><span>STAGELINK</span><span>Made for moments that matter.</span><span>BACKSTAGE / 2026</span></footer>
      </div>
    </div>
  </MotionConfig>;
}

export function DashboardIntro({ eyebrow, title, emphasis, description, action }: { eyebrow: string; title: string; emphasis: string; description: string; action?: ReactNode }) {
  return <div className="sl-intro"><div><div className="sl-eyebrow"><span className="sl-line" />{eyebrow}</div><h1>{title} <em>{emphasis}</em></h1><p>{description}</p></div>{action && <div className="sl-intro-action">{action}</div>}</div>;
}
