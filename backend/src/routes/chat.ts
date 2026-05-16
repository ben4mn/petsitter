import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { chat } from '../services/anthropic.js';

export const chatRouter = Router();

async function findTripId(userId: string, role: 'owner' | 'sitter'): Promise<string | null> {
  if (role === 'sitter') {
    const { rows } = await query<{ trip_id: string }>(`SELECT trip_id FROM trip_sitters WHERE user_id = $1 LIMIT 1`, [userId]);
    return rows[0]?.trip_id ?? null;
  }
  const { rows } = await query<{ id: string }>(`SELECT id FROM trips WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1`, [userId]);
  return rows[0]?.id ?? null;
}

chatRouter.get('/history', requireAuth, async (req: AuthedRequest, res) => {
  const { rows } = await query(
    `SELECT id, role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user!.id],
  );
  res.json({ messages: rows.reverse() });
});

const sendSchema = z.object({ message: z.string().min(1).max(2000) });

chatRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parse = sendSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });

  const tripId = await findTripId(req.user!.id, req.user!.role);
  if (!tripId) return res.status(404).json({ error: 'no_trip' });

  const history = await query<{ role: 'user' | 'assistant'; content: string }>(
    `SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [req.user!.id],
  );

  await query(
    `INSERT INTO chat_messages (user_id, trip_id, role, content) VALUES ($1, $2, 'user', $3)`,
    [req.user!.id, tripId, parse.data.message],
  );

  let reply: string;
  try {
    reply = await chat({
      tripId,
      userId: req.user!.id,
      history: history.rows.reverse(),
      message: parse.data.message,
    });
  } catch (err: any) {
    console.error('[chat] anthropic error', err?.message);
    return res.status(502).json({ error: 'upstream_failed' });
  }

  await query(
    `INSERT INTO chat_messages (user_id, trip_id, role, content) VALUES ($1, $2, 'assistant', $3)`,
    [req.user!.id, tripId, reply],
  );
  res.json({ reply });
});
