<!-- src/home/components/TemplatesTab.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';
  import { createBackRecoilTransition } from '../lib/nav-transition.js';

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
  // Rubber-band / pull-to-refresh via spring (rAF), não CSS transition.
  // Reaproveita o mesmo motor físico do nav-transition.js: durante o
  // arrasto o dedo controla o valor 1:1 (setDragValue), no release o
  // spring assenta de volta a 0 (releaseDragTo). Isto elimina o mesmo
  // tipo de conflito "transition vs. gesto" que causava o congelamento
  // no preview — aqui aplicado ao puxar/soltar do grid.
  // ------------------------------------------------------------------
  const recoil = createBackRecoilTransition();
  let pull = 0; // px, derivado do valor 0..1 do spring
  const MAX_PULL = 64;
  const unsubscribeRecoil = recoil.subscribe((v) => { pull = v * MAX_PULL; });

  let scrollEl;
  let dragging = false;
  let startY = 0;
  let rawPull = 0; // -1..1, direção e magnitude normalizada do gesto

  function onPointerDown(e) {
    if (!scrollEl) return;
    dragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
  }
  function onPointerMove(e) {
    if (!dragging || !scrollEl) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - startY;
    const atTop = scrollEl.scrollTop <= 0;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;

    if (atTop && delta > 0) {
      rawPull = Math.min(1, (delta * 0.42) / MAX_PULL);
    } else if (atBottom && delta < 0) {
      rawPull = Math.max(-1, (delta * 0.42) / MAX_PULL);
    } else {
      rawPull = 0;
    }
    recoil.setDragValue(rawPull);
  }
  function onPointerUp() {
    dragging = false;
    rawPull = 0;
    recoil.releaseDragTo('reset');
  }

  onMount(() => {
    const t = setTimeout(() => { loading = false; }, 700);
    return () => clearTimeout(t);
  });
  onDestroy(() => {
    unsubscribeRecoil();
    recoil.destroy();
  });
</script>

<div
  class="templates-tab"
  bind:this={scrollEl}
  style="transform: translateY({pull}px);"
  on:touchstart={onPointerDown}
  on:touchmove={onPointerMove}
  on:touchend={onPointerUp}
  on:touchcancel={onPointerUp}
  on:mousedown={onPointerDown}
  on:mousemove={onPointerMove}
  on:mouseup={onPointerUp}
  on:mouseleave={onPointerUp}
>
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
            <button class="img-card" on:click={() => openImgPreview(img)}>
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
        <button class="doc-card" on:click={() => openDocPreview(doc)}>
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

<style>
  .templates-tab {
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
  }
  .masonry-col:first-child .img-card:nth-child(3n+1) { aspect-ratio: 3 / 4; }
  .masonry-col:first-child .img-card:nth-child(3n+2) { aspect-ratio: 1 / 1; }
  .masonry-col:first-child .img-card:nth-child(3n+3) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+1) { aspect-ratio: 1 / 1; }
  .masonry-col:last-child .img-card:nth-child(3n+2) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+3) { aspect-ratio: 3 / 4; }
  .img-card:active { transform: scale(0.96); }
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