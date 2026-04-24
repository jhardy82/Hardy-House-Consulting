import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pagesRouter   from './routes/pages.js';
import elementRouter from './routes/api/element.js';
import exportRouter  from './routes/api/export.js';
import agentsRouter  from './routes/api/agents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use('/api/element',  elementRouter);
app.use('/api/export',   exportRouter);
app.use('/api/agents',   agentsRouter);
app.use('/',             pagesRouter);

app.listen(PORT, () => console.log(`Hardy House running on http://localhost:${PORT}`));
