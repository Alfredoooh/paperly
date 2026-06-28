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

  // ── RSS Pool — 10 tópicos × muitas fontes ─────────────────────────────────
  const TOPICS = {
    tecnologia:    { label: 'Tecnologia',     color: '#007AFF', grad: 'linear-gradient(150deg,#00143d 0%,#001f6b 100%)' },
    ciencia:       { label: 'Ciência',        color: '#5856D6', grad: 'linear-gradient(150deg,#0d0024 0%,#1c0050 100%)' },
    entretenimento:{ label: 'Entretenimento', color: '#FF2D92', grad: 'linear-gradient(150deg,#2a000f 0%,#4a001f 100%)' },
    desporto:      { label: 'Desporto',       color: '#34C759', grad: 'linear-gradient(150deg,#001508 0%,#002b10 100%)' },
    saude:         { label: 'Saúde',          color: '#00C7BE', grad: 'linear-gradient(150deg,#001818 0%,#002f2e 100%)' },
    negocios:      { label: 'Negócios',       color: '#FF9500', grad: 'linear-gradient(150deg,#1c0f00 0%,#3a1f00 100%)' },
    mundo:         { label: 'Mundo',          color: '#FF6B6B', grad: 'linear-gradient(150deg,#1a0000 0%,#350000 100%)' },
    arte:          { label: 'Arte & Cultura', color: '#FF8C42', grad: 'linear-gradient(150deg,#1c0a00 0%,#391400 100%)' },
    gaming:        { label: 'Gaming',         color: '#BF5AF2', grad: 'linear-gradient(150deg,#130020 0%,#26003f 100%)' },
    politica:      { label: 'Política',       color: '#8E8E93', grad: 'linear-gradient(150deg,#0e0e0e 0%,#1c1c1e 100%)' },
  };

  const GN  = (t, hl='pt-BR', gl='BR') => `https://news.google.com/rss/headlines/section/topic/${t}?hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;
  const GNS = (q, hl='pt-BR', gl='BR') => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl.split('-')[0]}`;

  const RSS_POOL = {
    tecnologia: [
      GN('TECHNOLOGY'), GN('TECHNOLOGY','en-US','US'), GN('TECHNOLOGY','pt-PT','PT'),
      GNS('inteligência artificial 2025'), GNS('smartphones lançamentos'),
      GNS('software programação'), GNS('cibersegurança'), GNS('robótica automação'),
      GNS('computação quântica'), GNS('startups tech'), GNS('openai google deepmind'),
      GNS('artificial intelligence news'), GNS('tech gadgets 2025'),
      GNS('5G redes'), GNS('cloud computing AWS'),
      'https://www.theverge.com/rss/index.xml',
      'https://feeds.feedburner.com/TechCrunch',
      'https://www.wired.com/feed/rss',
      'https://arstechnica.com/feed/',
      'https://www.marktechpost.com/feed/',
      'https://thenextweb.com/feed/',
    ],
    ciencia: [
      GN('SCIENCE'), GN('SCIENCE','en-US','US'), GN('SCIENCE','pt-PT','PT'),
      GNS('ciência descoberta 2025'), GNS('espaço NASA SpaceX'),
      GNS('física quântica pesquisa'), GNS('biologia genética DNA'),
      GNS('astronomia telescópio webb'), GNS('mudanças climáticas'),
      GNS('paleontologia fóssil'), GNS('neurociência cérebro'),
      GNS('ocean research marine'), GNS('space exploration moon mars'),
      GNS('medicine breakthrough'), GNS('climate science'),
      'https://www.sciencedaily.com/rss/all.xml',
      'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
      'https://www.sciencemag.org/rss/current.xml',
      'https://scitechdaily.com/feed/',
    ],
    entretenimento: [
      GN('ENTERTAINMENT'), GN('ENTERTAINMENT','en-US','US'), GN('ENTERTAINMENT','pt-PT','PT'),
      GNS('cinema filmes 2025'), GNS('séries Netflix HBO streaming'),
      GNS('música álbuns lançamentos'), GNS('celebridades famosos'),
      GNS('Grammy Oscar Emmy 2025'), GNS('anime manga'),
      GNS('box office movies'), GNS('celebrity gossip'),
      GNS('gaming entertainment'), GNS('K-pop música'),
      GNS('teatro dança espetáculo'), GNS('festival música'),
      'https://collider.com/feed',
      'https://www.tmz.com/rss.xml',
      'https://variety.com/feed/',
      'https://deadline.com/feed/',
    ],
    desporto: [
      GN('SPORTS'), GN('SPORTS','en-US','US'), GN('SPORTS','pt-BR','BR'),
      GNS('futebol transferências mercado'), GNS('Saudi Pro League futebol'),
      GNS('Champions League UEFA'), GNS('Premier League'),
      GNS('NBA basketball'), GNS('Fórmula 1 F1 2025'),
      GNS('tênis ATP WTA Roland Garros'), GNS('boxe MMA UFC'),
      GNS('rugby Six Nations'), GNS('ciclismo Tour de France'),
      GNS('Série A Serie A calcio'), GNS('La Liga espanha'),
      GNS('Olympics sports'), GNS('baseball MLB'),
      'https://feeds.bbci.co.uk/sport/rss.xml',
      'https://www.espn.com/espn/rss/news',
    ],
    saude: [
      GN('HEALTH'), GN('HEALTH','en-US','US'), GN('HEALTH','pt-PT','PT'),
      GNS('saúde bem-estar 2025'), GNS('nutrição dieta alimentação'),
      GNS('exercício fitness treino'), GNS('saúde mental psicologia'),
      GNS('medicina vacina tratamento'), GNS('longevidade envelhecimento'),
      GNS('cancer pesquisa tratamento'), GNS('diabetes obesidade'),
      GNS('mental health therapy'), GNS('gut health microbiome'),
      GNS('sleep health insomnia'), GNS('fitness workout'),
      'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
      'https://www.health.com/rss',
      'https://www.medicalnewstoday.com/rss',
    ],
    negocios: [
      GN('BUSINESS'), GN('BUSINESS','en-US','US'), GN('BUSINESS','pt-BR','BR'),
      GNS('economia mercado bolsa'), GNS('startups investimento venture'),
      GNS('inflação economia global'), GNS('bitcoin criptomoedas'),
      GNS('mergers acquisitions M&A'), GNS('IPO stock market'),
      GNS('imobiliário real estate'), GNS('e-commerce marketplace'),
      GNS('fintech banking digital'), GNS('ESG sustentabilidade'),
      GNS('supply chain logistics'), GNS('electric vehicles market'),
      'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
      'https://feeds.bloomberg.com/markets/news.rss',
      'https://feeds.skynews.com/feeds/rss/business.xml',
    ],
    mundo: [
      GN('WORLD'), GN('WORLD','en-US','US'), GN('WORLD','pt-PT','PT'),
      GNS('geopolítica internacional 2025'), GNS('conflito guerra paz'),
      GNS('diplomacia ONU cúpula'), GNS('Europa crise política'),
      GNS('China Ásia Pacífico'), GNS('Médio Oriente Israel'),
      GNS('Rússia Ucrânia'), GNS('África notícias'),
      GNS('América Latina Brasil'), GNS('refugiados migração'),
      GNS('world news breaking'), GNS('United Nations NATO'),
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://feeds.skynews.com/feeds/rss/world.xml',
    ],
    arte: [
      GNS('arte museu exposição'), GNS('literatura livros premiados'),
      GNS('fotografia design gráfico'), GNS('arquitetura urbanismo'),
      GNS('moda fashion semana'), GNS('gastronomia culinária chef'),
      GNS('arte contemporânea galeria'), GNS('patrimônio UNESCO'),
      GNS('design industrial criativo'), GNS('graffiti street art'),
      GNS('art exhibition museum'), GNS('fashion week runway'),
      GNS('food gastronomy restaurant'), GNS('photography award'),
      'https://collider.com/feed',
      'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',
    ],
    gaming: [
      GNS('videogames lançamentos 2025'), GNS('PlayStation Xbox Nintendo'),
      GNS('PC gaming Steam'), GNS('esports torneios competitivo'),
      GNS('mobile games android iOS'), GNS('game review análise'),
      GNS('VR AR virtual reality'), GNS('Fortnite GTA gaming'),
      GNS('game developer indie'), GNS('gaming industry news'),
      GNS('Epic Games launcher'), GNS('game console hardware'),
      GNS('streaming gaming cloud'), GNS('game awards 2025'),
      'https://kotaku.com/rss',
      'https://www.polygon.com/rss/index.xml',
      'https://www.eurogamer.net/feed',
    ],
    politica: [
      GN('NATION'), GN('NATION','en-US','US'), GN('NATION','pt-BR','BR'),
      GNS('política Brasil eleições'), GNS('Congresso Senado votação'),
      GNS('Trump Biden governo'), GNS('Europa parlamento'),
      GNS('democracia direitos'), GNS('Portugal governo'),
      GNS('política argentina'), GNS('eleições 2025 mundo'),
      GNS('supreme court law'), GNS('government policy'),
      GNS('corruption scandal politics'), GNS('foreign policy'),
      'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
      'https://feeds.bbci.co.uk/news/politics/rss.xml',
    ],
  };

  // ── Cards state ───────────────────────────────────────────────────────────
  let cards         = [];
  let cardsLoading  = true;

  function extractImage(item) {
    if (item.thumbnail?.startsWith('http') && !item.thumbnail.includes('1x1') && !item.thumbnail.includes('pixel')) return item.thumbnail;
    if (item.enclosure?.link && /\.(jpe?g|png|webp|gif)/i.test(item.enclosure.link)) return item.enclosure.link;
    const m = (item.content || item.description || '').match(/<img[^>]+src=["']([^"']+)/);
    if (m?.[1]?.startsWith('http')) return m[1];
    return null;
  }

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }

  async function fetchCards() {
    cardsLoading = true;
    try {
      const topicKeys = Object.keys(RSS_POOL);
      // 2 random feeds per topic, 5 topics = 10 parallel fetches
      const chosen = shuffle(topicKeys).slice(0, 5).flatMap(topic =>
        pickN(RSS_POOL[topic], 2).map(url => ({ url, topic }))
      );

      const results = await Promise.allSettled(
        chosen.map(({ url, topic }) =>
          fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=5`)
            .then(r => r.ok ? r.json() : null)
            .then(data => ({ data, topic }))
            .catch(() => ({ data: null, topic }))
        )
      );

      const built   = [];
      const seenSet = new Set();

      for (const res of results) {
        if (res.status !== 'fulfilled' || !res.value?.data?.items?.length) continue;
        const { data, topic } = res.value;
        const meta = TOPICS[topic];
        for (const item of data.items.slice(0, 4)) {
          const title = item.title?.trim();
          if (!title || seenSet.has(title.slice(0, 40).toLowerCase())) continue;
          seenSet.add(title.slice(0, 40).toLowerCase());
          built.push({
            id:         `${topic}-${item.guid || item.link || title}`,
            topic,
            topicLabel: meta.label,
            topicColor: meta.color,
            topicGrad:  meta.grad,
            title,
            subtitle: (item.description || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110),
            source:   data.feed?.title?.replace(/\s*[-|].*$/, '').trim() || meta.label,
            image:    extractImage(item),
            link:     item.link,
          });
        }
      }

      cards = shuffle(built);
    } catch(e) {
      console.error('fetchCards:', e);
    } finally {
      cardsLoading = false;
    }
  }

  // ── Card swipe vertical ───────────────────────────────────────────────────
  let cardDragY       = 0;
  let cardDragging    = false;
  let cardDragStartY  = 0;
  let cardDismissed   = new Set();
  let cardExiting     = false;
  let cardJustEntered = false;
  let cardEnterTimer;

  $: visibleCards  = cards.filter(c => !cardDismissed.has(c.id));
  $: activeCard    = visibleCards[0] ?? null;
  $: nextCard      = visibleCards[1] ?? null;
  $: dragProgress  = Math.min(1, Math.abs(cardDragY) / 100);

  function onCardPointerDown(e) {
    if (cardExiting) return;
    cardDragging    = true;
    cardDragStartY  = e.clientY;
    cardDragY       = 0;
    cardJustEntered = false;
    clearTimeout(cardEnterTimer);
  }
  function onCardPointerMove(e) {
    if (!cardDragging || cardExiting) return;
    cardDragY = Math.min(0, e.clientY - cardDragStartY);
  }
  function onCardPointerUp() {
    if (!cardDragging) return;
    cardDragging = false;
    if (cardDragY < -60) {
      cardExiting = true;
      const id = visibleCards[0]?.id;
      setTimeout(() => {
        if (id) cardDismissed = new Set([...cardDismissed, id]);
        cardExiting     = false;
        cardDragY       = 0;
        cardJustEntered = true;
        cardEnterTimer  = setTimeout(() => { cardJustEntered = false; }, 400);
      }, 270);
    } else {
      cardDragY = 0;
    }
  }

  // ── Models ────────────────────────────────────────────────────────────────
  const MODELS = [
    { id: 'mistral-nemo',    label: 'Nemo',     sublabel: 'mistral-nemo'    },
    { id: 'deepseek-v4',     label: 'DeepSeek', sublabel: 'deepseek-v4'     },
    { id: 'deepseek-v4-pro', label: 'DS Pro',   sublabel: 'deepseek-v4-pro' },
  ];
  let currentModelId = MODELS[0].id;
  $: currentModel    = MODELS.find(m => m.id === currentModelId) ?? MODELS[0];

  // ── Popup ─────────────────────────────────────────────────────────────────
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
  let inputText = '';
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
    return () => { clearInterval(bgTimer); clearTimeout(cardEnterTimer); };
  });
</script>

<div class="root">

  {#each layers as layer}
    <div class="bg-layer" class:bg-on={layer.visible} style="background-image:url('{layer.img}');"></div>
  {/each}
  {#if !bgImages.length}<div class="bg-fallback"></div>{/if}
  <div class="scrim-top"></div>
  <div class="scrim-bottom"></div>

  <!-- ── Header ── -->
  <header class="header" class:in={mounted}>
    <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
    <button class="avatar-btn" style="background:{avatarColor}" on:click={logout}>{userInitial}</button>
  </header>

  <!-- ── Content ── -->
  <main class="content">

    <!-- News card stack -->
    <div class="card-area" class:in={mounted}>
      {#if cardsLoading}
        <div class="card-stack">
          <div class="card-skeleton"><div class="skeleton-shine"></div></div>
        </div>
      {:else if visibleCards.length > 0}
        <div class="card-stack">

          <!-- Back card — próxima notícia -->
          {#if nextCard}
            <div
              class="news-card card-back"
              style="background:{nextCard.image ? '#0d0d0d' : nextCard.topicGrad};
                     transform:scale({0.93 + 0.07*dragProgress}) translateY({Math.max(0,12*(1-dragProgress))}px);
                     filter:brightness({0.5 + 0.5*dragProgress});"
            >
              {#if nextCard.image}
                <img src={nextCard.image} alt="" class="card-img" onerror="this.style.opacity='0'" />
              {/if}
              <div class="card-grad"></div>
            </div>
          {/if}

          <!-- Front card — notícia activa -->
          {#if activeCard}
            <div
              class="news-card card-front"
              class:drag={cardDragging}
              class:exiting={cardExiting}
              class:entering={cardJustEntered}
              style="background:{activeCard.image ? '#0d0d0d' : activeCard.topicGrad};
                     transform:translateY({cardExiting ? -320 : cardDragY}px) rotate({cardExiting ? -5 : 0}deg);
                     opacity:{cardExiting ? 0 : 1};"
              on:pointerdown={onCardPointerDown}
              on:pointermove={onCardPointerMove}
              on:pointerup={onCardPointerUp}
              on:pointerleave={onCardPointerUp}
              on:pointercancel={onCardPointerUp}
            >
              {#if activeCard.image}
                <img src={activeCard.image} alt="" class="card-img" onerror="this.style.opacity='0'" />
              {/if}
              <div class="card-grad"></div>

              <div class="card-body">
                <div class="card-badge" style="color:{activeCard.topicColor}">
                  <div class="badge-dot" style="background:{activeCard.topicColor};box-shadow:0 0 6px {activeCard.topicColor}88"></div>
                  {activeCard.topicLabel}
                </div>
                <h2 class="card-title">{activeCard.title}</h2>
                {#if activeCard.subtitle}
                  <p class="card-sub">{activeCard.subtitle}</p>
                {/if}
                <div class="card-footer">
                  <span class="card-source">{activeCard.source}</span>
                  {#if activeCard.link}
                    <a href={activeCard.link} target="_blank" rel="noopener"
                       class="card-read-btn pulse-tap"
                       on:click|stopPropagation>
                      Ler
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </a>
                  {/if}
                </div>
              </div>

              <div class="swipe-hint" style="opacity:{Math.max(0, 0.35 - dragProgress*0.35)}">
                <div class="swipe-bar"></div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Dots -->
        {#if visibleCards.length > 1}
          <div class="card-dots">
            {#each visibleCards.slice(0,6) as _, i}
              <div class="card-dot" class:active={i===0}
                   style={i===0 ? `background:${activeCard?.topicColor ?? '#fff'}` : ''}></div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="card-empty">
          <span>Sem notícias de momento</span>
          <button class="retry-btn pulse-tap" on:click={fetchCards}>Tentar novamente</button>
        </div>
      {/if}
    </div>

    <!-- Apps -->
    <div class="apps-wrap" class:in={mounted}>
      <div class="apps-fade-l"></div>
      <div class="apps-fade-r"></div>
      <div class="apps-scroll">
        {#each platformApps as app, i}
          <button
            class="app-item"
            class:app-in={mounted}
            style="transition-delay:{i*38}ms"
            on:click={() => openApp(app)}
          >
            <div class="app-circle">
              {#if app.id === 'ai'}
                <img src="/icons/png/ia.png" alt={app.label} class="app-img" />
              {:else if app.icon && !app.icon.endsWith('.svg')}
                <img src={app.icon} alt={app.label} class="app-img" />
              {:else}
                <span class="app-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');"></span>
              {/if}
            </div>
            <span class="app-name">{app.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </main>

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

  <!-- ── Popup ── -->
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
          <button class="popup-row popup-back pulse-tap" on:click={() => switchPopup('add')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:15px;height:15px;background:rgba(255,255,255,0.42)"></span>
            <span class="popup-label" style="color:rgba(255,255,255,0.42);font-size:13px">Extras</span>
          </button>
          <div class="popup-sep"></div>
          {#each [
            [flashMode,    'Flash',      'flash',  'flash_filled',  () => { flashMode     = !flashMode;     if (flashMode)     thinkMoreMode = false; }],
            [thinkMoreMode,'Think More', 'brain',  'brain_filled',  () => { thinkMoreMode = !thinkMoreMode; if (thinkMoreMode) flashMode     = false; }],
            [sheetsEnabled,'Sheets',     'sheets', 'sheets_filled', () => { sheetsEnabled = !sheetsEnabled; }],
          ] as [active, title, ico, icoOn, action], i}
            {#if i > 0}<div class="popup-sep"></div>{/if}
            <button class="popup-row pulse-tap" style={active ? 'background:rgba(255,255,255,0.07)' : ''} on:click={action}>
              <!-- circular icon container -->
              <div class="popup-icon-wrap popup-icon-circle">
                <span class="icon-mask" style="mask-image:url('/icons/svg/{active?icoOn:ico}.svg');-webkit-mask-image:url('/icons/svg/{active?icoOn:ico}.svg');width:18px;height:18px;background:rgba(255,255,255,0.85)"></span>
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
  .scrim-top {
    position:absolute; top:0; left:0; right:0; height:45%; z-index:1;
    background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,transparent 100%);
    pointer-events:none;
  }
  .scrim-bottom {
    position:absolute; bottom:0; left:0; right:0; height:68%; z-index:1;
    background:linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.42) 50%,transparent 100%);
    pointer-events:none;
  }

  /* ── Header ── */
  .header {
    position:relative; z-index:10;
    display:flex; align-items:center; justify-content:space-between;
    padding:calc(env(safe-area-inset-top,0px) + 16px) 20px 10px;
    flex-shrink:0; opacity:0; transform:translateY(-12px);
    transition:opacity .55s ease,transform .55s ease;
  }
  .header.in { opacity:1; transform:translateY(0); }
  .logo-img { width:48px; height:48px; object-fit:contain; }
  .avatar-btn {
    width:36px; height:36px; border-radius:50%; border:none;
    font-size:15px; font-weight:700; color:#fff; cursor:pointer;
    transition:transform .25s ease,opacity .25s ease;
  }
  .avatar-btn:active { transform:scale(0.88); opacity:0.75; }

  /* ── Content ── */
  .content {
    position:relative; z-index:10;
    flex:1; display:flex; flex-direction:column;
    justify-content:flex-end; overflow:hidden;
    gap:12px; padding-bottom:4px;
  }

  /* ── Card area ── */
  .card-area {
    padding:0 16px;
    opacity:0; transform:translateY(16px);
    transition:opacity .6s .1s ease,transform .6s .1s ease;
    flex-shrink:0;
  }
  .card-area.in { opacity:1; transform:translateY(0); }

  .card-stack { position:relative; height:222px; }

  /* Skeleton */
  .card-skeleton {
    position:absolute; inset:0;
    border-radius:22px; overflow:hidden;
    background:rgba(255,255,255,0.06);
    border:0.5px solid rgba(255,255,255,0.10);
  }
  .skeleton-shine {
    position:absolute; inset:0;
    background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%);
    animation:shimmer 1.6s ease-in-out infinite;
  }
  @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

  /* ── News cards ── */
  .news-card {
    position:absolute; inset:0;
    border-radius:22px; overflow:hidden;
    border:0.5px solid rgba(255,255,255,0.12);
    box-shadow:0 18px 52px rgba(0,0,0,0.55);
  }
  .card-img {
    position:absolute; inset:0;
    width:100%; height:100%; object-fit:cover;
  }
  .card-grad {
    position:absolute; inset:0;
    background:linear-gradient(
      to top,
      rgba(0,0,0,0.95) 0%,
      rgba(0,0,0,0.72) 35%,
      rgba(0,0,0,0.22) 65%,
      transparent 100%
    );
    z-index:1;
  }

  /* Back card */
  .card-back {
    z-index:1;
    pointer-events:none;
    transition:transform .28s cubic-bezier(0.2,0.9,0.3,1),filter .28s ease;
  }

  /* Front card */
  .card-front {
    z-index:2;
    cursor:grab; user-select:none; touch-action:none;
    will-change:transform,opacity;
    transition:transform .38s cubic-bezier(0.34,1.56,0.64,1),opacity .38s ease;
  }
  .card-front:active { cursor:grabbing; }
  .card-front.drag { transition:none; }
  .card-front.exiting { transition:transform .26s cubic-bezier(0.4,0,1,1),opacity .24s ease; }
  .card-front.entering { animation:cardEnterUp .34s cubic-bezier(0.2,0.9,0.3,1) both; }

  @keyframes cardEnterUp {
    from { transform:scale(0.93) translateY(14px); opacity:.6; filter:brightness(.5); }
    to   { transform:scale(1) translateY(0); opacity:1; filter:brightness(1); }
  }

  /* Card body */
  .card-body {
    position:absolute; left:0; right:0; bottom:0;
    padding:14px 16px 14px; z-index:2;
  }
  .card-badge {
    display:flex; align-items:center; gap:6px;
    font-size:10px; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase; margin-bottom:7px;
  }
  .badge-dot {
    width:6px; height:6px; border-radius:50%; flex-shrink:0;
  }
  .card-title {
    font-size:17px; font-weight:700; color:#fff; line-height:1.24;
    margin-bottom:5px;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .card-sub {
    font-size:12px; color:rgba(255,255,255,0.52); line-height:1.4;
    margin-bottom:10px;
    display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;
  }
  .card-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .card-source {
    font-size:11px; font-weight:500; color:rgba(255,255,255,0.42);
    flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .card-read-btn {
    display:flex; align-items:center; gap:5px;
    padding:6px 14px; border-radius:20px;
    background:rgba(255,255,255,0.16);
    border:0.5px solid rgba(255,255,255,0.22);
    backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
    font-size:13px; font-weight:700; color:rgba(255,255,255,0.92);
    text-decoration:none; white-space:nowrap; flex-shrink:0;
  }
  .card-read-btn:active { background:rgba(255,255,255,0.26); }

  /* Swipe hint */
  .swipe-hint {
    position:absolute; top:10px; left:0; right:0;
    display:flex; justify-content:center; z-index:3;
    pointer-events:none; transition:opacity .3s;
  }
  .swipe-bar { width:34px; height:4px; border-radius:2px; background:rgba(255,255,255,0.28); }

  /* Dots */
  .card-dots {
    display:flex; gap:5px; justify-content:center; margin-top:9px;
  }
  .card-dot {
    width:5px; height:5px; border-radius:50%;
    background:rgba(255,255,255,0.25);
    transition:all .32s cubic-bezier(0.34,1.56,0.64,1);
  }
  .card-dot.active { width:18px; border-radius:3px; }

  /* Empty / retry */
  .card-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    height:100px; gap:10px;
    font-size:14px; color:rgba(255,255,255,0.40);
  }
  .retry-btn {
    padding:7px 18px; border-radius:20px; border:none;
    background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.72);
    font-size:13px; font-weight:600; cursor:pointer;
  }

  /* ── Apps ── */
  .apps-wrap {
    position:relative;
    opacity:0; transform:translateY(14px);
    transition:opacity .6s .25s ease,transform .6s .25s ease;
    padding-bottom:14px; flex-shrink:0;
  }
  .apps-wrap.in { opacity:1; transform:translateY(0); }

  /* Fade lateral — muito suave, apenas transparente */
  .apps-fade-l, .apps-fade-r {
    position:absolute; top:0; bottom:14px; width:28px;
    z-index:2; pointer-events:none;
  }
  .apps-fade-l { left:0; background:linear-gradient(to right,rgba(0,0,0,0.14) 0%,transparent 100%); }
  .apps-fade-r { right:0; background:linear-gradient(to left, rgba(0,0,0,0.14) 0%,transparent 100%); }

  .apps-scroll {
    display:flex; gap:2px; padding:0 12px;
    overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .apps-scroll::-webkit-scrollbar { display:none; }

  .app-item {
    display:flex; flex-direction:column; align-items:center; gap:5px;
    background:none; border:none; cursor:pointer;
    padding:0 7px; flex-shrink:0;
    opacity:0; transform:translateY(10px) scale(0.90);
    transition:opacity .48s ease,transform .48s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-item.app-in { opacity:1; transform:translateY(0) scale(1); }
  .app-item:active .app-circle { transform:scale(0.82); }

  .app-circle {
    width:46px; height:46px; border-radius:50%;
    background:rgba(255,255,255,0.13);
    border:0.5px solid rgba(255,255,255,0.16);
    display:flex; align-items:center; justify-content:center;
    transition:transform .32s cubic-bezier(0.34,1.56,0.64,1);
    overflow:hidden;
  }
  .app-img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
  .app-mask {
    display:block; width:20px; height:20px;
    background:rgba(255,255,255,0.88);
    mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center;
  }
  .app-name {
    font-size:10px; font-weight:400; color:rgba(255,255,255,0.70);
    white-space:nowrap; text-shadow:0 1px 6px rgba(0,0,0,0.55);
  }

  /* ── Bottom ── */
  .bottom {
    position:relative; z-index:10;
    padding:0 16px calc(env(safe-area-inset-bottom,0px) + 18px);
    flex-shrink:0; opacity:0; transform:translateY(18px);
    transition:opacity .6s .4s ease,transform .6s .4s ease;
  }
  .bottom.in { opacity:1; transform:translateY(0); }

  .bottom-bar {
    border-radius:22px;
    background:rgba(18,18,18,0.48);
    backdrop-filter:blur(30px) saturate(1.7);
    -webkit-backdrop-filter:blur(30px) saturate(1.7);
    border:0.5px solid rgba(255,255,255,0.14);
    box-shadow:0 8px 32px rgba(0,0,0,0.38),inset 0 0.5px 0 rgba(255,255,255,0.12);
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

  .bb-row {
    display:flex; align-items:center;
    height:52px; padding:0 6px; gap:0;
  }
  .flex1 { flex:1; }

  .bb-btn {
    width:40px; height:40px;
    display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:0.5px solid rgba(255,255,255,0.12);
    cursor:pointer; background:rgba(255,255,255,0.14); flex-shrink:0;
    transition:background .22s ease,transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background:rgba(255,255,255,0.22); transform:scale(0.88); }

  /* Model pill — mesma altura que bb-btn */
  .model-pill {
    height:40px; padding:0 14px;
    display:flex; align-items:center; gap:5px;
    border-radius:20px; border:0.5px solid rgba(255,255,255,0.15);
    cursor:pointer; background:rgba(255,255,255,0.14); flex-shrink:0;
    transition:background .22s ease,transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .model-pill:active { background:rgba(255,255,255,0.22); transform:scale(0.94); }
  .model-pill-label {
    font-size:13px; font-weight:600; color:rgba(255,255,255,0.85);
  }

  /* ── Recording card ── */
  .rec-card {
    position:relative; overflow:hidden; border-radius:999px;
    background:rgba(18,18,18,0.55);
    backdrop-filter:blur(28px) saturate(1.6);
    -webkit-backdrop-filter:blur(28px) saturate(1.6);
    border:0.5px solid rgba(255,255,255,0.13);
    box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 0.5px 0 rgba(255,255,255,0.10);
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
    transition:background .18s ease,transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-btn:active { background:rgba(255,255,255,0.20); transform:scale(0.88); }
  .rec-send { background:rgba(255,255,255,0.16); }
  .rec-center { display:flex; align-items:center; gap:8px; flex:1; justify-content:center; pointer-events:none; }
  .rec-dot { width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0; animation:recPulse 1.1s ease-in-out infinite; }
  @keyframes recPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
  .rec-timer { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:rgba(255,255,255,0.90); letter-spacing:.06em; }

  /* ── Popup ── */
  .popup-overlay { position:fixed; inset:0; z-index:50; }
  .popup-box {
    position:fixed; z-index:51;
    border-radius:18px;
    background:rgba(26,26,28,0.78);
    backdrop-filter:blur(32px) saturate(1.9);
    -webkit-backdrop-filter:blur(32px) saturate(1.9);
    border:0.5px solid rgba(255,255,255,0.12);
    box-shadow:0 14px 44px rgba(0,0,0,0.50),inset 0 0.5px 0 rgba(255,255,255,0.10);
    overflow:hidden; transform-origin:bottom left;
    opacity:0; transform:scale(0.86) translateY(8px);
    transition:opacity .22s cubic-bezier(0.2,0.9,0.3,1),transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events:none;
  }
  .popup-box.popup-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }

  /* Smooth mode switch */
  .popup-content { transition:opacity .13s ease,transform .13s ease; }
  .popup-content.fading { opacity:0; transform:translateY(4px); pointer-events:none; }

  .popup-title { padding:12px 16px 8px; font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:rgba(255,255,255,0.36); }
  .popup-row {
    display:flex; align-items:center; gap:12px;
    width:100%; padding:12px 14px;
    background:transparent; border:none; cursor:pointer;
    font-family:inherit; text-align:left;
    transition:background .14s ease;
  }
  .popup-row:active { background:rgba(255,255,255,0.08); }
  .popup-back { padding:9px 14px; }

  /* Icon wrap — padrão quadrado arredondado */
  .popup-icon-wrap {
    width:32px; height:32px; border-radius:8px;
    background:rgba(255,255,255,0.10);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  /* Circular para extras e modelos */
  .popup-icon-circle { border-radius:50%; }

  .popup-label { font-size:15px; font-weight:500; color:rgba(255,255,255,0.88); flex:1; }
  .popup-sep { height:0.5px; background:rgba(255,255,255,0.08); margin:0 14px; }
  .popup-active-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.85); flex-shrink:0; }

  /* Models — sem ícone, só texto */
  .model-info { display:flex; flex-direction:column; flex:1; min-width:0; }
  .model-sub  { font-size:11px; font-weight:400; color:rgba(255,255,255,0.32); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* ── Utilities ── */
  .pulse-tap { cursor:pointer; transition:transform .22s cubic-bezier(0.34,1.56,0.64,1),opacity .22s ease; }
  .pulse-tap:active { transform:scale(0.92); opacity:.80; }
  .icon-mask {
    display:block; mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center; flex-shrink:0;
  }
</style>