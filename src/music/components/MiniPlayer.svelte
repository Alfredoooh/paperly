<!-- src/music/components/MiniPlayer.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { currentTrack, playing, playerOpen, progress, duration, togglePlay, playNext, playPrev, audioLoading } from '../store/music.js';
  
  export let bgCard = '#1c1c1e';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let bg = '#181818';
  export let hasBottomBar = true; // false quando não há bottom-bar (busca ativa, artista)
  
  $: pct = $duration > 0 ? ($progress / $duration) * 100 : 0;

  let dominantColor = null; // "r,g,b"
  let lastCoverUrl = null;
  let canvas;
  let ctx;

  $: coverUrl = $currentTrack?.album?.cover_medium || null;
  $: if (coverUrl && coverUrl !== lastCoverUrl) {
    lastCoverUrl = coverUrl;
    extractColor(coverUrl);
  } else if (!coverUrl) {
    lastCoverUrl = null;
    dominantColor = null;
  }

  function extractColor(url) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        if (!canvas) canvas = document.createElement('canvas');
        if (!ctx) ctx = canvas.getContext('2d', { willReadFrequently: true });
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 200) continue;
          const rr = data[i], gg = data[i + 1], bb = data[i + 2];
          const max = Math.max(rr, gg, bb);
          const min = Math.min(rr, gg, bb);
          if (max < 20 || min > 235) continue;
          r += rr; g += gg; b += bb; count++;
        }

        if (count === 0) {
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const boosted = boostSaturation(r, g, b, 1.35);
        if (url === lastCoverUrl) {
          dominantColor = `${boosted[0]},${boosted[1]},${boosted[2]}`;
        }
      } catch (e) {
        dominantColor = null;
      }
    };
    img.onerror = () => {
      if (url === lastCoverUrl) dominantColor = null;
    };
    img.src = url;
  }

  function boostSaturation(r, g, b, factor) {
    const avg = (r + g + b) / 3;
    const nr = clamp(avg + (r - avg) * factor);
    const ng = clamp(avg + (g - avg) * factor);
    const nb = clamp(avg + (b - avg) * factor);
    return [nr, ng, nb];
  }

  function clamp(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  $: accentColor = dominantColor ? `rgb(${dominantColor})` : '#FC3C44';
  $: tintBg = dominantColor ? `rgba(${dominantColor},0.14)` : 'rgba(255,255,255,0.04)';

  function open() {
    playerOpen.set(true);
  }

  // ---- Handle bar acima do card: arrasta pra cima abre o FullPlayer, pra baixo fecha tudo ----
  let dragging = false;
  let dragStartY = 0;
  let dragDeltaY = 0;

  function onHandleDragStart(e) {
    dragging = true;
    dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDeltaY = 0;
  }
  function onHandleDragMove(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDeltaY = y - dragStartY;
  }
  function onHandleDragEnd() {
    if (!dragging) return;
    dragging = false;
    const threshold = 40;
    if (dragDeltaY < -threshold) {
      // deslizar para cima -> abre o full player
      playerOpen.set(true);
    } else if (dragDeltaY > threshold) {
      // deslizar para baixo -> fecha e para a música
      stopPlayback();
    }
    dragDeltaY = 0;
  }

  function stopPlayback() {
    if ($playing) togglePlay();
    currentTrack.set(null);
  }

  onDestroy(() => {
    canvas = null;
    ctx = null;
  });
</script>

{#if $currentTrack && !$playerOpen}
  <div class="mini-wrap" class:no-bar={!hasBottomBar}>

    <div
      class="handle-zone"
      on:touchstart={onHandleDragStart}
      on:touchmove={onHandleDragMove}
      on:touchend={onHandleDragEnd}
    >
      <div class="handle-bar"></div>
    </div>

    <div class="mini-progress-track">
      <div class="mini-progress-fill" style="width:{pct}%; background:{accentColor};"></div>
    </div>

    <button class="mini" style="background:linear-gradient(135deg, {tintBg}, {bgCard} 60%)" on:click={open}>

      <div class="disc-wrap" class:spin={$playing}>
        {#if $currentTrack.album?.cover_medium}
          <img src={$currentTrack.album.cover_medium} alt={$currentTrack.title} class="thumb" />
        {:else}
          <div class="thumb no-img" style="background:{bg}">
            <span class="svg-mask" style="mask-image:url('/icons/svg/playlist_music.svg');-webkit-mask-image:url('/icons/svg/playlist_music.svg');background:{txtSec};width:16px;height:16px;"></span>
          </div>
        {/if}
        <div class="thumb-hole"></div>
      </div>

      <div class="info">
        <span class="title" style="color:{txtPrim}">{$currentTrack.title}</span>
        <span class="artist" style="color:{txtSec}">{$currentTrack.artist?.name}</span>
      </div>

      <div class="controls">
        <button class="ctrl" on:click|stopPropagation={playPrev}>
          <span class="svg-mask" style="mask-image:url('/icons/svg/backward.svg');-webkit-mask-image:url('/icons/svg/backward.svg');background:{txtPrim};width:18px;height:18px;"></span>
        </button>
        {#if $audioLoading}
          <div class="spinner" style="border-top-color:{accentColor};"></div>
        {:else}
          <button class="ctrl" on:click|stopPropagation={togglePlay}>
            {#if $playing}
              <span class="svg-mask" style="mask-image:url('/icons/svg/pause.svg');-webkit-mask-image:url('/icons/svg/pause.svg');background:{txtPrim};width:20px;height:20px;"></span>
            {:else}
              <span class="svg-mask" style="mask-image:url('/icons/svg/play.svg');-webkit-mask-image:url('/icons/svg/play.svg');background:{txtPrim};width:20px;height:20px;"></span>
            {/if}
          </button>
        {/if}
        <button class="ctrl" on:click|stopPropagation={playNext}>
          <span class="svg-mask" style="mask-image:url('/icons/svg/forward.svg');-webkit-mask-image:url('/icons/svg/forward.svg');background:{txtPrim};width:18px;height:18px;"></span>
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
    border-radius:999px;
    overflow:hidden;
    z-index:65;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    transition:bottom .2s ease;
  }
  .mini-wrap.no-bar {
    bottom:calc(env(safe-area-inset-bottom,0px) + 10px);
  }

  .handle-zone {
    position:absolute;
    top:-22px;left:0;right:0;
    height:22px;
    display:flex;
    align-items:flex-end;
    justify-content:center;
    padding-bottom:6px;
    touch-action:none;
    z-index:2;
  }
  .handle-bar {
    width:36px;height:4px;border-radius:999px;
    background:rgba(255,255,255,0.4);
  }

  .mini-progress-track {
    height:2px;
    background:rgba(255,255,255,0.12);
    position:relative;
  }
  .mini-progress-fill {
    height:100%;
    transition:width .5s linear, background .8s ease;
  }
  .mini {
    display:flex;align-items:center;gap:12px;
    padding:8px 10px 8px 8px;
    border:none;cursor:pointer;text-align:left;width:100%;
    border-radius:999px;
    backdrop-filter:blur(24px);
    -webkit-backdrop-filter:blur(24px);
  }

  .disc-wrap {
    position:relative;
    flex-shrink:0;
    width:44px;height:44px;
    border-radius:50%;
  }
  .disc-wrap.spin {
    animation:mini-disc-spin 6s linear infinite;
  }
  @keyframes mini-disc-spin {
    from { transform:rotate(0deg); }
    to { transform:rotate(360deg); }
  }

  .thumb { width:100%;height:100%;border-radius:50%;object-fit:cover;display:block; }
  .no-img { display:flex;align-items:center;justify-content:center; }

  .thumb-hole {
    position:absolute;
    top:50%;left:50%;
    transform:translate(-50%,-50%);
    width:24%;height:24%;
    border-radius:50%;
    background:#0a0a0a;
    box-shadow:0 0 0 1.5px rgba(255,255,255,0.15) inset;
  }

  .info { flex:1;min-width:0; }
  .title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:12px;margin-top:1px; }
  .controls { display:flex;align-items:center;gap:2px; }
  .ctrl { width:32px;height:32px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .ctrl:active { opacity:0.5; }
  .spinner { width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,0.2);animation:spin .7s linear infinite;margin:0 6px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>