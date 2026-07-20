<!-- docs/components/LayersModal.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let layers = []; // [{ id, type:'image'|'table'|'shape', label }]

  const dispatch = createEventDispatcher();

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

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

  let sheetEl;
  let dragging = false, liveActive = false;
  let startY = 0, currentY = 0, startTime = 0;

  function onTouchStart(e) {
    dragging = true;
    liveActive = false;
    startY = e.touches[0].clientY;
    currentY = startY;
    startTime = performance.now();
  }
  function onTouchMove(e) {
    if (!dragging) return;
    const y = e.touches[0].clientY;
    currentY = y;
    const delta = y - startY;
    if (delta <= 4) return;
    if (!liveActive) liveActive = true;
    const sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 400;
    const progress = Math.min(1, Math.max(0, delta / sheetH));
    slide.setDragValue(progress * 100);
    e.preventDefault();
  }
  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;
    if (!liveActive) { liveActive = false; return; }
    liveActive = false;
    const elapsed = Math.max(1, performance.now() - startTime);
    const sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 400;
    const delta = currentY - startY;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
    const shouldClose = draggedFraction > 0.3 || (delta > 0 && velocity > 0.5);
    if (shouldClose) close();
    else slide.releaseDragTo('open');
  }

  function selectLayer(layer) {
    dispatch('select', layer.id);
    close();
  }

  function deleteLayer(e, layer) {
    e.stopPropagation();
    dispatch('delete', layer.id);
  }

  const TYPE_ICONS = {
    image: 'image_24_regular',
    table: 'table_24_regular',
    shape: 'shapes_24_regular',
  };

  onDestroy(() => {
    unsubscribe?.();
    slide.destroy();
  });
</script>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="grab-zone"
      on:touchstart={onTouchStart}
      on:touchmove|nonpassive={onTouchMove}
      on:touchend={onTouchEnd}
      on:touchcancel={onTouchEnd}>
      <div class="handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Camadas</div>
    </div>

    <div class="sheet-body">
      {#if layers.length === 0}
        <div class="empty" style="color:{c.textSecondary}">Nenhum elemento inserido nesta folha.</div>
      {:else}
        {#each layers as layer (layer.id)}
          <button class="layer-row" on:click={() => selectLayer(layer)}>
            <span
              class="layer-icon icon-mask"
              style="mask-image:url('{FLUENT_CDN}{TYPE_ICONS[layer.type] || 'image_24_regular'}.svg');-webkit-mask-image:url('{FLUENT_CDN}{TYPE_ICONS[layer.type] || 'image_24_regular'}.svg');background:{c.iconTint};width:20px;height:20px;"
            ></span>
            <span class="layer-label" style="color:{c.textPrimary}">{layer.label}</span>
            <button
              class="layer-delete"
              on:click={(e) => deleteLayer(e, layer)}
              aria-label="Remover"
              style="color:#FF3B30"
            >×</button>
          </button>
        {/each}
      {/if}
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
    max-height: 60vh;
    display: flex; flex-direction: column;
  }
  .grab-zone { touch-action: none; flex-shrink: 0; }
  .handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title {
    font-size: 13px; font-weight: 700;
    padding: 4px 18px 12px;
    opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center;
  }

  .sheet-body { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 8px 8px; }

  .empty {
    text-align: center; padding: 24px 16px;
    font-size: 14px; font-weight: 500;
  }

  .layer-row {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 13px 12px;
    text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    border-radius: 14px;
    transition: background .14s ease, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .layer-row:active { background: rgba(127,127,127,0.10); transform: scale(0.98); }

  .layer-icon {
    flex-shrink: 0;
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .layer-label { flex: 1; font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .layer-delete {
    background: none; border: none; font-size: 20px; line-height: 1;
    padding: 4px 6px; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .layer-delete:active { transform: scale(0.86); }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .layer-row, .layer-delete { transition: none !important; }
  }
</style>