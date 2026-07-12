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
  <div bind:this={bodyInnerEl}>

    <div class="hero-bg" style="background-image:url('/images/createbg/img.jpg')"></div>

    <button class="search-bar pulse-tap" on:click={handleOpenSearch}>
      <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
      <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
    </button>

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
    width: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* Imagem de fundo puramente decorativa, no topo do tab, por trás
     do appbar transparente (ver AppHeader) — segue o fluxo normal do
     documento, tal como qualquer outro bloco. Sem position:absolute
     e sem alturas inventadas: é só um bloco com background-image. */
  .hero-bg {
    width: 100%;
    height: 260px;
    margin-top: calc(-1 * (env(safe-area-inset-top, 0px) + 84px));
    padding-top: calc(env(safe-area-inset-top, 0px) + 84px);
    box-sizing: border-box;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(100% - 28px);
    height: 48px;
    margin: -24px 14px 0;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: var(--btn-bg);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    z-index: 1;
  }
  .search-bar-icon {
    width: 18px;
    height: 18px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
    opacity: 0.6;
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
    padding: 20px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
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