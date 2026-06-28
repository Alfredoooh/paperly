<script>
  import { currentTrack, playing, playerOpen, togglePlay, stopAll } from '../store/music.js';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let bg = '#181818';
</script>

{#if $currentTrack && !$playerOpen}
  <div class="mini" style="background:{bgCard};border:0.5px solid {divider}"
    on:click={() => playerOpen.set(true)}>
    {#if $currentTrack.album?.cover_small}
      <img src={$currentTrack.album.cover_small} alt={$currentTrack.title} class="thumb" />
    {:else}
      <div class="thumb" style="background:{bg};display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
    {/if}
    <div class="info">
      <span class="title" style="color:{txtPrim}">{$currentTrack.title}</span>
      <span class="artist" style="color:{txtSec}">{$currentTrack.artist?.name}</span>
    </div>
    <button class="icon-btn" on:click|stopPropagation={togglePlay}>
      {#if $playing}
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
      {/if}
    </button>
    <button class="icon-btn" on:click|stopPropagation={stopAll}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
{/if}

<style>
  .mini { position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 56px + 12px);border-radius:16px;display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:50;box-shadow:0 4px 24px rgba(0,0,0,0.18); }
  .thumb { width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0; }
  .info { flex:1;min-width:0; }
  .title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:12px; }
  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
</style>