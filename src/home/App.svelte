<script>
  import { onMount } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';

  // ── Auth ──────────────────────────────────────────────────────────────────
  let user = null;
  $: userName    = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  const AVATAR_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE'];
  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  $: avatarColor = getAvatarColor(userName);

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  // ── Models ────────────────────────────────────────────────────────────────
  const MODELS = [
    { id: 'mistral-nemo',    label: 'Nemo',     sublabel: 'mistral-nemo'    },
    { id: 'deepseek-v4',     label: 'DeepSeek', sublabel: 'deepseek-v4'     },
    { id: 'deepseek-v4-pro', label: 'DS Pro',   sublabel: 'deepseek-v4-pro' },
  ];
  let currentModelId = MODELS[0].id;
  $: currentModel    = MODELS.find(m => m.id === currentModelId) ?? MODELS[0];

  // ── Drawer ────────────────────────────────────────────────────────────────
  let drawerOpen    = false;
  let drawerVisible = false;

  function openDrawer() {
    drawerOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { drawerVisible = true; }));
  }
  function closeDrawer() {
    drawerVisible = false;
    setTimeout(() => { drawerOpen = false; }, 320);
  }

  const DRAWER_ITEMS = [
    { icon: 'home',     label: 'Início',     action: () => {} },
    { icon: 'settings', label: 'Definições', action: () => {} },
    { icon: 'profile',  label: 'Perfil',     action: () => {} },
    { icon: 'help',     label: 'Ajuda',      action: () => {} },
  ];

  // ── Apps popup ────────────────────────────────────────────────────────────
  let showApps    = false;
  let appsVisible = false;
  let appsAnchorEl;
  let appsPos     = { top: 0, right: 0 };

  function openApps() {
    if (appsAnchorEl) {
      const rect = appsAnchorEl.getBoundingClientRect();
      appsPos = { top: rect.bottom + 8, right: window.innerWidth - rect.right };
    }
    showApps = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { appsVisible = true; }));
  }
  function closeApps() {
    appsVisible = false;
    setTimeout(() => { showApps = false; }, 220);
  }
  function toggleApps() {
    if (showApps) closeApps(); else openApps();
  }

  function openApp(app) {
    closeApps();
    if (app.id === 'ai') { try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {} }
    window.location.href = app.path;
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const THEMES = [
    { id: 'dark',  label: 'Escuro' },
    { id: 'light', label: 'Claro'  },
    { id: 'auto',  label: 'Auto'   },
  ];
  let appTheme = 'dark';

  function setTheme(t) {
    appTheme = t;
    try { localStorage.setItem('nexa_theme', t); } catch(e) {}
    document.documentElement.setAttribute('data-theme', t);
  }

  // ── Popup (add / extras / models) ─────────────────────────────────────────
  const POPUP_W = 230;

  let showPopup     = false;
  let popupVisible  = false;
  let popupMode     = '';
  let popupPos      = { bottom: 0, left: 0 };
  let popupFading   = false;
  let flashMode     = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function openPopup(mode, event) {
    popupMode = mode;
    const rect = event.currentTarget.getBoundingClientRect();
    const M    = 12;
    let left   = rect.left - 8;
    if (left + POPUP_W > window.innerWidth - M) left = window.innerWidth - POPUP_W - M;
    if (left < M) left = M;
    popupPos = { bottom: window.innerHeight - rect.top + 8, left };
    showPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { popupVisible = true; }));
  }
  function closePopup() {
    popupVisible = false;
    setTimeout(() => { showPopup = false; popupMode = ''; }, 220);
  }
  function switchPopup(mode) {
    popupFading = true;
    setTimeout(() => { popupMode = mode; popupFading = false; }, 130);
  }

  // ── Backgrounds ───────────────────────────────────────────────────────────
  let bgImages = [];
  try {
    const mods = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(mods);
  } catch(e) { bgImages = []; }

  let layers      = [{ img: '', visible: false }, { img: '', visible: false }];
  let activeLayer = 0;
  let bgCursor    = 0;

  function rotateBg() {
    bgCursor    = (bgCursor + 1) % Math.max(bgImages.length, 1);
    activeLayer = 1 - activeLayer;
    layers[activeLayer] = { img: bgImages[bgCursor % bgImages.length], visible: true };
    layers = [...layers];
    const prev = 1 - activeLayer;
    setTimeout(() => { layers[prev] = { ...layers[prev], visible: false }; layers = [...layers]; }, 100);
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  let inputText  = '';
  let textInputEl;

  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, 150) + 'px';
  }
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const mob = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
      if (!mob && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) navigateToAI(); }
    }
  }
  function navigateToAI() {
    const text = inputText.trim(); if (!text) return;
    const ai = ALL_APPS.find(x => x.id === 'ai'); if (!ai) return;
    try {
      sessionStorage.setItem('nexa_pending_message', text);
      sessionStorage.setItem('nexa_model', currentModelId);
    } catch(e) {}
    window.location.href = ai.path;
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  let mediaRecorder = null;
  let audioChunks   = [];
  let isRecording   = false;
  let waveCtx       = null;
  let waveAnalyser  = null;
  let waveSource    = null;
  let waveStream    = null;
  let waveAnimFrame = null;
  let recSeconds    = 0;
  let recInterval   = null;
  let recCanvasEl;
  let wavePhase     = 0;

  $: recTimerStr = (() => {
    const m = Math.floor(recSeconds / 60), s = recSeconds % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
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
      audioChunks   = [];
      mediaRecorder = new MediaRecorder(waveStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start();
      isRecording = true; recSeconds = 0;
      recInterval = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch(err) { console.error('Mic:', err); }
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
      const form = new FormData();
      form.append('file', blob, 'audio.webm'); form.append('language', 'pt');
      const res = await fetch('https://ipc.alfredoooh.workers.dev/ai/transcribe', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + (user?.token || '') }, body: form
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) { inputText = (inputText ? inputText + ' ' : '') + text; setTimeout(autoResize, 10); }
    } catch(e) { console.error('Transcribe:', e); }
  }

  function startWaveAnim() {
    const N = 5, bh = new Array(N).fill(0);
    function frame() {
      if (!recCanvasEl) return;
      waveAnimFrame = requestAnimationFrame(frame);
      const c = recCanvasEl, dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w*dpr || c.height !== h*dpr) { c.width = w*dpr; c.height = h*dpr; }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h);
      let bands = new Array(N).fill(0.08);
      if (waveAnalyser) {
        const freq = new Uint8Array(waveAnalyser.frequencyBinCount);
        waveAnalyser.getByteFrequencyData(freq);
        const L = freq.length;
        const def = [[0,Math.floor(L*.04)],[Math.floor(L*.04),Math.floor(L*.10)],[Math.floor(L*.10),Math.floor(L*.25)],[Math.floor(L*.25),Math.floor(L*.50)],[Math.floor(L*.50),Math.floor(L*.80)]];
        bands = def.map(([s,e]) => { const sl=[...freq].slice(s,e); return Math.pow(sl.reduce((a,b)=>a+b,0)/sl.length/255,0.5); });
      } else {
        wavePhase += 0.04;
        bands = [0,1,2,3,4].map(i => 0.06+Math.abs(Math.sin(wavePhase*1.2+i*0.8))*0.18);
      }
      for (let i=0;i<N;i++) bh[i]+=(bands[i]-bh[i])*(bands[i]>bh[i]?0.65:0.12);
      const bw=3.5,gap=5,tw=N*bw+(N-1)*gap,sx=(w-tw)/2,cy=h/2,mh=h*0.72;
      for (let i=0;i<N;i++) {
        const bhi=Math.max(4,bh[i]*mh),x=sx+i*(bw+gap),y=cy-bhi/2;
        ctx.beginPath(); ctx.roundRect(x,y,bw,bhi,bw/2);
        ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill();
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

  let mounted = false;
  let bgTimer;
  onMount(() => {
    user = requireAuth(); if (!user) return;
    try {
      const saved = localStorage.getItem('nexa_theme');
      if (saved) { appTheme = saved; document.documentElement.setAttribute('data-theme', saved); }
    } catch(e) {}
    if (bgImages.length) {
      layers[0] = { img: bgImages[0], visible: true };
      layers[1] = { img: bgImages[Math.min(1, bgImages.length-1)], visible: false };
      layers = [...layers];
    }
    requestAnimationFrame(() => { mounted = true; });
    if (bgImages.length > 1) bgTimer = setInterval(rotateBg, 15000);
    return () => { clearInterval(bgTimer); };
  });
</script>

<div class="root">

  {#each layers as layer}
    <div class="bg-layer" class:bg-on={layer.visible} style="background-image:url('{layer.img}');"></div>
  {/each}
  {#if !bgImages.length}<div class="bg-fallback"></div>{/if}

  <!-- ── Header ── -->
  <!-- .header-lifted eleva o z-index acima do overlay de apps para o botão não ficar blur -->
  <header class="header" class:in={mounted} class:header-lifted={showApps}>
    <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
    <div class="header-right">
      <!-- Botão apps: alterna entre ícone apps e X consoante estado do popup -->
      <button class="hdr-btn pulse-tap" bind:this={appsAnchorEl} on:click={toggleApps}>
        {#if showApps}
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:17px;height:17px;background:#fff"></span>
        {:else}
          <span class="icon-mask" style="mask-image:url('/icons/svg/apps.svg');-webkit-mask-image:url('/icons/svg/apps.svg');width:22px;height:22px;background:#fff"></span>
        {/if}
      </button>
      <button class="hdr-btn pulse-tap" on:click={openDrawer}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:22px;height:22px;background:#fff"></span>
      </button>
    </div>
  </header>

  <!-- ── Content spacer ── -->
  <main class="content"></main>

  <!-- ── Bottom bar ── -->
  <div class="bottom" class:in={mounted}>
    {#if isRecording}
      <div class="rec-card">
        <canvas bind:this={recCanvasEl} class="rec-canvas"></canvas>
        <div class="rec-inner">
          <button class="rec-btn pulse-tap" on:click={cancelRecording}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:rgba(255,255,255,0.80)"></span>
          </button>
          <div class="rec-center">
            <div class="rec-dot"></div>
            <span class="rec-timer">{recTimerStr}</span>
          </div>
          <button class="rec-btn rec-send pulse-tap" on:click={stopRecording}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </div>
    {:else}
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
          <button class="bb-btn pulse-tap" on:click={(e) => openPopup('add', e)}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
          </button>
          <div class="flex1"></div>
          <button class="model-pill pulse-tap" on:click={(e) => openPopup('models', e)}>
            <span class="model-pill-label">{currentModel.label}</span>
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_down.svg');-webkit-mask-image:url('/icons/svg/arrow_down.svg');width:11px;height:11px;background:rgba(255,255,255,0.50)"></span>
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

  <!-- ── Popup add / extras / models ── -->
  {#if showPopup}
    <div class="popup-overlay" on:click={closePopup}></div>
    <div
      class="popup-box"
      class:popup-in={popupVisible}
      style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;width:{POPUP_W}px;"
    >
      <div class="popup-content" class:fading={popupFading}>

        {#if popupMode === 'add'}
          <label class="popup-row pulse-tap" style="cursor:pointer">
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');width:17px;height:17px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <span class="popup-label">Enviar Imagem</span>
            <input type="file" accept="image/*" style="display:none" on:change={closePopup} />
          </label>
          <div class="popup-sep"></div>
          <label class="popup-row pulse-tap" style="cursor:pointer">
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:17px;height:17px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <span class="popup-label">Enviar Ficheiro</span>
            <input type="file" accept="*/*" style="display:none" on:change={closePopup} />
          </label>
          <div class="popup-sep"></div>
          <button class="popup-row pulse-tap" on:click={() => switchPopup('extras')}>
            <div class="popup-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:17px;height:17px;background:rgba(255,255,255,0.85)"></span>
            </div>
            <span class="popup-label" style="flex:1">Extras</span>
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:13px;height:13px;background:rgba(255,255,255,0.30)"></span>
          </button>

        {:else if popupMode === 'extras'}
          <button class="popup-row popup-back pulse-tap" on:click={() => switchPopup('add')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:15px;height:15px;background:rgba(255,255,255,0.38)"></span>
            <span class="popup-label" style="color:rgba(255,255,255,0.38);font-size:13px">Extras</span>
          </button>
          <div class="popup-sep"></div>
          {#each [
            [flashMode,    'Flash',      'flash',  'flash_filled',  () => { flashMode     = !flashMode;     if (flashMode)     thinkMoreMode = false; }],
            [thinkMoreMode,'Think More', 'brain',  'brain_filled',  () => { thinkMoreMode = !thinkMoreMode; if (thinkMoreMode) flashMode     = false; }],
            [sheetsEnabled,'Sheets',     'sheets', 'sheets_filled', () => { sheetsEnabled = !sheetsEnabled; }],
          ] as [active, title, ico, icoOn, action], i}
            {#if i > 0}<div class="popup-sep"></div>{/if}
            <button class="popup-row pulse-tap" style={active ? 'background:rgba(255,255,255,0.07)' : ''} on:click={action}>
              <div class="popup-icon-wrap">
                <span class="icon-mask" style="mask-image:url('/icons/svg/{active?icoOn:ico}.svg');-webkit-mask-image:url('/icons/svg/{active?icoOn:ico}.svg');width:17px;height:17px;background:rgba(255,255,255,0.85)"></span>
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
              <div class="model-info">
                <span class="popup-label">{model.label}</span>
                <span class="model-sub">{model.sublabel}</span>
              </div>
              {#if currentModelId === model.id}
                <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');width:15px;height:15px;background:rgba(255,255,255,0.85)"></span>
              {/if}
            </button>
          {/each}
        {/if}

      </div>
    </div>
  {/if}

  <!-- ── Apps popup (ancorado ao ícone, sem botão close interno) ── -->
  {#if showApps}
    <div class="apps-overlay" on:click={closeApps}></div>
    <div
      class="apps-popup"
      class:apps-popup-in={appsVisible}
      style="top:{appsPos.top}px;right:{appsPos.right}px;"
    >
      <!-- Sem close button aqui — está no ícone de apps no header -->
      <div class="apps-popup-label">Apps</div>

      <div class="apps-grid">
        {#each platformApps as app, i}
          <button
            class="ag-item pulse-tap"
            style="animation-delay:{i*25}ms"
            class:ag-in={appsVisible}
            on:click={() => openApp(app)}
          >
            <!-- Sem container/círculo — ícone direto -->
            <div class="ag-icon">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} class="ag-img" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} class="ag-img" />
              {:else}
                <span class="icon-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');width:36px;height:36px;background:rgba(255,255,255,0.88)"></span>
              {/if}
            </div>
            <span class="ag-name">{app.label}</span>
          </button>
        {/each}
      </div>

      <!-- Secção Tema -->
      <div class="apps-section-divider"></div>
      <div class="apps-section-title">Tema</div>
      <div class="theme-pills">
        {#each THEMES as t}
          <button
            class="theme-pill pulse-tap"
            class:theme-pill-on={appTheme === t.id}
            on:click={() => setTheme(t.id)}
          >{t.label}</button>
        {/each}
      </div>
      <div style="height:10px"></div>
    </div>
  {/if}

  <!-- ── Drawer (light) ── -->
  {#if drawerOpen}
    <div class="drawer-overlay" class:drawer-overlay-in={drawerVisible} on:click={closeDrawer}></div>
    <div class="drawer" class:drawer-in={drawerVisible}>
      <!-- Header perfil -->
      <div class="drawer-header">
        <div class="drawer-avatar" style="background:{avatarColor}">{userInitial}</div>
        <div class="drawer-user-info">
          <span class="drawer-user-name">{userName}</span>
          <span class="drawer-user-email">{user?.email || ''}</span>
        </div>
      </div>

      <div class="drawer-sep"></div>

      <nav class="drawer-nav">
        {#each DRAWER_ITEMS as item, i}
          <button
            class="drawer-item pulse-tap"
            style="animation-delay:{drawerVisible ? i*38 : 0}ms"
            class:drawer-item-in={drawerVisible}
            on:click={() => { item.action(); closeDrawer(); }}
          >
            <div class="drawer-icon-wrap">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:19px;height:19px;background:rgba(50,50,60,0.60)"></span>
            </div>
            <span class="drawer-item-label">{item.label}</span>
          </button>
        {/each}
      </nav>

      <div style="flex:1"></div>
      <div class="drawer-sep"></div>

      <button class="drawer-item drawer-logout pulse-tap" on:click={() => { closeDrawer(); logout(); }}>
        <div class="drawer-icon-wrap drawer-icon-red">
          <span class="icon-mask" style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');width:19px;height:19px;background:rgba(210,45,45,0.80)"></span>
        </div>
        <span class="drawer-item-label" style="color:rgba(200,40,40,0.88)">Terminar sessão</span>
      </button>
    </div>
  {/if}

</div>

<style>
  * { box-sizing:border-box; margin:0; padding:0; }

  .root {
    position:fixed; inset:0;
    display:flex; flex-direction:column; overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
  }

  /* ── Backgrounds ── */
  .bg-layer {
    position:absolute; inset:0; z-index:0;
    background-size:cover; background-position:center;
    opacity:0; transition:opacity 1.8s cubic-bezier(0.4,0,0.2,1);
    will-change:opacity;
  }
  .bg-layer.bg-on { opacity:1; }
  .bg-fallback {
    position:absolute; inset:0; z-index:0;
    background:linear-gradient(160deg,#0d0d1a 0%,#1a0530 50%,#0a1628 100%);
  }

  /* ── Header ── */
  .header {
    position:relative; z-index:10;
    display:flex; align-items:center; justify-content:space-between;
    padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 10px;
    flex-shrink:0; opacity:0; transform:translateY(-12px);
    transition:opacity .55s ease, transform .55s ease;
  }
  .header.in { opacity:1; transform:translateY(0); }
  /* Sobe acima do overlay de apps (z:60) para o botão não ficar blur nem inacessível */
  .header.header-lifted { z-index:62; }

  .logo-img { width:44px; height:44px; object-fit:contain; }
  .header-right { display:flex; align-items:center; gap:8px; }

  .hdr-btn {
    width:40px; height:40px; border-radius:50%; border:none;
    background:rgba(0,0,0,0.28);
    backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    transition:background .20s ease, transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .hdr-btn:active { background:rgba(0,0,0,0.45); transform:scale(0.88); }

  /* ── Content spacer ── */
  .content { flex:1; position:relative; z-index:10; }

  /* ── Bottom ── */
  .bottom {
    position:relative; z-index:10;
    padding:0 16px calc(env(safe-area-inset-bottom,0px) + 18px);
    flex-shrink:0; opacity:0; transform:translateY(18px);
    transition:opacity .6s .3s ease, transform .6s .3s ease;
  }
  .bottom.in { opacity:1; transform:translateY(0); }

  .bottom-bar {
    border-radius:22px;
    background:rgba(18,18,18,0.52);
    backdrop-filter:blur(30px) saturate(1.7);
    -webkit-backdrop-filter:blur(30px) saturate(1.7);
    border:0.5px solid rgba(255,255,255,0.14);
    box-shadow:0 8px 32px rgba(0,0,0,0.38), inset 0 0.5px 0 rgba(255,255,255,0.12);
    display:flex; flex-direction:column;
  }
  .chat-input {
    resize:none; outline:none; border:none; background:transparent;
    font-size:15px; line-height:1.5; padding:13px 18px 0;
    width:100%; font-family:inherit;
    color:rgba(255,255,255,0.90); max-height:150px; overflow-y:auto;
    -webkit-user-select:text; user-select:text;
  }
  .chat-input::placeholder { color:rgba(255,255,255,0.36); }

  .bb-row { display:flex; align-items:center; height:52px; padding:0 6px; }
  .flex1  { flex:1; }

  .bb-btn {
    width:40px; height:40px;
    display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:0.5px solid rgba(255,255,255,0.12);
    cursor:pointer; background:rgba(255,255,255,0.14); flex-shrink:0;
    transition:background .20s ease, transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background:rgba(255,255,255,0.22); transform:scale(0.88); }

  .model-pill {
    height:40px; padding:0 14px;
    display:flex; align-items:center; gap:5px;
    border-radius:20px; border:0.5px solid rgba(255,255,255,0.15);
    cursor:pointer; background:rgba(255,255,255,0.14); flex-shrink:0;
    transition:background .20s ease, transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .model-pill:active { background:rgba(255,255,255,0.22); transform:scale(0.94); }
  .model-pill-label { font-size:13px; font-weight:600; color:rgba(255,255,255,0.85); }

  /* ── Recording ── */
  .rec-card {
    position:relative; overflow:hidden; border-radius:999px;
    background:rgba(18,18,18,0.55);
    backdrop-filter:blur(28px) saturate(1.6);
    -webkit-backdrop-filter:blur(28px) saturate(1.6);
    border:0.5px solid rgba(255,255,255,0.13);
    box-shadow:0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.10);
    height:64px;
    animation:recIn .28s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes recIn {
    from { opacity:0; transform:scale(0.92) translateY(10px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  .rec-canvas { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; }
  .rec-inner  { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; height:100%; padding:0 10px; }
  .rec-btn {
    width:44px; height:44px; display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:0.5px solid rgba(255,255,255,0.10); cursor:pointer;
    background:rgba(255,255,255,0.10); flex-shrink:0;
    transition:background .18s ease, transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-btn:active { background:rgba(255,255,255,0.20); transform:scale(0.88); }
  .rec-send { background:rgba(255,255,255,0.16); }
  .rec-center { display:flex; align-items:center; gap:8px; flex:1; justify-content:center; pointer-events:none; }
  .rec-dot {
    width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0;
    animation:recPulse 1.1s ease-in-out infinite;
  }
  @keyframes recPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
  .rec-timer { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:rgba(255,255,255,0.90); letter-spacing:.06em; }

  /* ── Popup add / extras / models ── */
  .popup-overlay { position:fixed; inset:0; z-index:50; }
  .popup-box {
    position:fixed; z-index:51;
    border-radius:18px;
    background:rgba(24,24,26,0.84);
    backdrop-filter:blur(32px) saturate(1.9);
    -webkit-backdrop-filter:blur(32px) saturate(1.9);
    border:0.5px solid rgba(255,255,255,0.12);
    box-shadow:0 14px 44px rgba(0,0,0,0.50), inset 0 0.5px 0 rgba(255,255,255,0.10);
    overflow:hidden; transform-origin:bottom left;
    opacity:0; transform:scale(0.86) translateY(8px);
    transition:opacity .22s cubic-bezier(0.2,0.9,0.3,1), transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events:none;
  }
  .popup-box.popup-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }
  .popup-content { transition:opacity .13s ease, transform .13s ease; }
  .popup-content.fading { opacity:0; transform:translateY(4px); pointer-events:none; }

  .popup-title {
    padding:12px 16px 8px;
    font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
    color:rgba(255,255,255,0.34);
  }
  .popup-row {
    display:flex; align-items:center; gap:12px;
    width:100%; padding:12px 14px;
    background:transparent; border:none; cursor:pointer;
    font-family:inherit; text-align:left;
    transition:background .14s ease;
  }
  .popup-row:active { background:rgba(255,255,255,0.08); }
  .popup-back { padding:9px 14px; }

  /* Containers circulares no popup (não mais quadrados) */
  .popup-icon-wrap {
    width:32px; height:32px; border-radius:50%;
    background:rgba(255,255,255,0.10);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .popup-label { font-size:15px; font-weight:500; color:rgba(255,255,255,0.88); flex:1; }
  .popup-sep   { height:0.5px; background:rgba(255,255,255,0.08); margin:0 14px; }
  .popup-active-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.85); flex-shrink:0; }

  .model-info { display:flex; flex-direction:column; flex:1; min-width:0; }
  .model-sub  { font-size:11px; color:rgba(255,255,255,0.30); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* ── Apps popup — ancorado ao ícone, sem botão close interno ── */
  /* overlay sem backdrop-filter: o header (z:62) já fica acima (não blur) */
  .apps-overlay {
    position:fixed; inset:0; z-index:60;
    background:rgba(0,0,0,0.22);
  }
  .apps-popup {
    position:fixed; z-index:63;
    width:256px;
    border-radius:20px;
    background:rgba(18,18,20,0.90);
    backdrop-filter:blur(44px) saturate(2);
    -webkit-backdrop-filter:blur(44px) saturate(2);
    border:0.5px solid rgba(255,255,255,0.12);
    box-shadow:0 18px 50px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.11);
    overflow:hidden;
    /* bloom a partir do canto superior direito (onde fica o ícone) */
    transform-origin:top right;
    opacity:0; transform:scale(0.88) translateY(-6px);
    transition:opacity .22s cubic-bezier(0.2,0.9,0.3,1), transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events:none;
  }
  .apps-popup.apps-popup-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }

  .apps-popup-label {
    padding:13px 15px 6px;
    font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
    color:rgba(255,255,255,0.30);
  }

  /* Grid de apps — SEM container nos ícones */
  .apps-grid {
    display:grid;
    grid-template-columns:repeat(4, 1fr);
    padding:4px 6px 6px;
    gap:0;
  }

  .ag-item {
    display:flex; flex-direction:column; align-items:center; gap:5px;
    background:none; border:none; cursor:pointer; padding:8px 2px;
    border-radius:14px;
    opacity:0; transform:scale(0.82) translateY(6px);
    transition:opacity .28s ease, transform .28s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .ag-item.ag-in { opacity:1; transform:scale(1) translateY(0); }
  .ag-item:active { background:rgba(255,255,255,0.09); }

  /* Apenas o ícone, sem qualquer fundo ou borda */
  .ag-icon {
    width:46px; height:46px;
    display:flex; align-items:center; justify-content:center;
  }
  .ag-img {
    width:100%; height:100%; object-fit:contain;
    border-radius:12px;
    transition:transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .ag-item:active .ag-img { transform:scale(0.84); }

  .ag-name {
    font-size:10px; font-weight:500; color:rgba(255,255,255,0.68);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    max-width:58px; text-align:center; line-height:1.2;
  }

  /* Secção Tema dentro do popup de apps */
  .apps-section-divider { height:0.5px; background:rgba(255,255,255,0.08); margin:4px 14px 0; }
  .apps-section-title {
    padding:9px 15px 6px;
    font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
    color:rgba(255,255,255,0.30);
  }
  .theme-pills { display:flex; gap:5px; padding:0 10px; }
  .theme-pill {
    flex:1; height:30px; border-radius:9px;
    border:0.5px solid rgba(255,255,255,0.10);
    background:rgba(255,255,255,0.07);
    color:rgba(255,255,255,0.45);
    font-size:12px; font-weight:500; cursor:pointer; font-family:inherit;
    transition:background .17s ease, color .17s ease, border-color .17s ease, transform .17s cubic-bezier(0.34,1.56,0.64,1);
  }
  .theme-pill:active { transform:scale(0.92); }
  .theme-pill.theme-pill-on {
    background:rgba(255,255,255,0.17);
    color:rgba(255,255,255,0.92);
    border-color:rgba(255,255,255,0.20);
  }

  /* ── Drawer — super leve (inspirado no Bing) ── */
  .drawer-overlay {
    position:fixed; inset:0; z-index:70;
    background:transparent; transition:background .32s ease;
  }
  .drawer-overlay.drawer-overlay-in { background:rgba(0,0,0,0.20); }

  .drawer {
    position:fixed; top:0; right:0; bottom:0; z-index:71;
    width:min(288px, 82vw);
    background:#ffffff;
    border-left:0.5px solid rgba(0,0,0,0.07);
    box-shadow:-12px 0 48px rgba(0,0,0,0.13);
    /* Sem backdrop-filter — fundo totalmente opaco e leve */
    display:flex; flex-direction:column;
    padding-top:calc(env(safe-area-inset-top,0px) + 10px);
    padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px);
    transform:translateX(100%);
    transition:transform .32s cubic-bezier(0.2,0.9,0.3,1);
  }
  .drawer.drawer-in { transform:translateX(0); }

  /* Perfil */
  .drawer-header {
    display:flex; align-items:center; gap:13px;
    padding:20px 20px 18px;
  }
  .drawer-avatar {
    width:48px; height:48px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:19px; font-weight:700; color:#fff;
  }
  .drawer-user-info { display:flex; flex-direction:column; min-width:0; }
  .drawer-user-name {
    font-size:15px; font-weight:700; color:#111111;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .drawer-user-email {
    font-size:12px; color:#8a8a8e; margin-top:2px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }

  /* Separador full-width, sem margem lateral */
  .drawer-sep { height:0.5px; background:#e8e8e8; }

  /* Itens de navegação */
  .drawer-nav { display:flex; flex-direction:column; padding:8px 10px; }

  .drawer-item {
    display:flex; align-items:center; gap:13px;
    padding:11px 10px; border-radius:12px; border:none;
    background:transparent; cursor:pointer; font-family:inherit; text-align:left;
    opacity:0; transform:translateX(16px);
    transition:opacity .28s ease, transform .28s cubic-bezier(0.2,0.9,0.3,1), background .14s ease;
  }
  .drawer-item.drawer-item-in { opacity:1; transform:translateX(0); }
  .drawer-item:active { background:rgba(0,0,0,0.05); }

  .drawer-icon-wrap {
    width:34px; height:34px; border-radius:10px;
    background:rgba(0,0,0,0.05);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .drawer-icon-red { background:rgba(220,50,50,0.08); }

  .drawer-item-label { font-size:15px; font-weight:500; color:#111111; }

  .drawer-logout { margin:0 10px; }

  /* ── Utilities ── */
  .pulse-tap {
    cursor:pointer;
    transition:transform .20s cubic-bezier(0.34,1.56,0.64,1), opacity .20s ease;
  }
  .pulse-tap:active { transform:scale(0.92); opacity:.78; }

  .icon-mask {
    display:block;
    mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center;
    flex-shrink:0;
  }
</style>