/**
 * worker.js — Autonomous task processor
 * Run manually:  node worker.js
 * Run via cron:  scheduled hourly by Claude Code cron job
 *
 * Behaviour:
 *   1. Read tasks.json
 *   2. If no pending/in-progress tasks → log "nothing to do" and exit
 *   3. Process each task in priority order (high → medium → low)
 *      - Mark in-progress, log start
 *      - Simulate work (configurable delay)
 *      - Mark complete, log completion
 *   4. Write updated tasks back to tasks.json
 */

const fs   = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'tasks.json');
const LOG_FILE   = path.join(__dirname, 'tasks.log');

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// Simulated work duration per task (ms). Adjust as desired.
const WORK_DELAY_MS = 500;

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [WORKER] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function readTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    log('ERROR: Could not parse tasks.json');
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  log('Worker started — scanning tasks...');

  const tasks = readTasks();

  const actionable = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');

  if (actionable.length === 0) {
    log('No pending tasks. Nothing to do.');
    return;
  }

  // Sort: high → medium → low; within same priority, by createdAt ascending
  actionable.sort((a, b) => {
    const pdiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pdiff !== 0) return pdiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  log(`Found ${actionable.length} task(s) to process.`);

  for (const task of actionable) {
    // Re-read tasks each iteration so concurrent edits aren't lost
    const current = readTasks();
    const idx = current.findIndex(t => t.id === task.id);
    if (idx === -1) { log(`Task "${task.title}" no longer exists — skipping.`); continue; }
    if (current[idx].status === 'complete') { log(`Task "${task.title}" already complete — skipping.`); continue; }

    log(`Starting [${task.priority.toUpperCase()}] "${task.title}"`);
    current[idx].status = 'in-progress';
    writeTasks(current);

    await sleep(WORK_DELAY_MS);

    const updated = readTasks();
    const idx2 = updated.findIndex(t => t.id === task.id);
    if (idx2 !== -1) {
      updated[idx2].status      = 'complete';
      updated[idx2].completedAt = new Date().toISOString();
      writeTasks(updated);
    }

    log(`Completed [${task.priority.toUpperCase()}] "${task.title}"`);
  }

  const summary = readTasks();
  const remaining = summary.filter(t => t.status !== 'complete').length;
  log(`Worker finished. Remaining incomplete tasks: ${remaining}`);
}

run().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
