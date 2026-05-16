import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  type AuthedRequest,
} from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80).trim(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input', issues: parse.error.issues });
  const { email, password, name } = parse.data;

  const allow = await query<{ role: 'owner' | 'sitter'; pre_assigned_trip_id: string | null }>(
    `SELECT role, pre_assigned_trip_id FROM allowed_emails WHERE email = $1`,
    [email],
  );
  if (allow.rowCount === 0) {
    return res.status(403).json({ error: 'email_not_invited' });
  }
  const { role, pre_assigned_trip_id } = allow.rows[0];

  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: 'email_already_registered' });
  }

  const hash = await bcrypt.hash(password, 12);
  const inserted = await query<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, hash, name, role],
  );
  const userId = inserted.rows[0].id;

  if (pre_assigned_trip_id) {
    await query(
      `INSERT INTO trip_sitters (trip_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [pre_assigned_trip_id, userId],
    );
  }

  const token = signToken({ id: userId, email, role });
  setAuthCookie(res, token);
  res.json({ user: { id: userId, email, name, role } });
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const { email, password } = parse.data;

  const result = await query<{
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'sitter';
    password_hash: string;
  }>(
    `SELECT id, email, name, role, password_hash FROM users WHERE email = $1`,
    [email],
  );
  if (result.rowCount === 0) return res.status(401).json({ error: 'invalid_credentials' });
  const user = result.rows[0];

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const result = await query<{ id: string; email: string; name: string; role: 'owner' | 'sitter' }>(
    `SELECT id, email, name, role FROM users WHERE id = $1`,
    [req.user!.id],
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' });
  res.json({ user: result.rows[0] });
});
