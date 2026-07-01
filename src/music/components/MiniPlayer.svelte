<!-- src/music/components/MiniPlayer.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { currentTrack, playing, playerOpen, progress, duration, togglePlay, stopAll, audioLoading } from '../store/music.js';
  
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
          // ignora pixels quase pretos/brancos puros para pegar uma cor mais "viva"
          const max = Math.max(rr, gg, bb);
          const min = Math.min(rr, gg, bb);
          if (max < 20 || min > 235) continue;
          r += rr; g += gg; b += bb; count++;
        }

        if (count === 0) {
          // fallback: média sem filtro
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // realça saturação levemente para não ficar acinzentado
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

  $: glowColor = dominantColor ? `rgba(${dominantColor},0.55)` : 'rgba(252,60,68,0.35)';
  $: glowColorSoft = dominantColor ? `rgba(${dominantColor},0.22)` : 'rgba(252,60,68,0.15)';
  $: accentColor = dominantColor ? `rgb(${dominantColor})` : '#FC3C44';
  $: tintBg = dominantColor ? `rgba(${dominantColor},0.16)` : 'rgba(255,255,255,0.05)';

  function open() {
    playerOpen.set(true);
  }

  onDestroy(() => {
    canvas = null;
    ctx = null;
  });
</script>

{#if $currentTrack && !$playerOpen}
  <div class="mini-wrap" class:no-bar={!hasBottomBar}>

    <div class="ambient-glow" style="background:radial-gradient(ellipse at 30% 50%, {glowColor}, transparent 70%)"></div>

    <button
      class="mini"
      style="background:linear-gradient(135deg, {tintBg}, {bgCard} 55%); box-shadow:0 10px 30px -6px {glowColorSoft}, 0 2px 10px rgba(0,0,0,0.35);"
      on:click={open}
    >

      <div class="mini-progress-track">
        <div class="mini-progress-fill" style="width:{pct}%; background:{accentColor};"></div>
      </div>

      <div class="thumb-wrap">
        {#if $currentTrack.album?.cover_medium}
          <img src={$currentTrack.album.cover_medium} alt={$currentTrack.title} class="thumb" />
        {:else}
          <div class="thumb no-img" style="background:{bg}">
            <span class="svg-mask" style="mask-image:url('/icons/svg/playlist_music.svg');-webkit-mask-image:url('/icons/svg/playlist_music.svg');background:{txtSec};width:16px;height:16px;"></span>
          </div>
        {/if}
        {#if $playing}
          <div class="pulse-ring" style="border-color:{accentColor};"></div>
        {/if}
      </div>

      <div class="info">
        <span class="title" style="color:{txtPrim}">{$currentTrack.title}</span>
        <span class="artist" style="color:{txtSec}">{$currentTrack.artist?.name}</span>
      </div>

      <div class="controls">
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
    z-index:65;
    transition:bottom .35s cubic-bezier(.4,0,.2,1);
  }
  .mini-wrap.no-bar {
    bottom:calc(env(safe-area-inset-bottom,0px) + 10px);
  }

  .ambient-glow {
    position:absolute;
    inset:-20px;
    border-radius:24px;
    z-index:-1;
    filter:blur(18px);
    opacity:0.9;
    pointer-events:none;
    transition:background 1.2s ease;
  }

  .mini {
    position:relative;
    display:flex;align-items:center;gap:12px;
    padding:10px 12px;
    border:none;cursor:pointer;text-align:left;width:100%;
    border-radius:16px;
    overflow:hidden;
    backdrop-filter:blur(28px) saturate(1.4);
    -webkit-backdrop-filter:blur(28px) saturate(1.4);
    transition:background 1s ease, box-shadow .8s ease, transform .25s cubic-bezier(.4,0,.2,1);
  }
  .mini:active {
    transform:scale(0.975);
  }

  .mini-progress-track {
    position:absolute;
    top:0;left:0;right:0;
    height:2.5px;
    background:rgba(255,255,255,0.1);
    border-radius:0 0 2px 2px;
    overflow:hidden;
  }
  .mini-progress-fill {
    height:100%;
    transition:width .5s linear, background 1s ease;
  }

  .thumb-wrap {
    position:relative;
    flex-shrink:0;
  }
  .thumb {
    width:44px;height:44px;border-radius:10px;object-fit:cover;display:block;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  }
  .no-img { display:flex;align-items:center;justify-content:center;border-radius:10px; }

  .pulse-ring {
    position:absolute;
    inset:-3px;
    border-radius:13px;
    border:1.5px solid;
    opacity:0.6;
    animation:pulse-ring 2.2s ease-out infinite;
    pointer-events:none;
  }
  @keyframes pulse-ring {
    0% { transform:scale(1); opacity:0.6; }
    70% { transform:scale(1.12); opacity:0; }
    100% { transform:scale(1.12); opacity:0; }
  }

  .info { flex:1;min-width:0; }
  .title {
    display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    letter-spacing:-0.1px;
  }
  .artist { display:block;font-size:12px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

  .controls { display:flex;align-items:center;gap:2px; }
  .ctrl {
    width:36px;height:36px;border-radius:50%;border:none;background:transparent;
    display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
    transition:transform .2s cubic-bezier(.4,0,.2,1), background .2s ease;
  }
  .ctrl:active {
    transform:scale(0.85);
    background:rgba(255,255,255,0.08);
  }

  .spinner {
    width:20px;height:20px;border-radius:50%;
    border:2px solid rgba(255,255,255,0.2);
    animation:spin .7s linear infinite;margin:0 8px;
    transition:border-top-color .8s ease;
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>