<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.
  import { onMount, createEventDispatcher } from 'svelte';
  import '$shared/theme.css';
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

  const dispatch = createEventDispatcher();

  onMount(() => {
    const user = getUser();
    if (user?.token) { dispatch('nav', { to: 'home' }); return; }

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
      dispatch('nav', { to: 'home' });
    }
  }
</script>

{#if route === 'login'}
  <LoginPage    {isDark} on:nav={handleNav} />
{:else if route === 'register'}
  <RegisterPage {isDark} on:nav={handleNav} />
{/if}