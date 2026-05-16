import pg from 'pg';

const { Pool, types } = pg;

// Postgres DATE (OID 1082) — return the raw 'YYYY-MM-DD' string instead of
// node-postgres' default JS Date (which JSON-serializes with a timezone-shifted
// ISO timestamp and breaks `<input type="date">` plus our display formatters).
types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}
