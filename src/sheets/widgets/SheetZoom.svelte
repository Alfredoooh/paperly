<!-- widgets/SheetZoom.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  // Widget de pinch-to-zoom + pan de dois dedos, adaptado do
  // PinchZoom.svelte do docs para envolver a grelha de sheets. Sem
  // UI própria — o consumidor liga <slot> e recebe 'zoomchange'.
  export let minScale = 0.5;  // sheets permite reduzir ABAIXO da base (diminuir o "papel"), ao contrário do docs que só amplia
  export let maxScale = 3;
  export let scale = 1;

  const dispatch = createEventDispatcher();

  let containerEl;
  let panX = 0;
  let panY = 0;

  let pointers = new Map();
  let startDist = 0;
  let startScale = 1;
  let startPanX = 0;
  let startPanY = 0;
  let startMidX = 0;
  let startMidY = 0;
  let isPinching = false;

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function clampScale(s) {
    return Math.min(maxScale, Math.max(minScale, s));
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Com 1 dedo só, nunca capturamos aqui — o SheetGrid tem scroll
    // bidirecional PRÓPRIO (scrollerEl) que precisa continuar a
    // funcionar normalmente com 1 dedo. Só entramos em ação com 2
    // dedos (pinch), nunca competindo com o pan/scroll de 1 dedo do
    // grid interno.
    if (pointers.size === 0) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    containerEl?.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      startDist = dist(a, b);
      startScale = scale;
      const m = mid(a, b);
      startMidX = m.x;
      startMidY = m.y;
      startPanX = panX;
      startPanY = panY;
      isPinching = true;
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (isPinching && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const newDist = dist(a, b);
      if (startDist > 0) {
        const rawScale = startScale * (newDist / startDist);
        scale = clampScale(rawScale);
      }
      const m = mid(a, b);
      panX = startPanX + (m.x - startMidX);
      panY = startPanY + (m.y - startMidY);
      dispatch('zoomchange', { scale });
      e.preventDefault();
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
  }

  onDestroy(() => {
    pointers.clear();
  });
</script>

<div
  class="zoom-root"
  bind:this={containerEl}
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
>
  <div
    class="zoom-content"
    class:zoom-transition={!isPinching}
    style="transform: translate3d({panX}px, {panY}px, 0) scale({scale}); transform-origin: top left;"
  >
    <slot />
  </div>
</div>

<style>
  .zoom-root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .zoom-content {
    width: 100%;
    height: 100%;
    will-change: transform;
  }
  .zoom-content.zoom-transition {
    transition: transform .22s cubic-bezier(0.22, 1, 0.36, 1);
  }
</style>