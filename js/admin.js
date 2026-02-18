/**
 * admin.js – Admin panel logic: CRUD for sales reps, country search/select.
 */

/* ── Preset colours ─────────────────────────────────────────── */
const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#E11D48'
];

/* ── State ───────────────────────────────────────────────────── */
let editingId       = null;    // null = adding, string = editing
let selectedCodes   = new Set(); // currently selected country codes
let activeTab       = 'all';   // 'all' | 'selected'
let pendingDeleteId = null;

/* ── DOM refs ────────────────────────────────────────────────── */
const repsGrid         = document.getElementById('reps-grid');
const emptyState       = document.getElementById('empty-state');
const modalOverlay     = document.getElementById('modal-overlay');
const confirmOverlay   = document.getElementById('confirm-overlay');
const modalTitle       = document.getElementById('modal-title');
const repNameInput     = document.getElementById('rep-name');
const repColorInput    = document.getElementById('rep-color');
const colorHexLabel    = document.getElementById('color-hex-label');
const nameError        = document.getElementById('name-error');
const countrySearch    = document.getElementById('country-search');
const searchClearBtn   = document.getElementById('search-clear-btn');
const countryList      = document.getElementById('country-list');
const selectedTagsEl   = document.getElementById('selected-tags');
const selectedCountEl  = document.getElementById('selected-count');

/* ── Helpers ─────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildColorPresets();
  bindEvents();
  renderRepsGrid();
});

/* ── Color presets ───────────────────────────────────────────── */
function buildColorPresets() {
  const container = document.getElementById('color-presets');
  container.innerHTML = PRESET_COLORS.map(c => `
    <button
      class="preset-dot"
      style="background:${c}"
      data-color="${c}"
      title="${c}"
      aria-label="Colore ${c}"
    ></button>`).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.preset-dot');
    if (!btn) return;
    setColor(btn.dataset.color);
  });
}

function setColor(hex) {
  repColorInput.value = hex;
  colorHexLabel.textContent = hex.toUpperCase();
  // Highlight selected preset
  document.querySelectorAll('.preset-dot').forEach(b => {
    b.classList.toggle('selected', b.dataset.color === hex);
  });
}

/* ── Bind global events ───────────────────────────────────────── */
function bindEvents() {
  // Open "add" modal
  document.getElementById('add-rep-btn').addEventListener('click', () => openModal(null));

  // Modal close buttons
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // Save
  document.getElementById('save-btn').addEventListener('click', saveRep);

  // Color input change
  repColorInput.addEventListener('input', () => {
    colorHexLabel.textContent = repColorInput.value.toUpperCase();
    document.querySelectorAll('.preset-dot').forEach(b =>
      b.classList.toggle('selected', b.dataset.color === repColorInput.value));
  });

  // Country search
  countrySearch.addEventListener('input', () => {
    searchClearBtn.classList.toggle('hidden', !countrySearch.value);
    renderCountryList();
  });
  searchClearBtn.addEventListener('click', () => {
    countrySearch.value = '';
    searchClearBtn.classList.add('hidden');
    renderCountryList();
  });

  // Tabs
  document.getElementById('tab-all').addEventListener('click', () => switchTab('all'));
  document.getElementById('tab-selected').addEventListener('click', () => switchTab('selected'));

  // Country list delegation (checkbox + row click)
  countryList.addEventListener('change', e => {
    if (e.target.classList.contains('country-checkbox')) {
      const code = e.target.dataset.code;
      e.target.checked ? selectedCodes.add(code) : selectedCodes.delete(code);
      updateSelectedUI();
    }
  });
  countryList.addEventListener('click', e => {
    const item = e.target.closest('.country-item');
    if (!item || e.target.classList.contains('country-checkbox')) return;
    const cb = item.querySelector('.country-checkbox');
    cb.checked = !cb.checked;
    const code = cb.dataset.code;
    cb.checked ? selectedCodes.add(code) : selectedCodes.delete(code);
    updateSelectedUI();
  });

  // Confirm delete
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    confirmOverlay.classList.add('hidden');
    pendingDeleteId = null;
  });
  document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (pendingDeleteId) {
      Store.deleteSalesRep(pendingDeleteId);
      pendingDeleteId = null;
    }
    confirmOverlay.classList.add('hidden');
    renderRepsGrid();
  });

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      if (!confirmOverlay.classList.contains('hidden')) {
        confirmOverlay.classList.add('hidden');
        pendingDeleteId = null;
      }
    }
  });
}

/* ── Reps grid ────────────────────────────────────────────────── */
function renderRepsGrid() {
  const reps = Store.getSalesReps();
  emptyState.classList.toggle('hidden', reps.length > 0);
  repsGrid.innerHTML = '';

  reps.forEach(rep => {
    const countries = rep.countries || [];
    const maxShow   = 6;
    const shown     = countries.slice(0, maxShow);
    const extra     = countries.length - maxShow;

    const tagsHtml = countries.length === 0
      ? '<span class="rep-no-countries">Nessun paese assegnato</span>'
      : shown.map(c => `<span class="country-tag-badge">${escHtml(COUNTRY_MAP[c] || c)}</span>`).join('')
        + (extra > 0 ? `<span class="more-badge">+${extra} altri</span>` : '');

    const card = document.createElement('div');
    card.className = 'rep-card';
    card.innerHTML = `
      <div class="rep-card-header">
        <div class="rep-color-badge" style="background:${rep.color}"></div>
        <span class="rep-name">${escHtml(rep.name)}</span>
      </div>
      <div class="rep-card-body">
        <p class="rep-countries-label">Paesi di competenza</p>
        <div class="rep-countries-tags">${tagsHtml}</div>
      </div>
      <div class="rep-card-footer">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${rep.id}">
          ✏️ Modifica
        </button>
        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;" data-action="delete" data-id="${rep.id}">
          🗑️ Elimina
        </button>
      </div>`;

    card.querySelector('[data-action="edit"]').addEventListener('click', () => openModal(rep.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(rep));
    repsGrid.appendChild(card);
  });
}

/* ── Confirm delete ───────────────────────────────────────────── */
function confirmDelete(rep) {
  pendingDeleteId = rep.id;
  document.getElementById('confirm-message').textContent =
    `Sei sicuro di voler eliminare "${rep.name}"? Questa azione non può essere annullata.`;
  confirmOverlay.classList.remove('hidden');
}

/* ── Modal open / close ──────────────────────────────────────── */
function openModal(id) {
  editingId = id;
  selectedCodes = new Set();
  nameError.classList.add('hidden');
  repNameInput.classList.remove('error');

  if (id) {
    // Edit mode
    const rep = Store.getSalesRepById(id);
    if (!rep) return;
    modalTitle.textContent = 'Modifica Commerciale';
    repNameInput.value = rep.name;
    setColor(rep.color);
    selectedCodes = new Set(rep.countries || []);
  } else {
    // Add mode
    modalTitle.textContent = 'Aggiungi Commerciale';
    repNameInput.value = '';
    setColor(PRESET_COLORS[0]);
  }

  countrySearch.value = '';
  searchClearBtn.classList.add('hidden');
  activeTab = 'all';
  switchTab('all', false);
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
function saveRep() {
  const name  = repNameInput.value.trim();
  const color = repColorInput.value;
  const countries = [...selectedCodes];

  // Validate
  if (!name) {
    nameError.classList.remove('hidden');
    repNameInput.classList.add('error');
    repNameInput.focus();
    return;
  }
  nameError.classList.add('hidden');
  repNameInput.classList.remove('error');

  if (editingId) {
    Store.updateSalesRep(editingId, { name, color, countries });
  } else {
    Store.addSalesRep({ name, color, countries });
  }

  closeModal();
  renderRepsGrid();
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

  // Filter by search
  if (query) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    );
  }

  // Filter by tab
  if (activeTab === 'selected') {
    list = list.filter(c => selectedCodes.has(c.code));
  }

  if (list.length === 0) {
    countryList.innerHTML = `<p class="country-list-empty">Nessun paese trovato.</p>`;
    return;
  }

  countryList.innerHTML = list.map(c => {
    const checked = selectedCodes.has(c.code);
    return `
      <div class="country-item${checked ? ' checked' : ''}">
        <input
          type="checkbox"
          class="country-checkbox"
          id="cb-${c.code}"
          data-code="${c.code}"
          ${checked ? 'checked' : ''}
        />
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

  // Also refresh the checked state for visible items (needed when clicking row)
  countryList.querySelectorAll('.country-item').forEach(item => {
    const cb = item.querySelector('.country-checkbox');
    if (cb) item.classList.toggle('checked', cb.checked);
  });
}

function renderSelectedTags() {
  selectedCountEl.textContent = selectedCodes.size;
  if (selectedCodes.size === 0) {
    selectedTagsEl.innerHTML = '';
    return;
  }

  selectedTagsEl.innerHTML = [...selectedCodes].map(code => {
    const name = COUNTRY_MAP[code] || code;
    return `
      <span class="selected-tag">
        ${escHtml(name)}
        <button class="selected-tag-remove" data-code="${code}" title="Rimuovi" aria-label="Rimuovi ${escHtml(name)}">✕</button>
      </span>`;
  }).join('');

  selectedTagsEl.querySelectorAll('.selected-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCodes.delete(btn.dataset.code);
      updateSelectedUI();
    });
  });
}
