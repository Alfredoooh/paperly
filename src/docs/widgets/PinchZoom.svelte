<script>
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let minScale = 1;
  export let maxScale = 4;
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

  let singleStartX = 0;
  let singleStartY = 0;
  let singlePanStartX = 0;
  let singlePanStartY = 0;
  let isSinglePanning = false;

  $: touchActionValue = scale > minScale + 0.01 ? 'none' : 'pan-y';

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function clampScale(s) {
    return Math.min(maxScale, Math.max(minScale, s));
  }

  function clampPan() {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const maxOffsetX = rect.width * 0.5 * (scale - 1) + rect.width * 0.15;
    const maxOffsetY = rect.height * 0.5 * (scale - 1) + rect.height * 0.15;
    panX = Math.min(maxOffsetX, Math.max(-maxOffsetX, panX));
    panY = Math.min(maxOffsetY, Math.max(-maxOffsetY, panY));
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (pointers.size === 0 && scale <= minScale + 0.01) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    containerEl?.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      isSinglePanning = false;
      const [a, b] = [...pointers.values()];
      startDist = dist(a, b);
      startScale = scale;
      const m = mid(a, b);
      startMidX = m.x;
      startMidY = m.y;
      startPanX = panX;
      startPanY = panY;
      isPinching = true;
    } else if (pointers.size === 1 && scale > minScale + 0.01) {
      isPinching = false;
      isSinglePanning = true;
      const p = [...pointers.values()][0];
      singleStartX = p.x;
      singleStartY = p.y;
      singlePanStartX = panX;
      singlePanStartY = panY;
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
      clampPan();
      dispatch('zoomchange', { scale });
      e.preventDefault();
    } else if (isSinglePanning && pointers.size === 1) {
      const p = [...pointers.values()][0];
      panX = singlePanStartX + (p.x - singleStartX);
      panY = singlePanStartY + (p.y - singleStartY);
      clampPan();
      e.preventDefault();
    }
  }

  function settleToBaseIfClose() {
    if (Math.abs(scale - minScale) < 0.06) {
      scale = minScale;
      panX = 0;
      panY = 0;
      dispatch('zoomchange', { scale });
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
    if (pointers.size === 0) {
      isSinglePanning = false;
      settleToBaseIfClose();
    }
  }

  onDestroy(() => {
    pointers.clear();
  });
</script>

<div
  class="pinch-root"
  bind:this={containerEl}
  style="touch-action: {touchActionValue};"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
>
  <div
    class="pinch-content"
    class:pinch-transition={!isPinching && !isSinglePanning}
    style="transform: translate3d({panX}px, {panY}px, 0) scale({scale});"
  >
    <slot />
  </div>
</div>

<style>
  .pinch-root {
    width: 100%;
    height: 100%;
    overflow: visible;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .pinch-content {
    transform-origin: top center;
    will-change: transform;
  }

  .pinch-content.pinch-transition {
    transition: transform .22s cubic-bezier(0.22, 1, 0.36, 1);
  }
</style>