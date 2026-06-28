<script>
  import {
    currentTrack, playing, progress, duration, playerOpen,
    shuffle, repeatMode, liked, audioLoading,
    togglePlay, seekTo, toggleLike, playNext, playPrev,
    lyrics, lyricsLoading
  } from '../store/music.js';

  let showLyrics = false;
  let tab = 'player'; // player | lyrics | queue

  $: pct = $duration > 0 ? ($progress / $duration) * 100 : 0;
  $: coverUrl = $currentTrack?.album?.cover_big || $currentTrack?.album?.cover_medium || null;

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function handleClose() { playerOpen.set(false); }
</script>

{#if $playerOpen && $currentTrack}
  <div class="screen">

    <!-- Blurred background -->
    <div class="bg-blur">
      {#if coverUrl}
        <img src={coverUrl} alt="" class="bg-img" />
      {:else}
        <div class="bg-fallback"></div>
      {/if}
      <div class="bg-overlay"></div>
    </div>

    <!-- Header -->
    <div class="header">
      <button class="icon-btn" on:click={handleClose}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="header-center">
        <span class="header-label">A reproduzir agora</span>
      </div>
      <button class="icon-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      {#each [['player','Player'],['lyrics','Letra'],['queue','Fila']] as [id,label]}
        <button class="tab-btn" style="color:{tab===id?'#fff':'rgba(255,255,255,0.4)'};border-bottom:2px solid {tab===id?'#FC3C44':'transparent'}"
          on:click={() => tab=id}>{label}</button>
      {/each}
    </div>

    {#if tab === 'player'}

      <!-- Cover -->
      <div class="cover-wrap">
        {#if coverUrl}
          <img src={coverUrl} alt={$currentTrack.title} class="cover" />
        {:else}
          <div class="cover no-cover">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        {/if}
      </div>

      <!-- Info + like -->
      <div class="info-row">
        <div class="info">
          <span class="track-title">{$currentTrack.title}</span>
          <span class="track-artist">{$currentTrack.artist?.name}</span>
        </div>
        <button class="icon-btn" on:click={() => toggleLike($currentTrack.id)}>
          {#if $liked.has($currentTrack.id)}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FC3C44" stroke="#FC3C44" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {/if}
        </button>
      </div>

      <!-- Progress -->
      <div class="progress-wrap">
        <button class="progress-track" on:click={handleSeek}>
          <div class="progress-fill" style="width:{pct}%"></div>
          <div class="progress-thumb" style="left:{pct}%"></div>
        </button>
        <div class="times">
          <span>{fmtTime($progress)}</span>
          {#if $audioLoading}
            <span style="color:rgba(255,255,255,0.4);font-size:11px">A carregar…</span>
          {:else}
            <span>{fmtTime($duration)}</span>
          {/if}
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button class="ctrl-sm" on:click={() => shuffle.update(s => !s)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{$shuffle?'#FC3C44':'rgba(255,255,255,0.5)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
        </button>
        <button class="ctrl-md" on:click={playPrev}>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="19,20 9,12 19,4"/><rect x="5" y="4" width="2.5" height="16" rx="1"/></svg>
        </button>
        <button class="play-btn" on:click={togglePlay} disabled={$audioLoading}>
          {#if $audioLoading}
            <div class="play-spinner"></div>
          {:else if $playing}
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#1c1c1e" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#1c1c1e" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
          {/if}
        </button>
        <button class="ctrl-md" on:click={playNext}>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,4 15,12 5,20"/><rect x="16.5" y="4" width="2.5" height="16" rx="1"/></svg>
        </button>
        <button class="ctrl-sm" on:click={() => repeatMode.update(r => (r+1)%3)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{$repeatMode>0?'#FC3C44':'rgba(255,255,255,0.5)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          {#if $repeatMode === 2}
            <span class="repeat-badge">1</span>
          {/if}
        </button>
      </div>

      <!-- Bottom actions -->
      <div class="actions">
        <button class="action-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Partilhar</span>
        </button>
        <button class="action-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Download</span>
        </button>
        <button class="action-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Playlist</span>
        </button>
      </div>

    {:else if tab === 'lyrics'}
      <div class="lyrics-wrap">
        {#if $lyricsLoading}
          <div class="lyrics-center"><div class="lyrics-spinner"></div></div>
        {:else if $lyrics}
          <p class="lyrics-text">{$lyrics}</p>
        {:else}
          <div class="lyrics-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="lyrics-empty">Letra não disponível</span>
          </div>
        {/if}
      </div>

    {:else if tab === 'queue'}
      <div class="queue-wrap">
        <p class="queue-label">A seguir</p>
        <!-- Queue placeholder -->
        <div class="lyrics-center">
          <span class="lyrics-empty">Fila em breve</span>
        </div>
      </div>
    {/if}

  </div>
{/if}

<style>
  .screen { position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 10px) 20px calc(env(safe-area-inset-bottom,0px) + 20px);overflow:hidden; }

  /* Blurred background */
  .bg-blur { position:absolute;inset:0;z-index:0;overflow:hidden; }
  .bg-img { width:100%;height:100%;object-fit:cover;filter:blur(60px) saturate(1.8) brightness(0.4);transform:scale(1.2); }
  .bg-fallback { width:100%;height:100%;background:#1a1a2e; }
  .bg-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.45); }

  /* All content above bg */
  .header,.tabs,.cover-wrap,.info-row,.progress-wrap,.controls,.actions,.lyrics-wrap,.queue-wrap { position:relative;z-index:1; }

  .header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
  .header-center { flex:1;text-align:center; }
  .header-label { font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:.04em; }

  .tabs { display:flex;gap:0;margin-bottom:16px;border-bottom:0.5px solid rgba(255,255,255,0.1); }
  .tab-btn { flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:8px 0;font-size:14px;font-weight:600;cursor:pointer;color:rgba(255,255,255,0.4);font-family:inherit;transition:color .2s;margin-bottom:-0.5px; }

  .cover-wrap { flex:1;display:flex;align-items:center;justify-content:center;margin-bottom:20px; }
  .cover { width:min(72vw,300px);height:min(72vw,300px);border-radius:16px;object-fit:cover;box-shadow:0 32px 80px rgba(0,0,0,0.6); }
  .no-cover { background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center; }

  .info-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
  .info { min-width:0;flex:1; }
  .track-title { display:block;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .track-artist { display:block;font-size:15px;color:rgba(255,255,255,0.6);margin-top:3px; }

  .progress-wrap { margin-bottom:12px; }
  .progress-track { position:relative;height:5px;border-radius:999px;background:rgba(255,255,255,0.18);cursor:pointer;margin-bottom:8px;width:100%;border:none;padding:0; }
  .progress-fill { height:100%;border-radius:999px;background:#FC3C44;transition:width .5s linear; }
  .progress-thumb { position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(0,0,0,0.4); }
  .times { display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.45); }

  .controls { display:flex;align-items:center;justify-content:space-between;margin-bottom:24px; }
  .ctrl-sm { position:relative;width:40px;height:40px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .ctrl-sm:active { opacity:0.6; }
  .ctrl-md { width:52px;height:52px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .ctrl-md:active { opacity:0.6; }
  .play-btn { width:70px;height:70px;border-radius:50%;border:none;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 24px rgba(252,60,68,0.4); }
  .play-btn:active { transform:scale(0.94); }
  .play-btn:disabled { opacity:0.7; }
  .play-spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(28,28,30,0.2);border-top-color:#1c1c1e;animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .repeat-badge { position:absolute;bottom:4px;right:4px;width:14px;height:14px;border-radius:50%;background:#FC3C44;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center; }

  .actions { display:flex;align-items:center;justify-content:space-around; }
  .action-btn { display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:0; }
  .action-btn:active { opacity:0.6; }

  .lyrics-wrap { flex:1;overflow-y:auto;padding:4px 0; }
  .lyrics-text { font-size:16px;line-height:1.9;color:rgba(255,255,255,0.85);white-space:pre-wrap;margin:0; }
  .lyrics-center { display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px; }
  .lyrics-empty { color:rgba(255,255,255,0.35);font-size:15px; }
  .lyrics-spinner { width:24px;height:24px;border-radius:50%;border:3px solid rgba(255,255,255,0.15);border-top-color:#FC3C44;animation:spin .7s linear infinite; }

  .queue-wrap { flex:1;overflow-y:auto; }
  .queue-label { font-size:16px;font-weight:700;color:#fff;margin:0 0 12px; }

  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
</style>