<script>
  import { onMount } from 'svelte';
  import SplashPage     from './apps/splash/SplashPage.svelte';
  import LoginPage      from './apps/auth/LoginPage.svelte';
  import RegisterPage   from './apps/auth/RegisterPage.svelte';
  import ChatPage       from './apps/ai/ChatPage.svelte';
  import MusicPage      from './apps/music/MusicPage.svelte';
  import GamesPage      from './apps/games/GamesPage.svelte';
  import MediaPage      from './apps/media/MediaPage.svelte';
  import NewsPage       from './apps/news/NewsPage.svelte';
  import DownloaderPage from './apps/downloader/DownloaderPage.svelte';

  let route  = 'splash';
  let user   = null;
  let isDark = false;
  let chatMounted = false;

  onMount(() => {
    const saved = localStorage.getItem('nexa_theme');
    isDark = saved === 'dark' ? true : saved === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme();
    let savedUser = null;
    try { savedUser = JSON.parse(localStorage.getItem('nexa_user') || 'null'); } catch(e) {}
    if (!savedUser?.token) {
      try { savedUser = JSON.parse(localStorage.getItem('ipc_user') || 'null'); } catch(e) {}
    }
    if (savedUser?.token) {
      localStorage.removeItem('ipc_user');
      localStorage.setItem('nexa_user', JSON.stringify(savedUser));
      user = savedUser;
      route = 'chat';
      chatMounted = true;
    } else {
      route = 'login';
    }
    window.addEventListener('beforeunload', () => localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'));
    document.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'd') { e.preventDefault(); isDark = !isDark; applyTheme(); } });
  });

  function applyTheme() {
    document.body.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark',   isDark);
  }

  $: { if (typeof document !== 'undefined') applyTheme(); }

  function handleNav(e) {
    const { to, data } = e.detail;
    if (data?.user)               { user = data.user; localStorage.setItem('nexa_user', JSON.stringify(data.user)); }
    if (data?.isDark !== undefined){ isDark = data.isDark; applyTheme(); localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'); }
    if (data?.logout)             { user = null; localStorage.removeItem('nexa_user'); }
    if (to === 'chat') chatMounted = true;
    route = to;
  }

  $: chatHidden = route !== 'chat';
</script>

{#if route === 'splash'}
  <SplashPage     {isDark} on:nav={handleNav} />
{:else if route === 'login'}
  <LoginPage      {isDark} on:nav={handleNav} />
{:else if route === 'register'}
  <RegisterPage   {isDark} on:nav={handleNav} />
{/if}

{#if chatMounted}
  <ChatPage {isDark} {user} hidden={chatHidden} on:nav={handleNav} />
{/if}

{#if route === 'music'}
  <MusicPage      {isDark} {user} on:nav={handleNav} />
{:else if route === 'games'}
  <GamesPage      {isDark} {user} on:nav={handleNav} />
{:else if route === 'media'}
  <MediaPage      {isDark} {user} on:nav={handleNav} />
{:else if route === 'news'}
  <NewsPage       {isDark} {user} on:nav={handleNav} />
{:else if route === 'downloader'}
  <DownloaderPage {isDark} {user} on:nav={handleNav} />
{/if}

<style>
  :global(@font-face) {
    font-family: 'TimesNewRoman';
    src: url('/fonts/pattern/times_new_roman.ttf') format('truetype');
  }
  :global(:root) {
    --primary:#2F7BF6;
    --bg-light:#F9FAFB; --bg-dark:#0F0F0F;
    --surface-light:#FFFFFF; --surface-dark:#1C1C1E;
    --text-primary-light:#1F2937; --text-primary-dark:#F3F4F6;
    --text-secondary-light:#6B7280; --text-secondary-dark:#9CA3AF;
    --text-hint-light:#B0B0B0; --text-hint-dark:#6B6B6B;
    --divider-light:#E5E7EB; --divider-dark:#2C2C2E;
    --drawer-bg-light:#F3F4F6; --drawer-bg-dark:#141414;
    --bottom-bar-light:#FFFFFF; --bottom-bar-dark:#1C1C1E;
    --dialog-bg-light:#FFFFFF; --dialog-bg-dark:#1C1C1E;
    --add-circle-bg-light:#F3F4F6; --add-circle-bg-dark:#2C2C2E;
    --user-bubble-bg-light:#EEF2FF; --user-bubble-bg-dark:#1E1E2E;
  }
  :global(*,*::before,*::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; -webkit-user-select:none; user-select:none; }
  :global(html,body) { height:100%; }
  :global(body) {
    font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
    margin:0; padding:0; overflow:hidden; width:100vw;
    position:fixed; height:100dvh;
    transition:background-color .3s ease,color .3s ease;
  }
  :global(body.light) { background:var(--bg-light); color:var(--text-primary-light); --surface2:#EFEFEF; }
  :global(body.dark)  { background:var(--bg-dark);  color:var(--text-primary-dark);  --surface2:#22222A; }
  :global(#app) { width:100vw; height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; }
</style>