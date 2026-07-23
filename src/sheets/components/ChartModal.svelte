<!-- components/ChartModal.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';
  import { fluentIconUrl } from '../lib/icon-fallback.js';

  export let visible = false;
  export let c;
  export let defaultRange = ''; // ex: "A1:B5", vem da seleção ativa no grid
  export let editingChart = null; // se não-nulo, está a editar um gráfico existente

  const dispatch = createEventDispatcher();

  const CHART_TYPES = [
    { id: 'bar', label: 'Coluna', icon: 'chart_bar' },
    { id: 'line', label: 'Linha', icon: 'chart_line' },
    { id: 'pie', label: 'Circular', icon: 'chart_pie' },
    { id: 'donut', label: 'Rosca', icon: 'chart_donut' },
  ];

  let chartType = 'bar';
  let dataRange = '';
  let chartTitle = '';
  let useFirstRowAsLabels = true;
  let useFirstColAsLabels = true;

  $: if (visible) {
    if (editingChart) {
      chartType = editingChart.type;
      dataRange = editingChart.range;
      chartTitle = editingChart.title;
      useFirstRowAsLabels = editingChart.firstRowLabels !== false;
      useFirstColAsLabels = editingChart.firstColLabels !== false;
    } else {
      chartType = 'bar';
      dataRange = defaultRange;
      chartTitle = '';
      useFirstRowAsLabels = true;
      useFirstColAsLabels = true;
    }
  }

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;

  $: if (visible && !showSheet) openSheet();
  else if (!visible && showSheet) closeSheet();

  function openSheet() {
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlayVisible = true;
      slide.open();
    }));
  }
  function closeSheet() {
    overlayVisible = false;
    slide.close();
    setTimeout(() => { showSheet = false; }, 300);
  }
  function close() {
    dispatch('close');
  }

  function confirm() {
    const trimmedRange = dataRange.trim().toUpperCase();
    if (!/^[A-Z]+\d+:[A-Z]+\d+$/.test(trimmedRange)) return; // validação simples do intervalo
    dispatch('confirm', {
      type: chartType,
      range: trimmedRange,
      title: chartTitle.trim(),
      firstRowLabels: useFirstRowAsLabels,
      firstColLabels: useFirstColAsLabels,
    });
  }

  $: rangeValid = /^[A-Z]+\d+:[A-Z]+\d+$/.test(dataRange.trim().toUpperCase());

  let sheetEl;
  function makeSheetDrag(slideCtrl, getHeight, onClose) {
    let dragging = false, liveActive = false;
    let startY = 0, currentY = 0, startTime = 0, sheetH = 400;
    return {
      touchstart(e) {
        dragging = true;
        liveActive = false;
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = performance.now();
        sheetH = getHeight();
      },
      touchmove(e) {
        if (!dragging) return;
        const y = e.touches[0].clientY;
        currentY = y;
        const delta = y - startY;
        if (delta <= 4) return;
        if (!liveActive) liveActive = true;
        const progress = Math.min(1, Math.max(0, delta / sheetH));
        slideCtrl.setDragValue(progress * 100);
        e.preventDefault();
      },
      touchend() {
        if (!dragging) return;
        dragging = false;
        if (!liveActive) { liveActive = false; return; }
        liveActive = false;
        const elapsed = Math.max(1, performance.now() - startTime);
        const delta = currentY - startY;
        const velocity = Math.abs(delta) / elapsed;
        const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
        const shouldClose = draggedFraction > 0.3 || (delta > 0 && velocity > 0.5);
        if (shouldClose) onClose();
        else slideCtrl.releaseDragTo('open');
      },
    };
  }
  const drag = makeSheetDrag(slide, () => sheetEl ? sheetEl.getBoundingClientRect().height : 400, close);

  onDestroy(() => {
    unsubscribe?.();
    slide.destroy();
  });
</script>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform: translate3d(0, {sheetY}%, 0);">
    <div class="sheet-grab-zone"
      on:touchstart={drag.touchstart}
      on:touchmove|nonpassive={drag.touchmove}
      on:touchend={drag.touchend}
      on:touchcancel={drag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">{editingChart ? 'Editar gráfico' : 'Inserir gráfico'}</div>
    </div>

    <div class="sheet-body">
      <div class="field-label" style="color:{c.textSecondary}">Tipo de gráfico</div>
      <div class="type-grid">
        {#each CHART_TYPES as t}
          <button
            class="type-btn"
            class:type-btn-active={chartType === t.id}
            style={chartType === t.id ? `background:${c.primary}1A;border-color:${c.primary};` : `border-color:${c.divider};`}
            on:click={() => chartType = t.id}
          >
            <span
              class="type-icon"
              style="mask-image:url('{fluentIconUrl(t.icon)}');-webkit-mask-image:url('{fluentIconUrl(t.icon)}');background:{chartType === t.id ? c.primary : c.iconTint};"
            ></span>
            <span class="type-label" style="color:{chartType === t.id ? c.primary : c.textPrimary}">{t.label}</span>
          </button>
        {/each}
      </div>

      <div class="field-label" style="color:{c.textSecondary}">Intervalo de dados</div>
      <input
        class="text-input"
        style="color:{c.textPrimary};background:{c.appbarBtnBg};"
        bind:value={dataRange}
        placeholder="A1:B5"
      />

      <div class="field-label" style="color:{c.textSecondary}">Título (opcional)</div>
      <input
        class="text-input"
        style="color:{c.textPrimary};background:{c.appbarBtnBg};"
        bind:value={chartTitle}
        placeholder="Título do gráfico"
      />

      <label class="toggle-row">
        <span style="color:{c.textPrimary}">Primeira linha como legenda</span>
        <input type="checkbox" bind:checked={useFirstRowAsLabels} />
      </label>
      <label class="toggle-row">
        <span style="color:{c.textPrimary}">Primeira coluna como rótulos</span>
        <input type="checkbox" bind:checked={useFirstColAsLabels} />
      </label>

      <div class="sheet-actions">
        <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={close}>Cancelar</button>
        <button class="btn-primary" style="background:{c.primary};opacity:{rangeValid ? 1 : 0.5};" disabled={!rangeValid} on:click={confirm}>
          {editingChart ? 'Guardar' : 'Inserir'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .32s ease;
  }
  .overlay.overlay-in { background: rgba(0,0,0,.45); }
  .bottom-sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-radius: 20px 20px 0 0; z-index: 700;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    will-change: transform;
    box-shadow: 0 -4px 40px rgba(0,0,0,.16);
    max-height: 88vh;
    overflow-y: auto;
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center; }

  .sheet-body { padding: 6px 18px 4px; }
  .field-label { font-size: 12px; font-weight: 600; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .04em; }

  .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .type-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 6px; border-radius: 14px; border: 1.5px solid;
    background: transparent; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .type-btn:active { transform: scale(0.94); }
  .type-icon {
    width: 24px; height: 24px; display: block;
    mask-repeat: no-repeat; mask-position: center; mask-size: contain;
    -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
  }
  .type-label { font-size: 12px; font-weight: 600; }

  .text-input {
    width: 100%; border: none; border-radius: 12px; padding: 12px 14px;
    font-size: 14px; font-family: inherit; outline: none;
  }

  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 2px; font-size: 14px; cursor: pointer;
  }
  .toggle-row input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; }

  .sheet-actions { display: flex; gap: 10px; padding: 20px 0 4px; }
  .btn-primary, .btn-secondary {
    flex: 1; padding: 12px 16px; border-radius: 999px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .btn-primary { color: #fff; }
  .btn-primary:disabled { cursor: default; }
  .btn-primary:active, .btn-secondary:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .type-btn, .btn-primary, .btn-secondary { transition: none !important; }
  }
</style>