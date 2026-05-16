import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireOwner, type AuthedRequest } from '../middleware/auth.js';

export const adminRouter = Router();

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? (process.env.NODE_ENV === 'production' ? '/app/uploads' : './uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 8) || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const tripSchema = z.object({
  name: z.string().min(1).max(120),
  host_household_name: z.string().max(120).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  wifi_ssid: z.string().max(120).optional().nullable(),
  wifi_password: z.string().max(200).optional().nullable(),
  notes_markdown: z.string().max(20000).optional().nullable(),
});

adminRouter.post('/trips', requireOwner, async (req: AuthedRequest, res) => {
  const parse = tripSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input', issues: parse.error.issues });
  const t = parse.data;
  const { rows } = await query(
    `INSERT INTO trips (owner_user_id, name, host_household_name, start_date, end_date, address, wifi_ssid, wifi_password, notes_markdown)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.user!.id, t.name, t.host_household_name, t.start_date, t.end_date, t.address, t.wifi_ssid, t.wifi_password, t.notes_markdown],
  );
  res.status(201).json({ trip: rows[0] });
});

adminRouter.patch('/trips/:id', requireOwner, async (req: AuthedRequest, res) => {
  const parse = tripSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const fields = parse.data;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.json({ ok: true });

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => (fields as any)[k]);
  await query(
    `UPDATE trips SET ${setClause} WHERE id = $1 AND owner_user_id = $${keys.length + 2}`,
    [req.params.id, ...values, req.user!.id],
  );
  res.json({ ok: true });
});

const petSchema = z.object({
  trip_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  species: z.enum(['cat', 'dog', 'other']),
  breed: z.string().max(80).optional().nullable(),
  age_years: z.number().nonnegative().optional().nullable(),
  color: z.string().max(80).optional().nullable(),
  photo_url: z.string().max(400).optional().nullable(),
  quirks_markdown: z.string().max(8000).optional().nullable(),
  sort_order: z.number().int().optional(),
});

adminRouter.post('/pets', requireOwner, async (_req: AuthedRequest, res) => {
  const parse = petSchema.safeParse(_req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const p = parse.data;
  const { rows } = await query(
    `INSERT INTO pets (trip_id, name, species, breed, age_years, color, photo_url, quirks_markdown, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 0)) RETURNING *`,
    [p.trip_id, p.name, p.species, p.breed, p.age_years, p.color, p.photo_url, p.quirks_markdown, p.sort_order],
  );
  res.status(201).json({ pet: rows[0] });
});

adminRouter.patch('/pets/:id', requireOwner, async (req, res) => {
  const parse = petSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const fields = parse.data;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.json({ ok: true });
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => (fields as any)[k]);
  await query(`UPDATE pets SET ${setClause} WHERE id = $1`, [req.params.id, ...values]);
  res.json({ ok: true });
});

adminRouter.delete('/pets/:id', requireOwner, async (req, res) => {
  await query(`DELETE FROM pets WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

adminRouter.post('/upload', requireOwner, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

const careSchema = z.object({
  pet_id: z.string().uuid(),
  time_of_day: z.enum(['morning', 'night', 'anytime']),
  body_markdown: z.string().min(1).max(8000),
  sort_order: z.number().int().optional(),
});

adminRouter.post('/care', requireOwner, async (req, res) => {
  const parse = careSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const c = parse.data;
  const { rows } = await query(
    `INSERT INTO care_instructions (pet_id, time_of_day, body_markdown, sort_order)
     VALUES ($1, $2, $3, COALESCE($4, 0)) RETURNING *`,
    [c.pet_id, c.time_of_day, c.body_markdown, c.sort_order],
  );
  res.status(201).json({ care: rows[0] });
});

adminRouter.delete('/care/:id', requireOwner, async (req, res) => {
  await query(`DELETE FROM care_instructions WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

const noteSchema = z.object({
  trip_id: z.string().uuid(),
  category: z.enum(['house', 'emergency', 'wifi', 'trash', 'other']),
  title: z.string().min(1).max(120),
  body_markdown: z.string().min(1).max(10000),
  sort_order: z.number().int().optional(),
});

adminRouter.post('/notes', requireOwner, async (req, res) => {
  const parse = noteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const n = parse.data;
  const { rows } = await query(
    `INSERT INTO house_notes (trip_id, category, title, body_markdown, sort_order)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0)) RETURNING *`,
    [n.trip_id, n.category, n.title, n.body_markdown, n.sort_order],
  );
  res.status(201).json({ note: rows[0] });
});

adminRouter.delete('/notes/:id', requireOwner, async (req, res) => {
  await query(`DELETE FROM house_notes WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

const taskSchema = z.object({
  trip_id: z.string().uuid(),
  time_of_day: z.enum(['morning', 'night']),
  title: z.string().min(1).max(120),
  description_markdown: z.string().max(4000).optional().nullable(),
  sort_order: z.number().int().optional(),
});

adminRouter.post('/tasks', requireOwner, async (req, res) => {
  const parse = taskSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const t = parse.data;
  const { rows } = await query(
    `INSERT INTO task_templates (trip_id, time_of_day, title, description_markdown, sort_order)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0)) RETURNING *`,
    [t.trip_id, t.time_of_day, t.title, t.description_markdown, t.sort_order],
  );
  res.status(201).json({ task: rows[0] });
});

adminRouter.delete('/tasks/:id', requireOwner, async (req, res) => {
  await query(`DELETE FROM task_templates WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

const allowlistSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(['owner', 'sitter']),
  pre_assigned_trip_id: z.string().uuid().optional().nullable(),
});

adminRouter.get('/allowlist', requireOwner, async (_req, res) => {
  const { rows } = await query(
    `SELECT email, role, pre_assigned_trip_id, invited_at FROM allowed_emails ORDER BY invited_at DESC`,
  );
  res.json({ allowlist: rows });
});

adminRouter.post('/allowlist', requireOwner, async (req: AuthedRequest, res) => {
  const parse = allowlistSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid_input' });
  const a = parse.data;
  await query(
    `INSERT INTO allowed_emails (email, role, pre_assigned_trip_id, invited_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, pre_assigned_trip_id = EXCLUDED.pre_assigned_trip_id`,
    [a.email, a.role, a.pre_assigned_trip_id ?? null, req.user!.id],
  );
  res.json({ ok: true });
});

adminRouter.delete('/allowlist/:email', requireOwner, async (req, res) => {
  await query(`DELETE FROM allowed_emails WHERE email = $1`, [req.params.email.toLowerCase()]);
  res.json({ ok: true });
});
