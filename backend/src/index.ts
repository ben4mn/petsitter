import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { migrate } from './db/migrate.js';
import { authRouter } from './routes/auth.js';
import { tripRouter } from './routes/trip.js';
import { tasksRouter } from './routes/tasks.js';
import { remindersRouter } from './routes/reminders.js';
import { pushRouter } from './routes/push.js';
import { chatRouter } from './routes/chat.js';
import { adminRouter } from './routes/admin.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3032);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Request logging — terse, one line per request, includes status + latency.
// Critical for diagnosing save failures (the kind that previously left admin
// edits silently lost). Skip the noisy health probe.
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const dur = Date.now() - start;
    const tag = res.statusCode >= 500 ? '[req!]' : res.statusCode >= 400 ? '[req?]' : '[req]';
    console.log(`${tag} ${req.method} ${req.path} → ${res.statusCode} ${dur}ms`);
  });
  next();
});

if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: (origin, cb) => cb(null, origin ?? true),
      credentials: true,
    }),
  );
}

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? (process.env.NODE_ENV === 'production' ? '/app/uploads' : './uploads');
app.use('/uploads', express.static(UPLOADS_DIR, { fallthrough: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/trip', tripRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/push', pushRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(err.status ?? 500).json({ error: err.code ?? 'internal_error', message: err.message });
});

async function start() {
  await migrate();
  startScheduler();
  app.listen(PORT, () => console.log(`[petsitter] listening on :${PORT}`));
}

start().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
