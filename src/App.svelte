<script>
  import { onMount } from 'svelte';
  import SplashPage from './apps/splash/SplashPage.svelte';
  import LoginPage from './apps/auth/LoginPage.svelte';
  import RegisterPage from './apps/auth/RegisterPage.svelte';
  import ChatPage from './apps/ai/ChatPage.svelte';
  import MusicPage from './apps/music/MusicPage.svelte';
  import GamesPage from './apps/games/GamesPage.svelte';
  import MediaPage from './apps/media/MediaPage.svelte';
  import NewsPage from './apps/news/NewsPage.svelte';
  import DownloaderPage from './apps/downloader/DownloaderPage.svelte';
  
  let route = 'splash';
  let user = null;
  let isDark = false;
  let chatMounted = false;
  let ready = false;
  
  onMount(() => {
    const saved = localStorage.getItem('nexa_theme');
    isDark = saved === 'dark' ? true :
      saved === 'light' ? false :
      window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    
    window.addEventListener('beforeunload', () =>
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'));
    
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
    
    if (to === 'chat' || to === 'ai') {
      chatMounted = true;
      route = 'chat';
      return;
    }
    
    route = to;
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
{/if}