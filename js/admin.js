/**
 * admin.js – Admin panel: CRUD for sales reps.
 * Supports individual countries + region/continent quick-select with exclusions.
 */

/* ── Preset colours ─────────────────────────────────────────── */
const PRESET_COLORS = [
  '#3B82F6','#EF4444','#10B981','#F59E0B',
  '#8B5CF6','#EC4899','#06B6D4','#84CC16',
  '#F97316','#6366F1','#14B8A6','#E11D48'
];

/* ── State ───────────────────────────────────────────────────── */
let editingId          = null;
let selectedCodes      = new Set();   // effective set (individual + expanded from regions/continents)
let individualCodes    = new Set();   // only individually selected countries (not via region/continent)
let selectedRegions    = [];          // [{id, exclusions:[]}]
let selectedContinents = [];          // [{id, exclusions:[]}]
let activeTab          = 'all';
let pendingDeleteId    = null;

/* ── DOM refs ────────────────────────────────────────────────── */
const repsGrid        = document.getElementById('reps-grid');
const emptyState      = document.getElementById('empty-state');
const modalOverlay    = document.getElementById('modal-overlay');
const confirmOverlay  = document.getElementById('confirm-overlay');
const modalTitle      = document.getElementById('modal-title');
const repNameInput    = document.getElementById('rep-name');
const repColorInput   = document.getElementById('rep-color');
const colorHexLabel   = document.getElementById('color-hex-label');
const nameError       = document.getElementById('name-error');
const countrySearch   = document.getElementById('country-search');
const searchClearBtn  = document.getElementById('search-clear-btn');
const countryList     = document.getElementById('country-list');
const selectedTagsEl  = document.getElementById('selected-tags');
const selectedCountEl = document.getElementById('selected-count');

/* ── Helpers ─────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Recompute selectedCodes from individualCodes + selectedRegions + selectedContinents */
function recomputeEffective() {
  selectedCodes = new Set(individualCodes);
  for (const r of selectedRegions) {
    const def = REGIONS[r.id];
    if (!def) continue;
    for (const c of def.countries) {
      if (!(r.exclusions || []).includes(c)) selectedCodes.add(c);
    }
  }
  for (const ct of selectedContinents) {
    const def = CONTINENTS[ct.id];
    if (!def) continue;
    for (const c of def.countries) {
      if (!(ct.exclusions || []).includes(c)) selectedCodes.add(c);
    }
  }
}

/** Returns which region/continent covers a given country code (first match) */
function getCoverSource(code) {
  for (const r of selectedRegions) {
    const def = REGIONS[r.id];
    if (def && def.countries.includes(code) && !(r.exclusions || []).includes(code)) {
      return { type: 'region', id: r.id };
    }
  }
  for (const ct of selectedContinents) {
    const def = CONTINENTS[ct.id];
    if (def && def.countries.includes(code) && !(ct.exclusions || []).includes(code)) {
      return { type: 'continent', id: ct.id };
    }
  }
  return null;
}

/** Returns true if a country code is in ANY selected region/continent (regardless of exclusions) */
function isInAnyRegionOrContinent(code) {
  for (const r of selectedRegions) {
    if ((REGIONS[r.id]?.countries || []).includes(code)) return true;
  }
  for (const ct of selectedContinents) {
    if ((CONTINENTS[ct.id]?.countries || []).includes(code)) return true;
  }
  return false;
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  buildColorPresets();
  buildRegionButtons();
  bindEvents();
  await renderRepsGrid();
});

/* ── Region / Continent buttons ─────────────────────────────── */
function buildRegionButtons() {
  const rb = document.getElementById('region-buttons');
  const cb = document.getElementById('continent-buttons');

  rb.innerHTML = Object.values(REGIONS).map(r =>
    `<button class="region-btn" data-type="region" data-id="${r.id}" title="${r.label}">${r.name}</button>`
  ).join('');

  cb.innerHTML = Object.values(CONTINENTS).map(c =>
    `<button class="region-btn" data-type="continent" data-id="${c.id}">${c.name}</button>`
  ).join('');

  document.getElementById('region-selector').addEventListener('click', e => {
    const btn = e.target.closest('.region-btn');
    if (!btn) return;
    const { type, id } = btn.dataset;
    toggleRegionOrContinent(type, id);
  });
}

function toggleRegionOrContinent(type, id) {
  if (type === 'region') {
    const idx = selectedRegions.findIndex(r => r.id === id);
    if (idx >= 0) {
      // Deselect: restore its countries to individual if they were individually selected before? No – just remove.
      selectedRegions.splice(idx, 1);
    } else {
      selectedRegions.push({ id, exclusions: [] });
    }
  } else {
    const idx = selectedContinents.findIndex(c => c.id === id);
    if (idx >= 0) {
      selectedContinents.splice(idx, 1);
    } else {
      selectedContinents.push({ id, exclusions: [] });
    }
  }
  recomputeEffective();
  updateRegionButtonStates();
  updateSelectedUI();
}

function updateRegionButtonStates() {
  document.querySelectorAll('.region-btn').forEach(btn => {
    const { type, id } = btn.dataset;
    const active = type === 'region'
      ? selectedRegions.some(r => r.id === id)
      : selectedContinents.some(c => c.id === id);
    btn.classList.toggle('active', active);
  });
}

/* ── Color presets ───────────────────────────────────────────── */
function buildColorPresets() {
  const container = document.getElementById('color-presets');
  container.innerHTML = PRESET_COLORS.map(c =>
    `<button class="preset-dot" style="background:${c}" data-color="${c}" title="${c}" aria-label="Color ${c}"></button>`
  ).join('');
  container.addEventListener('click', e => {
    const btn = e.target.closest('.preset-dot');
    if (btn) setColor(btn.dataset.color);
  });
}

function setColor(hex) {
  repColorInput.value = hex;
  colorHexLabel.textContent = hex.toUpperCase();
  document.querySelectorAll('.preset-dot').forEach(b =>
    b.classList.toggle('selected', b.dataset.color === hex));
}

/* ── Bind global events ──────────────────────────────────────── */
function bindEvents() {
  document.getElementById('add-rep-btn').addEventListener('click', () => openModal(null));
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.getElementById('save-btn').addEventListener('click', saveRep);

  repColorInput.addEventListener('input', () => {
    colorHexLabel.textContent = repColorInput.value.toUpperCase();
    document.querySelectorAll('.preset-dot').forEach(b =>
      b.classList.toggle('selected', b.dataset.color === repColorInput.value));
  });

  countrySearch.addEventListener('input', () => {
    searchClearBtn.classList.toggle('hidden', !countrySearch.value);
    renderCountryList();
  });
  searchClearBtn.addEventListener('click', () => {
    countrySearch.value = '';
    searchClearBtn.classList.add('hidden');
    renderCountryList();
  });

  document.getElementById('tab-all').addEventListener('click', () => switchTab('all'));
  document.getElementById('tab-selected').addEventListener('click', () => switchTab('selected'));

  countryList.addEventListener('change', e => {
    if (e.target.classList.contains('country-checkbox')) {
      handleCountryToggle(e.target.dataset.code, e.target.checked);
    }
  });
  countryList.addEventListener('click', e => {
    const item = e.target.closest('.country-item');
    if (!item || e.target.classList.contains('country-checkbox')) return;
    const cb = item.querySelector('.country-checkbox');
    cb.checked = !cb.checked;
    handleCountryToggle(cb.dataset.code, cb.checked);
  });

  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    pendingDeleteId = null;
  });
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (pendingDeleteId) {
      await Store.deleteSalesRep(pendingDeleteId);
      pendingDeleteId = null;
    }
    confirmOverlay.classList.add('hidden');
    await renderRepsGrid();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      if (!confirmOverlay.classList.contains('hidden')) { confirmOverlay.classList.add('hidden'); pendingDeleteId = null; }
    }
  });
}

/* ── Country toggle logic ────────────────────────────────────── */
function handleCountryToggle(code, checked) {
  if (checked) {
    // Check if covered by a region/continent exclusion → remove from exclusion
    let removedFromExclusion = false;
    for (const r of selectedRegions) {
      const def = REGIONS[r.id];
      if (def && def.countries.includes(code) && (r.exclusions || []).includes(code)) {
        r.exclusions = r.exclusions.filter(c => c !== code);
        removedFromExclusion = true;
        break;
      }
    }
    if (!removedFromExclusion) {
      for (const ct of selectedContinents) {
        const def = CONTINENTS[ct.id];
        if (def && def.countries.includes(code) && (ct.exclusions || []).includes(code)) {
          ct.exclusions = ct.exclusions.filter(c => c !== code);
          removedFromExclusion = true;
          break;
        }
      }
    }
    if (!removedFromExclusion) {
      individualCodes.add(code);
    }
  } else {
    // Uncheck: if covered by region/continent → add to exclusion; else remove from individual
    const source = getCoverSource(code);
    if (source) {
      if (source.type === 'region') {
        const r = selectedRegions.find(r => r.id === source.id);
        if (r) { r.exclusions = [...new Set([...(r.exclusions||[]), code])]; }
      } else {
        const ct = selectedContinents.find(c => c.id === source.id);
        if (ct) { ct.exclusions = [...new Set([...(ct.exclusions||[]), code])]; }
      }
    } else {
      individualCodes.delete(code);
    }
  }
  recomputeEffective();
  updateSelectedUI();
}

/* ── Reps grid ───────────────────────────────────────────────── */
async function renderRepsGrid() {
  let reps;
  try {
    reps = await Store.getSalesReps();
  } catch (err) {
    console.error('Could not load sales reps:', err);
    repsGrid.innerHTML = `<div class="api-error">⚠️ Could not connect to the server. Make sure the Node.js backend is running.</div>`;
    emptyState.classList.add('hidden');
    return;
  }
  emptyState.classList.toggle('hidden', reps.length > 0);
  repsGrid.innerHTML = '';

  reps.forEach(rep => {
    const summary = buildLegendSummary(rep);
    const effectiveCount = getEffectiveCountries(rep).length;
    const card = document.createElement('div');
    card.className = 'rep-card';
    card.innerHTML = `
      <div class="rep-card-header">
        <div class="rep-color-badge" style="background:${rep.color}"></div>
        <span class="rep-name">${escHtml(rep.name)}</span>
      </div>
      <div class="rep-card-body">
        <p class="rep-countries-label">Coverage (${effectiveCount} countries)</p>
        <div class="rep-coverage-summary">${escHtml(summary || 'No countries assigned')}</div>
      </div>
      <div class="rep-card-footer">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${rep.id}">✏️ Edit</button>
        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;" data-action="delete" data-id="${rep.id}">🗑️ Delete</button>
      </div>`;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => openModal(rep.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(rep));
    repsGrid.appendChild(card);
  });
}

/* ── Confirm delete ──────────────────────────────────────────── */
function confirmDelete(rep) {
  pendingDeleteId = rep.id;
  document.getElementById('confirm-message').textContent =
    `Are you sure you want to delete "${rep.name}"? This action cannot be undone.`;
  confirmOverlay.classList.remove('hidden');
}

/* ── Modal open / close ──────────────────────────────────────── */
async function openModal(id) {
  editingId = id;
  individualCodes    = new Set();
  selectedRegions    = [];
  selectedContinents = [];
  selectedCodes      = new Set();
  nameError.classList.add('hidden');
  document.getElementById('save-error').classList.add('hidden');
  repNameInput.classList.remove('error');

  if (id) {
    let rep;
    try { rep = await Store.getSalesRepById(id); }
    catch (err) { alert('Could not load sales rep data. Check the server connection.'); return; }
    if (!rep) return;
    modalTitle.textContent = 'Edit Sales Rep';
    repNameInput.value = rep.name;
    setColor(rep.color);
    individualCodes    = new Set(rep.countries || []);
    selectedRegions    = JSON.parse(JSON.stringify(rep.regions || []));
    selectedContinents = JSON.parse(JSON.stringify(rep.continents || []));
    recomputeEffective();
  } else {
    modalTitle.textContent = 'Add Sales Rep';
    repNameInput.value = '';
    setColor(PRESET_COLORS[0]);
  }

  countrySearch.value = '';
  searchClearBtn.classList.add('hidden');
  activeTab = 'all';
  switchTab('all', false);
  updateRegionButtonStates();
  renderCountryList();
  renderSelectedTags();

  modalOverlay.classList.remove('hidden');
  setTimeout(() => repNameInput.focus(), 80);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  editingId = null;
}

/* ── Save rep ────────────────────────────────────────────────── */
async function saveRep() {
  const name  = repNameInput.value.trim();
  const color = repColorInput.value;

  if (!name) {
    nameError.classList.remove('hidden');
    repNameInput.classList.add('error');
    repNameInput.focus();
    return;
  }
  nameError.classList.add('hidden');
  repNameInput.classList.remove('error');

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const payload = {
      name, color,
      countries:  [...individualCodes],
      regions:    selectedRegions,
      continents: selectedContinents
    };
    if (editingId) {
      await Store.updateSalesRep(editingId, payload);
    } else {
      await Store.addSalesRep(payload);
    }
    closeModal();
    await renderRepsGrid();
  } catch (err) {
    console.error('Save failed:', err);
    const saveError = document.getElementById('save-error');
    saveError.textContent = 'Save failed – check the server connection.';
    saveError.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

/* ── Country list rendering ──────────────────────────────────── */
function switchTab(tab, render = true) {
  activeTab = tab;
  document.getElementById('tab-all').classList.toggle('active', tab === 'all');
  document.getElementById('tab-selected').classList.toggle('active', tab === 'selected');
  if (render) renderCountryList();
}

function renderCountryList() {
  const query = countrySearch.value.toLowerCase().trim();
  let list = COUNTRIES;
  if (query) list = list.filter(c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
  if (activeTab === 'selected') list = list.filter(c => selectedCodes.has(c.code));

  if (list.length === 0) {
    countryList.innerHTML = `<p class="country-list-empty">No countries found.</p>`;
    return;
  }

  countryList.innerHTML = list.map(c => {
    const checked   = selectedCodes.has(c.code);
    const viaRegion = checked && !individualCodes.has(c.code) && isInAnyRegionOrContinent(c.code);
    return `
      <div class="country-item${checked ? ' checked' : ''}${viaRegion ? ' via-region' : ''}">
        <input type="checkbox" class="country-checkbox" id="cb-${c.code}" data-code="${c.code}" ${checked ? 'checked' : ''} />
        <label class="country-label" for="cb-${c.code}">${escHtml(c.name)}</label>
        <span class="country-code">${c.code}</span>
      </div>`;
  }).join('');
}

/* ── Selected tags & counter ─────────────────────────────────── */
function updateSelectedUI() {
  selectedCountEl.textContent = selectedCodes.size;
  renderCountryList();
  renderSelectedTags();
}

function renderSelectedTags() {
  selectedCountEl.textContent = selectedCodes.size;
  if (selectedCodes.size === 0) { selectedTagsEl.innerHTML = ''; return; }

  // Show region/continent tags first, then individual countries
  const parts = [];

  for (const r of selectedRegions) {
    const excCount = (r.exclusions || []).length;
    const label = excCount > 0 ? `${r.id} (exc. ${excCount})` : r.id;
    parts.push(`
      <span class="selected-tag region-tag">
        ${escHtml(label)}
        <button class="selected-tag-remove" data-type="region" data-id="${r.id}" title="Remove">✕</button>
      </span>`);
  }
  for (const ct of selectedContinents) {
    const def = CONTINENTS[ct.id];
    const excCount = (ct.exclusions || []).length;
    const name = def ? def.name : ct.id;
    const label = excCount > 0 ? `${name} (exc. ${excCount})` : name;
    parts.push(`
      <span class="selected-tag region-tag">
        ${escHtml(label)}
        <button class="selected-tag-remove" data-type="continent" data-id="${ct.id}" title="Remove">✕</button>
      </span>`);
  }
  for (const code of individualCodes) {
    const name = COUNTRY_MAP[code] || code;
    parts.push(`
      <span class="selected-tag">
        ${escHtml(name)}
        <button class="selected-tag-remove" data-type="country" data-code="${code}" title="Remove">✕</button>
      </span>`);
  }

  selectedTagsEl.innerHTML = parts.join('');

  selectedTagsEl.querySelectorAll('.selected-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const { type, id, code } = btn.dataset;
      if (type === 'region') {
        selectedRegions = selectedRegions.filter(r => r.id !== id);
        updateRegionButtonStates();
      } else if (type === 'continent') {
        selectedContinents = selectedContinents.filter(c => c.id !== id);
        updateRegionButtonStates();
      } else {
        individualCodes.delete(code);
      }
      recomputeEffective();
      updateSelectedUI();
    });
  });
}
