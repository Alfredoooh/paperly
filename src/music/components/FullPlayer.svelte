<script>
  import {
    currentTrack, playing, progress, duration, playerOpen,
    shuffle, repeatMode, liked,
    togglePlay, seekTo, toggleLike, playNext, playPrev,
    lyrics, lyricsLoading
  } from '../store/music.js';

  export let isDark = false;

  let showLyrics = false;

  const gradients = ['#1a1a2e','#16213e','#0f3460','#1b1b2f','#2c003e','#1a0a00','#001a00','#001a1a'];
  $: gradient = gradients[($currentTrack?.id || 0) % gradients.length];

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }

  function fmtTime(s) {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }
</script>

{#if $playerOpen && $currentTrack}
  <div class="screen" style="background:{gradient}">

    <!-- Header -->
    <div class="header">
      <button class="icon-btn" on:click={() => playerOpen.set(false)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="header-center">
        <span class="header-label">A reproduzir</span>
        <span class="header-sub">{$currentTrack.artist?.name}</span>
      </div>
      <button class="icon-btn" on:click={() => showLyrics = !showLyrics}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{showLyrics?'#E8002D':'rgba(255,255,255,0.6)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>

    {#if showLyrics}
      <!-- Letras -->
      <div class="lyrics-wrap">
        {#if $lyricsLoading}
          <div class="lyrics-center">
            <div class="spinner"></div>
          </div>
        {:else if $lyrics}
          <div class="lyrics-text">{$lyrics}</div>
        {:else}
          <div class="lyrics-center">
            <span class="lyrics-empty">Letra não disponível</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Capa -->
      <div class="cover-wrap">
        {#if $currentTrack.album?.cover_big || $currentTrack.album?.cover_medium}
          <img src={$currentTrack.album.cover_big || $currentTrack.album.cover_medium} alt={$currentTrack.title} class="cover" />
        {:else}
          <div class="cover" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Info + Like -->
    <div class="info-row">
      <div class="info">
        <span class="track-title">{$currentTrack.title}</span>
        <span class="track-artist">{$currentTrack.artist?.name}</span>
      </div>
      <button class="icon-btn" on:click={() => toggleLike($currentTrack.id)}>
        {#if $liked.has($currentTrack.id)}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#E8002D" stroke="#E8002D" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {/if}
      </button>
    </div>

    <!-- Progress -->
    <div class="progress-wrap">
      <div class="progress-track" on:click={handleSeek}>
        <div class="progress-fill" style="width:{$duration>0?($progress/$duration)*100:0}%"></div>
        <div class="progress-thumb" style="left:{$duration>0?($progress/$duration)*100:0}%"></div>
      </div>
      <div class="times">
        <span>{fmtTime($progress)}</span>
        <span>{fmtTime($duration)}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="ctrl-sm" on:click={() => shuffle.update(s => !s)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{$shuffle?'#E8002D':'rgba(255,255,255,0.6)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
      </button>
      <button class="ctrl-md" on:click={playPrev}>
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="19,20 9,12 19,4"/><rect x="5" y="4" width="2" height="16" rx="1"/></svg>
      </button>
      <button class="play-btn" on:click={togglePlay}>
        {#if $playing}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="{gradient}" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="{gradient}" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </button>
      <button class="ctrl-md" on:click={playNext}>
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,4 15,12 5,20"/><rect x="17" y="4" width="2" height="16" rx="1"/></svg>
      </button>
      <button class="ctrl-sm" on:click={() => repeatMode.update(r => (r+1)%3)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{$repeatMode>0?'#E8002D':'rgba(255,255,255,0.6)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </button>
    </div>

  </div>
{/if}

<style>
  .screen { position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 10px) 24px calc(env(safe-area-inset-bottom,0px) + 24px);transition:background .4s; }
  .header { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
  .header-center { flex:1;text-align:center; }
  .header-label { display:block;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:.04em; }
  .header-sub { display:block;font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px; }
  .cover-wrap { flex:1;display:flex;align-items:center;justify-content:center;margin-bottom:24px; }
  .cover { width:min(75vw,320px);height:min(75vw,320px);border-radius:16px;object-fit:cover;box-shadow:0 24px 64px rgba(0,0,0,0.5); }
  .lyrics-wrap { flex:1;overflow-y:auto;margin-bottom:24px;padding:0 4px; }
  .lyrics-text { font-size:16px;line-height:1.8;color:rgba(255,255,255,0.85);white-space:pre-wrap; }
  .lyrics-center { display:flex;align-items:center;justify-content:center;height:100%; }
  .lyrics-empty { color:rgba(255,255,255,0.4);font-size:15px; }
  .spinner { width:24px;height:24px;border-radius:50%;border:3px solid rgba(255,255,255,0.2);border-top-color:#fff;animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .info-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
  .info { min-width:0;flex:1; }
  .track-title { display:block;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .track-artist { display:block;font-size:15px;color:rgba(255,255,255,0.65);margin-top:4px; }
  .progress-wrap { margin-bottom:16px; }
  .progress-track { position:relative;height:4px;border-radius:999px;background:rgba(255,255,255,0.2);cursor:pointer;margin-bottom:8px; }
  .progress-fill { height:100%;border-radius:999px;background:#fff;transition:width .5s linear; }
  .progress-thumb { position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff; }
  .times { display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.5); }
  .controls { display:flex;align-items:center;justify-content:space-between; }
  .ctrl-sm { width:40px;height:40px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .ctrl-sm:active { opacity:0.6; }
  .ctrl-md { width:52px;height:52px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .ctrl-md:active { opacity:0.6; }
  .play-btn { width:68px;height:68px;border-radius:50%;border:none;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3); }
  .play-btn:active { transform:scale(0.95); }
  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
</style>