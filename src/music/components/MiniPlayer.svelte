<script>
  import { currentTrack, playing, playerOpen, progress, duration, togglePlay, stopAll, audioLoading } from '../store/music.js';
  
  export let bgCard = '#1c1c1e';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let bg = '#181818';
  
  $: pct = $duration > 0 ? ($progress / $duration) * 100 : 0;
</script>

{#if $currentTrack && !$playerOpen}
  <div class="mini-wrap">
    <!-- Progress bar at top -->
    <div class="mini-progress-track">
      <div class="mini-progress-fill" style="width:{pct}%"></div>
    </div>

    <button class="mini" style="background:{bgCard}"
      on:click={() => playerOpen.set(true)}>

      <!-- Album art -->
      <div class="thumb-wrap">
        {#if $currentTrack.album?.cover_medium}
          <img src={$currentTrack.album.cover_medium} alt={$currentTrack.title} class="thumb" />
        {:else}
          <div class="thumb no-img" style="background:{bg}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        {/if}
      </div>

      <!-- Info -->
      <div class="info">
        <span class="title" style="color:{txtPrim}">{$currentTrack.title}</span>
        <span class="artist" style="color:{txtSec}">{$currentTrack.artist?.name}</span>
      </div>

      <!-- Controls -->
      <div class="controls">
        {#if $audioLoading}
          <div class="spinner"></div>
        {:else}
          <button class="ctrl" on:click|stopPropagation={togglePlay}>
            {#if $playing}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
            {/if}
          </button>
        {/if}
        <button class="ctrl" on:click|stopPropagation={stopAll}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

    </button>
  </div>
{/if}

<style>
  .mini-wrap {
    position:absolute;
    left:10px;right:10px;
    bottom:calc(env(safe-area-inset-bottom,0px) + 58px + 10px);
    border-radius:14px;
    overflow:hidden;
    z-index:50;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  }
  .mini-progress-track {
    height:2px;
    background:rgba(255,255,255,0.12);
    position:relative;
  }
  .mini-progress-fill {
    height:100%;
    background:#FC3C44;
    transition:width .5s linear;
  }
  .mini {
    display:flex;align-items:center;gap:12px;
    padding:10px 12px;
    border:none;cursor:pointer;text-align:left;width:100%;
    backdrop-filter:blur(24px);
    -webkit-backdrop-filter:blur(24px);
  }
  .thumb-wrap { flex-shrink:0; }
  .thumb { width:44px;height:44px;border-radius:8px;object-fit:cover;display:block; }
  .no-img { display:flex;align-items:center;justify-content:center; }
  .info { flex:1;min-width:0; }
  .title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:12px;margin-top:1px; }
  .controls { display:flex;align-items:center;gap:4px; }
  .ctrl { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .ctrl:active { opacity:0.5; }
  .spinner { width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);border-top-color:#FC3C44;animation:spin .7s linear infinite;margin:0 8px; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>