const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const LOG_FILE = path.join(__dirname, 'tasks.log');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function appendLog(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

// GET all tasks
app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

// POST create task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority } = req.body;
  if (!title || !priority) return res.status(400).json({ error: 'title and priority required' });

  const tasks = readTasks();
  const task = {
    id: uuidv4(),
    title,
    description: description || '',
    priority, // high | medium | low
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  tasks.push(task);
  writeTasks(tasks);
  appendLog(`CREATED task "${title}" [${priority}]`);
  res.status(201).json(task);
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const updated = { ...tasks[idx], ...req.body, id: tasks[idx].id };
  tasks[idx] = updated;
  writeTasks(tasks);
  appendLog(`UPDATED task "${updated.title}" [status: ${updated.status}]`);
  res.json(updated);
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const [removed] = tasks.splice(idx, 1);
  writeTasks(tasks);
  appendLog(`DELETED task "${removed.title}"`);
  res.json({ success: true });
});

// GET log file contents
app.get('/api/log', (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json({ log: '' });
  const log = fs.readFileSync(LOG_FILE, 'utf8');
  res.json({ log });
});

app.listen(PORT, () => {
  console.log(`Todo dashboard running at http://localhost:${PORT}`);
  appendLog(`SERVER started on port ${PORT}`);
});
