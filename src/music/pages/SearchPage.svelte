<!-- src/music/pages/SearchPage.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { searchBarRect, PROXY } from '../store/music.js';

  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;

  const dispatch = createEventDispatcher();

  const genres = [
    { label: 'Pop',        color: '#FC3C44' },
    { label: 'Hip-Hop',    color: '#5856D6' },
    { label: 'R&B',        color: '#FF9500' },
    { label: 'Electronic', color: '#007AFF' },
    { label: 'Rock',       color: '#34C759' },
    { label: 'Afro',       color: '#FF2D55' },
    { label: 'Jazz',       color: '#AF52DE' },
    { label: 'Clássica',   color: '#FF6B35' },
    { label: 'Kizomba',    color: '#E8002D' },
    { label: 'Kuduro',     color: '#FF9F0A' },
  ];

  function openSearch(e) {
    const btn = e.currentTarget;
    searchBarRect.set(btn.getBoundingClientRect());
    dispatch('openSearch');
  }

  // ── Recorder ──────────────────────────────────────────────
  let isRecording    = false;
  let showRecOverlay = false;
  let mediaRecorder  = null;
  let audioChunks    = [];
  let waveStream     = null;
  let waveCtx        = null;
  let waveAnalyser   = null;
  let waveSource     = null;
  let waveAnimFrame  = null;
  let recCanvasEl;
  let recSeconds     = 0;
  let recInterval    = null;
  let wavePhase      = 0;
  let recognizing    = false;
  let recognizeError = null;

  $: recTimerStr = (() => {
    const m = Math.floor(recSeconds / 60), s = recSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  })();

  async function startRecording() {
    if (isRecording) return;
    recognizeError = null;
    try {
      waveStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveCtx      = new (window.AudioContext || window.webkitAudioContext)();
      waveAnalyser = waveCtx.createAnalyser();
      waveAnalyser.fftSize = 1024;
      waveAnalyser.smoothingTimeConstant = 0.25;
      waveAnalyser.minDecibels = -110;
      waveAnalyser.maxDecibels = -5;
      const gain = waveCtx.createGain();
      gain.gain.value = 6;
      waveSource = waveCtx.createMediaStreamSource(waveStream);
      waveSource.connect(gain);
      gain.connect(waveAnalyser);
      audioChunks   = [];
      mediaRecorder = new MediaRecorder(waveStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start();
      isRecording    = true;
      showRecOverlay = true;
      recSeconds     = 0;
      recInterval    = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch (err) {
      console.error('Mic:', err);
    }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    clearInterval(recInterval);
    mediaRecorder.stop();
    waveStream?.getTracks().forEach(t => t.stop());
    stopWaveAnim();
  }

  function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    clearInterval(recInterval);
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
    waveStream?.getTracks().forEach(t => t.stop());
    audioChunks    = [];
    showRecOverlay = false;
    stopWaveAnim();
  }

  async function handleRecStop() {
    if (!audioChunks.length) { showRecOverlay = false; return; }
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks  = [];
    recognizing  = true;

    try {
      const res = await fetch(`${PROXY}/api/recognize`, {
        method:  'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body:    blob,
      });
      const data = await res.json();
      if (!res.ok || !data.title) throw new Error(data.error || 'Não reconhecido');

      showRecOverlay = false;
      recognizing    = false;

      const query = data.artist ? `${data.artist} ${data.title}` : data.title;
      dispatch('openSearch', { prefillQuery: query });

    } catch (err) {
      recognizing    = false;
      recognizeError = err.message || 'Não foi possível reconhecer';
      setTimeout(() => {
        recognizeError = null;
        showRecOverlay = false;
      }, 2200);
    }
  }

  // ── Wave animation (igual à HomePage) ─────────────────────
  function startWaveAnim() {
    const N = 5;
    const bh = new Array(N).fill(0);
    function frame() {
      if (!recCanvasEl) return;
      waveAnimFrame = requestAnimationFrame(frame);
      const c = recCanvasEl, dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let bands = new Array(N).fill(0.08);
      if (waveAnalyser) {
        const freq = new Uint8Array(waveAnalyser.frequencyBinCount);
        waveAnalyser.getByteFrequencyData(freq);
        const L = freq.length;
        const def = [
          [0, Math.floor(L * .04)],
          [Math.floor(L * .04), Math.floor(L * .10)],
          [Math.floor(L * .10), Math.floor(L * .25)],
          [Math.floor(L * .25), Math.floor(L * .50)],
          [Math.floor(L * .50), Math.floor(L * .80)],
        ];
        bands = def.map(([s, e]) => {
          const sl = [...freq].slice(s, e);
          return Math.pow(sl.reduce((a, b) => a + b, 0) / sl.length / 255, 0.5);
        });
      } else {
        wavePhase += 0.04;
        bands = [0, 1, 2, 3, 4].map(i => 0.06 + Math.abs(Math.sin(wavePhase * 1.2 + i * 0.8)) * 0.18);
      }
      for (let i = 0; i < N; i++) bh[i] += (bands[i] - bh[i]) * (bands[i] > bh[i] ? 0.65 : 0.12);
      const bw = 3.5, gap = 5, tw = N * bw + (N - 1) * gap, sx = (w - tw) / 2, cy = h / 2, mh = h * 0.72;
      for (let i = 0; i < N; i++) {
        const bhi = Math.max(4, bh[i] * mh), x = sx + i * (bw + gap), y = cy - bhi / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bhi, bw / 2);
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
        ctx.fill();
      }
      wavePhase += 0.02;
    }
    frame();
  }

  function stopWaveAnim() {
    if (waveAnimFrame) { cancelAnimationFrame(waveAnimFrame); waveAnimFrame = null; }
    if (waveSource)    { try { waveSource.disconnect(); } catch (e) {} waveSource = null; }
    if (waveCtx)       { try { waveCtx.close(); }         catch (e) {} waveCtx = null; }
    waveAnalyser = null;
  }
</script>

<div class="page">

  <div class="search-wrap">
    <button class="search-bar" style="background:{bgCard}" on:click={openSearch}>
      <span class="svg-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:17px;height:17px;"></span>
      <span class="search-placeholder" style="color:{txtSec}">O que queres ouvir?</span>
    </button>
    <button class="rec-trigger" style="background:{bgCard}" on:click={startRecording}>
      <span class="svg-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');background:{txtSec};width:20px;height:20px;"></span>
    </button>
  </div>

  <div class="section-hdr">
    <span class="section-title" style="color:{txtPrim}">Categorias</span>
  </div>
  <div class="genre-grid">
    {#each genres as g}
      <button class="genre-card" style="background:{g.color}" on:click={openSearch}>
        <span class="genre-label">{g.label}</span>
      </button>
    {/each}
  </div>

</div>

<div style="height:{currentTrackExists ? 148 : 88}px"></div>

{#if showRecOverlay}
  <div class="rec-overlay" class:dark={isDark}>
    <div class="rec-card" style="background:{isDark ? 'rgba(30,30,32,0.96)' : 'rgba(255,255,255,0.96)'}">

      {#if recognizing}
        <div class="rec-recognizing">
          <div class="spinner" style="border-top-color:{txtPrim}"></div>
          <span class="rec-hint" style="color:{txtSec}">A reconhecer música…</span>
        </div>

      {:else if recognizeError}
        <div class="rec-recognizing">
          <span class="rec-error">{recognizeError}</span>
        </div>

      {:else}
        <div class="rec-inner">
          <button class="rec-btn" style="background:{isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'}" on:click={cancelRecording}>
            <span class="svg-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:{txtPrim}"></span>
          </button>
          <div class="rec-center">
            <canvas bind:this={recCanvasEl} class="rec-canvas"></canvas>
            <div class="rec-dot"></div>
            <span class="rec-timer" style="color:{txtPrim}">{recTimerStr}</span>
          </div>
          <button class="rec-btn rec-send" style="background:{isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'}" on:click={stopRecording}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={txtPrim} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
        <span class="rec-hint" style="color:{txtSec}">A ouvir… toca a música perto do microfone</span>
      {/if}

    </div>
  </div>
{/if}

<style>
  .page { padding:0 0 8px; }

  .search-wrap { padding:8px 16px 8px; display:flex; align-items:center; gap:10px; }
  .search-bar {
    flex:1; display:flex; align-items:center; gap:10px;
    border-radius:14px; padding:13px 14px; border:none; cursor:pointer;
    text-align:left; transition:opacity .15s, transform .15s;
  }
  .search-bar:active { opacity:0.7; transform:scale(0.99); }
  .search-placeholder { font-size:16px; font-family:inherit; }

  .rec-trigger {
    width:48px; height:48px; flex-shrink:0;
    border-radius:14px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:opacity .15s, transform .15s;
  }
  .rec-trigger:active { opacity:0.7; transform:scale(0.93); }

  .svg-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  .section-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 10px; }
  .section-title { font-size:20px; font-weight:800; letter-spacing:-.4px; }
  .genre-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 16px; }
  .genre-card { border:none; border-radius:12px; padding:20px 16px; cursor:pointer; text-align:left; min-height:80px; display:flex; align-items:flex-end; transition:opacity .15s, transform .15s; }
  .genre-card:active { opacity:0.8; transform:scale(0.97); }
  .genre-label { font-size:16px; font-weight:800; color:#fff; letter-spacing:-.3px; }

  /* Floating recorder */
  .rec-overlay {
    position:fixed; inset:0; z-index:200;
    display:flex; align-items:flex-end; justify-content:center;
    padding:0 16px 40px;
    background:rgba(0,0,0,0.30);
    backdrop-filter:blur(4px);
    -webkit-backdrop-filter:blur(4px);
    animation:overlayIn .22s ease both;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }

  .rec-card {
    width:100%; max-width:480px;
    border-radius:24px;
    padding:16px 16px 20px;
    box-shadow:0 16px 48px rgba(0,0,0,0.30);
    animation:cardIn .28s cubic-bezier(0.2,0.9,0.3,1) both;
    display:flex; flex-direction:column; gap:10px;
  }
  @keyframes cardIn { from{opacity:0;transform:translateY(24px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }

  .rec-inner { display:flex; align-items:center; justify-content:space-between; height:52px; }
  .rec-btn {
    width:44px; height:44px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:none; cursor:pointer;
    transition:opacity .15s, transform .15s;
  }
  .rec-btn:active { opacity:0.7; transform:scale(0.88); }
  .rec-center { flex:1; display:flex; align-items:center; justify-content:center; gap:10px; position:relative; height:44px; }
  .rec-canvas { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .rec-dot { width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0; animation:recPulse 1.1s ease-in-out infinite; z-index:1; }
  @keyframes recPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
  .rec-timer { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; letter-spacing:.06em; z-index:1; }

  .rec-hint { font-size:12px; font-weight:500; text-align:center; opacity:0.7; }
  .rec-error { font-size:13px; font-weight:600; color:#FF3B30; text-align:center; }

  .rec-recognizing { display:flex; flex-direction:column; align-items:center; gap:12px; padding:16px 0; }
  .spinner { width:26px; height:26px; border-radius:50%; border:3px solid rgba(128,128,128,0.2); animation:spin .8s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }
</style>