import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/today', label: 'Today' },
  { to: '/summary', label: 'Summary' },
  { to: '/notifications', label: 'Notifications' },
];

const ownerItems = [{ to: '/admin', label: 'Admin' }];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = user?.role === 'owner' ? [...navItems, ...ownerItems] : navItems;

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <NavLink to="/today" className="flex items-baseline gap-2">
            <span className="font-display text-[22px] font-semibold tracking-tight text-ink">Petsitter</span>
            <span className="text-[11px] uppercase tracking-widest text-ink-3">house notes</span>
          </NavLink>
          {user && (
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="text-sm text-ink-2 hover:text-ink no-tap"
            >
              Sign out
            </button>
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
    </div>
  );
}
