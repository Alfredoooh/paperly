<!-- src/home/App.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import { createRouter } from '$shared/router.js';
  import { initPwaInstall, onPwaInstallAvailable, promptPwaInstall } from '$shared/pwa-install.js';

  import { getAvatarColor, TABS, TEMPLATE_VIEWS, IMAGE_MODELS, DOC_MODELS } from './lib/constants.js';
  import { createSlideTransition, createBackRecoilTransition } from './lib/nav-transition.js';
  import AppHeader from './components/AppHeader.svelte';
  import BottomTabBar from './components/BottomTabBar.svelte';
  import AppDrawer from './components/AppDrawer.svelte';
  import CreateTab from './components/CreateTab.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import TemplatesTab from './components/TemplatesTab.svelte';
  import ToolsTab from './components/ToolsTab.svelte';
  import SearchPage from './components/SearchPage.svelte';
  import TemplatePreviewPage from './components/TemplatePreviewPage.svelte';

  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.

  const dispatch = createEventDispatcher();

  const BASE = '/home/';
  const VALID_ROUTES = ['projects', 'templates', 'tools'];
  // 'create' é o rootRoute real do router — a rota raiz '/home/' resolve
  // sempre para 'create', tanto no parseCurrentRoute() como no navigate().
  const router = createRouter(BASE, VALID_ROUTES, 'create');

  let activeTab = 'create';
  $: currentTabMeta = TABS.find(t => t.id === activeTab);
  $: currentTitle = currentTabMeta?.title || '';

  // estado do toggle nativo do tab "Templates"
  let templatesView = 'images';

  let user = null;
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: avatarColor = getAvatarColor(userName);
  $: avatarUrl = user?.avatar || '';

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  let themeValue = 'dark';
  let isDark = true;
  let mediaQuery;
  function resolveIsDark(v) {
    return v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyThemeValue(v, persist = true) {
    themeValue = v;
    isDark = resolveIsDark(v);
    if (persist) localStorage.setItem('nexa_theme', v);
    syncTheme(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
  function handleSystemChange() {
    if (themeValue === 'system') applyThemeValue('system', false);
  }

  let rootEl;

  // ------------------------------------------------------------------
  // Drawer: agora usa a MESMA "regra de ouro" de history já usada por
  // search/preview, E o MESMO motor de spring (dentro do próprio
  // AppDrawer.svelte, via createSlideTransition) — nada de
  // requestAnimationFrame manual nem de CSS transition paralela aqui.
  // App.svelte só é dono de DUAS coisas: (1) SE o drawer está montado
  // no DOM (drawerOpen) e (2) o estado lógico "deve estar
  // aberto/fechado" (drawerPushed) — a tradução disso em movimento
  // físico acontece inteiramente dentro do AppDrawer.
  // ------------------------------------------------------------------
  let drawerOpen = false;
  let drawerPushed = false;
  let showInstall = false;
  let unsubscribeInstall;

  async function openDrawer() {
    if (drawerOpen) return;
    pushOverlayState('drawer', { nexaDrawer: true });
    drawerOpen = true;
    await new Promise(r => requestAnimationFrame(r));
    drawerPushed = true;
  }

  // Chamado pelo AppDrawer quando o gesto de arrastar começa ('live')
  // ou termina com sucesso ('commit'). 'live' só monta o drawer no DOM
  // (para o dedo já poder controlá-lo via setDragValue no mesmo frame),
  // sem ainda tocar no histórico. 'commit' empurra o histórico real,
  // assim que o gesto decide definitivamente abrir — exatamente o
  // ponto em que search/preview empurram o deles.
  function openDrawerFromGesture(phase) {
    if (phase === 'live') {
      if (drawerOpen) return;
      drawerOpen = true;
      return;
    }
    if (phase === 'commit') {
      drawerPushed = true;
      if (history.state && history.state.nexaDrawer) return;
      pushOverlayState('drawer', { nexaDrawer: true });
    }
  }

  // Fecho visual puro — chamado a partir de onPopState. Espelha
  // exatamente closePreviewVisual()/closeSearchVisual(): desliga
  // drawerPushed (o AppDrawer reage e chama slide.close()) e só
  // desmonta drawerOpen depois da MESMA duração usada pelas outras
  // telas full-screen (340ms, ver nav-transition.js/REST_DELTA).
  function closeDrawerVisual() {
    drawerPushed = false;
    setTimeout(() => { drawerOpen = false; }, 340);
  }

  function closeDrawer() {
    if (!drawerOpen) return;
    if (history.state && history.state.nexaDrawer) {
      history.back();
    } else {
      closeDrawerVisual();
    }
  }

  function applyThemeFromDrawer(id) {
    applyThemeValue(id);
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2200);
  }

  async function handleInstall() {
    const result = await promptPwaInstall();
    closeDrawer();
    if (result.outcome === 'accepted') {
      showToast('Nexa instalado!');
    }
  }

  function selectTab(id) {
    activeTab = id;
    router.navigate(id);
    requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
  }

  function selectTemplatesView(id) {
    templatesView = id;
    requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
  }

  // ------------------------------------------------------------------
  // Navegação nativa via history real (push + popstate) — search e
  // preview já usavam createSlideTransition via a prop `pushed`
  // passada aos componentes. Aqui não muda nada na física, só mantém
  // a mesma "regra de ouro": o fecho VISUAL só acontece dentro de
  // onPopState, nunca antecipado pelas funções close*().
  // ------------------------------------------------------------------
  let searchOpen = false;
  let searchPushed = false;
  let previewOpen = false;
  let previewPushed = false;
  let previewData = null; // { kind: 'image'|'doc', item }
  let suppressRouterPopstate = false;

  function pushOverlayState(hash, extra) {
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaOverlay: hash, fromPath: currentPath, ...extra }, '', currentPath + '#' + hash);
  }

  function openSearch() {
    if (searchOpen) return;
    pushOverlayState('search', { nexaSearch: true });
    searchOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { searchPushed = true; }));
  }

  function closeSearchVisual() {
    searchPushed = false;
    setTimeout(() => { searchOpen = false; }, 340);
  }

  function closeSearch() {
    if (!searchOpen) return;
    if (history.state && history.state.nexaSearch) {
      history.back();
    } else {
      closeSearchVisual();
    }
  }

  function openTemplatePreview(kind, item) {
    if (previewOpen) return;
    previewData = { kind, item };
    pushOverlayState('preview', { nexaPreview: true });
    previewOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { previewPushed = true; }));
  }

  function closePreviewVisual() {
    previewPushed = false;
    setTimeout(() => { previewOpen = false; previewData = null; }, 340);
  }

  function closeTemplatePreview() {
    if (!previewOpen) return;
    if (history.state && history.state.nexaPreview) {
      history.back();
    } else {
      closePreviewVisual();
    }
  }

  function useTemplateFromPreview() {
    if (previewData?.item?.prompt) goToAIWithPrompt(previewData.item.prompt);
    closeTemplatePreview();
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

  // FIX (bug: clicar no avatar por vezes não navegava para o perfil,
  // ou deixava o drawer/histórico presos):
  // A versão anterior dependia de UM evento popstate partilhado entre
  // dois listeners — sem garantia de ordem, e sem garantia de que o
  // popstate chegava sequer a disparar. Agora o fecho do drawer é
  // feito diretamente aqui, de forma síncrona e determinística:
  // consome-se a entrada nexaDrawer do histórico (se existir) SEM
  // deixar o onPopState global reagir a ela, faz-se o fecho visual
  // de imediato via closeDrawerVisual(), e só se navega para o perfil
  // depois da própria transição de fecho (340ms, agora alinhada com a
  // duração real do spring) terminar.
  function openProfile() {
    if (drawerOpen) {
      if (history.state && history.state.nexaDrawer) {
        suppressRouterPopstate = true;
        history.back();
        requestAnimationFrame(() => { suppressRouterPopstate = false; });
      }
      closeDrawerVisual();
      setTimeout(() => {
        dispatch('nav', { to: 'profile', data: { path: '/profile/' } });
      }, 340); // espelha exatamente a duração de closeDrawerVisual()
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
  let heroProgress = 0;

  const CREATE_HERO_HEIGHT = 260;

  function handleScroll() {
    if (!scrollRootEl) return;
    scrolled = Math.min(1, scrollRootEl.scrollTop / 24);
    heroProgress = Math.min(1, Math.max(0, scrollRootEl.scrollTop / CREATE_HERO_HEIGHT));
  }

  let mounted = false;

  // ------------------------------------------------------------------
  // Recuo do fundo (.root) quando um overlay full-screen entra — usa
  // o motor de spring via rAF do nav-transition.js. O drawer JÁ NÃO
  // participa deste recoil: agora ele escreve diretamente no rootEl
  // a partir de DENTRO do AppDrawer (via applyRootPush, alimentado
  // pelo MESMO spring do próprio drawer) — eliminando por completo a
  // antiga disputa entre dois "donos" de transform no rootEl. Quando
  // o drawer está fechado, este recoil (search/preview) volta a ser o
  // único a escrever em rootEl.style.transform.
  // ------------------------------------------------------------------
  const backRecoil = createBackRecoilTransition();
  let rootRecoilValue = 0; // 0..1
  const unsubscribeBackRecoil = backRecoil.subscribe((v) => {
    rootRecoilValue = v;
    // Só aplica aqui quando o drawer não está a controlar o rootEl —
    // evita que os dois motores escrevam por cima um do outro no
    // mesmíssimo frame.
    if (!drawerOpen && rootEl) {
      const translate = -28 * v;
      rootEl.style.transform = `translate3d(${translate}%, 0, 0) scale(1)`;
    }
  });

  $: anyFullScreenOverlayPushed = searchPushed || previewPushed;
  let lastOverlayPushedState = false;
  $: if (anyFullScreenOverlayPushed !== lastOverlayPushedState) {
    lastOverlayPushedState = anyFullScreenOverlayPushed;
    if (anyFullScreenOverlayPushed) backRecoil.recoil();
    else backRecoil.reset();
  }

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

    const { route: initialRoute, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    activeTab = initialRoute;
    router.navigate(activeTab, { replace: true });

    const unbindRouter = router.bindPopState((r, nf) => {
      if (suppressRouterPopstate) return;
      if (nf) { window.location.replace('/404/'); return; }
      activeTab = r;
      requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
    });

    // Fonte ÚNICA de verdade para fechar overlays — drawer incluído,
    // tratado exatamente como search/preview: consome-se o popstate,
    // desliga-se drawerPushed (o AppDrawer trata da física sozinho).
    function onPopState() {
      if (suppressRouterPopstate) return;
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
>
  <div class="bg-layer"></div>

  {#if activeTab !== 'create'}
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
  {/if}

  <div class="scroll-root" bind:this={scrollRootEl} on:scroll={handleScroll} style="padding-top:{activeTab === 'create' ? 0 : appbarHeight}px;">
    {#if activeTab === 'create'}
      <CreateTab
        {platformApps}
        {heroProgress}
        {mounted}
        {avatarUrl}
        {avatarColor}
        {userInitial}
        {userName}
        title={currentTitle}
        onOpenDrawer={openDrawer}
        onOpenSearch={openSearch}
        onOpenApp={navigateToApp}
      />
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
  {drawerPushed}
  {rootEl}
  {themeValue}
  {avatarColor}
  {avatarUrl}
  {userInitial}
  {userName}
  {showInstall}
  onClose={closeDrawer}
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
    /* --drawer-bg é o tom "de referência" do AppDrawer (usado em
       cartões/estados internos do drawer); --drawer-bg-strong é um
       tom AINDA MAIS escuro, reservado ao FUNDO do próprio drawer e
       à bottom bar no escuro — como pediste, "um pouquinho mais
       escuro que o AppDrawer". */
    --drawer-bg: #1C1C1E;
    --drawer-bg-strong: #141416;
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
    --drawer-bg-strong: #ffffff;
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
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
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