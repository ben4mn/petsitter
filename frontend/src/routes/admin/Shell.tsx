import { NavLink, Outlet } from 'react-router-dom';

export function AdminShell() {
  return (
    <div className="space-y-6 fadein">
      <header>
        <div className="text-[12px] uppercase tracking-widest text-ink-3">Admin</div>
        <h1 className="font-display text-[30px] leading-tight font-semibold text-ink mt-0.5">Manage trip</h1>
      </header>
      <div className="flex gap-2 border-b border-rule">
        <Tab to="/admin/trip">Trip</Tab>
        <Tab to="/admin/allowlist">Allowlist</Tab>
      </div>
      <Outlet />
    </div>
  );
}

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-2.5 -mb-px border-b-2 text-[14px] font-medium transition-colors no-tap ${
          isActive ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
