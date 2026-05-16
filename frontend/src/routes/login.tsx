import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { ApiError } from '../lib/api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/today');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("Email or password didn't match.");
      else setError('Something went wrong. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see today's plan.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-2 text-center">
        Invited? <Link to="/register" className="text-accent hover:text-accent-hover font-medium">Create your account</Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center fadein">
            <div className="font-display text-[34px] leading-none font-semibold tracking-tight text-ink">Petsitter</div>
            <div className="mt-1 text-[12px] uppercase tracking-widest text-ink-3">house notes</div>
          </div>
          <div className="bg-bg border border-rule rounded-[14px] p-6">
            <h1 className="font-display text-[22px] font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-ink-2 mb-5">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
