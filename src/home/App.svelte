<!-- src/home/App.svelte -->
<script>
  import { onMount } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import { createRouter } from '$shared/router.js';
  import { initPwaInstall, onPwaInstallAvailable, promptPwaInstall } from '$shared/pwa-install.js';

  import { getAvatarColor, TABS, TEMPLATE_VIEWS, IMAGE_MODELS, DOC_MODELS } from './lib/constants.js';
  import AppHeader from './components/AppHeader.svelte';
  import BottomTabBar from './components/BottomTabBar.svelte';
  import AppDrawer from './components/AppDrawer.svelte';
  import CreateTab from './components/CreateTab.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import TemplatesTab from './components/TemplatesTab.svelte';
  import ToolsTab from './components/ToolsTab.svelte';
  import SearchPage from './components/SearchPage.svelte';
  import TemplatePreviewPage from './components/TemplatePreviewPage.svelte';

  const BASE = '/home/';
  const VALID_ROUTES = ['projects', 'templates', 'tools'];
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

  let drawerOpen = false;
  let drawerVisible = false;
  let themeExpanded = false;
  let showInstall = false;
  let unsubscribeInstall;

  async function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    drawerVisible = false;
    themeExpanded = false;
    await new Promise(r => requestAnimationFrame(r));
    requestAnimationFrame(() => drawerVisible = true);
  }
  function closeDrawer() {
    drawerVisible = false;
    themeExpanded = false;
    setTimeout(() => drawerOpen = false, 320);
  }
  function toggleThemeExpanded() {
    themeExpanded = !themeExpanded;
  }
  function applyThemeFromDrawer(id) {
    applyThemeValue(id);
    themeExpanded = false;
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
    router.navigate(id === 'create' ? 'home' : id);
    requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
  }

  function selectTemplatesView(id) {
    templatesView = id;
    requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
  }

  // ------------------------------------------------------------------
  // Navegação nativa via history real (push + popstate), usada tanto
  // pela pesquisa como pelo preview de modelo em tela cheia. Ambas usam
  // um hash-sentinela local ('#search' / '#preview') que nunca provoca
  // pedido de rede — apenas cria uma entrada de histórico real para que
  // o botão/gesto físico de voltar do Android feche a tela certa.
  //
  // FIX (bug 404 ao voltar a partir do tab "Criar"):
  // A causa raiz real era o build/deploy: faltavam os ficheiros físicos
  // dist/home/templates|projects|tools/index.html e a regra de rewrite
  // '/home/*' no static/_redirects (ver vite.config.js e _redirects).
  // Isso já foi corrigido nesses dois ficheiros. Mantemos aqui, de forma
  // defensiva, o bloqueio do router durante o popstate de fecho destas
  // telas, para nunca depender só da configuração de servidor.
  // ------------------------------------------------------------------
  let searchOpen = false;
  let searchPushed = false;
  let previewOpen = false;
  let previewPushed = false;
  let previewData = null; // { kind: 'image'|'doc', item }
  let closingFromPopstate = false;
  let suppressRouterPopstate = false;

  function pushOverlayState(hash, extra) {
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaOverlay: hash, fromPath: currentPath, ...extra }, '', currentPath + '#' + hash);
  }

  function openSearch() {
    if (searchOpen) return;
    closingFromPopstate = false;
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
      closingFromPopstate = true;
      suppressRouterPopstate = true;
      history.back();
    } else {
      closeSearchVisual();
    }
  }

  function openTemplatePreview(kind, item) {
    if (previewOpen) return;
    closingFromPopstate = false;
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
      closingFromPopstate = true;
      suppressRouterPopstate = true;
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
    const ai = platformApps.find(x => x.id === 'ai');
    window.location.href = ai ? ai.path : '/ai/';
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
    activeTab = initialRoute === 'home' ? 'create' : initialRoute;
    router.navigate(activeTab === 'create' ? 'home' : activeTab, { replace: true });

    // IMPORTANTE: este listener é vinculado pelo router ANTES do nosso
    // onPopState local, logo corre primeiro em qualquer evento popstate.
    // Se o popstate pertence ao fecho de um overlay (search/preview),
    // saímos imediatamente sem deixar o router avaliar/redirecionar 404.
    const unbindRouter = router.bindPopState((r, nf) => {
      if (suppressRouterPopstate) return;
      if (nf) { window.location.replace('/404/'); return; }
      activeTab = r === 'home' ? 'create' : r;
      requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
    });

    // botão/gesto físico de voltar do Android — fecha o overlay aberto.
    // Como usamos um hash local, isto nunca provoca pedido ao servidor.
    function onPopState() {
      if (previewOpen && !closingFromPopstate) {
        suppressRouterPopstate = true;
        closePreviewVisual();
      } else if (searchOpen && !closingFromPopstate) {
        suppressRouterPopstate = true;
        closeSearchVisual();
      }
      closingFromPopstate = false;
      setTimeout(() => { suppressRouterPopstate = false; }, 0);
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
</script>

<div class="root" class:pushed-back={searchPushed || previewPushed}>
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
      <CreateTab {platformApps} onOpenSearch={openSearch} />
    {:else if activeTab === 'projects'}
      <ProjectsTab />
    {:else if activeTab === 'templates'}
      <TemplatesTab view={templatesView} onOpenPreview={openTemplatePreview} />
    {:else if activeTab === 'tools'}
      <ToolsTab />
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
    --drawer-bg: #0F0F0F;
    --drawer-border: rgba(255,255,255,0.08);
    --drawer-shadow: rgba(0,0,0,0.45);
    --drawer-text: rgba(255,255,255,0.82);
    --drawer-text-faint: rgba(255,255,255,0.35);
    --drawer-sep: rgba(255,255,255,0.10);
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
    transform: translate3d(0,0,0);
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
  }
  /* parallax: o conteúdo de trás desliza levemente para a esquerda,
     igual ao push nativo do iOS (UINavigationController) */
  .root.pushed-back {
    transform: translate3d(-28%, 0, 0);
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