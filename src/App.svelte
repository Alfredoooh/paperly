<script>
  import { onMount } from 'svelte';
  import { getThemeColors } from './core/theme.js';
  import { DRAWER_APPS } from './core/plans.js';
  import SplashPage     from './apps/splash/SplashPage.svelte';
  import LoginPage      from './apps/auth/LoginPage.svelte';
  import RegisterPage   from './apps/auth/RegisterPage.svelte';
  import ChatPage       from './apps/ai/ChatPage.svelte';
  import MusicPage      from './apps/music/MusicPage.svelte';
  import GamesPage      from './apps/games/GamesPage.svelte';
  import MediaPage      from './apps/media/MediaPage.svelte';
  import NewsPage       from './apps/news/NewsPage.svelte';
  import DownloaderPage from './apps/downloader/DownloaderPage.svelte';
  import ModalSheet     from './apps/shared/ModalSheet.svelte';
  import AppsSheet      from './apps/shared/AppsSheet.svelte';

  let route       = 'splash';
  let user        = null;
  let isDark      = false;
  let chatMounted = false;
  let ready       = false;
  let showAppsSheet = false;

  $: c = getThemeColors(isDark);
  $: currentAppId = route === 'chat' ? 'ai' : route;
  $: currentApp = DRAWER_APPS.find(a => a.id === currentAppId) || DRAWER_APPS[0];
  $: showGlobalBottomBar = ready && !['splash', 'login', 'register', 'chat'].includes(route);

  onMount(() => {
    const saved = localStorage.getItem('nexa_theme');
    isDark = saved === 'dark' ? true
           : saved === 'light' ? false
           : window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme();

    let savedUser = null;
    try { savedUser = JSON.parse(localStorage.getItem('nexa_user') || 'null'); } catch (e) {}
    if (!savedUser?.token) {
      try { savedUser = JSON.parse(localStorage.getItem('ipc_user') || 'null'); } catch (e) {}
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

    ready = true;

    window.addEventListener('beforeunload', () => {
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        isDark = !isDark;
        applyTheme();
      }
    });
  });

  function applyTheme() {
    document.body.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
  }

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
      chatMounted = false;
    }

    if (to === 'chat') {
      chatMounted = true;
    }

    route = to;
    if (to !== 'chat') showAppsSheet = false;
  }

  function switchToApp(id) {
    showAppsSheet = false;
    if (id === 'ai') {
      route = 'chat';
      chatMounted = true;
      return;
    }
    route = id;
  }
</script>

{#if ready}
  {#if route === 'splash'}
    <SplashPage {isDark} on:nav={handleNav} />
  {:else if route === 'login'}
    <LoginPage {isDark} on:nav={handleNav} />
  {:else if route === 'register'}
    <RegisterPage {isDark} on:nav={handleNav} />
  {/if}

  {#if chatMounted}
    <div style="display:{route === 'chat' ? 'contents' : 'none'}">
      <ChatPage {isDark} {user} on:nav={handleNav} />
    </div>
  {/if}

  {#if route === 'music'}
    <MusicPage {isDark} {user} on:nav={handleNav} />
  {:else if route === 'games'}
    <GamesPage {isDark} {user} on:nav={handleNav} />
  {:else if route === 'media'}
    <MediaPage {isDark} {user} on:nav={handleNav} />
  {:else if route === 'news'}
    <NewsPage {isDark} {user} on:nav={handleNav} />
  {:else if route === 'downloader'}
    <DownloaderPage {isDark} {user} on:nav={handleNav} />
  {/if}

  {#if showGlobalBottomBar}
    <div class="global-bottom-bar">
      <button class="apps-pill pulse-tap" style="background:{c.tabPreviewPillBg};color:{c.textPrimary};border-color:{c.divider}" on:click={() => showAppsSheet = true}>
        <img src={currentApp.icon} alt="" class="apps-pill-icon" />
        <span>Apps</span>
      </button>
    </div>
  {/if}

  {#if showAppsSheet}
    <ModalSheet {isDark} open={showAppsSheet} on:close={() => showAppsSheet = false}>
      <AppsSheet {isDark} currentApp={currentAppId} on:selectApp={(e) => switchToApp(e.detail.id)} />
    </ModalSheet>
  {/if}
{/if}

<style>
  :global(:root) {
    --primary:#4B83FF;
    --bg-light:#FAFCFF;
    --bg-dark:#070A10;
    --surface-light:#FFFFFF;
    --surface-dark:#0F141D;
    --text-primary-light:#0B1220;
    --text-primary-dark:#F5F7FB;
    --text-secondary-light:#6F7783;
    --text-secondary-dark:#A2A9B6;
    --text-hint-light:#7A8391;
    --text-hint-dark:#748092;
    --divider-light:#E7EBF2;
    --divider-dark:#253043;
    --drawer-bg-light:#FFFFFF;
    --drawer-bg-dark:#0F141D;
    --bottom-bar-light:#FFFFFF;
    --bottom-bar-dark:#0F141D;
    --dialog-bg-light:#FFFFFF;
    --dialog-bg-dark:#111827;
    --add-circle-bg-light:#EEF2F8;
    --add-circle-bg-dark:#1A2231;
    --user-bubble-bg-light:#EAF1FF;
    --user-bubble-bg-dark:#152235;
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
    margin:0;
    padding:0;
    overflow:hidden;
    width:100vw;
    position:fixed;
    height:100dvh;
    transition:background-color .3s ease,color .3s ease;
  }
  :global(body.light) {
    background:var(--bg-light);
    color:var(--text-primary-light);
    --surface2:#EFF3F9;
  }
  :global(body.dark) {
    background:var(--bg-dark);
    color:var(--text-primary-dark);
    --surface2:#18202D;
  }
  :global(#app) {
    width:100vw;
    height:100dvh;
    display:flex;
    flex-direction:column;
    position:relative;
    overflow:hidden;
  }

  .global-bottom-bar {
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:180;
    display:flex;
    justify-content:center;
    padding:12px 16px calc(14px + env(safe-area-inset-bottom));
    pointer-events:none;
  }
  .apps-pill {
    pointer-events:auto;
    min-width: 150px;
    height: 52px;
    padding: 0 18px 0 14px;
    border-radius: 999px;
    border: 1px solid;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    box-shadow: 0 18px 32px rgba(0,0,0,0.12);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    font-size: 14px;
    font-weight: 800;
    cursor:pointer;
  }
  .apps-pill:active { transform: scale(0.98); opacity: .92; }
  .apps-pill-icon {
    width: 28px;
    height: 28px;
    object-fit: cover;
    border-radius: 10px;
    flex-shrink:0;
  }
</style>
