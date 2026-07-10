<!-- src/home/App.svelte -->
<script>
  import { onMount } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import { createRouter } from '$shared/router.js';
  import { initPwaInstall, onPwaInstallAvailable, promptPwaInstall } from '$shared/pwa-install.js';

  import { getAvatarColor, TABS, TEMPLATE_VIEWS } from './lib/constants.js';
  import AppHeader from './components/AppHeader.svelte';
  import BottomTabBar from './components/BottomTabBar.svelte';
  import AppDrawer from './components/AppDrawer.svelte';
  import CreateTab from './components/CreateTab.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import TemplatesTab from './components/TemplatesTab.svelte';
  import ToolsTab from './components/ToolsTab.svelte';

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

  function goToAIWithPrompt(promptText) {
    try {
      sessionStorage.setItem('nexa_pending_message', promptText);
      sessionStorage.removeItem('nexa_pending_attachments');
    } catch (e) {}
    const ai = platformApps.find(x => x.id === 'ai');
    window.location.href = ai ? ai.path : '/ai';
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

    const unbindRouter = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      activeTab = r === 'home' ? 'create' : r;
      requestAnimationFrame(() => requestAnimationFrame(measureAppbar));
    });

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', measureAppbar);
      unbindRouter?.();
      unsubscribeInstall?.();
    };
  });
</script>

<div class="root">
  <div class="bg-layer"></div>

  <AppHeader
    {mounted}
    bind:topPanelEl
    {scrolled}
    onOpenDrawer={openDrawer}
    {avatarColor}
    {userInitial}
    {userName}
    title={currentTitle}
    showToggle={activeTab === 'templates'}
    toggleOptions={TEMPLATE_VIEWS}
    toggleValue={templatesView}
    onToggleChange={selectTemplatesView}
  />

  <div class="scroll-root" bind:this={scrollRootEl} on:scroll={handleScroll} style="padding-top:{appbarHeight}px;">
    {#if activeTab === 'create'}
      <CreateTab {platformApps} />
    {:else if activeTab === 'projects'}
      <ProjectsTab />
    {:else if activeTab === 'templates'}
      <TemplatesTab view={templatesView} onUsePrompt={goToAIWithPrompt} />
    {:else if activeTab === 'tools'}
      <ToolsTab />
    {/if}
  </div>

  <BottomTabBar {activeTab} onSelect={selectTab} />
</div>

<AppDrawer
  {drawerOpen}
  {drawerVisible}
  {themeExpanded}
  {themeValue}
  {avatarColor}
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
  }

  .root {
    position:fixed;
    inset:0;
    overflow:hidden;
    overscroll-behavior:none;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    touch-action: pan-y;
  }
  .bg-layer { position:absolute; inset:0; z-index:0; background:var(--app-bg); }

  .scroll-root {
    position:absolute; inset:0; z-index:5;
    overflow-y:auto; overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior-y:contain;
    padding-bottom: 84px;
  }
</style>