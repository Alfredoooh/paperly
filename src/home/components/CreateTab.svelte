<!-- src/home/components/CreateTab.svelte -->
<script>
  export let platformApps = [];
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};
  
  // 0 → 1: progresso do scroll ao longo da altura da imagem de topo.
  // Vem do App.svelte, calculado a partir do scroll REAL (.scroll-root
  // do App.svelte). Usado tanto para o fade final da imagem para o
  // fundo do tema, como para o appbar (via heroOpacity no AppHeader).
  export let heroProgress = 0;
  
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
</script>

<div class="create-tab">
  
  <div class="hero-bg">
    <!-- Camada 1: a foto em si -->
    <div class="hero-photo" style="background-image:url('/images/createbg/img.jpg')"></div>
    <!-- Camada 2: gradiente ESTÁTICO (não depende do scroll) — mais
         transparente no topo (perto do appbar/relógio), mais sólido
         em baixo (perto da search bar/apps), tal como no CapCut. -->
    <div class="hero-static-fade"></div>
    <!-- Camada 3: cobre a imagem por completo conforme o utilizador
         desliza para cima — ESTA sim depende do scroll (heroProgress) -->
    <div class="hero-scroll-solid" style="opacity:{heroProgress}"></div>
  </div>
  
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

<style>
  .create-tab {
    width: 100%;
  }

  /* Imagem puramente decorativa no topo do tab. Fica dentro do fluxo
     normal do documento — não tem position:absolute no próprio bloco,
     não tem overflow próprio. O scroll real é feito pelo .scroll-root
     do App.svelte, exatamente como nos outros tabs. */
  .hero-bg {
    position: relative;
    width: 100%;
    height: 260px;
    overflow: hidden;
  }

  .hero-photo {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* Gradiente ESTÁTICO e sempre presente: topo mais transparente
     (deixa a imagem "pura" aparecer perto do appbar), base mais
     sólida (funde suavemente com o fundo do tema logo antes da search
     bar) — é o "estilo" fixo da imagem, igual em repouso e não reage
     ao scroll. var(--app-bg) já é branco no claro e escuro no dark. */
  .hero-static-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      transparent 35%,
      color-mix(in srgb, var(--app-bg) 55%, transparent) 82%,
      var(--app-bg) 100%
    );
    pointer-events: none;
  }

  /* Cobre a imagem por completo, incluindo a parte de cima que o
     gradiente estático deixava visível — SÓ conforme o utilizador
     desliza para cima. heroProgress vem do scroll real (App.svelte). */
  .hero-scroll-solid {
    position: absolute;
    inset: 0;
    background: var(--app-bg);
    pointer-events: none;
    transition: opacity .05s linear;
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