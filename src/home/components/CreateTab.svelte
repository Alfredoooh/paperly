<!-- src/home/components/CreateTab.svelte -->
<!-- Tem o SEU PRÓPRIO header, fixo e sempre transparente/branco.
     Não usa AppHeader — este tab é o único caso especial. -->
<script>
  export let platformApps = null;
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

  // Mantidas apenas para não quebrar o binding vindo do App.svelte —
  // já não são usadas aqui (o sheet deixou de ter push/limite).
  export let rootEl = null;
  export let appbarHeight = 56;

  // Recentes: lista de projetos recentes do utilizador. Cada item
  // esperado com {id, title, thumbnail, updatedAt}. Enquanto
  // recentProjects é null/undefined mostramos skeleton loader; um
  // array vazio [] significa "carregado, sem projetos" (sem
  // skeleton, sem secção).
  export let recentProjects = null;
  export let onOpenProject = () => {};

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

  // ══════════════════════════════════════════════════════════════════
  //  SILVER APPBAR: header sólido separado, que SÓ aparece ao deslizar
  //  para cima. Independente do .create-header original. Título à
  //  esquerda; avatar dentro do próprio appbar; botão de pesquisa que
  //  aparece quando a search-bar original desaparece.
  // ══════════════════════════════════════════════════════════════════
  const SOLID_THRESHOLD = 0.5;
  $: isSolid = heroProgress >= SOLID_THRESHOLD;

  // A search-bar desaparece progressivamente com o próprio scroll —
  // opacity e scale seguem heroProgress (0→1) continuamente, sem
  // liga/desliga abrupto. Só fica não-interativa perto do fim.
  $: searchBarOpacity = 1 - heroProgress;
  $: searchBarScale = 1 - 0.08 * heroProgress;
  $: searchBarInert = heroProgress > 0.9;

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

  // Clique na search-bar: sempre slide normal, sem container
  // transform/origin — nada de medir getBoundingClientRect aqui.
  function handleOpenSearch() {
    buzz();
    onOpenSearch(null);
  }

  function handleMenu() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    if (window.AndroidDrawer && typeof window.AndroidDrawer.openAccountDrawer === 'function') {
      window.AndroidDrawer.openAccountDrawer();
    } else {
      onOpenDrawer?.();
    }
  }

  function openProject(p) {
    try { navigator.vibrate && navigator.vibrate(7); } catch (e) {}
    onOpenProject(p);
  }

  // Formata "há X" de forma simples a partir de updatedAt (ISO string
  // ou timestamp), sem depender de libs externas.
  function timeAgo(updatedAt) {
    if (!updatedAt) return '';
    const then = new Date(updatedAt).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d}d`;
    const w = Math.floor(d / 7);
    return `há ${w}sem`;
  }

  const SKELETON_COUNT = 4;
  const APPS_SKELETON_COUNT = 6; // 2 filas de 3 colunas
</script>

<!-- Header próprio do Create: NÃO ALTERADO. -->
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

<!-- Silver appbar: título à esquerda, avatar + botão de pesquisa à direita. -->
<div class="silver-appbar" class:visible={isSolid} aria-hidden={!isSolid}>
  <div class="silver-appbar-inner">
    <span class="silver-appbar-title">{title}</span>
    <div class="silver-appbar-actions">
      <button
        class="silver-search-btn pulse-tap"
        class:visible={isSolid}
        tabindex={isSolid ? 0 : -1}
        aria-hidden={!isSolid}
        on:click={handleOpenSearch}
        aria-label="Pesquisar"
      >
        <span class="icon-mask silver-search-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
      </button>
      <button class="profile-btn pulse-tap solid" on:click={handleMenu} aria-label="Perfil">
        {#if avatarUrl}
          <img src={avatarUrl} alt={userName} class="profile-img" />
        {:else}
          <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
        {/if}
      </button>
    </div>
  </div>
</div>

<div class="create-tab">

  <!-- Hero: SEM imagem/foto de fundo e SEM gradiente — apenas o
       fundo normal da página. Saudação mantida (nome + frase). -->
  <div class="hero-bg">
    <div class="hero-greeting-block">
      <p class="hero-greeting-name">{userName}!</p>
      <p class="hero-greeting-text">{greetingText}</p>
    </div>
  </div>

  <button
    class="search-bar pulse-tap"
    style="opacity:{searchBarOpacity}; transform:scale({searchBarScale});"
    class:search-bar-inert={searchBarInert}
    on:click={handleOpenSearch}
  >
    <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
    <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
  </button>

  <!-- Apps: grid estática, 3 colunas, com skeleton enquanto carrega. -->
  {#if platformApps === null}
    <div class="apps-grid">
      {#each Array(APPS_SKELETON_COUNT) as _}
        <div class="app-item app-item-skeleton">
          <div class="app-icon-circle recent-skeleton"></div>
          <span class="recent-skeleton recent-skeleton-line" style="width:60%"></span>
        </div>
      {/each}
    </div>
  {:else if platformApps.length > 0}
    <div class="apps-grid">
      {#each platformApps as app}
        <button class="app-item native-tap" on:click={() => openApp(app)}>
          <span class="app-icon-circle" style="background:{app.color || '#8E8E93'}">
            <span class="app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}')"></span>
          </span>
          <span class="app-label">{app.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Continuar a criar -->
  {#if recentProjects === null}
    <div class="recent-section">
      <div class="recent-section-head">
        <span class="recent-skeleton recent-skeleton-title"></span>
      </div>
      <div class="recent-row">
        {#each Array(SKELETON_COUNT) as _}
          <div class="recent-card recent-card-skeleton">
            <div class="recent-thumb recent-skeleton"></div>
            <span class="recent-skeleton recent-skeleton-line" style="width:70%"></span>
            <span class="recent-skeleton recent-skeleton-line" style="width:45%"></span>
          </div>
        {/each}
      </div>
    </div>
  {:else if recentProjects.length > 0}
    <div class="recent-section">
      <div class="recent-section-head">
        <h2 class="recent-section-title">Continue a criar designs</h2>
        <span class="recent-section-cta">Ver tudo</span>
      </div>
      <div class="recent-row">
        {#each recentProjects as p (p.id)}
          <button class="recent-card native-tap" on:click={() => openProject(p)}>
            <div class="recent-thumb">
              {#if p.thumbnail}
                <img src={p.thumbnail} alt={p.title} loading="lazy" />
              {:else}
                <div class="recent-thumb-fallback" style="background:{p.color || '#8E8E93'}"></div>
              {/if}
            </div>
            <span class="recent-card-title">{p.title}</span>
            {#if p.updatedAt}
              <span class="recent-card-time">{timeAgo(p.updatedAt)}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

</div>

<style>
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

  /* ---------- Silver appbar ---------- */
  .silver-appbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 16;
    height: calc(env(safe-area-inset-top, 0px) + 52px);
    background: color-mix(in srgb, var(--app-bg) 88%, transparent);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    backdrop-filter: blur(18px) saturate(140%);
    border-bottom: 1px solid var(--drawer-sep, rgba(127,127,127,0.16));
    opacity: 0;
    transform: translateY(-10px) translateZ(0);
    transition:
      opacity .24s cubic-bezier(0.32, 0.72, 0, 1),
      transform .24s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
  }
  .silver-appbar.visible {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .silver-appbar-inner {
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
  .silver-appbar-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.1px;
    color: var(--drawer-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .silver-appbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  @media (min-width: 720px) {
    .silver-appbar-inner { max-width:760px; }
  }
  .silver-search-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--row-active, rgba(127,127,127,0.12));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    opacity: 0;
    transform: scale(0.7);
    transition:
      opacity .2s cubic-bezier(0.32, 0.72, 0, 1),
      transform .2s cubic-bezier(0.34,1.56,0.64,1),
      background .2s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
  }
  .silver-search-btn.visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .silver-search-btn:active {
    background: var(--row-hover, rgba(127,127,127,0.2));
    transform: scale(0.9);
  }
  .silver-search-icon {
    width: 17px;
    height: 17px;
    background: var(--icon-strong);
  }

  /* ---------- Conteúdo do Create ---------- */
  .create-tab {
    width: 100%;
  }

  /* Hero sem imagem: só espaço para a saudação respirar, no fundo
     normal da página. */
  .hero-bg {
    position: relative;
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 84px) 20px 44px;
  }
  .hero-greeting-block {
    position: relative;
  }
  .hero-greeting-name {
    margin: 0 0 4px;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.1;
    color: var(--drawer-text);
  }
  .hero-greeting-text {
    margin: 0;
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.3;
    color: var(--text-faint);
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(100% - 28px);
    height: 48px;
    margin: 0 14px 0;
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
  .search-bar.search-bar-inert {
    pointer-events: none;
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

  /* ---------- Apps: grid estática, sem modal ---------- */
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px 8px;
    padding: 22px 14px 8px;
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
  .app-item-skeleton {
    cursor: default;
  }
  .app-icon-circle {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.14);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-icon-svg {
    width: 30px;
    height: 30px;
    display: block;
    background: #FFFFFF;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .native-tap:active .app-icon-circle {
    transform: scale(0.86);
  }
  .native-tap:active .app-label {
    opacity: 0.6;
  }
  .app-label {
    font-size: 12.5px;
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

  /* ---------- Recentes ---------- */
  .recent-section {
    margin-top: 28px;
  }
  .recent-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 12px;
  }
  .recent-section-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.2px;
    color: var(--drawer-text);
    margin: 0;
  }
  .recent-section-cta {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
  }
  .recent-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    padding: 0 14px 4px;
  }
  .recent-row::-webkit-scrollbar {
    display: none;
  }
  .recent-card {
    flex: 0 0 auto;
    width: 132px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: none;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    scroll-snap-align: start;
    -webkit-tap-highlight-color: transparent;
    font: inherit;
    color: var(--drawer-text);
  }
  .recent-thumb {
    width: 132px;
    height: 132px;
    border-radius: 14px;
    overflow: hidden;
    background: var(--row-active, rgba(127,127,127,0.10));
    flex-shrink: 0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .recent-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .recent-thumb-fallback {
    width: 100%;
    height: 100%;
  }
  .recent-card-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .recent-card-time {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-faint);
  }
  .native-tap:active .recent-thumb {
    transform: scale(0.97);
  }

  /* ---------- Skeleton loader ---------- */
  .recent-skeleton {
    position: relative;
    overflow: hidden;
    background: var(--row-active, rgba(127,127,127,0.12));
    border-radius: 8px;
  }
  .recent-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--drawer-text) 8%, transparent) 50%,
      transparent 100%
    );
    animation: skeleton-shimmer 1.3s ease-in-out infinite;
  }
  @keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .recent-skeleton-title {
    width: 160px;
    height: 17px;
    border-radius: 5px;
  }
  .recent-card-skeleton {
    cursor: default;
  }
  .recent-card-skeleton .recent-thumb {
    border-radius: 14px;
  }
  .recent-skeleton-line {
    height: 11px;
    border-radius: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    .recent-skeleton::after { animation: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .search-bar { transition: none !important; }
    .silver-appbar { transition: none !important; }
    .silver-search-btn { transition: none !important; }
  }
</style>