<script>
  import { localIconPath } from '$shared/local-icon.js';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let currentFormat = 'general';

  const dispatch = createEventDispatcher();

  const FORMATS = [
    { id: 'general', label: 'Geral', sample: '1234.5' },
    { id: 'integer', label: 'Número inteiro', sample: '1235' },
    { id: 'decimal2', label: 'Duas casas decimais', sample: '1234.50' },
    { id: 'percent', label: 'Percentagem', sample: '12.3%' },
    { id: 'currency', label: 'Moeda (Kz)', sample: '1 234,50 Kz' },
  ];

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
  function pick(id) {
    dispatch('select', id);
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
      <div class="sheet-title" style="color:{c.textPrimary}">Formato numérico</div>
    </div>

    <div class="sheet-body">
      {#each FORMATS as f}
        <button class="format-row" class:format-row-active={currentFormat === f.id} style={currentFormat === f.id ? `background:${c.primary}1A;` : ''} on:click={() => pick(f.id)}>
          <span class="format-label" style="color:{c.textPrimary}">{f.label}</span>
          <span class="format-sample" style="color:{c.textSecondary}">{f.sample}</span>
          {#if currentFormat === f.id}
            <span
              class="format-check"
              style="mask-image:url('{localIconPath('checkmark_24_regular')}');-webkit-mask-image:url('{localIconPath('checkmark_24_regular')}');background:{c.primary};"
            ></span>
          {/if}
        </button>
      {/each}
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
    border-radius: 12px 12px 0 0; z-index: 700;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    will-change: transform;
    box-shadow: 0 -4px 40px rgba(0,0,0,.16);
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center; }

  .sheet-body { padding: 4px 10px 4px; }
  .format-row {
    width: 100%; display: flex; align-items: center; gap: 10px;
    background: none; border: none; padding: 13px 12px; border-radius: 12px;
    text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .14s ease;
  }
  .format-row:active { background: rgba(127,127,127,0.10); }
  .format-label { font-size: 14px; font-weight: 600; flex-shrink: 0; min-width: 150px; }
  .format-sample { font-size: 13px; flex: 1; text-align: right; }
  .format-check {
    width: 24px; height: 24px; flex-shrink: 0; display: block;
    mask-repeat: no-repeat; mask-position: center; mask-size: contain;
    -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .format-row { transition: none !important; }
  }
</style>