<script>
  import { onMount } from 'svelte';
  import { getTheme, syncTheme } from '$shared/theme.js';
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

  let layers = [
    { img: '', visible: false },
    { img: '', visible: false },
  ];
  let activeLayer = 0;
  let bgCursor    = 0;

  function showImage(idx) {
    if (!bgImages.length) return;
    const img = bgImages[idx % bgImages.length];
    const next = activeLayer;
    layers[next] = { img, visible: true };
    layers = [...layers];
    const prev = 1 - next;
    setTimeout(() => {
      layers[prev] = { ...layers[prev], visible: false };
      layers = [...layers];
    }, 100);
  }

  function rotateBg() {
    bgCursor = (bgCursor + 1) % Math.max(bgImages.length, 1);
    activeLayer = 1 - activeLayer;
    showImage(bgCursor);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  let inputText = '';
  let textInputEl;

  // ── Recording (igual ao ChatPage) ──────────────────────────────────────────
  let mediaRecorder = null, audioChunks = [], isRecording = false;
  let waveOverlayCtx = null, waveOverlayAnalyser = null, waveOverlaySource = null;
  let waveOverlayStream = null, waveOverlayAnimFrame = null;
  let showRecOverlay = false;
  let recSeconds = 0;
  let recInterval = null;
  let recCanvasEl;
  let wavePhaseLocal = 0, waveSmoothAmpLocal = 6, waveSmoothBoostLocal = 0, waveSmoothScaleLocal = 1;

  $: recTimerStr = (() => { const m=Math.floor(recSeconds/60),s=recSeconds%60; return `${m}:${s.toString().padStart(2,'0')}`; })();

  // ── Modal sheet (igual ao ChatPage) ────────────────────────────────────────
  let showSheet   = false;
  let sheetMode   = ''; // 'add' | 'extras'
  let flashMode   = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function showToastLocal(msg) {
    // fallback simples — idealmente usa o showToast global
    try { (window.showToast || console.log)(msg); } catch(e) {}
  }

  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, 150) + 'px';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const isMobile = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
      if (!isMobile && !e.shiftKey) {
        e.preventDefault();
        if (inputText.trim()) navigateToAI();
      }
    }
  }

  function navigateToAI() {
    const text = inputText.trim();
    if (!text) return;
    const aiApp = ALL_APPS.find(x => x.id === 'ai');
    if (!aiApp) return;
    try { sessionStorage.setItem('nexa_pending_message', text); } catch(e) {}
    window.location.href = aiApp.path;
  }

  // ── Recording logic (copiado do ChatPage) ──────────────────────────────────
  async function startRecording() {
    if (isRecording) return;
    try {
      waveOverlayStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveOverlayCtx = new (window.AudioContext || window.webkitAudioContext)();
      waveOverlayAnalyser = waveOverlayCtx.createAnalyser();
      waveOverlayAnalyser.fftSize = 1024; waveOverlayAnalyser.smoothingTimeConstant = 0.25;
      waveOverlayAnalyser.minDecibels = -110; waveOverlayAnalyser.maxDecibels = -5;
      const gain = waveOverlayCtx.createGain(); gain.gain.value = 6;
      waveOverlaySource = waveOverlayCtx.createMediaStreamSource(waveOverlayStream);
      waveOverlaySource.connect(gain); gain.connect(waveOverlayAnalyser);
      audioChunks = [];
      mediaRecorder = new MediaRecorder(waveOverlayStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start(); isRecording = true;
      recSeconds = 0; showRecOverlay = true;
      recInterval = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch (err) { showToastLocal('Sem acesso ao microfone'); }
  }

  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.stop(); waveOverlayStream?.getTracks().forEach(t=>t.stop());
    stopWaveAnim(); showRecOverlay = false;
  }

  function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.onstop = null; mediaRecorder.stop();
    waveOverlayStream?.getTracks().forEach(t=>t.stop());
    audioChunks = []; stopWaveAnim(); showRecOverlay = false;
  }

  async function handleRecStop() {
    if (!audioChunks.length) return;
    const blob = new Blob(audioChunks, { type:'audio/webm' }); audioChunks = [];
    showToastLocal('A transcrever…');
    try {
      const token = user?.token || '';
      const form = new FormData(); form.append('file', blob, 'audio.webm'); form.append('language', 'pt');
      const res = await fetch(`https://ipc.alfredoooh.workers.dev/ai/transcribe`, { method:'POST', headers:{'Authorization':'Bearer '+token}, body:form });
      if (!res.ok) throw new Error('Erro na transcrição');
      const data = await res.json(); const text = (data.text||'').trim();
      if (text) {
        inputText = (inputText ? inputText + ' ' : '') + text;
        setTimeout(autoResize, 10);
      } else showToastLocal('Nenhum texto reconhecido');
    } catch (err) { showToastLocal('Erro ao transcrever áudio'); }
  }

  function startWaveAnim() {
    let freq = null;
    if (waveOverlayAnalyser) freq = new Uint8Array(waveOverlayAnalyser.frequencyBinCount);
    function frame() {
      if (!showRecOverlay) return;
      waveOverlayAnimFrame = requestAnimationFrame(frame);
      const canvas = recCanvasEl; if (!canvas) return;
      const ctx = canvas.getContext('2d'); const w=canvas.clientWidth, h=canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      let targetAmp=6, targetBoost=0, totalEnergy=0, bass=0;
      if (waveOverlayAnalyser && freq) {
        waveOverlayAnalyser.getByteFrequencyData(freq);
        const len=freq.length, be=Math.floor(len*.12), me=Math.floor(len*.5);
        const br=Math.pow([...freq].slice(0,be).reduce((a,b)=>a+b,0)/be/255,.4);
        const mr=Math.pow([...freq].slice(be,me).reduce((a,b)=>a+b,0)/(me-be)/255,.4);
        const tr=Math.pow([...freq].reduce((a,b)=>a+b,0)/len/255,.4);
        bass=br; totalEnergy=tr; targetAmp=5+br*80+mr*45+tr*30; targetBoost=br*75+mr*35+tr*20;
      } else { targetAmp=6+Math.sin(wavePhaseLocal*1.1)*1.5; targetBoost=1+Math.cos(wavePhaseLocal*.9)*.8; }
      const at=targetAmp>waveSmoothAmpLocal?.7:.06, db=targetBoost>waveSmoothBoostLocal?.7:.06;
      waveSmoothAmpLocal+=(targetAmp-waveSmoothAmpLocal)*at;
      waveSmoothBoostLocal+=(targetBoost-waveSmoothBoostLocal)*db;
      [[.55,.4,.30,.15,0],[.70,.6,.42,.30,1.1],[.85,.8,.54,.55,2.3],[.95,.9,.64,.80,3.7],[1,1,.72,1,5.2]].forEach(([am,bm,base,op,ph])=>{
        drawWaveLayer(ctx,w,h,waveSmoothAmpLocal*am,waveSmoothBoostLocal*bm,base,op,ph);
      });
      const loader=document.getElementById('homeRecLoaderEl');
      if(loader){const ts=1+bass*.45+totalEnergy*.2; const a2=ts>waveSmoothScaleLocal?.7:.06; waveSmoothScaleLocal+=(ts-waveSmoothScaleLocal)*a2; loader.style.transform=`scale(${waveSmoothScaleLocal.toFixed(4)})`;}
      wavePhaseLocal+=.02;
    }
    frame();
  }

  function drawWaveLayer(ctx,w,h,amp,boost,baseYR,opacity,phOff) {
    const baseY=h*baseYR-boost*.5, pts=180, step=w/(pts-1), ys=[];
    for(let i=0;i<pts;i++){const t=i/(pts-1);ys.push(baseY+Math.sin(t*5.8+wavePhaseLocal+phOff)*amp+Math.sin(t*11.5+wavePhaseLocal*1.4+phOff)*(amp*.35)+Math.sin(t*3.2-wavePhaseLocal*.7+phOff)*(amp*.18)+Math.sin(t*22+wavePhaseLocal*2.5+phOff)*(boost*.18));}
    const topY=Math.min(...ys), grad=ctx.createLinearGradient(0,topY,0,h);
    grad.addColorStop(0,'rgba(66,165,245,0)'); grad.addColorStop(.45,`rgba(55,150,235,${.08*opacity})`); grad.addColorStop(.7,`rgba(40,130,220,${.22*opacity})`); grad.addColorStop(.88,`rgba(30,115,210,${.4*opacity})`); grad.addColorStop(1,`rgba(25,100,200,${.56*opacity})`);
    ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0,ys[0]);
    for(let i=1;i<pts;i++){const px=(i-1)*step,x=i*step,cx=(px+x)/2,cy=(ys[i-1]+ys[i])/2;ctx.quadraticCurveTo(px,ys[i-1],cx,cy);}
    ctx.lineTo(w,ys[pts-1]); ctx.lineTo(w,h); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  }

  function stopWaveAnim() {
    if(waveOverlayAnimFrame){cancelAnimationFrame(waveOverlayAnimFrame);waveOverlayAnimFrame=null;}
    if(waveOverlaySource){try{waveOverlaySource.disconnect();}catch(e){}waveOverlaySource=null;}
    if(waveOverlayCtx){try{waveOverlayCtx.close();}catch(e){}waveOverlayCtx=null;}
    waveOverlayAnalyser=null;
  }

  // ── Modal sheet simples (sem Svelte component externo para não depender) ───
  // Usamos um overlay nativo dentro do próprio componente

  let mounted = false;
  let bgTimer;

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    if (bgImages.length) {
      activeLayer = 0;
      layers[0] = { img: bgImages[0], visible: true };
      layers[1] = { img: bgImages[Math.min(1, bgImages.length-1)], visible: false };
      layers = [...layers];
    }

    requestAnimationFrame(() => { mounted = true; });

    if (bgImages.length > 1) bgTimer = setInterval(rotateBg, 15000);
    return () => clearInterval(bgTimer);
  });

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {}
    }
    window.location.href = app.path;
  }
</script>

<div class="root">

  {#each layers as layer}
    <div
      class="bg-layer"
      class:bg-on={layer.visible}
      style="background-image:url('{layer.img}');"
    ></div>
  {/each}

  {#if !bgImages.length}
    <div class="bg-fallback"></div>
  {/if}

  <div class="scrim-top"></div>
  <div class="scrim-bottom"></div>

  <header class="header" class:in={mounted}>
    <div class="logo-row">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
    </div>
    <button class="avatar-pill" style="background:{avatarColor}" on:click={logout}>
      {userInitial}
    </button>
  </header>

  <main class="content">

    <!-- Saudação centrada -->
    <div class="greeting-center" class:in={mounted}>
      <p class="greeting-sub">{getGreeting()}</p>
      <h1 class="greeting-name">{userName.split(' ')[0]}</h1>
    </div>

    <div class="apps-wrap" class:in={mounted}>
      <div class="apps-scroll">
        {#each platformApps as app, i}
          <button
            class="app-item"
            style="animation-delay:{i * 40}ms"
            class:app-in={mounted}
            on:click={() => openApp(app)}
          >
            <div class="app-circle">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} class="app-img" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} class="app-img" />
              {:else}
                <span
                  class="app-svg-mask"
                  style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');"
                ></span>
              {/if}
            </div>
            <span class="app-name">{app.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Quote reorganizada -->
    <div class="quote-block" class:in={mounted}>
      <div class="quote-card">
        <div class="quote-mark">"</div>
        <p class="quote-text">{todayQuote.text}</p>
        <div class="quote-divider"></div>
        <p class="quote-author">— {todayQuote.author}</p>
      </div>
    </div>

  </main>

  <!-- Bottom bar glassmorphism branco -->
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
        <button class="add-btn pulse-tap" on:click={() => { sheetMode='add'; showSheet=true; }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:#374151"></span>
        </button>
        <div class="flex1"></div>
        {#if inputText.trim()}
          <button class="send-btn pulse-tap" on:click={navigateToAI}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:#111827"></span>
          </button>
        {:else}
          <button class="send-btn pulse-tap" on:click={startRecording}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:#111827"></span>
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- ── Modal Sheet nativa ─────────────────────────────────────────────── -->
  {#if showSheet}
    <div class="sheet-overlay" on:click={() => showSheet=false}></div>
    <div class="sheet-box">
      <div class="sheet-handle"></div>

      {#if sheetMode === 'add'}
        {#each [
          ['image','Enviar Imagem','image'],
          ['upload','Enviar Ficheiro','file']
        ] as [icon,label,kind], i}
          {#if i > 0}<div class="sheet-sep"></div>{/if}
          <label class="sheet-row pulse-tap" style="cursor:pointer">
            <div class="sheet-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:20px;height:20px;background:#374151"></span>
            </div>
            <span class="sheet-label">{label}</span>
            <input type="file" accept={kind==='image'?'image/*':'*/*'} style="display:none" on:change={e => { showSheet=false; }} />
          </label>
        {/each}
        <div class="sheet-sep"></div>
        <div class="sheet-row pulse-tap" on:click={() => { sheetMode='extras'; }}>
          <div class="sheet-icon-wrap">
            <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:20px;height:20px;background:#374151"></span>
          </div>
          <span class="sheet-label">Extras</span>
        </div>
        <div style="height:16px"></div>

      {:else if sheetMode === 'extras'}
        <div class="sheet-title">Extras</div>
        {#each [
          [flashMode, 'Flash', 'flash', 'flash_filled', () => { flashMode=!flashMode; if(flashMode) thinkMoreMode=false; }],
          [thinkMoreMode, 'Think More', 'brain', 'brain_filled', () => { thinkMoreMode=!thinkMoreMode; if(thinkMoreMode) flashMode=false; }],
          [sheetsEnabled, 'Sheets', 'sheets', 'sheets_filled', () => { sheetsEnabled=!sheetsEnabled; }]
        ] as [active, title, iconOff, iconOn, action], i}
          {#if i > 0}<div class="sheet-sep" style="margin-left:60px"></div>{/if}
          <div class="sheet-row pulse-tap"
            style="background:{active?'rgba(0,0,0,0.04)':'transparent'}"
            on:click={action}
          >
            <div class="sheet-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');-webkit-mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');width:18px;height:18px;background:#374151"></span>
            </div>
            <span class="sheet-label" style="flex:1">{title}</span>
            {#if active}<div style="width:8px;height:8px;border-radius:50%;background:#111827"></div>{/if}
          </div>
        {/each}
        <div style="height:16px"></div>
      {/if}
    </div>
  {/if}

  <!-- ── Recording overlay (igual ao ChatPage) ─────────────────────────── -->
  {#if showRecOverlay}
    <div class="rec-overlay">
      <div class="rec-loader-wrap">
        <div class="rec-loader" id="homeRecLoaderEl">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <mask id="homeRecClipping">
                <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
                <polygon points="25,25 75,25 50,75" fill="white"></polygon>
                <polygon points="50,25 75,75 25,75" fill="white"></polygon>
                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              </mask>
            </defs>
          </svg>
          <div class="rec-loader-box"></div>
        </div>
      </div>
      <div class="rec-wave-wrap">
        <canvas bind:this={recCanvasEl} class="rec-wave-canvas"></canvas>
      </div>
      <div class="rec-top-bar">
        <button class="rec-top-btn pulse-tap" on:click={cancelRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:20px;height:20px;background:#111827"></span>
        </button>
        <span class="rec-timer">{recTimerStr}</span>
        <button class="rec-top-btn pulse-tap" on:click={stopRecording}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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

  /* Background layers */
  .bg-layer {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    opacity: 0;
    transition: opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity;
  }
  .bg-layer.bg-on { opacity: 1; }

  .bg-fallback {
    position: absolute; inset: 0; z-index: 0;
    background: linear-gradient(160deg, #0d0d1a 0%, #1a0530 50%, #0a1628 100%);
  }

  .scrim-top {
    position: absolute; top: 0; left: 0; right: 0; height: 45%; z-index: 1;
    background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%);
    pointer-events: none;
  }
  .scrim-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 65%; z-index: 1;
    background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%);
    pointer-events: none;
  }

  /* Header */
  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 22px 10px;
    flex-shrink: 0;
    opacity: 0; transform: translateY(-10px);
    transition: opacity .5s ease, transform .5s ease;
  }
  .header.in { opacity: 1; transform: translateY(0); }
  .logo-row { display: flex; align-items: center; }
  .logo-img { width: 48px; height: 48px; object-fit: contain; }
  .avatar-pill {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 15px; font-weight: 700; color: #fff;
    cursor: pointer; transition: transform .15s, opacity .15s; flex-shrink: 0;
  }
  .avatar-pill:active { transform: scale(0.9); opacity: 0.8; }

  /* Content */
  .content {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: center;
    padding-bottom: 120px;
    overflow: hidden;
  }

  /* Saudação centrada */
  .greeting-center {
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    padding: 0 24px 36px;
    opacity: 0; transform: translateY(16px);
    transition: opacity .55s .1s ease, transform .55s .1s ease;
  }
  .greeting-center.in { opacity: 1; transform: translateY(0); }
  .greeting-sub {
    font-size: 15px; font-weight: 500;
    color: rgba(255,255,255,0.60);
    letter-spacing: .04em; margin-bottom: 6px;
    text-transform: uppercase;
  }
  .greeting-name {
    font-size: 52px; font-weight: 900;
    color: #fff; letter-spacing: -2px; line-height: 1.0;
    text-shadow: 0 2px 28px rgba(0,0,0,0.35);
  }

  /* Apps scroll */
  .apps-wrap {
    opacity: 0; transform: translateY(20px);
    transition: opacity .55s .2s ease, transform .55s .2s ease;
  }
  .apps-wrap.in { opacity: 1; transform: translateY(0); }
  .apps-scroll {
    display: flex; gap: 6px;
    padding: 0 18px 32px;
    overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
    justify-content: center;
  }
  .apps-scroll::-webkit-scrollbar { display: none; }
  .app-item {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    background: none; border: none; cursor: pointer;
    padding: 0 10px; flex-shrink: 0;
    opacity: 0; transform: translateY(12px) scale(0.9);
    transition: opacity .4s ease, transform .4s ease;
  }
  .app-item.app-in { opacity: 1; transform: translateY(0) scale(1); }
  .app-item:active .app-circle { transform: scale(0.88); }
  .app-circle {
    width: 58px; height: 58px; border-radius: 50%;
    background: rgba(255,255,255,0.14);
    border: 0.5px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s; overflow: hidden;
  }
  .app-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .app-svg-mask {
    display: block; width: 26px; height: 26px;
    background: rgba(255,255,255,0.9);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .app-name {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.82);
    white-space: nowrap; text-shadow: 0 1px 6px rgba(0,0,0,0.6);
  }

  /* Quote card */
  .quote-block {
    padding: 0 24px 0;
    opacity: 0; transform: translateY(12px);
    transition: opacity .55s .35s ease, transform .55s .35s ease;
  }
  .quote-block.in { opacity: 1; transform: translateY(0); }
  .quote-card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 0.5px solid rgba(255,255,255,0.15);
    border-radius: 18px;
    padding: 18px 20px 16px;
    display: flex; flex-direction: column; gap: 0;
  }
  .quote-mark {
    font-size: 40px; font-weight: 900; line-height: 0.8;
    color: rgba(255,255,255,0.25);
    font-family: Georgia, serif;
    margin-bottom: 6px;
  }
  .quote-text {
    font-size: 14px; font-weight: 400;
    color: rgba(255,255,255,0.82);
    line-height: 1.65; font-style: italic;
    margin: 0;
  }
  .quote-divider {
    height: 0.5px; background: rgba(255,255,255,0.15);
    margin: 12px 0 10px;
  }
  .quote-author {
    font-size: 12px; font-weight: 600;
    color: rgba(255,255,255,0.45);
    letter-spacing: .03em; margin: 0;
  }

  /* Bottom bar — glassmorphism branco */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 22px);
    flex-shrink: 0;
    opacity: 0; transform: translateY(20px);
    transition: opacity .5s .45s ease, transform .5s .45s ease;
  }
  .bottom.in { opacity: 1; transform: translateY(0); }
  .bottom-bar {
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 0.5px solid rgba(255,255,255,0.6);
    box-shadow: 0 8px 32px rgba(0,0,0,.20), 0 1px 0 rgba(255,255,255,0.8) inset;
    display: flex; flex-direction: column;
    user-select: none; overscroll-behavior: none;
  }
  .chat-input {
    resize: none; outline: none; border: none;
    background: transparent;
    font-size: 15px; line-height: 1.5;
    padding: 12px 18px 0;
    width: 100%; font-family: inherit;
    color: #111827;
    max-height: 150px; overflow-y: auto;
    -webkit-user-select: text; user-select: text;
  }
  .chat-input::placeholder { color: #9CA3AF; }
  .bb-row {
    display: flex; align-items: center;
    height: 52px; padding: 0 10px;
  }
  .flex1 { flex: 1; }
  .add-btn {
    width: 40px; height: 40px; margin-left: 4px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(0,0,0,0.07);
  }
  .send-btn {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: #111827;
  }

  /* Modal sheet */
  .sheet-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  }
  .sheet-box {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 101;
    background: #fff;
    border-radius: 20px 20px 0 0;
    padding: 10px 0 calc(env(safe-area-inset-bottom,0px) + 12px);
    box-shadow: 0 -4px 30px rgba(0,0,0,0.15);
    animation: sheetUp .28s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(0,0,0,0.15);
    margin: 0 auto 14px;
  }
  .sheet-title {
    padding: 0 20px 12px;
    font-size: 17px; font-weight: 700; color: #111827;
  }
  .sheet-row {
    display: flex; align-items: center;
    padding: 13px 20px;
    background: transparent;
    border: none; width: 100%;
    cursor: pointer; font-family: inherit;
  }
  .sheet-icon-wrap {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.06);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-right: 14px;
  }
  .sheet-label {
    font-size: 15px; font-weight: 500; color: #111827;
    text-align: left;
  }
  .sheet-sep {
    height: 0.5px; background: rgba(0,0,0,0.08);
    margin: 0 20px;
  }

  /* Recording overlay */
  .rec-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: #F9FAFB;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .rec-top-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 72px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; z-index: 10;
  }
  .rec-top-btn {
    width: 46px; height: 46px; border-radius: 50%; border: none;
    background: rgba(0,0,0,0.08);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }
  .rec-timer {
    font-size: 15px; font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #1F2937; letter-spacing: .04em;
  }
  .rec-loader-wrap {
    position: absolute; left: 0; right: 0; bottom: 28vh;
    display: flex; justify-content: center;
    pointer-events: none; z-index: 1;
  }
  .rec-loader {
    --color-one: #42a5f5; --color-two: #1565c0;
    --color-three: #42a5f580; --color-four: #1565c080;
    --color-five: #42a5f540; --time-animation: 2s;
    position: relative; border-radius: 50%;
    box-shadow: 0 0 25px 0 var(--color-three), 0 20px 50px 0 var(--color-four);
    animation: recColorize calc(var(--time-animation)*3) ease-in-out infinite;
    transition: transform .05s ease-out;
  }
  .rec-loader::before {
    content: ""; position: absolute; top: 0; left: 0;
    width: 100px; height: 100px; border-radius: 50%;
    border-top: solid 1px var(--color-one); border-bottom: solid 1px var(--color-two);
    background: linear-gradient(180deg, var(--color-five), var(--color-four));
    box-shadow: inset 0 10px 10px 0 var(--color-three), inset 0 -10px 10px 0 var(--color-four);
  }
  .rec-loader-box {
    width: 100px; height: 100px;
    background: linear-gradient(180deg, var(--color-one) 30%, var(--color-two) 70%);
    mask: url(#homeRecClipping); -webkit-mask: url(#homeRecClipping);
  }
  @keyframes recColorize {
    0%   { filter: hue-rotate(0deg); }
    20%  { filter: hue-rotate(-10deg); }
    40%  { filter: hue-rotate(-20deg); }
    60%  { filter: hue-rotate(-30deg); }
    80%  { filter: hue-rotate(-15deg); }
    100% { filter: hue-rotate(0deg); }
  }
  .rec-wave-wrap {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 48vh; min-height: 240px;
    pointer-events: none; z-index: 0;
  }
  .rec-wave-canvas { display: block; width: 100%; height: 100%; }

  .pulse-tap { cursor: pointer; transition: transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s; }
  .pulse-tap:active { transform: scale(0.97); opacity: .86; }
  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>