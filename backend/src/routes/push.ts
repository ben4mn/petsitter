import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { getVapidPublicKey, sendToUser } from '../services/push.js';

export const pushRouter = Router();

pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ key: getVapidPublicKey() });
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

pushRouter.post('/subscribe', requireAuth, async (req: AuthedRequest, res) => {
  const parse = subscribeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const { endpoint, keys } = parse.data;

  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [req.user!.id, endpoint, keys.p256dh, keys.auth],
  );
  res.json({ ok: true });
});

pushRouter.post('/unsubscribe', requireAuth, async (req: AuthedRequest, res) => {
  const endpoint = String(req.body?.endpoint || '');
  if (!endpoint) return res.status(400).json({ error: 'invalid_input' });
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [req.user!.id, endpoint]);
  res.json({ ok: true });
});

pushRouter.post('/test', requireAuth, async (req: AuthedRequest, res) => {
  const result = await sendToUser(req.user!.id, {
    title: 'Petsitter test',
    body: 'Notifications are working.',
    url: '/today',
  });
  res.json(result);
});
