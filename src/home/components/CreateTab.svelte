<!-- src/home/components/CreateTab.svelte -->
<script>
  import { tick } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';

  export let platformApps = [];

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    window.location.href = app.path;
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════
  // Tela de pesquisa fullscreen (slide-up, mesmo padrão do Perfil)
  // ══════════════════════════════════════════════════════════
  let showSearch = false;
  let searchVisible = false;
  let searchQuery = '';
  let searchInputEl;

  // fonte de pesquisa: apps, projetos (templates de imagem/doc por agora)
  $: searchPool = [
    ...platformApps.map(a => ({ id: `app-${a.id}`, type: 'App', label: a.label, action: () => openApp(a) })),
    ...IMAGE_MODELS.map(m => ({ id: m.id, type: 'Modelo de imagem', label: m.label, action: () => {} })),
    ...DOC_MODELS.map(m => ({ id: m.id, type: 'Modelo de documento', label: m.label, action: () => {} })),
  ];

  $: results = searchQuery.trim().length === 0
    ? []
    : searchPool.filter(r => r.label.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  async function openSearch() {
    buzz();
    showSearch = true;
    searchVisible = false;
    await tick();
    requestAnimationFrame(() => {
      searchVisible = true;
      searchInputEl?.focus();
    });
  }
  function closeSearch() {
    buzz();
    searchVisible = false;
    searchQuery = '';
    setTimeout(() => { showSearch = false; }, 280);
  }
  function pickResult(r) {
    buzz();
    r.action?.();
    closeSearch();
  }

  // rubber-band scroll (mesma técnica usada no ecrã de Perfil)
  let bodyEl, bodyInnerEl;
  let touchStartY = 0, pullOriginY = null, isPulling = false;

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
</script>

<div class="create-tab" bind:this={bodyEl}
  on:touchstart={onTouchStart}
  on:touchmove|nonpassive={onTouchMove}
  on:touchend={onTouchEnd}
  on:touchcancel={onTouchEnd}>
  <div bind:this={bodyInnerEl}>

    <button class="search-bar pulse-tap" on:click={openSearch}>
      <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
      <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
    </button>

    <div class="apps-grid">
      {#each platformApps as app}
        <button class="app-item" on:click={() => openApp(app)}>
          <img src={app.icon} alt={app.label} class="app-icon-img" />
          <span class="app-label">{app.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

{#if showSearch}
  <div class="search-screen" class:search-in={searchVisible}>
    <div class="search-header">
      <div class="search-input-wrap">
        <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
        <input
          bind:this={searchInputEl}
          bind:value={searchQuery}
          class="search-input"
          type="text"
          placeholder="Pesquisar designs, projetos, modelos…"
          enterkeyhint="search"
        />
        {#if searchQuery}
          <button class="search-clear" on:click={() => (searchQuery = '')} aria-label="Limpar">
            <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg')"></span>
          </button>
        {/if}
      </div>
      <button class="search-cancel" on:click={closeSearch}>Cancelar</button>
    </div>

    <div class="search-body">
      {#if searchQuery.trim().length === 0}
        <div class="search-empty">
          <span class="icon-mask search-empty-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
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
  .create-tab {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* ── Search bar (entry point) ─────────────────────────────── */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin-top: 6px;
    padding: 12px 14px;
    border: none;
    border-radius: 14px;
    background: var(--btn-bg);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .search-bar-icon {
    width: 17px;
    height: 17px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
  }
  .search-bar-placeholder {
    font-size: 14.5px;
    font-weight: 500;
    color: var(--text-faint);
  }

  .apps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 8px;
    padding-top: 20px;
  }
  .app-item {
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
  .app-icon-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-item:active .app-icon-img {
    transform: scale(0.88);
  }
  .app-label {
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

  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    background: var(--icon-strong);
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.98); opacity: .85; }

  /* ── Tela de pesquisa fullscreen (slide-up nativo) ─────────── */
  .search-screen {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    opacity: 0;
    transform: translateY(100%);
    transition: opacity .26s cubic-bezier(0.16,1,0.3,1), transform .34s cubic-bezier(0.22,1.42,0.36,1);
  }
  .search-screen.search-in {
    opacity: 1;
    transform: translateY(0);
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .search-input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--btn-bg);
    border-radius: 12px;
    padding: 10px 12px;
    min-width: 0;
  }
  .search-input-wrap .icon-mask {
    width: 16px;
    height: 16px;
    background: var(--icon-faint);
    flex-shrink: 0;
  }
  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 15px;
    color: var(--icon-strong);
  }
  .search-input::placeholder { color: var(--text-faint); }
  .search-clear {
    border: none;
    background: transparent;
    padding: 2px;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .search-clear:active { transform: scale(0.8); }
  .search-clear .icon-mask {
    width: 14px;
    height: 14px;
    background: var(--icon-faint);
  }
  .search-cancel {
    border: none;
    background: transparent;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    color: var(--icon-strong);
    cursor: pointer;
    flex-shrink: 0;
    padding: 4px 2px;
    transition: opacity .16s;
  }
  .search-cancel:active { opacity: .5; }

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
    background: var(--icon-faint);
    margin-bottom: 6px;
  }
  .search-empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    margin: 0;
  }
  .search-empty-sub {
    font-size: 13.5px;
    color: var(--text-faint);
    margin: 0;
    max-width: 260px;
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
    border-bottom: 1px solid var(--border-faint);
    border-top: none;
    border-left: none;
    border-right: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: opacity .14s, background .14s;
  }
  .search-result-row:active {
    opacity: .6;
    background: var(--row-active);
  }
  .search-result-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--drawer-text);
  }
  .search-result-type {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-faint);
  }

  @media (prefers-reduced-motion: reduce) {
    .search-screen { transition: none !important; }
  }
</style>