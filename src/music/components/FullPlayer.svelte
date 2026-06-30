<!-- src/music/components/FullPlayer.svelte -->
<script>
  import {
    currentTrack, playing, progress, duration, playerOpen,
    shuffle, repeatMode, liked, audioLoading,
    togglePlay, seekTo, toggleLike, playNext, playPrev,
    lyrics, lyricsLoading
  } from '../store/music.js';

  let tab = 'player';

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

  function icon(name) {
    return `mask-image:url('/icons/svg/${name}.svg');-webkit-mask-image:url('/icons/svg/${name}.svg');`;
  }
</script>

{#if $playerOpen && $currentTrack}
  <div class="screen">

    <div class="bg-blur">
      {#if coverUrl}
        <img src={coverUrl} alt="" class="bg-img" />
      {:else}
        <div class="bg-fallback"></div>
      {/if}
      <div class="bg-overlay"></div>
    </div>

    <div class="header">
      <button class="icon-btn" on:click={handleClose}>
        <span class="svg-mask" style="{icon('chevron_right')}background:#fff;width:20px;height:20px;transform:rotate(90deg);"></span>
      </button>
      <div class="header-center">
        <span class="header-label">A reproduzir agora</span>
      </div>
      <button class="icon-btn">
        <span class="svg-mask" style="{icon('more_vertical')}background:rgba(255,255,255,0.8);width:18px;height:18px;"></span>
      </button>
    </div>

    <div class="tabs">
      {#each [['player','Player'],['lyrics','Letra'],['queue','Fila']] as [id,label]}
        <button class="tab-btn" style="color:{tab===id?'#fff':'rgba(255,255,255,0.4)'};border-bottom:2px solid {tab===id?'#FC3C44':'transparent'}"
          on:click={() => tab=id}>{label}</button>
      {/each}
    </div>

    {#if tab === 'player'}

      <div class="cover-wrap">
        {#if coverUrl}
          <img src={coverUrl} alt={$currentTrack.title} class="cover" />
        {:else}
          <div class="cover no-cover">
            <span class="svg-mask" style="{icon('playlist_music')}background:rgba(255,255,255,0.3);width:64px;height:64px;"></span>
          </div>
        {/if}
      </div>

      <div class="info-row">
        <div class="info">
          <span class="track-title">{$currentTrack.title}</span>
          <span class="track-artist">{$currentTrack.artist?.name}</span>
        </div>
        <button class="icon-btn" on:click={() => toggleLike($currentTrack.id)}>
          {#if $liked.has($currentTrack.id)}
            <span class="svg-mask" style="{icon('bookmark_filled')}background:#FC3C44;width:22px;height:22px;"></span>
          {:else}
            <span class="svg-mask" style="{icon('bookmark')}background:rgba(255,255,255,0.7);width:22px;height:22px;"></span>
          {/if}
        </button>
      </div>

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

      <div class="controls">
        <button class="ctrl-sm" on:click={() => shuffle.update(s => !s)}>
          <span class="svg-mask" style="{icon('random')}background:{$shuffle?'#FC3C44':'rgba(255,255,255,0.5)'};width:20px;height:20px;"></span>
        </button>
        <button class="ctrl-md" on:click={playPrev}>
          <span class="svg-mask" style="{icon('backward')}background:#fff;width:30px;height:30px;"></span>
        </button>
        <button class="play-btn" on:click={togglePlay} disabled={$audioLoading}>
          {#if $audioLoading}
            <div class="play-spinner"></div>
          {:else if $playing}
            <span class="svg-mask" style="{icon('pause')}background:#1c1c1e;width:26px;height:26px;"></span>
          {:else}
            <span class="svg-mask play-icon" style="{icon('play')}background:#1c1c1e;width:26px;height:26px;"></span>
          {/if}
        </button>
        <button class="ctrl-md" on:click={playNext}>
          <span class="svg-mask" style="{icon('forward')}background:#fff;width:30px;height:30px;"></span>
        </button>
        <button class="ctrl-sm" on:click={() => repeatMode.update(r => (r+1)%3)}>
          {#if $repeatMode === 2}
            <span class="svg-mask" style="{icon('repeat_1')}background:#FC3C44;width:20px;height:20px;"></span>
          {:else}
            <span class="svg-mask" style="{icon('repeat')}background:{$repeatMode===1?'#FC3C44':'rgba(255,255,255,0.5)'};width:20px;height:20px;"></span>
          {/if}
        </button>
      </div>

      <div class="actions">
        <button class="action-btn">
          <span class="svg-mask" style="{icon('share')}background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Partilhar</span>
        </button>
        <button class="action-btn">
          <span class="svg-mask" style="{icon('download')}background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
          <span style="color:rgba(255,255,255,0.5);font-size:11px">Download</span>
        </button>
        <button class="action-btn">
          <span class="svg-mask" style="{icon('playlist_music')}background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
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
            <span class="svg-mask" style="{icon('meassage')}background:rgba(255,255,255,0.2);width:40px;height:40px;"></span>
            <span class="lyrics-empty">Letra não disponível</span>
          </div>
        {/if}
      </div>

    {:else if tab === 'queue'}
      <div class="queue-wrap">
        <p class="queue-label">A seguir</p>
        <div class="lyrics-center">
          <span class="lyrics-empty">Fila em breve</span>
        </div>
      </div>
    {/if}

  </div>
{/if}

<style>
  .screen { position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 10px) 20px calc(env(safe-area-inset-bottom,0px) + 20px);overflow:hidden; }

  .bg-blur { position:absolute;inset:0;z-index:0;overflow:hidden; }
  .bg-img { width:100%;height:100%;object-fit:cover;filter:blur(60px) saturate(1.8) brightness(0.4);transform:scale(1.2); }
  .bg-fallback { width:100%;height:100%;background:#1a1a2e; }
  .bg-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.45); }

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
  .play-icon { margin-left:3px; }
  .play-spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(28,28,30,0.2);border-top-color:#1c1c1e;animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

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
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>