import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { WelcomeOverlay, hasSeenWelcome } from './WelcomeOverlay';

const navItems = [
  { to: '/today', label: 'Today' },
  { to: '/summary', label: 'Summary' },
  { to: '/notifications', label: 'Notifications' },
];

const ownerItems = [{ to: '/admin', label: 'Admin' }];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const items = user?.role === 'owner' ? [...navItems, ...ownerItems] : navItems;

  // Auto-show the welcome modal on first visit per device.
  // The `?` button in the header re-opens it on demand.
  useEffect(() => {
    if (!hasSeenWelcome()) setWelcomeOpen(true);
  }, []);

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <NavLink to="/today" className="flex items-baseline gap-2">
            <span className="font-display text-[22px] font-semibold tracking-tight text-ink">Petsitter</span>
            <span className="text-[11px] uppercase tracking-widest text-ink-3 hidden xs:inline">house notes</span>
          </NavLink>
          {user && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWelcomeOpen(true)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-rule text-ink-3 hover:text-ink hover:border-ink-2 no-tap transition-colors"
                aria-label="Show welcome tips"
                title="Tips"
              >
                <span className="font-semibold text-[13px] leading-none">?</span>
              </button>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="text-sm text-ink-2 hover:text-ink no-tap"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8">{children}</div>
      </main>

      <nav className="sticky bottom-0 border-t border-rule bg-bg/95 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <div className="mx-auto max-w-3xl px-2 flex">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                `flex-1 text-center py-3 text-[13px] tracking-wide no-tap ${
                  isActive ? 'text-accent font-semibold' : 'text-ink-2 hover:text-ink'
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {welcomeOpen && <WelcomeOverlay onClose={() => setWelcomeOpen(false)} />}
    </div>
  );
}
