/**
 * SalesMap – Express backend
 * Serves static files + REST API for sales rep management.
 * Data is persisted in a JSON file (path configurable via DATA_FILE env var).
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { REGIONS, CONTINENTS, getEffectiveCountries } = require('./regions-data');

const app  = express();
const PORT = process.env.PORT      || 3000;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data.json');

/* ── Middleware ──────────────────────────────────────────────── */
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

/* ── Data helpers ────────────────────────────────────────────── */
function readData() {
  try {
    if (!fs.existsSync(DATA)) {
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

/**
 * Resolve conflicts: for every country in newRep's effective set,
 * remove it from all other reps (silently).
 * - If in another rep's `countries` list → remove
 * - If covered by another rep's region → add to that region's exclusions
 * - If covered by another rep's continent → add to that continent's exclusions
 * - After exclusions: if a region/continent is fully excluded → remove it
 */
function resolveConflicts(newRep, allReps) {
  const newEffective = new Set(getEffectiveCountries(newRep));

  return allReps.map(other => {
    if (other.id === newRep.id) return other;

    let changed = false;
    const rep = JSON.parse(JSON.stringify(other)); // deep clone

    // Remove from individual countries
    const before = (rep.countries || []).length;
    rep.countries = (rep.countries || []).filter(c => !newEffective.has(c));
    if (rep.countries.length !== before) changed = true;

    // Add to region exclusions
    rep.regions = (rep.regions || []).map(r => {
      const def = REGIONS[r.id];
      if (!def) return r;
      const toExclude = def.countries.filter(c => newEffective.has(c) && !(r.exclusions || []).includes(c));
      if (toExclude.length === 0) return r;
      changed = true;
      return { ...r, exclusions: [...(r.exclusions || []), ...toExclude] };
    }).filter(r => {
      // Remove region if all its countries are excluded
      const def = REGIONS[r.id];
      if (!def) return true;
      const allExcluded = def.countries.every(c => (r.exclusions || []).includes(c));
      if (allExcluded) { changed = true; return false; }
      return true;
    });

    // Add to continent exclusions
    rep.continents = (rep.continents || []).map(ct => {
      const def = CONTINENTS[ct.id];
      if (!def) return ct;
      const toExclude = def.countries.filter(c => newEffective.has(c) && !(ct.exclusions || []).includes(c));
      if (toExclude.length === 0) return ct;
      changed = true;
      return { ...ct, exclusions: [...(ct.exclusions || []), ...toExclude] };
    }).filter(ct => {
      const def = CONTINENTS[ct.id];
      if (!def) return true;
      const allExcluded = def.countries.every(c => (ct.exclusions || []).includes(c));
      if (allExcluded) { changed = true; return false; }
      return true;
    });

    return changed ? rep : other;
  });
}

/* ── REST API ────────────────────────────────────────────────── */

app.get('/api/salesreps', (req, res) => {
  const { salesReps } = readData();
  res.json(salesReps);
});

app.post('/api/salesreps', (req, res) => {
  const { name, color, countries, regions, continents } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const data = readData();
  const rep  = {
    id: makeId(),
    name: name.trim(),
    color: color || '#3B82F6',
    countries: countries || [],
    regions: regions || [],
    continents: continents || []
  };
  data.salesReps.push(rep);
  data.salesReps = resolveConflicts(rep, data.salesReps);
  writeData(data);
  res.status(201).json(rep);
});

app.put('/api/salesreps/:id', (req, res) => {
  const { name, color, countries, regions, continents } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const data = readData();
  const idx  = data.salesReps.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Sales rep not found' });

  data.salesReps[idx] = {
    id: req.params.id,
    name: name.trim(),
    color,
    countries: countries || [],
    regions: regions || [],
    continents: continents || []
  };
  data.salesReps = resolveConflicts(data.salesReps[idx], data.salesReps);
  writeData(data);
  res.json(data.salesReps[idx]);
});

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