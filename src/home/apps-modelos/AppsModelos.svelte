<!-- src/home/apps-modelos/AppsModelos.svelte -->
<script>
  import { onMount, tick } from 'svelte';
  import { MODELS_TABS, DOC_MODELS, IMAGE_MODELS } from './lib/constants.js';

  export let onBack = () => {};
  export let platformApps = [];

  let modelsTab = 'docs';
  let pageVisible = false;

  let tabsWrapEl;
  let tabRefs = {};
  let indicatorX = 0;
  let indicatorWidth = 0;
  let indicatorReady = false;

  let bodyEl;
  let bodyInnerEl;

  // Preview
  let previewItem = null; // { type: 'image'|'doc', data: modelObject }

  // ---- Elastic scroll (mantido) ----
  let touchStartY = 0;
  let pullOriginY = null;
  let isPulling = false;

  function dampen(delta) {
    const sign = delta < 0 ? -1 : 1;
    const abs = Math.abs(delta);
    return sign * (abs * 0.6) / (1 + abs / 110);
  }
  function resetPull(animate = true) {
    isPulling = false; pullOriginY = null;
    if (bodyInnerEl) {
      bodyInnerEl.style.transition = animate ? 'transform .48s cubic-bezier(0.16,1.35,0.3,1)' : 'none';
      bodyInnerEl.style.transform = 'translateY(0px)';
    }
  }
  function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!bodyEl || !bodyInnerEl) return;
    const y = e.touches[0].clientY;
    const st = bodyEl.scrollTop, maxScroll = bodyEl.scrollHeight - bodyEl.clientHeight;
    const atTop = st <= 0, atBottom = st >= maxScroll - 1;
    const draggingDown = y - touchStartY > 0, draggingUp = y - touchStartY < 0;
    if ((atTop && draggingDown) || (atBottom && draggingUp)) {
      if (!isPulling) { isPulling = true; pullOriginY = y; bodyInnerEl.style.transition = 'none'; }
      const raw = y - pullOriginY;
      const valid = atTop ? Math.max(raw, 0) : Math.min(raw, 0);
      bodyInnerEl.style.transform = `translateY(${dampen(valid)}px)`;
      if (Math.abs(dampen(valid)) > 0.5) e.preventDefault();
    } else if (isPulling) { resetPull(false); }
  }
  function onTouchEnd() { if (isPulling) resetPull(true); }

  function goBack() {
    pageVisible = false;
    setTimeout(() => { onBack(); }, 200);
  }

  function goToAIWithPrompt(promptText) {
    try {
      sessionStorage.setItem('nexa_pending_message', promptText);
      sessionStorage.removeItem('nexa_pending_attachments');
    } catch (e) {}
    const ai = platformApps.find(x => x.id === 'ai');
    window.location.href = ai ? ai.path : '/ai';
  }

  // Funções de abertura do preview
  function openDocPreview(doc) {
    previewItem = { type: 'doc', data: doc };
  }
  function openImagePreview(img) {
    previewItem = { type: 'image', data: img };
  }

  function closePreview() {
    previewItem = null;
  }

  function useModel() {
    if (previewItem) {
      goToAIWithPrompt(previewItem.data.prompt);
    }
    closePreview();
  }

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    window.location.href = app.path;
  }

  // Indicador das tabs
  function updateIndicator() {
    const btn = tabRefs[modelsTab];
    if (!btn || !tabsWrapEl) return;
    const wrapRect = tabsWrapEl.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    indicatorX = btnRect.left - wrapRect.left;
    indicatorWidth = btnRect.width;
    indicatorReady = true;
  }
  function selectTab(id) {
    modelsTab = id;
  }

  // Colunas para imagens
  function splitColumns(items) {
    const left = [], right = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item); else right.push(item);
    });
    return [left, right];
  }
  $: imageColumns = splitColumns(IMAGE_MODELS);

  onMount(() => {
    requestAnimationFrame(() => { pageVisible = true; });
    tick().then(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  });

  $: if (modelsTab) {
    tick().then(updateIndicator);
    resetPull(false);
  }
</script>

<div class="am-root" class:am-in={pageVisible}>
  <div class="am-header">
    <button class="am-back" on:click={goBack} aria-label="Voltar">
      <span class="am-back-icon" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg')"></span>
    </button>
    <span class="am-title">Modelos &amp; Apps</span>
    <span class="am-header-spacer"></span>
  </div>

  <div class="am-body" bind:this={bodyEl}
    on:touchstart={onTouchStart}
    on:touchmove|nonpassive={onTouchMove}
    on:touchend={onTouchEnd}
    on:touchcancel={onTouchEnd}>
    <div class="am-body-inner" bind:this={bodyInnerEl}>
      {#if modelsTab === 'docs'}
        <div class="am-doc-grid">
          {#each DOC_MODELS as doc}
            <button class="am-doc-card" on:click={() => openDocPreview(doc)}>
              <div class="am-doc-sheet">
                <span class="am-doc-icon-mask" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}')"></span>
                <span class="am-doc-line am-doc-line-1"></span>
                <span class="am-doc-line am-doc-line-2"></span>
                <span class="am-doc-line am-doc-line-3"></span>
                <span class="am-doc-line am-doc-line-4"></span>
              </div>
              <span class="am-doc-label">{doc.label}</span>
            </button>
          {/each}
        </div>
      {:else if modelsTab === 'images'}
        <div class="am-masonry">
          {#each imageColumns as column, colIndex}
            <div class="am-masonry-col">
              {#each column as img}
                <button class="am-img-card" on:click={() => openImagePreview(img)}>
                  <img src={img.thumb} alt={img.label} class="am-img-card-photo" loading="lazy" />
                  <span class="am-img-card-overlay"></span>
                  <span class="am-img-card-label">{img.label}</span>
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {:else}
        <div class="am-apps-grid">
          {#each platformApps as app}
            <button class="am-app-item" on:click={() => openApp(app)}>
              <img src={app.icon} alt={app.label} class="am-app-icon-img" />
              <span class="am-app-label">{app.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="am-tabs" bind:this={tabsWrapEl}>
    <div class="am-tab-indicator" style="transform:translateX({indicatorX}px); width:{indicatorWidth}px; opacity:{indicatorReady ? 1 : 0};"></div>
    {#each MODELS_TABS as t}
      <button bind:this={tabRefs[t.id]} class="am-tab" class:am-tab-active={modelsTab === t.id} on:click={() => selectTab(t.id)}>
        {t.label}
      </button>
    {/each}
  </div>
</div>

{#if previewItem}
  <div class="preview-overlay" on:click={closePreview}>
    <div class="preview-content" on:click|stopPropagation>
      {#if previewItem.type === 'image'}
        <img src={previewItem.data.thumb} alt={previewItem.data.label} class="preview-image" />
      {:else}
        <div class="preview-doc-sheet">
          <span class="preview-doc-icon" style="mask-image:url('{previewItem.data.icon}');-webkit-mask-image:url('{previewItem.data.icon}')"></span>
          <span class="preview-doc-label">{previewItem.data.label}</span>
        </div>
      {/if}
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closePreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useModel}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .am-root {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--app-bg);
    color: var(--drawer-text);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
    overflow: hidden;
  }
  .am-root.am-in {
    opacity: 1;
    transform: translateY(0);
  }
  .am-root * {
    box-sizing: border-box;
  }

  .am-header {
    display: flex;
    align-items: center;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .am-back {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .am-back:active {
    transform: scale(0.92);
    background: var(--btn-bg-active);
  }
  .am-back-icon {
    width: 24px;
    height: 24px;
    background: var(--icon-strong);
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .am-title {
    flex: 1;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
  }
  .am-header-spacer {
    width: 40px;
  }

  .am-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }
  .am-body-inner {
    width: 100%;
    will-change: transform;
  }

  /* Apps grid */
  .am-apps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 8px;
    padding-top: 6px;
  }
  .am-app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
  }
  .am-app-icon-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .am-app-item:active .am-app-icon-img {
    transform: scale(0.88);
  }
  .am-app-label {
    font-size: 11.5px;
    font-weight: 600;
    text-align: center;
    line-height: 1.25;
    max-width: 68px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Imagens masonry */
  .am-masonry {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .am-masonry-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .am-img-card {
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
  .am-masonry-col:first-child .am-img-card:nth-child(3n+1) { aspect-ratio: 3 / 4; }
  .am-masonry-col:first-child .am-img-card:nth-child(3n+2) { aspect-ratio: 1 / 1; }
  .am-masonry-col:first-child .am-img-card:nth-child(3n+3) { aspect-ratio: 4 / 5; }
  .am-masonry-col:last-child .am-img-card:nth-child(3n+1) { aspect-ratio: 1 / 1; }
  .am-masonry-col:last-child .am-img-card:nth-child(3n+2) { aspect-ratio: 4 / 5; }
  .am-masonry-col:last-child .am-img-card:nth-child(3n+3) { aspect-ratio: 3 / 4; }

  .am-img-card:active {
    transform: scale(0.96);
  }
  .am-img-card-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .am-img-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
  }
  .am-img-card-label {
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

  /* Documentos */
  .am-doc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px 10px;
    padding-top: 6px;
  }
  .am-doc-card {
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
  .am-doc-sheet {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    background: var(--surface-apps-tab);
    border: 1px solid var(--border-soft);
    border-radius: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14% 12%;
    box-shadow: 0 1px 4px var(--drawer-shadow);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .am-doc-card:active .am-doc-sheet {
    transform: scale(0.94);
    background: var(--row-active);
  }
  .am-doc-icon-mask {
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
  .am-doc-line {
    display: block;
    width: 74%;
    height: 6%;
    border-radius: 0;
    background: var(--border-soft);
    flex-shrink: 0;
  }
  .am-doc-line-2 { width: 60%; }
  .am-doc-line-4 { width: 45%; }
  .am-doc-label {
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

  /* Tabs */
  .am-tabs {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
    z-index: 5;
    display: flex;
    gap: 6px;
    background: var(--hdr-seg-bg);
    border: 1px solid var(--border-soft);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: 4px;
    border-radius: 999px;
    box-shadow: 0 8px 24px var(--drawer-shadow);
  }
  .am-tab-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: 999px;
    background: light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.18));
    border: 1px solid light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.25));
    box-shadow: 0 2px 8px var(--drawer-shadow);
    transition: transform .32s cubic-bezier(0.34,1.2,0.4,1), width .32s cubic-bezier(0.34,1.2,0.4,1), opacity .2s ease;
    will-change: transform, width;
    pointer-events: none;
  }
  .am-tab {
    position: relative;
    z-index: 1;
    flex: 1;
    border: none;
    background: transparent;
    padding: 11px 6px;
    border-radius: 999px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
    cursor: pointer;
    transition: color .22s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .am-tab:active {
    transform: scale(0.96);
  }
  .am-tab-active {
    color: var(--drawer-text);
  }

  /* Preview overlay */
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
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

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

  .preview-actions {
    display: flex;
    gap: 12px;
    width: 100%;
  }
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
  .preview-btn:active {
    transform: scale(0.96);
    opacity: 0.8;
  }
  .preview-btn-cancel {
    background: light-dark(rgba(255,255,255,0.2), rgba(0,0,0,0.6));
    color: light-dark(#fff, #fff);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .preview-btn-use {
    background: light-dark(#2a2a2a, #f5f5f5);
    color: light-dark(#ffffff, #1a1a1a);
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
</style>