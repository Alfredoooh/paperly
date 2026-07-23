<!-- src/home/components/TemplatesSearchPage.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';

  export let view = 'images'; // 'images' | 'documents' — herda a view ativa do Templates
  export let onClose = () => {};
  export let onUsePrompt = () => {};
  export let visible = false; // controla animação de entrada/saída

  let query = '';
  let inputEl;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  $: pool = view === 'images' ? IMAGE_MODELS : DOC_MODELS;
  $: results = query.trim()
    ? pool.filter(item => normalize(item.label).includes(normalize(query)))
    : pool;

  function handleBack() {
    buzz();
    onClose();
  }

  function clearQuery() {
    buzz();
    query = '';
    inputEl?.focus();
  }

  let previewImg = null;
  let previewDoc = null;
  function openItem(item) {
    buzz();
    if (view === 'images') previewImg = item;
    else previewDoc = item;
  }
  function closePreview() {
    previewImg = null;
    previewDoc = null;
  }
  function useItem() {
    const item = previewImg || previewDoc;
    if (item) onUsePrompt(item.prompt);
    closePreview();
  }

  onMount(async () => {
    await tick();
    // foca o input assim que a página entra, sem disparar zoom indesejado no iOS
    requestAnimationFrame(() => inputEl?.focus());
  });

  onDestroy(() => {
    query = '';
  });
</script>

<div class="search-page" class:in={visible}>
  <header class="search-header">
    <button class="back-btn pulse-tap" on:click={handleBack} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_left.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_left.svg')"></span>
    </button>

    <div class="search-field">
      <span class="icon-mask search-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        inputmode="search"
        enterkeyhint="search"
        placeholder={view === 'images' ? 'Pesquisar modelos de imagem' : 'Pesquisar modelos de documento'}
        class="search-input"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if query}
        <button class="clear-btn pulse-tap" on:click={clearQuery} aria-label="Limpar pesquisa">
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/dismiss.svg');-webkit-mask-image:url('/icons/svg/regular/dismiss.svg')"></span>
        </button>
      {/if}
    </div>
  </header>

  <div class="search-body">
    {#if results.length === 0}
      <div class="empty-state">
        <span class="empty-icon-mask" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
        <p class="empty-title">Sem resultados</p>
        <p class="empty-sub">Tenta pesquisar por outro termo.</p>
      </div>
    {:else if view === 'images'}
      <div class="result-grid">
        {#each results as img (img.id)}
          <button class="img-result" on:click={() => openItem(img)}>
            <img src={img.thumb} alt={img.label} class="img-result-photo" loading="lazy" />
            <span class="img-result-overlay"></span>
            <span class="img-result-label">{img.label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="doc-result-list">
        {#each results as doc (doc.id)}
          <button class="doc-result" on:click={() => openItem(doc)}>
            <span class="doc-result-icon-wrap">
              <span class="doc-result-icon" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}')"></span>
            </span>
            <span class="doc-result-label">{doc.label}</span>
            <span class="doc-result-chevron" style="mask-image:url('/icons/svg/regular/chevron_right.svg');-webkit-mask-image:url('/icons/svg/regular/chevron_right.svg')"></span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if previewImg}
  <div class="preview-overlay" on:click={closePreview}>
    <div class="preview-content" on:click|stopPropagation>
      <img src={previewImg.thumb} alt={previewImg.label} class="preview-image" />
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closePreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useItem}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

{#if previewDoc}
  <div class="preview-overlay" on:click={closePreview}>
    <div class="preview-content" on:click|stopPropagation>
      <div class="preview-doc-sheet">
        <span class="preview-doc-icon" style="mask-image:url('{previewDoc.icon}');-webkit-mask-image:url('{previewDoc.icon}')"></span>
        <span class="preview-doc-label">{previewDoc.label}</span>
      </div>
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closePreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useItem}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .search-page {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    transform: translateX(100%);
    transition: transform .32s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }
  .search-page.in {
    transform: translateX(0);
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .back-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask {
    width: 18px;
    height: 18px;
  }

  .search-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--btn-bg);
    border-radius: 999px;
    padding: 0 12px;
    height: 40px;
  }
  .search-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.6;
  }
  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font: inherit;
    font-size: 15px;
    color: var(--icon-strong);
    padding: 0;
  }
  .search-input::placeholder {
    color: var(--text-faint);
  }
  .clear-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg-active);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }
  .clear-btn .icon-mask {
    width: 9px;
    height: 9px;
  }

  .icon-mask {
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .search-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding: 10px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 80px 24px 0;
    text-align: center;
  }
  .empty-icon-mask {
    width: 34px;
    height: 34px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    margin-bottom: 6px;
  }
  .empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--icon-strong);
    margin: 0;
  }
  .empty-sub {
    font-size: 13.5px;
    color: var(--text-faint);
    margin: 0;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .img-result {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 18px;
    overflow: hidden;
    background: var(--surface-apps-tab);
    box-shadow: 0 2px 10px var(--drawer-shadow);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .img-result:active { transform: scale(0.96); }
  .img-result-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .img-result-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
  }
  .img-result-label {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 9px;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    text-align: left;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-result-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .doc-result {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: none;
    background: transparent;
    padding: 12px 6px;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    border-bottom: 1px solid var(--border-faint);
    transition: background .16s ease;
  }
  .doc-result:active {
    background: var(--row-active);
  }
  .doc-result-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--surface-apps-tab);
    border: 1px solid var(--border-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .doc-result-icon {
    width: 18px;
    height: 18px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .doc-result-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doc-result-chevron {
    width: 14px;
    height: 14px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
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

  @media (prefers-reduced-motion: reduce) {
    .search-page { transition: none !important; }
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }
</style>