import cron from 'node-cron';
import { query } from '../db/pool.js';
import { sendToUser } from './push.js';

type DueReminder = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  recurrence: 'none' | 'daily' | 'weekly';
  fire_at: Date;
};

async function fireDueReminders() {
  const { rows } = await query<DueReminder>(
    `SELECT id, user_id, title, body, recurrence, fire_at
       FROM reminders
      WHERE sent_at IS NULL AND fire_at <= now()
      ORDER BY fire_at
      LIMIT 50`,
  );

  for (const r of rows) {
    try {
      await sendToUser(r.user_id, {
        title: r.title,
        body: r.body ?? undefined,
        url: '/today',
        tag: `reminder-${r.id}`,
      });
    } catch (err) {
      console.error('[scheduler] send failed', r.id, err);
    }

    await query(`UPDATE reminders SET sent_at = now() WHERE id = $1`, [r.id]);

    if (r.recurrence !== 'none') {
      const intervalMs = r.recurrence === 'daily' ? 86_400_000 : 604_800_000;
      await query(
        `INSERT INTO reminders (user_id, trip_id, title, body, fire_at, recurrence)
         SELECT user_id, trip_id, title, body, $2::timestamptz, recurrence
           FROM reminders WHERE id = $1`,
        [r.id, new Date(r.fire_at.getTime() + intervalMs)],
      );
    }
  }
}

export function startScheduler() {
  // Every minute
  cron.schedule('* * * * *', () => {
    fireDueReminders().catch((e) => console.error('[scheduler] tick failed', e));
  });
  console.log('[scheduler] started (every minute)');
}
