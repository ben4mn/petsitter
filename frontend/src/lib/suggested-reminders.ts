export type SuggestedTask = {
  id: string;
  title: string;
  time_of_day: 'morning' | 'night';
};

export type Granularity = 'task' | 'half' | 'day';

export type SuggestedReminder = {
  title: string;
  body?: string;
  fire_at: string; // ISO timestamp
  recurrence: 'daily';
};

type Args = {
  tasks: SuggestedTask[];
  granularity: Granularity;
  morningTime: string; // "HH:MM" 24h
  eveningTime: string;
  now: Date;
};

function nextOccurrence(hhmm: string, now: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export function generateSuggested(args: Args): SuggestedReminder[] {
  const { tasks, granularity, morningTime, eveningTime, now } = args;
  if (tasks.length === 0) return [];

  if (granularity === 'task') {
    return tasks.map((t) => ({
      title: t.title,
      fire_at: nextOccurrence(t.time_of_day === 'morning' ? morningTime : eveningTime, now).toISOString(),
      recurrence: 'daily' as const,
    }));
  }

  if (granularity === 'day') {
    const morning = tasks.filter((t) => t.time_of_day === 'morning').length;
    const night = tasks.filter((t) => t.time_of_day === 'night').length;
    const parts: string[] = [];
    if (morning > 0) parts.push(`${morning} morning task${morning === 1 ? '' : 's'}`);
    if (night > 0) parts.push(`${night} evening task${night === 1 ? '' : 's'}`);
    return [
      {
        title: 'Today at the house',
        body: parts.join(' · '),
        fire_at: nextOccurrence(morningTime, now).toISOString(),
        recurrence: 'daily',
      },
    ];
  }

  if (granularity === 'half') {
    const morning = tasks.filter((t) => t.time_of_day === 'morning');
    const night = tasks.filter((t) => t.time_of_day === 'night');
    const out: SuggestedReminder[] = [];
    if (morning.length > 0) {
      out.push({
        title: 'Morning routine',
        body: morning.map((t) => `• ${t.title}`).join('\n'),
        fire_at: nextOccurrence(morningTime, now).toISOString(),
        recurrence: 'daily',
      });
    }
    if (night.length > 0) {
      out.push({
        title: 'Evening routine',
        body: night.map((t) => `• ${t.title}`).join('\n'),
        fire_at: nextOccurrence(eveningTime, now).toISOString(),
        recurrence: 'daily',
      });
    }
    return out;
  }

  return [];
}
