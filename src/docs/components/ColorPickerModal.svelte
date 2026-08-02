<!-- docs/components/ColorPickerModal.svelte -->
<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;

  const dispatch = createEventDispatcher();

  let hue = 210;
  let satPct = 70;
  let brightPct = 90;

  let svAreaEl;
  let hueSliderEl;
  let draggingSV = false;
  let draggingHue = false;

  function hsbToHex(h, s, v) {
    s /= 100; v /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(f(5)) + toHex(f(3)) + toHex(f(1));
  }

  $: previewHex = hsbToHex(hue, satPct, brightPct);

  function updateSVFromEvent(clientX, clientY) {
    if (!svAreaEl) return;
    const rect = svAreaEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
    satPct = (x / rect.width) * 100;
    brightPct = 100 - (y / rect.height) * 100;
  }
  function updateHueFromEvent(clientX) {
    if (!hueSliderEl) return;
    const rect = hueSliderEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    hue = (x / rect.width) * 360;
  }

  function onSVDown(e) {
    draggingSV = true;
    const point = e.touches ? e.touches[0] : e;
    updateSVFromEvent(point.clientX, point.clientY);
  }
  function onSVMove(e) {
    if (!draggingSV) return;
    const point = e.touches ? e.touches[0] : e;
    updateSVFromEvent(point.clientX, point.clientY);
    e.preventDefault();
  }
  function onSVUp() {
    draggingSV = false;
  }

  function onHueDown(e) {
    draggingHue = true;
    const point = e.touches ? e.touches[0] : e;
    updateHueFromEvent(point.clientX);
  }
  function onHueMove(e) {
    if (!draggingHue) return;
    const point = e.touches ? e.touches[0] : e;
    updateHueFromEvent(point.clientX);
    e.preventDefault();
  }
  function onHueUp() {
    draggingHue = false;
  }

  function confirmColor() {
    dispatch('confirm', previewHex);
  }

  $: pureHueHex = hsbToHex(hue, 100, 100);

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
  function cancel() {
    dispatch('cancel');
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
  const drag = makeSheetDrag(slide, () => sheetEl ? sheetEl.getBoundingClientRect().height : 400, cancel);

  onDestroy(() => {
    unsubscribe?.();
    slide.destroy();
  });
</script>

<svelte:window
  on:mousemove={onSVMove} on:mouseup={onSVUp}
  on:touchmove|nonpassive={onSVMove} on:touchend={onSVUp}
/>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={cancel} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform: translate3d(0, {sheetY}%, 0);">
    <div class="sheet-grab-zone"
      on:touchstart={drag.touchstart}
      on:touchmove|nonpassive={drag.touchmove}
      on:touchend={drag.touchend}
      on:touchcancel={drag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Escolher cor</div>
    </div>

    <div class="sheet-body">
      <div
        class="sv-area"
        bind:this={svAreaEl}
        style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, {pureHueHex});"
        on:mousedown={onSVDown}
        on:touchstart|nonpassive={onSVDown}
      >
        <div class="sv-thumb" style="left:{satPct}%; top:{100 - brightPct}%; background:{previewHex};"></div>
      </div>

      <div
        class="hue-slider"
        bind:this={hueSliderEl}
        on:mousedown={onHueDown}
        on:touchstart|nonpassive={onHueDown}
        on:mousemove={onHueMove}
        on:touchmove|nonpassive={onHueMove}
        on:mouseup={onHueUp}
        on:touchend={onHueUp}
      >
        <div class="hue-thumb" style="left:{(hue/360)*100}%; background:{pureHueHex};"></div>
      </div>

      <div class="preview-row">
        <div class="preview-swatch" style="background:{previewHex}"></div>
        <span class="preview-hex" style="color:{c.textSecondary}">{previewHex.toUpperCase()}</span>
      </div>

      <div class="sheet-actions">
        <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={cancel}>Cancelar</button>
        <button class="btn-primary" on:click={confirmColor}>OK</button>
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

  .sv-area {
    position: relative;
    width: 100%; height: 160px;
    border-radius: 14px;
    touch-action: none;
    margin-bottom: 14px;
  }
  .sv-thumb {
    position: absolute;
    width: 20px; height: 20px; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hue-slider {
    position: relative;
    width: 100%; height: 20px;
    border-radius: 999px;
    touch-action: none;
    margin-bottom: 16px;
    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  }
  .hue-thumb {
    position: absolute; top: 50%;
    width: 22px; height: 22px; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .preview-swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(127,127,127,0.18); flex-shrink: 0; }
  .preview-hex { font-size: 13px; font-weight: 600; letter-spacing: .03em; }

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
    .overlay, .bottom-sheet { transition: none !important; }
  }
</style>