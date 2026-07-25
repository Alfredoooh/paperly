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

  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.

  const dispatch = createEventDispatcher();

  const BASE = '/home/';
  const VALID_ROUTES = ['projects', 'templates', 'me'];
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

  // ------------------------------------------------------------------
  // Instalar app (PWA): antes vivia junto ao estado do drawer; agora
  // o drawer não existe, mas o MeTab continua a precisar destes dois
  // — mantidos aqui, soltos, exatamente com o mesmo comportamento.
  // ------------------------------------------------------------------
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

  // Sem drawer a fechar antes — o prompt de instalação é despoletado
  // diretamente a partir do MeTab, sem física de overlay a coordenar.
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

  // ------------------------------------------------------------------
  // Navegação nativa via history real (push + popstate) — search e
  // preview já usavam createSlideTransition via a prop `pushed`
  // passada aos componentes. Aqui não muda nada na física, só mantém
  // a mesma "regra de ouro": o fecho VISUAL só acontece dentro de
  // onPopState, nunca antecipado pelas funções close*().
  // ------------------------------------------------------------------
  let searchOpen = false;
  let searchPushed = false;
  let searchOrigin = null; // {top,left,width,height} do elemento clicado, ou null = slide normal
  let previewOpen = false;
  let previewPushed = false;
  let previewData = null; // { kind: 'image'|'doc', item }
  let suppressRouterPopstate = false;

  function pushOverlayState(hash, extra) {
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaOverlay: hash, fromPath: currentPath, ...extra }, '', currentPath + '#' + hash);
  }

  // origin = DOMRect (ou null) do elemento que disparou a abertura —
  // vindo da search-bar do CreateTab (container transform) ou do botão
  // de lupa do AppHeader (nesse caso não passamos origin = slide normal).
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

  // ------------------------------------------------------------------
  // Modal da Nexa IA (bottom-sheet) — segue EXATAMENTE o mesmo padrão
  // de history de search/preview: pushState próprio ao abrir, fecho
  // VISUAL só dentro de onPopState (nunca antecipado por
  // closeAIModal), para o botão físico de voltar do Android funcionar
  // corretamente. É o ÚNICO "app" que abre assim — nunca navega para
  // uma rota/path próprio como os outros itens de ALL_APPS.
  // ------------------------------------------------------------------
  let aiModalOpen = false;
  let aiModalPushed = false;

  function openAIModal() {
    if (aiModalOpen) return;
    pushOverlayState('ai', { nexaAI: true });
    aiModalOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { aiModalPushed = true; }));
  }

  function closeAIModalVisual() {
    aiModalPushed = false;
    setTimeout(() => { aiModalOpen = false; }, 340);
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

  // ------------------------------------------------------------------
  // Perfil: o AppDrawer foi eliminado, por isso já não existe nenhum
  // overlay/drawer a fechar antes de navegar — a navegação passa a ser
  // direta e síncrona, sempre. O dispatch('nav', ...) é EXATAMENTE o
  // mesmo usado antes (mesma rota '/profile/'), preservado tal e qual
  // porque é essa navegação que comunica com o app nativo.
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // FIX (bug: "não é possível deslizar a tela por completo"):
  // .scroll-root tinha um padding-bottom FIXO de 84px, que não batia
  // certo com a altura REAL da bottombar (42px de tab-btn + 12px de
  // padding vertical + env(safe-area-inset-bottom) variável por
  // aparelho) — em qualquer dispositivo com safe-area-inset-bottom
  // maior que ~30px (a generalidade dos Android/iPhone recentes com
  // gesture nav), o padding ficava CURTO, e o fim do conteúdo (ex: a
  // última linha de "Continue a criar designs") ficava permanentemente
  // tapado atrás da bottombar, sem forma de rolar mais para o revelar
  // — dava a sensação de "não desliza até ao fim".
  // Agora a altura real da bottombar é MEDIDA em runtime via
  // ResizeObserver (ela reserva o próprio espaço no layout através de
  // um elemento sentinela) e aplicada como custom property
  // --bottombar-h, consumida pelo padding-bottom do .scroll-root. Isto
  // acompanha automaticamente qualquer safe-area-inset-bottom,
  // rotação de ecrã, ou mudança futura de altura da bottombar, sem
  // números mágicos.
  // ------------------------------------------------------------------
  let bottombarSentinelEl;
  let bottombarH = 84; // fallback inicial, igual ao valor antigo, até à 1ª medição
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

  // ------------------------------------------------------------------
  // Recuo do fundo (.root) quando um overlay full-screen entra — usa
  // o motor de spring via rAF do nav-transition.js. O drawer já não
  // existe, por isso este recoil é agora o ÚNICO dono de
  // rootEl.style.transform — sem qualquer disputa entre dois motores.
  // ------------------------------------------------------------------
  const backRecoil = createBackRecoilTransition();
  let rootRecoilValue = 0; // 0..1
  const unsubscribeBackRecoil = backRecoil.subscribe((v) => {
    rootRecoilValue = v;
    if (rootEl) {
      const translate = -8 * v;
      const scale = 1 - 0.02 * v;
      rootEl.style.transform = `translate3d(${translate}%, 0, 0) scale(${scale})`;
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

    requestAnimationFrame(() => { mounted = true; measureAppbar(); measureBottombar(); });
    window.addEventListener('resize', measureAppbar);
    window.addEventListener('resize', measureBottombar);

    // ResizeObserver acompanha mudanças de altura da bottombar que não
    // vêm de um resize da janela (ex: fonte do sistema, densidade,
    // ou futura alteração de padding) — window 'resize' sozinho não
    // apanha isso.
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

    // Fonte ÚNICA de verdade para fechar overlays — o drawer foi
    // eliminado, por isso este ramo desapareceu; search/preview/modal
    // IA continuam tratados exatamente como antes: consome-se o
    // popstate, desliga-se o *Pushed correspondente (cada componente
    // reage e trata da física sozinho).
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

<AIChatModal
  open={aiModalOpen}
  pushed={aiModalPushed}
  onClose={closeAIModal}
/>

<!-- Sentinela invisível com EXATAMENTE o mesmo espaço reservado no
     fluxo do documento que a BottomTabBar real (que é position:fixed
     e por isso não ocupa espaço por si só) — serve só para o
     ResizeObserver medir a altura correta a aplicar como padding do
     scroll-root. pointer-events:none para nunca interceptar toques. -->
<div class="bottombar-sentinel" bind:this={bottombarSentinelEl} aria-hidden="true"></div>

<BottomTabBar {activeTab} onSelect={selectTab} onOpenAI={openAIModal} {avatarUrl} {avatarColor} {userInitial} />

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
    /* padding-bottom agora vem via style inline (bottombarH), medido
       em runtime a partir da bottombar real — ver measureBottombar(). */
  }

  /* Sentinela: fixed, mesma altura/posição que a BottomTabBar real
     ocuparia se não fosse position:fixed. display:none evitaria que o
     ResizeObserver a conseguisse medir corretamente em alguns
     browsers, por isso usa-se opacity:0 + pointer-events:none em vez
     disso — visualmente invisível, mas continua "presente" para
     efeitos de medição/layout. */
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