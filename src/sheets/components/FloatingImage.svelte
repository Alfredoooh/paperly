<!-- components/FloatingImage.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let image; // { id, src, x, y, w, h }
  export let c;
  export let selected = false;
  export let scaleFactor = 1;
  
  const dispatch = createEventDispatcher();
  
  let dragging = false;
  let resizing = false;
  let startX = 0,
    startY = 0,
    origX = 0,
    origY = 0,
    origW = 0,
    origH = 0,
    aspectRatio = 1;
  
  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  
  function onImageDown(e) {
    dispatch('select', image.id);
    const p = pointerXY(e);
    dragging = true;
    startX = p.x;
    startY = p.y;
    origX = image.x;
    origY = image.y;
    e.stopPropagation();
    e.preventDefault();
  }
  
  function onResizeDown(e) {
    const p = pointerXY(e);
    resizing = true;
    startX = p.x;
    startY = p.y;
    origW = image.w;
    origH = image.h;
    aspectRatio = image.w / image.h || 1;
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
      dispatch('move', { id: image.id, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
    } else if (resizing) {
      const dx = (p.x - startX) / sf;
      const newW = Math.max(32, origW + dx);
      const newH = newW / aspectRatio;
      dispatch('resize', { id: image.id, w: newW, h: newH });
    }
    e.preventDefault();
  }
  
  function onUp() {
    if (dragging || resizing) dispatch('gestureend');
    dragging = false;
    resizing = false;
  }
</script>

<svelte:window on:pointermove={onMove} on:pointerup={onUp} on:touchmove|nonpassive={onMove} on:touchend={onUp} />

<div class="img-box" class:img-selected={selected} style="left:{image.x}px; top:{image.y}px; width:{image.w}px; height:{image.h}px;" on:pointerdown={onImageDown} on:touchstart={onImageDown}>
  <img src={image.src} draggable="false" alt="" class="img-content" />
  
  {#if selected}
    <div class="resize-handle" on:pointerdown={onResizeDown} on:touchstart={onResizeDown}></div>
  {/if}
</div>

<style>
  /* Mesmo princípio do .float-obj em DocPage.svelte: SEM border,
     SEM border-radius — a imagem fica solta, sem moldura sólida.
     Só o outline fino de seleção, sem raio. */
  .img-box {
    position: absolute;
    cursor: grab;
    touch-action: none;
    z-index: 5;
    -webkit-user-select: none;
    user-select: none;
  }
  .img-box:active { cursor: grabbing; }
  .img-box.img-selected {
    outline: 1.5px solid #2F7BF6;
    outline-offset: 2px;
    z-index: 6;
  }
  .img-content {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
    pointer-events: none;
  }
  .resize-handle {
    position: absolute; right: -8px; bottom: -8px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #2F7BF6; border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    cursor: nwse-resize;
    touch-action: none;
  }
</style><!-- components/FloatingImage.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let image; // { id, src, x, y, w, h }
  export let c;
  export let selected = false;
  export let scaleFactor = 1;
  
  const dispatch = createEventDispatcher();
  
  let dragging = false;
  let resizing = false;
  let startX = 0,
    startY = 0,
    origX = 0,
    origY = 0,
    origW = 0,
    origH = 0,
    aspectRatio = 1;
  
  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  
  function onImageDown(e) {
    dispatch('select', image.id);
    const p = pointerXY(e);
    dragging = true;
    startX = p.x;
    startY = p.y;
    origX = image.x;
    origY = image.y;
    e.stopPropagation();
    e.preventDefault();
  }
  
  function onResizeDown(e) {
    const p = pointerXY(e);
    resizing = true;
    startX = p.x;
    startY = p.y;
    origW = image.w;
    origH = image.h;
    aspectRatio = image.w / image.h || 1;
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
      dispatch('move', { id: image.id, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
    } else if (resizing) {
      const dx = (p.x - startX) / sf;
      const newW = Math.max(32, origW + dx);
      const newH = newW / aspectRatio;
      dispatch('resize', { id: image.id, w: newW, h: newH });
    }
    e.preventDefault();
  }
  
  function onUp() {
    if (dragging || resizing) dispatch('gestureend');
    dragging = false;
    resizing = false;
  }
</script>

<svelte:window on:pointermove={onMove} on:pointerup={onUp} on:touchmove|nonpassive={onMove} on:touchend={onUp} />

<div class="img-box" class:img-selected={selected} style="left:{image.x}px; top:{image.y}px; width:{image.w}px; height:{image.h}px;" on:pointerdown={onImageDown} on:touchstart={onImageDown}>
  <img src={image.src} draggable="false" alt="" class="img-content" />
  
  {#if selected}
    <div class="resize-handle" on:pointerdown={onResizeDown} on:touchstart={onResizeDown}></div>
  {/if}
</div>

<style>
  /* Mesmo princípio do .float-obj em DocPage.svelte: SEM border,
     SEM border-radius — a imagem fica solta, sem moldura sólida.
     Só o outline fino de seleção, sem raio. */
  .img-box {
    position: absolute;
    cursor: grab;
    touch-action: none;
    z-index: 5;
    -webkit-user-select: none;
    user-select: none;
  }
  .img-box:active { cursor: grabbing; }
  .img-box.img-selected {
    outline: 1.5px solid #2F7BF6;
    outline-offset: 2px;
    z-index: 6;
  }
  .img-content {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
    pointer-events: none;
  }
  .resize-handle {
    position: absolute; right: -8px; bottom: -8px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #2F7BF6; border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    cursor: nwse-resize;
    touch-action: none;
  }
</style>