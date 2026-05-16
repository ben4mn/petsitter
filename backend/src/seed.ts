import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, query } from './db/pool.js';
import { migrate } from './db/migrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

type SeedConfig = {
  owner: { email: string; password: string; name: string };
  sitter_allowlist: Array<{ email: string }>;
  trip: {
    name: string;
    host_household_name?: string;
    start_date?: string;
    end_date?: string;
    address?: string;
    wifi_ssid?: string;
    wifi_password?: string;
    notes_markdown?: string;
  };
  pets: Array<{
    name: string;
    species: 'cat' | 'dog' | 'other';
    breed?: string;
    age_years?: number;
    color?: string;
    photo_url?: string;
    quirks_markdown?: string;
    care: Array<{ time_of_day: 'morning' | 'night' | 'anytime'; body_markdown: string }>;
  }>;
  house_notes: Array<{ category: 'house' | 'emergency' | 'wifi' | 'trash' | 'other'; title: string; body_markdown: string }>;
  morning_tasks: Array<{ title: string; description_markdown?: string }>;
  night_tasks: Array<{ title: string; description_markdown?: string }>;
};

async function seedFromConfig(cfg: SeedConfig) {
  await migrate();

  const email = cfg.owner.email.toLowerCase().trim();
  const hash = await bcrypt.hash(cfg.owner.password, 12);

  const ownerRes = await query<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'owner')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [email, hash, cfg.owner.name],
  );
  const ownerId = ownerRes.rows[0].id;

  await query(
    `INSERT INTO allowed_emails (email, role) VALUES ($1, 'owner')
     ON CONFLICT (email) DO UPDATE SET role = 'owner'`,
    [email],
  );

  const tripRes = await query<{ id: string }>(
    `INSERT INTO trips (owner_user_id, name, host_household_name, start_date, end_date, address, wifi_ssid, wifi_password, notes_markdown)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      ownerId,
      cfg.trip.name,
      cfg.trip.host_household_name ?? null,
      cfg.trip.start_date ?? null,
      cfg.trip.end_date ?? null,
      cfg.trip.address ?? null,
      cfg.trip.wifi_ssid ?? null,
      cfg.trip.wifi_password ?? null,
      cfg.trip.notes_markdown ?? null,
    ],
  );
  const tripId = tripRes.rows[0].id;

  for (const a of cfg.sitter_allowlist) {
    await query(
      `INSERT INTO allowed_emails (email, role, pre_assigned_trip_id, invited_by)
       VALUES ($1, 'sitter', $2, $3)
       ON CONFLICT (email) DO UPDATE SET pre_assigned_trip_id = EXCLUDED.pre_assigned_trip_id, role = 'sitter'`,
      [a.email.toLowerCase().trim(), tripId, ownerId],
    );
  }

  for (let i = 0; i < cfg.pets.length; i++) {
    const p = cfg.pets[i];
    const petRes = await query<{ id: string }>(
      `INSERT INTO pets (trip_id, name, species, breed, age_years, color, photo_url, quirks_markdown, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [tripId, p.name, p.species, p.breed ?? null, p.age_years ?? null, p.color ?? null, p.photo_url ?? null, p.quirks_markdown ?? null, i],
    );
    const petId = petRes.rows[0].id;
    for (let j = 0; j < p.care.length; j++) {
      const c = p.care[j];
      await query(
        `INSERT INTO care_instructions (pet_id, time_of_day, body_markdown, sort_order) VALUES ($1, $2, $3, $4)`,
        [petId, c.time_of_day, c.body_markdown, j],
      );
    }
  }

  for (let i = 0; i < cfg.house_notes.length; i++) {
    const n = cfg.house_notes[i];
    await query(
      `INSERT INTO house_notes (trip_id, category, title, body_markdown, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [tripId, n.category, n.title, n.body_markdown, i],
    );
  }

  for (let i = 0; i < cfg.morning_tasks.length; i++) {
    const t = cfg.morning_tasks[i];
    await query(
      `INSERT INTO task_templates (trip_id, time_of_day, title, description_markdown, sort_order) VALUES ($1, 'morning', $2, $3, $4)`,
      [tripId, t.title, t.description_markdown ?? null, i],
    );
  }
  for (let i = 0; i < cfg.night_tasks.length; i++) {
    const t = cfg.night_tasks[i];
    await query(
      `INSERT INTO task_templates (trip_id, time_of_day, title, description_markdown, sort_order) VALUES ($1, 'night', $2, $3, $4)`,
      [tripId, t.title, t.description_markdown ?? null, i],
    );
  }

  console.log(`[seed] owner ${email} created/updated`);
  console.log(`[seed] trip ${cfg.trip.name} created`);
  console.log(`[seed] ${cfg.pets.length} pets, ${cfg.house_notes.length} notes, ${cfg.morning_tasks.length + cfg.night_tasks.length} task templates`);
  console.log(`[seed] allowlist: ${cfg.sitter_allowlist.map((a) => a.email).join(', ')}`);
}

async function tryRead(paths: string[]): Promise<{ raw: string; path: string }> {
  for (const p of paths) {
    try {
      const raw = await readFile(p, 'utf8');
      return { raw, path: p };
    } catch {
      /* keep looking */
    }
  }
  throw new Error(`could not find seed config in any of:\n  ${paths.join('\n  ')}`);
}

async function main() {
  const override = process.env.SEED_CONFIG;
  const candidates: string[] = [];
  if (override) candidates.push(resolve(process.cwd(), override));
  // Common locations across dev (cwd=backend/) and docker (cwd=/app, file copied to /app or /)
  candidates.push(
    resolve(process.cwd(), 'seed.config.json'),
    resolve(REPO_ROOT, 'seed.config.json'),
    resolve(__dirname, '..', 'seed.config.json'),
    '/seed.config.json',
    resolve(process.cwd(), 'seed.config.example.json'),
    resolve(REPO_ROOT, 'seed.config.example.json'),
    resolve(__dirname, '..', 'seed.config.example.json'),
    '/seed.config.example.json',
  );
  const { raw, path } = await tryRead(candidates);
  console.log(`[seed] using ${path}`);
  const cfg = JSON.parse(raw) as SeedConfig;
  await seedFromConfig(cfg);
  await pool.end();
}

main().catch((e) => {
  console.error('[seed] failed', e);
  process.exit(1);
});
