<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Drawer from '../components/Drawer.svelte';
  import HomePage from './pages/HomePage.svelte';
  import SearchPage from './pages/SearchPage.svelte';
  import LibraryPage from './pages/LibraryPage.svelte';
  import MiniPlayer from './components/MiniPlayer.svelte';
  import FullPlayer from './components/FullPlayer.svelte';
  import { loadFeed, currentTrack } from './store/music.js';
  
  export let isDark = false;
  export let user = null;
  
  const dispatch = createEventDispatcher();
  
  $: bg = isDark ? '#181818' : '#ffffff';
  $: bgCard = isDark ? '#242424' : '#f0f0f0';
  $: bgChip = isDark ? '#2a2a2a' : '#e8e8e8';
  $: txtPrim = isDark ? '#ffffff' : '#000000';
  $: txtSec = isDark ? '#aaaaaa' : '#777777';
  $: divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  
  let drawerOpen = false;
  let activeTab = 'home';
  
  const menuItems = [
    { icon: 'home_outline', label: 'Início', action: () => { activeTab = 'home';
        drawerOpen = false; } },
    { icon: 'bookmark', label: 'Guardados', action: () => {} },
    { icon: 'history', label: 'Recentes', action: () => {} },
  ];
  
  let feedTimer = null;
  onMount(() => {
    loadFeed();
    feedTimer = setInterval(loadFeed, 60 * 1000);
    return () => clearInterval(feedTimer);
  });
  
  $: themeProps = { isDark, bg, bgCard, bgChip, txtPrim, txtSec, divider };
</script>

<div class="root" style="background:{bg};color:{txtPrim}">
  
  <Drawer {isDark} {user} open={drawerOpen} {menuItems} on:close={()=> drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to:'settings' })} />
    
    <!-- APP BAR -->
    <div class="appbar" style="background:{bg};border-bottom:0.5px solid {divider}">
      <button class="icon-btn" on:click={()=> drawerOpen=true}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
      </button>
      <span class="appbar-title" style="color:{txtPrim}">Music</span>
      <div style="width:36px"></div>
    </div>
    
    <!-- BODY -->
    <div class="body">
      {#if activeTab === 'home'}
      <HomePage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if activeTab === 'search'}
      <SearchPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {:else if activeTab === 'library'}
      <LibraryPage {...themeProps} currentTrackExists={!!$currentTrack} />
    {/if}
  </div>

  <MiniPlayer {isDark} {bg} {bgCard} {txtPrim} {txtSec} {divider} />

  <!-- BOTTOM BAR -->
  <div class="bottom-bar" style="background:{bg};border-top:0.5px solid {divider}">
    {#each [['home','Home'],['search','Pesquisa'],['library','Biblioteca']] as [id,label]}
      <button class="tab-btn" on:click={() => activeTab=id}>
        {#if id === 'home'}
          <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
        {:else if id === 'search'}
          <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='search'?'magnifying_glass_filled':'magnifying_glass_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='search'?'magnifying_glass_filled':'magnifying_glass_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
            fill="{activeTab===id?(isDark?'#fff':'#000'):'none'}"
            stroke="{activeTab===id?txtPrim:txtSec}"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        {/if}
        <span class="tab-label" style="color:{activeTab===id?txtPrim:txtSec}">{label}</span>
      </button>
    {/each}
  </div>

</div>

<FullPlayer {isDark} />

<style>
  .root { position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }
  .appbar { display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;flex-shrink:0; }
  .appbar-title { font-size:17px;font-weight:700;letter-spacing:-.3px; }
  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
  .body { flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch; }
  .bottom-bar { flex-shrink:0;display:flex;align-items:center;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));position:relative;z-index:40; }
  .tab-btn { display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:4px 20px;transition:opacity .15s; }
  .tab-btn:active { opacity:0.6; }
  .tab-icon { width:24px;height:24px;display:block; }
  .tab-label { font-size:10px;font-weight:500; }
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>