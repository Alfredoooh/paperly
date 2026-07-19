<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let state = { width: 200, height: 120, rotation: 0, wrap: 'front' };

  const dispatch = createEventDispatcher();

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

  let width = 200;
  let rotationLabel = 0;
  let wrapMode = 'front';

  $: if (visible) {
    width = state.width || 200;
    rotationLabel = Math.round(((state.rotation || 0) % 360 + 360) % 360);
    wrapMode = state.wrap || 'front';
  }

  const LAYER_OPTIONS = [
    { id: 'front', label: 'Em frente ao texto', icon: 'position_forward_24_regular' },
    { id: 'behind', label: 'Atrás do texto', icon: 'position_backward_24_regular' },
  ];

  function setLayer(id) {
    wrapMode = id;
    apply();
  }
  function apply() {
    dispatch('apply', { width, wrap: wrapMode });
  }
  function onWidthInput(e) {
    width = Number(e.target.value);
    apply();
  }
  function requestDelete() {
    dispatch('delete');
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
      <div class="sheet-title" style="color:{c.textPrimary}">Opções da imagem</div>
    </div>

    <div class="sheet-body">
      <div class="field-label" style="color:{c.textSecondary}">Tamanho — {width}px</div>
      <fluent-slider class="width-slider" min="40" max="760" step="1" value={width} on:input={onWidthInput}></fluent-slider>

      <div class="field-label" style="color:{c.textSecondary}">Rotação — {rotationLabel}°</div>
      <div class="rotation-hint" style="color:{c.textSecondary}">Arrasta a alça acima da imagem para rodar livremente.</div>

      <div class="field-label" style="color:{c.textSecondary}">Camada</div>
      <div class="wrap-grid">
        {#each LAYER_OPTIONS as opt}
          <button
            class="wrap-opt"
            class:wrap-opt-active={wrapMode === opt.id}
            style="background:{wrapMode === opt.id ? 'rgba(47,123,246,0.14)' : c.appbarBtnBg}"
            on:click={() => setLayer(opt.id)}
          >
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}{opt.icon}.svg');-webkit-mask-image:url('{FLUENT_CDN}{opt.icon}.svg');background:{wrapMode === opt.id ? '#2F7BF6' : c.iconTint};width:22px;height:22px;"></span>
            <span class="wrap-label" style="color:{wrapMode === opt.id ? '#2F7BF6' : c.textPrimary}">{opt.label}</span>
          </button>
        {/each}
      </div>

      <fluent-button appearance="outline" class="delete-btn" on:click={requestDelete}>Remover imagem</fluent-button>
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
    max-height: 78vh;
    display: flex; flex-direction: column;
  }
  .sheet-grab-zone { touch-action: none; flex-shrink: 0; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center; }

  .sheet-body { padding: 8px 18px 4px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .field-label { font-size: 12px; font-weight: 600; margin: 14px 0 10px; text-transform: uppercase; letter-spacing: .04em; }
  .rotation-hint { font-size: 12px; font-weight: 500; margin: -4px 0 14px; opacity: 0.8; }

  :global(.width-slider) {
    width: 100%; margin: 0 0 4px;
    --accent-fill-rest: #2F7BF6;
  }

  .wrap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .wrap-opt {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    border: none; border-radius: 14px; padding: 12px 8px; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .wrap-opt:active { transform: scale(0.96); }
  .wrap-label { font-size: 11px; font-weight: 600; text-align: center; line-height: 1.3; }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  :global(.delete-btn) {
    width: 100%; margin: 18px 0 4px; border-radius: 999px !important;
    font-size: 14px; font-weight: 600;
    --neutral-stroke-rest: rgba(255,59,48,0.4);
    color: #FF3B30 !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .wrap-opt, .delete-btn { transition: none !important; }
  }
</style>