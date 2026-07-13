<!-- src/home/components/CreateTab.svelte -->
<!-- Tem o SEU PRÓPRIO header, fixo e sempre transparente/branco.
     Não usa AppHeader — este tab é o único caso especial. -->
<script>
  export let platformApps = [];
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};

  export let heroProgress = 0;

  // dados do header próprio (antes vinham via AppHeader)
  export let mounted = false;
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let title = '';
  export let onOpenDrawer = () => {};

  // Cor do container por app — fixa por ID, todas distintas entre si.
  const APP_CONTAINER_COLORS = {
    ai:           '#F0384A', // vermelho
    profilelens:  '#D6409F', // rosa-magenta
    docs:         '#2F7BF6', // azul
    sheets:       '#1E9E8C', // teal
    slides:       '#E8720F', // laranja
    drive:        '#8B3FE0', // roxo
    calendar:     '#1FA34A', // verde
    chat:         '#12A8D6', // azul-ciano
    tasks:        '#B0B0B8', // cinza
    notes:        '#C2410C', // laranja-terracota
    forms:        '#E0405F', // vermelho-rosado
    projects:     '#9333EA', // roxo-violeta
    wiki:         '#4A5FE0', // índigo
    whiteboard:   '#0D9488', // teal-escuro
    analytics:    '#84CC16', // lima
  };

  const FALLBACK_COLOR = '#8E8E93';

  function containerColor(app) {
    return APP_CONTAINER_COLORS[app.id] || FALLBACK_COLOR;
  }

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

  function handleOpenSearch() {
    buzz();
    onOpenSearch();
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
     com o scroll, com linha divisória fina. -->
<div class="create-header" class:in={mounted} class:solid={isSolid}>
  <div class="create-header-inner">
    <h1 class="create-header-title" class:visible={isSolid}>{isSolid ? title : ''}</h1>
    <button class="profile-btn pulse-tap" on:click={handleMenu} aria-label="Perfil">
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
    <!-- Camada 1: a foto em si -->
    <div class="hero-photo" style="background-image:url('/images/createbg/img.jpg')"></div>
    <!-- Camada 2: gradiente ESTÁTICO, suave — a foto respira mais. -->
    <div class="hero-static-fade"></div>
    <!-- Camada 3: cobre a imagem por completo conforme o utilizador
         desliza para cima — ESTA sim depende do scroll (heroProgress) -->
    <div class="hero-scroll-solid" style="opacity:{heroProgress}"></div>

    <!-- Bloco de saudação: nome + frase, ambos na fonte importada. -->
    <div class="hero-greeting-block" style="opacity:{1 - heroProgress}">
      <p class="hero-greeting-name">{userName}!</p>
      <p class="hero-greeting-text">{greetingText}</p>
    </div>
  </div>

  <button class="search-bar pulse-tap" on:click={handleOpenSearch}>
    <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
    <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
  </button>

  <div class="apps-grid">
    {#each platformApps as app}
      <button class="app-item native-tap" on:click={() => openApp(app)}>
        <span class="app-icon-wrap" style="background:{containerColor(app)}">
          <span class="app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}')"></span>
        </span>
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
    transition: opacity .5s cubic-bezier(0.16,1,0.3,1), transform .5s cubic-bezier(0.16,1,0.3,1), background .3s cubic-bezier(0.16,1,0.3,1), border-color .3s cubic-bezier(0.16,1,0.3,1);
    pointer-events: none;
    contain: layout style paint;
    overflow: hidden;
    border-bottom: 1px solid transparent;
  }
  .create-header.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  /* Sólido mais escuro que --drawer-bg puro, com linha divisória fina
     por baixo, ao estilo appbar nativo iOS/Android. */
  .create-header.solid {
    background: color-mix(in srgb, var(--drawer-bg) 92%, black 8%);
    border-bottom-color: var(--divider, rgba(127,127,127,0.18));
    box-shadow: 0 1px 6px rgba(0,0,0,0.10);
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
    transition: opacity .2s cubic-bezier(0.16,1,0.3,1);
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
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
    margin-left: auto;
  }
  .profile-btn:active {
    background: rgba(255,255,255,0.26);
    transform: scale(0.9);
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
    .profile-btn:hover { background: rgba(255,255,255,0.24); }
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
  /* Saudação aumentada mais uma vez: 32px -> 38px. */
  .hero-greeting-name {
    margin: 0 0 4px;
    font-family: 'BeautyDisplay', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.08;
    color: #fff;
    text-shadow: 0 2px 14px rgba(0,0,0,0.5);
  }
  .hero-greeting-text {
    margin: 0;
    font-family: 'BeautyDisplay', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 23px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.25;
    color: rgba(255,255,255,0.92);
    text-shadow: 0 2px 10px rgba(0,0,0,0.45);
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
    grid-template-columns: repeat(3, 1fr);
    gap: 22px 8px;
    padding: 20px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
  .app-item {
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
    -webkit-tap-highlight-color: transparent;
  }
  .app-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-icon-svg {
    width: 60%;
    height: 60%;
    display: block;
    background: #fff;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  /* Tap "nativo": ícone encolhe com spring, label esbate levemente —
     o mesmo tipo de resposta tátil visual do resto da app. */
  .native-tap:active .app-icon-wrap {
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
    max-width: 80px;
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
</style>