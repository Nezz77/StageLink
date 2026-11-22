import { useBackendAccount } from './lib/BackendAccountContext';
import type { AccountRole } from './lib/apiSession';
import type { PackageChoice } from './lib/gigPackages';
import { useState, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Icon } from './components/Icons';
import LandingPage from './components/LandingPage';
import CustomerDashboard from './components/CustomerDashboard';
import ArtistDashboard from './components/ArtistDashboard';
import RenterDashboard from './components/RenterDashboard';
import BookingChat from './components/BookingChat';
import BookingWorkspace, { type WorkspaceSection } from './components/BookingWorkspace';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { BookingProvider } from './lib/BookingContext';
import { DashboardProvider } from './lib/DashboardContext';
import { requestDashboardNavigation } from './components/DashboardUI';
import { MarketplaceBridge, type MarketIntent } from './components/Marketplace';
import ConfirmDialog from './components/ConfirmDialog';
import { AppearanceProvider } from './lib/AppearanceContext';

type Role = 'visitor' | 'customer' | 'artist' | 'renter' | 'admin';
type View = 'main' | 'booking' | 'landing' | 'workspace';
type AuthType = 'login' | 'register_customer' | 'register_artist' | 'register_renter';
type ViewTransition = { finished: Promise<void> };
type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransition;
};

const roleConfig: Record<Role, { label: string; color: string; badgeClass: string }> = {
  visitor: { label: 'Visitor', color: '#94a3b8', badgeClass: 'badge-violet' },
  customer: { label: 'Customer', color: '#a78bfa', badgeClass: 'badge-violet' },
  artist: { label: 'Artist', color: '#fcd34d', badgeClass: 'badge-amber' },
  renter: { label: 'Equipment Renter', color: '#fcd34d', badgeClass: 'badge-amber' },
  admin: { label: 'Administrator', color: '#fb7185', badgeClass: 'badge-rose' },
};

function RoleSwitcher({ currentRole, onSwitch, inline = false, onSignIn }: { currentRole: Role; onSwitch: (r: Role) => void; inline?: boolean; onSignIn?: () => void }) {
  const [open, setOpen] = useState(false);
  const backend = useBackendAccount();
  const roles: Role[] = backend.connected ? backend.account?.roles ?? [] : ['visitor', 'customer', 'artist', 'renter', 'admin'];
  if (backend.connected && !backend.account) return <button type="button" className="btn-primary fixed bottom-6 right-6 z-50" disabled={backend.checking || backend.busy} onClick={onSignIn}>{backend.checking ? 'Checking account…' : 'Sign in'}</button>;
  return (
    <div className={inline ? 'relative z-50 sl-inline-role' : `fixed bottom-6 right-6 z-50 ${currentRole !== 'visitor' ? 'sl-app-controls' : ''}`}>
      {open && (
        <div className={`card p-2 w-52 animate-slide-up ${inline ? 'absolute right-0 top-full mt-3' : 'mb-3'}`}>
          <div className="text-xs text-slate-500 font-medium px-2 py-1 mb-1">{backend.connected ? backend.account?.displayName : 'Switch Role (Demo)'}</div>
          {roles.map(r => (
            <button
              key={r}
              onClick={() => { onSwitch(r); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${currentRole === r ? 'bg-violet-500/15 text-violet-300' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {roleConfig[r].label}
              {currentRole === r && <span className="ml-2 text-xs text-violet-500">● active</span>}
            </button>
          ))}
          {backend.connected && <button type="button" disabled={backend.busy} className="w-full text-left px-3 py-2 text-sm text-rose-300" onClick={() => { setOpen(false); void backend.signOut().catch(() => {}); }}>Sign out</button>}
        </div>
      )}
      <button
        type="button" disabled={backend.busy || backend.checking} aria-expanded={open} aria-label={backend.connected ? 'Account roles and sign out' : 'Switch demo role'}
        onClick={() => setOpen(!open)}
        className="btn-primary flex items-center gap-2 shadow-2xl glow-violet"
        style={{ borderRadius: 12 }}
      >
        <Icon.Users className="w-4 h-4" />
        <span className="text-sm">{roleConfig[currentRole].label}</span>
        <Icon.ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(0);
  useEffect(() => { const reset = () => { setSession(value => value + 1); setView('main'); setPendingMarket(null); setAdminTarget(undefined); setCustomerPrompt(false); }; window.addEventListener('stagelink:reset-demo', reset); return () => window.removeEventListener('stagelink:reset-demo', reset); }, []);
  const backend = useBackendAccount();
  const [demoRole, setDemoRole] = useState<Role>('visitor');
  const role: Role = backend.connected ? backend.account?.activeRole ?? 'visitor' : demoRole;
  const [view, setView] = useState<View>('main');
  const [adminTarget, setAdminTarget] = useState<{ id: string; key: number } | undefined>();
  const [bookingTab, setBookingTab] = useState<'chat' | 'checkout'>('chat');
  const [workspace, setWorkspace] = useState<{ section: WorkspaceSection; id?: string; serviceId?: string; packageChoice?: PackageChoice; inquiryId?: string; key: number }>({ section: 'bookings', key: 0 });
  const openWorkspace = (section: WorkspaceSection = 'bookings', id?: string) => { setWorkspace(previous => ({ section, id, key: previous.key + 1 })); setView('workspace'); };
  useEffect(() => { const openThread = (event: Event) => { const id = (event as CustomEvent<string>).detail; if (typeof id === 'string') { const run = () => openWorkspace('chat', id); if (window.dispatchEvent(new CustomEvent('stagelink:before-navigation', { detail: run, cancelable: true }))) run(); } }; window.addEventListener('stagelink:open-thread', openThread); return () => window.removeEventListener('stagelink:open-thread', openThread); }, []);
  useEffect(() => {
    const openUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; section: 'bookings' | 'payments' | 'chat' }>).detail;
      if (!detail || typeof detail.id !== 'string' || !['bookings', 'payments', 'chat'].includes(detail.section)) return;
      const run = () => {
        if (role === 'admin') { setAdminTarget(previous => ({ id: detail.id, key: (previous?.key ?? 0) + 1 })); setView('main'); }
        else openWorkspace(detail.section, detail.id);
      };
      const guard = new CustomEvent('stagelink:before-navigation', { detail: run, cancelable: true });
      if (window.dispatchEvent(guard)) run();
    };
    window.addEventListener('stagelink:open-update', openUpdate);
    return () => window.removeEventListener('stagelink:open-update', openUpdate);
  }, [role]);
  const [pendingMarket, setPendingMarket] = useState<MarketIntent | null>(null);
  const [customerPrompt, setCustomerPrompt] = useState(false);
  const marketBook = useCallback((serviceId: string, packageChoice: PackageChoice) => { setWorkspace(previous => ({ section: 'bookings', serviceId, packageChoice, key: previous.key + 1 })); setView('workspace'); }, []);
  const marketChat = useCallback((id?: string, inquiryId?: string) => { setWorkspace(previous => ({ section: 'chat', id, inquiryId, key: previous.key + 1 })); setView('workspace'); }, []);
  const marketDone = useCallback(() => setPendingMarket(null), []);
  useEffect(() => { const open = (event: Event) => { const id = (event as CustomEvent<string>).detail; if (typeof id === 'string') requestDashboardNavigation(() => marketChat(undefined, id)); }; window.addEventListener('stagelink:open-inquiry', open); return () => window.removeEventListener('stagelink:open-inquiry', open); }, [marketChat]);
  const [authMode, setAuthMode] = useState<AuthType | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isSplashLogoTransition, setIsSplashLogoTransition] = useState(false);

  const handleThemeChange = (nextIsDark: boolean, event: ReactMouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    root.style.setProperty('--theme-origin-x', `${event.clientX}px`);
    root.style.setProperty('--theme-origin-y', `${event.clientY}px`);
    root.dataset.themeTransition = 'true';

    const updateTheme = () => {
      flushSync(() => setIsDark(nextIsDark));
      root.dataset.theme = nextIsDark ? 'dark' : 'light';
    };

    const canAnimate = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    const startViewTransition = (document as DocumentWithViewTransition).startViewTransition;
    if (canAnimate && startViewTransition) {
      const transition = startViewTransition.call(document, updateTheme);
      void transition.finished.then(
        () => delete root.dataset.themeTransition,
        () => delete root.dataset.themeTransition,
      );
    } else {
      updateTheme();
      delete root.dataset.themeTransition;
    }
  };

  const handleSplashComplete = useCallback(() => {
    flushSync(() => {
      setIsSplashLogoTransition(true);
      setIsLoaded(true);
    });
    window.setTimeout(() => setIsSplashLogoTransition(false), 2200);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = (r: string) => {
    if (!backend.connected) setDemoRole(r as Role);
    setAuthMode(null);
    setView('main');
  };

  const handleRoleSwitch = (r: Role) => {
    requestDashboardNavigation(() => {
      if (backend.connected) {
        if (r === 'visitor') { void backend.signOut().catch(() => {}); return; }
        void backend.changeRole(r as AccountRole).then(() => setView('main')).catch(() => {});
      } else { setDemoRole(r); setView('main'); }
    });
  };

  useEffect(() => {
    if (!backend.connected) return;
    setSession(value => value + 1); setView('main'); setAdminTarget(undefined); setCustomerPrompt(false);
    if (backend.account) setAuthMode(null); else setPendingMarket(null);
  }, [backend.connected, backend.account?.id]);
  const control = (inline = false) => <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} inline={inline} onSignIn={() => { setView('landing'); setAuthMode('login'); }} />;
  const canSwitchCustomer = !backend.connected || backend.account?.roles.includes('customer');

  return (
    <AppearanceProvider isDark={isDark} onThemeChange={handleThemeChange}>
    <DashboardProvider key={`${backend.account?.id ?? 'preview'}:${session}`} actor={role}>
      <BookingProvider actor={role}>
      <MarketplaceBridge actor={role} pending={pendingMarket} onDone={marketDone} onBook={marketBook} onChat={marketChat} onNeedCustomer={intent => { setPendingMarket(intent); if (role === 'visitor') setAuthMode('login'); else setCustomerPrompt(true); }} />
      {customerPrompt && <ConfirmDialog title={backend.connected ? canSwitchCustomer ? 'Switch to your customer role?' : 'Customer access required' : 'Continue as the demo customer?'} confirm={canSwitchCustomer ? backend.connected ? 'Switch to customer' : 'Use customer demo' : 'Close'} onClose={() => { setCustomerPrompt(false); setPendingMarket(null); }} onConfirm={() => { setCustomerPrompt(false); if (canSwitchCustomer) handleRoleSwitch('customer'); else setPendingMarket(null); }}>{canSwitchCustomer ? 'Bookings and enquiries use your customer role.' : 'This account does not include customer access. Sign in with an account that has customer membership to book.'}</ConfirmDialog>}
      {backend.error && <div className="sl-account-error" role="alert"><span>{backend.error}</span><button type="button" onClick={backend.retry} disabled={backend.busy || backend.checking}>Try again</button><button type="button" aria-label="Dismiss account notice" onClick={backend.dismiss}>×</button></div>}
      <LayoutGroup id="stagelink-brand">
        <AnimatePresence>
          {!isLoaded && <SplashScreen key="splash" onComplete={handleSplashComplete} />}
        </AnimatePresence>

        {isLoaded && (
          <div className={`theme-root min-h-screen transition-colors duration-500 ease-in-out ${view === 'booking' ? 'sl-chat-open' : ''}`} style={{ background: 'var(--color-bg)' }}>
            {/* Booking Chat accessible to customer/artist */}
            {view === 'workspace' && ['customer', 'artist', 'renter'].includes(role) ? (
              <BookingWorkspace roleControl={control(true)} key={workspace.key} initialSection={workspace.section} initialBookingId={workspace.id} initialServiceId={workspace.serviceId} initialPackageChoice={workspace.packageChoice} initialInquiryId={workspace.inquiryId} onBack={() => setView('main')} onGoToLanding={() => setView('landing')} />
            ) : (role === 'customer' || role === 'artist') && view === 'booking' ? (
              <BookingChat initialTab={bookingTab} onBack={() => setView('main')} />
            ) : role === 'visitor' || view === 'landing' ? (
              <>
                <LandingPage
                  onAuth={setAuthMode}
                  isDark={isDark}
                  onThemeChange={handleThemeChange}
                  isSplashLogoTransition={isSplashLogoTransition}
                  onReturnToDashboard={role !== 'visitor' ? () => setView('main') : undefined}
                />
                {authMode && (
                  <AuthModal
                    initialMode={authMode}
                    onClose={() => { setAuthMode(null); setPendingMarket(null); }}
                    onSuccess={handleLogin}
                  />
                )}
              </>
            ) : role === 'customer' ? (
              <CustomerDashboard roleControl={control(true)} onOpenBooking={() => openWorkspace('bookings')} onOpenPayments={() => openWorkspace('payments')} onOpenChat={() => openWorkspace('chat')} onGoToLanding={() => setView('landing')} />
            ) : role === 'artist' ? (
              <ArtistDashboard roleControl={control(true)} onOpenWorkspace={openWorkspace} onGoToLanding={() => setView('landing')} />
            ) : role === 'renter' ? (
              <RenterDashboard roleControl={control(true)} onOpenWorkspace={openWorkspace} onGoToLanding={() => setView('landing')} />
            ) : (
              <AdminDashboard paymentTarget={adminTarget} roleControl={control(true)} onGoToLanding={() => setView('landing')} />
            )}

            {(role === 'visitor' || view === 'landing' || view === 'booking') && control()}
          </div>
        )}
      </LayoutGroup>
    </BookingProvider>
    </DashboardProvider>
    </AppearanceProvider>
  );
}
