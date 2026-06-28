<script>
  import { currentTrack, playing, liked, toggleLike, playTrack, audioLoading } from '../store/music.js';
  
  export let track;
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let rank = null;
</script>

<button class="row" on:click={()=> playTrack(track)}>
  {#if rank !== null}
    <span class="rank" style="color:{txtSec}">{rank}</span>
  {/if}

  <div class="thumb-wrap">
    {#if track.album?.cover_medium}
      <img src={track.album.cover_medium} alt={track.title} class="thumb" loading="lazy" />
    {:else}
      <div class="thumb no-img" style="background:{bgCard}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
    {/if}
    {#if $currentTrack?.id === track.id}
      <div class="active-overlay">
        {#if $audioLoading}
          <div class="mini-spinner"></div>
        {:else if $playing}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </div>
    {/if}
  </div>

  <div class="info">
    <span class="title" style="color:{$currentTrack?.id===track.id?'#FC3C44':txtPrim}">{track.title}</span>
    <span class="artist" style="color:{txtSec}">{track.artist?.name}</span>
  </div>

  <button class="like-btn" on:click|stopPropagation={() => toggleLike(track.id)}>
    {#if $liked.has(track.id)}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="#FC3C44" stroke="#FC3C44" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    {/if}
  </button>
</button>

<style>
  .row { display:flex;align-items:center;gap:12px;padding:9px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%;transition:opacity .15s; }
  .row:active { opacity:0.6; }
  .rank { font-size:14px;font-weight:700;width:22px;text-align:center;flex-shrink:0; }
  .thumb-wrap { position:relative;flex-shrink:0; }
  .thumb { width:52px;height:52px;border-radius:8px;object-fit:cover;display:block; }
  .no-img { display:flex;align-items:center;justify-content:center; }
  .active-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.5);border-radius:8px;display:flex;align-items:center;justify-content:center; }
  .mini-spinner { width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .info { flex:1;min-width:0; }
  .title { display:block;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:13px;margin-top:2px; }
  .like-btn { width:32px;height:32px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .like-btn:active { opacity:0.5; }
</style>