import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardSection } from '../components/ui/Card';
import { Input, Label } from '../components/ui/Input';
import { getCurrentSubscription, getPushSupport, subscribeToPush, unsubscribeFromPush } from '../lib/push';
import {
  generateSuggested,
  type Granularity,
  type SuggestedTask,
} from '../lib/suggested-reminders';

type Reminder = {
  id: string;
  title: string;
  body: string | null;
  fire_at: string;
  recurrence: 'none' | 'daily' | 'weekly';
  sent_at: string | null;
};

type Tab = 'reminders' | 'chat';

export function Notifications() {
  const [tab, setTab] = useState<Tab>('reminders');

  return (
    <div className="space-y-8 fadein">
      <header>
        <div className="text-[12px] uppercase tracking-widest text-ink-3">Notifications</div>
        <h1 className="font-display text-[30px] leading-tight font-semibold text-ink mt-0.5">
          Reminders & chat
        </h1>
        <p className="text-ink-2 mt-1 text-[15px]">
          Set reminders that fire on your phone. Ask the house assistant anything you forgot.
        </p>
      </header>

      <div className="flex gap-2 border-b border-rule">
        <TabBtn active={tab === 'reminders'} onClick={() => setTab('reminders')}>Reminders</TabBtn>
        <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')}>House chat</TabBtn>
      </div>

      {tab === 'reminders' ? <RemindersTab /> : <ChatTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px border-b-2 text-[14px] font-medium transition-colors no-tap ${
        active ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function RemindersTab() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const r = await api.get<{ reminders: Reminder[] }>('/reminders');
      setReminders(r.reminders);
    } catch {
      setError("Couldn't load reminders.");
    }
  };

  useEffect(() => {
    (async () => {
      const s = await getPushSupport();
      setSupported(s);
      if (s) {
        setPermission(Notification.permission);
        setSubscribed(!!(await getCurrentSubscription()));
      }
      refresh();
    })();
  }, []);

  const enable = async () => {
    try {
      await subscribeToPush();
      setSubscribed(true);
      setPermission('granted');
    } catch (e: any) {
      setError(e?.message === 'permission_denied' ? 'Browser blocked notifications.' : 'Could not enable.');
    }
  };

  const disable = async () => {
    await unsubscribeFromPush();
    setSubscribed(false);
  };

  const testPush = async () => {
    try {
      await api.post('/push/test');
    } catch {
      setError('Test push failed.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardSection>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-ink">Push notifications</div>
              <div className="text-sm text-ink-2 mt-0.5">
                {!supported
                  ? "Not supported in this browser."
                  : permission === 'denied'
                    ? 'Blocked. Allow notifications in your browser settings.'
                    : subscribed
                      ? 'Enabled on this device.'
                      : 'Reminders fire as a system notification.'}
              </div>
            </div>
            {supported && (
              <div className="flex gap-2 shrink-0">
                {subscribed ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={testPush}>Test</Button>
                    <Button size="sm" variant="ghost" onClick={disable}>Disable</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={enable}>Enable</Button>
                )}
              </div>
            )}
          </div>
        </CardSection>
      </Card>

      <SuggestedRemindersCard
        onCreated={(rs) =>
          setReminders((cur) => [...(cur ?? []), ...rs].sort((a, b) => a.fire_at.localeCompare(b.fire_at)))
        }
      />

      <Card>
        <CardSection className="border-b border-rule">
          <h3 className="font-display text-[18px] font-semibold text-ink">New reminder</h3>
          <ReminderForm
            onCreated={(r) => {
              setReminders((cur) => [...(cur ?? []), r].sort((a, b) => a.fire_at.localeCompare(b.fire_at)));
              setCreating(false);
            }}
            busy={creating}
            setBusy={setCreating}
          />
        </CardSection>
        <CardSection>
          <h3 className="font-display text-[18px] font-semibold text-ink">Scheduled</h3>
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
          {!reminders ? (
            <p className="text-sm text-ink-3 mt-3">Loading…</p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-ink-3 mt-3">No reminders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {reminders.map((r) => (
                <li key={r.id} className="py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-ink font-medium">{r.title}</div>
                    {r.body && <div className="text-sm text-ink-2 mt-0.5">{r.body}</div>}
                    <div className="text-[12px] text-ink-3 mt-1 tabular-nums">
                      {fmtWhen(r.fire_at)}
                      {r.recurrence !== 'none' && ` · repeats ${r.recurrence}`}
                      {r.sent_at && ' · sent'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await api.delete(`/reminders/${r.id}`);
                      setReminders((cur) => cur?.filter((x) => x.id !== r.id) ?? null);
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardSection>
      </Card>
    </div>
  );
}

function ReminderForm({
  onCreated,
  busy,
  setBusy,
}: {
  onCreated: (r: Reminder) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0);
    return d.toISOString().slice(0, 16);
  });
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fire_at = new Date(when).toISOString();
      const r = await api.post<{ reminder: Reminder }>('/reminders', { title, body: body || undefined, fire_at, recurrence });
      onCreated(r.reminder);
      setTitle('');
      setBody('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to add reminder.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <div>
        <Label>Title</Label>
        <Input value={title} required onChange={(e) => setTitle(e.target.value)} placeholder="Feed the cats" />
      </div>
      <div>
        <Label>Note (optional)</Label>
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Wet food, hallway dish" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>When</Label>
          <Input type="datetime-local" value={when} required onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <Label>Repeat</Label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px] focus:outline-none focus:border-accent"
          >
            <option value="none">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add reminder'}
      </Button>
    </form>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ messages: { role: 'user' | 'assistant'; content: string }[] }>('/chat/history')
      .then((r) => setMessages(r.messages))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ reply: string }>('/chat', { message: msg });
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }]);
    } catch {
      setErr("Couldn't reach the assistant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col h-[60vh] min-h-[420px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <p className="text-ink-2">
                Try: <span className="italic">"What time do the cats eat dinner?"</span>
              </p>
              <p className="text-xs text-ink-3 mt-2">Knows the trip notes. Makes things up <span className="italic">less</span> than your last group chat.</p>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-[12px] px-3.5 py-2 text-[15px] leading-relaxed ${
                  m.role === 'user' ? 'bg-accent text-white' : 'bg-surface text-ink'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-surface rounded-[12px] px-3.5 py-2 text-[15px] text-ink-3">…</div>
          </div>
        )}
      </div>
      {err && <div className="px-5 pt-2 text-sm text-danger">{err}</div>}
      <form onSubmit={send} className="border-t border-rule p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the house assistant…"
        />
        <Button type="submit" disabled={busy || !input.trim()}>Send</Button>
      </form>
    </Card>
  );
}

function SuggestedRemindersCard({ onCreated }: { onCreated: (rs: Reminder[]) => void }) {
  const [tasks, setTasks] = useState<SuggestedTask[] | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('half');
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('19:30');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ tasks: SuggestedTask[] }>('/trip/current')
      .then((r) => setTasks(r.tasks))
      .catch(() => setErr("Couldn't load tasks."));
  }, []);

  const preview = tasks
    ? generateSuggested({ tasks, granularity, morningTime, eveningTime, now: new Date() })
    : [];

  const createAll = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const created: Reminder[] = [];
      for (const r of preview) {
        const res = await api.post<{ reminder: Reminder }>('/reminders', r);
        created.push(res.reminder);
      }
      onCreated(created);
      setDone(`Added ${created.length} reminder${created.length === 1 ? '' : 's'}.`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not create reminders.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardSection>
        <h3 className="font-display text-[18px] font-semibold text-ink">Suggested from your tasks</h3>
        <p className="text-sm text-ink-2 mt-1">
          Pick a cadence — we'll set up daily-recurring reminders from {tasks?.length ?? '…'} task{tasks?.length === 1 ? '' : 's'}.
        </p>

        <div className="mt-4 grid gap-2">
          <CadenceRow
            value="task"
            current={granularity}
            onChange={setGranularity}
            label="A nudge for every task"
            hint="One reminder per task. Most coverage, more chimes."
          />
          <CadenceRow
            value="half"
            current={granularity}
            onChange={setGranularity}
            label="Twice a day"
            hint="Morning + evening summary, each listing that block's tasks."
          />
          <CadenceRow
            value="day"
            current={granularity}
            onChange={setGranularity}
            label="Once a day"
            hint="A single morning reminder with today's count."
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label>Morning time</Label>
            <Input type="time" value={morningTime} onChange={(e) => setMorningTime(e.target.value)} />
          </div>
          <div>
            <Label>Evening time</Label>
            <Input
              type="time"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
              disabled={granularity === 'day'}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-2">Preview ({preview.length})</div>
          {preview.length === 0 ? (
            <p className="text-sm text-ink-3">No tasks yet — head to Admin to add some, then come back here.</p>
          ) : (
            <ul className="border border-rule rounded-[10px] divide-y divide-rule">
              {preview.map((r, i) => (
                <li key={i} className="px-4 py-2.5 text-sm">
                  <div className="text-ink font-medium">{r.title}</div>
                  <div className="text-ink-3 text-[12px] tabular-nums">
                    {new Date(r.fire_at).toLocaleString(undefined, {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    · daily
                  </div>
                  {r.body && <div className="text-ink-2 mt-0.5 whitespace-pre-line">{r.body}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        {done && <p className="mt-3 text-sm text-sage">{done}</p>}

        <div className="mt-4">
          <Button onClick={createAll} disabled={busy || preview.length === 0}>
            {busy ? 'Adding…' : `Add ${preview.length} reminder${preview.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}

function CadenceRow({
  value,
  current,
  onChange,
  label,
  hint,
}: {
  value: Granularity;
  current: Granularity;
  onChange: (g: Granularity) => void;
  label: string;
  hint: string;
}) {
  const selected = value === current;
  return (
    <button
      onClick={() => onChange(value)}
      className={`text-left rounded-[10px] border px-4 py-3 transition-colors no-tap ${
        selected ? 'border-accent bg-accent-soft' : 'border-rule bg-bg hover:bg-surface'
      }`}
    >
      <div className={`font-medium ${selected ? 'text-ink' : 'text-ink'}`}>{label}</div>
      <div className="text-[13px] text-ink-2 mt-0.5">{hint}</div>
    </button>
  );
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
