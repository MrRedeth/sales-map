/**
 * map.js – amCharts 5 world map with country colouring, search, and zoom.
 */

/* ── Colour utilities ─────────────────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lighten(hex, amount = 30) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.min(255, v + amount);
  return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/* ── Module-level refs (exposed for search zoom) ─────────────── */
let _chart         = null;
let _polygonSeries = null;

/* ── Map initialisation ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const root = am5.Root.new('chartdiv');
  root.setThemes([am5themes_Animated.new(root)]);

  const chart = root.container.children.push(
    am5map.MapChart.new(root, {
      projection: am5map.geoMercator(),
      panX: 'translateX',
      panY: 'translateY',
      minZoomLevel: 1,
      maxZoomLevel: 32
    })
  );

  root.container.set('background', am5.Rectangle.new(root, {
    fill: am5.color('#f2f2f2'),
    fillOpacity: 1
  }));

  const polygonSeries = chart.series.push(
    am5map.MapPolygonSeries.new(root, {
      geoJSON: am5geodata_worldLow,
      exclude: ['AQ']
    })
  );

  polygonSeries.mapPolygons.template.setAll({
    interactive: true,
    stroke: am5.color(0x333333),
    strokeWidth: 0.7,
    strokeOpacity: 1,
    tooltipText: '{name}',
    fill: am5.color(0xffffff)
  });

  polygonSeries.mapPolygons.template.states.create('hover', {
    fill: am5.color(0xe0e0e0),
    strokeWidth: 1.2,
    strokeOpacity: 1
  });

  chart.set('zoomControl', am5map.ZoomControl.new(root, {}));

  _chart         = chart;
  _polygonSeries = polygonSeries;

  polygonSeries.events.on('datavalidated', async () => {
    await applyColors(polygonSeries);
    await renderLegend();
  });

  initSearch();
});

/* ── Apply per-country colours ────────────────────────────────── */
async function applyColors(polygonSeries) {
  const repMap = await Store.getCountryRepMap();

  polygonSeries.mapPolygons.each(polygon => {
    const id  = polygon.dataItem?.get('id');
    const rep = id ? repMap[id] : null;

    if (rep) {
      polygon.set('fill', am5.color(rep.color));
      polygon.set('tooltipText', `{name}\n[bold]Sales Rep:[/] ${rep.name}`);
      polygon.states.create('hover', {
        fill: am5.color(lighten(rep.color, 35)),
        strokeWidth: 1.2,
        strokeOpacity: 1
      });
    } else {
      polygon.set('fill', am5.color(0xffffff));
      polygon.set('tooltipText', '{name}\n[italic]Unassigned[/]');
      polygon.states.create('hover', {
        fill: am5.color(0xe0e0e0),
        strokeWidth: 1.2,
        strokeOpacity: 1
      });
    }
  });
}

/* ── Legend ──────────────────────────────────────────────────── */
async function renderLegend() {
  const legendContent = document.getElementById('legend-content');
  const legendCount   = document.getElementById('legend-count');
  if (!legendContent) return;

  const reps = await Store.getSalesReps();
  legendCount.textContent = reps.length || '';
  legendCount.style.display = reps.length ? 'inline-block' : 'none';

  if (reps.length === 0) {
    legendContent.innerHTML = `
      <p class="legend-empty">
        No sales reps configured yet.<br/>
        <a href="admin.html">Go to Administration</a> to add some.
      </p>`;
    return;
  }

  legendContent.innerHTML = reps.map(rep => {
    const summary = buildLegendSummary(rep);
    const effCount = getEffectiveCountries(rep).length;
    const countLabel = effCount === 1 ? '1 country' : `${effCount} countries`;
    return `
      <div class="legend-item">
        <div class="legend-color" style="background:${rep.color}"></div>
        <div class="legend-info">
          <span class="legend-name">${escHtml(rep.name)}</span>
          <span class="legend-summary">${escHtml(summary || countLabel)}</span>
          <span class="legend-countries">${countLabel}</span>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Search bar ──────────────────────────────────────────────── */
function initSearch() {
  const input    = document.getElementById('country-search-bar');
  const clearBtn = document.getElementById('nav-search-clear');
  const dropdown = document.getElementById('nav-search-dropdown');
  if (!input) return;

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    clearBtn.classList.toggle('hidden', !q);
    if (!q) { dropdown.classList.add('hidden'); dropdown.innerHTML = ''; return; }

    const matches = COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-no-result">No countries found</div>`;
      dropdown.classList.remove('hidden');
      return;
    }

    let repMap;
    try { repMap = await Store.getCountryRepMap(); } catch { repMap = {}; }

    dropdown.innerHTML = matches.map(c => {
      const rep = repMap[c.code];
      return `
        <div class="search-result-item" data-code="${c.code}">
          <span class="search-result-name">${escHtml(c.name)}</span>
          <span class="search-result-code">${c.code}</span>
          ${rep
            ? `<span class="search-result-rep" style="color:${rep.color}">● ${escHtml(rep.name)}</span>`
            : `<span class="search-result-rep unassigned">Unassigned</span>`}
        </div>`;
    }).join('');
    dropdown.classList.remove('hidden');
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.focus();
  });

  dropdown.addEventListener('click', e => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;
    const code = item.dataset.code;
    zoomToCountry(code);
    input.value = '';
    clearBtn.classList.add('hidden');
    dropdown.classList.add('hidden');
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#nav-search')) {
      dropdown.classList.add('hidden');
    }
  });
}

/* ── Zoom to country ─────────────────────────────────────────── */
function zoomToCountry(code) {
  if (!_chart || !_polygonSeries) return;
  _polygonSeries.mapPolygons.each(polygon => {
    if (polygon.dataItem?.get('id') === code) {
      _chart.zoomToDataItem(polygon.dataItem);
    }
  });
}
