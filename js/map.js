/**
 * map.js – initialises amCharts 5 world map and colours countries by sales rep.
 * Store methods are async (fetch-based), so map functions are async too.
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

  // Set the chart background to the same ocean blue as the CSS wrapper
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

  // Default land colour: white, dark border
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

  // Colour countries once geodata has loaded
  polygonSeries.events.on('datavalidated', async () => {
    await applyColors(polygonSeries);
    await renderLegend();
  });
});

/* ── Apply per-country colours from Store ────────────────────── */
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
      polygon.set('tooltipText', '{name}');
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
    const n     = (rep.countries || []).length;
    const label = n === 1 ? '1 country' : `${n} countries`;
    return `
      <div class="legend-item">
        <div class="legend-color" style="background:${rep.color}"></div>
        <div class="legend-info">
          <span class="legend-name">${escHtml(rep.name)}</span>
          <span class="legend-countries">${n > 0 ? label : 'No countries assigned'}</span>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
