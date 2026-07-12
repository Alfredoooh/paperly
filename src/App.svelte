<script>
  import { onMount } from 'svelte';
  import { createSlideTransition } from './home/lib/nav-transition.js';

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

  const APP_DEFS = {
    home: { component: HomeApp, path: '/home/' },
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

  let layers = [];
  let ready = false;

  function pathToAppId(pathname) {
    const path = pathname || '/';
    if (path === '/' || path === '' || path === '/index.html') return 'home';
    if (path.startsWith('/404')) return 'notfound';
    if (path.startsWith('/auth')) return 'auth';
    const seg = path.split('/').filter(Boolean)[0] || 'home';
    return APP_IDS.has(seg) ? seg : 'notfound';
  }

  function getCurrentPath() {
    return window.location.pathname + window.location.search;
  }

  function pushLayer(appId, historyMode = 'push', force = false) {
    const def = APP_DEFS[appId] || APP_DEFS.notfound;
    const currentTop = layers[layers.length - 1];
    if (currentTop?.id === appId && !force) return;

    const targetPath = def.path;
    const currentPath = getCurrentPath();

    if (historyMode === 'push' && window.location.pathname + window.location.search !== targetPath) {
      history.pushState({ nexaApp: appId, fromPath: currentPath }, '', targetPath);
    } else if (historyMode === 'replace') {
      history.replaceState({ nexaApp: appId, fromPath: currentPath }, '', targetPath);
    }

    if (currentTop) {
      currentTop.closing = true;
      currentTop.slide.close();
    }

    const layer = {
      key: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      id: appId,
      component: def.component,
      x: 100,
      closing: false,
      slide: null,
      unsub: null,
    };

    layer.slide = createSlideTransition({
      onSettleClosed: () => {
        if (!layer.closing) return;
        layer.unsub?.();
        layer.slide?.destroy?.();
        layers = layers.filter((item) => item.key !== layer.key);
      },
    });

    layer.unsub = layer.slide.subscribe((v) => {
      layer.x = v;
      layers = layers.slice();
    });

    layers = [...layers, layer];
    requestAnimationFrame(() => requestAnimationFrame(() => layer.slide.open()));
  }

  function syncToLocation(historyMode = 'none') {
    const appId = pathToAppId(window.location.pathname);
    if (appId === 'notfound' && window.location.pathname !== '/404/' && historyMode !== 'none') {
      window.location.replace('/404/');
      return;
    }
    pushLayer(appId, historyMode, true);
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

    if (APP_DEFS[to]) {
      const targetPath = data?.path || APP_DEFS[to].path;
      const currentTop = layers[layers.length - 1];
      if (currentTop?.id === to && window.location.pathname + window.location.search === targetPath) return;
      pushLayer(to, 'push', true);
      return;
    }

    if (data?.path) {
      const appId = pathToAppId(data.path);
      if (APP_DEFS[appId]) {
        pushLayer(appId, 'push', true);
      }
    }
  }

  onMount(() => {
    const initialAppId = pathToAppId(window.location.pathname);
    if (window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname === '/index.html') {
      history.replaceState({ nexaApp: 'home' }, '', '/home/');
    }
    if (initialAppId === 'notfound' && window.location.pathname !== '/404/') {
      window.location.replace('/404/');
      return;
    }

    syncToLocation('replace');
    ready = true;

    const onPopState = () => {
      const nextId = pathToAppId(window.location.pathname);
      if (nextId === 'notfound' && window.location.pathname !== '/404/') {
        window.location.replace('/404/');
        return;
      }

      const currentTop = layers[layers.length - 1];
      if (currentTop?.id === nextId) return;
      pushLayer(nextId, 'none', true);
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
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
    {#each layers as layer (layer.key)}
      <div class="layer" style="transform: translate3d({layer.x}%, 0, 0); z-index: {100 + layers.findIndex((l) => l.key === layer.key)};">
        <svelte:component this={layer.component} pushed={layer.id === layers[layers.length - 1]?.id} on:nav={handleNav} />
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

  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    will-change: transform;
    overflow: hidden;
  }
</style>
