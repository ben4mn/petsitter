import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

export const tasksRouter = Router();

const toggleSchema = z.object({
  completed: z.boolean(),
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

tasksRouter.post('/:id/toggle', requireAuth, async (req: AuthedRequest, res) => {
  const parse = toggleSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const { completed } = parse.data;
  const day = parse.data.day ?? new Date().toISOString().slice(0, 10);
  const taskId = req.params.id;

  // confirm task exists and the user has access to its trip
  const access = await query<{ trip_id: string }>(
    `SELECT t.trip_id FROM task_templates t
       WHERE t.id = $1
         AND EXISTS (
           SELECT 1 FROM trip_sitters ts WHERE ts.trip_id = t.trip_id AND ts.user_id = $2
           UNION
           SELECT 1 FROM trips tr WHERE tr.id = t.trip_id AND tr.owner_user_id = $2
         )`,
    [taskId, req.user!.id],
  );
  if (access.rowCount === 0) return res.status(404).json({ error: 'task_not_found' });

  if (completed) {
    await query(
      `INSERT INTO task_completions (task_template_id, user_id, day)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_template_id, user_id, day) DO NOTHING`,
      [taskId, req.user!.id, day],
    );
  } else {
    await query(
      `DELETE FROM task_completions WHERE task_template_id = $1 AND user_id = $2 AND day = $3`,
      [taskId, req.user!.id, day],
    );
  }
  res.json({ ok: true });
});
