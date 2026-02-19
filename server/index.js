/**
 * SalesMap – Express backend
 * Serves static files + REST API for sales rep management.
 * Data is persisted in a JSON file (path configurable via DATA_FILE env var).
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT      || 3000;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data.json');

/* ── Middleware ──────────────────────────────────────────────── */
app.use(express.json());

// Serve the static frontend from the project root
app.use(express.static(path.join(__dirname, '..')));

/* ── Data helpers ────────────────────────────────────────────── */
function readData() {
  try {
    if (!fs.existsSync(DATA)) {
      // Ensure parent directory exists and seed empty file
      fs.mkdirSync(path.dirname(DATA), { recursive: true });
      fs.writeFileSync(DATA, JSON.stringify({ salesReps: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch (err) {
    console.error('Error reading data:', err);
    return { salesReps: [] };
  }
}

function writeData(data) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── REST API ────────────────────────────────────────────────── */

// GET /api/salesreps – return all sales reps
app.get('/api/salesreps', (req, res) => {
  const { salesReps } = readData();
  res.json(salesReps);
});

// POST /api/salesreps – create a new sales rep
app.post('/api/salesreps', (req, res) => {
  const { name, color, countries } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const data = readData();
  const rep  = { id: makeId(), name: name.trim(), color: color || '#3B82F6', countries: countries || [] };
  data.salesReps.push(rep);
  writeData(data);
  res.status(201).json(rep);
});

// PUT /api/salesreps/:id – update an existing sales rep
app.put('/api/salesreps/:id', (req, res) => {
  const { name, color, countries } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const data = readData();
  const idx  = data.salesReps.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Sales rep not found' });
  data.salesReps[idx] = { id: req.params.id, name: name.trim(), color, countries: countries || [] };
  writeData(data);
  res.json(data.salesReps[idx]);
});

// DELETE /api/salesreps/:id – remove a sales rep
app.delete('/api/salesreps/:id', (req, res) => {
  const data = readData();
  const before = data.salesReps.length;
  data.salesReps = data.salesReps.filter(r => r.id !== req.params.id);
  if (data.salesReps.length === before) {
    return res.status(404).json({ error: 'Sales rep not found' });
  }
  writeData(data);
  res.status(204).end();
});

/* ── Start ───────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`SalesMap running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA}`);
});
