import { Router } from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;
try {
  db = new Database(join(__dirname, '../tasks/tasks.db'));
} catch (err) {
  console.error('tasks: failed to open tasks.db:', err.message);
  process.exit(1);
}

const router = Router();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRIORITY_LABEL  = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MED', 4: 'LOW' };
const PRIORITY_COLOUR = {
  1: '#C49A1F',
  2: '#E05C20',
  3: '#3B5FC8',
  4: 'rgba(244,240,235,.35)',
};

function groupTasks(all) {
  return {
    open:        all.filter(t => t.status === 'open'),
    in_progress: all.filter(t => t.status === 'in_progress'),
    blocked:     all.filter(t => t.status === 'blocked'),
    done:        all.filter(t => t.status === 'done'),
  };
}

function taskCard(t) {
  const colour = PRIORITY_COLOUR[t.priority] || PRIORITY_COLOUR[4];
  const label  = escapeHtml(PRIORITY_LABEL[t.priority] ?? t.priority);
  const raw    = t.title.length > 60 ? t.title.slice(0, 59) + '…' : t.title;
  const title  = escapeHtml(raw);
  const sec    = t.section ? `<span class="tag">${escapeHtml(t.section)}</span>` : '';
  const ts     = (t.updated_at || t.created_at || '').slice(0, 16);
  return `
    <div class="card" style="border-left:3px solid ${colour}">
      <div class="card-head">
        <span class="badge">#${t.id}</span>
        <span class="priority" style="color:${colour}">${label}</span>
        ${sec}
      </div>
      <div class="card-title">${title}</div>
      <div class="card-ts">${ts}</div>
    </div>`;
}

function column(heading, tasks) {
  const cards = tasks.length
    ? tasks.map(taskCard).join('')
    : '<div class="empty">—</div>';
  return `
    <div class="col">
      <h2 class="col-head">${heading} <span class="count">${tasks.length}</span></h2>
      <div class="col-body">${cards}</div>
    </div>`;
}

function buildHtml(session, grouped) {
  const sessionBanner = session
    ? `<div class="session-banner active">
         <span class="dot"></span>
         <strong>${escapeHtml(session.id)}</strong> — ${escapeHtml(session.description)}
       </div>`
    : `<div class="session-banner inactive">
         No active session — run: <code>node tasks/cli.js session start "description"</code>
       </div>`;

  const cols = [
    column('Open',        grouped.open),
    column('In Progress', grouped.in_progress),
    column('Blocked',     grouped.blocked),
    column('Done',        grouped.done),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="30">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hardy House · Tasks</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--hh-void);
      color: var(--hh-fg);
      font-family: var(--font-body);
      min-height: 100vh;
      padding: var(--space-8) var(--space-6);
    }

    header {
      display: flex;
      align-items: baseline;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    header h1 {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      color: var(--hh-gold);
      letter-spacing: var(--tracking-wide);
    }

    header span {
      color: var(--hh-fg-2);
      font-size: var(--text-sm);
    }

    .session-banner {
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-5);
      margin-bottom: var(--space-6);
      font-size: var(--text-sm);
      font-family: var(--font-mono);
    }

    .session-banner.active {
      background: rgba(196,154,31,.08);
      border: 1px solid var(--hh-gold-dim);
      color: var(--hh-fg);
    }

    .session-banner.active .dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #4caf50;
      margin-right: var(--space-2);
      vertical-align: middle;
    }

    .session-banner.inactive {
      background: var(--surface-2);
      border: 1px solid var(--border-1);
      color: var(--hh-fg-2);
    }

    .session-banner code {
      color: var(--hh-gold);
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
    }

    @media (max-width: 1050px) { .board { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px)  { .board { grid-template-columns: 1fr; } }

    .col {
      background: var(--surface-2);
      border: 1px solid var(--border-1);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .col-head {
      font-family: var(--font-display);
      font-size: var(--text-base);
      font-weight: 600;
      letter-spacing: var(--tracking-wide);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border-1);
      color: var(--hh-fg-2);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .count {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      background: var(--surface-3);
      border-radius: var(--radius-full);
      padding: 2px 7px;
      color: var(--hh-fg-3);
    }

    .col-body {
      padding: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .empty {
      color: var(--hh-fg-4);
      text-align: center;
      padding: var(--space-6) 0;
      font-size: var(--text-sm);
    }

    .card {
      background: var(--surface-3);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .card-head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .badge {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--hh-fg-3);
    }

    .priority {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 700;
      letter-spacing: var(--tracking-wider);
    }

    .tag {
      font-size: var(--text-xs);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      background: var(--surface-4);
      color: var(--hh-fg-3);
      font-family: var(--font-mono);
    }

    .card-title {
      font-size: var(--text-sm);
      color: var(--hh-fg);
      line-height: var(--leading-snug);
    }

    .card-ts {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--hh-fg-4);
    }
  </style>
</head>
<body>
  <header>
    <h1>Hardy House · Tasks</h1>
    <span>auto-refreshes every 30s</span>
  </header>
  ${sessionBanner}
  <div class="board">
    ${cols}
  </div>
</body>
</html>`;
}

router.get('/api', (_req, res) => {
  try {
    const session = db.prepare("SELECT * FROM sessions WHERE status='active' LIMIT 1").get() || null;
    const all     = db.prepare("SELECT * FROM tasks ORDER BY priority ASC, updated_at DESC").all();
    res.json({ session, tasks: groupTasks(all) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (_req, res) => {
  try {
    const session = db.prepare("SELECT * FROM sessions WHERE status='active' LIMIT 1").get() || null;
    const all     = db.prepare("SELECT * FROM tasks ORDER BY priority ASC, updated_at DESC").all();
    res.send(buildHtml(session, groupTasks(all)));
  } catch (err) {
    res.status(500).send(`<pre>Error: ${err.message}</pre>`);
  }
});

export default router;
