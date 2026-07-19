<!-- src/home/components/CreateTab.svelte -->
<!-- Tem o SEU PRÓPRIO header, fixo e sempre transparente/branco.
     Não usa AppHeader — este tab é o único caso especial. -->
<script>
  export let platformApps = [];
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};

  export let heroProgress = 0;
  export let isDark = false;

  // dados do header próprio (antes vinham via AppHeader)
  export let mounted = false;
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let title = '';
  export let onOpenDrawer = () => {};

  // Imagem do hero conforme o tema — clara usa img.jpg, escura usa
  // img_dark.jpg, ambas na mesma pasta /images/createbg/.
  $: heroImage = isDark ? '/images/createbg/img_dark.jpg' : '/images/createbg/img.jpg';

  // Cor do texto da saudação conforme o tema — no escuro fica branco
  // (como sempre foi), no claro fica escuro, já que a img.jpg clara
  // não tem contraste suficiente para texto branco no topo do hero.
  $: heroTextColor = isDark ? '#fff' : '#111111';
  $: heroTextShadow = isDark
    ? '0 2px 14px rgba(0,0,0,0.5)'
    : '0 1px 3px rgba(255,255,255,0.6)';

  // Saudação rotativa: escolhida UMA vez ao montar. O nome fica numa
  // linha própria, sempre com exclamação.
  const GREETINGS_MANHA = [
    'O que deseja criar esta manhã?',
    'Pronto para criar algo novo?',
    'Uma nova manhã, uma nova ideia.',
    'Vamos começar o dia a criar?',
    'Que tal criar algo esta manhã?',
  ];
  const GREETINGS_TARDE = [
    'O que deseja criar esta tarde?',
    'O que vamos criar?',
    'Estás pronto para a próxima criação?',
    'Uma tarde perfeita para criar.',
    'Que ideia vamos dar vida esta tarde?',
  ];
  const GREETINGS_NOITE = [
    'O que deseja criar esta noite?',
    'Ainda com energia para criar?',
    'A noite é uma boa altura para criar.',
    'Estás pronto para a próxima criação?',
    'Que tal terminar o dia a criar algo?',
  ];
  const GREETINGS_MADRUGADA = [
    'A criar até tarde? Vamos a isso.',
    'Uma ideia não espera pela manhã.',
    'Estás pronto para a próxima criação?',
    'Silêncio lá fora, ideias aqui dentro.',
  ];

  function pickGreeting() {
    const h = new Date().getHours();
    let pool;
    if (h >= 5 && h < 12) pool = GREETINGS_MANHA;
    else if (h >= 12 && h < 18) pool = GREETINGS_TARDE;
    else if (h >= 18 && h < 24) pool = GREETINGS_NOITE;
    else pool = GREETINGS_MADRUGADA;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const greetingText = pickGreeting();

  // O título SÓ existe visualmente quando o header está sólido.
  const SOLID_THRESHOLD = 0.5;
  $: isSolid = heroProgress >= SOLID_THRESHOLD;

  // A search-bar some ao rolar — só reaparece quando volta ao topo
  // absoluto (heroProgress === 0), nunca a meio do scroll para cima,
  // conforme decidido: "só reaparece no topo".
  $: searchBarHidden = heroProgress > 0;

  function openApp(app) {
    try { navigator.vibrate && navigator.vibrate(7); } catch (e) {}
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    onOpenApp(app);
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  // ────────────────────────────────────────────────────────────────
  // Clique na search-bar: mede o rect EXATO do botão no momento do
  // clique (igual a openAvatarViewer em MainPage.svelte do profile) e
  // passa-o ao App.svelte via onOpenSearch(origin) — é esse rect que
  // o SearchPage usa como ponto de partida do container transform.
  // ────────────────────────────────────────────────────────────────
  let searchBarEl;
  function handleOpenSearch() {
    buzz();
    if (searchBarEl) {
      const r = searchBarEl.getBoundingClientRect();
      onOpenSearch({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      onOpenSearch(null);
    }
  }

  function handleMenu() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    if (window.AndroidDrawer && typeof window.AndroidDrawer.openAccountDrawer === 'function') {
      window.AndroidDrawer.openAccountDrawer();
    } else {
      onOpenDrawer?.();
    }
  }
</script>

<!-- Header próprio do Create: no topo NÃO tem título nenhum (só o
     avatar). O título "Criar" só aparece quando o header fica sólido
     com o scroll — sólido = idêntico ao fundo do app, sem linha
     divisória, sem sombra, nos dois temas. -->
<div class="create-header" class:in={mounted} class:solid={isSolid}>
  <div class="create-header-inner">
    <h1 class="create-header-title" class:visible={isSolid}>{isSolid ? title : ''}</h1>
    <button class="profile-btn pulse-tap" class:solid={isSolid} on:click={handleMenu} aria-label="Perfil">
      {#if avatarUrl}
        <img src={avatarUrl} alt={userName} class="profile-img" />
      {:else}
        <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
      {/if}
    </button>
  </div>
</div>

<div class="create-tab">

  <div class="hero-bg">
    <!-- Camada 1: a foto em si — troca conforme o tema -->
    <div class="hero-photo" style="background-image:url('{heroImage}')"></div>
    <!-- Camada 2: gradiente ESTÁTICO, suave — a foto respira mais. -->
    <div class="hero-static-fade"></div>
    <!-- Camada 3: cobre a imagem por completo conforme o utilizador
         desliza para cima — ESTA sim depende do scroll (heroProgress) -->
    <div class="hero-scroll-solid" style="opacity:{heroProgress}"></div>

    <!-- Bloco de saudação: nome + frase, ambos na fonte importada.
         Cor adapta-se ao tema via CSS vars. -->
    <div
      class="hero-greeting-block"
      style="opacity:{1 - heroProgress}; --hero-text-color:{heroTextColor}; --hero-text-shadow:{heroTextShadow};"
    >
      <p class="hero-greeting-name">{userName}!</p>
      <p class="hero-greeting-text">{greetingText}</p>
    </div>
  </div>

  <button
    class="search-bar pulse-tap"
    class:search-bar-hidden={searchBarHidden}
    bind:this={searchBarEl}
    on:click={handleOpenSearch}
  >
    <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
    <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
  </button>

  <div class="apps-grid">
    {#each platformApps as app}
      <button class="app-item native-tap" on:click={() => openApp(app)}>
        <span class="app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}')"></span>
        <span class="app-label">{app.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  @font-face {
    font-family: 'BeautyDisplay';
    src: url('/fonts/beauty/font_1.ttf') format('truetype');
    font-weight: 400 800;
    font-style: normal;
    font-display: swap;
  }

  /* ---------- Header próprio do Create ---------- */
  .create-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 15;
    height: calc(env(safe-area-inset-top, 0px) + 56px);
    background: transparent;
    opacity: 0;
    transform: translateY(-16px) translateZ(0);
    transition:
      opacity .42s cubic-bezier(0.32, 0.72, 0, 1),
      transform .42s cubic-bezier(0.32, 0.72, 0, 1),
      background .28s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
    overflow: hidden;
  }
  .create-header.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .create-header.solid {
    background: var(--app-bg);
  }
  .create-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    height: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: env(safe-area-inset-top, 0px) 16px 0;
  }
  .create-header-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: var(--drawer-text);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0;
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .create-header-title.visible {
    opacity: 1;
  }
  .profile-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    transition:
      background .28s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow .28s cubic-bezier(0.32, 0.72, 0, 1),
      transform .16s cubic-bezier(0.34,1.56,0.64,1);
    margin-left: auto;
  }
  .profile-btn.solid {
    background: var(--row-active, rgba(127,127,127,0.12));
    box-shadow: none;
  }
  .profile-btn:active {
    transform: scale(0.9);
  }
  .profile-btn:not(.solid):active {
    background: rgba(255,255,255,0.26);
  }
  .profile-btn.solid:active {
    background: var(--row-hover, rgba(127,127,127,0.2));
  }
  .profile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .profile-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  @media (hover:hover) and (pointer:fine) {
    .profile-btn:not(.solid):hover { background: rgba(255,255,255,0.24); }
    .profile-btn.solid:hover { background: var(--row-hover, rgba(127,127,127,0.2)); }
  }
  @media (min-width: 720px) {
    .create-header-inner { max-width:760px; }
  }

  /* ---------- Conteúdo do Create ---------- */
  .create-tab {
    width: 100%;
  }

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
    transition: background-image .2s linear;
  }

  .hero-static-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      transparent 55%,
      color-mix(in srgb, var(--app-bg) 35%, transparent) 88%,
      var(--app-bg) 100%
    );
    pointer-events: none;
  }

  .hero-scroll-solid {
    position: absolute;
    inset: 0;
    background: var(--app-bg);
    pointer-events: none;
    transition: opacity .05s linear;
  }

  .hero-greeting-block {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 40px;
    transition: opacity .2s linear;
    pointer-events: none;
  }
  .hero-greeting-name {
    margin: 0 0 4px;
    font-family: 'BeautyDisplay', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.08;
    color: var(--hero-text-color);
    text-shadow: var(--hero-text-shadow);
  }
  .hero-greeting-text {
    margin: 0;
    font-family: 'BeautyDisplay', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 23px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.25;
    color: var(--hero-text-color);
    opacity: 0.92;
    text-shadow: var(--hero-text-shadow);
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
    background: var(--drawer-bg);
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    z-index: 1;
    opacity: 1;
    transform: scale(1);
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1), transform .2s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s linear 0s;
  }
  /* Some ao rolar (heroProgress > 0), só reaparece quando volta ao
     topo absoluto — nunca com scroll para cima a meio do caminho. */
  .search-bar.search-bar-hidden {
    opacity: 0;
    transform: scale(0.92);
    pointer-events: none;
    visibility: hidden;
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1), transform .2s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s linear .2s;
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

  /* Grid sem containers: apenas ícone outline + label, como no
     print de referência (estilo CapCut). */
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px 8px;
    padding: 24px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
  .app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  .app-icon-svg {
    width: 26px;
    height: 26px;
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .native-tap:active .app-icon-svg {
    transform: scale(0.86);
  }
  .native-tap:active .app-label {
    opacity: 0.6;
  }
  .app-label {
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    line-height: 1.25;
    max-width: 88px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    transition: opacity .16s cubic-bezier(0.16,1,0.3,1);
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

  @media (prefers-reduced-motion: reduce) {
    .search-bar { transition: none !important; }
  }
</style>