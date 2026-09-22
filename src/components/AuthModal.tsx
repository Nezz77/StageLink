import { useState, useEffect } from 'react';
import { Icon } from './Icons';

type AuthType = 'login' | 'register_customer' | 'register_artist' | 'register_renter';

interface AuthModalProps {
  initialMode: AuthType;
  onClose: () => void;
  onSuccess: (role: string) => void;
}

/* ─── Social icon (inline SVG) ────────────────────────────── */
function SocialIcon({ d, label }: { d: string; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      onClick={e => e.preventDefault()}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{
        border: '1px solid rgba(124,58,237,0.35)',
        color: '#a78bfa',
      }}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d={d} />
      </svg>
    </a>
  );
}

const socialIcons = [
  { label: 'Google', d: 'M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.98 2.34-2.09 3.06l3.38 2.63c1.97-1.82 3.11-4.5 3.11-7.65 0-.53-.05-1.04-.14-1.54l-.59.77zm-9.18 10.07c2.55 0 4.69-.84 6.25-2.29l-3.38-2.63c-.84.56-1.92.89-2.87.89-2.21 0-4.08-1.49-4.75-3.5l-3.44 2.66c1.57 3.1 4.79 5.23 8.19 4.87zm-4.75-8.53c-.17-.52-.27-1.07-.27-1.64s.1-1.12.27-1.64L4.08 6.7A9.82 9.82 0 0 0 3 11c0 1.57.38 3.06 1.08 4.38l3.34-2.74zM12.17 5.04c1.24 0 2.35.43 3.23 1.27l2.42-2.42C16.36 2.59 14.22 1.73 12.17 1.73c-3.4 0-6.33 1.95-7.76 4.8l3.44 2.66c.67-2.01 2.54-4.15 4.32-4.15z' },
  { label: 'Facebook', d: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z' },
  { label: 'Apple', d: 'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.02 8.87 8.72c1.26.07 2.14.72 2.88.78.95-.19 1.86-.88 2.96-.8 1.52.12 2.66.7 3.43 1.92-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.57 4.53zM12.03 8.65c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z' },
];

export default function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const isInitiallySignUp = initialMode.startsWith('register');
  const [rightPanelActive, setRightPanelActive] = useState(isInitiallySignUp);
  const [mounted, setMounted] = useState(false);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'customer' | 'artist' | 'renter'>(
    initialMode === 'register_artist' ? 'artist' :
    initialMode === 'register_renter' ? 'renter' : 'customer'
  );

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess('customer');
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(signupRole);
  };

  /* shared input style */
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    width: '100%',
    fontSize: 13,
    color: '#f1f5f9',
    outline: 'none',
    marginBottom: 10,
    transition: 'border-color 0.2s',
  };

  const solidBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '10px 40px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    marginTop: 8,
  };

  const ghostBtnStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: '10px 40px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Main container ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 820,
          minHeight: 480,
          margin: '0 16px',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.15)',
          overflow: 'hidden',
          background: '#0d1120',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 100,
            background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <Icon.X className="w-4 h-4" />
        </button>

        {/* ═══════════════ SIGN IN FORM (left side) ═══════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.6s ease-in-out',
            transform: rightPanelActive ? 'translateX(100%)' : 'translateX(0)',
            opacity: rightPanelActive ? 0 : 1,
            zIndex: rightPanelActive ? 1 : 5,
          }}
        >
          <form
            onSubmit={handleSignIn}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 40px',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: 16,
              }}
            >
              Sign In
            </h1>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {socialIcons.map(s => (
                <SocialIcon key={s.label} {...s} />
              ))}
            </div>

            <span style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              or use your account
            </span>

            <input
              type="email"
              placeholder="Email Address"
              required
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)')}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)')}
            />

            <a
              href="#"
              onClick={e => e.preventDefault()}
              style={{
                fontSize: 12,
                color: '#a78bfa',
                textDecoration: 'none',
                marginBottom: 12,
                transition: 'color 0.2s',
              }}
            >
              Forgot your password?
            </a>

            <button type="submit" style={solidBtnStyle}>
              SIGN IN
            </button>
          </form>
        </div>

        {/* ═══════════════ SIGN UP FORM (right side) ═══════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.6s ease-in-out',
            transform: rightPanelActive ? 'translateX(100%)' : 'translateX(200%)',
            opacity: rightPanelActive ? 1 : 0,
            zIndex: rightPanelActive ? 5 : 1,
          }}
        >
          <form
            onSubmit={handleSignUp}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 40px',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: 16,
              }}
            >
              Create Account
            </h1>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {socialIcons.map(s => (
                <SocialIcon key={s.label} {...s} />
              ))}
            </div>

            <span style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              or use your email for registration
            </span>

            <input
              type="text"
              placeholder="Full Name"
              value={signupName}
              onChange={e => setSignupName(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)')}
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={signupEmail}
              onChange={e => setSignupEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)')}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={signupPassword}
              onChange={e => setSignupPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)')}
            />

            {/* Role selector */}
            <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 8 }}>
              {([
                { value: 'customer' as const, label: 'Customer' },
                { value: 'artist' as const, label: 'Artist' },
                { value: 'renter' as const, label: 'Renter' },
              ]).map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSignupRole(r.value)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: signupRole === r.value
                      ? '1px solid #7c3aed'
                      : '1px solid rgba(124,58,237,0.2)',
                    background: signupRole === r.value
                      ? 'rgba(124,58,237,0.15)'
                      : 'transparent',
                    color: signupRole === r.value ? '#a78bfa' : '#64748b',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button type="submit" style={solidBtnStyle}>
              SIGN UP
            </button>
          </form>
        </div>

        {/* ═══════════════ SLIDING OVERLAY ═══════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: '50%',
            height: '100%',
            overflow: 'hidden',
            transition: 'transform 0.6s ease-in-out',
            transform: rightPanelActive ? 'translateX(-100%)' : 'translateX(0)',
            zIndex: 10,
            borderRadius: rightPanelActive ? '0 16px 16px 0' : '16px 0 0 16px',
          }}
        >
          {/* Gradient background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #6d28d9 100%)',
            }}
          />

          {/* Subtle pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 30% 70%, rgba(245,158,11,0.15) 0%, transparent 50%)',
            }}
          />

          {/* Inner sliding wrapper (200% width, slides 50%) */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              width: '200%',
              height: '100%',
              transition: 'transform 0.6s ease-in-out',
              transform: rightPanelActive ? 'translateX(0)' : 'translateX(-50%)',
            }}
          >
            {/* LEFT OVERLAY PANEL — "Welcome Back!" */}
            <div
              style={{
                width: '50%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 40px',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 16,
                }}
              >
                Welcome Back!
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6,
                  marginBottom: 28,
                  maxWidth: 260,
                }}
              >
                Stay connected by logging in with your credentials and continue your StageLink experience
              </p>
              <button
                style={ghostBtnStyle}
                onClick={() => setRightPanelActive(false)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                SIGN IN
              </button>
            </div>

            {/* RIGHT OVERLAY PANEL — "Hey There!" */}
            <div
              style={{
                width: '50%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 40px',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 16,
                }}
              >
                Hey There!
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6,
                  marginBottom: 28,
                  maxWidth: 260,
                }}
              >
                Begin your amazing journey by creating an account with us today
              </p>
              <button
                style={ghostBtnStyle}
                onClick={() => setRightPanelActive(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
