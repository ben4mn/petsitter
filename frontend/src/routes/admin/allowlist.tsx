import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardSection } from '../../components/ui/Card';
import { Input, Label } from '../../components/ui/Input';

type Allowed = {
  email: string;
  role: 'owner' | 'sitter';
  pre_assigned_trip_id: string | null;
  invited_at: string;
};

export function AdminAllowlist() {
  const [rows, setRows] = useState<Allowed[]>([]);
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState({ email: '', role: 'sitter' as 'owner' | 'sitter', pre_assigned_trip_id: '' });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api.get<{ allowlist: Allowed[] }>('/admin/allowlist');
      setRows(r.allowlist);
      const t = await api.get<{ trip: { id: string; name: string } }>('/trip/current');
      setTrips([t.trip]);
    } catch {
      setError("Couldn't load allowlist.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setError(null);
    try {
      await api.post('/admin/allowlist', {
        email: draft.email,
        role: draft.role,
        pre_assigned_trip_id: draft.role === 'sitter' && draft.pre_assigned_trip_id ? draft.pre_assigned_trip_id : null,
      });
      setDraft({ email: '', role: 'sitter', pre_assigned_trip_id: '' });
      load();
    } catch {
      setError("Couldn't add.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardSection>
          <h2 className="font-display text-[20px] font-semibold text-ink mb-4">Allowed emails</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-ink-3">Nobody invited yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {rows.map((r) => (
                <li key={r.email} className="py-3 flex items-center gap-3">
                  <span className="flex-1 text-ink font-mono text-[14px]">{r.email}</span>
                  <span className="text-[11px] uppercase tracking-widest text-ink-3">{r.role}</span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${r.email}?`)) return;
                      await api.delete(`/admin/allowlist/${encodeURIComponent(r.email)}`);
                      load();
                    }}
                    className="text-xs text-danger hover:underline no-tap"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardSection>
      </Card>

      <Card>
        <CardSection>
          <h3 className="font-display text-[18px] font-semibold text-ink mb-4">Invite someone</h3>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="sitter@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as 'owner' | 'sitter' })}
                className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px]"
              >
                <option value="sitter">Sitter</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {draft.role === 'sitter' && (
              <div>
                <Label>Pre-assign to trip</Label>
                <select
                  value={draft.pre_assigned_trip_id}
                  onChange={(e) => setDraft({ ...draft, pre_assigned_trip_id: e.target.value })}
                  className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px]"
                >
                  <option value="">— None —</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button onClick={add} disabled={!draft.email}>Invite</Button>
          </div>
        </CardSection>
      </Card>
    </div>
  );
}
