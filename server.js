const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST create task
app.post('/api/tasks', async (req, res) => {
  const { title, description, priority } = req.body;
  if (!title || !priority) return res.status(400).json({ error: 'title and priority required' });

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, description: description || '', priority })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT update task
app.put('/api/tasks/:id', async (req, res) => {
  const updates = req.body;
  if (updates.status === 'complete' && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET log (last 100 lines from supabase logs table — fallback to empty)
app.get('/api/log', async (req, res) => {
  const { data } = await supabase
    .from('task_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  const log = (data || []).reverse().map(r => `[${r.created_at}] ${r.message}`).join('\n');
  res.json({ log });
});

app.listen(PORT, () => {
  console.log(`Todo dashboard running at http://localhost:${PORT}`);
});
