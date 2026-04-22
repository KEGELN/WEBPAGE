#!/usr/bin/env node
/**
 * sync-todos.mjs
 * Fetches all todos from the local training_db.json and writes them as
 * individual Markdown files into the ./todos/ directory.
 *
 * Usage:
 *   node scripts/sync-todos.mjs
 *   # or add to package.json: "todos": "node scripts/sync-todos.mjs"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'training_db.json');
const TODOS_DIR = path.join(ROOT, 'todos');

// ── read DB ─────────────────────────────────────────────────────────
if (!fs.existsSync(DB_PATH)) {
  console.error(`❌  DB not found at ${DB_PATH}. Run the app first to create it.`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const todos = (db.todos ?? []);

if (todos.length === 0) {
  console.log('ℹ️  No todos found in the database.');
  process.exit(0);
}

// ── create output dir ────────────────────────────────────────────────
if (!fs.existsSync(TODOS_DIR)) fs.mkdirSync(TODOS_DIR, { recursive: true });

// ── write index ──────────────────────────────────────────────────────
const open   = todos.filter((t) => !t.done);
const done   = todos.filter((t) =>  t.done);
const byPriority = (a, b) => {
  const order = { high: 0, medium: 1, low: 2 };
  return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
};

const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
const statusEmoji   = (t) => t.done ? '✅' : '⬜';

const formatDate = (iso) => iso ? new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : '—';

function todoRow(t) {
  const p = priorityEmoji[t.priority] ?? '⬜';
  const d = formatDate(t.createdAt);
  return `| ${statusEmoji(t)} | ${p} ${t.priority} | ${t.text.replace(/\|/g, '\\|')} | ${d} |`;
}

const indexMd = [
  `# Todo-Liste`,
  `> Generiert: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}  `,
  `> **${open.length} offen** · ${done.length} erledigt`,
  '',
  '## Offen',
  '',
  '| Status | Priorität | Aufgabe | Erstellt |',
  '|--------|-----------|---------|---------|',
  ...open.sort(byPriority).map(todoRow),
  '',
  done.length > 0 ? '## Erledigt\n\n| Status | Priorität | Aufgabe | Erledigt |\n|--------|-----------|---------|---------|' : '',
  ...done.sort((a, b) => new Date(b.doneAt ?? 0) - new Date(a.doneAt ?? 0)).map((t) => {
    const p = priorityEmoji[t.priority] ?? '⬜';
    return `| ✅ | ${p} ${t.priority} | ${t.text.replace(/\|/g, '\\|')} | ${formatDate(t.doneAt)} |`;
  }),
].filter((l) => l !== undefined).join('\n');

fs.writeFileSync(path.join(TODOS_DIR, 'README.md'), indexMd + '\n', 'utf-8');
console.log(`✅  Wrote ${path.join(TODOS_DIR, 'README.md')}`);

// ── write individual files ───────────────────────────────────────────
const written = new Set();
for (const todo of todos) {
  const slug = todo.id.replace(/[^a-z0-9_-]/gi, '-');
  const file = path.join(TODOS_DIR, `${slug}.md`);
  const content = [
    `# ${todo.done ? '~~' : ''}${todo.text}${todo.done ? '~~' : ''}`,
    '',
    `| Feld      | Wert |`,
    `|-----------|------|`,
    `| ID        | \`${todo.id}\` |`,
    `| Status    | ${todo.done ? 'Erledigt ✅' : 'Offen ⬜'} |`,
    `| Priorität | ${priorityEmoji[todo.priority] ?? ''} ${todo.priority} |`,
    `| Erstellt  | ${formatDate(todo.createdAt)} |`,
    todo.doneAt ? `| Erledigt  | ${formatDate(todo.doneAt)} |` : '',
  ].filter((l) => l !== undefined).join('\n');

  fs.writeFileSync(file, content + '\n', 'utf-8');
  written.add(file);
}

// ── clean up orphaned files ──────────────────────────────────────────
const existing = fs.readdirSync(TODOS_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((f) => path.join(TODOS_DIR, f));

for (const f of existing) {
  if (!written.has(f)) {
    fs.unlinkSync(f);
    console.log(`🗑️  Removed orphaned file: ${path.basename(f)}`);
  }
}

console.log(`📋  ${open.length} open · ${done.length} done · ${todos.length} total todo files synced to ./todos/`);
