import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import readline from 'readline';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const DB_PATH      = join(__dirname, 'tasks.db');
const SESSION_FILE = join(__dirname, '.current-session');

let db;
try {
  db = new Database(DB_PATH);
} catch (err) {
  console.error('tasks: failed to open database:', err.message);
  process.exit(1);
}

db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at    TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'open',
  priority          INTEGER NOT NULL DEFAULT 3,
  section           TEXT,
  session_created   TEXT REFERENCES sessions(id),
  session_completed TEXT REFERENCES sessions(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  notes             TEXT
)`).run();

// --- helpers ---

function newSessionId() {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '-');
  const hex  = randomBytes(2).toString('hex');
  return `${date}T${time}_${hex}`;
}

function getCurrentSession() {
  if (!existsSync(SESSION_FILE)) return null;
  return readFileSync(SESSION_FILE, 'utf8').trim();
}

import { parseFlags } from './flags.js';

function appendNote(existing, text) {
  const timestamp = new Date().toISOString().slice(0, 16);
  const newNote   = `[${timestamp}] ${text}`;
  return existing ? `${existing}\n${newNote}` : newNote;
}

function relativeTime(isoString) {
  const utc  = isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PRIORITY_LABEL = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MED', 4: 'LOW' };
const INNER = 54; // inner box width

function pad(str, len) {
  str = String(str);
  if (str.length > len) str = str.slice(0, len - 1) + '…';
  return str.padEnd(len);
}

function boxLine(content = '') {
  return `║  ${pad(content, INNER)}║`;
}

function divider() {
  return `╠${'═'.repeat(INNER + 2)}╣`;
}

// --- context command ---

function cmdContext() {
  const sessionId = getCurrentSession();
  const session   = sessionId
    ? db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId)
    : db.prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();

  const allTasks = db.prepare("SELECT * FROM tasks ORDER BY priority ASC, updated_at DESC").all();

  const inProgress = allTasks.filter(t => t.status === 'in_progress');
  const openHigh   = allTasks.filter(t => t.status === 'open' && t.priority <= 2);
  const blocked    = allTasks.filter(t => t.status === 'blocked');
  const doneThis   = session
    ? allTasks.filter(t => t.status === 'done' && t.session_completed === session.id)
    : [];
  const openAll    = allTasks.filter(t => t.status === 'open');

  const lastSession = db.prepare(
    "SELECT * FROM sessions WHERE status = 'complete' ORDER BY ended_at DESC LIMIT 1"
  ).get();
  const lastDone = lastSession
    ? allTasks.filter(t => t.status === 'done' && t.session_completed === lastSession.id)
    : [];

  const top    = `╔${'═'.repeat(INNER + 2)}╗`;
  const bottom = `╚${'═'.repeat(INNER + 2)}╝`;

  const lines = [top];

  lines.push(boxLine('Hardy House · Task Context'));
  lines.push(divider());

  if (session) {
    const titleTrunc = session.description.length > 44 ? session.description.slice(0, 43) + '…' : session.description;
    lines.push(boxLine(`Session:  ${session.id}`));
    lines.push(boxLine(`Focus:    ${titleTrunc}`));
    lines.push(boxLine(`Status:   ${session.status} · started ${relativeTime(session.started_at)}`));
  } else {
    lines.push(boxLine('No active session'));
    lines.push(boxLine("Run: node tasks/cli.js session start \"description\""));
  }

  function taskLine(t) {
    const label = `[${PRIORITY_LABEL[t.priority] ?? t.priority}]`;
    const title = t.title.length > 44 ? t.title.slice(0, 43) + '…' : t.title;
    return boxLine(`  #${String(t.id).padEnd(3)} ${label.padEnd(10)} ${title}`);
  }

  if (inProgress.length > 0) {
    lines.push(divider());
    lines.push(boxLine(`IN PROGRESS (${inProgress.length})`));
    inProgress.forEach(t => lines.push(taskLine(t)));
  }

  if (openHigh.length > 0) {
    lines.push(divider());
    lines.push(boxLine(`OPEN · HIGH PRIORITY (${openHigh.length})`));
    openHigh.forEach(t => lines.push(taskLine(t)));
  } else if (openAll.length > 0 && inProgress.length === 0) {
    lines.push(divider());
    lines.push(boxLine(`OPEN (${openAll.length})`));
    openAll.slice(0, 5).forEach(t => lines.push(taskLine(t)));
    if (openAll.length > 5) lines.push(boxLine(`  … and ${openAll.length - 5} more`));
  }

  if (blocked.length > 0) {
    lines.push(divider());
    lines.push(boxLine(`BLOCKED (${blocked.length})`));
    blocked.forEach(t => lines.push(taskLine(t)));
  }

  if (session) {
    lines.push(divider());
    lines.push(boxLine(`DONE THIS SESSION (${doneThis.length})`));
    doneThis.forEach(t => lines.push(taskLine(t)));
  }

  if (lastSession && lastDone.length > 0) {
    lines.push(divider());
    const dateStr = lastSession.ended_at ? lastSession.ended_at.slice(0, 10) : '?';
    lines.push(boxLine(`LAST SESSION: "${lastSession.description.slice(0, 30)}" (${dateStr})`));
    lastDone.forEach(t => {
      const title = t.title.length > 40 ? t.title.slice(0, 39) + '…' : t.title;
      lines.push(boxLine(`  ✓ #${String(t.id).padEnd(3)} ${title}`));
    });
  }

  lines.push(bottom);
  console.log(lines.join('\n'));
}

// --- commands ---

const [,, cmd, ...rest] = process.argv;

if (!cmd) {
  console.log(`Hardy House Task Manager

  session start "description"    Start a new work session
  session end                    End the current session
  context                        Print session context (run at session start)
  add "title" [options]          Add a task
  start <id>                     Mark task in progress
  done <id> [--note "text"]      Mark task complete
  block <id> "reason"            Mark task blocked
  note <id> "text"               Add a note to a task
  list [--status] [--section]    List tasks
  log                            Show session history
  reset-schema                   Drop and rebuild tables`);
  process.exit(0);
}

if (cmd === 'session') {
  const sub = rest[0];

  if (sub === 'start') {
    const description = rest[1];
    if (!description) { console.error('Usage: session start "description"'); process.exit(1); }
    const existing = db.prepare("SELECT id FROM sessions WHERE status = 'active'").get();
    if (existing) {
      console.log(`Active session already running: ${existing.id}`);
      console.log('Run "session end" first.');
      process.exit(1);
    }
    const id = newSessionId();
    db.prepare("INSERT INTO sessions (id, description) VALUES (?, ?)").run(id, description);
    writeFileSync(SESSION_FILE, id, 'utf8');
    console.log(`Session started: ${id}`);
    console.log(`Focus: ${description}`);

  } else if (sub === 'end') {
    let sessionId = getCurrentSession();
    if (!sessionId) {
      const active = db.prepare("SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
      if (!active) { console.error('No active session.'); process.exit(1); }
      sessionId = active.id;
      console.log(`Note: session file missing — ending session from DB: ${sessionId}`);
    }
    const result = db.prepare("UPDATE sessions SET status = 'complete', ended_at = datetime('now') WHERE id = ?").run(sessionId);
    if (result.changes === 0) {
      console.error(`Warning: session "${sessionId}" not found in DB — file cleared but DB unchanged.`);
    }
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
    console.log(`Session ended: ${sessionId}`);

  } else {
    console.error('Unknown session command. Use: session start | session end');
    process.exit(1);
  }

} else if (cmd === 'context') {
  cmdContext();

} else if (cmd === 'add') {
  const title = rest[0];
  if (!title) { console.error('Usage: add "title" [--priority 1-4] [--section name] [--desc "text"]'); process.exit(1); }
  const flags    = parseFlags(rest.slice(1));
  const rawPri   = flags.priority !== undefined ? parseInt(flags.priority, 10) : 3;
  if (flags.priority !== undefined && !Number.isInteger(Number(flags.priority))) {
    console.error('Error: --priority must be an integer (1-4)');
    process.exit(1);
  }
  if (isNaN(rawPri) || rawPri < 1 || rawPri > 4) {
    console.error('Error: --priority must be 1 (critical), 2 (high), 3 (medium), or 4 (low)');
    process.exit(1);
  }
  const priority    = rawPri;
  const section     = flags.section || null;
  const description = flags.desc || null;
  const sessionId   = getCurrentSession();

  const result = db.prepare(
    "INSERT INTO tasks (title, description, priority, section, session_created) VALUES (?, ?, ?, ?, ?)"
  ).run(title, description, priority, section, sessionId);

  console.log(`✓ Task #${result.lastInsertRowid} added: ${title}`);

} else if (cmd === 'start') {
  const id = parseInt(rest[0], 10);
  if (!id) { console.error('Usage: start <id>'); process.exit(1); }
  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
  if (!task) { console.error(`Task #${id} not found.`); process.exit(1); }
  db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(id);
  console.log(`✓ Task #${id} in progress`);

} else if (cmd === 'done') {
  const rawId = rest[0];
  if (!rawId || !Number.isInteger(Number(rawId))) {
    console.error('Usage: done <id> [--note "text"]  (id must be a whole number)');
    process.exit(1);
  }
  const id   = parseInt(rawId, 10);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) { console.error(`Task #${id} not found.`); process.exit(1); }
  const flags     = parseFlags(rest.slice(1));
  const sessionId = getCurrentSession();
  if (sessionId) {
    const sessionExists = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sessionId);
    if (!sessionExists) {
      console.error(`Error: Session "${sessionId}" not found in DB. Run "session end" then "session start" to reset.`);
      process.exit(1);
    }
  }
  let notes = task.notes || null;
  if (flags.note) notes = appendNote(notes, flags.note);

  db.prepare(
    "UPDATE tasks SET status = 'done', session_completed = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(sessionId, notes, id);
  console.log(`✓ Task #${id} done`);

} else if (cmd === 'block') {
  const id     = parseInt(rest[0], 10);
  const reason = rest[1];
  if (!id || !reason) { console.error('Usage: block <id> "reason"'); process.exit(1); }
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) { console.error(`Task #${id} not found.`); process.exit(1); }
  const notes = appendNote(task.notes, `BLOCKED: ${reason}`);
  db.prepare("UPDATE tasks SET status = 'blocked', notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
  console.log(`✓ Task #${id} blocked: ${reason}`);

} else if (cmd === 'note') {
  const id   = parseInt(rest[0], 10);
  const text = rest[1];
  if (!id || !text) { console.error('Usage: note <id> "text"'); process.exit(1); }
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) { console.error(`Task #${id} not found.`); process.exit(1); }
  const notes = appendNote(task.notes, text);
  db.prepare("UPDATE tasks SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(notes, id);
  console.log(`✓ Note added to Task #${id}`);

} else if (cmd === 'list') {
  const flags   = parseFlags(rest);
  let query     = "SELECT * FROM tasks WHERE 1=1";
  const params  = [];
  if (flags.status)  { query += " AND status = ?";  params.push(flags.status); }
  if (flags.section) { query += " AND section = ?"; params.push(flags.section); }
  query += " ORDER BY priority ASC, updated_at DESC";

  const tasks = db.prepare(query).all(...params);
  if (tasks.length === 0) { console.log('No tasks found.'); process.exit(0); }

  console.log(`${'ID'.padEnd(6)} ${'PRI'.padEnd(5)} ${'STATUS'.padEnd(12)} ${'SECTION'.padEnd(12)} TITLE`);
  console.log('─'.repeat(70));
  tasks.forEach(t => {
    const pri  = String(PRIORITY_LABEL[t.priority] ?? t.priority);
    const sec  = (t.section || '').padEnd(12).slice(0, 12);
    const stat = t.status.padEnd(12).slice(0, 12);
    const titl = t.title.length > 30 ? t.title.slice(0, 29) + '…' : t.title;
    console.log(`#${String(t.id).padEnd(5)} ${pri.padEnd(5)} ${stat} ${sec} ${titl}`);
  });

} else if (cmd === 'log') {
  const sessions = db.prepare("SELECT * FROM sessions ORDER BY started_at DESC").all();
  if (sessions.length === 0) { console.log('No sessions yet.'); process.exit(0); }

  sessions.forEach(s => {
    const count = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE session_created = ?").get(s.id).n;
    const done  = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE session_completed = ?").get(s.id).n;
    const dur   = s.ended_at
      ? `ended ${relativeTime(s.ended_at)}`
      : `active · started ${relativeTime(s.started_at)}`;
    console.log(`[${s.status.toUpperCase().padEnd(8)}] ${s.id}  ${dur}`);
    console.log(`           ${s.description}`);
    console.log(`           created: ${count} tasks · completed: ${done} tasks`);
    console.log();
  });

} else if (cmd === 'reset-schema') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Drop and recreate all tables? This deletes all data. [y/N] ', answer => {
    rl.close();
    if (answer.toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0); }
    db.prepare("DROP TABLE IF EXISTS tasks").run();
    db.prepare("DROP TABLE IF EXISTS sessions").run();
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')), ended_at TEXT
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT, status TEXT NOT NULL DEFAULT 'open',
      priority INTEGER NOT NULL DEFAULT 3, section TEXT,
      session_created TEXT REFERENCES sessions(id),
      session_completed TEXT REFERENCES sessions(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), notes TEXT
    )`).run();
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
    console.log('Schema reset complete.');
  });

} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Run "node tasks/cli.js" for usage.');
  process.exit(1);
}
