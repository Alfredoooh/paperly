<script>
  import { onMount } from 'svelte';
  import { createSlideTransition, createBackRecoilTransition } from './home/lib/nav-transition.js';

  import HomeApp from './home/App.svelte';
  import AiApp from './ai/App.svelte';
  import AnalyticsApp from './analytics/App.svelte';
  import AuthApp from './auth/App.svelte';
  import CalendarApp from './calendar/App.svelte';
  import ChatApp from './chat/App.svelte';
  import DocsApp from './docs/App.svelte';
  import DriveApp from './drive/App.svelte';
  import FormsApp from './forms/App.svelte';
  import NotesApp from './notes/App.svelte';
  import NotFoundApp from './notfound/App.svelte';
  import ProfileApp from './profile/App.svelte';
  import ProfileLensApp from './profilelens/App.svelte';
  import ProjectsApp from './projects/App.svelte';
  import SheetsApp from './sheets/App.svelte';
  import SlidesApp from './slides/App.svelte';
  import TasksApp from './tasks/App.svelte';
  import WhiteboardApp from './whiteboard/App.svelte';
  import WikiApp from './wiki/App.svelte';

  // 'home' NÃO entra aqui — é a base fixa, nunca é uma layer empilhada.
  const APP_DEFS = {
    ai: { component: AiApp, path: '/ai/' },
    analytics: { component: AnalyticsApp, path: '/analytics/' },
    auth: { component: AuthApp, path: '/auth/' },
    calendar: { component: CalendarApp, path: '/calendar/' },
    chat: { component: ChatApp, path: '/chat/' },
    docs: { component: DocsApp, path: '/docs/' },
    drive: { component: DriveApp, path: '/drive/' },
    forms: { component: FormsApp, path: '/forms/' },
    notes: { component: NotesApp, path: '/notes/' },
    notfound: { component: NotFoundApp, path: '/404/' },
    profile: { component: ProfileApp, path: '/profile/' },
    profilelens: { component: ProfileLensApp, path: '/profilelens/' },
    projects: { component: ProjectsApp, path: '/projects/' },
    sheets: { component: SheetsApp, path: '/sheets/' },
    slides: { component: SlidesApp, path: '/slides/' },
    tasks: { component: TasksApp, path: '/tasks/' },
    whiteboard: { component: WhiteboardApp, path: '/whiteboard/' },
    wiki: { component: WikiApp, path: '/wiki/' },
  };

  const APP_IDS = new Set(Object.keys(APP_DEFS));

  // Pilha de overlays por cima do home — a MESMA "regra de ouro" já
  // usada pelo drawer/search/preview dentro de home/App.svelte:
  //   - abrir empurra um estado real (pushState)
  //   - fechar NUNCA esconde a layer diretamente — só chama
  //     history.back(); quem esconde de facto é sempre o onPopState
  let layers = [];
  let ready = false;

  // Recuo da camada de baixo (home) — efeito push estilo iOS: a tela
  // nova entra da direita ENQUANTO a de trás recua para a esquerda,
  // em simultâneo, com o mesmo motor de spring que home/App.svelte já
  // usa para o search/preview (createBackRecoilTransition).
  const homeRecoil = createBackRecoilTransition();
  let homeRecoilValue = 0;
  const unsubHomeRecoil = homeRecoil.subscribe((v) => { homeRecoilValue = v; });
  $: homeRecoilTranslate = -28 * homeRecoilValue; // %

  function currentPath() {
    return window.location.pathname + window.location.search;
  }

  function isHomePath(pathname) {
    return pathname === '/' || pathname === '' || pathname === '/index.html' || pathname === '/home/' || pathname === '/home';
  }

  function pathToAppId(pathname) {
    const path = pathname || '/';
    if (isHomePath(path)) return null; // null = home, sem overlay nenhum
    if (path.startsWith('/404')) return 'notfound';
    if (path.startsWith('/auth')) return 'auth';
    const seg = path.split('/').filter(Boolean)[0] || null;
    if (!seg) return null;
    return APP_IDS.has(seg) ? seg : 'notfound';
  }

  function pushOverlayState(appId, targetPath) {
    history.pushState({ nexaApp: appId, fromPath: currentPath() }, '', targetPath);
  }

  // Recalcula o recuo do home sempre que a pilha muda: se há pelo
  // menos uma layer aberta, o home recua; se a pilha esvazia, volta.
  function syncRecoil() {
    const anyPushed = layers.some((l) => l.pushed);
    if (anyPushed) homeRecoil.recoil(); else homeRecoil.reset();
  }

  // Abre uma app como overlay por cima do home. Sempre empurra
  // história real — nunca é chamada a partir do onPopState.
  function openApp(appId, opts = {}) {
    const def = APP_DEFS[appId] || APP_DEFS.notfound;
    const currentTop = layers[layers.length - 1];
    if (currentTop?.id === appId && !opts.force) return;

    const targetPath = opts.path || def.path;

    if (!opts.fromPopState) {
      if (opts.replace) {
        history.replaceState({ nexaApp: appId, fromPath: currentPath() }, '', targetPath);
      } else if (currentPath() !== targetPath) {
        pushOverlayState(appId, targetPath);
      }
    }

    const layer = {
      key: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      id: appId,
      component: def.component,
      pushed: false,
      x: 100,
      slide: null,
      unsub: null,
    };

    layer.slide = createSlideTransition({});
    layer.unsub = layer.slide.subscribe((v) => {
      layer.x = v;
      layers = layers.slice();
    });

    layers = [...layers, layer];
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layer.pushed = true;
      layers = layers.slice();
      layer.slide.open();
      syncRecoil();
    }));
  }

  // Fecho VISUAL puro de uma layer específica — chamado apenas a
  // partir do onPopState, nunca diretamente por uma ação de UI.
  function closeLayerVisual(layer) {
    if (!layer) return;
    layer.pushed = false;
    layers = layers.slice();
    layer.slide.close();
    syncRecoil();
    setTimeout(() => {
      layer.unsub?.();
      layer.slide?.destroy?.();
      layers = layers.filter((l) => l.key !== layer.key);
    }, 340);
  }

  // Fecha a layer do topo — usado quando o destino de uma navegação
  // é o próprio home (ou uma app já não faz sentido continuar aberta).
  // Segue a regra de ouro: só pede history.back(), nunca esconde nada
  // diretamente, exceto quando não há estado de histórico para voltar
  // (fallback de segurança).
  function closeTopApp() {
    const top = layers[layers.length - 1];
    if (!top) return;
    if (history.state && history.state.nexaApp) {
      history.back();
    } else {
      closeLayerVisual(top);
    }
  }

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (!to) return;

    if (data?.logout || to === 'auth') {
      window.location.href = '/auth/';
      return;
    }

    if (to === 'notfound' || to === '404') {
      window.location.replace('/404/');
      return;
    }

    if (to === 'home') {
      closeTopApp();
      return;
    }

    if (APP_DEFS[to]) {
      const targetPath = data?.path || APP_DEFS[to].path;
      const currentTop = layers[layers.length - 1];
      if (currentTop?.id === to && currentPath() === targetPath) return;
      openApp(to, { path: targetPath });
      return;
    }

    if (data?.path) {
      const appId = pathToAppId(data.path);
      if (appId) openApp(appId, { path: data.path });
      else closeTopApp();
    }
  }

  onMount(() => {
    // Normaliza a URL inicial para /home/ sem empurrar história extra.
    if (isHomePath(window.location.pathname)) {
      if (window.location.pathname !== '/home/') {
        history.replaceState({ nexaApp: null }, '', '/home/');
      }
    } else {
      const initialAppId = pathToAppId(window.location.pathname);
      if (initialAppId === 'notfound' && window.location.pathname !== '/404/') {
        window.location.replace('/404/');
        return;
      }
      if (initialAppId) {
        // Abre já "assentada" (sem animação de entrada) porque é o
        // estado inicial da navegação direta a um URL profundo.
        openApp(initialAppId, { fromPopState: true, force: true });
        const top = layers[layers.length - 1];
        if (top) {
          top.pushed = true;
          top.x = 0;
          layers = layers.slice();
          homeRecoil.recoil();
        }
      }
    }

    ready = true;

    // onPopState é a ÚNICA fonte de verdade que esconde layers.
    // Percorre a pilha da mais profunda para a mais rasa, tal como o
    // onPopState central de home/App.svelte trata drawer > preview >
    // search.
    function onPopState() {
      const nextAppId = pathToAppId(window.location.pathname);

      if (nextAppId === 'notfound' && window.location.pathname !== '/404/') {
        window.location.replace('/404/');
        return;
      }

      const top = layers[layers.length - 1];

      if (!nextAppId) {
        // Destino é o home: fecha todas as layers empilhadas.
        [...layers].reverse().forEach((layer) => closeLayerVisual(layer));
        return;
      }

      if (top?.id === nextAppId) return;

      if (top && !APP_DEFS[nextAppId]) {
        closeLayerVisual(top);
        return;
      }

      // Navegação direta (ex.: forward do browser) para uma app que
      // ainda não está na pilha — abre-a sem empurrar história nova.
      if (!layers.some((l) => l.id === nextAppId)) {
        openApp(nextAppId, { fromPopState: true, force: true });
      }
    }

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      unsubHomeRecoil?.();
      homeRecoil.destroy?.();
      layers.forEach((layer) => {
        layer.unsub?.();
        layer.slide?.destroy?.();
      });
      layers = [];
    };
  });
</script>

{#if ready}
  <div class="shell">
    <!-- Base fixa: o home nunca tem animação de entrada própria — é -->
    <!-- o ecrã por defeito, sempre montado. Só recua (efeito push -->
    <!-- estilo iOS) quando alguma app abre por cima dele, com o -->
    <!-- MESMO motor de recoil que search/preview já usam dentro dele. -->
    <div class="home-layer" style="transform: translate3d({homeRecoilTranslate}%, 0, 0);">
      <HomeApp on:nav={handleNav} />
    </div>

    {#each layers as layer, i (layer.key)}
      <div class="layer" style="transform: translate3d({layer.x}%, 0, 0); z-index: {100 + i};">
        <svelte:component this={layer.component} pushed={layer.pushed} on:nav={handleNav} />
      </div>
    {/each}
  </div>
{/if}

<style>
  :global(html, body) {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  :global(body) {
    background: #0F0F0F;
    overscroll-behavior: none;
  }

  :global(#app) {
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    position: relative;
  }

  .shell {
    position: relative;
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
  }

  .home-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    will-change: transform;
    contain: layout style paint;
  }

  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    will-change: transform;
    overflow: hidden;
    contain: layout style paint;
  }
</style>