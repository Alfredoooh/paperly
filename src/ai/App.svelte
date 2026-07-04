<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import ChatPage from './pages/ChatPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  import WidgetsPage from './pages/WidgetsPage.svelte';

  const BASE = '/ai/';
  const VALID_ROUTES = ['settings', 'widgets'];
  const router = createRouter(BASE, VALID_ROUTES, 'chat');

  let route = 'chat';
  let user = null;
  let isDark = false;
  let chatMounted = false;
  let ready = false;

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

    chatMounted = true;
    ready = true;

    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
    });

    window.addEventListener('beforeunload', () =>
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'));

    return unbind;
  });

  function persistTheme(nextIsDark) {
    isDark = !!nextIsDark;
    localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    syncTheme(isDark);
  }

  function goChat() {
    route = 'chat';
    router.navigate('chat');
  }

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (data?.isDark !== undefined) persistTheme(data.isDark);
    if (data?.logout) {
      localStorage.removeItem('nexa_user');
      window.location.href = '/auth/';
      return;
    }
    if (to === 'home') { window.location.href = '/home/'; return; }
    if (to === 'chat' || to === 'ai') { goChat(); return; }
    if (to === 'settings') { route = 'settings'; router.navigate('settings'); return; }
    if (to === 'widgets') { route = 'widgets'; router.navigate('widgets'); return; }
    route = to;
    router.navigate(to);
  }
</script>

{#if ready}
  {#if chatMounted}
    <div style="display:{route === 'chat' ? 'contents' : 'none'}">
      <ChatPage {isDark} {user} on:nav={handleNav} />
    </div>
  {/if}
  {#if route === 'settings'}
    <SettingsPage
      {isDark}
      {user}
      on:close={goChat}
      on:themeChange={(e) => persistTheme(e.detail.isDark)}
      on:logout={() => {
        localStorage.removeItem('nexa_user');
        window.location.href = '/auth/';
      }}
    />
  {:else if route === 'widgets'}
    <WidgetsPage {isDark} {user} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) {
    --primary: #2F7BF6;
  }
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  :global(html, body) { height: 100%; }
  :global(body) {
    margin: 0; padding: 0; overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  :global(#app) {
    width: 100vw; height: 100dvh;
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }
</style>