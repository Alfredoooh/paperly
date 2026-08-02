<!-- docs/components/TableModal.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;

  const dispatch = createEventDispatcher();

  const MAX_GRID = 8;
  let hoverRow = 2;
  let hoverCol = 2;
  let rowsInput = 3;
  let colsInput = 3;

  function pickCell(r, col) {
    rowsInput = r;
    colsInput = col;
  }
  function confirmInsert() {
    dispatch('insert', { rows: Math.max(1, rowsInput), cols: Math.max(1, colsInput) });
  }
  function close() {
    dispatch('close');
  }

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;

  $: if (visible && !showSheet) openSheet();
  else if (!visible && showSheet) closeSheet();

  function openSheet() {
    rowsInput = 3;
    colsInput = 3;
    hoverRow = 3;
    hoverCol = 3;
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
      <div class="sheet-title" style="color:{c.textPrimary}">Inserir tabela</div>
    </div>

    <div class="sheet-body">
      <div class="grid-preview-label" style="color:{c.textSecondary}">{rowsInput} × {colsInput}</div>
      <div class="grid-picker">
        {#each Array(MAX_GRID) as _, r}
          <div class="grid-row">
            {#each Array(MAX_GRID) as __, col}
              <button
                class="grid-cell"
                class:grid-cell-active={r < rowsInput && col < colsInput}
                style="background:{r < rowsInput && col < colsInput ? 'var(--accent-primary)' : c.appbarBtnBg}"
                on:click={() => pickCell(r + 1, col + 1)}
                aria-label={`${r + 1} por ${col + 1}`}
              ></button>
            {/each}
          </div>
        {/each}
      </div>

      <div class="manual-row">
        <label class="manual-field">
          <span style="color:{c.textSecondary}">Linhas</span>
          <input type="number" min="1" max="30" bind:value={rowsInput} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </label>
        <label class="manual-field">
          <span style="color:{c.textSecondary}">Colunas</span>
          <input type="number" min="1" max="12" bind:value={colsInput} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </label>
      </div>

      <div class="sheet-actions">
        <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={close}>Cancelar</button>
        <button class="btn-primary" on:click={confirmInsert}>Inserir</button>
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
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center; }

  .sheet-body { padding: 8px 18px 4px; }
  .grid-preview-label { text-align: center; font-size: 13px; font-weight: 700; margin-bottom: 10px; }

  .grid-picker { display: flex; flex-direction: column; gap: 4px; align-items: center; margin-bottom: 18px; }
  .grid-row { display: flex; gap: 4px; }
  .grid-cell {
    width: 24px; height: 24px; border-radius: 4px; border: none;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background .1s;
  }
  .grid-cell-active { opacity: 0.9; }

  .manual-row { display: flex; gap: 12px; margin-bottom: 18px; }
  .manual-field { flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; }
  .manual-field input {
    border: none; border-radius: 12px; padding: 10px 12px; font-size: 15px;
    outline: none; box-sizing: border-box; width: 100%;
  }

  .sheet-actions { display: flex; gap: 10px; padding-bottom: 4px; }
  .btn-primary, .btn-secondary {
    flex: 1; padding: 12px 16px; border-radius: 999px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .btn-primary { background: var(--accent-primary); color: var(--text-on-accent); }
  .btn-primary:active, .btn-secondary:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .grid-cell, .btn-primary, .btn-secondary { transition: none !important; }
  }
</style>