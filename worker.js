/**
 * worker.js — Autonomous task processor (Supabase-backed)
 * Run manually:  node worker.js
 * Scheduled hourly by Claude Code cron job.
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const WORK_DELAY_MS = 500;

async function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [WORKER] ${msg}`);
  await supabase.from('task_logs').insert({ message: `[WORKER] ${msg}` });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await log('Worker started — scanning tasks...');

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .in('status', ['pending', 'in-progress']);

  if (error) { await log(`ERROR fetching tasks: ${error.message}`); return; }

  if (!tasks || tasks.length === 0) {
    await log('No pending tasks. Nothing to do.');
    return;
  }

  tasks.sort((a, b) => {
    const pdiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return pdiff !== 0 ? pdiff : new Date(a.created_at) - new Date(b.created_at);
  });

  await log(`Found ${tasks.length} task(s) to process.`);

  for (const task of tasks) {
    await log(`Starting [${task.priority.toUpperCase()}] "${task.title}"`);

    await supabase.from('tasks').update({ status: 'in-progress' }).eq('id', task.id);
    await sleep(WORK_DELAY_MS);
    await supabase.from('tasks').update({
      status: 'complete',
      completed_at: new Date().toISOString()
    }).eq('id', task.id);

    await log(`Completed [${task.priority.toUpperCase()}] "${task.title}"`);
  }

  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'complete');

  await log(`Worker finished. Remaining incomplete tasks: ${count ?? 0}`);
}

run().catch(async err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
