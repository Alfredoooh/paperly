<script>
  export let pushed = false;
  import { onMount, createEventDispatcher } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import { createSlideTransition } from '../home/lib/nav-transition.js';
  import MainPage from './pages/MainPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';

  const APP_ID = 'profile';
  const APP_TITLE = 'Perfil';
  const APP_ICON = '/icons/svg/user.svg';
  const BASE = '/profile/';
  const VALID_ROUTES = ['settings'];
  const router = createRouter(BASE, VALID_ROUTES, 'main');

  let route = 'main';
  let user = null;
  let isDark = false;
  let ready = false;
  let mainOpen = false;
  let mainPushed = false;
  let settingsOpen = false;
  let settingsPushed = false;
  let lastRoute = null;

  const pageSlide = createSlideTransition({});
  let pageSlideX = 100;
  const unsubscribePageSlide = pageSlide.subscribe((v) => { pageSlideX = v; });

  function syncPageSlide(nextRoute, immediate = false) {
    if (nextRoute === lastRoute && !immediate) return;
    lastRoute = nextRoute;

    if (nextRoute === 'settings') {
      if (!mainOpen) mainOpen = true;
      settingsOpen = true;
      if (immediate) {
        mainPushed = false;
        settingsPushed = true;
        pageSlide.open();
        setTimeout(() => { mainOpen = false; }, 0);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => { mainPushed = false; }));
        requestAnimationFrame(() => requestAnimationFrame(() => { settingsPushed = true; }));
        setTimeout(() => { mainOpen = false; }, 340);
        pageSlide.open();
      }
    } else {
      if (!settingsOpen) settingsOpen = true;
      mainOpen = true;
      if (immediate) {
        settingsPushed = false;
        mainPushed = true;
        pageSlide.open();
        setTimeout(() => { settingsOpen = false; }, 0);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => { settingsPushed = false; }));
        requestAnimationFrame(() => requestAnimationFrame(() => { mainPushed = true; }));
        setTimeout(() => { settingsOpen = false; }, 340);
        pageSlide.open();
      }
    }
  }


  const dispatch = createEventDispatcher();

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    const { route: initialRoute, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    router.navigate(route, { replace: true });
    syncPageSlide(route, true);
    ready = true;

    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
      syncPageSlide(route, false);
    });

    return () => {
      unbind?.();
      unsubscribePageSlide?.();
      pageSlide.destroy();
    };
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
    if (to === 'settings') { route = 'settings'; router.navigate('settings'); syncPageSlide('settings', false); return; }
    if (to === 'main' || to === APP_ID) { route = 'main'; router.navigate('main'); syncPageSlide('main', false); return; }
  }

  function handleUserUpdate(e) {
    const updated = e.detail || {};
    const stored = JSON.parse(localStorage.getItem('nexa_user') || 'null') || {};
    const merged = Object.assign({}, stored, updated);
    localStorage.setItem('nexa_user', JSON.stringify(merged));
    user = merged;
  }
</script>

{#if ready}
  {#if mainOpen}
    <MainPage pushed={mainPushed} {isDark} {user} appTitle={APP_TITLE} appId={APP_ID} iconPath={APP_ICON} on:nav={handleNav} on:userUpdate={handleUserUpdate} />
  {/if}
  {#if settingsOpen}
    <SettingsPage pushed={settingsPushed} {isDark} {user} appTitle={APP_TITLE} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) { --primary: #2F7BF6; }
  :global(*, *::before, *::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :global(html, body) { height:100%; }
  :global(body) { margin:0; padding:0; overflow:hidden; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; transition:background-color .3s ease, color .3s ease; }
  :global(#app) { width:100vw; height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; }
</style>