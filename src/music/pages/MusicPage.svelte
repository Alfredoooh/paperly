<!-- src/music/pages/MusicPage.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Drawer           from '../components/Drawer.svelte';
  import HomePage         from './HomePage.svelte';
  import SearchPage       from './SearchPage.svelte';
  import SearchActivePage from './SearchActivePage.svelte';
  import LibraryPage      from './LibraryPage.svelte';
  import ArtistPage       from './ArtistPage.svelte';
  import MiniPlayer       from '../components/MiniPlayer.svelte';
  import FullPlayer       from '../components/FullPlayer.svelte';
  import { loadFeed, currentTrack, currentPage } from '../store/music.js';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: bg      = isDark ? '#121212' : '#ffffff';
  $: bgCard  = isDark ? '#1c1c1e' : '#f0f0f0';
  $: bgChip  = isDark ? '#2c2c2e' : '#e8e8e8';
  $: txtPrim = isDark ? '#ffffff' : '#000000';
  $: txtSec  = isDark ? '#8e8e93' : '#6c6c70';
  $: divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  let activeTab     = 'home';
  let drawerOpen    = false;
  let pulseTab      = null;
  let pulseSeq      = 0;
  let searchPrefill = '';
  let appbarHidden  = false;

  const menuItems = [
    { icon: 'home_outline', label: 'Início',    action: () => { activeTab = 'home'; currentPage.set('home'); drawerOpen = false; } },
    { icon: 'bookmark',     label: 'Guardados', action: () => {} },
    { icon: 'history',      label: 'Recentes',  action: () => {} },
  ];

  let feedTimer = null;
  onMount(() => {
    loadFeed();
    feedTimer = setInterval(loadFeed, 60 * 1000);
    return () => clearInterval(feedTimer);
  });

  $: themeProps       = { isDark, bg, bgCard, bgChip, txtPrim, txtSec, divider };
  $: showArtist       = $currentPage === 'artist';
  $: showSearchActive = $currentPage === 'search-active';
  $: hideChrome       = showArtist || showSearchActive;
  $: appbarTitle      = activeTab === 'home' ? 'Início' : activeTab === 'search' ? 'Pesquisa' : 'Biblioteca';

  // Appbar só recolhe ao deslizar quando estamos na aba de Pesquisa
  $: canAppbarHide = activeTab === 'search' && !hideChrome;
  $: if (!canAppbarHide) appbarHidden = false;

  function handleAppbarScroll(e) {
    if (!canAppbarHide) return;
    appbarHidden = e.detail.hidden;
  }

  function tapTab(id) {
    activeTab = id;
    currentPage.set(id);
    const seq = ++pulseSeq;
    pulseTab = id;
    setTimeout(() => { if (pulseSeq === seq) pulseTab = null; }, 380);
  }

  function openSearchActive(e) {
    searchPrefill = e?.detail?.prefillQuery || '';
    currentPage.set('search-active');
  }

  function closeSearchActive() {
    searchPrefill = '';
    currentPage.set('search');
  }
</script>

<div class="root" style="background:{bg};color:{txtPrim}">

  <Drawer {isDark} {user} open={drawerOpen} {menuItems}
    on:close={() => drawerOpen = false}
    on:openSettings={() => dispatch('nav', { to: 'settings' })} />

  {#if !hideChrome}
    <div class="appbar" class:appbar-hidden={appbarHidden} style="background:{bg}">
      <button class="icon-btn" on:click={() => drawerOpen = true}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
      </button>
      <span class="appbar-title" style="color:{txtPrim}">{appbarTitle}</span>
    </div>
  {/if}

  <div class="body">
    {#if showArtist}
      <ArtistPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if showSearchActive}
      <SearchActivePage {...themeProps} currentTrackExists={!!$currentTrack} prefillQuery={searchPrefill} on:close={closeSearchActive} />
    {:else if activeTab === 'home'}
      <HomePage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if activeTab === 'search'}
      <SearchPage {...themeProps} currentTrackExists={!!$currentTrack} on:openSearch={openSearchActive} on:scrollState={handleAppbarScroll} />
    {:else if activeTab === 'library'}
      <LibraryPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {/if}
  </div>

  {#if !hideChrome}
    <div class="bottom-chrome">
      <div class="bottom-bar-gradient" class:dark={isDark}></div>
      <div class="bottom-bar">
        <button class="tab-btn" on:click={() => tapTab('home')}>
          {#if pulseTab === 'home'}
            <span class="pulse-ring" style="background:{txtPrim}"></span>
          {/if}
          <svg class="tab-icon" viewBox="0 0 24 24" fill={activeTab === 'home' ? txtPrim : 'none'} stroke={activeTab === 'home' ? txtPrim : txtSec} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
          <span class="tab-label" style="color:{activeTab==='home'?txtPrim:txtSec}">Início</span>
        </button>

        <button class="tab-btn" on:click={() => tapTab('search')}>
          {#if pulseTab === 'search'}
            <span class="pulse-ring" style="background:{txtPrim}"></span>
          {/if}
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'search' ? txtPrim : txtSec} stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.4" y2="16.4" />
          </svg>
          <span class="tab-label" style="color:{activeTab==='search'?txtPrim:txtSec}">Pesquisa</span>
        </button>

        <button class="tab-btn" on:click={() => tapTab('library')}>
          {#if pulseTab === 'library'}
            <span class="pulse-ring" style="background:{txtPrim}"></span>
          {/if}
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'library' ? txtPrim : txtSec} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="6" x2="4" y2="18" />
            <line x1="9" y1="4" x2="9" y2="20" />
            <line x1="14" y1="7" x2="14" y2="17" />
            <path d="M19 6 21 18" transform="rotate(12 19 6)" />
          </svg>
          <span class="tab-label" style="color:{activeTab==='library'?txtPrim:txtSec}">Biblioteca</span>
        </button>
      </div>
    </div>
  {/if}

</div>

<MiniPlayer {bg} {bgCard} {txtPrim} {txtSec} {divider} hasBottomBar={!hideChrome} />
<FullPlayer />

<style>
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }
  .appbar {
    display:flex; align-items:center; gap:10px;
    padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;
    flex-shrink:0;
    transform:translateY(0);
    max-height:60px;
    transition:transform .22s ease, max-height .22s ease, padding .22s ease, opacity .22s ease;
    overflow:hidden;
  }
  .appbar.appbar-hidden {
    transform:translateY(-100%);
    max-height:0;
    padding-top:0; padding-bottom:0;
    opacity:0;
  }
  .appbar-title { font-size:22px; font-weight:900; letter-spacing:-.5px; }
  .icon-btn { width:36px; height:36px; border-radius:50%; border:none; background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity .15s; flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
  .body { flex:1; overflow:hidden; }

  .bottom-chrome { position:absolute; left:0; right:0; bottom:0; z-index:10; pointer-events:none; }

  .bottom-bar-gradient {
    position:absolute; left:0; right:0; bottom:0; height:130px;
  }
  .bottom-bar-gradient:not(.dark) {
    background:linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0) 100%);
  }
  .bottom-bar-gradient.dark {
    background:linear-gradient(to top, rgba(18,18,18,1) 0%, rgba(18,18,18,0.95) 40%, rgba(18,18,18,0) 100%);
  }

  .bottom-bar {
    position:absolute; left:0; right:0; bottom:0; z-index:11;
    display:flex; align-items:center; justify-content:space-around;
    padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));
    background:transparent;
    pointer-events:all;
  }

  .tab-btn { position:relative; display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; cursor:pointer; padding:4px 20px; transition:transform .15s; overflow:visible; }
  .tab-btn:active { transform:scale(0.88); }
  .pulse-ring { position:absolute; top:50%; left:50%; width:52px; height:52px; border-radius:50%; transform:translate(-50%,-50%) scale(0.3); opacity:0.18; pointer-events:none; animation:tabPulse .38s ease-out forwards; }
  @keyframes tabPulse { 0%{transform:translate(-50%,-50%) scale(0.3);opacity:0.22} 100%{transform:translate(-50%,-50%) scale(1.15);opacity:0} }
  .tab-icon { width:24px; height:24px; display:block; }
  .tab-label { font-size:10px; font-weight:500; }
  .svg-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>