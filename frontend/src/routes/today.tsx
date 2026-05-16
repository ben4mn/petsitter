import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Markdown } from '../components/Markdown';

type Task = {
  id: string;
  time_of_day: 'morning' | 'night';
  title: string;
  description_markdown: string | null;
  completed: boolean;
};

const todayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export function Today() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [day, setDay] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ tasks: Task[]; today: string }>('/trip/today')
      .then((r) => {
        setTasks(r.tasks);
        setDay(r.today);
      })
      .catch(() => setError("Couldn't load today's tasks."));
  }, []);

  const toggle = async (t: Task) => {
    const next = !t.completed;
    setTasks((cur) => (cur ? cur.map((x) => (x.id === t.id ? { ...x, completed: next } : x)) : cur));
    try {
      await api.post(`/tasks/${t.id}/toggle`, { completed: next });
    } catch {
      setTasks((cur) => (cur ? cur.map((x) => (x.id === t.id ? { ...x, completed: !next } : x)) : cur));
    }
  };

  const morning = useMemo(() => (tasks ?? []).filter((t) => t.time_of_day === 'morning'), [tasks]);
  const night = useMemo(() => (tasks ?? []).filter((t) => t.time_of_day === 'night'), [tasks]);
  const morningDone = morning.filter((t) => t.completed).length;
  const nightDone = night.filter((t) => t.completed).length;

  return (
    <div className="space-y-10 fadein">
      <div>
        <div className="text-[12px] uppercase tracking-widest text-ink-3">Today</div>
        <h1 className="font-display text-[30px] leading-tight font-semibold text-ink mt-0.5">
          {day ? todayLabel(new Date(`${day}T12:00:00`)) : ' '}
        </h1>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!tasks && !error && <p className="text-sm text-ink-3">Loading…</p>}

      {tasks && (
        <>
          <TaskGroup
            label="Morning"
            done={morningDone}
            total={morning.length}
            tasks={morning}
            onToggle={toggle}
            tone="sage"
          />
          <TaskGroup
            label="Night"
            done={nightDone}
            total={night.length}
            tasks={night}
            onToggle={toggle}
            tone="accent"
          />
        </>
      )}
    </div>
  );
}

function TaskGroup({
  label,
  done,
  total,
  tasks,
  onToggle,
  tone,
}: {
  label: string;
  done: number;
  total: number;
  tasks: Task[];
  onToggle: (t: Task) => void;
  tone: 'sage' | 'accent';
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-[22px] font-semibold text-ink">{label}</h2>
        <span className="text-sm text-ink-3 tabular-nums">
          {done} of {total}
        </span>
      </div>
      <div className="h-[2px] w-full bg-rule rounded-full overflow-hidden mb-5">
        <div
          className={`h-full transition-all duration-500 ease-out ${tone === 'sage' ? 'bg-sage' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Card>
        {tasks.length === 0 ? (
          <div className="px-5 py-8 text-sm text-ink-3 text-center">No tasks for {label.toLowerCase()}.</div>
        ) : (
          <ul>
            {tasks.map((t, i) => (
              <TaskRow key={t.id} task={t} onToggle={() => onToggle(t)} divide={i < tasks.length - 1} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function TaskRow({ task, onToggle, divide }: { task: Task; onToggle: () => void; divide: boolean }) {
  return (
    <li className={divide ? 'border-b border-rule' : ''}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-5 py-4 text-left no-tap hover:bg-surface transition-colors"
      >
        <span
          className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
            task.completed
              ? 'bg-sage border-sage text-white'
              : 'bg-bg border-rule text-transparent'
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <div
            className={`text-[16px] leading-snug transition-colors ${
              task.completed ? 'text-ink-3 line-through decoration-rule' : 'text-ink'
            }`}
          >
            {task.title}
          </div>
          {task.description_markdown && !task.completed && (
            <div className="mt-1">
              <Markdown>{task.description_markdown}</Markdown>
            </div>
          )}
        </span>
      </button>
    </li>
  );
}
