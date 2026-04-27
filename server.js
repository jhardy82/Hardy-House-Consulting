import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pagesRouter   from './routes/pages.js';
import elementRouter from './routes/api/element.js';
import exportRouter  from './routes/api/export.js';
import agentsRouter       from './routes/api/agents.js';
import tasksSummaryRouter from './routes/api/tasks-summary.js';
import analyticsRouter    from './routes/api/analytics.js';
import tasksRouter        from './routes/tasks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use('/vendor', express.static(join(__dirname, 'public/vendor'), {
  maxAge: '1y',
  immutable: true,
}));
app.use(express.static(join(__dirname, 'public'), { maxAge: '1h' }));
app.use(session({
  secret: (() => {
    if (!process.env.SESSION_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET env var required in production');
      }
      console.warn('[server] SESSION_SECRET not set — using insecure dev secret');
    }
    return process.env.SESSION_SECRET || 'dev-secret-change-in-prod';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }
}));

app.use('/api/element', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV !== 'production' }));
app.use('/api/element',    elementRouter);
app.use('/api/export',     express.json({ limit: '2mb' }), exportRouter);
app.use('/api/agents',     agentsRouter);
app.use('/api/tasks',      tasksSummaryRouter);
app.use('/api/analytics',  analyticsRouter);
app.use('/tasks',          tasksRouter);
app.use('/',             pagesRouter);

app.use((err, _req, res, _next) => {
  console.error('[server error]', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

app.listen(PORT, () => console.log(`Hardy House running on http://localhost:${PORT}`));
