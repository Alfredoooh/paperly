<!-- src/home/components/TemplatesTab.svelte -->
<script>
  import { onMount } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';

  export let view = 'images'; // 'images' | 'documents' — controlado pelo toggle do appbar
  export let onUsePrompt = () => {};

  let previewImg = null;
  let previewDoc = null;
  let loading = true;

  function splitColumns(items) {
    const left = [], right = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item); else right.push(item);
    });
    return [left, right];
  }
  $: imageColumns = splitColumns(IMAGE_MODELS);

  function openImgPreview(img) { previewImg = img; }
  function closeImgPreview() { previewImg = null; }
  function useImgModel() {
    if (previewImg) onUsePrompt(previewImg.prompt);
    closeImgPreview();
  }

  function openDocPreview(doc) { previewDoc = doc; }
  function closeDocPreview() { previewDoc = null; }
  function useDocModel() {
    if (previewDoc) onUsePrompt(previewDoc.prompt);
    closeDocPreview();
  }

  // Elastic / rubber-band scroll nativo dentro do próprio grid
  let scrollEl;
  let dragging = false;
  let startY = 0;
  let startScrollTop = 0;
  let pull = 0; // 0 -> sem esticar, >0 esticado

  function onPointerDown(e) {
    if (!scrollEl) return;
    dragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startScrollTop = scrollEl.scrollTop;
  }
  function onPointerMove(e) {
    if (!dragging || !scrollEl) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - startY;
    const atTop = scrollEl.scrollTop <= 0;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;

    if (atTop && delta > 0) {
      pull = Math.min(64, delta * 0.42);
    } else if (atBottom && delta < 0) {
      pull = Math.max(-64, delta * 0.42);
    } else {
      pull = 0;
    }
  }
  function onPointerUp() {
    dragging = false;
    pull = 0;
  }

  onMount(() => {
    const t = setTimeout(() => { loading = false; }, 700);
    return () => clearTimeout(t);
  });
</script>

<div
  class="templates-tab"
  bind:this={scrollEl}
  style="transform: translateY({pull}px); transition: {dragging ? 'none' : 'transform .5s cubic-bezier(0.22,1.42,0.36,1)'}"
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

{#if previewImg}
  <div class="preview-overlay" on:click={closeImgPreview}>
    <div class="preview-content" on:click|stopPropagation>
      <img src={previewImg.thumb} alt={previewImg.label} class="preview-image" />
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closeImgPreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useImgModel}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

{#if previewDoc}
  <div class="preview-overlay" on:click={closeDocPreview}>
    <div class="preview-content" on:click|stopPropagation>
      <div class="preview-doc-sheet">
        <span class="preview-doc-icon" style="mask-image:url('{previewDoc.icon}');-webkit-mask-image:url('{previewDoc.icon}')"></span>
        <span class="preview-doc-label">{previewDoc.label}</span>
      </div>
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closeDocPreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useDocModel}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

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

  .preview-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .preview-content {
    max-width: 340px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    animation: scaleUp .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes scaleUp {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .preview-image {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .preview-doc-sheet {
    background: var(--surface-apps-tab);
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .preview-doc-icon {
    width: 80px;
    height: 80px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .preview-doc-label {
    font-size: 18px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
  }
  .preview-actions { display: flex; gap: 12px; width: 100%; }
  .preview-btn {
    flex: 1;
    padding: 14px 10px;
    border-radius: 999px;
    border: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s;
  }
  .preview-btn:active { transform: scale(0.96); opacity: 0.8; }
  .preview-btn-cancel {
    background: rgba(0,0,0,0.6);
    color: #fff;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .preview-btn-use {
    background: var(--btn-solid-bg);
    color: var(--btn-solid-text);
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
</style>