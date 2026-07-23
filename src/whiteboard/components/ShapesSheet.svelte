<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let boardW = 512;
  export let boardH = 512;

  const dispatch = createEventDispatcher();

  const SHAPE_ICONS = [
    { id: 'square_24_filled',      label: 'Quadrado' },
    { id: 'circle_24_filled',      label: 'Círculo' },
    { id: 'triangle_24_filled',    label: 'Triângulo' },
    { id: 'pentagon_24_filled',    label: 'Pentágono' },
    { id: 'hexagon_24_filled',     label: 'Hexágono' },
    { id: 'octagon_24_filled',     label: 'Octógono' },
    { id: 'star_24_filled',        label: 'Estrela' },
    { id: 'heart_24_filled',       label: 'Coração' },
    { id: 'diamond_24_filled',     label: 'Diamante' },
    { id: 'oval_24_filled',        label: 'Oval' },
    { id: 'rhombus_24_filled',     label: 'Losango' },
    { id: 'line_24_regular',       label: 'Linha' },
    { id: 'arrow_right_24_filled', label: 'Seta' },
    { id: 'bookmark_24_filled',    label: 'Marcador' },
    { id: 'cloud_24_filled',       label: 'Nuvem' },
    { id: 'flag_24_filled',        label: 'Bandeira' },
  ];

  function addShape(shapeId) {
    const w = 200, h = shapeId === 'line_24_regular' ? 6 : 200;
    dispatch('addshape', {
      type: 'shape', x: Math.max(0, Math.round((boardW - w) / 2)), y: Math.max(0, Math.round((boardH - h) / 2)),
      w, h, deg: 0, shape: shapeId, fill: 'var(--accent-primary)', border: 'transparent', borderWidth: 0,
      radius: 0, opacity: 1, shadow: false, blend: 'normal',
    });
    close();
  }
  function close() { dispatch('close'); }

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;

  $: if (visible && !showSheet) openSheet();
  else if (!visible && showSheet) closeSheet();

  function openSheet() {
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { overlayVisible = true; slide.open(); }));
  }
  function closeSheet() {
    overlayVisible = false;
    slide.close();
    setTimeout(() => { showSheet = false; }, 300);
  }

  let sheetEl;
  let dragging = false, liveActive = false, startY = 0, currentY = 0, startTime = 0;
  function onTouchStart(e) { dragging = true; liveActive = false; startY = e.touches[0].clientY; currentY = startY; startTime = performance.now(); }
  function onTouchMove(e) {
    if (!dragging) return;
    const y = e.touches[0].clientY; currentY = y;
    const delta = y - startY;
    if (delta <= 4) return;
    if (!liveActive) liveActive = true;
    const sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 400;
    slide.setDragValue(Math.min(1, Math.max(0, delta / sheetH)) * 100);
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
    if (draggedFraction > 0.3 || (delta > 0 && velocity > 0.5)) close();
    else slide.releaseDragTo('open');
  }

  onDestroy(() => { unsubscribe?.(); slide.destroy(); });
</script>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="sheet-grab-zone" on:touchstart={onTouchStart} on:touchmove|nonpassive={onTouchMove} on:touchend={onTouchEnd} on:touchcancel={onTouchEnd}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Formas</div>
    </div>
    <div class="sheet-body">
      <div class="shape-grid">
        {#each SHAPE_ICONS as s}
          <button class="shape-item" style="background:{c.appbarBtnBg}" on:click={() => addShape(s.id)}>
            <span class="icon-mask" style="mask-image:url('{localIconPath(s.id)}');-webkit-mask-image:url('{localIconPath(s.id)}');background:{c.iconTint};width:24px;height:24px;"></span>
            <span class="shape-label" style="color:{c.textSecondary}">{s.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0); z-index:600; border:none; cursor:default; width:100%; height:100%; transition:background .32s ease; }
  .overlay.overlay-in { background:rgba(0,0,0,.45); }
  .bottom-sheet { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; z-index:700; padding:0 0 calc(env(safe-area-inset-bottom,0px) + 24px); will-change:transform; box-shadow:0 -4px 40px rgba(0,0,0,.16); max-height:72vh; display:flex; flex-direction:column; }
  .sheet-grab-zone { touch-action:none; flex-shrink:0; }
  .sheet-handle { width:36px; height:4px; border-radius:2px; margin:10px auto 8px; }
  .sheet-title { font-size:13px; font-weight:700; padding:4px 18px 10px; opacity:.6; text-transform:uppercase; letter-spacing:.05em; text-align:center; }
  .sheet-body { padding:8px 18px 4px; overflow-y:auto; -webkit-overflow-scrolling:touch; }

  .shape-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
  .shape-item { display:flex; flex-direction:column; align-items:center; gap:7px; border:none; border-radius:14px; padding:14px 6px; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .shape-item:active { transform:scale(0.92); }
  .shape-label { font-size:10.5px; font-weight:600; text-align:center; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  @media (prefers-reduced-motion: reduce) { .overlay, .bottom-sheet { transition:none !important; } }
</style>