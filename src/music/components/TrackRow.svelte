<script>
  import { currentTrack, playing, liked, toggleLike, playTrack } from '../store/music.js';
  
  export let track;
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  
  $: active = $currentTrack?.id === track?.id;
</script>

<button class="track-row" on:click={()=> playTrack(track)}>
  <div class="thumb-wrap">
    {#if track.album?.cover_small}
      <img src={track.album.cover_small} alt={track.title} class="thumb" loading="lazy" />
    {:else}
      <div class="thumb" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
    {/if}
    {#if active && $playing}
      <div class="playing-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      </div>
    {/if}
  </div>
  <div class="info">
    <span class="title" style="color:{active?'#E8002D':txtPrim}">{track.title}</span>
    <span class="artist" style="color:{txtSec}">{track.artist?.name}</span>
  </div>
  <button class="icon-sm" on:click|stopPropagation={() => toggleLike(track.id)}>
    {#if $liked.has(track.id)}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#E8002D" stroke="#E8002D" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    {/if}
  </button>
</button>

<style>
  .track-row { display:flex;align-items:center;gap:12px;padding:10px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .track-row:active { opacity:0.7; }
  .thumb-wrap { position:relative;flex-shrink:0; }
  .thumb { width:50px;height:50px;border-radius:8px;object-fit:cover;display:block; }
  .playing-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.45);border-radius:8px;display:flex;align-items:center;justify-content:center; }
  .info { flex:1;min-width:0; }
  .title { display:block;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:13px;margin-top:2px; }
  .icon-sm { width:32px;height:32px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .icon-sm:active { opacity:0.5; }
</style>