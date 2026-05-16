import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const remindersRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  fire_at: z.string().datetime(),
  recurrence: z.enum(['none', 'daily', 'weekly']).default('none'),
  trip_id: z.string().uuid().optional(),
});

remindersRouter.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT id, title, body, fire_at, recurrence, sent_at, trip_id
       FROM reminders WHERE user_id = $1 ORDER BY fire_at`,
    [req.user!.id],
  );
  res.json({ reminders: rows });
});

remindersRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input', issues: parse.error.issues });
  const { title, body, fire_at, recurrence, trip_id } = parse.data;

  const { rows } = await query(
    `INSERT INTO reminders (user_id, trip_id, title, body, fire_at, recurrence)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, body, fire_at, recurrence, sent_at, trip_id`,
    [req.user!.id, trip_id ?? null, title, body ?? null, fire_at, recurrence],
  );
  res.status(201).json({ reminder: rows[0] });
});

remindersRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { rowCount } = await query(
    `DELETE FROM reminders WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user!.id],
  );
  if (!rowCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});
