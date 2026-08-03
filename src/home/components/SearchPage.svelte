<!-- src/home/components/SearchPage.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';

  export let pushed = false;
  export let origin = null;
  export let platformApps = [];
  export let imageModels = [];
  export let onOpenApp = () => {};
  export let docModels = [];
  export let onUsePrompt = () => {};
  export let onClose = () => {};

  let query = '';
  let inputEl;
  let bodyEl;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  $: searchPool = [
    ...platformApps.map(a => ({ id: `app-${a.id}`, type: 'App', label: a.label, action: () => openApp(a) })),
    ...imageModels.map(m => ({ id: m.id, type: 'Modelo de imagem', label: m.label, action: () => onUsePrompt(m.prompt) })),
    ...docModels.map(m => ({ id: m.id, type: 'Modelo de documento', label: m.label, action: () => onUsePrompt(m.prompt) })),
  ];

  $: results = query.trim().length === 0
    ? []
    : searchPool.filter(r => normalize(r.label).includes(normalize(query)));

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    onOpenApp(app);
  }

  function pickResult(r) {
    buzz();
    r.action?.();
  }

  function clearQuery() {
    buzz();
    query = '';
    inputEl?.focus();
  }

  function handleClose() {
    buzz();
    onClose();
  }

  const slide = createSlideTransition({});
  let slideX = 100;
  const unsubscribeSlide = slide.subscribe((v) => { slideX = v; });

  let lastPushed = null;
  $: if (pushed !== lastPushed) {
    lastPushed = pushed;
    if (!origin) {
      if (pushed) slide.open();
      else slide.close();
    }
  }

  let transformVisible = false;
  $: if (origin) {
    if (pushed && !transformVisible) {
      requestAnimationFrame(() => requestAnimationFrame(() => { transformVisible = true; }));
    } else if (!pushed && transformVisible) {
      transformVisible = false;
    }
  }

  $: containerStyle = origin
    ? (transformVisible
        ? 'top:0; left:0; width:100vw; height:100dvh; border-radius:0;'
        : `top:${origin.top}px; left:${origin.left}px; width:${origin.width}px; height:${origin.height}px; border-radius:999px;`)
    : '';

  let searchFieldHidden = false;
  function handleBodyScroll() {
    if (!bodyEl) return;
    searchFieldHidden = bodyEl.scrollTop > 0;
  }

  onDestroy(() => { unsubscribeSlide(); slide.destroy(); });

  onMount(() => {
    setTimeout(() => inputEl?.focus(), 340);
  });
</script>

{#if origin}
  <div class="search-page search-page-transform" style={containerStyle}>
    <header class="search-header" class:hidden={searchFieldHidden}>
      <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
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
          placeholder="Pesquisar designs, projetos, modelos…"
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

    <div class="search-body" bind:this={bodyEl} on:scroll={handleBodyScroll}>
      {#if query.trim().length === 0}
        <div class="search-empty">
          <span class="icon-mask search-empty-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
          <p class="search-empty-title">Pesquisa em toda a Nexa</p>
          <p class="search-empty-sub">Designs, projetos e modelos, tudo num só sítio.</p>
        </div>
      {:else if results.length === 0}
        <div class="search-empty">
          <p class="search-empty-title">Sem resultados</p>
          <p class="search-empty-sub">Tenta outro termo de pesquisa.</p>
        </div>
      {:else}
        <div class="search-results">
          {#each results as r (r.id)}
            <button class="search-result-row" on:click={() => pickResult(r)}>
              <span class="search-result-label">{r.label}</span>
              <span class="search-result-type">{r.type}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{:else}
  <div class="search-page" style="transform: translate3d({slideX}%, 0, 0);">
    <header class="search-header" class:hidden={searchFieldHidden}>
      <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
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
          placeholder="Pesquisar designs, projetos, modelos…"
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

    <div class="search-body" bind:this={bodyEl} on:scroll={handleBodyScroll}>
      {#if query.trim().length === 0}
        <div class="search-empty">
          <span class="icon-mask search-empty-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
          <p class="search-empty-title">Pesquisa em toda a Nexa</p>
          <p class="search-empty-sub">Designs, projetos e modelos, tudo num só sítio.</p>
        </div>
      {:else if results.length === 0}
        <div class="search-empty">
          <p class="search-empty-title">Sem resultados</p>
          <p class="search-empty-sub">Tenta outro termo de pesquisa.</p>
        </div>
      {:else}
        <div class="search-results">
          {#each results as r (r.id)}
            <button class="search-result-row" on:click={() => pickResult(r)}>
              <span class="search-result-label">{r.label}</span>
              <span class="search-result-type">{r.type}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: #FAFAFA;
    will-change: transform;
    box-shadow: -6px 0 24px rgba(0,0,0,0.18);
  }
  :global([data-theme="dark"]) .search-page {
    background: #242424;
  }

  .search-page-transform {
    position: fixed;
    overflow: hidden;
    transition: top .38s cubic-bezier(0.32, 0.72, 0, 1),
                left .38s cubic-bezier(0.32, 0.72, 0, 1),
                width .38s cubic-bezier(0.32, 0.72, 0, 1),
                height .38s cubic-bezier(0.32, 0.72, 0, 1),
                border-radius .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: top, left, width, height, border-radius;
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
    opacity: 1;
    transform: translateY(0);
    transition: opacity .22s cubic-bezier(0.32, 0.72, 0, 1), transform .22s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .search-header.hidden {
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
  }

  .back-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: rgba(26,26,26,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  :global([data-theme="dark"]) .back-btn {
    background: rgba(242,242,242,0.10);
  }
  .back-btn:active {
    background: rgba(26,26,26,0.11);
    transform: scale(0.88);
  }
  :global([data-theme="dark"]) .back-btn:active {
    background: rgba(242,242,242,0.18);
  }
  .back-btn .icon-mask {
    width: 26px;
    height: 26px;
  }

  .search-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(26,26,26,0.06);
    border-radius: 999px;
    padding: 0 16px;
    height: 48px;
  }
  :global([data-theme="dark"]) .search-field {
    background: rgba(242,242,242,0.10);
  }
  .search-icon {
    width: 18px;
    height: 18px;
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
    font-size: 16.5px;
    color: rgba(26,26,26,0.85);
    padding: 0;
  }
  :global([data-theme="dark"]) .search-input {
    color: rgba(242,242,242,0.88);
  }
  .search-input::placeholder {
    color: rgba(26,26,26,0.40);
  }
  :global([data-theme="dark"]) .search-input::placeholder {
    color: rgba(242,242,242,0.38);
  }
  .clear-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: rgba(26,26,26,0.11);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }
  :global([data-theme="dark"]) .clear-btn {
    background: rgba(242,242,242,0.18);
  }
  .clear-btn .icon-mask {
    width: 10px;
    height: 10px;
  }

  .icon-mask {
    display: block;
    background: rgba(26,26,26,0.85);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  :global([data-theme="dark"]) .icon-mask {
    background: rgba(242,242,242,0.88);
  }

  .search-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 24px);
  }

  .search-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 18vh 24px 0;
    gap: 8px;
  }
  .search-empty-icon {
    width: 40px;
    height: 40px;
    background: rgba(26,26,26,0.28);
    margin-bottom: 6px;
  }
  :global([data-theme="dark"]) .search-empty-icon {
    background: rgba(242,242,242,0.30);
  }
  .search-empty-title {
    font-size: 16px;
    font-weight: 700;
    color: rgba(26,26,26,0.94);
    margin: 0;
  }
  :global([data-theme="dark"]) .search-empty-title {
    color: rgba(242,242,242,0.86);
  }
  .search-empty-sub {
    font-size: 13.5px;
    color: rgba(26,26,26,0.40);
    margin: 0;
    max-width: 260px;
  }
  :global([data-theme="dark"]) .search-empty-sub {
    color: rgba(242,242,242,0.38);
  }

  .search-results {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }
  .search-result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 4px;
    border-bottom: 1px solid rgba(26,26,26,0.07);
    border-top: none;
    border-left: none;
    border-right: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: opacity .14s, background .14s;
  }
  :global([data-theme="dark"]) .search-result-row {
    border-bottom-color: rgba(242,242,242,0.09);
  }
  .search-result-row:active {
    opacity: .6;
    background: rgba(26,26,26,0.05);
  }
  :global([data-theme="dark"]) .search-result-row:active {
    background: rgba(242,242,242,0.07);
  }
  .search-result-label {
    font-size: 15px;
    font-weight: 600;
    color: rgba(26,26,26,0.94);
  }
  :global([data-theme="dark"]) .search-result-label {
    color: rgba(242,242,242,0.86);
  }
  .search-result-type {
    font-size: 12px;
    font-weight: 500;
    color: rgba(26,26,26,0.40);
  }
  :global([data-theme="dark"]) .search-result-type {
    color: rgba(242,242,242,0.38);
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .search-page, .search-page-transform, .search-header { transition: none !important; }
  }
</style>