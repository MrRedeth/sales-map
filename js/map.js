/**
 * map.js – initialises amCharts 5 world map and colours countries by sales rep.
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

/* ── Map initialisation ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Create root
  const root = am5.Root.new('chartdiv');
  root.setThemes([am5themes_Animated.new(root)]);

  // Create chart
  const chart = root.container.children.push(
    am5map.MapChart.new(root, {
      projection: am5map.geoMercator(),
      panX: 'translateX',
      panY: 'translateY',
      minZoomLevel: 1,
      maxZoomLevel: 32
    })
  );

  // Polygon series (countries)
  const polygonSeries = chart.series.push(
    am5map.MapPolygonSeries.new(root, {
      geoJSON: am5geodata_worldLow,
      exclude: ['AQ']       // hide Antarctica for a cleaner look
    })
  );

  polygonSeries.mapPolygons.template.setAll({
    interactive: true,
    stroke: am5.color(0xffffff),
    strokeWidth: 0.6,
    tooltipText: '{name}',
    fill: am5.color(0xe2e8f0)
  });

  // Hover state – slightly darken via fillOpacity trick
  polygonSeries.mapPolygons.template.states.create('hover', {
    fillOpacity: 0.78,
    strokeWidth: 1.2
  });

  // Zoom control
  chart.set('zoomControl', am5map.ZoomControl.new(root, {}));

  // ── Colour countries once geodata has loaded ─────────────────
  polygonSeries.events.on('datavalidated', () => {
    applyColors(polygonSeries, root);
    renderLegend();
  });
});

/* ── Apply per-country colours from Store ────────────────────── */
function applyColors(polygonSeries, root) {
  const repMap = Store.getCountryRepMap();   // { "IT": rep, ... }

  polygonSeries.mapPolygons.each(polygon => {
    const id = polygon.dataItem?.get('id');
    const rep = id ? repMap[id] : null;

    if (rep) {
      polygon.set('fill', am5.color(rep.color));
      polygon.set('tooltipText', `{name}\n[bold]Commerciale:[/] ${rep.name}`);

      // Hover: lighter shade of the rep colour
      polygon.states.create('hover', {
        fill: am5.color(lighten(rep.color, 35)),
        strokeWidth: 1.2
      });
    } else {
      polygon.set('fill', am5.color(0xe2e8f0));
      polygon.set('tooltipText', '{name}');
      polygon.states.create('hover', {
        fill: am5.color(0xc4cdd8),
        strokeWidth: 1.2
      });
    }
  });
}

/* ── Legend ──────────────────────────────────────────────────── */
function renderLegend() {
  const legendContent = document.getElementById('legend-content');
  const legendCount   = document.getElementById('legend-count');
  if (!legendContent) return;

  const reps = Store.getSalesReps();
  legendCount.textContent = reps.length || '';
  legendCount.style.display = reps.length ? 'inline-block' : 'none';

  if (reps.length === 0) {
    legendContent.innerHTML = `
      <p class="legend-empty">
        Nessun commerciale configurato.<br/>
        <a href="admin.html">Vai all'Amministrazione</a> per aggiungerne.
      </p>`;
    return;
  }

  legendContent.innerHTML = reps.map(rep => {
    const n = (rep.countries || []).length;
    const label = n === 1 ? '1 paese' : `${n} paesi`;
    return `
      <div class="legend-item">
        <div class="legend-color" style="background:${rep.color}"></div>
        <div class="legend-info">
          <span class="legend-name">${escHtml(rep.name)}</span>
          <span class="legend-countries">${n > 0 ? label : 'Nessun paese assegnato'}</span>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
