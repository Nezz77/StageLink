import { useState, useEffect } from 'react';
import { Icon } from './components/Icons';
import LandingPage from './components/LandingPage';
import CustomerDashboard from './components/CustomerDashboard';
import ArtistDashboard from './components/ArtistDashboard';
import RenterDashboard from './components/RenterDashboard';
import BookingChat from './components/BookingChat';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';
import { BookingProvider } from './lib/BookingContext';

type Role = 'visitor' | 'customer' | 'artist' | 'renter' | 'admin';
type View = 'main' | 'booking';
type AuthType = 'login' | 'register_customer' | 'register_artist' | 'register_renter';

const roleConfig: Record<Role, { label: string; color: string; badgeClass: string }> = {
  visitor: { label: 'Visitor', color: '#94a3b8', badgeClass: 'badge-violet' },
  customer: { label: 'Customer', color: '#a78bfa', badgeClass: 'badge-violet' },
  artist: { label: 'Artist', color: '#fcd34d', badgeClass: 'badge-amber' },
  renter: { label: 'Equipment Renter', color: '#fcd34d', badgeClass: 'badge-amber' },
  admin: { label: 'Administrator', color: '#fb7185', badgeClass: 'badge-rose' },
};

function RoleSwitcher({ currentRole, onSwitch }: { currentRole: Role; onSwitch: (r: Role) => void }) {
  const [open, setOpen] = useState(false);
  const roles: Role[] = ['visitor', 'customer', 'artist', 'renter', 'admin'];
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${currentRole !== 'visitor' ? 'sl-app-controls' : ''}`}>
      {open && (
        <div className="card mb-3 p-2 w-52 animate-slide-up">
          <div className="text-xs text-slate-500 font-medium px-2 py-1 mb-1">Switch Role (Demo)</div>
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
        </div>
      )}
      <button
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
  const [role, setRole] = useState<Role>('visitor');
  const [view, setView] = useState<View>('main');
  const [bookingTab, setBookingTab] = useState<'chat' | 'checkout'>('chat');
  const [authMode, setAuthMode] = useState<AuthType | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = (r: string) => {
    setRole(r as Role);
    setAuthMode(null);
  };

  const handleRoleSwitch = (r: Role) => {
    setRole(r);
    setView('main');
  };

  return (
    <BookingProvider actor={role}>
      <AnimatePresence>
        {!isLoaded && <SplashScreen key="splash" onComplete={() => setIsLoaded(true)} />}
      </AnimatePresence>

      {isLoaded && (
        <div className={`min-h-screen transition-colors duration-500 ease-in-out ${view === 'booking' ? 'sl-chat-open' : ''}`} style={{ background: 'var(--color-bg)' }}>
          {/* Booking Chat accessible to customer/artist */}
          {(role === 'customer' || role === 'artist') && view === 'booking' ? (
            <BookingChat initialTab={bookingTab} onBack={() => setView('main')} />
          ) : role === 'visitor' ? (
            <>
              <LandingPage onAuth={setAuthMode} />
              {authMode && (
                <AuthModal
                  initialMode={authMode}
                  onClose={() => setAuthMode(null)}
                  onSuccess={handleLogin}
                />
              )}
            </>
          ) : role === 'customer' ? (
            <>
              <CustomerDashboard onOpenBooking={() => { setBookingTab('checkout'); setView('booking'); }} onOpenChat={() => { setBookingTab('chat'); setView('booking'); }} />
              <button
                onClick={() => { setBookingTab('chat'); setView('booking'); }}
                className="sl-chat-shortcut fixed bottom-24 right-6 z-50 btn-primary text-xs flex items-center gap-2 shadow-2xl glow-violet"
                style={{ borderRadius: 12 }}
              >
                <Icon.MessageCircle className="w-4 h-4" />
                Open Chat
              </button>
            </>
          ) : role === 'artist' ? (
            <>
              <ArtistDashboard />
              <button
                onClick={() => { setBookingTab('chat'); setView('booking'); }}
                className="sl-chat-shortcut fixed bottom-24 right-6 z-50 btn-primary text-xs flex items-center gap-2 shadow-2xl glow-violet"
                style={{ borderRadius: 12 }}
              >
                <Icon.MessageCircle className="w-4 h-4" />
                Open Chat
              </button>
            </>
          ) : role === 'renter' ? (
            <RenterDashboard />
          ) : (
            <AdminDashboard />
          )}

          <RoleSwitcher currentRole={role} onSwitch={handleRoleSwitch} />
        </div>
      )}
    </BookingProvider>
  );
}
