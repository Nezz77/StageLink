import { useEffect, useRef, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, Sun, Moon } from 'lucide-react';
import { useAppearance } from '../lib/AppearanceContext';
import { useBooking } from '../lib/BookingContext';
import { unreadFor, visibleTo } from '../lib/pipeline';
import { inquiryUnread } from '../lib/community';
import { Icon } from './Icons';
import '../vendor/liquid-glass.js';
import '../dashboard.css';
import '../signed-in-motion.css';
import NotificationCenter from './NotificationCenter';
import { useDashboard } from '../lib/DashboardContext';
import '../management.css';
import '../sidebar.css';
import { usePanelEntrance } from './usePanelEntrance';

type GlassInstance = { destroy: () => void; refresh: () => void; supported: boolean };

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
  artist: { title: 'Artist studio', name: 'Aria Nova', initials: 'AN', tag: 'Artist demo account', note: 'Make your next encore.' },
  renter: { title: 'Equipment studio', name: 'AudioVault Rentals', initials: 'AV', tag: 'Rental demo account', note: 'Behind every great show.' },
  admin: { title: 'Control room', name: 'StageLink Admin', initials: 'AD', tag: 'Platform operations', note: 'Keep the show running.' },
};

export default function DashboardShell({ role, navItems, activeTab, onNavigate, onGoToLanding, onOpenChat, controls, children }: {
  role: keyof typeof identities; navItems: DashboardNav[]; activeTab: string;
  onNavigate: (tab: string) => void; onGoToLanding?: () => void; onOpenChat?: () => void; controls?: ReactNode; children: ReactNode;
}) {
  const { state: dashboard } = useDashboard();
  const { state: bookings } = useBooking();
  const { collapsed, toggleSidebar, isDark, onThemeChange } = useAppearance();
  const unreadMessages = role === 'admin' ? 0 :
    bookings.bookings.filter(record => visibleTo(record, role)).reduce((sum, record) => sum + unreadFor(bookings, record, role), 0) +
    dashboard.inquiries.filter(item => role === 'customer' || item.provider === role).reduce((sum, item) => sum + inquiryUnread(item, role), 0);
  const profile = role === 'admin' ? null : dashboard.profiles[role];
  const identity = { ...identities[role], ...(profile ? { name: profile.name, initials: profile.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('') } : {}) };
  if ((role === 'artist' || role === 'renter') && dashboard.cases.some(item => item.owner === role && item.kind === 'verification' && item.status === 'approved')) identity.tag = 'Profile reviewed in demo';
  const contentRef = usePanelEntrance(`${role}:${activeTab}`);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [activeTab, role]);
  return <MotionConfig reducedMotion="user">
    <div className={`sl-dashboard sl-${role}${collapsed ? ' sl-sidebar-collapsed' : ''}`} data-dashboard-view={activeTab}>
      <div key={role} className="sl-arrival-light" aria-hidden="true" />
      <a className="sl-skip" href="#dashboard-content">Skip to dashboard</a>
      <aside className="sl-sidebar" aria-label={`${identity.title} sidebar`}>
        <div className="sl-sidebar-head">
          <button className="sl-brand" onClick={() => onNavigate(navItems[0].id)} aria-label="StageLink dashboard home">
            <img className="sl-brand-logo" src="/stagelink-logo.png" alt="StageLink" />
          </button>
          <button className="sl-sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="dashboard-sidebar-navigation" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}
          </button>
        </div>
        <div className="sl-sidebar-caption">{identity.title}</div>
        <nav id="dashboard-sidebar-navigation" className="sl-navigation" aria-label={`${identity.title} navigation`}>
          {navItems.map((item, index) => {
            const count = ['messages', 'chat'].includes(item.id) ? unreadMessages : item.count ?? 0;
            const label = count > 0 ? `${item.label}, ${count} updates` : item.label;
            return <button key={item.id} style={{ '--sl-nav-order': Math.min(index, 9) } as CSSProperties} onClick={() => onNavigate(item.id)} aria-label={label} title={collapsed ? label : undefined} aria-current={activeTab === item.id ? 'page' : undefined} className={`sl-nav-item ${activeTab === item.id ? 'is-active' : ''}`}>
              <item.icon className="sl-nav-icon" /><span className="sl-nav-label">{item.label}</span>
              {count > 0 ? <span className="sl-nav-count" aria-hidden="true">{count > 99 ? '99+' : count}</span> : <span className="sl-nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
            </button>;
          })}
        </nav>
        <div className="sl-sidebar-tools">
          <button className="sl-theme-toggle" onClick={event => onThemeChange(!isDark, event)} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} title={collapsed ? `Switch to ${isDark ? 'light' : 'dark'} mode` : undefined}>
            {isDark ? <Sun className="sl-nav-icon" aria-hidden="true" /> : <Moon className="sl-nav-icon" aria-hidden="true" />}<span className="sl-nav-label">{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          {onGoToLanding && <button className="sl-public-site-link" onClick={onGoToLanding} aria-label="Landing page" title={collapsed ? 'Landing page' : undefined}><Icon.Home className="sl-nav-icon" /><span className="sl-nav-label">Landing page</span><span className="sl-nav-index" aria-hidden="true">↗</span></button>}
        </div>
        {role !== 'admin' && <GlassSurface className="sl-access-pass">
          <span className="sl-eyebrow">ALL ACCESS</span>
          <div className="sl-pass-symbol" aria-hidden="true">✳</div>
          <p>{identity.note}</p><div className="sl-barcode" aria-hidden="true" />
          <span className="sl-pass-id">STAGELINK / {role.toUpperCase()}</span>
        </GlassSurface>}
        <div className="sl-account" title={collapsed ? identity.name : undefined}><span className="sl-avatar">{identity.initials}</span><div className="sl-account-details"><strong>{identity.name}</strong><small>{identity.tag}</small></div></div>
      </aside>
      <div className="sl-workspace">
        <header className="sl-topbar">
          <div><span className="sl-topbar-label">WORKSPACE</span><span className="sl-topbar-divider">/</span><span>{navItems.find(item => item.id === activeTab)?.label ?? 'Discover'}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="sl-demo-indicator"><i /> Demo workspace</span>
            <NotificationCenter />
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="sl-open-chat"
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
            {controls}
          </div>
        </header>
        <main ref={contentRef} id="dashboard-content" className="sl-main" tabIndex={-1}>
          {dashboard.maintenance && <div className="mg-workspace-banner mg-maintenance-banner" role="status"><strong>Maintenance preview</strong>The demo is showing a maintenance notice. You can continue exploring the workspace.</div>}
          {dashboard.announcement && <div className="mg-workspace-banner" role="status"><strong>From the StageLink team · Demo announcement</strong>{dashboard.announcement}</div>}
{children}</main>
        <footer className="sl-footer"><span>STAGELINK</span><span>Made for moments that matter.</span><span>BACKSTAGE / 2026</span></footer>
      </div>
    </div>
  </MotionConfig>;
}

export function DashboardIntro({ eyebrow, title, emphasis, description, action }: { eyebrow: string; title: string; emphasis: string; description: string; action?: ReactNode }) {
  return <div className="sl-intro"><div><div className="sl-eyebrow"><span className="sl-line" />{eyebrow}</div><h1>{title} <em>{emphasis}</em></h1><p>{description}</p></div>{action && <div className="sl-intro-action">{action}</div>}</div>;
}
