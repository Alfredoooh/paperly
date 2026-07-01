<!-- src/music/pages/MusicPage.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Drawer from '../components/Drawer.svelte';
  import HomePage    from './HomePage.svelte';
  import SearchPage  from './SearchPage.svelte';
  import SearchActivePage from './SearchActivePage.svelte';
  import LibraryPage from './LibraryPage.svelte';
  import ArtistPage  from './ArtistPage.svelte';
  import MiniPlayer  from '../components/MiniPlayer.svelte';
  import FullPlayer  from '../components/FullPlayer.svelte';
  import { loadFeed, currentTrack, currentPage, debugLog } from '../store/music.js';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: bg      = isDark ? '#121212' : '#ffffff';
  $: bgCard  = isDark ? '#1c1c1e' : '#f0f0f0';
  $: bgChip  = isDark ? '#2c2c2e' : '#e8e8e8';
  $: txtPrim = isDark ? '#ffffff' : '#000000';
  $: txtSec  = isDark ? '#8e8e93' : '#6c6c70';
  $: divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  let activeTab  = 'home';
  let drawerOpen = false;
  let pulseTab   = null;
  let pulseSeq   = 0;
  let showDebug  = true;

  $: if ($currentPage === 'home' && activeTab !== 'home') {}
  $: if ($currentPage === 'artist') {}

  const menuItems = [
    { icon: 'home_outline', label: 'Início', action: () => { activeTab='home'; currentPage.set('home'); drawerOpen=false; } },
    { icon: 'bookmark',     label: 'Guardados', action: () => {} },
    { icon: 'history',      label: 'Recentes',  action: () => {} },
  ];

  let feedTimer = null;
  onMount(() => {
    loadFeed();
    feedTimer = setInterval(loadFeed, 60 * 1000);
    return () => clearInterval(feedTimer);
  });

  $: themeProps = { isDark, bg, bgCard, bgChip, txtPrim, txtSec, divider };
  $: showArtist = $currentPage === 'artist';
  $: showSearchActive = $currentPage === 'search-active';
  $: hideChrome = showArtist || showSearchActive;

  $: appbarTitle = activeTab === 'home' ? 'Início' : activeTab === 'search' ? 'Pesquisa' : 'Biblioteca';

  function tapTab(id) {
    activeTab = id;
    currentPage.set(id);
    const seq = ++pulseSeq;
    pulseTab = id;
    setTimeout(() => { if (pulseSeq === seq) pulseTab = null; }, 380);
  }

  function openSearchActive() {
    currentPage.set('search-active');
  }

  function closeSearchActive() {
    currentPage.set('search');
  }
</script>

<div class="root" style="background:{bg};color:{txtPrim}">

  <Drawer {isDark} {user} open={drawerOpen} {menuItems}
    on:close={() => drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to:'settings' })} />

  {#if !hideChrome}
    <div class="appbar" style="background:{bg}">
      <button class="icon-btn" on:click={() => drawerOpen=true}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
      </button>
      <span class="appbar-title" style="color:{txtPrim}">{appbarTitle}</span>
    </div>
  {/if}

  <div class="body">
    {#if showArtist}
      <ArtistPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if showSearchActive}
      <SearchActivePage {...themeProps} currentTrackExists={!!$currentTrack} on:close={closeSearchActive} />
    {:else if activeTab === 'home'}
      <HomePage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if activeTab === 'search'}
      <SearchPage {...themeProps} currentTrackExists={!!$currentTrack} on:openSearch={openSearchActive} />
    {:else if activeTab === 'library'}
      <LibraryPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {/if}
  </div>

  {#if !hideChrome}
    <div class="bottom-bar" style="background:{isDark ? 'rgba(18,18,18,0.72)' : 'rgba(255,255,255,0.72)'}">
      {#each [['home','Home'],['search','Pesquisa'],['library','Biblioteca']] as [id,label]}
        <button class="tab-btn" on:click={() => tapTab(id)}>
          {#if pulseTab === id}
            <span class="pulse-ring" style="background:{txtPrim}"></span>
          {/if}
          {#if id === 'home'}
            <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
          {:else if id === 'search'}
            <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='search'?'search_filled':'search'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='search'?'search_filled':'search'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
          {:else}
            <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='library'?'librar_filled':'librar_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='library'?'librar_filled':'librar_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
          {/if}
          <span class="tab-label" style="color:{activeTab===id?txtPrim:txtSec}">{label}</span>
        </button>
      {/each}
    </div>
  {/if}

</div>

<MiniPlayer {bg} {bgCard} {txtPrim} {txtSec} {divider} hasBottomBar={!hideChrome} />

<FullPlayer />

{#if showDebug}
  <div class="debug-panel">
    <div class="debug-header">
      <span>DEBUG</span>
      <button on:click={() => showDebug = false}>✕</button>
    </div>
    <div class="debug-body">
      {#each $debugLog as line}
        <div class="debug-line">{line}</div>
      {/each}
      {#if $debugLog.length === 0}
        <div class="debug-line dim">Aguardando... clica em play numa música</div>
      {/if}
    </div>
  </div>
{:else}
  <button class="debug-toggle" on:click={() => showDebug = true}>DEBUG</button>
{/if}

<style>
  .root { position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }
  .appbar { display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;flex-shrink:0; }
  .appbar-title { font-size:22px;font-weight:900;letter-spacing:-.5px; }
  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
  .body { flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch; }
  .bottom-bar { flex-shrink:0;display:flex;align-items:center;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));position:relative;z-index:40;backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px); }
  .tab-btn { position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:4px 20px;transition:transform .15s; overflow:visible; }
  .tab-btn:active { transform:scale(0.88); }
  .pulse-ring { position:absolute;top:50%;left:50%;width:52px;height:52px;border-radius:50%;transform:translate(-50%,-50%) scale(0.3);opacity:0.18;pointer-events:none;animation:tabPulse .38s ease-out forwards; }
  @keyframes tabPulse { 0% { transform:translate(-50%,-50%) scale(0.3); opacity:0.22; } 100% { transform:translate(-50%,-50%) scale(1.15); opacity:0; } }
  .tab-icon { width:24px;height:24px;display:block; }
  .tab-label { font-size:10px;font-weight:500; }
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }

  .debug-panel { position:fixed;left:8px;right:8px;bottom:8px;max-height:40vh;background:rgba(0,0,0,0.92);border-radius:10px;z-index:9999;display:flex;flex-direction:column;font-family:monospace;box-shadow:0 4px 20px rgba(0,0,0,0.5); }
  .debug-header { display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.15);color:#0f0;font-size:11px;font-weight:700;letter-spacing:1px; }
  .debug-header button { background:none;border:none;color:#fff;font-size:14px;cursor:pointer;padding:2px 8px; }
  .debug-body { overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:4px; }
  .debug-line { color:#0f0;font-size:10.5px;word-break:break-all;line-height:1.4; }
  .debug-line.dim { color:#777; }
  .debug-toggle { position:fixed;right:12px;bottom:12px;z-index:9999;background:rgba(0,0,0,0.85);color:#0f0;border:1px solid #0f0;border-radius:6px;padding:6px 10px;font-size:10px;font-weight:700;font-family:monospace; }
</style>