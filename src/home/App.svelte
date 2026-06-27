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

  // ── Popup (substituiu Sheet) ───────────────────────────────────────────────
  let showPopup    = false;
  let popupVisible = false;
  let popupMode    = ''; // 'add' | 'extras' | 'apps'
  let popupAnchorEl = null;
  let popupPos = { bottom: 0, left: 0 };
  let flashMode     = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function openPopup(mode, event) {
    popupMode = mode;
    popupAnchorEl = event?.currentTarget ?? null;
    if (popupAnchorEl) {
      const rect = popupAnchorEl.getBoundingClientRect();
      popupPos = {
        bottom: window.innerHeight - rect.top + 8,
        left:   Math.max(12, rect.left - 8),
      };
    }
    showPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { popupVisible = true; }));
  }
  function closePopup() {
    popupVisible = false;
    setTimeout(() => { showPopup = false; popupMode = ''; }, 220);
  }
  function switchPopup(mode) {
    popupMode = mode;
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
  let recSeconds        = 0;
  let recInterval       = null;
  let recCanvasEl;
  let wavePhase      = 0;
  let waveSmoothAmp  = 6;
  let waveSmoothBoost = 0;

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
      recInterval  = setInterval(() => recSeconds++, 1000);
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
      if (!isRecording && !recCanvasEl) return;
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
      let targetAmp = 6, targetBoost = 0;
      if (waveAnalyser && freq) {
        waveAnalyser.getByteFrequencyData(freq);
        const len = freq.length, be = Math.floor(len*.12), me = Math.floor(len*.5);
        const br = Math.pow([...freq].slice(0,be).reduce((a,b)=>a+b,0)/be/255,.4);
        const mr = Math.pow([...freq].slice(be,me).reduce((a,b)=>a+b,0)/(me-be)/255,.4);
        const tr = Math.pow([...freq].reduce((a,b)=>a+b,0)/len/255,.4);
        targetAmp = 5+br*80+mr*45+tr*30; targetBoost = br*75+mr*35+tr*20;
      } else { targetAmp = 6+Math.sin(wavePhase*1.1)*1.5; targetBoost = 1+Math.cos(wavePhase*.9)*.8; }
      waveSmoothAmp   += (targetAmp   - waveSmoothAmp)   * (targetAmp   > waveSmoothAmp   ? .7 : .06);
      waveSmoothBoost += (targetBoost - waveSmoothBoost) * (targetBoost > waveSmoothBoost ? .7 : .06);
      [[.55,.4,.30,.15,0],[.70,.6,.42,.30,1.1],[.85,.8,.54,.55,2.3],[.95,.9,.64,.80,3.7],[1,1,.72,1,5.2]]
        .forEach(([am,bm,base,op,ph]) => drawWaveLayer(ctx,w,h,waveSmoothAmp*am,waveSmoothBoost*bm,base,op,ph));
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

  <!-- ── Bottom bar / Recording card ────────────────────────────────────── -->
  <div class="bottom" class:in={mounted}>
    {#if isRecording}
      <!-- Recording card — inline no lugar do bottom bar -->
      <div class="rec-card" class:rec-card-in={isRecording}>
        <!-- Wave canvas de fundo -->
        <canvas bind:this={recCanvasEl} class="rec-card-canvas"></canvas>

        <div class="rec-card-inner">
          <!-- Fechar (cancelar) -->
          <button class="rec-action-btn pulse-tap" on:click={cancelRecording}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:rgba(255,255,255,0.75)"></span>
          </button>

          <!-- Timer + indicador vermelho -->
          <div class="rec-center">
            <div class="rec-dot"></div>
            <span class="rec-timer-inline">{recTimerStr}</span>
          </div>

          <!-- Confirmar (stop + transcrever) -->
          <button class="rec-action-btn rec-send-btn pulse-tap" on:click={stopRecording}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
          <button class="bb-btn pulse-tap" bind:this={popupAnchorEl} on:click={(e) => openPopup('add', e)}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </button>
          <div class="flex1"></div>
          <button class="apps-pill pulse-tap" on:click={(e) => openPopup('apps', e)}>
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
    {/if}
  </div>

  <!-- ── Popup blur (substitui Sheet) ──────────────────────────────────── -->
  {#if showPopup}
    <div class="popup-overlay" on:click={closePopup}></div>
    <div
      class="popup-box"
      class:popup-box-in={popupVisible}
      style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;"
    >
      {#if popupMode === 'add'}
        <!-- Enviar imagem -->
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label">Enviar Imagem</span>
          <input type="file" accept="image/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <!-- Enviar ficheiro -->
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label">Enviar Ficheiro</span>
          <input type="file" accept="*/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <!-- Extras -->
        <button class="popup-row pulse-tap" on:click={() => switchPopup('extras')}>
          <div class="popup-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </div>
          <span class="popup-label">Extras</span>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:14px;height:14px;background:rgba(255,255,255,0.40);margin-left:auto"></span>
        </button>

      {:else if popupMode === 'extras'}
        <!-- Voltar -->
        <button class="popup-row popup-back-row pulse-tap" on:click={() => switchPopup('add')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:16px;height:16px;background:rgba(255,255,255,0.55)"></span>
          <span class="popup-label" style="color:rgba(255,255,255,0.55);font-size:13px">Extras</span>
        </button>
        <div class="popup-sep"></div>
        {#each [
          [flashMode,'Flash','flash','flash_filled',()=>{flashMode=!flashMode;if(flashMode)thinkMoreMode=false;}],
          [thinkMoreMode,'Think More','brain','brain_filled',()=>{thinkMoreMode=!thinkMoreMode;if(thinkMoreMode)flashMode=false;}],
          [sheetsEnabled,'Sheets','sheets','sheets_filled',()=>{sheetsEnabled=!sheetsEnabled;}]
        ] as [active, title, iconOff, iconOn, action], i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button
            class="popup-row pulse-tap"
            style={active ? 'background:rgba(255,255,255,0.08)' : ''}
            on:click={action}
          >
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');-webkit-mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <span class="popup-label" style="flex:1">{title}</span>
            {#if active}
              <div class="popup-active-dot"></div>
            {/if}
          </button>
        {/each}

      {:else if popupMode === 'apps'}
        <div class="popup-title">Apps</div>
        {#each platformApps as app, i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button class="popup-row pulse-tap" on:click={() => { closePopup(); setTimeout(() => openApp(app), 180); }}>
            <div class="popup-icon-wrap" style="border-radius:8px;overflow:hidden;background:transparent">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />
              {:else}
                <span class="icon-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');width:20px;height:20px;background:rgba(255,255,255,0.85)"></span>
              {/if}
            </div>
            <span class="popup-label">{app.label}</span>
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
    overflow: hidden;
  }

  /* Quote */
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

  /* Apps */
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
  }

  /* ── Bottom wrapper ── */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom,0px) + 20px);
    flex-shrink: 0;
    opacity: 0; transform: translateY(18px);
    transition: opacity .6s .4s ease, transform .6s .4s ease;
  }
  .bottom.in { opacity: 1; transform: translateY(0); }

  /* Bottom bar normal */
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
  .apps-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 22px; border: none; cursor: pointer;
    background: rgba(255,255,255,0.20);
    border: 0.5px solid rgba(255,255,255,0.18);
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .apps-pill:active { background: rgba(255,255,255,0.28); transform: scale(0.94); }
  .apps-pill-label { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }

  /* ── Recording card (inline, substitui o bottom bar) ── */
  .rec-card {
    position: relative; overflow: hidden;
    border-radius: 24px;
    background: rgba(20,20,20,0.55);
    backdrop-filter: blur(28px) saturate(1.6);
    -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 0.5px solid rgba(255,255,255,0.14);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.12);
    height: 64px;
    animation: recCardIn .3s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes recCardIn {
    from { opacity:0; transform: scale(0.96) translateY(8px); }
    to   { opacity:1; transform: scale(1)    translateY(0);   }
  }

  /* Wave canvas de fundo dentro do card */
  .rec-card-canvas {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none; z-index: 0;
  }

  .rec-card-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: space-between;
    height: 100%; padding: 0 14px;
  }

  .rec-action-btn {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(255,255,255,0.12);
    border: 0.5px solid rgba(255,255,255,0.10);
    flex-shrink: 0;
    transition: background .2s ease, transform .2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-action-btn:active { background: rgba(255,255,255,0.20); transform: scale(0.88); }
  .rec-send-btn { background: rgba(255,255,255,0.18); }

  .rec-center {
    display: flex; align-items: center; gap: 8px;
    flex: 1; justify-content: center;
  }
  .rec-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #FF3B30;
    animation: recPulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes recPulse {
    0%,100% { opacity:1; transform: scale(1); }
    50%      { opacity:.5; transform: scale(0.8); }
  }
  .rec-timer-inline {
    font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums;
    color: rgba(255,255,255,0.90); letter-spacing: .06em;
  }

  /* ── Popup blur (dark, como bottom bar) ── */
  .popup-overlay {
    position: fixed; inset: 0; z-index: 50;
    pointer-events: auto;
  }

  .popup-box {
    position: fixed; z-index: 51;
    width: 220px;
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
    color: rgba(255,255,255,0.88);
    flex: 1;
  }

  .popup-sep {
    height: 0.5px;
    background: rgba(255,255,255,0.09);
    margin: 0 14px;
  }

  .popup-active-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.85);
    flex-shrink: 0;
  }

  /* Interações */
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