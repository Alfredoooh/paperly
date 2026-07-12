<!-- src/home/components/TemplatesTab.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';
  import { createBackRecoilTransition } from '../lib/nav-transition.js';
  import LongPressMenu from './LongPressMenu.svelte';

  export let view = 'images'; // 'images' | 'documents' — controlado pelo toggle do appbar
  export let onOpenPreview = () => {}; // (kind, item) => void — controlado pelo App.svelte

  let loading = true;

  function splitColumns(items) {
    const left = [], right = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item); else right.push(item);
    });
    return [left, right];
  }
  $: imageColumns = splitColumns(IMAGE_MODELS);

  function openImgPreview(img) { onOpenPreview('image', img); }
  function openDocPreview(doc) { onOpenPreview('doc', doc); }

  // ------------------------------------------------------------------
  // Elastic / pull-to-refresh via spring (rAF).
  //
  // BUG CORRIGIDO NESTA VERSÃO: o `.templates-tab` recebia o
  // translateY do pull, mas quem tinha overflow-y:auto de verdade era
  // o `.scroll-root` do App.svelte (o pai). Como o elemento que rola
  // fisicamente e o elemento que "estica" eram diferentes, o rubber-
  // band nunca aparecia — o scrollTop lido em onPointerMove vinha
  // sempre do elemento errado. Agora `.templates-tab` É o próprio
  // scroller (overflow-y:auto aqui), e o pull é aplicado num wrapper
  // interno — exatamente o mesmo padrão que já funciona no CreateTab.
  // ------------------------------------------------------------------
  const recoil = createBackRecoilTransition();
  let pull = 0; // px, derivado do valor -1..1 do spring
  const MAX_PULL = 64;
  const unsubscribeRecoil = recoil.subscribe((v) => { pull = v * MAX_PULL; });

  let scrollEl;   // o elemento que rola de verdade (overflow-y:auto)
  let innerEl;    // wrapper que recebe o translateY do elastic
  let dragging = false;
  let gestureStartY = 0;
  let gestureStartScrollTop = 0;

  function dampen(delta) {
    const sign = delta < 0 ? -1 : 1;
    const abs = Math.abs(delta);
    return sign * (abs * 0.55) / (1 + abs / 120);
  }

  function onPointerDown(e) {
    if (!scrollEl || longPressActive) return;
    dragging = true;
    gestureStartY = e.touches ? e.touches[0].clientY : e.clientY;
    gestureStartScrollTop = scrollEl.scrollTop;
  }
  function onPointerMove(e) {
    if (!dragging || !scrollEl) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - gestureStartY;

    const atTop = gestureStartScrollTop <= 0;
    const atBottom = gestureStartScrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;

    let normalized = 0;
    if (atTop && delta > 0) {
      normalized = Math.min(1, dampen(delta) / MAX_PULL);
    } else if (atBottom && delta < 0) {
      normalized = Math.max(-1, dampen(delta) / MAX_PULL);
    }

    if (normalized !== 0) e.preventDefault?.();
    recoil.setDragValue(normalized);
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    recoil.releaseDragTo();
  }

  // ------------------------------------------------------------------
  // Long-press estilo Pinterest.
  // ------------------------------------------------------------------
  const LONG_PRESS_MS = 400;
  const MOVE_CANCEL_THRESHOLD = 10;

  let longPressActive = false;
  let longPressTimer = null;
  let longPressOrigin = { x: 0, y: 0 };
  let longPressTarget = null;
  let longPressCardRect = null; // DOMRect do card pressionado, para o "buraco" no overlay
  let menuRef;
  let pressStartX = 0, pressStartY = 0;
  let pressMoved = false;
  let pressedEl = null;

  function buzzLongPress() {
    try { navigator.vibrate && navigator.vibrate([0, 12, 30, 12]); } catch (e) {}
  }

  function armLongPress(e, kind, item) {
    const t = e.touches ? e.touches[0] : e;
    pressStartX = t.clientX;
    pressStartY = t.clientY;
    pressMoved = false;
    longPressTarget = { kind, item };
    pressedEl = e.currentTarget;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (pressMoved) return;
      longPressOrigin = { x: pressStartX, y: pressStartY };
      longPressCardRect = pressedEl?.getBoundingClientRect() || null;
      longPressActive = true;
      buzzLongPress();
    }, LONG_PRESS_MS);
  }

  function trackLongPress(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!longPressActive) {
      const dx = t.clientX - pressStartX;
      const dy = t.clientY - pressStartY;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD) {
        pressMoved = true;
        clearTimeout(longPressTimer);
      }
      return;
    }
    menuRef?.updatePointer(t.clientX, t.clientY);
  }

  function releaseLongPress() {
    clearTimeout(longPressTimer);
    if (!longPressActive) return;
    menuRef?.resolve();
  }

  function cancelLongPressGesture() {
    clearTimeout(longPressTimer);
    if (longPressActive) longPressActive = false;
  }

  function handleMenuSelect() {
    // Visual apenas por agora — ações reais (partilhar/fixar/pesquisar/
    // whatsapp) ligam-se aqui quando definidas.
    longPressActive = false;
    longPressTarget = null;
    longPressCardRect = null;
  }
  function handleMenuCancel() {
    longPressActive = false;
    longPressTarget = null;
    longPressCardRect = null;
  }

  onMount(() => {
    const t = setTimeout(() => { loading = false; }, 700);
    return () => clearTimeout(t);
  });
  onDestroy(() => {
    unsubscribeRecoil();
    recoil.destroy();
    clearTimeout(longPressTimer);
  });
</script>

<div
  class="templates-tab"
  bind:this={scrollEl}
  on:touchstart={onPointerDown}
  on:touchmove|nonpassive={onPointerMove}
  on:touchend={onPointerUp}
  on:touchcancel={onPointerUp}
  on:mousedown={onPointerDown}
  on:mousemove={onPointerMove}
  on:mouseup={onPointerUp}
  on:mouseleave={onPointerUp}
>
  <div class="templates-tab-inner" bind:this={innerEl} style="transform: translateY({pull}px);">
    {#if loading}
      {#if view === 'images'}
        <div class="masonry">
          <div class="masonry-col">
            <div class="skeleton-card" style="aspect-ratio:3/4"></div>
            <div class="skeleton-card" style="aspect-ratio:1/1"></div>
            <div class="skeleton-card" style="aspect-ratio:4/5"></div>
          </div>
          <div class="masonry-col">
            <div class="skeleton-card" style="aspect-ratio:1/1"></div>
            <div class="skeleton-card" style="aspect-ratio:4/5"></div>
            <div class="skeleton-card" style="aspect-ratio:3/4"></div>
          </div>
        </div>
      {:else}
        <div class="doc-grid">
          {#each Array(6) as _}
            <div class="skeleton-doc">
              <div class="skeleton-sheet"></div>
              <div class="skeleton-line"></div>
            </div>
          {/each}
        </div>
      {/if}
    {:else if view === 'images'}
      <div class="masonry">
        {#each imageColumns as column}
          <div class="masonry-col">
            {#each column as img}
              <button
                class="img-card"
                class:pressed={longPressActive && longPressTarget?.item === img}
                on:click={() => openImgPreview(img)}
                on:touchstart={(e) => armLongPress(e, 'image', img)}
                on:touchmove={trackLongPress}
                on:touchend={releaseLongPress}
                on:touchcancel={cancelLongPressGesture}
                on:mousedown={(e) => armLongPress(e, 'image', img)}
                on:mousemove={trackLongPress}
                on:mouseup={releaseLongPress}
                on:mouseleave={cancelLongPressGesture}
              >
                <img src={img.thumb} alt={img.label} class="img-card-photo" loading="lazy" />
                <span class="img-card-overlay"></span>
                <span class="img-card-label">{img.label}</span>
              </button>
            {/each}
          </div>
        {/each}
      </div>
    {:else}
      <div class="doc-grid">
        {#each DOC_MODELS as doc}
          <button
            class="doc-card"
            class:pressed={longPressActive && longPressTarget?.item === doc}
            on:click={() => openDocPreview(doc)}
            on:touchstart={(e) => armLongPress(e, 'doc', doc)}
            on:touchmove={trackLongPress}
            on:touchend={releaseLongPress}
            on:touchcancel={cancelLongPressGesture}
            on:mousedown={(e) => armLongPress(e, 'doc', doc)}
            on:mousemove={trackLongPress}
            on:mouseup={releaseLongPress}
            on:mouseleave={cancelLongPressGesture}
          >
            <div class="doc-sheet">
              <span class="doc-icon-mask" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}')"></span>
              <span class="doc-line doc-line-1"></span>
              <span class="doc-line doc-line-2"></span>
              <span class="doc-line doc-line-3"></span>
              <span class="doc-line doc-line-4"></span>
            </div>
            <span class="doc-label">{doc.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if longPressActive && longPressTarget}
  <LongPressMenu
    bind:this={menuRef}
    originX={longPressOrigin.x}
    originY={longPressOrigin.y}
    cardRect={longPressCardRect}
    on:select={handleMenuSelect}
    on:cancel={handleMenuCancel}
  />
{/if}

<style>
  .templates-tab {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }
  .templates-tab-inner {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
    will-change: transform;
  }
  .masonry {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding-top: 6px;
  }
  .masonry-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .img-card {
    position: relative;
    display: block;
    width: 100%;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 20px;
    overflow: hidden;
    background: var(--surface-apps-tab);
    box-shadow: 0 2px 10px var(--drawer-shadow);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 1;
  }
  .masonry-col:first-child .img-card:nth-child(3n+1) { aspect-ratio: 3 / 4; }
  .masonry-col:first-child .img-card:nth-child(3n+2) { aspect-ratio: 1 / 1; }
  .masonry-col:first-child .img-card:nth-child(3n+3) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+1) { aspect-ratio: 1 / 1; }
  .masonry-col:last-child .img-card:nth-child(3n+2) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+3) { aspect-ratio: 3 / 4; }
  .img-card:active { transform: scale(0.96); }
  .img-card.pressed {
    transform: scale(1.04);
    z-index: 51; /* acima do overlay do long-press (z-index 50) */
  }
  .img-card-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .img-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
  }
  .img-card-label {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 9px;
    font-size: 12.5px;
    font-weight: 700;
    color: #fff;
    text-align: left;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px 10px;
    padding-top: 6px;
  }
  .doc-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    position: relative;
    z-index: 1;
  }
  .doc-card.pressed {
    z-index: 51;
  }
  .doc-sheet {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    background: var(--surface-apps-tab);
    border: 1px solid var(--border-soft);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14% 12%;
    box-shadow: 0 1px 4px var(--drawer-shadow);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .doc-card:active .doc-sheet {
    transform: scale(0.94);
    background: var(--row-active);
  }
  .doc-card.pressed .doc-sheet {
    transform: scale(1.06);
    background: var(--surface-apps-tab);
  }
  .doc-icon-mask {
    width: 26%;
    aspect-ratio: 1 / 1;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    margin-bottom: 4%;
    flex-shrink: 0;
  }
  .doc-line {
    display: block;
    width: 74%;
    height: 6%;
    background: var(--border-soft);
    flex-shrink: 0;
  }
  .doc-line-2 { width: 60%; }
  .doc-line-4 { width: 45%; }
  .doc-label {
    font-size: 11.5px;
    font-weight: 600;
    text-align: center;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Skeleton loader */
  .skeleton-card, .skeleton-sheet, .skeleton-line {
    background: linear-gradient(
      100deg,
      var(--border-faint) 30%,
      var(--border-soft) 50%,
      var(--border-faint) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.3s ease-in-out infinite;
  }
  .skeleton-card {
    width: 100%;
    border-radius: 20px;
  }
  .skeleton-doc {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .skeleton-sheet {
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    border-radius: 14px;
  }
  .skeleton-line {
    width: 70%;
    height: 10px;
    border-radius: 6px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>