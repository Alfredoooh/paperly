<!-- src/home/App.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import AppHeader from './components/AppHeader.svelte';
  import BottomTabBar from './components/BottomTabBar.svelte';
  import AppDrawer from './components/AppDrawer.svelte';
  import SearchPage from './components/SearchPage.svelte';
  import TemplatePreviewPage from './components/TemplatePreviewPage.svelte';
  import CreateTab from './components/CreateTab.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import TemplatesTab from './components/TemplatesTab.svelte';
  import ToolsTab from './components/ToolsTab.svelte';
  import { requireAuth, logout as authLogout } from './lib/auth.js';
  import { getTheme, applyTheme } from './lib/theme.js';
  import { router } from './lib/router.js';
  import { pushOverlayState } from './lib/nav-history.js';
  import { initPwaInstall, onPwaInstallAvailable, handleInstall as pwaHandleInstall } from './lib/pwa-install.js';
  import { createBackRecoilTransition } from './lib/nav-transition.js';
  import { TEMPLATE_VIEWS, IMAGE_MODELS, DOC_MODELS } from './lib/constants.js';

  const dispatch = createEventDispatcher();

  export let platformApps = [];

  let user = null;
  let activeTab = 'create';
  let templatesView = TEMPLATE_VIEWS?.[0]?.id ?? 'grid';
  let currentTitle = '';
  let mediaQuery;
  let suppressRouterPopstate = false;

  let avatarColor = '#FF3B30';
  let userInitial = 'U';
  let userName = 'Utilizador';
  let avatarUrl = '';

  let themeValue = 'dark';
  function applyThemeValue(id, persist = true) {
    themeValue = id;
    applyTheme(id, persist);
  }
  function handleSystemChange() {
    if (themeValue === 'system') applyThemeValue('system', false);
  }

  let rootEl;

  let drawerOpen = false;
  let drawerVisible = false;
  let drawerPushed = false; // controla o "empurrar" do ecrã por trás do drawer
  let themeExpanded = false;
  let showInstall = false;
  let unsubscribeInstall;

  // ------------------------------------------------------------------
  // Drawer: segue a MESMA "regra de ouro" já usada pelo search/preview.
  // Abrir empurra um estado real para o histórico (pushState); fechar
  // NUNCA esconde o drawer diretamente — chama history.back() e deixa
  // o onPopState (fonte única de verdade) tratar do fecho visual. Isto
  // faz o botão físico de voltar do Android e o gesto do Chrome
  // fecharem o drawer exatamente como fecham a pesquisa/preview.
  // ------------------------------------------------------------------
  async function openDrawer() {
    if (drawerOpen) return;
    pushOverlayState('drawer', { nexaDrawer: true });
    drawerOpen = true;
    drawerVisible = false;
    themeExpanded = false;
    await new Promise(r => requestAnimationFrame(r));
    requestAnimationFrame(() => {
      drawerVisible = true;
      drawerPushed = true;
    });
  }

  // Chamado pelo AppDrawer quando o gesto de arrastar TERMINA a abrir
  // com sucesso. O dedo já posicionou drawerVisible/drawerPushed em
  // tempo real durante o arrasto (dentro do próprio AppDrawer) — falta
  // só tornar esse estado real e persistente: montar {#if drawerOpen}
  // e empurrar história, SEM repetir a animação de entrada (senão o
  // drawer "saltava" de volta a 100% e reanimava do zero, por cima do
  // que o dedo já tinha feito). Sem isto, o gesto nunca completava o
  // ciclo de vida real — drawerOpen ficava sempre false, o listener de
  // abertura nunca se desligava, e o botão físico de voltar não
  // conseguia fechar nada porque não havia history.state.nexaDrawer.
  function openDrawerFromGesture() {
    if (drawerOpen) return;
    pushOverlayState('drawer', { nexaDrawer: true });
    drawerOpen = true;
    // drawerVisible / drawerPushed já estão true, postos pelo gesto.
  }

  // Fecho visual puro — chamado apenas a partir de onPopState.
  function closeDrawerVisual() {
    drawerVisible = false;
    drawerPushed = false;
    themeExpanded = false;
    setTimeout(() => { drawerOpen = false; }, 320);
  }

  // Chamado pelo botão "X"/overlay/gesto de swipe dentro do próprio
  // drawer. Não fecha nada visualmente aqui — apenas dispara o popstate
  // real (ou faz fallback caso o histórico já tenha sido consumido).
  function closeDrawer() {
    if (!drawerOpen) return;
    if (history.state && history.state.nexaDrawer) {
      history.back();
    } else {
      closeDrawerVisual();
    }
  }
  function toggleThemeExpanded() {
    themeExpanded = !themeExpanded;
  }
  function applyThemeFromDrawer(id) {
    applyThemeValue(id);
  }

  function logout() {
    authLogout();
  }

  function handleInstall() {
    pwaHandleInstall();
  }

  let searchOpen = false;
  let searchVisible = false;
  let searchPushed = false;
  async function openSearch() {
    if (searchOpen) return;
    pushOverlayState('search', { nexaSearch: true });
    searchOpen = true;
    searchVisible = false;
    await new Promise(r => requestAnimationFrame(r));
    requestAnimationFrame(() => {
      searchVisible = true;
      searchPushed = true;
    });
  }
  function closeSearchVisual() {
    searchVisible = false;
    searchPushed = false;
    setTimeout(() => { searchOpen = false; }, 320);
  }
  function closeSearch() {
    if (!searchOpen) return;
    if (history.state && history.state.nexaSearch) {
      history.back();
    } else {
      closeSearchVisual();
    }
  }

  let previewOpen = false;
  let previewVisible = false;
  let previewPushed = false;
  let previewData = null;
  async function openTemplatePreview(kind, item) {
    if (previewOpen) return;
    previewData = { kind, item };
    pushOverlayState('preview', { nexaPreview: true });
    previewOpen = true;
    previewVisible = false;
    await new Promise(r => requestAnimationFrame(r));
    requestAnimationFrame(() => {
      previewVisible = true;
      previewPushed = true;
    });
  }
  function closePreviewVisual() {
    previewVisible = false;
    previewPushed = false;
    setTimeout(() => { previewOpen = false; previewData = null; }, 320);
  }
  function closeTemplatePreview() {
    if (!previewOpen) return;
    if (history.state && history.state.nexaPreview) {
      history.back();
    } else {
      closePreviewVisual();
    }
  }
  function useTemplateFromPreview(item) {
    closeTemplatePreview();
    dispatch('nav', { to: 'create', data: { path: '/', template: item } });
  }

  function selectTab(tabId) {
    activeTab = tabId;
    router.navigate(tabId);
  }
  function selectTemplatesView(id) {
    templatesView = id;
  }

  function goToAIWithPrompt(promptText) {
    try {
      sessionStorage.setItem('nexa_pending_message', promptText);
      sessionStorage.removeItem('nexa_pending_attachments');
    } catch (e) {}
    dispatch('nav', { to: 'ai', data: { path: '/ai/' } });
  }

  function navigateToApp(app) {
    if (!app?.id || !app?.path) return;
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    dispatch('nav', { to: app.id, data: { path: app.path } });
  }

  // FIX (bug: clicar no perfil não fechava o drawer nem "desempurrava"
  // o ecrã de trás corretamente antes de navegar):
  // O botão do perfil vive DENTRO do AppDrawer. Antes, o goProfile() de
  // lá chamava onClose() (history.back() assíncrono) e onOpenProfile()
  // (pushState síncrono) no mesmo tick — o pushState do perfil corria
  // ANTES do browser processar o back() do drawer, corrompendo a pilha
  // de histórico e deixando o drawer/o "empurrar" do ecrã por trás
  // presos a meio da transição enquanto a página de perfil já tinha
  // navegado por cima.
  //
  // Agora o AppDrawer NUNCA chama onClose() sozinho neste caso — chama
  // só onOpenProfile(), e é esta função aqui que decide, de forma
  // sequencial e determinística: se o drawer estiver aberto, fecha-se
  // primeiro (closeDrawer real, via popstate) e SÓ DEPOIS do popstate
  // real disparar (drawer 100% fechado, ecrã 100% "desempurrado") é que
  // navega para o perfil.
  function openProfile() {
    if (drawerOpen) {
      const onDrawerClosed = () => {
        window.removeEventListener('popstate', onDrawerClosed);
        dispatch('nav', { to: 'profile', data: { path: '/profile/' } });
      };
      window.addEventListener('popstate', onDrawerClosed);
      closeDrawer();
    } else {
      dispatch('nav', { to: 'profile', data: { path: '/profile/' } });
    }
  }

  let appbarHeight = 0;
  let topPanelEl;
  function measureAppbar() {
    if (topPanelEl) {
      appbarHeight = topPanelEl.getBoundingClientRect().height;
    }
  }

  let scrollRootEl;
  let scrolled = 0;
  function handleScroll() {
    if (!scrollRootEl) return;
    scrolled = Math.min(1, scrollRootEl.scrollTop / 24);
  }

  let mounted = false;

  // ------------------------------------------------------------------
  // Recuo do fundo (.root) quando um overlay full-screen entra — ANTES
  // usava CSS transition (transform .38s) na classe .pushed-back, que
  // competia com a transition do próprio overlay (ex: TemplatePreviewPage)
  // e causava o congelamento reportado. Agora usa o MESMO motor de
  // spring via rAF do nav-transition.js: nunca há duas transições CSS
  // de transform disputando o mesmo frame.
  // ------------------------------------------------------------------
  const backRecoil = createBackRecoilTransition();
  let rootRecoilValue = 0; // 0..1
  const unsubscribeBackRecoil = backRecoil.subscribe((v) => { rootRecoilValue = v; });

  $: anyFullScreenOverlayPushed = searchPushed || previewPushed;
  let lastOverlayPushedState = false;
  $: if (anyFullScreenOverlayPushed !== lastOverlayPushedState) {
    lastOverlayPushedState = anyFullScreenOverlayPushed;
    if (anyFullScreenOverlayPushed) backRecoil.recoil();
    else backRecoil.reset();
  }
  $: rootRecoilTranslate = -28 * rootRecoilValue; // %
  $: rootRecoilScale = 1; // mantém escala normal (só o drawer encolhe)

  // FIX (bug: o "empurrar" do ecrã pelo drawer nunca se via de forma
  // consistente, e o fecho ficava preso a meio):
  // .root tinha DOIS donos de transform ao mesmo tempo — a classe CSS
  // .pushed-by-drawer (transition .38s) E o atributo style inline com
  // rootRecoilTranslate/rootRecoilScale (do recoil do search/preview).
  // Como o style inline tem sempre prioridade sobre a classe, mesmo
  // "vazio" ele continuava presente no elemento, e assim que
  // drawerPushed voltava a false o style inline reescrevia o transform
  // SEM transição (a classe, essa sim com a transition, já tinha
  // saído), cortando a animação de saída a meio. Um TERCEIRO dono
  // ainda escreve directo em rootEl.style.transform durante o arrasto
  // ao vivo (dentro do AppDrawer, via applyLiveTransform/
  // releaseLiveTransform) — isso mantém-se, porque durante o gesto
  // precisa de seguir o dedo 1:1 sem qualquer transition CSS a atrasar.
  //
  // Agora resolvido combinando os dois estados (drawer + recoil) numa
  // ÚNICA expressão reativa e usando só style inline (nunca a classe
  // ao mesmo tempo) — assim há sempre exactamente UMA fonte de verdade
  // fora do gesto ao vivo, e a transition está sempre presente porque
  // faz parte do próprio style computado, nunca de uma classe que
  // pode ou não estar montada no mesmo frame.
  $: rootTransformStyle = drawerPushed
    ? 'transform: translate3d(-10%, 0, 0) scale(0.965); transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);'
    : `transform: translate3d(${rootRecoilTranslate}%, 0, 0) scale(${rootRecoilScale}); transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);`;

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const saved = getTheme();
    applyThemeValue(localStorage.getItem('nexa_theme') || saved, false);

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);

    function onStorage(e) {
      if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue, false);
    }
    window.addEventListener('storage', onStorage);

    requestAnimationFrame(() => { mounted = true; measureAppbar(); });
    window.addEventListener('resize', measureAppbar);

    initPwaInstall();
    unsubscribeInstall = onPwaInstallAvailable((available) => {
      showInstall = available;
    });

    // parseCurrentRoute() já devolve 'create' diretamente para a rota
    // raiz — não precisa de nenhuma tradução 'home' <-> 'create'.
    const { route: initialRoute, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    activeTab = initialRoute;
    router.navigate(activeTab, { replace: true });

    // IMPORTANTE: este listener é vinculado pelo router ANTES do nosso
    // onPopState local, logo corre primeiro em qualquer evento popstate.
    const unbindRouter = router.bindPopState((r, nf) => {
      if (suppressRouterPopstate) return;
      if (nf) { window.location.replace('/404/'); return; }
      activeTab = r;
      requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
    });

    // Fonte ÚNICA de verdade para fechar overlays: dispara tanto quando
    // o botão de voltar DENTRO da app chama history.back(), como quando
    // o botão/gesto físico do Android ou o botão de voltar do Chrome
    // disparam popstate diretamente. A ORDEM importa: overlays "mais
    // profundos" na pilha (definições, depois perfil) são checados
    // primeiro, espelhando exatamente a ordem em que foram empilhados.
    //
    // FIX (drawer "muitíssimo bugado" quando outra app fora do home
    // estava aberta): antes, este onPopState assumia sempre que QUALQUER
    // popstate lhe pertencia, mesmo quando o popstate era, na verdade,
    // do shell raiz (ex.: fechar o perfil). Agora só reage se o
    // history.state realmente corresponder ao overlay em questão —
    // cada camada só trata o que é seu, sem competir por eventos que
    // não lhe dizem respeito.
    function onPopState() {
      const state = history.state;
      if (previewOpen && (!state || state.nexaPreview === undefined)) {
        suppressRouterPopstate = true;
        closePreviewVisual();
        suppressRouterPopstate = false;
      } else if (searchOpen && (!state || state.nexaSearch === undefined)) {
        suppressRouterPopstate = true;
        closeSearchVisual();
        suppressRouterPopstate = false;
      } else if (drawerOpen && (!state || state.nexaDrawer === undefined)) {
        suppressRouterPopstate = true;
        closeDrawerVisual();
        suppressRouterPopstate = false;
      }
    }
    window.addEventListener('popstate', onPopState);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', measureAppbar);
      window.removeEventListener('popstate', onPopState);
      unbindRouter?.();
      unsubscribeInstall?.();
    };
  });

  onDestroy(() => {
    unsubscribeBackRecoil();
    backRecoil.destroy();
  });
</script>

<div
  class="root"
  bind:this={rootEl}
  style={rootTransformStyle}
>
  <div class="bg-layer"></div>

  <AppHeader
    {mounted}
    bind:topPanelEl
    {scrolled}
    onOpenDrawer={openDrawer}
    {avatarUrl}
    {avatarColor}
    {userInitial}
    {userName}
    title={currentTitle}
    solidGradient={activeTab === 'templates'}
    showSearchBtn={activeTab === 'templates'}
    onOpenSearch={openSearch}
    showToggle={activeTab === 'templates'}
    toggleOptions={TEMPLATE_VIEWS}
    toggleValue={templatesView}
    onToggleChange={selectTemplatesView}
  />

  <div class="scroll-root" bind:this={scrollRootEl} on:scroll={handleScroll} style="padding-top:{appbarHeight}px;">
    {#if activeTab === 'create'}
      <CreateTab {platformApps} onOpenSearch={openSearch} onOpenApp={navigateToApp} />
    {:else if activeTab === 'projects'}
      <ProjectsTab />
    {:else if activeTab === 'templates'}
      <TemplatesTab view={templatesView} onOpenPreview={openTemplatePreview} />
    {:else if activeTab === 'tools'}
      <ToolsTab onOpenApp={navigateToApp} />
    {/if}
  </div>

  <BottomTabBar {activeTab} onSelect={selectTab} />
</div>

{#if searchOpen}
  <SearchPage
    pushed={searchPushed}
    {platformApps}
    imageModels={IMAGE_MODELS}
    docModels={DOC_MODELS}
    onUsePrompt={goToAIWithPrompt}
    onOpenApp={navigateToApp}
    onClose={closeSearch}
  />
{/if}

{#if previewOpen && previewData}
  <TemplatePreviewPage
    pushed={previewPushed}
    kind={previewData.kind}
    item={previewData.item}
    onClose={closeTemplatePreview}
    onUse={useTemplateFromPreview}
  />
{/if}


<AppDrawer
  {drawerOpen}
  {drawerVisible}
  bind:drawerPushed
  {rootEl}
  {themeExpanded}
  {themeValue}
  {avatarColor}
  {avatarUrl}
  {userInitial}
  {userName}
  {showInstall}
  onClose={closeDrawer}
  onToggleThemeExpanded={toggleThemeExpanded}
  onApplyTheme={applyThemeFromDrawer}
  onLogout={logout}
  onInstall={handleInstall}
  onOpenProfile={openProfile}
  onOpenViaGesture={openDrawerFromGesture}
/>

<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  :global(html), :global(body) {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
  }
  :global([data-theme="dark"]) {
    --app-bg: #0F0F0F;
    --header-glass-rgb: 15,15,15;
    --surface: #0F0F0F;
    --surface-strong: #0F0F0F;
    --surface-apps-tab: #171717;
    --border-soft: rgba(255,255,255,0.12);
    --border-faint: rgba(255,255,255,0.09);
    --icon-strong: rgba(255,255,255,0.88);
    --icon-faint: rgba(255,255,255,0.30);
    --text-faint: rgba(255,255,255,0.38);
    --row-active: rgba(255,255,255,0.07);
    --btn-bg: rgba(255,255,255,0.10);
    --btn-bg-active: rgba(255,255,255,0.18);
    --drawer-bg: #1C1C1E;
    --drawer-border: rgba(255,255,255,0.09);
    --drawer-shadow: rgba(0,0,0,0.45);
    --drawer-text: rgba(255,255,255,0.86);
    --drawer-text-faint: rgba(255,255,255,0.38);
    --drawer-sep: rgba(255,255,255,0.11);
    --drawer-overlay-in: rgba(0,0,0,0.35);
    --logout-icon: #FF453A;
    --btn-solid-bg: #f5f5f5;
    --btn-solid-bg-active: #e0e0e0;
    --btn-solid-text: #1a1a1a;
    --danger: #FF453A;
    --danger-active: #E0342A;
    --accent-primary: #0A84FF;
    --accent-primary-active: #0070E0;
  }
  :global([data-theme="light"]) {
    --app-bg: #FFFFFF;
    --header-glass-rgb: 255,255,255;
    --surface: #FFFFFF;
    --surface-strong: #FFFFFF;
    --surface-apps-tab: #FFFFFF;
    --border-soft: rgba(0,0,0,0.09);
    --border-faint: rgba(0,0,0,0.07);
    --icon-strong: rgba(20,20,20,0.85);
    --icon-faint: rgba(20,20,20,0.28);
    --text-faint: rgba(20,20,20,0.40);
    --row-active: rgba(0,0,0,0.05);
    --btn-bg: rgba(0,0,0,0.06);
    --btn-bg-active: rgba(0,0,0,0.11);
    --drawer-bg: #ffffff;
    --drawer-border: rgba(0,0,0,0.07);
    --drawer-shadow: rgba(0,0,0,0.13);
    --drawer-text: #111111;
    --drawer-text-faint: rgba(0,0,0,0.30);
    --drawer-sep: rgba(0,0,0,0.09);
    --drawer-overlay-in: rgba(0,0,0,0.20);
    --logout-icon: #E0342A;
    --btn-solid-bg: #2a2a2a;
    --btn-solid-bg-active: #1e1e1e;
    --btn-solid-text: #ffffff;
    --danger: #FF3B30;
    --danger-active: #E0342A;
    --accent-primary: #007AFF;
    --accent-primary-active: #0062CC;
  }

  .root {
    position:fixed;
    inset:0;
    overflow:hidden;
    overscroll-behavior:none;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    touch-action: pan-y;
    will-change: transform;
    transform-origin: center;
    contain: layout style paint;
  }
  .bg-layer { position:absolute; inset:0; z-index:0; background:var(--app-bg); }

  .scroll-root {
    position:absolute; inset:0; z-index:5;
    overflow-y:auto; overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior-y:contain;
    padding-bottom: 84px;
  }

  @media (prefers-reduced-motion: reduce) {
    .root { transition: none !important; }
  }
</style>