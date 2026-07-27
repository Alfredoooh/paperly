<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.
  import { onMount, createEventDispatcher } from 'svelte';
  import '$shared/theme.css';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import { localIconPath } from '$shared/local-icon.js';
  import MainPage from './pages/MainPage.svelte';

  const APP_ID = 'docs';
  const APP_TITLE = 'Nexa Docs';
  const APP_ICON = localIconPath('document_24_regular');
  const BASE = '/docs/';
  const VALID_ROUTES = [];
  const router = createRouter(BASE, VALID_ROUTES, 'main');

  let route = 'main';
  let resourceId = null;
  let user = null;
  let isDark = false;
  let ready = false;

  const dispatch = createEventDispatcher();

  let suppressRouterPopstate = false;
  function setSuppressRouterPopstate(v) { suppressRouterPopstate = v; }

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    const { route: initialRoute, resourceId: initialResourceId, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    resourceId = initialResourceId;
    if (!resourceId) router.navigate(route, { replace: true });
    ready = true;

    const unbind = router.bindPopState((r, nf, rid) => {
      if (suppressRouterPopstate) return;
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
      resourceId = rid;
    });

    return unbind;
  });

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (data?.isDark !== undefined) {
      isDark = !!data.isDark;
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
      syncTheme(isDark);
    }
    if (data?.logout) {
      localStorage.removeItem('nexa_user');
      window.location.href = '/auth/';
      return;
    }
    if (to === 'home') { dispatch('nav', { to: 'home' }); return; }
    if (to === 'main' || to === APP_ID) { route = 'main'; resourceId = null; router.navigate('main'); return; }
    if (to === 'resource' && data?.id) {
      route = 'main';
      resourceId = data.id;
      router.navigateToResource(data.id);
      return;
    }
  }
</script>

{#if ready}
  {#if route === 'main'}
    <MainPage
      {isDark}
      {user}
      {resourceId}
      appTitle={APP_TITLE}
      appId={APP_ID}
      iconPath={APP_ICON}
      {setSuppressRouterPopstate}
      on:nav={handleNav}
    />
  {/if}
{/if}

<style>
  @import '../shared/theme.css';
  :global(*, *::before, *::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :global(html, body) { width:100%; height:100%; overscroll-behavior:none; }
  :global(body) {
    margin:0;
    padding:0;
    overflow:hidden;
    position:relative;
    min-height:100dvh;
    width:100%;
    font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transition:background-color .3s ease, color .3s ease;
  }
  /* FIX RAIZ: --app-vh removido por completo. #app agora usa 100dvh
     diretamente, exatamente como o .root do MainPage.svelte já
     fazia — os dois container aninhados precisavam ser consistentes,
     porque uma altura de pai instável (o antigo 100vh de fallback)
     empurrava o filho mesmo que o filho estivesse correto por
     dentro. dvh já trata nativamente a barra de UI do
     Android/iOS e não muda com o teclado, então nem #app nem .root
     precisam de nenhum JS para se manterem estáveis. */
  :global(#app) {
    width:100%;
    height:100dvh;
    display:flex;
    flex-direction:column;
    position:fixed;
    inset:0;
    overflow:hidden;
  }
</style>