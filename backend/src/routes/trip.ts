import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const tripRouter = Router();

async function findCurrentTrip(userId: string, role: 'owner' | 'sitter'): Promise<string | null> {
  if (role === 'sitter') {
    const { rows } = await query<{ trip_id: string }>(
      `SELECT trip_id FROM trip_sitters WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return rows[0]?.trip_id ?? null;
  }
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM trips WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

tripRouter.get('/current', requireAuth, async (req: AuthedRequest, res) => {
  const tripId = await findCurrentTrip(req.user!.id, req.user!.role);
  if (!tripId) return res.status(404).json({ error: 'no_trip' });

  const [trip, pets, care, notes, tasks] = await Promise.all([
    query(`SELECT id, name, host_household_name, start_date, end_date, address, wifi_ssid, wifi_password, notes_markdown FROM trips WHERE id = $1`, [tripId]),
    query(`SELECT id, name, species, breed, age_years, color, photo_url, quirks_markdown FROM pets WHERE trip_id = $1 ORDER BY sort_order, name`, [tripId]),
    query(`SELECT id, pet_id, time_of_day, body_markdown FROM care_instructions WHERE pet_id IN (SELECT id FROM pets WHERE trip_id = $1) ORDER BY sort_order`, [tripId]),
    query(`SELECT id, category, title, body_markdown FROM house_notes WHERE trip_id = $1 ORDER BY sort_order`, [tripId]),
    query(`SELECT id, time_of_day, title, description_markdown FROM task_templates WHERE trip_id = $1 ORDER BY time_of_day, sort_order`, [tripId]),
  ]);

  res.json({
    trip: trip.rows[0],
    pets: pets.rows,
    care: care.rows,
    notes: notes.rows,
    tasks: tasks.rows,
  });
});

tripRouter.get('/today', requireAuth, async (req: AuthedRequest, res) => {
  const tripId = await findCurrentTrip(req.user!.id, req.user!.role);
  if (!tripId) return res.status(404).json({ error: 'no_trip' });

  const today = new Date().toISOString().slice(0, 10);
  const [tasks, completions] = await Promise.all([
    query(`SELECT id, time_of_day, title, description_markdown FROM task_templates WHERE trip_id = $1 ORDER BY time_of_day, sort_order`, [tripId]),
    query<{ task_template_id: string }>(
      `SELECT task_template_id FROM task_completions WHERE user_id = $1 AND day = $2`,
      [req.user!.id, today],
    ),
  ]);

  const done = new Set(completions.rows.map((r) => r.task_template_id));
  res.json({
    today,
    tasks: tasks.rows.map((t: any) => ({ ...t, completed: done.has(t.id) })),
  });
});
