<!-- src/home/components/CreateTab.svelte -->
<script>
  export let platformApps = [];
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    onOpenApp(app);
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  function handleOpenSearch() {
    buzz();
    onOpenSearch();
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

  <div class="hero-bg" style="background-image:url('/images/createbg/img.jpg')">
    <div class="hero-bg-fade"></div>
  </div>

  <div bind:this={bodyInnerEl}>

    <button class="search-bar pulse-tap" on:click={handleOpenSearch}>
      <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
      <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
    </button>

    <div class="hero-spacer"></div>

    <div class="apps-grid">
      {#each platformApps as app}
        <button class="app-item" on:click={() => openApp(app)}>
          <span class="app-icon-wrap">
            <span class="app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}')"></span>
          </span>
          <span class="app-label">{app.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .create-tab {
    position: relative;
    width: 100%;
    padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 96px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* Fundo azul estilo CapCut, fixo no topo do tab, com fade suave
     para o fundo normal do ecrã por baixo do conteúdo. */
  .hero-bg {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 340px;
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    z-index: 0;
    pointer-events: none;
  }
  .hero-bg-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,0) 55%,
      var(--bg) 100%
    );
  }

  .create-tab > div {
    position: relative;
    z-index: 1;
    padding: 4px 14px 0;
  }

  .hero-spacer {
    height: 190px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 48px;
    margin-top: 6px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: rgba(255,255,255,0.94);
    box-shadow: 0 4px 18px rgba(0,0,0,0.16);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .search-bar-icon {
    width: 18px;
    height: 18px;
    background: #6b6f76;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
    opacity: 0.7;
  }
  .search-bar-placeholder {
    font-size: 14.5px;
    font-weight: 500;
    color: #6b6f76;
  }

  .apps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 8px;
    padding-top: 4px;
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
  .app-icon-wrap {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-icon-svg {
    width: 100%;
    height: 100%;
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .app-item:active .app-icon-wrap {
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
</style>