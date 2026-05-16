import Anthropic from '@anthropic-ai/sdk';
import { query } from '../db/pool.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

type TripContext = {
  trip: {
    name: string;
    host_household_name: string | null;
    start_date: string | null;
    end_date: string | null;
    address: string | null;
    wifi_ssid: string | null;
    wifi_password: string | null;
    notes_markdown: string | null;
  };
  pets: Array<{ name: string; species: string; breed: string | null; age_years: number | null; color: string | null; quirks_markdown: string | null }>;
  care: Array<{ pet_name: string; time_of_day: string; body_markdown: string }>;
  notes: Array<{ category: string; title: string; body_markdown: string }>;
  tasks: Array<{ time_of_day: string; title: string; description_markdown: string | null }>;
  sitter_name: string;
};

async function loadContext(tripId: string, userId: string): Promise<TripContext> {
  const [trip, pets, care, notes, tasks, sitter] = await Promise.all([
    query<TripContext['trip']>(
      `SELECT name, host_household_name, start_date::text, end_date::text, address, wifi_ssid, wifi_password, notes_markdown FROM trips WHERE id = $1`,
      [tripId],
    ),
    query<TripContext['pets'][number]>(
      `SELECT name, species, breed, age_years, color, quirks_markdown FROM pets WHERE trip_id = $1 ORDER BY sort_order`,
      [tripId],
    ),
    query<TripContext['care'][number]>(
      `SELECT p.name AS pet_name, c.time_of_day, c.body_markdown
         FROM care_instructions c JOIN pets p ON p.id = c.pet_id
        WHERE p.trip_id = $1 ORDER BY p.sort_order, c.sort_order`,
      [tripId],
    ),
    query<TripContext['notes'][number]>(
      `SELECT category, title, body_markdown FROM house_notes WHERE trip_id = $1 ORDER BY sort_order`,
      [tripId],
    ),
    query<TripContext['tasks'][number]>(
      `SELECT time_of_day, title, description_markdown FROM task_templates WHERE trip_id = $1 ORDER BY time_of_day, sort_order`,
      [tripId],
    ),
    query<{ name: string }>(`SELECT name FROM users WHERE id = $1`, [userId]),
  ]);

  return {
    trip: trip.rows[0],
    pets: pets.rows,
    care: care.rows,
    notes: notes.rows,
    tasks: tasks.rows,
    sitter_name: sitter.rows[0]?.name || 'the sitter',
  };
}

function renderSystemPrompt(ctx: TripContext): string {
  const petLines = ctx.pets
    .map((p) => `- ${p.name} (${p.species}${p.breed ? `, ${p.breed}` : ''}${p.age_years ? `, ${p.age_years}y` : ''})${p.quirks_markdown ? `\n  Quirks: ${p.quirks_markdown}` : ''}`)
    .join('\n');
  const careLines = ctx.care.map((c) => `- ${c.pet_name} (${c.time_of_day}): ${c.body_markdown}`).join('\n');
  const noteLines = ctx.notes.map((n) => `- [${n.category}] ${n.title}: ${n.body_markdown}`).join('\n');
  const taskLines = ctx.tasks.map((t) => `- (${t.time_of_day}) ${t.title}${t.description_markdown ? ` — ${t.description_markdown}` : ''}`).join('\n');

  return `You are the house assistant for ${ctx.trip.host_household_name || 'the household'} while ${ctx.sitter_name} is pet-sitting.
Be warm, concise, lightly playful. Answer in 1–3 short sentences. If you don't know something from the notes below, say so plainly — never invent times, names, or instructions.

Trip: ${ctx.trip.name} (${ctx.trip.start_date ?? 'TBD'} → ${ctx.trip.end_date ?? 'TBD'})
Address: ${ctx.trip.address ?? 'not provided'}
Wifi: ${ctx.trip.wifi_ssid ?? '—'} / ${ctx.trip.wifi_password ?? '—'}

Pets:
${petLines || '(none listed)'}

Care:
${careLines || '(none listed)'}

House notes:
${noteLines || '(none listed)'}

Daily tasks:
${taskLines || '(none listed)'}

Extra notes:
${ctx.trip.notes_markdown ?? '(none)'}`;
}

export async function chat(opts: {
  tripId: string;
  userId: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  message: string;
}): Promise<string> {
  const ctx = await loadContext(opts.tripId, opts.userId);
  const system = renderSystemPrompt(ctx);

  const messages = [
    ...opts.history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: opts.message },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system,
    messages,
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');

  return text.trim();
}
