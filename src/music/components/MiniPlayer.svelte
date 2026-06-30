<!-- src/music/components/MiniPlayer.svelte -->
<script>
  import { currentTrack, playing, playerOpen, progress, duration, togglePlay, stopAll, audioLoading } from '../store/music.js';
  
  export let bgCard = '#1c1c1e';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let bg = '#181818';
  export let hasBottomBar = true; // false quando não há bottom-bar (busca ativa, artista)
  
  $: pct = $duration > 0 ? ($progress / $duration) * 100 : 0;
  
  function open() {
    playerOpen.set(true);
  }
</script>

{#if $currentTrack && !$playerOpen}
  <div class="mini-wrap" class:no-bar={!hasBottomBar}>
    <div class="mini-progress-track">
      <div class="mini-progress-fill" style="width:{pct}%"></div>
    </div>

    <button class="mini" style="background:{bgCard}" on:click={open}>

      <div class="thumb-wrap">
        {#if $currentTrack.album?.cover_medium}
          <img src={$currentTrack.album.cover_medium} alt={$currentTrack.title} class="thumb" />
        {:else}
          <div class="thumb no-img" style="background:{bg}">
            <span class="svg-mask" style="mask-image:url('/icons/svg/playlist_music.svg');-webkit-mask-image:url('/icons/svg/playlist_music.svg');background:{txtSec};width:16px;height:16px;"></span>
          </div>
        {/if}
      </div>

      <div class="info">
        <span class="title" style="color:{txtPrim}">{$currentTrack.title}</span>
        <span class="artist" style="color:{txtSec}">{$currentTrack.artist?.name}</span>
      </div>

      <div class="controls">
        {#if $audioLoading}
          <div class="spinner"></div>
        {:else}
          <button class="ctrl" on:click|stopPropagation={togglePlay}>
            {#if $playing}
              <span class="svg-mask" style="mask-image:url('/icons/svg/pause.svg');-webkit-mask-image:url('/icons/svg/pause.svg');background:{txtPrim};width:20px;height:20px;"></span>
            {:else}
              <span class="svg-mask" style="mask-image:url('/icons/svg/play.svg');-webkit-mask-image:url('/icons/svg/play.svg');background:{txtPrim};width:20px;height:20px;"></span>
            {/if}
          </button>
        {/if}
        <button class="ctrl" on:click|stopPropagation={stopAll}>
          <span class="svg-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{txtSec};width:16px;height:16px;"></span>
        </button>
      </div>

    </button>
  </div>
{/if}

<style>
  .mini-wrap {
    position:fixed;
    left:10px;right:10px;
    bottom:calc(env(safe-area-inset-bottom,0px) + 58px + 10px);
    border-radius:14px;
    overflow:hidden;
    z-index:65;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    transition:bottom .2s ease;
  }
  .mini-wrap.no-bar {
    bottom:calc(env(safe-area-inset-bottom,0px) + 10px);
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
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>