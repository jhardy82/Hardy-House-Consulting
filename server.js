import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pagesRouter   from './routes/pages.js';
import elementRouter from './routes/api/element.js';
import exportRouter  from './routes/api/export.js';
import agentsRouter       from './routes/api/agents.js';
import tasksSummaryRouter from './routes/api/tasks-summary.js';
import tasksRouter        from './routes/tasks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.static(join(__dirname, 'public')));
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

app.use('/api/element',  elementRouter);
app.use('/api/export',   exportRouter);
app.use('/api/agents',   agentsRouter);
app.use('/api/tasks',    tasksSummaryRouter);
app.use('/tasks',        tasksRouter);
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
