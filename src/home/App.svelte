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

  // ── Cards de notícias ─────────────────────────────────────────────────────
  let cards = [];
  let cardsLoading = true;

  async function fetchCards() {
    cardsLoading = true;
    try {
      const built = [];

      // BBC Portuguese RSS via rss2json
      try {
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/portuguese/rss.xml&count=8');
        if (res.ok) {
          const data = await res.json();
          for (const item of (data.items ?? []).slice(0, 8)) {
            const thumb = item.thumbnail || item.enclosure?.link || '';
            built.push({
              id: `news-${item.guid || item.link}`,
              title: item.title,
              subtitle: item.description?.replace(/<[^>]*>/g, '').slice(0, 100).trim() + '…',
              source: 'BBC News Portugal',
              sourceIcon: 'https://news.bbcimg.co.uk/nol/shared/img/bbc_news_120x60.gif',
              image: thumb,
              link: item.link,
              pubDate: item.pubDate,
            });
          }
        }
      } catch(_) {}

      // G1 fallback
      if (built.length < 3) {
        try {
          const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://g1.globo.com/rss/g1/&count=6');
          if (res.ok) {
            const data = await res.json();
            for (const item of (data.items ?? []).slice(0, 6)) {
              const thumb = item.thumbnail || item.enclosure?.link || '';
              built.push({
                id: `g1-${item.guid || item.link}`,
                title: item.title,
                subtitle: item.description?.replace(/<[^>]*>/g, '').slice(0, 100).trim() + '…',
                source: 'G1',
                sourceIcon: '',
                image: thumb,
                link: item.link,
                pubDate: item.pubDate,
              });
            }
          }
        } catch(_) {}
      }

      cards = built;
    } catch(e) {
      console.error('Cards fetch:', e);
    } finally {
      cardsLoading = false;
    }
  }

  // ── Card swipe (horizontal) ───────────────────────────────────────────────
  let activeCardIdx  = 0;
  let cardDragX      = 0;
  let cardDragging   = false;
  let cardDragStartX = 0;
  let cardDismissed  = new Set();

  function onCardPointerDown(e) {
    cardDragging   = true;
    cardDragStartX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    cardDragX      = 0;
  }
  function onCardPointerMove(e) {
    if (!cardDragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    cardDragX = x - cardDragStartX;
  }
  function onCardPointerUp() {
    if (!cardDragging) return;
    cardDragging = false;
    if (Math.abs(cardDragX) > 80) {
      cardDismissed = new Set([...cardDismissed, visibleCards[0]?.id]);
    }
    cardDragX = 0;
  }

  $: visibleCards = cards.filter(c => !cardDismissed.has(c.id));
  $: activeCard   = visibleCards[0] ?? null;
  $: nextCard     = visibleCards[1] ?? null;

  // ── Modelos ───────────────────────────────────────────────────────────────
  const MODELS = [
    { id: 'mistral-nemo',       label: 'Nemo',      sublabel: 'mistral-nemo'          },
    { id: 'deepseek-v4',        label: 'DeepSeek',  sublabel: 'deepseek-v4'           },
    { id: 'deepseek-v4-pro',    label: 'DS Pro',    sublabel: 'deepseek-v4-pro'       },
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

  // ── Backgrounds ───────────────────────────────────────────────────────────
  let bgImages = [];
  try {
    const mods = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(mods);
  } catch(e) { bgImages = []; }

  let layers = [{ img: '', visible: false }, { img: '', visible: false }];
  let activeLayer = 0;
  let bgCursor    = 0;

  function rotateBg() {
    bgCursor = (bgCursor + 1) % Math.max(bgImages.length, 1);
    activeLayer = 1 - activeLayer;
    const img = bgImages[bgCursor % bgImages.length];
    layers[activeLayer] = { img, visible: true };
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
      audioChunks   = [];
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
          [0, Math.floor(len*.04)],[Math.floor(len*.04),Math.floor(len*.10)],
          [Math.floor(len*.10),Math.floor(len*.25)],[Math.floor(len*.25),Math.floor(len*.50)],
          [Math.floor(len*.50),Math.floor(len*.80)],
        ];
        freqBands = bands.map(([s,e]) => {
          const sl = [...freq].slice(s,e);
          return Math.pow(sl.reduce((a,b)=>a+b,0)/sl.length/255, 0.5);
        });
      } else {
        wavePhase += 0.04;
        freqBands = [0,1,2,3,4].map(i => 0.06 + Math.abs(Math.sin(wavePhase*1.2+i*0.8))*0.18);
      }
      for (let i = 0; i < BAR_COUNT; i++) {
        const t = freqBands[i];
        barHeights[i] += (t - barHeights[i]) * (t > barHeights[i] ? 0.65 : 0.12);
      }
      const barW=3.5, gap=5, totalW=BAR_COUNT*barW+(BAR_COUNT-1)*gap;
      const startX=(w-totalW)/2, centerY=h/2, maxH=h*0.72, minH=4;
      for (let i = 0; i < BAR_COUNT; i++) {
        const bh=Math.max(minH,barHeights[i]*maxH);
        const x=startX+i*(barW+gap), y=centerY-bh/2;
        ctx.beginPath(); ctx.roundRect(x,y,barW,bh,barW/2);
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

  function openApp(app) {
    if (app.id === 'ai') { try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {} }
    window.location.href = app.path;
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
    fetchCards();
    return () => clearInterval(bgTimer);
  });
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

    <!-- ── News card stack ── -->
    <div class="card-area" class:in={mounted}>
      {#if cardsLoading}
        <div class="card-skeleton">
          <div class="skeleton-shine"></div>
        </div>
      {:else if activeCard}
        <!-- Card de baixo (próximo) -->
        {#if nextCard}
          <div class="news-card news-card-back">
            {#if nextCard.image}
              <img src={nextCard.image} alt="" class="news-card-img" />
            {:else}
              <div class="news-card-img-placeholder"></div>
            {/if}
          </div>
        {/if}

        <!-- Card activo -->
        {@const dragProgress = Math.min(1, Math.abs(cardDragX) / 120)}
        {@const dragDir = cardDragX > 0 ? 1 : -1}
        <div
          class="news-card news-card-front"
          style="
            transform: translateX({cardDragX}px) rotate({cardDragX * 0.04}deg) scale({1 - dragProgress * 0.02});
            opacity:{1 - dragProgress * 0.5};
            transition:{cardDragging ? 'none' : 'transform .42s cubic-bezier(0.2,0.9,0.3,1), opacity .42s ease'};
          "
          on:pointerdown={onCardPointerDown}
          on:pointermove={onCardPointerMove}
          on:pointerup={onCardPointerUp}
          on:pointerleave={onCardPointerUp}
          on:touchstart|passive={(e) => onCardPointerDown({clientX: e.touches[0].clientX})}
          on:touchmove|passive={(e) => onCardPointerMove({clientX: e.touches[0].clientX})}
          on:touchend={onCardPointerUp}
        >
          <!-- Foto de fundo -->
          {#if activeCard.image}
            <img src={activeCard.image} alt="" class="news-card-img" />
          {:else}
            <div class="news-card-img-placeholder"></div>
          {/if}

          <!-- Gradiente -->
          <div class="news-card-grad"></div>

          <!-- Conteúdo -->
          <div class="news-card-body">
            <!-- Source badge -->
            <div class="news-source-row">
              <div class="news-source-dot"></div>
              <span class="news-source-label">{activeCard.source}</span>
            </div>

            <!-- Título -->
            <h2 class="news-card-title">{activeCard.title}</h2>

            <!-- Subtitle -->
            <p class="news-card-sub">{activeCard.subtitle}</p>

            <!-- Footer: stats + botão -->
            <div class="news-card-footer">
              <div class="news-stats">
                <div class="news-stat">
                  <span class="news-stat-icon">👁</span>
                  <span class="news-stat-val">{Math.floor(Math.random()*900+100)}k</span>
                </div>
                <div class="news-stat">
                  <span class="news-stat-icon">💬</span>
                  <span class="news-stat-val">{Math.floor(Math.random()*90+10)}</span>
                </div>
              </div>
              {#if activeCard.link}
                <a
                  href={activeCard.link}
                  target="_blank"
                  rel="noopener"
                  class="news-open-btn pulse-tap"
                  on:click|stopPropagation
                >
                  Ler +
                </a>
              {/if}
            </div>
          </div>

          <!-- Swipe hint -->
          <div class="card-swipe-hint" style="opacity:{0.4 - dragProgress * 0.4}">
            <div class="swipe-bar"></div>
          </div>
        </div>

        <!-- Dots -->
        {#if visibleCards.length > 1}
          <div class="card-dots-row">
            {#each visibleCards.slice(0, 5) as c, i}
              <div class="card-dot" class:active={i === 0}></div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Apps -->
    <div class="apps-wrap" class:in={mounted}>
      <div class="apps-fade-left"></div>
      <div class="apps-fade-right"></div>
      <div class="apps-scroll">
        {#each platformApps as app, i}
          <button
            class="app-item"
            style="transition-delay:{i*40}ms"
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
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_down.svg');-webkit-mask-image:url('/icons/svg/arrow_down.svg');width:11px;height:11px;background:rgba(255,255,255,0.55)"></span>
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

  <!-- ── Popup ──────────────────────────────────────────────────────────── -->
  {#if showPopup}
    <div class="popup-overlay" on:click={closePopup}></div>
    <div class="popup-box" class:popup-box-in={popupVisible} style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;">

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
          <button class="popup-row pulse-tap" style={active ? 'background:rgba(255,255,255,0.07)' : ''} on:click={action}>
            <div class="popup-icon-wrap popup-icon-wrap--circle">
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
          <button class="popup-row pulse-tap" style={currentModelId===model.id?'background:rgba(255,255,255,0.07)':''} on:click={() => { currentModelId=model.id; closePopup(); }}>
            <div class="popup-icon-wrap popup-icon-wrap--circle">
              <img src="/icons/png/ia.png" alt="" style="width:18px;height:18px;object-fit:cover;" />
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
    opacity: 0; transition: opacity 1.8s cubic-bezier(0.4,0,0.2,1); will-change: opacity;
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
    position: absolute; bottom: 0; left: 0; right: 0; height: 65%; z-index: 1;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.40) 55%, transparent 100%);
    pointer-events: none;
  }

  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top,0px) + 16px) 22px 10px;
    flex-shrink: 0; opacity: 0; transform: translateY(-12px);
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
    justify-content: flex-end; overflow: hidden; gap: 16px;
    padding-bottom: 4px;
  }

  /* ── Card area ── */
  .card-area {
    padding: 0 16px;
    opacity: 0; transform: translateY(16px);
    transition: opacity .6s .1s ease, transform .6s .1s ease;
    flex-shrink: 0;
    position: relative;
  }
  .card-area.in { opacity: 1; transform: translateY(0); }

  .card-skeleton {
    height: 230px; border-radius: 24px;
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.10);
    overflow: hidden; position: relative;
  }
  .skeleton-shine {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
    animation: shimmer 1.6s ease-in-out infinite;
  }
  @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

  /* ── News cards ── */
  .news-card {
    border-radius: 24px; overflow: hidden;
    height: 230px; position: relative;
    border: 0.5px solid rgba(255,255,255,0.13);
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    background: #111;
  }
  .news-card-back {
    position: absolute; inset: 0; z-index: 0;
    transform: scale(0.95) translateY(10px);
    filter: brightness(0.55);
    pointer-events: none;
  }
  .news-card-front {
    position: relative; z-index: 1;
    cursor: grab; user-select: none;
    touch-action: pan-y;
    will-change: transform, opacity;
  }
  .news-card-front:active { cursor: grabbing; }

  .news-card-img {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover;
    transition: opacity .3s;
  }
  .news-card-img-placeholder {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .news-card-grad {
    position: absolute; inset: 0;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.92) 0%,
      rgba(0,0,0,0.65) 40%,
      rgba(0,0,0,0.18) 70%,
      transparent 100%
    );
    z-index: 1;
  }

  .news-card-body {
    position: absolute; left: 0; right: 0; bottom: 0;
    padding: 14px 16px 14px;
    z-index: 2;
  }

  .news-source-row {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 7px;
  }
  .news-source-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #FF9500; flex-shrink: 0;
    box-shadow: 0 0 6px rgba(255,149,0,0.7);
  }
  .news-source-label {
    font-size: 10px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: rgba(255,255,255,0.55);
  }

  .news-card-title {
    font-size: 17px; font-weight: 700; color: #fff;
    line-height: 1.25; margin-bottom: 5px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .news-card-sub {
    font-size: 12px; color: rgba(255,255,255,0.52);
    line-height: 1.4; margin-bottom: 10px;
    display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .news-card-footer {
    display: flex; align-items: center; justify-content: space-between;
  }
  .news-stats { display: flex; gap: 12px; align-items: center; }
  .news-stat { display: flex; align-items: center; gap: 4px; }
  .news-stat-icon { font-size: 12px; opacity: 0.7; }
  .news-stat-val { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.60); }

  .news-open-btn {
    display: flex; align-items: center;
    padding: 6px 16px; border-radius: 22px;
    background: rgba(255,255,255,0.18);
    border: 0.5px solid rgba(255,255,255,0.22);
    font-size: 13px; font-weight: 700;
    color: rgba(255,255,255,0.92);
    text-decoration: none;
    transition: background .2s ease;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  }
  .news-open-btn:active { background: rgba(255,255,255,0.28); }

  .card-swipe-hint {
    position: absolute; top: 10px; left: 0; right: 0;
    display: flex; justify-content: center;
    transition: opacity .3s;
    pointer-events: none; z-index: 3;
  }
  .swipe-bar {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.30);
  }

  .card-dots-row {
    display: flex; gap: 5px; justify-content: center;
    margin-top: 10px;
  }
  .card-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.28);
    transition: all .3s ease;
  }
  .card-dot.active {
    width: 16px; border-radius: 3px;
    background: rgba(255,255,255,0.85);
  }

  /* ── Apps ── */
  .apps-wrap {
    position: relative;
    opacity: 0; transform: translateY(14px);
    transition: opacity .6s .25s ease, transform .6s .25s ease;
    padding-bottom: 16px; flex-shrink: 0;
  }
  .apps-wrap.in { opacity: 1; transform: translateY(0); }

  .apps-fade-left, .apps-fade-right {
    position: absolute; top: 0; bottom: 16px; width: 32px;
    z-index: 2; pointer-events: none;
  }
  .apps-fade-left {
    left: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 100%);
  }
  .apps-fade-right {
    right: 0;
    background: linear-gradient(to left, rgba(0,0,0,0.55) 0%, transparent 100%);
  }

  .apps-scroll {
    display: flex; gap: 2px; padding: 0 14px;
    overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .apps-scroll::-webkit-scrollbar { display: none; }

  .app-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    background: none; border: none; cursor: pointer;
    padding: 0 7px; flex-shrink: 0;
    opacity: 0; transform: translateY(10px) scale(0.92);
    transition: opacity .5s ease, transform .5s ease;
  }
  .app-item.app-in { opacity: 1; transform: translateY(0) scale(1); }
  .app-item:active .app-circle { transform: scale(0.84); }

  .app-circle {
    width: 46px; height: 46px; border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: 0.5px solid rgba(255,255,255,0.16);
    display: flex; align-items: center; justify-content: center;
    transition: transform .35s cubic-bezier(0.34,1.56,0.64,1); overflow: hidden;
  }
  .app-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .app-svg-mask {
    display: block; width: 20px; height: 20px;
    background: rgba(255,255,255,0.88);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .app-name {
    font-size: 10px; font-weight: 400;
    color: rgba(255,255,255,0.72);
    white-space: nowrap; text-shadow: 0 1px 6px rgba(0,0,0,0.55);
  }

  /* ── Bottom ── */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom,0px) + 20px);
    flex-shrink: 0; opacity: 0; transform: translateY(18px);
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
    color: rgba(255,255,255,0.90); max-height: 150px; overflow-y: auto;
    -webkit-user-select: text; user-select: text;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.38); }

  .bb-row {
    display: flex; align-items: center;
    height: 52px; padding: 0 6px;
    gap: 0;
  }
  .flex1 { flex: 1; }

  .bb-btn {
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none; cursor: pointer;
    background: rgba(255,255,255,0.15);
    border: 0.5px solid rgba(255,255,255,0.12);
    flex-shrink: 0;
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background: rgba(255,255,255,0.22); transform: scale(0.88); }

  /* Model pill — mesma altura que bb-btn (40px) */
  .model-pill {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    height: 40px; padding: 0 14px;
    border-radius: 20px; border: none; cursor: pointer;
    background: rgba(255,255,255,0.15);
    border: 0.5px solid rgba(255,255,255,0.16);
    flex-shrink: 0;
    transition: background .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .model-pill:active { background: rgba(255,255,255,0.22); transform: scale(0.94); }
  .model-pill-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); }

  /* ── Recording card ── */
  .rec-card {
    position: relative; overflow: hidden; border-radius: 999px;
    background: rgba(20,20,20,0.52);
    backdrop-filter: blur(28px) saturate(1.6); -webkit-backdrop-filter: blur(28px) saturate(1.6);
    border: 0.5px solid rgba(255,255,255,0.14);
    box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 0.5px 0 rgba(255,255,255,0.10);
    height: 64px; animation: recCardIn .28s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes recCardIn {
    from { opacity:0; transform:scale(0.94) translateY(10px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  .rec-card-canvas { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; }
  .rec-card-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; height:100%; padding:0 10px; }
  .rec-action-btn {
    width:44px; height:44px; display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:none; cursor:pointer;
    background:rgba(255,255,255,0.10); border:0.5px solid rgba(255,255,255,0.10); flex-shrink:0;
    transition:background .18s ease, transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-action-btn:active { background:rgba(255,255,255,0.20); transform:scale(0.88); }
  .rec-send-btn { background:rgba(255,255,255,0.16); }
  .rec-center { display:flex; align-items:center; gap:8px; flex:1; justify-content:center; pointer-events:none; }
  .rec-dot { width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0; animation:recPulse 1.1s ease-in-out infinite; }
  @keyframes recPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
  .rec-timer-inline { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:rgba(255,255,255,0.90); letter-spacing:.06em; }

  /* ── Popup ── */
  .popup-overlay { position:fixed; inset:0; z-index:50; pointer-events:auto; }
  .popup-box {
    position:fixed; z-index:51; width:220px; border-radius:18px;
    background:rgba(28,28,30,0.75);
    backdrop-filter:blur(28px) saturate(1.8); -webkit-backdrop-filter:blur(28px) saturate(1.8);
    border:0.5px solid rgba(255,255,255,0.13);
    box-shadow:0 12px 40px rgba(0,0,0,0.45), inset 0 0.5px 0 rgba(255,255,255,0.10);
    overflow:hidden; transform-origin:bottom left;
    opacity:0; transform:scale(0.88) translateY(6px);
    transition:opacity .22s ease, transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events:none;
  }
  .popup-box.popup-box-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }
  .popup-title { padding:12px 16px 8px; font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:rgba(255,255,255,0.38); }
  .popup-row { display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px; background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left; transition:background .15s ease; }
  .popup-row:active { background:rgba(255,255,255,0.08); }
  .popup-back-row { padding:8px 14px; }

  /* Circular nos extras e modelos */
  .popup-icon-wrap {
    width:32px; height:32px; border-radius:8px;
    background:rgba(255,255,255,0.10);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .popup-icon-wrap--circle {
    border-radius: 50%;
  }

  .popup-label { font-size:15px; font-weight:500; color:rgba(255,255,255,0.88); flex:1; }
  .popup-sep { height:0.5px; background:rgba(255,255,255,0.09); margin:0 14px; }
  .popup-active-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.85); flex-shrink:0; }
  .model-info { display:flex; flex-direction:column; flex:1; min-width:0; }
  .model-sublabel { font-size:11px; font-weight:400; color:rgba(255,255,255,0.35); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  .pulse-tap { cursor:pointer; transition:transform .22s cubic-bezier(0.34,1.56,0.64,1), opacity .22s ease; }
  .pulse-tap:active { transform:scale(0.92); opacity:.80; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>