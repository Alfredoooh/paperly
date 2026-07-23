<!-- components/ColorModal.svelte -->
<script>
  import { localIconPath } from '$shared/local-icon.js';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let customColors = [];
  export let title = 'Cor do texto';

  const dispatch = createEventDispatcher();

  const PRESET_COLORS = [
    '#000000', '#3C3C43', '#8E8E93', '#C42B1C',
    '#CA5010', '#EAA300', '#107C41', '#0B6A6A',
    '#185ABD', '#2564CF', '#8764B8', '#C239B3',
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

  function pick(hex) {
    dispatch('select', hex);
  }
  function requestAddColor() {
    dispatch('addcolor');
  }
  function close() {
    dispatch('close');
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
      <div class="sheet-title" style="color:{c.textPrimary}">{title}</div>
    </div>

    <div class="sheet-body">
      <div class="color-grid">
        {#each PRESET_COLORS as hex}
          <button class="color-dot" style="background:{hex}" on:click={() => pick(hex)} aria-label={hex}></button>
        {/each}
      </div>

      {#if customColors.length > 0}
        <div class="section-label" style="color:{c.textSecondary}">Criadas</div>
        <div class="color-grid">
          {#each customColors as hex}
            <button class="color-dot" style="background:{hex}" on:click={() => pick(hex)} aria-label={hex}></button>
          {/each}
        </div>
      {/if}

      <button class="add-color-btn" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={requestAddColor}>
        <span
          class="add-icon"
          style="mask-image:url('{localIconPath('add_24_regular')}');-webkit-mask-image:url('{localIconPath('add_24_regular')}');background:{c.textPrimary};"
        ></span>
        Adicionar cor
      </button>
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

  .sheet-body { padding: 8px 18px 4px; }
  .section-label { font-size: 12px; font-weight: 600; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
  .color-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .color-dot {
    width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(127,127,127,0.18);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .color-dot:active { transform: scale(0.86); }
  .add-color-btn {
    width: 100%; margin-top: 18px; border: none; border-radius: 999px;
    padding: 13px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .add-color-btn:active { transform: scale(0.97); }
  .add-icon {
    width: 20px; height: 20px; flex-shrink: 0; display: block;
    mask-repeat: no-repeat; mask-position: center; mask-size: contain;
    -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .color-dot, .add-color-btn { transition: none !important; }
  }
</style>