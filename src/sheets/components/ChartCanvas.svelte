<!-- components/ChartCanvas.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { cellId, parseCellId } from '../lib/sheet-store.js';
  import { FormulaError } from '../lib/formula-engine.js';

  export let chart; // { id, type, range, title, firstRowLabels, firstColLabels, x, y, w, h }
  export let resolvedValues = {};
  export let c;
  export let selected = false;
  export let scaleFactor = 1; // escala acumulada de zoom da folha (PinchZoom), para gestos corretos

  const dispatch = createEventDispatcher();

  const PALETTE = ['#2564CF', '#107C41', '#CA5010', '#8764B8', '#C42B1C', '#0B6A6A', '#EAA300', '#C239B3'];

  function rangeToMatrix(range) {
    const [fromStr, toStr] = range.split(':');
    const from = parseCellId(fromStr);
    const to = parseCellId(toStr);
    if (!from || !to) return { rows: [] };
    const r0 = Math.min(from.row, to.row), r1 = Math.max(from.row, to.row);
    const c0 = Math.min(from.col, to.col), c1 = Math.max(from.col, to.col);
    const rows = [];
    for (let r = r0; r <= r1; r++) {
      const row = [];
      for (let col = c0; col <= c1; col++) {
        const v = resolvedValues[cellId(r, col)];
        row.push(v instanceof FormulaError ? 0 : v);
      }
      rows.push(row);
    }
    return { rows };
  }

  $: matrix = rangeToMatrix(chart.range);

  $: parsed = (() => {
    const { rows } = matrix;
    if (!rows.length) return { categories: [], series: [] };

    let dataRows = rows;
    let seriesNames = null;
    let categories = null;

    if (chart.firstRowLabels && rows.length > 1) {
      seriesNames = rows[0].slice(chart.firstColLabels ? 1 : 0).map((v) => (v === undefined || v === '' ? '' : String(v)));
      dataRows = rows.slice(1);
    }
    if (chart.firstColLabels) {
      categories = dataRows.map((row) => (row[0] === undefined ? '' : String(row[0])));
      dataRows = dataRows.map((row) => row.slice(1));
    } else {
      categories = dataRows.map((_, i) => String(i + 1));
    }

    const numCols = dataRows[0] ? dataRows[0].length : 0;
    const series = [];
    for (let sIdx = 0; sIdx < numCols; sIdx++) {
      const values = dataRows.map((row) => {
        const v = row[sIdx];
        const n = typeof v === 'number' ? v : parseFloat(v);
        return isNaN(n) ? 0 : n;
      });
      series.push({
        name: seriesNames && seriesNames[sIdx] ? seriesNames[sIdx] : `Série ${sIdx + 1}`,
        values,
        color: PALETTE[sIdx % PALETTE.length],
      });
    }
    return { categories, series };
  })();

  $: maxVal = Math.max(1, ...parsed.series.flatMap((s) => s.values), 0);
  $: minVal = Math.min(0, ...parsed.series.flatMap((s) => s.values));

  const PAD = 28;
  $: plotW = Math.max(10, chart.w - PAD * 2);
  $: plotH = Math.max(10, chart.h - PAD * 2 - 26);

  function barX(catIdx, seriesIdx, seriesCount) {
    const groupW = plotW / Math.max(1, parsed.categories.length);
    const barW = groupW / Math.max(1, seriesCount) * 0.72;
    const groupStart = catIdx * groupW;
    const gap = (groupW - barW * seriesCount) / 2;
    return groupStart + gap + seriesIdx * barW;
  }
  function barWidth(seriesCount) {
    const groupW = plotW / Math.max(1, parsed.categories.length);
    return (groupW / Math.max(1, seriesCount)) * 0.72;
  }
  function valueToY(v) {
    const range = maxVal - minVal || 1;
    return plotH - ((v - minVal) / range) * plotH;
  }
  function linePoints(values) {
    if (values.length === 0) return '';
    const stepX = plotW / Math.max(1, values.length - 1 || 1);
    return values.map((v, i) => `${i * stepX},${valueToY(v)}`).join(' ');
  }

  $: pieTotal = parsed.series[0] ? parsed.series[0].values.reduce((a, b) => a + Math.abs(b), 0) : 0;
  $: pieSlices = (() => {
    if (!parsed.series[0]) return [];
    let acc = 0;
    const r = Math.min(plotW, plotH) / 2;
    const cx = plotW / 2, cy = plotH / 2;
    return parsed.series[0].values.map((v, i) => {
      const frac = pieTotal > 0 ? Math.abs(v) / pieTotal : 0;
      const startAngle = acc * Math.PI * 2 - Math.PI / 2;
      acc += frac;
      const endAngle = acc * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      const largeArc = frac > 0.5 ? 1 : 0;
      const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
      return { path, color: PALETTE[i % PALETTE.length], label: parsed.categories[i] || '', value: v };
    });
  })();

  // ── Arrastar / redimensionar — MESMO padrão de gesto único
  //    (startX/startY + delta) usado em DocPage.svelte do docs, em
  //    vez de listeners locais por-instância. O componente pai é
  //    quem decide start/move/end via eventos; aqui só calculamos
  //    o delta já ajustado ao scaleFactor recebido do PinchZoom.

  let dragging = false;
  let resizing = false;
  let startX = 0, startY = 0, origX = 0, origY = 0, origW = 0, origH = 0;

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onHeaderDown(e) {
    dispatch('select', chart.id);
    const p = pointerXY(e);
    dragging = true;
    startX = p.x;
    startY = p.y;
    origX = chart.x;
    origY = chart.y;
    e.stopPropagation();
    e.preventDefault();
  }
  function onResizeDown(e) {
    const p = pointerXY(e);
    resizing = true;
    startX = p.x;
    startY = p.y;
    origW = chart.w;
    origH = chart.h;
    e.stopPropagation();
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging && !resizing) return;
    const p = pointerXY(e);
    const sf = scaleFactor || 1;
    if (dragging) {
      const dx = (p.x - startX) / sf;
      const dy = (p.y - startY) / sf;
      dispatch('move', { id: chart.id, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
    } else if (resizing) {
      const dx = (p.x - startX) / sf;
      const dy = (p.y - startY) / sf;
      dispatch('resize', { id: chart.id, w: Math.max(160, origW + dx), h: Math.max(120, origH + dy) });
    }
    e.preventDefault();
  }
  function onUp() {
    if (dragging || resizing) dispatch('gestureend');
    dragging = false;
    resizing = false;
  }
</script>

<svelte:window
  on:pointermove={onMove} on:pointerup={onUp}
  on:touchmove|nonpassive={onMove} on:touchend={onUp}
/>

<div
  class="chart-box"
  class:chart-selected={selected}
  style="left:{chart.x}px; top:{chart.y}px; width:{chart.w}px; height:{chart.h}px; background:{c.dialogBackground};"
  on:pointerdown={() => dispatch('select', chart.id)}
>
  <div class="chart-header" on:pointerdown={onHeaderDown} on:touchstart={onHeaderDown}>
    <span class="chart-title" style="color:{c.textPrimary}">{chart.title || 'Gráfico'}</span>
  </div>

  <svg class="chart-svg" viewBox="0 0 {chart.w} {chart.h}" width={chart.w} height={chart.h}>
    <g transform="translate({PAD},{PAD + 22})">
      {#if chart.type === 'bar'}
        {#each parsed.series as s, sIdx}
          {#each s.values as v, i}
            <rect
              x={barX(i, sIdx, parsed.series.length)}
              y={Math.min(valueToY(0), valueToY(v))}
              width={barWidth(parsed.series.length)}
              height={Math.abs(valueToY(v) - valueToY(0))}
              fill={s.color}
              rx="2"
            />
          {/each}
        {/each}
        <line x1="0" y1={valueToY(0)} x2={plotW} y2={valueToY(0)} stroke={c.divider} stroke-width="1" />
      {:else if chart.type === 'line'}
        {#each parsed.series as s}
          <polyline points={linePoints(s.values)} fill="none" stroke={s.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          {#each s.values as v, i}
            {@const stepX = plotW / Math.max(1, s.values.length - 1 || 1)}
            <circle cx={i * stepX} cy={valueToY(v)} r="3" fill={s.color} />
          {/each}
        {/each}
        <line x1="0" y1={plotH} x2={plotW} y2={plotH} stroke={c.divider} stroke-width="1" />
      {:else if chart.type === 'pie' || chart.type === 'donut'}
        {#each pieSlices as slice}
          <path d={slice.path} fill={slice.color} stroke={c.dialogBackground} stroke-width="1.5" />
        {/each}
        {#if chart.type === 'donut'}
          <circle cx={plotW / 2} cy={plotH / 2} r={Math.min(plotW, plotH) / 2 * 0.55} fill={c.dialogBackground} />
        {/if}
      {/if}
    </g>
  </svg>

  {#if chart.type === 'bar' || chart.type === 'line'}
    <div class="chart-legend">
      {#each parsed.series as s}
        <div class="legend-item">
          <span class="legend-dot" style="background:{s.color}"></span>
          <span class="legend-label" style="color:{c.textSecondary}">{s.name}</span>
        </div>
      {/each}
    </div>
  {:else}
    <div class="chart-legend">
      {#each pieSlices as slice}
        <div class="legend-item">
          <span class="legend-dot" style="background:{slice.color}"></span>
          <span class="legend-label" style="color:{c.textSecondary}">{slice.label}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if selected}
    <div class="resize-handle" on:pointerdown={onResizeDown} on:touchstart={onResizeDown}></div>
  {/if}
</div>

<style>
  /* SEM bordas sólidas nem cantos arredondados grandes — mesmo
     princípio do .float-obj em DocPage.svelte do docs: o único traço
     visual é um outline fino (não border) quando selecionado, sem
     border-radius nenhum. O gráfico fica "solto" sobre a folha, tal
     como um objeto flutuante real do Office. */
  .chart-box {
    position: absolute;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 5;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }
  .chart-selected {
    outline: 1.5px solid #2F7BF6;
    outline-offset: 2px;
    z-index: 6;
  }
  .chart-header {
    padding: 8px 10px 2px;
    cursor: grab;
    flex-shrink: 0;
    touch-action: none;
  }
  .chart-header:active { cursor: grabbing; }
  .chart-title { font-size: 12px; font-weight: 700; }
  .chart-svg { flex: 1; min-height: 0; display: block; }
  .chart-legend {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 4px 10px 8px;
    flex-shrink: 0;
    max-height: 44px;
    overflow-y: auto;
  }
  .legend-item { display: flex; align-items: center; gap: 4px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-label { font-size: 10px; font-weight: 600; white-space: nowrap; }

  .resize-handle {
    position: absolute; right: -8px; bottom: -8px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #2F7BF6; border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    cursor: nwse-resize;
    touch-action: none;
  }
</style>