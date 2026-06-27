<script>
  import { onMount } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';

  let user = null;
  $: userName    = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  const AVATAR_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE'];
  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  $: avatarColor = getAvatarColor(userName);

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  const QUOTES = [
    { text: 'A criatividade é a inteligência a divertir-se.', author: 'Albert Einstein' },
    { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
    { text: 'Não contes os dias. Faz com que os dias contem.', author: 'Muhammad Ali' },
    { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tzu' },
    { text: 'Acredita que podes e já estás a meio caminho.', author: 'Theodore Roosevelt' },
    { text: 'A vida é o que acontece enquanto estás ocupado a fazer outros planos.', author: 'John Lennon' },
    { text: 'Sê a mudança que queres ver no mundo.', author: 'Mahatma Gandhi' },
    { text: 'Faz hoje o que outros não querem. Vive amanhã o que outros não podem.', author: 'Jerry Rice' },
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const todayQuote = QUOTES[dayOfYear % QUOTES.length];

  let bgImages = [];
  try {
    const mods = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(mods);
  } catch(e) { bgImages = []; }

  let layers = [{ img: '', visible: false }, { img: '', visible: false }];
  let activeLayer = 0;
  let bgCursor = 0;

  function showImage(idx) {
    if (!bgImages.length) return;
    const img = bgImages[idx % bgImages.length];
    layers[activeLayer] = { img, visible: true };
    layers = [...layers];
    const prev = 1 - activeLayer;
    setTimeout(() => { layers[prev] = { ...layers[prev], visible: false }; layers = [...layers]; }, 100);
  }

  function rotateBg() {
    bgCursor = (bgCursor + 1) % Math.max(bgImages.length, 1);
    activeLayer = 1 - activeLayer;
    showImage(bgCursor);
  }

  let inputText = '';
  let textInputEl;

  // ── Modelos disponíveis ────────────────────────────────────────────────────
  const MODELS = [
    { id: 'claude-sonnet-4-6', label: 'Sonnet', sublabel: 'claude-sonnet-4-6' },
    { id: 'claude-opus-4-6',   label: 'Opus',   sublabel: 'claude-opus-4-6'   },
    { id: 'claude-haiku-4-5',  label: 'Haiku',  sublabel: 'claude-haiku-4-5'  },
  ];
  let currentModelId = MODELS[0].id;
  $: currentModel = MODELS.find(m => m.id === currentModelId) ?? MODELS[0];

  // ── Popup ─────────────────────────────────────────────────────────────────
  let showPopup    = false;
  let popupVisible = false;
  let popupMode    = '';
  let popupPos     = { bottom: 0, left: 0 };
  let flashMode     = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function openPopup(mode, event) {
    popupMode = mode;
    const rect = event.currentTarget.getBoundingClientRect();
    popupPos = {
      bottom: window.innerHeight - rect.top + 8,
      left:   Math.max(12, rect.left - 8),
    };
    showPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { popupVisible = true; }));
  }
  function closePopup() {
    popupVisible = false;
    setTimeout(() => { showPopup = false; popupMode = ''; }, 220);
  }
  function switchPopup(mode) { popupMode = mode; }

  // ── Recording ─────────────────────────────────────────────────────────────
  let mediaRecorder  = null;
  let audioChunks    = [];
  let isRecording    = false;
  let waveCtx        = null;
  let waveAnalyser   = null;
  let waveSource     = null;
  let waveStream     = null;
  let waveAnimFrame  = null;
  let recSeconds     = 0;
  let recInterval    = null;
  let recCanvasEl;
  let wavePhase      = 0;

  $: recTimerStr = (() => {
    const m = Math.floor(recSeconds / 60), s = recSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  })();

  async function startRecording() {
    if (isRecording) return;
    try {
      waveStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveCtx      = new (window.AudioContext || window.webkitAudioContext)();
      waveAnalyser = waveCtx.createAnalyser();
      waveAnalyser.fftSize = 1024;
      waveAnalyser.smoothingTimeConstant = 0.25;
      waveAnalyser.minDecibels = -110;
      waveAnalyser.maxDecibels = -5;
      const gain = waveCtx.createGain(); gain.gain.value = 6;
      waveSource  = waveCtx.createMediaStreamSource(waveStream);
      waveSource.connect(gain); gain.connect(waveAnalyser);
      audioChunks  = [];
      mediaRecorder = new MediaRecorder(waveStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start();
      isRecording = true;
      recSeconds  = 0;
      recInterval = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch (err) { console.error('Mic:', err); }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.stop(); waveStream?.getTracks().forEach(t => t.stop());
    stopWaveAnim();
  }
  function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.onstop = null; mediaRecorder.stop();
    waveStream?.getTracks().forEach(t => t.stop());
    audioChunks = []; stopWaveAnim();
  }

  async function handleRecStop() {
    if (!audioChunks.length) return;
    const blob = new Blob(audioChunks, { type: 'audio/webm' }); audioChunks = [];
    try {
      const token = user?.token || '';
      const form  = new FormData();
      form.append('file', blob, 'audio.webm'); form.append('language', 'pt');
      const res = await fetch('https://ipc.alfredoooh.workers.dev/ai/transcribe', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) { inputText = (inputText ? inputText + ' ' : '') + text; setTimeout(autoResize, 10); }
    } catch (e) { console.error('Transcribe:', e); }
  }

  function startWaveAnim() {
    const BAR_COUNT  = 5;
    const barHeights = new Array(BAR_COUNT).fill(0);

    function frame() {
      if (!recCanvasEl) return;
      waveAnimFrame = requestAnimationFrame(frame);
      const canvas = recCanvasEl;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      let freqBands = new Array(BAR_COUNT).fill(0.08);
      if (waveAnalyser) {
        const freq = new Uint8Array(waveAnalyser.frequencyBinCount);
        waveAnalyser.getByteFrequencyData(freq);
        const len = freq.length;
        const bands = [
          [0,                      Math.floor(len * 0.04)],
          [Math.floor(len * 0.04), Math.floor(len * 0.10)],
          [Math.floor(len * 0.10), Math.floor(len * 0.25)],
          [Math.floor(len * 0.25), Math.floor(len * 0.50)],
          [Math.floor(len * 0.50), Math.floor(len * 0.80)],
        ];
        freqBands = bands.map(([s, e]) => {
          const slice = [...freq].slice(s, e);
          const avg   = slice.reduce((a, b) => a + b, 0) / slice.length;
          return Math.pow(avg / 255, 0.5);
        });
      } else {
        wavePhase += 0.04;
        freqBands = [0,1,2,3,4].map(i =>
          0.06 + Math.abs(Math.sin(wavePhase * 1.2 + i * 0.8)) * 0.18
        );
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const target = freqBands[i];
        barHeights[i] += (target - barHeights[i]) * (target > barHeights[i] ? 0.65 : 0.12);
      }

      const barW   = 3.5;
      const gap    = 5;
      const totalW = BAR_COUNT * barW + (BAR_COUNT - 1) * gap;
      const startX = (w - totalW) / 2;
      const centerY = h / 2;
      const maxH   = h * 0.72;
      const minH   = 4;

      for (let i = 0; i < BAR_COUNT; i++) {
        const bh = Math.max(minH, barHeights[i] * maxH);
        const x  = startX + i * (barW + gap);
        const y  = centerY - bh / 2;
        const r  = barW / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, bh, r);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }

      wavePhase += 0.02;
    }
    frame();
  }

  function stopWaveAnim() {
    if (waveAnimFrame) { cancelAnimationFrame(waveAnimFrame); waveAnimFrame = null; }
    if (waveSource)   { try { waveSource.disconnect(); } catch(e) {} waveSource = null; }
    if (waveCtx)      { try { waveCtx.close(); }         catch(e) {} waveCtx = null; }
    waveAnalyser = null;
  }

  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, 150) + 'px';
  }
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const isMobile = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
      if (!isMobile && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) navigateToAI(); }
    }
  }
  function navigateToAI() {
    const text = inputText.trim(); if (!text) return;
    const aiApp = ALL_APPS.find(x => x.id === 'ai'); if (!aiApp) return;
    try {
      sessionStorage.setItem('nexa_pending_message', text);
      sessionStorage.setItem('nexa_model', currentModelId);
    } catch(e) {}
    window.location.href = aiApp.path;
  }

  let mounted = false;
  let bgTimer;
  onMount(() => {
    user = requireAuth(); if (!user) return;
    if (bgImages.length) {
      layers[0] = { img: bgImages[0], visible: true };
      layers[1] = { img: bgImages[Math.min(1, bgImages.length-1)], visible: false };
      layers = [...layers];
    }
    requestAnimationFrame(() => { mounted = true; });
    if (bgImages.length > 1) bgTimer = setInterval(rotateBg, 15000);
    return () => clearInterval(bgTimer);
  });

  function openApp(app) {
    if (app.id === 'ai') { try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {} }
    window.location.href = app.path;
  }
</script>

<div class="root">

  {#each layers as layer}
    <div class="bg-layer" class:bg-on={layer.visible} style="background-image:url('{layer.img}');"></div>
  {/each}
  {#if !bgImages.length}<div class="bg-fallback"></div>{/if}

  <div class="scrim-top"></div>
  <div class="scrim-bottom"></div>

  <!-- Header -->
  <header class="header" class:in={mounted}>
    <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
    <button class="avatar-pill" style="background:{avatarColor}" on:click={logout}>
      {userInitial}
    </button>
  </header>

  <!-- Content -->
  <main class="content">
    <div class="quote-block" class:in={mounted}>
      <p class="quote-text">"{todayQuote.text}"</p>
      <p class="quote-author">— {todayQuote.author}</p>
    </div>

    <div class="apps-wrap" class:in={mounted}>
      <div class="apps-scroll">
        {#each platformApps as app, i}
          <button
            class="app-item"
            style="transition-delay:{i*50}ms"
            class:app-in={mounted}
            on:click={() => openApp(app)}
          >
            <div class="app-circle">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} class="app-img" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} class="app-img" />
              {:else}
                <span class="app-svg-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');"></span>
              {/if}
            </div>
            <span class="app-name">{app.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </main>

  <!-- ── Bottom ─────────────────────────────────────────────────────────── -->
  <div class="bottom" class:in={mounted}>
    {#if isRecording}
      <!-- Recording card — pill totalmente redondo -->
      <div class="rec-card">
        <canvas bind:this={recCanvasEl} class="rec-card-canvas"></canvas>
        <div class="rec-card-inner">
          <button class="rec-action-btn pulse-tap" on:click={cancelRecording}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:rgba(255,255,255,0.80)"></span>
          </button>
          <div class="rec-center">
            <div class="rec-dot"></div>
            <span class="rec-timer-inline">{recTimerStr}</span>
          </div>
          <button class="rec-action-btn rec-send-btn pulse-tap" on:click={stopRecording}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>

    {:else}
      <!-- Bottom bar normal -->
      <div class="bottom-bar">
        <textarea
          class="chat-input"
          placeholder="Escreve aqui..."
          rows="1"
          bind:value={inputText}
          bind:this={textInputEl}
          on:input={autoResize}
          on:keydown={handleKeyDown}
        ></textarea>
        <div class="bb-row">
          <!-- Botão + -->
          <button class="bb-btn pulse-tap" on:click={(e) => openPopup('add', e)}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </button>

          <div class="flex1"></div>

          <!-- Pill do modelo -->
          <button class="model-pill pulse-tap" on:click={(e) => openPopup('models', e)}>
            <span class="model-pill-label">{currentModel.label}</span>
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_down.svg');-webkit-mask-image:url('/icons/svg/arrow_down.svg');width:12px;height:12px;background:rgba(255,255,255,0.55)"></span>
          </button>

          <div style="width:8px"></div>

          <!-- Enviar / Gravar -->
          {#if inputText.trim()}
            <button class="bb-btn pulse-tap" on:click={navigateToAI}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:rgba(255,255,255,0.85)"></span>
            </button>
          {:else}
            <button class="bb-btn pulse-tap" on:click={startRecording}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- ── Popup blur ──────────────────────────────────────────────────────── -->
  {#if showPopup}
    <div class="popup-overlay" on:click={closePopup}></div>
    <div
      class="popup-box"
      class:popup-box-in={popupVisible}
      style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;"
    >
      {#if popupMode === 'add'}
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label">Enviar Imagem</span>
          <input type="file" accept="image/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label">Enviar Ficheiro</span>
          <input type="file" accept="*/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <button class="popup-row pulse-tap" on:click={() => switchPopup('extras')}>
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label" style="flex:1">Extras</span>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:13px;height:13px;background:rgba(255,255,255,0.35)"></span>
        </button>

      {:else if popupMode === 'extras'}
        <button class="popup-row popup-back-row pulse-tap" on:click={() => switchPopup('add')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:15px;height:15px;background:rgba(255,255,255,0.45)"></span>
          <span class="popup-label" style="color:rgba(255,255,255,0.45);font-size:13px">Extras</span>
        </button>
        <div class="popup-sep"></div>
        {#each [
          [flashMode,    'Flash',      'flash',  'flash_filled',  () => { flashMode     = !flashMode;     if (flashMode)     thinkMoreMode = false; }],
          [thinkMoreMode,'Think More', 'brain',  'brain_filled',  () => { thinkMoreMode = !thinkMoreMode; if (thinkMoreMode) flashMode     = false; }],
          [sheetsEnabled,'Sheets',     'sheets', 'sheets_filled', () => { sheetsEnabled = !sheetsEnabled; }],
        ] as [active, title, iconOff, iconOn, action], i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button
            class="popup-row pulse-tap"
            style={active ? 'background:rgba(255,255,255,0.07)' : ''}
            on:click={action}
          >
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');-webkit-mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <span class="popup-label" style="flex:1">{title}</span>
            {#if active}<div class="popup-active-dot"></div>{/if}
          </button>
        {/each}

      {:else if popupMode === 'models'}
        <div class="popup-title">Modelo</div>
        {#each MODELS as model, i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button
            class="popup-row pulse-tap"
            style={currentModelId === model.id ? 'background:rgba(255,255,255,0.07)' : ''}
            on:click={() => { currentModelId = model.id; closePopup(); }}
          >
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/png/ia.png');-webkit-mask-image:url('/icons/png/ia.png');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <div class="model-info">
              <span class="popup-label">{model.label}</span>
              <span class="model-sublabel">{model.sublabel}</span>
            </div>
            {#if currentModelId === model.id}
              <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');width:15px;height:15px;background:rgba(255,255,255,0.85)"></span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}

</div>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }

  .bg-layer {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    opacity: 0;
    transition: opacity 1.8s cubic-bezier(0.4,0,0.2,1);
    will-change: opacity;
  }
  .bg-layer.bg-on { opacity: 1; }
  .bg-fallback {
    position: absolute; inset: 0; z-index: 0;
    background: linear-gradient(160deg,#0d0d1a 0%,#1a0530 50%,#0a1628 100%);
  }

  .scrim-top {
    position: absolute; top: 0; left: 0; right: 0; height: 40%; z-index: 1;
    background: linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, transparent 100%);
    pointer-events: none;
  }
  .scrim-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 70%; z-index: 1;
    background: linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 50%, transparent 100%);
    pointer-events: none;
  }

  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top,0px) + 16px) 22px 10px;
    flex-shrink: 0;
    opacity: 0; transform: translateY(-12px);
    transition: opacity .6s ease, transform .6s ease;
  }
  .header.in { opacity: 1; transform: translateY(0); }
  .logo-img { width: 48px; height: 48px; object-fit: contain; }
  .avatar-pill {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 15px; font-weight: 700; color: #fff; cursor: pointer;
    transition: transform .25s ease, opacity .25s ease;
  }
  .avatar-pill:active { transform: scale(0.88); opacity: 0.75; }

  .content {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: flex-end; overflow: hidden;
  }

  .quote-block {
    padding: 0 26px 32px;
    opacity: 0; transform: translateY(10px);
    transition: opacity .7s .15s ease, transform .7s .15s ease;
  }
  .quote-block.in { opacity: 1; transform: translateY(0); }
  .quote-text {
    font-size: 15px; font-weight: 300;
    color: rgba(255,255,255,0.72);
    line-height: 1.7; font-style: italic; margin: 0 0 8px;
  }
  .quote-author {
    font-size: 12px; font-weight: 500;
    color: rgba(255,255,255,0.38); letter-spacing: .04em; margin: 0;
  }

  .apps-wrap {
    opacity: 0; transform: translateY(14px);
    transition: opacity .6s .25s ease, transform .6s .25s ease;
    padding-bottom: 20px;
  }
  .apps-wrap.in { opacity: 1; transform: translateY(0); }
  .apps-scroll {
    display: flex; gap: 4px; padding: 0 14px;
    overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .apps-scroll::-webkit-scrollbar { display: none; }
  .app-item {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer;
    padding: 0 9px; flex-shrink: 0;
    opacity: 0; transform: translateY(10px) scale(0.92);
    transition: opacity .5s ease, transform .5s ease;
  }
  .app-item.app-in { opacity: 1; transform: translateY(0) scale(1); }
  .app-item:active .app-circle { transform: scale(0.86); }
  .app-circle {
    width: 56px; height: 56px; border-radius: 50%;
    background: rgba(255,255,255,0.13);
    border: 0.5px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    transition: transform .35s cubic-bezier(0.34,1.56,0.64,1); overflow: hidden;
  }
  .app-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .app-svg-mask {
    display: block; width: 26px; height: 26px;
    background: rgba(255,255,255,0.88);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .app-name {
    font-size: 11px; font-weight: 400;
    color: rgba(255,255,255,0.78);
    white-space: nowrap; text-shadow: 0 1px 6px rgba(0,0,0,0.55);
  }

  /* ── Bottom ── */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom,0px) + 20px);
    flex-shrink: 0;
    opacity: 0; transform: translateY(18px);
    transition: opacity .6s .4s ease, transform .6s .4s ease;
  }
  .bottom.in { opacity: 1; transform: translateY(0); }

  .bottom-bar {
    border-radius: 24px;
    background: rgba(20,20,20,0.45);
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 0.5px solid rgba(255,255,255,0.14);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.12);
    display: flex; flex-direction: column;
    user-select: none; overscroll-behavior: none;
  }

  .chat-input {
    resize: none; outline: none; border: none; background: transparent;
    font-size: 15px; line-height: 1.5; padding: 13px 18px 0;
    width: 100%; font-family: inherit;
    color: rgba(255,255,255,0.90);
    max-height: 150px; overflow-y: auto;
    -webkit-user-select: text; user-select: text;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.38); }

  .bb-row { display: flex; align-items: center; height: 52px; padding: 0 10px; }
  .flex1 { flex: 1; }

  .bb-btn {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(255,255,255,0.15);
    border: 0.5px solid rgba(255,255,255,0.12);
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background: rgba(255,255,255,0.22); transform: scale(0.88); }

  /* Pill do modelo */
  .model-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 13px; border-radius: 22px; border: none; cursor: pointer;
    background: rgba(255,255,255,0.15);
    border: 0.5px solid rgba(255,255,255,0.16);
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .model-pill:active { background: rgba(255,255,255,0.22); transform: scale(0.94); }
  .model-pill-label {
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,0.85); letter-spacing: .01em;
  }

  /* ── Recording card ── */
  .rec-card {
    position: relative; overflow: hidden;
    border-radius: 999px;
    background: rgba(20,20,20,0.52);
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 0.5px solid rgba(255,255,255,0.14);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.10);
    height: 64px;
    animation: recCardIn .28s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes recCardIn {
    from { opacity:0; transform: scale(0.94) translateY(10px); }
    to   { opacity:1; transform: scale(1)    translateY(0);    }
  }
  .rec-card-canvas {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none; z-index: 0;
  }
  .rec-card-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: space-between;
    height: 100%; padding: 0 10px;
  }
  .rec-action-btn {
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(255,255,255,0.10);
    border: 0.5px solid rgba(255,255,255,0.10);
    flex-shrink: 0;
    transition: background .18s ease, transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-action-btn:active { background: rgba(255,255,255,0.20); transform: scale(0.88); }
  .rec-send-btn { background: rgba(255,255,255,0.16); }
  .rec-center {
    display: flex; align-items: center; gap: 8px;
    flex: 1; justify-content: center; pointer-events: none;
  }
  .rec-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #FF3B30; flex-shrink: 0;
    animation: recPulse 1.1s ease-in-out infinite;
  }
  @keyframes recPulse {
    0%,100% { opacity:1; transform:scale(1);    }
    50%      { opacity:.4; transform:scale(.75); }
  }
  .rec-timer-inline {
    font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums;
    color: rgba(255,255,255,0.90); letter-spacing: .06em;
  }

  /* ── Popup blur ── */
  .popup-overlay {
    position: fixed; inset: 0; z-index: 50; pointer-events: auto;
  }
  .popup-box {
    position: fixed; z-index: 51; width: 220px;
    border-radius: 18px;
    background: rgba(28,28,30,0.75);
    backdrop-filter: blur(28px) saturate(1.8);
    -webkit-backdrop-filter: blur(28px) saturate(1.8);
    border: 0.5px solid rgba(255,255,255,0.13);
    box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 0.5px 0 rgba(255,255,255,0.10);
    overflow: hidden;
    transform-origin: bottom left;
    opacity: 0; transform: scale(0.88) translateY(6px);
    transition: opacity .22s ease, transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events: none;
  }
  .popup-box.popup-box-in {
    opacity: 1; transform: scale(1) translateY(0);
    pointer-events: auto;
  }
  .popup-title {
    padding: 12px 16px 8px;
    font-size: 11px; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase;
    color: rgba(255,255,255,0.38);
  }
  .popup-row {
    display: flex; align-items: center; gap: 12px;
    width: 100%; padding: 12px 14px;
    background: transparent; border: none; cursor: pointer;
    font-family: inherit; text-align: left;
    transition: background .15s ease;
  }
  .popup-row:active { background: rgba(255,255,255,0.08); }
  .popup-back-row { padding: 8px 14px; }
  .popup-icon-wrap {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,0.10);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .popup-label {
    font-size: 15px; font-weight: 500;
    color: rgba(255,255,255,0.88); flex: 1;
  }
  .popup-sep { height: 0.5px; background: rgba(255,255,255,0.09); margin: 0 14px; }
  .popup-active-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.85); flex-shrink: 0;
  }

  /* Modelo info dentro do popup */
  .model-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .model-sublabel {
    font-size: 11px; font-weight: 400;
    color: rgba(255,255,255,0.35); margin-top: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .pulse-tap {
    cursor: pointer;
    transition: transform .22s cubic-bezier(0.34,1.56,0.64,1), opacity .22s ease;
  }
  .pulse-tap:active { transform: scale(0.92); opacity: .80; }

  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>