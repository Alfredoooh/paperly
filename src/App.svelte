<script>
  import { onMount } from 'svelte';
  import { syncTheme } from './core/theme.js';
  import SplashPage     from './apps/splash/SplashPage.svelte';
  import LoginPage      from './apps/auth/LoginPage.svelte';
  import RegisterPage   from './apps/auth/RegisterPage.svelte';
  import ChatPage       from './apps/ai/ChatPage.svelte';
  import MusicPage      from './apps/music/MusicPage.svelte';
  import GamesPage      from './apps/games/GamesPage.svelte';
  import MediaPage      from './apps/media/MediaPage.svelte';
  import NewsPage       from './apps/news/NewsPage.svelte';
  import DownloaderPage from './apps/downloader/DownloaderPage.svelte';

  let route       = 'splash';
  let user        = null;
  let isDark      = false;
  let chatMounted = false;
  let ready       = false; // evita flash antes de ler localStorage

  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('nexa_theme');
    isDark = savedTheme === 'dark'
      ? true
      : savedTheme === 'light'
        ? false
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
    syncTheme(isDark);
  }

  onMount(() => {
    // ── Tema ──
    const saved = localStorage.getItem('nexa_theme');
    isDark = saved === 'dark' ? true
           : saved === 'light' ? false
           : window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme();

    // ── Utilizador — lê SEMPRE do localStorage no mount ──
    let savedUser = null;
    try { savedUser = JSON.parse(localStorage.getItem('nexa_user') || 'null'); } catch(e) {}
    if (!savedUser?.token) {
      try { savedUser = JSON.parse(localStorage.getItem('ipc_user') || 'null'); } catch(e) {}
    }
    if (savedUser?.token) {
      localStorage.removeItem('ipc_user');
      localStorage.setItem('nexa_user', JSON.stringify(savedUser));
      user        = savedUser;
      route       = 'chat';
      chatMounted = true;
    } else {
      route = 'login';
    }

    ready = true;

    window.addEventListener('beforeunload', () =>
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'));
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); isDark = !isDark; applyTheme(); }
    });
  });

  function applyTheme() {
    syncTheme(isDark);
  }

  // re-aplica tema sempre que isDark muda
  $: if (typeof document !== 'undefined') applyTheme();

  function handleNav(e) {
    const { to, data } = e.detail;

    if (data?.user) {
      user = data.user;
      localStorage.setItem('nexa_user', JSON.stringify(data.user));
    }
    if (data?.isDark !== undefined) {
      isDark = data.isDark;
      applyTheme();
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    }
    if (data?.logout) {
      user = null;
      localStorage.removeItem('nexa_user');
      chatMounted = false; // destrói o ChatPage para reset completo
    }
    if (to === 'chat' || to === 'ai') {
      chatMounted = true;
      route = 'chat';
      return;
    }
    route = to;
  }
</script>

<!-- Não renderiza nada até o mount terminar (evita flash de login) -->
{#if ready}

  {#if route === 'splash'}
    <SplashPage   {isDark} on:nav={handleNav} />
  {:else if route === 'login'}
    <LoginPage    {isDark} on:nav={handleNav} />
  {:else if route === 'register'}
    <RegisterPage {isDark} on:nav={handleNav} />
  {/if}

  <!--
    ChatPage fica sempre montado depois do primeiro login
    (display:none esconde sem destruir o estado)
    user é passado reactivamente — quando handleNav actualiza user,
    o ChatPage recebe o valor novo mesmo estando escondido
  -->
  {#if chatMounted}
    <div style="display:{route === 'chat' ? 'contents' : 'none'}">
      <ChatPage {isDark} {user} on:nav={handleNav} />
    </div>
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

{/if}

<style>
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
  :global(*,*::before,*::after) {
    box-sizing:border-box;
    -webkit-tap-highlight-color:transparent;
    -webkit-user-select:none;
    user-select:none;
  }
  :global(html,body) { height:100%; }
  :global(body) {
    font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
    margin:0; padding:0; overflow:hidden; width:100vw;
    position:fixed; height:100dvh;
    background:var(--bg-dark);
    color:var(--text-primary-dark);
    transition:background-color .3s ease,color .3s ease;
  }
  :global(body.light) { background:var(--bg-light); color:var(--text-primary-light); --surface2:#EFEFEF; }
  :global(body.dark)  { background:var(--bg-dark);  color:var(--text-primary-dark);  --surface2:#22222A; }
  :global(#app) { width:100vw; height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; background:var(--bg-dark); }
  :global(body.light #app) { background:var(--bg-light); }
  :global(body.dark #app) { background:var(--bg-dark); }
  :global(body.dark .chat-root),
  :global(body.dark .chat-root.dark),
  :global(body.dark .messages-wrap),
  :global(body.dark .empty-state),
  :global(body.dark .assistant-row),
  :global(body.dark .user-row),
  :global(body.dark .sheet),
  :global(body.dark .modal),
  :global(body.dark .panel),
  :global(body.dark .card),
  :global(body.dark .drawer),
  :global(body.dark .popup),
  :global(body.dark .dialog),
  :global(body.dark .content),
  :global(body.dark .container),
  :global(body.dark main),
  :global(body.dark section),
  :global(body.dark article),
  :global(body.dark nav),
  :global(body.dark header),
  :global(body.dark footer) {
    background:var(--bg-dark) !important;
    color:var(--text-primary-dark) !important;
  }
  :global(body.dark .bottom-bar.light),
  :global(body.dark .cd-box),
  :global(body.dark .conv-opts-card),
  :global(body.dark .rec-overlay),
  :global(body.dark .auth-page) {
    background:var(--surface-dark) !important;
  }
  :global(body.dark .rec-overlay) { background:var(--bg-dark) !important; }
  :global(body.dark .cd-overlay) { background:rgba(0,0,0,.4) !important; }
  :global(body.dark .appbar-gradient:not(.dark)) { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%) !important; }
</style>