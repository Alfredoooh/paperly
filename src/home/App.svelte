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

  // ── Sheet ─────────────────────────────────────────────────────────────────
  let showSheet    = false;
  let sheetMode    = '';
  let sheetVisible = false;
  let flashMode    = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function openSheet(mode) {
    sheetMode = mode;
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { sheetVisible = true; }));
  }
  function closeSheet() {
    sheetVisible = false;
    setTimeout(() => { showSheet = false; sheetMode = ''; }, 320);
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  let mediaRecorder     = null;
  let audioChunks       = [];
  let isRecording       = false;
  let waveCtx           = null;
  let waveAnalyser      = null;
  let waveSource        = null;
  let waveStream        = null;
  let waveAnimFrame     = null;
  let showRecOverlay    = false;
  let recOverlayVisible = false;
  let recSeconds        = 0;
  let recInterval       = null;
  let recCanvasEl;
  let wavePhase      = 0;
  let waveSmoothAmp  = 6;
  let waveSmoothBoost = 0;
  let waveSmoothScale = 1;

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
      waveSource   = waveCtx.createMediaStreamSource(waveStream);
      waveSource.connect(gain); gain.connect(waveAnalyser);
      audioChunks  = [];
      mediaRecorder = new MediaRecorder(waveStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start();
      isRecording  = true;
      recSeconds   = 0;
      showRecOverlay = true;
      requestAnimationFrame(() => requestAnimationFrame(() => { recOverlayVisible = true; }));
      recInterval  = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch (err) { console.error('Mic:', err); }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.stop(); waveStream?.getTracks().forEach(t => t.stop());
    stopWaveAnim(); hideRecOverlay();
  }
  function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.onstop = null; mediaRecorder.stop();
    waveStream?.getTracks().forEach(t => t.stop());
    audioChunks = []; stopWaveAnim(); hideRecOverlay();
  }
  function hideRecOverlay() {
    recOverlayVisible = false;
    setTimeout(() => { showRecOverlay = false; }, 350);
  }
  async function handleRecStop() {
    if (!audioChunks.length) return;
    const blob = new Blob(audioChunks, { type: 'audio/webm' }); audioChunks = [];
    try {
      const token = user?.token || '';
      const form  = new FormData();
      form.append('file', blob, 'audio.webm'); form.append('language', 'pt');
      const res  = await fetch('https://ipc.alfredoooh.workers.dev/ai/transcribe', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: form
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) { inputText = (inputText ? inputText + ' ' : '') + text; setTimeout(autoResize, 10); }
    } catch (e) { console.error('Transcribe:', e); }
  }

  function startWaveAnim() {
    const freq = waveAnalyser ? new Uint8Array(waveAnalyser.frequencyBinCount) : null;
    function frame() {
      if (!showRecOverlay) return;
      waveAnimFrame = requestAnimationFrame(frame);
      const canvas = recCanvasEl; if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let targetAmp = 6, targetBoost = 0, totalEnergy = 0, bass = 0;
      if (waveAnalyser && freq) {
        waveAnalyser.getByteFrequencyData(freq);
        const len = freq.length, be = Math.floor(len*.12), me = Math.floor(len*.5);
        const br = Math.pow([...freq].slice(0,be).reduce((a,b)=>a+b,0)/be/255,.4);
        const mr = Math.pow([...freq].slice(be,me).reduce((a,b)=>a+b,0)/(me-be)/255,.4);
        const tr = Math.pow([...freq].reduce((a,b)=>a+b,0)/len/255,.4);
        bass = br; totalEnergy = tr;
        targetAmp = 5+br*80+mr*45+tr*30; targetBoost = br*75+mr*35+tr*20;
      } else { targetAmp = 6+Math.sin(wavePhase*1.1)*1.5; targetBoost = 1+Math.cos(wavePhase*.9)*.8; }
      waveSmoothAmp   += (targetAmp   - waveSmoothAmp)   * (targetAmp   > waveSmoothAmp   ? .7 : .06);
      waveSmoothBoost += (targetBoost - waveSmoothBoost) * (targetBoost > waveSmoothBoost ? .7 : .06);
      [[.55,.4,.30,.15,0],[.70,.6,.42,.30,1.1],[.85,.8,.54,.55,2.3],[.95,.9,.64,.80,3.7],[1,1,.72,1,5.2]]
        .forEach(([am,bm,base,op,ph]) => drawWaveLayer(ctx,w,h,waveSmoothAmp*am,waveSmoothBoost*bm,base,op,ph));
      const loader = document.getElementById('homeRecLoader');
      if (loader) {
        const ts = 1 + bass*.45 + totalEnergy*.2;
        waveSmoothScale += (ts - waveSmoothScale) * (ts > waveSmoothScale ? .7 : .06);
        loader.style.transform = `scale(${waveSmoothScale.toFixed(4)})`;
      }
      wavePhase += .02;
    }
    frame();
  }
  function drawWaveLayer(ctx, w, h, amp, boost, baseYR, opacity, phOff) {
    const baseY = h*baseYR - boost*.5, pts = 180, step = w/(pts-1), ys = [];
    for (let i=0; i<pts; i++) {
      const t = i/(pts-1);
      ys.push(baseY + Math.sin(t*5.8+wavePhase+phOff)*amp + Math.sin(t*11.5+wavePhase*1.4+phOff)*(amp*.35) + Math.sin(t*3.2-wavePhase*.7+phOff)*(amp*.18) + Math.sin(t*22+wavePhase*2.5+phOff)*(boost*.18));
    }
    const grad = ctx.createLinearGradient(0, Math.min(...ys), 0, h);
    grad.addColorStop(0,   'rgba(66,165,245,0)');
    grad.addColorStop(.45, `rgba(55,150,235,${.08*opacity})`);
    grad.addColorStop(.7,  `rgba(40,130,220,${.22*opacity})`);
    grad.addColorStop(.88, `rgba(30,115,210,${.4*opacity})`);
    grad.addColorStop(1,   `rgba(25,100,200,${.56*opacity})`);
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, ys[0]);
    for (let i=1; i<pts; i++) { const px=(i-1)*step,x=i*step,cx=(px+x)/2,cy=(ys[i-1]+ys[i])/2; ctx.quadraticCurveTo(px,ys[i-1],cx,cy); }
    ctx.lineTo(w, ys[pts-1]); ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
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
    try { sessionStorage.setItem('nexa_pending_message', text); } catch(e) {}
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

  <!-- Content: quote + apps empurrados para baixo -->
  <main class="content">

    <!-- Quote no topo do bloco de conteúdo -->
    <div class="quote-block" class:in={mounted}>
      <p class="quote-text">"{todayQuote.text}"</p>
      <p class="quote-author">— {todayQuote.author}</p>
    </div>

    <!-- Apps logo acima do bottom bar -->
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

  <!-- Bottom bar glass branco adaptativo -->
  <div class="bottom" class:in={mounted}>
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
        <button class="bb-btn pulse-tap" on:click={() => openSheet('add')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
        </button>
        <div class="flex1"></div>
        <button class="apps-pill pulse-tap" on:click={() => openSheet('apps')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          <span class="apps-pill-label">Apps</span>
        </button>
        <div style="width:8px"></div>
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
  </div>

  <!-- ── Sheet ───────────────────────────────────────────────────────────── -->
  {#if showSheet}
    <div
      class="sheet-overlay"
      class:sheet-overlay-in={sheetVisible}
      on:click={closeSheet}
    ></div>
    <div class="sheet-box" class:sheet-box-in={sheetVisible}>
      <div class="sheet-handle"></div>

      {#if sheetMode === 'add'}
        {#each [['image','Enviar Imagem'],['upload','Enviar Ficheiro']] as [icon,label], i}
          {#if i > 0}<div class="sheet-sep"></div>{/if}
          <label class="sheet-row pulse-tap" style="cursor:pointer">
            <div class="sheet-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:20px;height:20px;background:#374151"></span>
            </div>
            <span class="sheet-label">{label}</span>
            <input type="file" accept={icon==='image'?'image/*':'*/*'} style="display:none" on:change={() => closeSheet()} />
          </label>
        {/each}
        <div class="sheet-sep"></div>
        <div class="sheet-row pulse-tap" on:click={() => { sheetMode = 'extras'; }}>
          <div class="sheet-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:20px;height:20px;background:#374151"></span>
          </div>
          <span class="sheet-label">Extras</span>
        </div>
        <div style="height:16px"></div>

      {:else if sheetMode === 'extras'}
        <div class="sheet-title">Extras</div>
        {#each [
          [flashMode,'Flash','flash','flash_filled',()=>{flashMode=!flashMode;if(flashMode)thinkMoreMode=false;}],
          [thinkMoreMode,'Think More','brain','brain_filled',()=>{thinkMoreMode=!thinkMoreMode;if(thinkMoreMode)flashMode=false;}],
          [sheetsEnabled,'Sheets','sheets','sheets_filled',()=>{sheetsEnabled=!sheetsEnabled;}]
        ] as [active,title,iconOff,iconOn,action], i}
          {#if i > 0}<div class="sheet-sep" style="margin-left:60px"></div>{/if}
          <div class="sheet-row pulse-tap" style="background:{active?'rgba(0,0,0,0.04)':'transparent'}" on:click={action}>
            <div class="sheet-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');-webkit-mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');width:18px;height:18px;background:#374151"></span>
            </div>
            <span class="sheet-label" style="flex:1">{title}</span>
            {#if active}<div style="width:8px;height:8px;border-radius:50%;background:#374151"></div>{/if}
          </div>
        {/each}
        <div style="height:16px"></div>

      {:else if sheetMode === 'apps'}
        <div class="sheet-title">Apps</div>
        {#each platformApps as app, i}
          {#if i > 0}<div class="sheet-sep"></div>{/if}
          <div class="sheet-row pulse-tap" on:click={() => { closeSheet(); setTimeout(() => openApp(app), 220); }}>
            <div class="sheet-icon-wrap">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />
              {:else}
                <span class="icon-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');width:20px;height:20px;background:#374151"></span>
              {/if}
            </div>
            <span class="sheet-label">{app.label}</span>
          </div>
        {/each}
        <div style="height:16px"></div>
      {/if}
    </div>
  {/if}

  <!-- ── Recording overlay ───────────────────────────────────────────────── -->
  {#if showRecOverlay}
    <div class="rec-overlay" class:rec-in={recOverlayVisible}>
      <!-- SVG mask inline -->
      <svg width="0" height="0" style="position:absolute">
        <defs>
          <mask id="homeRecMask">
            <rect width="100" height="100" fill="black"/>
            <polygon points="25,25 75,25 50,75" fill="white"/>
            <polygon points="50,25 75,75 25,75" fill="white"/>
            <polygon points="35,35 65,35 50,65" fill="white"/>
          </mask>
        </defs>
      </svg>
      <div class="rec-loader-wrap">
        <div class="rec-loader" id="homeRecLoader">
          <div class="rec-loader-inner"></div>
          <div class="rec-loader-box" style="-webkit-mask:url(#homeRecMask);mask:url(#homeRecMask);"></div>
        </div>
      </div>
      <div class="rec-wave-wrap">
        <canvas bind:this={recCanvasEl} class="rec-wave-canvas"></canvas>
      </div>
      <div class="rec-top-bar">
        <button class="rec-top-btn pulse-tap" on:click={cancelRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:20px;height:20px;background:#1F2937"></span>
        </button>
        <span class="rec-timer">{recTimerStr}</span>
        <button class="rec-top-btn pulse-tap" on:click={stopRecording}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
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

  /* Backgrounds */
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

  /* Scrims */
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

  /* Header */
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

  /* Content */
  .content {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 0; overflow: hidden;
  }

  /* Quote — elegante, sem card */
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
    letter-spacing: 0.01em;
  }
  .quote-author {
    font-size: 12px; font-weight: 500;
    color: rgba(255,255,255,0.38);
    letter-spacing: .04em; margin: 0;
  }

  /* Apps — acima do bottom, breathing room */
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
  .app-item:active .app-circle {
    transform: scale(0.86);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-circle {
    width: 56px; height: 56px; border-radius: 50%;
    background: rgba(255,255,255,0.13);
    border: 0.5px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    transition: transform .35s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
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
    letter-spacing: 0.01em;
  }

  /* ── Bottom bar: glass escuro adaptado ao fundo ── */
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
    /* glass escuro — mistura com qualquer fundo */
    background: rgba(20,20,20,0.45);
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 0.5px solid rgba(255,255,255,0.14);
    box-shadow:
      0 8px 32px rgba(0,0,0,0.35),
      inset 0 0.5px 0 rgba(255,255,255,0.12);
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

  /* Todos os botões da bottom bar: glass claro uniforme */
  .bb-btn {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(255,255,255,0.15);
    border: 0.5px solid rgba(255,255,255,0.12);
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active {
    background: rgba(255,255,255,0.22);
    transform: scale(0.88);
    transition: background .1s, transform .1s;
  }

  /* Apps pill: levemente mais sólido que os outros */
  .apps-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 22px; border: none; cursor: pointer;
    background: rgba(255,255,255,0.20);
    border: 0.5px solid rgba(255,255,255,0.18);
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .apps-pill:active {
    background: rgba(255,255,255,0.28);
    transform: scale(0.94);
    transition: background .1s, transform .1s;
  }
  .apps-pill-label { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }

  /* ── Sheet ─────────────────────────────────────────────────────────────── */
  .sheet-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0);
    transition: background .32s ease;
    pointer-events: auto;
  }
  .sheet-overlay.sheet-overlay-in { background: rgba(0,0,0,0.40); }

  .sheet-box {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 101;
    background: #fff; border-radius: 22px 22px 0 0;
    padding: 10px 0 calc(env(safe-area-inset-bottom,0px) + 14px);
    box-shadow: 0 -4px 40px rgba(0,0,0,0.14);
    transform: translateY(100%);
    transition: transform .32s cubic-bezier(0.2,0.9,0.3,1);
    will-change: transform;
  }
  .sheet-box.sheet-box-in { transform: translateY(0); }

  .sheet-handle {
    width: 38px; height: 4px; border-radius: 2px;
    background: rgba(0,0,0,0.13); margin: 0 auto 16px;
  }
  .sheet-title { padding: 0 20px 14px; font-size: 17px; font-weight: 700; color: #111827; }
  .sheet-row {
    display: flex; align-items: center; padding: 13px 20px;
    background: transparent; border: none; width: 100%;
    cursor: pointer; font-family: inherit;
    transition: background .18s ease;
  }
  .sheet-row:active { background: rgba(0,0,0,0.04); }
  .sheet-icon-wrap {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.06);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-right: 14px;
  }
  .sheet-label { font-size: 15px; font-weight: 500; color: #111827; text-align: left; }
  .sheet-sep { height: 0.5px; background: rgba(0,0,0,0.08); margin: 0 20px; }

  /* ── Recording overlay ─────────────────────────────────────────────────── */
  .rec-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: #F0F4F8;
    display: flex; flex-direction: column; overflow: hidden;
    opacity: 0; transform: translateY(24px);
    transition: opacity .38s cubic-bezier(0.4,0,0.2,1), transform .38s cubic-bezier(0.2,0.9,0.3,1);
    will-change: opacity, transform;
  }
  .rec-overlay.rec-in { opacity: 1; transform: translateY(0); }

  .rec-top-bar {
    position: absolute; top: 0; left: 0; right: 0;
    height: calc(env(safe-area-inset-top,0px) + 72px);
    display: flex; align-items: flex-end; justify-content: space-between;
    padding: 0 24px 12px; z-index: 10;
  }
  .rec-top-btn {
    width: 46px; height: 46px; border-radius: 50%; border: none;
    background: rgba(0,0,0,0.07);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background .2s ease, transform .2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-top-btn:active { background: rgba(0,0,0,0.12); transform: scale(0.90); }
  .rec-timer {
    font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums;
    color: #1F2937; letter-spacing: .06em;
  }
  .rec-loader-wrap {
    position: absolute; left: 0; right: 0; bottom: 28vh;
    display: flex; justify-content: center; pointer-events: none; z-index: 1;
  }
  .rec-loader {
    --c1: #42a5f5; --c2: #1565c0; --c3: #42a5f580; --c4: #1565c080; --c5: #42a5f540;
    position: relative; width: 100px; height: 100px; border-radius: 50%;
    box-shadow: 0 0 25px 0 var(--c3), 0 20px 50px 0 var(--c4);
    animation: homeRecColorize 6s ease-in-out infinite;
    transition: transform .06s linear;
  }
  .rec-loader-inner {
    position: absolute; inset: 0; border-radius: 50%;
    border-top: 1px solid var(--c1); border-bottom: 1px solid var(--c2);
    background: linear-gradient(180deg, var(--c5), var(--c4));
    box-shadow: inset 0 10px 10px 0 var(--c3), inset 0 -10px 10px 0 var(--c4);
  }
  .rec-loader-box {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, var(--c1) 30%, var(--c2) 70%);
  }
  @keyframes homeRecColorize {
    0%,100% { filter: hue-rotate(0deg); }
    25%      { filter: hue-rotate(-12deg); }
    50%      { filter: hue-rotate(-24deg); }
    75%      { filter: hue-rotate(-12deg); }
  }
  .rec-wave-wrap {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 48vh; min-height: 240px; pointer-events: none; z-index: 0;
  }
  .rec-wave-canvas { display: block; width: 100%; height: 100%; }

  /* Interações suaves globais */
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