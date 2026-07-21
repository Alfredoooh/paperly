<!-- src/home/components/CreateTab.svelte -->
<!-- Tem o SEU PRÓPRIO header, fixo e sempre transparente/branco.
     Não usa AppHeader — este tab é o único caso especial. -->
<script>
  import { onDestroy, tick } from 'svelte';
  import { createBackRecoilTransition } from '../lib/nav-transition.js';

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

  // ── Push da tela de trás enquanto o apps-sheet expande ────────────
  // rootEl: o mesmo elemento raiz (.root) que o App.svelte já passa ao
  // AppDrawer para o efeito de push. appbarHeight: altura em px do
  // appbar desta tela (inclui safe-area), usada apenas como TETO de
  // segurança — o sheet nunca cresce mais do que isso, mas o alvo
  // real de expansão é a altura do próprio conteúdo (ver abaixo).
  export let rootEl = null;
  export let appbarHeight = 56;

  // Imagem do hero conforme o tema — clara usa img.jpg, escura usa
  // img_dark.jpg, ambas na mesma pasta /images/createbg/.
  $: heroImage = isDark ? '/images/createbg/img_dark.jpg' : '/images/createbg/img.jpg';

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

  // ══════════════════════════════════════════════════════════════════
  //  APPS-SHEET: fixo, ancorado à bottom bar. NÃO é um modal que
  //  aparece/desaparece — está sempre visível com uma altura base
  //  (mostra as primeiras linhas de apps). Ao arrastar para cima a
  //  partir do próprio sheet, ele EXPANDE em altura (mostrando mais
  //  apps), e a tela por trás (rootEl) recebe o mesmo efeito de push
  //  (translate + scale) usado pelo AppDrawer, proporcional ao quanto
  //  o sheet já expandiu.
  //
  //  LIMITE MÁXIMO DE EXPANSÃO (FIX): deixou de ser "topo toca o
  //  appbar". Passa a ser a altura REAL do conteúdo do sheet (handle
  //  + grid completo de apps, medida via getBoundingClientRect do
  //  próprio .apps-sheet-scroll depois de renderizado) — ou seja, o
  //  sheet para de crescer assim que a ÚLTIMA fila de apps acabou de
  //  ficar visível, sem sobra de espaço vazio por baixo. O valor
  //  "topo toca o appbar" (viewportH - appbarHeight) continua a
  //  existir, mas só como TETO de segurança para ecrãs muito
  //  pequenos onde o conteúdo todo nem caberia.
  // ══════════════════════════════════════════════════════════════════
  const BASE_SHEET_HEIGHT = 420; // altura "de repouso" do sheet, em px
  const PUSH_TRANSLATE = -8;
  const PUSH_SCALE_MIN = 0.98;

  const expand = createBackRecoilTransition(); // valor 0..1 (0 = repouso, 1 = totalmente expandido até ao conteúdo)
  let expandValue = 0;
  const unsubscribeExpand = expand.subscribe((v) => {
    expandValue = v;
    applyPush(v);
  });

  function applyPush(v) {
    if (!rootEl) return;
    const translate = PUSH_TRANSLATE * v;
    const scale = 1 - (1 - PUSH_SCALE_MIN) * v;
    rootEl.style.transform = `translate3d(0, ${translate}%, 0) scale(${scale})`;
  }

  let viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  function refreshViewportH() { viewportH = window.innerHeight; }

  // Altura real do conteúdo do sheet (handle-zone + grid), medida
  // depois de as apps estarem no DOM. Recalculada quando a lista de
  // apps muda ou o ecrã roda (resize). Enquanto não foi medida ainda
  // (0), usamos BASE_SHEET_HEIGHT como fallback para não rebentar o
  // cálculo antes do primeiro layout.
  let handleZoneEl;
  let gridEl;
  let measuredContentHeight = 0;

  async function measureContentHeight() {
    await tick();
    if (!handleZoneEl || !gridEl) return;
    const handleH = handleZoneEl.getBoundingClientRect().height;
    const gridH = gridEl.getBoundingClientRect().height;
    // + padding inferior do scroll (safe-area + espaço da bottom bar),
    // igual ao valor usado em .apps-sheet-scroll no CSS abaixo.
    const bottomPad = 78 + 16; // 78 = espaço da bottom bar; 16 = folga
    measuredContentHeight = handleH + gridH + bottomPad;
  }

  $: if (platformApps) measureContentHeight();

  // Teto de segurança: nunca ultrapassa "topo encosta no appbar",
  // mesmo que o conteúdo medido seja maior que isso (ex.: muitos apps
  // num ecrã pequeno) — aí sim o scroll interno do sheet assume.
  $: safetyCeilingHeight = Math.max(BASE_SHEET_HEIGHT, viewportH - appbarHeight);

  // Alvo real de expansão: a altura do conteúdo, respeitando o teto.
  $: targetExpandedHeight = Math.min(
    safetyCeilingHeight,
    Math.max(BASE_SHEET_HEIGHT, measuredContentHeight || BASE_SHEET_HEIGHT)
  );

  $: maxSheetHeight = targetExpandedHeight;
  $: sheetHeightPx = BASE_SHEET_HEIGHT + (maxSheetHeight - BASE_SHEET_HEIGHT) * expandValue;

  const DRAG_ACTIVATE_PX = 6;
  let dragging = false;
  let dragStartY = 0;
  let dragStartTime = 0;
  let dragCurrentY = 0;
  let dragBaseExpand = 0;
  let dragRange = 1;

  function onSheetTouchStart(e) {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragging = true;
    dragStartY = y;
    dragCurrentY = y;
    dragStartTime = performance.now();
    dragBaseExpand = expandValue;
    dragRange = Math.max(1, maxSheetHeight - BASE_SHEET_HEIGHT);
  }

  function onSheetTouchMove(e) {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragCurrentY = y;
    const deltaUp = dragStartY - y; // positivo quando arrasta para cima
    if (Math.abs(deltaUp) < DRAG_ACTIVATE_PX && dragBaseExpand === 0 && deltaUp <= 0) return;
    const deltaExpand = deltaUp / dragRange;
    const next = Math.min(1, Math.max(0, dragBaseExpand + deltaExpand));
    expand.setDragValue(next);
    if (Math.abs(deltaUp) > 4) e.preventDefault();
  }

  function onSheetTouchEnd() {
    if (!dragging) return;
    dragging = false;
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const deltaUp = dragStartY - dragCurrentY;
    const velocity = deltaUp / elapsed; // px/ms para cima

    const OPEN_THRESHOLD = 0.3;
    const FLING_VELOCITY = 0.5;

    if (expandValue > OPEN_THRESHOLD || velocity > FLING_VELOCITY) {
      expand.recoil();
    } else if (expandValue < (1 - OPEN_THRESHOLD) && !(velocity < -FLING_VELOCITY)) {
      expand.reset();
    } else if (velocity < -FLING_VELOCITY) {
      expand.reset();
    } else {
      expand.recoil();
    }
  }

  onDestroy(() => {
    unsubscribeExpand?.();
    expand.destroy?.();
  });
</script>

<svelte:window on:resize={() => { refreshViewportH(); measureContentHeight(); }} />

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

    <!-- Bloco de saudação: nome + frase, sempre branco (como no
         design original) sobre a foto. -->
    <div class="hero-greeting-block" style="opacity:{1 - heroProgress}">
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

  <!-- Espaçador: reserva o espaço que o sheet FIXO ocupa por baixo,
       para o resto do conteúdo da página não ficar coberto quando o
       sheet está em repouso (altura base). -->
  <div class="apps-sheet-spacer" style="height:{BASE_SHEET_HEIGHT}px"></div>
</div>

<!-- Sheet fixo, colado ao fundo (acima da bottom bar nativa, que já
     tem o seu próprio espaço reservado via padding-bottom). Ao
     arrastar a partir daqui, expande em altura (drag handle no topo),
     empurrando a tela por trás — limite máximo: altura real do
     conteúdo (grid completo de apps), nunca ultrapassando o teto de
     segurança do appbar. -->
<div
  class="apps-sheet"
  style="background:{'rgb(var(--header-glass-rgb))'}; height:{sheetHeightPx}px;"
  on:touchstart={onSheetTouchStart}
  on:touchmove={onSheetTouchMove}
  on:touchend={onSheetTouchEnd}
  on:touchcancel={onSheetTouchEnd}
>
  <div class="apps-sheet-handle-zone" bind:this={handleZoneEl}>
    <span class="apps-sheet-handle"></span>
  </div>
  <div class="apps-sheet-scroll">
    <div class="apps-grid" bind:this={gridEl}>
      {#each platformApps as app}
        <button class="app-item native-tap" on:click={() => openApp(app)}>
          <span class="app-icon-circle" style="background:{app.color || '#8E8E93'}">
            <span class="app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}')"></span>
          </span>
          <span class="app-label">{app.label}</span>
        </button>
      {/each}
    </div>
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
  /* Desaparecimento progressivo, ligado diretamente a heroProgress
     via opacity/transform inline — sem classe liga/desliga. Fica
     não-interativa perto do fim do fade, para não capturar toques
     enquanto praticamente invisível. */
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

  /* Espaçador do fluxo normal da página: mantém o resto do conteúdo
     do scroll a começar depois do sheet fixo (que já não faz parte
     do fluxo, mas sim position:fixed por cima). */
  .apps-sheet-spacer {
    width: 100%;
  }

  /* ---------- Apps-sheet: FIXO, colado à bottom bar ---------- */
  /* Deixa de fazer parte do fluxo normal da página — passa a
     position:fixed, ancorado ao fundo do ecrã (por cima da bottom bar
     nativa). A altura é controlada por JS (sheetHeightPx), entre
     BASE_SHEET_HEIGHT (repouso) e maxSheetHeight (altura real do
     conteúdo, ver script). O handle no topo é a zona de arrasto. */
  .apps-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    border-radius: 28px 28px 0 0;
    box-shadow: 0 -2px 16px rgba(0,0,0,0.10);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    touch-action: pan-y;
  }
  :global([data-theme="dark"]) .apps-sheet {
    background: var(--drawer-bg-strong) !important;
  }

  .apps-sheet-handle-zone {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0 6px;
    touch-action: none;
  }
  .apps-sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--drawer-sep, rgba(127,127,127,0.35));
  }

  .apps-sheet-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 78px);
  }

  .apps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px 8px;
    padding: 4px 14px 24px;
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
  /* Container: cor própria por app (app.color, hex fornecido), igual
     nos dois temas — deixou de haver uma única cor fixa de container
     controlada pelo CSS do tema. */
  .app-icon-circle {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.14);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  /* Ícone: SEMPRE branco puro, nos dois temas — o contraste vem do
     container colorido por baixo, não da cor do ícone. */
  .app-icon-svg {
    width: 24px;
    height: 24px;
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
    .apps-sheet { transition: none !important; }
  }
</style>