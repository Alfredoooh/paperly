<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { getUser } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import LoginPage from './LoginPage.svelte';
  import RegisterPage from './RegisterPage.svelte';

  const BASE = '/auth/';
  const VALID_ROUTES = ['login', 'register'];
  const router = createRouter(BASE, VALID_ROUTES, 'login');

  let route = 'login';
  let isDark = false;

  onMount(() => {
    const user = getUser();
    if (user?.token) { window.location.href = '/home/'; return; }

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    const { route: initialRoute, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    router.navigate(route, { replace: true });

    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
    });

    return unbind;
  });

  function handleNav(e) {
    const { to, data } = e.detail;
    if (to === 'register') { route = 'register'; router.navigate('register'); return; }
    if (to === 'login') { route = 'login'; router.navigate('login'); return; }
    if (to === 'home' || to === 'chat') {
      if (data?.user) localStorage.setItem('nexa_user', JSON.stringify(data.user));
      window.location.href = '/home/';
    }
  }
</script>

{#if route === 'login'}
  <LoginPage    {isDark} on:nav={handleNav} />
{:else if route === 'register'}
  <RegisterPage {isDark} on:nav={handleNav} />
{/if}