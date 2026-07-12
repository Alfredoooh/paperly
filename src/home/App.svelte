<!-- src/home/App.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import { createRouter } from '$shared/router.js';
  import { initPwaInstall, onPwaInstallAvailable, promptPwaInstall } from '$shared/pwa-install.js';

  import { getAvatarColor, TABS, TEMPLATE_VIEWS, IMAGE_MODELS, DOC_MODELS } from './lib/constants.js';
  import { createBackRecoilTransition } from './lib/nav-transition.js';
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
  //
  // EXCEÇÃO: navegar para o perfil (openProfile, mais abaixo) NÃO usa
  // o onPopState partilhado — fecha o drawer de forma direta e síncrona
  // para eliminar a corrida entre listeners. Ver comentário em openProfile().
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

  // Fecho visual puro — chamado a partir de onPopState E também
  // diretamente por openProfile() (ver mais abaixo) quando queremos
  // fechar o drawer sem depender de um evento popstate global.
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

  // FIX (bug: create -> "/home/home/" -> 404 numa navegação seguinte):
  // O router usa 'create' como rootRoute (ver createRouter acima), e
  // parseCurrentRoute() já devolve 'create' para a rota raiz. Antes,
  // aqui passávamos a string literal 'home' (o nome da PASTA/BASE, não
  // o rootRoute), o que fazia navigate() comparar 'home' !== 'create'
  // e gerar o pathname inválido '/home/home/' em vez de '/home/'. Isso
  // não dava erro na hora (é só um pushState), mas na próxima vez que
  // essa URL fosse reavaliada — voltar, refresh, botão físico — o
  // router não reconhecia '/home/home/' como rota válida e redirecionava
  // para /404/. Agora passamos sempre activeTab diretamente: como
  // activeTab já usa 'create' para a tab raiz, fala a mesma língua que
  // o router sem qualquer tradução.
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
  // Navegação nativa via history real (push + popstate), usada pela
  // pesquisa, pelo preview de modelo, e agora também pelo perfil e
  // pelas definições do perfil — todas em tela cheia.
  //
  // REGRA DE OURO (fix do bug de duplo-clique + 404 ao voltar):
  // O fecho VISUAL de qualquer overlay (search/preview/profile/settings)
  // SÓ acontece dentro de onPopState — nunca é antecipado pelas funções
  // close*(). Essas só fazem history.back() e mais nada. Isto elimina a
  // necessidade de "prever" se foi o botão dentro da app ou o gesto
  // físico do Android/Chrome que disparou o popstate.
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

  // Chamado pelo botão "voltar" dentro da própria tela de pesquisa.
  // NÃO fecha nada visualmente aqui — só dispara o popstate real, que
  // vai ser apanhado por onPopState (fonte única de verdade do fecho).
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
  // dois listeners (o onPopState interno do onMount, e um onDrawerClosed
  // extra adicionado só aqui) — sem garantia de ordem entre os dois, e
  // sem NENHUMA garantia de que o popstate chegava sequer a disparar
  // (se closeDrawer() caísse no ramo de fallback sem history.back(), o
  // listener ficava pendurado para sempre e o perfil nunca abria).
  //
  // Agora o fecho do drawer é feito diretamente aqui, de forma síncrona
  // e determinística: consome-se a entrada nexaDrawer do histórico (se
  // existir) SEM deixar o onPopState global reagir a ela — evitando que
  // o router também reaja à mudança de histórico como se fosse uma
  // troca de rota — faz-se o fecho visual de imediato via
  // closeDrawerVisual(), e só se navega para o perfil depois da própria
  // transição de fecho (320ms, a mesma duração usada dentro de
  // closeDrawerVisual) terminar. Isto elimina por completo a corrida
  // entre os dois listeners e garante sempre: drawer 100% fechado, sem
  // qualquer entrada de overlay pendente no histórico, e só então a
  // tela de perfil aparece — sem erro, sem bug, sempre na mesma ordem.
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
      }, 320); // espelha exatamente a duração de closeDrawerVisual()
    } else {
      dispatch('nav', { to: 'profile', data: { path: '/profile/' } });
    }
  }

  let appbarHeight = 0;
  let topPanelEl;
  function measureAppbar() {
    if (topPanelEl) appbarHeight = topPanelEl.getBoundingClientRect().height;
  }

  function onStorage(e) {
    if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue, false);
  }

  let backRecoil;
  let unsubscribeBackRecoil;

  onMount(async () => {
    const authed = await requireAuth();
    if (!authed) return;
    user = authed;

    const savedTheme = localStorage.getItem('nexa_theme') || getTheme() || 'dark';
    applyThemeValue(savedTheme, false);
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', onStorage);
    window.addEventListener('resize', measureAppbar);
    requestAnimationFrame(() => requestAnimationFrame(measureAppbar));

    backRecoil = createBackRecoilTransition();
    unsubscribeBackRecoil = backRecoil.subscribe(() => {});

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
    //
    // NOTA: openProfile() define suppressRouterPopstate = true ANTES de
    // chamar history.back() e só o repõe a false no próximo frame — por
    // isso este onPopState também respeita a flag, evitando que reaja
    // ao mesmo popstate que openProfile() já está a tratar diretamente
    // via closeDrawerVisual(). Sem este check, o drawer fecharia DUAS
    // vezes em sequência (uma vez aqui, outra dentro de openProfile()),
    // o que é inofensivo por closeDrawerVisual() ser idempotente, mas
    // desnecessário.
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
    unsubscribeBackRecoil?.();
    backRecoil?.destroy();
  });
</script>