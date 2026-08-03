<!-- src/home/App.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import '$shared/theme.css';
  import { createRouter } from '$shared/router.js';
  import { initPwaInstall, onPwaInstallAvailable, promptPwaInstall } from '$shared/pwa-install.js';

  import { getAvatarColor, TABS, TEMPLATE_VIEWS, IMAGE_MODELS, DOC_MODELS } from './lib/constants.js';
  import { createSlideTransition, createBackRecoilTransition } from './lib/nav-transition.js';
  import AppHeader from './components/AppHeader.svelte';
  import BottomTabBar from './components/BottomTabBar.svelte';
  import CreateTab from './components/CreateTab.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import TemplatesTab from './components/TemplatesTab.svelte';
  import MeTab from './components/MeTab.svelte';
  import SearchPage from './components/SearchPage.svelte';
  import TemplatePreviewPage from './components/TemplatePreviewPage.svelte';
  import AIChatModal from './components/AIChatModal.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';

  export let pushed = false;

  const dispatch = createEventDispatcher();

  const BASE = '/home/';
  const VALID_ROUTES = ['projects', 'templates', 'me'];
  const router = createRouter(BASE, VALID_ROUTES, 'create');

  let activeTab = 'create';
  $: currentTabMeta = TABS.find(t => t.id === activeTab);
  $: currentTitle = currentTabMeta?.title || '';

  let templatesView = 'images';

  let user = null;
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: avatarColor = getAvatarColor(userName);
  $: avatarUrl = user?.avatar || '';

  const platformApps = ALL_APPS.filter(a => a.id !== 'home' && a.id !== 'ai');

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

  let showInstall = false;
  let unsubscribeInstall;

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

  let searchOpen = false;
  let searchPushed = false;
  let searchOrigin = null;
  let previewOpen = false;
  let previewPushed = false;
  let previewData = null;
  let suppressRouterPopstate = false;

  function pushOverlayState(hash, extra) {
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaOverlay: hash, fromPath: currentPath, ...extra }, '', currentPath + '#' + hash);
  }

  function openSearch(origin = null) {
    if (searchOpen) return;
    searchOrigin = origin;
    pushOverlayState('search', { nexaSearch: true });
    searchOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { searchPushed = true; }));
  }

  function closeSearchVisual() {
    searchPushed = false;
    setTimeout(() => { searchOpen = false; searchOrigin = null; }, 340);
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

  let settingsOpen = false;
  let settingsPushed = false;

  function openSettingsPage() {
    if (settingsOpen) return;
    pushOverlayState('settings', { nexaSettings: true });
    settingsOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { settingsPushed = true; }));
  }

  function closeSettingsVisual() {
    settingsPushed = false;
    setTimeout(() => { settingsOpen = false; }, 340);
  }

  function closeSettingsPage() {
    if (!settingsOpen) return;
    if (history.state && history.state.nexaSettings) {
      history.back();
    } else {
      closeSettingsVisual();
    }
  }

  let aiModalOpen = false;
let aiModalPushed = false;
let aiOrigin = null;
let bottomTabBarRef;

function openAIModal() {
  if (aiModalOpen) return;
  aiOrigin = bottomTabBarRef?.getFabRect?.() || null;
  pushOverlayState('ai', { nexaAI: true });
  aiModalOpen = true;
  requestAnimationFrame(() => requestAnimationFrame(() => { aiModalPushed = true; }));
}

function closeAIModalVisual() {
  aiModalPushed = false;
  setTimeout(() => { aiModalOpen = false; aiOrigin = null; }, 420);
}

  function closeAIModal() {
    if (!aiModalOpen) return;
    if (history.state && history.state.nexaAI) {
      history.back();
    } else {
      closeAIModalVisual();
    }
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

  function openProfile() {
    dispatch('nav', { to: 'profile', data: { path: '/profile/' } });
  }

  let appbarHeight = 0;
  let topPanelEl;
  function measureAppbar() {
    if (topPanelEl) {
      appbarHeight = topPanelEl.getBoundingClientRect().height;
    }
  }

  let bottombarSentinelEl;
  let bottombarH = 84;
  let bottombarResizeObserver;

  function measureBottombar() {
    if (bottombarSentinelEl) {
      bottombarH = bottombarSentinelEl.getBoundingClientRect().height;
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

  const backRecoil = createBackRecoilTransition();
  let rootRecoilValue = 0;
  const unsubscribeBackRecoil = backRecoil.subscribe((v) => {
    rootRecoilValue = v;
    if (rootEl) {
      const translate = -8 * v;
      const scale = 1 - 0.02 * v;
      rootEl.style.transform = `translate3d(${translate}%, 0, 0) scale(${scale})`;
    }
  });

  // ------------------------------------------------------------------
  // settingsPushed incluído aqui: agora abrir o Settings também recua/
  // escala a tela de trás (MeTab), exatamente como search e preview já
  // faziam — mesmo efeito visual de "push", usando o mecanismo que já
  // existia no app, sem depender do shell raiz (que trata o Profile
  // como rota irmã separada).
  // ------------------------------------------------------------------
  $: anyFullScreenOverlayPushed = searchPushed || previewPushed || settingsPushed;
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

    requestAnimationFrame(() => { mounted = true; measureAppbar(); measureBottombar(); });
    window.addEventListener('resize', measureAppbar);
    window.addEventListener('resize', measureBottombar);

    if (bottombarSentinelEl && typeof ResizeObserver !== 'undefined') {
      bottombarResizeObserver = new ResizeObserver(() => measureBottombar());
      bottombarResizeObserver.observe(bottombarSentinelEl);
    }

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
      } else if (aiModalOpen && (!state || state.nexaAI === undefined)) {
        suppressRouterPopstate = true;
        closeAIModalVisual();
        suppressRouterPopstate = false;
      } else if (settingsOpen && (!state || state.nexaSettings === undefined)) {
        suppressRouterPopstate = true;
        closeSettingsVisual();
        suppressRouterPopstate = false;
      }
    }
    window.addEventListener('popstate', onPopState);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', measureAppbar);
      window.removeEventListener('resize', measureBottombar);
      window.removeEventListener('popstate', onPopState);
      bottombarResizeObserver?.disconnect();
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

  {#if activeTab !== 'create' && activeTab !== 'me'}
    <AppHeader
      {mounted}
      bind:topPanelEl
      {scrolled}
      onOpenDrawer={openProfile}
      {avatarUrl}
      {avatarColor}
      {userInitial}
      {userName}
      title={currentTitle}
      solidOnScroll={activeTab === 'templates' || activeTab === 'projects'}
      showSearchBtn={activeTab === 'templates'}
      onOpenSearch={() => openSearch(null)}
      showToggle={activeTab === 'templates'}
      toggleOptions={TEMPLATE_VIEWS}
      toggleValue={templatesView}
      onToggleChange={selectTemplatesView}
    />
  {/if}

  <div
    class="scroll-root"
    bind:this={scrollRootEl}
    on:scroll={handleScroll}
    style="padding-top:{activeTab === 'create' || activeTab === 'me' ? 0 : appbarHeight}px; padding-bottom:{bottombarH}px;"
  >
    {#if activeTab === 'create'}
      <CreateTab
        {platformApps}
        {heroProgress}
        {mounted}
        {isDark}
        {avatarUrl}
        {avatarColor}
        {userInitial}
        {userName}
        title={currentTitle}
        {rootEl}
        {appbarHeight}
        onOpenDrawer={openProfile}
        onOpenSearch={openSearch}
        onOpenApp={navigateToApp}
      />
    {:else if activeTab === 'projects'}
      <ProjectsTab />
    {:else if activeTab === 'templates'}
      <TemplatesTab
        view={templatesView}
        isActive={activeTab === 'templates'}
        onOpenPreview={openTemplatePreview}
      />
    {:else if activeTab === 'me'}
      <MeTab
        {avatarUrl}
        {avatarColor}
        {userInitial}
        {userName}
        userEmail={user?.email || ''}
        {themeValue}
        onApplyTheme={applyThemeFromDrawer}
        onOpenProfile={openProfile}
        onOpenSettingsPage={openSettingsPage}
        onOpenSettings={() => {}}
        onLogout={logout}
        {showInstall}
        onInstall={handleInstall}
      />
    {/if}
  </div>
</div>

{#if searchOpen}
  <SearchPage
    pushed={searchPushed}
    origin={searchOrigin}
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

{#if settingsOpen}
  <SettingsPage
    pushed={settingsPushed}
    {isDark}
    {user}
    onClose={closeSettingsPage}
  />
{/if}

<div class="bottombar-sentinel" bind:this={bottombarSentinelEl} aria-hidden="true"></div>

<BottomTabBar bind:this={bottomTabBarRef} {activeTab} onSelect={selectTab} onOpenAI={openAIModal} {avatarUrl} {avatarColor} {userInitial} />

<AIChatModal
  open={aiModalOpen}
  pushed={aiModalPushed}
  origin={aiOrigin}
  onClose={closeAIModal}
/>

<style>
  @import '../shared/theme.css';
  * { box-sizing:border-box; margin:0; padding:0; }
  :global(html), :global(body) {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
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
  }

  .bottombar-sentinel {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    height: calc(42px + 12px + env(safe-area-inset-bottom, 0px));
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  }

  @media (prefers-reduced-motion: reduce) {
    .root { transition: none !important; }
  }
</style>