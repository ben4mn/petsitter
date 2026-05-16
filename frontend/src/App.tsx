import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { Login } from './routes/login';
import { Register } from './routes/register';
import { Onboarding } from './routes/onboarding';
import { Today } from './routes/today';
import { Summary } from './routes/summary';
import { Notifications } from './routes/notifications';
import { AdminTrip } from './routes/admin/trip';
import { AdminAllowlist } from './routes/admin/allowlist';
import { AdminShell } from './routes/admin/Shell';

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function OwnerOnly({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/today" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-full flex items-center justify-center text-ink-3 text-sm">
      <span className="fadein">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/onboarding"
          element={
            <Protected>
              <Onboarding />
            </Protected>
          }
        />
        <Route
          path="/today"
          element={
            <Protected>
              <Shell>
                <Today />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/summary"
          element={
            <Protected>
              <Shell>
                <Summary />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/notifications"
          element={
            <Protected>
              <Shell>
                <Notifications />
              </Shell>
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <OwnerOnly>
              <Shell>
                <AdminShell />
              </Shell>
            </OwnerOnly>
          }
        >
          <Route index element={<AdminTrip />} />
          <Route path="trip" element={<AdminTrip />} />
          <Route path="allowlist" element={<AdminAllowlist />} />
        </Route>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AuthProvider>
  );
}
