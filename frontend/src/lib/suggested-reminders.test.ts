import { describe, it, expect } from 'vitest';
import { generateSuggested, type SuggestedTask } from './suggested-reminders';

const morningTask = (id: string, title: string): SuggestedTask => ({ id, title, time_of_day: 'morning' });
const nightTask = (id: string, title: string): SuggestedTask => ({ id, title, time_of_day: 'night' });
const NOW = new Date('2026-05-20T10:00:00-04:00'); // 10am ET, just for stable test

describe('generateSuggested', () => {
  it('returns no reminders when there are no tasks', () => {
    const r = generateSuggested({ tasks: [], granularity: 'task', morningTime: '08:00', eveningTime: '20:00', now: NOW });
    expect(r).toEqual([]);
  });

  describe("granularity 'task'", () => {
    const tasks: SuggestedTask[] = [
      morningTask('m1', 'Feed cats'),
      nightTask('n1', 'Last walk'),
      morningTask('m2', 'Walk Otis'),
    ];
    const out = generateSuggested({ tasks, granularity: 'task', morningTime: '08:00', eveningTime: '20:00', now: NOW });

    it('creates one reminder per task', () => {
      expect(out).toHaveLength(3);
    });

    it('uses morningTime for morning tasks and eveningTime for night tasks', () => {
      const feed = out.find((r) => r.title.includes('Feed cats'))!;
      const walk = out.find((r) => r.title.includes('Last walk'))!;
      expect(new Date(feed.fire_at).getHours()).toBe(8);
      expect(new Date(walk.fire_at).getHours()).toBe(20);
    });

    it('schedules fire_at strictly after now', () => {
      for (const r of out) expect(new Date(r.fire_at).getTime()).toBeGreaterThan(NOW.getTime());
    });

    it('marks every reminder as daily-recurring', () => {
      for (const r of out) expect(r.recurrence).toBe('daily');
    });
  });

  describe("granularity 'half'", () => {
    const tasks: SuggestedTask[] = [
      morningTask('m1', 'Feed cats'),
      morningTask('m2', 'Walk Otis'),
      morningTask('m3', 'Refill water'),
      nightTask('n1', 'Last walk'),
      nightTask('n2', 'Lock back door'),
    ];
    const out = generateSuggested({ tasks, granularity: 'half', morningTime: '08:00', eveningTime: '20:00', now: NOW });

    it('produces exactly two reminders', () => {
      expect(out).toHaveLength(2);
    });

    it('first is at morningTime and references all morning tasks', () => {
      const morning = out[0];
      expect(new Date(morning.fire_at).getHours()).toBe(8);
      expect(morning.body).toContain('Feed cats');
      expect(morning.body).toContain('Walk Otis');
      expect(morning.body).toContain('Refill water');
    });

    it('second is at eveningTime and references all night tasks', () => {
      const evening = out[1];
      expect(new Date(evening.fire_at).getHours()).toBe(20);
      expect(evening.body).toContain('Last walk');
      expect(evening.body).toContain('Lock back door');
    });

    it('omits a block whose task list is empty', () => {
      const onlyMornings = generateSuggested({
        tasks: [morningTask('m1', 'Feed cats')],
        granularity: 'half',
        morningTime: '08:00',
        eveningTime: '20:00',
        now: NOW,
      });
      expect(onlyMornings).toHaveLength(1);
      expect(onlyMornings[0].title.toLowerCase()).toContain('morning');
    });
  });

  describe("granularity 'day'", () => {
    const tasks: SuggestedTask[] = [
      morningTask('m1', 'Feed cats'),
      morningTask('m2', 'Walk Otis'),
      nightTask('n1', 'Last walk'),
    ];
    const out = generateSuggested({ tasks, granularity: 'day', morningTime: '08:00', eveningTime: '20:00', now: NOW });

    it('produces exactly one daily reminder at morningTime', () => {
      expect(out).toHaveLength(1);
      expect(new Date(out[0].fire_at).getHours()).toBe(8);
      expect(out[0].recurrence).toBe('daily');
    });

    it("body lists today's counts for both blocks", () => {
      expect(out[0].body).toMatch(/2 morning/i);
      expect(out[0].body).toMatch(/1 (evening|night)/i);
    });
  });
});
