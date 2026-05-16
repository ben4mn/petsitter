import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { AuthLayout } from './login';
import { ApiError } from '../lib/api';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, name);
      navigate('/onboarding');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'email_not_invited') setError("This email hasn't been invited yet. Check with the host.");
        else if (err.code === 'email_already_registered') setError('That email already has an account — try signing in.');
        else setError('Sign-up failed. Try again.');
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="You'll need an invited email to register.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password (8+ chars)</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-2 text-center">
        Already have one? <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
