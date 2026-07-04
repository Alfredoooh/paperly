<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import DownloaderPage from './pages/DownloaderPage.svelte';
  import SettingsPage   from './pages/SettingsPage.svelte';

  const BASE = '/downloader/';
  const VALID_ROUTES = ['settings'];
  const router = createRouter(BASE, VALID_ROUTES, 'main');

  let route  = 'main';
  let user   = null;
  let isDark = false;
  let ready  = false;

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
    ready = true;

    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
    });

    return unbind;
  });

  function handleNav(e) {
    const { to, data } = e.detail;
    if (data?.isDark !== undefined) {
      isDark = data.isDark;
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
      syncTheme(isDark);
    }
    if (data?.logout) { localStorage.removeItem('nexa_user'); window.location.href = '/auth/'; return; }
    if (to === 'home') { window.location.href = '/home/'; return; }
    if (to === 'settings') { route = 'settings'; router.navigate('settings'); return; }
    if (to === 'main' || to === 'downloader') { route = 'main'; router.navigate('main'); return; }
  }
</script>

{#if ready}
  {#if route === 'main'}
    <DownloaderPage {isDark} {user} on:nav={handleNav} />
  {:else if route === 'settings'}
    <SettingsPage {isDark} {user} on:nav={handleNav} />
  {/if}
{/if}