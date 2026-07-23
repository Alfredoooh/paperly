<script>
  import { onMount } from 'svelte';
  import '$shared/theme.css';
  import { createSlideTransition, createBackRecoilTransition } from './home/lib/nav-transition.js';

  import HomeApp from './home/App.svelte';
  import AiApp from './ai/App.svelte';
  import DocsApp from './docs/App.svelte';
  import ProfileApp from './profile/App.svelte';
  import SheetsApp from './sheets/App.svelte';
  import SlidesApp from './slides/App.svelte';
  import WhiteboardApp from './whiteboard/App.svelte';
  import AuthApp from './auth/App.svelte';
  import NotFoundApp from './notfound/App.svelte';

  const APP_DEFS = {
    ai: { component: AiApp, path: '/ai/' },
    docs: { component: DocsApp, path: '/docs/' },
    profile: { component: ProfileApp, path: '/profile/' },
    sheets: { component: SheetsApp, path: '/sheets/' },
    slides: { component: SlidesApp, path: '/slides/' },
    whiteboard: { component: WhiteboardApp, path: '/whiteboard/' },
    auth: { component: AuthApp, path: '/auth/' },
    notfound: { component: NotFoundApp, path: '/404/' },
  };

  const APP_IDS = new Set(Object.keys(APP_DEFS));
  let layers = [];
  let ready = false;

  const homeRecoil = createBackRecoilTransition();
  let homeRecoilValue = 0;
  const unsubHomeRecoil = homeRecoil.subscribe((v) => { homeRecoilValue = v; });
  $: homeRecoilTranslate = -28 * homeRecoilValue;

  function currentPath() {
    return window.location.pathname + window.location.search;
  }

  function isHomePath(pathname) {
    if (pathname === '/' || pathname === '' || pathname === '/index.html') return true;
    if (pathname === '/home') return true;
    return pathname.startsWith('/home/');
  }

  function pathToAppId(pathname) {
    const path = pathname || '/';
    if (isHomePath(path)) return null;
    if (path.startsWith('/404')) return 'notfound';
    if (path.startsWith('/auth')) return 'auth';
    const seg = path.split('/').filter(Boolean)[0] || null;
    if (!seg) return null;
    return APP_IDS.has(seg) ? seg : 'notfound';
  }

  function pushOverlayState(appId, targetPath) {
    history.pushState({ nexaApp: appId, fromPath: currentPath() }, '', targetPath);
  }

  function syncRecoil() {
    const anyPushed = layers.some((l) => l.pushed);
    if (anyPushed) homeRecoil.recoil();
    else homeRecoil.reset();
  }

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

    function onPopState() {
      const nextAppId = pathToAppId(window.location.pathname);

      if (nextAppId === 'notfound' && window.location.pathname !== '/404/') {
        window.location.replace('/404/');
        return;
      }

      const top = layers[layers.length - 1];

      if (!nextAppId) {
        [...layers].reverse().forEach((layer) => closeLayerVisual(layer));
        return;
      }

      if (top?.id === nextAppId) return;

      if (top && !APP_DEFS[nextAppId]) {
        closeLayerVisual(top);
        return;
      }

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
  @import './shared/theme.css';
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
