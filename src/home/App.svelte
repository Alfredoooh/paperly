<script>
  import { onMount, tick } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';

  let user = null;
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  const AVATAR_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE'];
  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  $: avatarColor = getAvatarColor(userName);

  // Apps ocultas por agora (jogos, media, profilelens). Código intacto, apenas filtradas da UI.
  const HIDDEN_APP_IDS = new Set(['games', 'media', 'profilelens']);

  let appsHidden = false;
  const platformApps = ALL_APPS.filter(a => a.id !== 'home' && !HIDDEN_APP_IDS.has(a.id));
  $: topApps = platformApps.slice(0, 3);
  $: bottomApps = platformApps.slice(3, 6);

  const MODELS = [
    { id: 'mistral-nemo',    label: 'Nemo',     sublabel: 'mistral-nemo'    },
    { id: 'deepseek-v4',     label: 'DeepSeek', sublabel: 'deepseek-v4'     },
    { id: 'deepseek-v4-pro', label: 'DS Pro',   sublabel: 'deepseek-v4-pro' },
  ];
  let currentModelId = MODELS[0].id;

  let themeValue = 'dark';
  let isDark = true;

  function resolveIsDark(v) {
    return v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyThemeValue(v, persist = true) {
    themeValue = v;
    isDark = resolveIsDark(v);
    if (persist) localStorage.setItem('nexa_theme', v);
    syncTheme(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  let mediaQuery;
  function handleSystemChange() {
    if (themeValue === 'system') applyThemeValue('system', false);
  }

  let drawerOpen = false;
  let drawerVisible = false;
  let themeExpanded = false;
  let appsExpanded = false;

  async function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    drawerVisible = false;
    themeExpanded = false;
    appsExpanded = false;
    await tick();
    requestAnimationFrame(() => {
      drawerVisible = true;
    });
  }
  function closeDrawer() {
    drawerVisible = false;
    themeExpanded = false;
    appsExpanded = false;
    setTimeout(() => {
      drawerOpen = false;
    }, 280);
  }
  function toggleThemeExpanded() {
    themeExpanded = !themeExpanded;
    if (themeExpanded) appsExpanded = false;
  }
  function toggleAppsExpanded() {
    appsExpanded = !appsExpanded;
    if (appsExpanded) themeExpanded = false;
  }

  const THEME_OPTIONS = [
    { id: 'dark', label: 'Escuro' },
    { id: 'light', label: 'Claro' },
    { id: 'system', label: 'Predefinição do sistema' },
  ];

  const DRAWER_ITEMS = [
    { icon: 'settings', label: 'Definições', action: () => {} },
    { icon: 'help', label: 'Ajuda', action: () => {} },
  ];

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {}
    }
    window.location.href = app.path;
  }

  function goToPlans() {
    window.location.href = '/plans';
  }

  const POPUP_W = 230;
  let showPopup = false;
  let popupVisible = false;
  let popupMode = '';
  let popupPos = { bottom: 0, left: 0 };
  let popupFading = false;
  let flashMode = false;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function openPopup(mode, event) {
    popupMode = mode;
    const rect = event.currentTarget.getBoundingClientRect();
    const M = 12;
    let left = rect.left - 8;
    if (left + POPUP_W > window.innerWidth - M) left = window.innerWidth - POPUP_W - M;
    if (left < M) left = M;
    popupPos = { bottom: window.innerHeight - rect.top + 8, left };
    showPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { popupVisible = true; }));
  }
  function closePopup() {
    popupVisible = false;
    setTimeout(() => {
      showPopup = false;
      popupMode = '';
    }, 220);
  }
  function switchPopup(mode) {
    popupFading = true;
    setTimeout(() => { popupMode = mode; popupFading = false; }, 130);
  }

  // Popup de Apps ancorado à pill do input (mesmo padrão do chat AI)
  const APPS_POPUP_W = 220;
  let showAppsPopup = false;
  let appsPopupVisible = false;
  let appsPopupPos = { bottom: 0, right: 0 };

  function openAppsPopup(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    appsPopupPos = {
      bottom: window.innerHeight - rect.top + 8,
      right: window.innerWidth - rect.right + 10,
    };
    showAppsPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { appsPopupVisible = true; }));
  }
  function closeAppsPopup() {
    appsPopupVisible = false;
    setTimeout(() => { showAppsPopup = false; }, 220);
  }

  let lottieEl;
  let lottieInstance;
  let lottieFinished = false;
  let togglesVisible = false;
  let shouldPlayLottie = false;

  const SUGGESTION_TOGGLES = [
    { id: 'image', label: 'Cria uma imagem', prompt: 'Cria uma imagem de ', icon: '/icons/svg/bw/image.svg' },
    { id: 'story', label: 'Conta uma história', prompt: 'Conta-me uma história sobre ', icon: '/icons/svg/bw/open_book.svg' },
    { id: 'math', label: 'Resolve um problema', prompt: 'Resolve este problema matemático: ', icon: '/icons/svg/bw/math.svg' },
    { id: 'search', label: 'Procure na web', prompt: 'Procura por ', icon: '/icons/svg/bw/browser.svg' },
    { id: 'slides', label: 'Cria slides', prompt: 'Cria uma apresentação de slides sobre ', icon: '/icons/svg/bw/slides.svg' },
    { id: 'pdf', label: 'Analisa um PDF', prompt: 'Analisa este PDF: ', icon: '/icons/svg/bw/pdf.svg' },
  ];

  let activeToggle = null;

  function selectToggle(t) {
    if (!togglesShouldShow) return;
    activeToggle = activeToggle?.id === t.id ? null : t;
    if (activeToggle) {
      inputText = activeToggle.prompt;
      setTimeout(() => {
        if (textInputEl) {
          autoResize();
          textInputEl.focus();
          textInputEl.setSelectionRange(inputText.length, inputText.length);
        }
      }, 80);
    } else {
      inputText = '';
      setTimeout(autoResize, 10);
    }
  }

  async function loadLottie() {
    if (typeof window === 'undefined') return;
    if (!window.lottie) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).catch(() => {});
    }
    if (window.lottie && lottieEl) {
      lottieInstance = window.lottie.loadAnimation({
        container: lottieEl,
        renderer: 'canvas',
        loop: false,
        autoplay: true,
        path: '/icons/lottie/welcome.json',
      });
      lottieInstance.addEventListener('complete', () => {
        lottieFinished = true;
        setTimeout(() => { togglesVisible = true; }, 60);
      });
    }
  }

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
      if (!mob && !e.shiftKey) {
        e.preventDefault();
        if (inputText.trim()) navigateToAI();
      }
    }
  }

  function navigateToAI() {
    const text = inputText.trim();
    if (!text) return;
    const ai = ALL_APPS.find(x => x.id === 'ai');
    if (!ai) return;
    try {
      sessionStorage.setItem('nexa_pending_message', text);
      sessionStorage.setItem('nexa_model', currentModelId);
    } catch(e) {}
    window.location.href = ai.path;
  }

  let searchSuggestions = [];
  let suggestLoading = false;
  let suggestDebounce;
  let abortSuggest;

  $: showSuggestBox = !!inputText.trim() && !isRecording;
  $: scheduleSuggestFetch(inputText);

  function scheduleSuggestFetch(text) {
    clearTimeout(suggestDebounce);
    const q = (text || '').trim();
    if (!q) {
      abortSuggest?.abort();
      searchSuggestions = [];
      suggestLoading = false;
      return;
    }
    suggestDebounce = setTimeout(() => fetchSuggestions(q), 250);
  }

  async function fetchSuggestions(q) {
    abortSuggest?.abort();
    abortSuggest = new AbortController();
    suggestLoading = true;

    const googleUrl = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-PT&gl=ao&q=${encodeURIComponent(q)}`;

    try {
      const res = await fetch(googleUrl, {
        signal: abortSuggest.signal,
        mode: 'cors',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('google suggest http ' + res.status);
      const data = await res.json();

      let raw = [];
      if (Array.isArray(data) && Array.isArray(data[1])) raw = data[1];
      else if (data?.[1] && Array.isArray(data[1])) raw = data[1];

      if (inputText.trim() !== q) return;
      searchSuggestions = raw.filter(Boolean).slice(0, 6);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        try {
          const fallbackUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
          const res2 = await fetch(fallbackUrl, {
            signal: abortSuggest.signal,
            mode: 'cors',
            cache: 'no-store',
          });
          if (!res2.ok) throw new Error('fallback suggest http ' + res2.status);
          const data2 = await res2.json();
          if (inputText.trim() !== q) return;
          searchSuggestions = (Array.isArray(data2) ? data2.map(x => x?.phrase).filter(Boolean) : []).slice(0, 6);
        } catch {
          searchSuggestions = [];
        }
      }
    } finally {
      suggestLoading = false;
    }
  }

  function fillSuggestion(s) {
    inputText = s;
    searchSuggestions = [];
    setTimeout(() => {
      autoResize();
      textInputEl?.focus();
      textInputEl?.setSelectionRange(inputText.length, inputText.length);
    }, 10);
  }

  function useSuggestion(s) {
    inputText = s;
    setTimeout(navigateToAI, 10);
  }

  let mediaRecorder = null, audioChunks = [], isRecording = false;
  let waveCtx = null, waveAnalyser = null, waveSource = null, waveStream = null;
  let waveAnimFrame = null, recSeconds = 0, recInterval = null, recCanvasEl;
  let wavePhase = 0;

  $: recTimerStr = (() => {
    const m = Math.floor(recSeconds / 60), s = recSeconds % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  })();

  async function startRecording() {
    if (isRecording) return;
    try {
      waveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveCtx = new (window.AudioContext || window.webkitAudioContext)();
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

      audioChunks = [];
      mediaRecorder = new MediaRecorder(waveStream);
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start();

      isRecording = true;
      recSeconds = 0;
      recInterval = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch(err) {
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
    audioChunks = [];
    stopWaveAnim();
  }

  async function handleRecStop() {
    if (!audioChunks.length) return;
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];
    try {
      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      form.append('language', 'pt');
      const res = await fetch('https://ipc.alfredoooh.workers.dev/ai/transcribe', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + (user?.token || '') },
        body: form
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) {
        inputText = (inputText ? inputText + ' ' : '') + text;
        setTimeout(autoResize, 10);
      }
    } catch(e) {
      console.error('Transcribe:', e);
    }
  }

  function startWaveAnim() {
    const N = 5;
    const bh = new Array(N).fill(0);

    function frame() {
      if (!recCanvasEl) return;
      waveAnimFrame = requestAnimationFrame(frame);
      const c = recCanvasEl, dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h);

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
          [Math.floor(L * .50), Math.floor(L * .80)]
        ];
        bands = def.map(([s,e]) => {
          const sl = [...freq].slice(s,e);
          return Math.pow(sl.reduce((a,b)=>a+b,0)/sl.length/255,0.5);
        });
      } else {
        wavePhase += 0.04;
        bands = [0,1,2,3,4].map(i => 0.06 + Math.abs(Math.sin(wavePhase * 1.2 + i * 0.8)) * 0.18);
      }

      for (let i=0; i<N; i++) bh[i] += (bands[i] - bh[i]) * (bands[i] > bh[i] ? 0.65 : 0.12);
      const bw = 3.5, gap = 5, tw = N * bw + (N - 1) * gap, sx = (w - tw) / 2, cy = h / 2, mh = h * 0.72;

      for (let i=0; i<N; i++) {
        const bhi = Math.max(4, bh[i] * mh), x = sx + i * (bw + gap), y = cy - bhi / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bhi, bw / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }
      wavePhase += 0.02;
    }
    frame();
  }

  function stopWaveAnim() {
    if (waveAnimFrame) {
      cancelAnimationFrame(waveAnimFrame);
      waveAnimFrame = null;
    }
    if (waveSource) {
      try { waveSource.disconnect(); } catch(e) {}
      waveSource = null;
    }
    if (waveCtx) {
      try { waveCtx.close(); } catch(e) {}
      waveCtx = null;
    }
    waveAnalyser = null;
  }

  $: contentPaddingBottom = 28;

  let mountToggles = false;
  $: if ((lottieFinished || !shouldPlayLottie) && !mountToggles) mountToggles = true;
  let inputFocused = false;
  $: togglesShouldShow = (lottieFinished || !shouldPlayLottie) && !inputText.trim() && !inputFocused;
  $: panelShouldShow = mountToggles ? togglesShouldShow : false;
  $: if (!togglesShouldShow && activeToggle) activeToggle = null;

  function handleInputFocus() {
    inputFocused = true;
  }
  function handleInputBlur() {
    inputFocused = false;
  }

  // ---- Efeito de digitação (typewriter) que alterna entre duas frases ----
  const HERO_PHRASES = [
    'Selecione qualquer app para o trabalho de hoje!',
    'Use a IA para estudos, projetos escolares e muito muito mais...'
  ];
  let heroDisplayText = '';
  let heroPhraseIdx = 0;
  let heroTimer = null;

  function runTypewriter() {
    clearTimeout(heroTimer);
    const full = HERO_PHRASES[heroPhraseIdx];
    let charIdx = 0;
    heroDisplayText = '';

    function typeStep() {
      if (charIdx <= full.length) {
        heroDisplayText = full.slice(0, charIdx);
        charIdx++;
        heroTimer = setTimeout(typeStep, 38);
      } else {
        heroTimer = setTimeout(eraseStep, 1800);
      }
    }
    function eraseStep() {
      if (heroDisplayText.length > 0) {
        heroDisplayText = heroDisplayText.slice(0, -1);
        heroTimer = setTimeout(eraseStep, 18);
      } else {
        heroPhraseIdx = (heroPhraseIdx + 1) % HERO_PHRASES.length;
        heroTimer = setTimeout(typeStep, 300);
      }
    }
    typeStep();
  }

  // ---- Scroll vertical: appbar fixo, secção "Modelos & Apps" revelada por baixo ----
  let scrollRootEl;
  let scrollProgress = 0; // 0 = topo (home), 1 = totalmente na secção de baixo
  let modelsTab = 'docs'; // 'docs' | 'images' | 'apps'

  const MODELS_TABS = [
    { id: 'docs',   label: 'Documentos' },
    { id: 'images', label: 'Imagens' },
    { id: 'apps',   label: 'Apps' },
  ];

  // Distância (px) de scroll necessária para o bottom subir e desaparecer por completo
  const BOTTOM_HIDE_DISTANCE = 120;
  let bottomHideProgress = 0; // 0 = bottom visível no lugar, 1 = totalmente escondido/subido

  function handleScroll() {
    if (!scrollRootEl) return;
    const max = scrollRootEl.scrollHeight - scrollRootEl.clientHeight;
    scrollProgress = max > 0 ? Math.min(1, scrollRootEl.scrollTop / max) : 0;
    bottomHideProgress = Math.min(1, scrollRootEl.scrollTop / BOTTOM_HIDE_DISTANCE);
  }

  let mounted = false;
  onMount(() => {
    user = requireAuth();
    if (!user) return;

    try {
      const savedHidden = localStorage.getItem('nexa_apps_hidden');
      appsHidden = savedHidden === '1';
    } catch(e) {}

    const saved = getTheme();
    applyThemeValue(localStorage.getItem('nexa_theme') || saved, false);

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);

    function onStorage(e) {
      if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue, false);
    }
    window.addEventListener('storage', onStorage);

    requestAnimationFrame(() => { mounted = true; });

    let justRegistered = false;
    try {
      justRegistered = sessionStorage.getItem('nexa_just_registered') === '1';
      sessionStorage.removeItem('nexa_just_registered');
    } catch(e) {}

    if (justRegistered) {
      shouldPlayLottie = true;
      loadLottie();
    } else {
      shouldPlayLottie = false;
      lottieFinished = true;
      togglesVisible = true;
      runTypewriter();
    }

    return () => {
      if (lottieInstance) lottieInstance.destroy();
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
      clearTimeout(suggestDebounce);
      clearTimeout(heroTimer);
      abortSuggest?.abort();
    };
  });

  $: if (lottieFinished && shouldPlayLottie && heroDisplayText === '' && !heroTimer) {
    runTypewriter();
  }

  function toggleAppsHidden() {
    appsHidden = !appsHidden;
    try { localStorage.setItem('nexa_apps_hidden', appsHidden ? '1' : '0'); } catch(e) {}
  }
</script>

<div class="root">
  <div class="bg-layer"></div>

  <!-- Appbar fixo: NUNCA se move, independentemente do scroll -->
  <div class="top-panel" class:in={mounted && panelShouldShow}>
    <header class="header">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-mark" />
      <div class="flex1"></div>
      <button class="upgrade-link pulse-tap" on:click={goToPlans}>Upgrade</button>
      <div class="flex1"></div>
      <div class="header-right">
        <button class="hdr-seg pulse-tap" on:click={openDrawer}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:19px;height:19px;background:var(--icon-strong)"></span>
        </button>
      </div>
    </header>

    {#if !appsHidden}
      <div class="apps-grid-fixed">
        <div class="apps-row-fixed">
          {#each topApps as app, i}
            <button class="home-app-pill pulse-tap app-anim" style="transition-delay:{i*55}ms" class:app-in={mounted && panelShouldShow} on:click={() => openApp(app)}>
              <div class="home-app-icon">
                <img src={app.icon} alt={app.label} class="home-app-img" />
              </div>
              <span class="home-app-name">{app.label}</span>
            </button>
          {/each}
        </div>

        <div class="apps-row-fixed">
          {#each bottomApps as app, i}
            <button class="home-app-pill pulse-tap app-anim" style="transition-delay:{(i+3)*55}ms" class:app-in={mounted && panelShouldShow} on:click={() => openApp(app)}>
              <div class="home-app-icon">
                <img src={app.icon} alt={app.label} class="home-app-img" />
              </div>
              <span class="home-app-name">{app.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Área com scroll vertical: home + secção Modelos & Apps por baixo -->
  <div class="scroll-root" bind:this={scrollRootEl} on:scroll={handleScroll}>
    <div class="scroll-page">
      <main class="content" style="padding-bottom:{contentPaddingBottom}px;">
        {#if shouldPlayLottie}
          <div class="lottie-wrap" class:lottie-hidden={lottieFinished} bind:this={lottieEl}></div>
        {:else}
          <div class="hero-text-wrap">
            <p class="hero-text">{heroDisplayText}<span class="hero-caret">|</span></p>
          </div>
        {/if}
      </main>
    </div>

    <div class="scroll-page scroll-page-models">
      <div class="models-divider"></div>
      <div class="models-header">
        <span class="models-title">Modelos &amp; Apps</span>
      </div>
      <div class="models-tabs">
        {#each MODELS_TABS as t}
          <button
            class="models-tab pulse-tap"
            class:models-tab-active={modelsTab === t.id}
            on:click={() => modelsTab = t.id}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <div class="models-tab-content">
        {#if modelsTab === 'docs'}
          <div class="models-empty">
            <span class="icon-mask" style="mask-image:url('/icons/svg/bw/pdf.svg');-webkit-mask-image:url('/icons/svg/bw/pdf.svg');width:30px;height:30px;background:var(--text-faint)"></span>
            <p class="models-empty-text">Os teus documentos vão aparecer aqui.</p>
          </div>
        {:else if modelsTab === 'images'}
          <div class="models-empty">
            <span class="icon-mask" style="mask-image:url('/icons/svg/bw/image.svg');-webkit-mask-image:url('/icons/svg/bw/image.svg');width:30px;height:30px;background:var(--text-faint)"></span>
            <p class="models-empty-text">As tuas imagens vão aparecer aqui.</p>
          </div>
        {:else if modelsTab === 'apps'}
          <div class="models-apps-list">
            {#if appsHidden}
              <div class="models-empty">
                <span class="icon-mask" style="mask-image:url('/icons/svg/apps.svg');-webkit-mask-image:url('/icons/svg/apps.svg');width:30px;height:30px;background:var(--text-faint)"></span>
                <p class="models-empty-text">Apps ocultas. Ativa-as no menu para as veres aqui.</p>
              </div>
            {:else}
              {#each platformApps as app}
                <button class="models-app-row pulse-tap" on:click={() => openApp(app)}>
                  <img src={app.icon} alt={app.label} class="models-app-icon" />
                  <span class="models-app-label">{app.label}</span>
                  <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:13px;height:13px;background:var(--icon-faint)"></span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<div
  class="bottom"
  class:in={mounted}
  style="transform:translateY(-{bottomHideProgress * 46}px) translateY({(1-bottomHideProgress) * 0}px); opacity:{1 - bottomHideProgress}; pointer-events:{bottomHideProgress > 0.6 ? 'none' : 'auto'};"
>
  {#if mountToggles}
    <div class="toggles-wrap" class:toggles-in={panelShouldShow} class:toggles-hidden={!togglesShouldShow} style="pointer-events:{togglesShouldShow?'auto':'none'}">
      {#each [SUGGESTION_TOGGLES.slice(0,2), SUGGESTION_TOGGLES.slice(2,4), SUGGESTION_TOGGLES.slice(4,6)] as row, ri}
        <div class="toggles-row">
          {#each row as t, i}
            <button
              class="suggestion-toggle pulse-tap"
              class:toggle-active={activeToggle?.id === t.id}
              style="transition-delay:{panelShouldShow ? (ri*2+i)*45 : 0}ms;"
              tabindex={togglesShouldShow ? 0 : -1}
              on:click={() => selectToggle(t)}
            >
              <img src={t.icon} alt={t.label} class="toggle-img" />
              <span class="toggle-label">{t.label}</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  {#if showSuggestBox && (searchSuggestions.length > 0 || suggestLoading)}
    <div class="suggest-box">
      {#if suggestLoading && !searchSuggestions.length}
        <div class="suggest-row suggest-loading">
          <svg class="suggest-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="suggest-text suggest-text-faint">A procurar sugestões...</span>
        </div>
      {:else}
        {#each searchSuggestions as s (s)}
          <button class="suggest-row pulse-tap" on:click={() => useSuggestion(s)}>
            <svg class="suggest-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span class="suggest-text">{s}</span>
            <span
              class="suggest-fill pulse-tap"
              role="button"
              tabindex="0"
              on:click|stopPropagation={() => fillSuggestion(s)}
              on:keydown|stopPropagation={(e) => { if (e.key === 'Enter' || e.key === ' ') fillSuggestion(s); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="17" y1="7" x2="7" y2="17"/>
                <polyline points="7 9 7 17 15 17"/>
              </svg>
            </span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  {#if isRecording}
    <div class="rec-card">
      <canvas bind:this={recCanvasEl} class="rec-canvas"></canvas>
      <div class="rec-inner">
        <button class="rec-btn pulse-tap" on:click={cancelRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
        </button>
        <div class="rec-center">
          <div class="rec-dot"></div>
          <span class="rec-timer">{recTimerStr}</span>
        </div>
        <button class="rec-btn rec-send pulse-tap" on:click={stopRecording}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon-strong)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
        on:focus={handleInputFocus}
        on:blur={handleInputBlur}
      ></textarea>
      <div class="bb-row">
        <button class="bb-btn pulse-tap" on:click={(e) => openPopup('add', e)}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
        </button>
        <div class="flex1"></div>
        <button class="bb-pill pulse-tap" on:click={openAppsPopup}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
          <span class="bb-pill-label">Apps</span>
        </button>
        <div style="width:8px"></div>
        {#if inputText.trim()}
          <button class="bb-btn pulse-tap" on:click={navigateToAI}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:var(--icon-strong)"></span>
          </button>
        {:else}
          <button class="bb-btn pulse-tap" on:click={startRecording}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="legal-row-plain">
    <button class="legal-link pulse-tap" on:click={() => window.location.href = '/legal/terms'}>Termos de Utilização</button>
    <span class="legal-dot">·</span>
    <button class="legal-link pulse-tap" on:click={() => window.location.href = '/legal/privacy'}>Política de Privacidade</button>
  </div>
</div>

{#if showPopup}
  <div class="popup-overlay" on:click={closePopup}></div>
  <div class="popup-box" class:popup-in={popupVisible} style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;width:{POPUP_W}px;">
    <div class="popup-content" class:fading={popupFading}>
      {#if popupMode === 'add'}
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label">Enviar Imagem</span>
          <input type="file" accept="image/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label">Enviar Ficheiro</span>
          <input type="file" accept="*/*" style="display:none" on:change={closePopup} />
        </label>
        <div class="popup-sep"></div>
        <button class="popup-row pulse-tap" on:click={() => switchPopup('extras')}>
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label" style="flex:1">Extras</span>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:13px;height:13px;background:var(--icon-faint)"></span>
        </button>
      {:else if popupMode === 'extras'}
        <button class="popup-row popup-back pulse-tap" on:click={() => switchPopup('add')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:15px;height:15px;background:var(--icon-faint)"></span>
          <span class="popup-label" style="color:var(--text-faint);font-size:13px">Extras</span>
        </button>
        <div class="popup-sep"></div>
        {#each [
          [flashMode,     'Flash',      'flash',  'flash_filled',  () => { flashMode = !flashMode; if (flashMode) thinkMoreMode = false; }],
          [thinkMoreMode, 'Think More', 'brain',  'brain_filled',  () => { thinkMoreMode = !thinkMoreMode; if (thinkMoreMode) flashMode = false; }],
          [sheetsEnabled, 'Sheets',     'sheets', 'sheets_filled', () => { sheetsEnabled = !sheetsEnabled; }],
        ] as [active, title, ico, icoOn, action], i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button class="popup-row pulse-tap" style={active ? 'background:var(--row-active)' : ''} on:click={action}>
            <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/{active?icoOn:ico}.svg');-webkit-mask-image:url('/icons/svg/{active?icoOn:ico}.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
            <span class="popup-label" style="flex:1">{title}</span>
            {#if active}<div class="popup-active-dot"></div>{/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<!-- Popup de Apps ancorado à pill do input — mesmo padrão visual/animação do popup add/extras -->
{#if showAppsPopup}
  <div class="popup-overlay" on:click={closeAppsPopup}></div>
  <div class="popup-box" class:popup-in={appsPopupVisible} style="bottom:{appsPopupPos.bottom}px;right:{appsPopupPos.right}px;width:{APPS_POPUP_W}px;" >
    <div class="popup-content">
      {#if appsHidden}
        <div class="popup-row" style="cursor:default">
          <span class="popup-label" style="color:var(--text-faint);font-size:13px">Apps ocultas. Ativa-as no menu.</span>
        </div>
      {:else}
        {#each platformApps as app, i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button class="popup-row pulse-tap" on:click={() => { closeAppsPopup(); openApp(app); }}>
            <img src={app.icon} alt={app.label} class="popup-app-icon" />
            <span class="popup-label">{app.label}</span>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

{#if drawerOpen}
  <div class="drawer-overlay" class:drawer-overlay-in={drawerVisible} on:click={closeDrawer}></div>
  <div class="drawer" class:drawer-in={drawerVisible}>
    <div class="drawer-avatar-block">
      <div class="drawer-avatar" style="background:{avatarColor}">{userInitial}</div>
      <span class="drawer-user-name">{userName}</span>
    </div>
    <div class="drawer-sep"></div>
    <nav class="drawer-nav">
      <button class="drawer-item pulse-tap" on:click={toggleThemeExpanded}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
        <span class="drawer-item-label" style="flex:1">Tema</span>
        <span class="icon-mask drawer-chevron" class:drawer-chevron-open={themeExpanded} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:14px;height:14px;background:var(--drawer-text-faint)"></span>
      </button>
      <div class="theme-accordion" class:theme-accordion-open={themeExpanded}>
        <div class="theme-accordion-inner">
          {#each THEME_OPTIONS as opt}
            <button class="theme-opt pulse-tap" on:click={() => { applyThemeValue(opt.id); themeExpanded = false; }}>
              <span class="theme-opt-label" style={themeValue === opt.id ? 'color:var(--drawer-text);font-weight:600' : ''}>{opt.label}</span>
              {#if themeValue === opt.id}
                <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');width:14px;height:14px;background:var(--drawer-text);display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0;"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <button class="drawer-item pulse-tap" on:click={toggleAppsExpanded}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/apps.svg');-webkit-mask-image:url('/icons/svg/apps.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
        <span class="drawer-item-label" style="flex:1">Apps</span>
        <span class="icon-mask drawer-chevron" class:drawer-chevron-open={appsExpanded} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:14px;height:14px;background:var(--drawer-text-faint)"></span>
      </button>
      <div class="theme-accordion" class:theme-accordion-open={appsExpanded}>
        <div class="theme-accordion-inner">
          <div class="apps-switch-row">
            <span class="apps-switch-label">Ocultar apps</span>
            <button
              class="switch-track pulse-tap"
              class:switch-on={appsHidden}
              role="switch"
              aria-checked={appsHidden}
              on:click={toggleAppsHidden}
            >
              <span class="switch-thumb" class:switch-thumb-on={appsHidden}></span>
            </button>
          </div>
        </div>
      </div>

      {#each DRAWER_ITEMS as item}
        <button class="drawer-item pulse-tap" on:click={() => { item.action(); closeDrawer(); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label">{item.label}</span>
        </button>
      {/each}
    </nav>
    <div style="flex:1"></div>
    <div class="drawer-sep"></div>
    <button class="drawer-logout pulse-tap" on:click={() => { closeDrawer(); logout(); }}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');width:19px;height:19px;background:var(--logout-icon)"></span>
      <span class="drawer-logout-label">Terminar sessão</span>
    </button>
    <div style="height:max(env(safe-area-inset-bottom,0px),12px)"></div>
  </div>
{/if}

<style>
  * { box-sizing:border-box; margin:0; padding:0; }

  :global(html), :global(body) {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
  }

  :global([data-theme="dark"]) {
    --app-bg:             #0F0F0F;
    --surface:            #0F0F0F;
    --surface-strong:     #0F0F0F;
    --surface-popover:    #202023;
    --border-soft:        rgba(255,255,255,0.12);
    --border-faint:       rgba(255,255,255,0.09);
    --icon-strong:        rgba(255,255,255,0.88);
    --icon-soft:          rgba(255,255,255,0.52);
    --icon-faint:         rgba(255,255,255,0.30);
    --icon-on-accent:     #fff;
    --text-faint:         rgba(255,255,255,0.38);
    --row-active:         rgba(255,255,255,0.07);
    --btn-bg:             rgba(255,255,255,0.10);
    --btn-bg-active:      rgba(255,255,255,0.18);
    --hdr-seg-bg:         rgba(255,255,255,0.08);
    --hdr-seg-active:     rgba(255,255,255,0.16);
    --overlay-soft:       rgba(0,0,0,0.22);
    --drawer-bg:          #0F0F0F;
    --drawer-border:      rgba(255,255,255,0.08);
    --drawer-shadow:      rgba(0,0,0,0.45);
    --drawer-text:        rgba(255,255,255,0.82);
    --drawer-text-faint:  rgba(255,255,255,0.35);
    --drawer-sep:         rgba(255,255,255,0.10);
    --drawer-overlay-in:  rgba(0,0,0,0.35);
    --drawer-row-active:  rgba(255,255,255,0.06);
    --toggle-bg:          #1a1a1a;
    --toggle-bg-act:      #232323;
    --toggle-border:      rgba(255,255,255,0.14);
    --toggle-border-act:  rgba(255,255,255,0.32);
    --toggle-label:       rgba(255,255,255,0.90);
    --upgrade-bg:         rgba(64,132,255,0.16);
    --upgrade-border:     rgba(64,132,255,0.35);
    --upgrade-text:       #6ea8ff;
    --logout-bg:          var(--btn-bg);
    --logout-bg-active:   var(--btn-bg-active);
    --logout-icon:        #FF453A;
    --app-pill-bg:        #1a1a1a;
    --app-pill-border:    rgba(255,255,255,0.12);
    --switch-off-bg:      rgba(255,255,255,0.16);
    --switch-on-bg:       #34C759;
    --switch-thumb-bg:    #ffffff;
    --divider-color:      rgba(255,255,255,0.10);
  }

  :global([data-theme="light"]) {
    --app-bg:             #FFFFFF;
    --surface:            #FFFFFF;
    --surface-strong:     #FFFFFF;
    --surface-popover:    #ffffff;
    --border-soft:        rgba(0,0,0,0.09);
    --border-faint:       rgba(0,0,0,0.07);
    --icon-strong:        rgba(20,20,20,0.85);
    --icon-soft:          rgba(20,20,20,0.48);
    --icon-faint:         rgba(20,20,20,0.28);
    --icon-on-accent:     #fff;
    --text-faint:         rgba(20,20,20,0.40);
    --row-active:         rgba(0,0,0,0.05);
    --btn-bg:             rgba(0,0,0,0.06);
    --btn-bg-active:      rgba(0,0,0,0.11);
    --hdr-seg-bg:         rgba(0,0,0,0.06);
    --hdr-seg-active:     rgba(0,0,0,0.11);
    --overlay-soft:       rgba(0,0,0,0.14);
    --drawer-bg:          #ffffff;
    --drawer-border:      rgba(0,0,0,0.07);
    --drawer-shadow:      rgba(0,0,0,0.13);
    --drawer-text:        #111111;
    --drawer-text-faint:  rgba(0,0,0,0.30);
    --drawer-sep:         rgba(0,0,0,0.09);
    --drawer-overlay-in:  rgba(0,0,0,0.20);
    --drawer-row-active:  rgba(0,0,0,0.05);
    --toggle-bg:          #ffffff;
    --toggle-bg-act:      #f0f0f2;
    --toggle-border:      rgba(0,0,0,0.10);
    --toggle-border-act:  rgba(0,0,0,0.24);
    --toggle-label:       rgba(20,20,20,0.85);
    --upgrade-bg:         rgba(64,132,255,0.10);
    --upgrade-border:     rgba(64,132,255,0.28);
    --upgrade-text:       #2f6fe0;
    --logout-bg:          var(--btn-bg);
    --logout-bg-active:   var(--btn-bg-active);
    --logout-icon:        #E0342A;
    --app-pill-bg:        #FFFFFF;
    --app-pill-border:    rgba(0,0,0,0.09);
    --switch-off-bg:      rgba(0,0,0,0.14);
    --switch-on-bg:       #34C759;
    --switch-thumb-bg:    #ffffff;
    --divider-color:      rgba(0,0,0,0.08);
  }

  .root {
    position:fixed;
    inset:0;
    overflow:hidden;
    overscroll-behavior:none;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    touch-action: pan-y;
  }

  .bg-layer {
    position:absolute;
    inset:0;
    z-index:0;
    background:var(--app-bg);
  }

  .top-panel {
    position:fixed;
    top:0;
    left:0;
    right:0;
    z-index:15;
    display:flex;
    flex-direction:column;
    background:var(--surface);
    border-bottom-left-radius:26px;
    border-bottom-right-radius:26px;
    padding-bottom:10px;
    opacity:0;
    transform:translateY(-16px) translateZ(0);
    transition:opacity .4s ease, transform .4s ease;
    pointer-events:none;
    contain: layout style paint;
  }
  .top-panel.in {
    opacity:1;
    transform:translateY(0) translateZ(0);
    pointer-events:auto;
  }

  .header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:calc(env(safe-area-inset-top,0px) + 10px) 14px 4px;
    gap:10px;
  }

  .logo-mark {
    height:19px;
    width:auto;
    display:block;
    flex-shrink:0;
  }

  .upgrade-link {
    background:none;
    border:none;
    font-family:inherit;
    font-size:13px;
    font-weight:700;
    color:var(--upgrade-text);
    text-decoration:underline;
    cursor:pointer;
    padding:8px 4px;
    flex-shrink:0;
    white-space:nowrap;
  }

  .header-right {
    display:flex;
    align-items:center;
    height:34px;
    border-radius:17px;
    background:var(--hdr-seg-bg);
    overflow:hidden;
    flex-shrink:0;
  }
  .hdr-seg {
    width:36px;
    height:34px;
    border:none;
    background:transparent;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    transition:background .18s ease;
  }
  .hdr-seg:active { background:var(--hdr-seg-active); }

  .apps-grid-fixed {
    display:flex;
    flex-direction:column;
    gap:8px;
    align-items:center;
    width:100%;
    padding-top:6px;
  }

  .apps-row-fixed {
    display:flex;
    justify-content:center;
    align-items:flex-start;
    width:100%;
    gap:8px;
    flex-wrap:wrap;
    padding:0 10px;
  }

  .home-app-pill {
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:5px 14px 5px 5px;
    background:var(--app-pill-bg);
    border:1px solid var(--app-pill-border);
    border-radius:9999px;
    box-shadow:0 2px 10px rgba(0,0,0,.08);
    cursor:pointer;
    flex-shrink:0;
    transition:background .14s ease, transform .14s cubic-bezier(0.34,1.56,0.64,1), border-color .14s ease;
  }
  .app-anim {
    opacity:0;
    transform:scale(0.7) translateY(14px);
    transition-property:opacity, transform, background, border-color;
    transition-duration:.48s, .48s, .14s, .14s;
    transition-timing-function:cubic-bezier(0.16,1,0.3,1), cubic-bezier(0.16,1,0.3,1), ease, ease;
  }
  .app-anim.app-in {
    opacity:1;
    transform:scale(1) translateY(0);
  }
  .home-app-pill:active {
    transform:scale(0.94);
  }
  .home-app-icon {
    width:32px;
    height:32px;
    border-radius:50%;
    overflow:hidden;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
  }
  .home-app-img {
    width:32px;
    height:32px;
    object-fit:contain;
    display:block;
    border-radius:50%;
  }
  .home-app-name {
    font-size:14px;
    font-weight:600;
    color:var(--icon-strong);
    white-space:nowrap;
  }

  /* --- Scroll vertical: página home (100%) + página modelos&apps por baixo --- */
  .scroll-root {
    position:absolute;
    inset:0;
    z-index:10;
    overflow-y:auto;
    overflow-x:hidden;
    scroll-snap-type:y proximity;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior-y:contain;
  }
  .scroll-page {
    min-height:100%;
    width:100%;
    scroll-snap-align:start;
    display:flex;
    flex-direction:column;
  }
  .scroll-page-models {
    min-height:60vh;
    padding:0 18px calc(env(safe-area-inset-bottom,0px) + 200px);
  }

  .content {
    flex:1;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-end;
    position:relative;
  }
  .lottie-wrap {
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%, -50%);
    width:220px;
    height:220px;
    transition:opacity .35s ease, transform .35s ease;
  }
  .lottie-hidden {
    opacity:0;
    transform:translate(-50%,-50%) scale(0.85);
    pointer-events:none;
  }

  .hero-text-wrap {
    position:absolute;
    top:50%;
    left:50%;
    transform:translate(-50%, -50%);
    width:min(78vw, 340px);
    display:flex;
    align-items:center;
    justify-content:center;
    pointer-events:none;
  }
  .hero-text {
    text-align:center;
    font-family:Georgia, 'Times New Roman', serif;
    font-style:italic;
    font-weight:500;
    font-size:21px;
    line-height:1.45;
    color:var(--icon-strong);
    letter-spacing:0.1px;
    opacity:0.92;
    min-height:1.45em;
  }
  .hero-caret {
    display:inline-block;
    font-style:normal;
    margin-left:1px;
    animation:heroBlink 0.9s step-end infinite;
    color:var(--upgrade-text);
    font-weight:300;
  }
  @keyframes heroBlink { 50% { opacity:0; } }

  .models-divider {
    height:1px;
    background:var(--divider-color);
    margin:0 0 18px;
    flex-shrink:0;
  }
  .models-header {
    display:flex;
    align-items:center;
    justify-content:center;
    padding-bottom:14px;
  }
  .models-title {
    font-family:Georgia, 'Times New Roman', serif;
    font-style:italic;
    font-size:19px;
    font-weight:600;
    color:var(--icon-strong);
  }
  .models-tabs {
    display:flex;
    gap:6px;
    background:var(--btn-bg);
    padding:4px;
    border-radius:14px;
    margin-bottom:18px;
  }
  .models-tab {
    flex:1;
    border:none;
    background:transparent;
    padding:9px 6px;
    border-radius:10px;
    font-family:inherit;
    font-size:13px;
    font-weight:600;
    color:var(--text-faint);
    cursor:pointer;
    transition:background .18s ease, color .18s ease;
  }
  .models-tab-active {
    background:var(--surface-strong);
    color:var(--icon-strong);
    box-shadow:0 2px 8px rgba(0,0,0,0.10);
  }
  .models-tab-content { flex:1; }
  .models-empty {
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:12px;
    padding:40px 20px;
    text-align:center;
  }
  .models-empty-text {
    font-size:13.5px;
    color:var(--text-faint);
    line-height:1.5;
  }
  .models-apps-list { display:flex; flex-direction:column; gap:8px; }
  .models-app-row {
    display:flex;
    align-items:center;
    gap:12px;
    width:100%;
    padding:12px 14px;
    border-radius:14px;
    background:var(--app-pill-bg);
    border:1px solid var(--app-pill-border);
    cursor:pointer;
    font-family:inherit;
    text-align:left;
    transition:background .14s ease, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .models-app-row:active { transform:scale(0.98); }
  .models-app-icon { width:28px; height:28px; border-radius:8px; object-fit:contain; flex-shrink:0; }
  .models-app-label { flex:1; font-size:14.5px; font-weight:600; color:var(--icon-strong); }

  .bottom {
    position:fixed;
    bottom:0;
    left:0;
    right:0;
    z-index:20;
    padding-left:16px;
    padding-right:16px;
    padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px);
    opacity:0;
    transition:opacity .6s .3s ease;
    will-change: transform, opacity;
  }
  .bottom.in { opacity:1; }

  .toggles-wrap {
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:8px;
    width:100%;
    padding-bottom:10px;
  }
  .toggles-row { display:flex; flex-direction:row; justify-content:center; gap:7px; }

  .suggestion-toggle {
    display:inline-flex;
    align-items:center;
    gap:7px;
    padding:7px 14px 7px 7px;
    border-radius:999px;
    border:1px solid var(--toggle-border);
    background:var(--toggle-bg);
    cursor:pointer;
    font-family:inherit;
    white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.10);
    opacity:0;
    transform:scale(0.86) translateY(10px);
    transition:
      opacity .46s cubic-bezier(0.16,1,0.3,1),
      transform .46s cubic-bezier(0.16,1,0.3,1),
      background .18s ease,
      border-color .18s ease;
  }
  .toggles-in .suggestion-toggle {
    opacity:1;
    transform:scale(1) translateY(0);
  }
  .toggles-hidden .suggestion-toggle {
    opacity:0;
    transform:scale(0.92) translateY(6px);
    transition:
      opacity .22s cubic-bezier(0.4,0,1,1),
      transform .22s cubic-bezier(0.4,0,1,1);
    transition-delay:0ms !important;
  }
  .suggestion-toggle:active { transform:scale(0.95); }
  .toggle-active { background:var(--toggle-bg-act) !important; border-color:var(--toggle-border-act) !important; }
  .toggle-img { width:22px; height:22px; object-fit:contain; flex-shrink:0; border-radius:5px; }
  .toggle-label { font-size:13px; font-weight:600; color:var(--toggle-label); }

  .bottom-bar {
    border-radius:22px;
    background:var(--surface);
    border:0.5px solid var(--border-soft);
    box-shadow:0 6px 24px rgba(0,0,0,0.16);
    display:flex;
    flex-direction:column;
  }
  .chat-input {
    resize:none;
    outline:none;
    border:none;
    background:transparent;
    font-size:15px;
    line-height:1.5;
    padding:13px 18px 0;
    width:100%;
    font-family:inherit;
    color:var(--icon-strong);
    max-height:150px;
    overflow-y:auto;
    -webkit-user-select:text;
    user-select:text;
  }
  .chat-input::placeholder { color:var(--text-faint); }
  .bb-row { display:flex; align-items:center; height:52px; padding:0 6px; }
  .flex1 { flex:1; }
  .bb-btn {
    width:40px;
    height:40px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:50%;
    border:0.5px solid var(--border-faint);
    cursor:pointer;
    background:var(--btn-bg);
    flex-shrink:0;
    transition:background .20s ease, transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background:var(--btn-bg-active); transform:scale(0.88); }
  .bb-pill {
    display:flex;
    align-items:center;
    gap:6px;
    height:40px;
    padding:0 14px;
    border-radius:20px;
    border:0.5px solid var(--border-faint);
    background:var(--btn-bg);
    cursor:pointer;
    flex-shrink:0;
    transition:background .20s ease, transform .20s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-pill:active { background:var(--btn-bg-active); transform:scale(0.94); }
  .bb-pill-label { font-size:14px; font-weight:700; color:var(--icon-strong); }

  .rec-card {
    position:relative;
    overflow:hidden;
    border-radius:999px;
    background:var(--surface);
    border:0.5px solid var(--border-soft);
    box-shadow:0 6px 24px rgba(0,0,0,0.16);
    height:64px;
    animation:recIn .28s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes recIn {
    from { opacity:0; transform:scale(0.92) translateY(10px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  .rec-canvas { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; }
  .rec-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; height:100%; padding:0 10px; }
  .rec-btn {
    width:44px;
    height:44px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:50%;
    border:0.5px solid var(--border-faint);
    cursor:pointer;
    background:var(--btn-bg);
    flex-shrink:0;
    transition:background .18s ease, transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-btn:active { background:var(--btn-bg-active); transform:scale(0.88); }
  .rec-send { background:var(--btn-bg-active); }
  .rec-center { display:flex; align-items:center; gap:8px; flex:1; justify-content:center; pointer-events:none; }
  .rec-dot { width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0; animation:recPulse 1.1s ease-in-out infinite; }
  @keyframes recPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:.4; transform:scale(.75); }
  }
  .rec-timer { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--icon-strong); letter-spacing:.06em; }

  .suggest-box {
    border-radius:18px;
    background:var(--surface-strong);
    border:0.5px solid var(--border-soft);
    box-shadow:0 8px 26px rgba(0,0,0,0.16);
    overflow:hidden;
    margin-bottom:8px;
    animation:suggestIn .22s cubic-bezier(0.2,0.9,0.3,1) both;
  }
  @keyframes suggestIn {
    from { opacity:0; transform:translateY(8px); }
    to { opacity:1; transform:translateY(0); }
  }
  .suggest-row {
    display:flex;
    align-items:center;
    gap:12px;
    width:100%;
    padding:11px 12px;
    background:transparent;
    border:none;
    cursor:pointer;
    font-family:inherit;
    text-align:left;
    transition:background .14s ease;
  }
  .suggest-row:active { background:var(--row-active); }
  .suggest-loading { cursor:default; }
  .suggest-search-ico { flex-shrink:0; }
  .suggest-text {
    flex:1;
    font-size:14px;
    font-weight:500;
    color:var(--icon-strong);
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .suggest-text-faint { color:var(--text-faint); font-weight:400; }
  .suggest-fill {
    width:30px;
    height:30px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
    transition:background .14s ease, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .suggest-fill:active { background:var(--btn-bg-active); transform:scale(0.86); }

  .legal-row-plain {
    margin-top: 12px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:6px;
  }
  .legal-link {
    background:none;
    border:none;
    font-family:inherit;
    font-size:10.5px;
    font-weight:500;
    color:var(--text-faint);
    cursor:pointer;
    padding:2px 1px;
  }
  .legal-link:active { color:var(--icon-soft); }
  .legal-dot { font-size:10px; color:var(--text-faint); }

  .popup-overlay { position:fixed; inset:0; z-index:50; }
  .popup-box {
    position:fixed;
    z-index:51;
    border-radius:18px;
    background:var(--surface-strong);
    border:0.5px solid var(--border-soft);
    box-shadow:0 12px 36px rgba(0,0,0,0.24);
    overflow:hidden;
    transform-origin:bottom left;
    opacity:0;
    transform:scale(0.86) translateY(8px);
    transition:opacity .22s cubic-bezier(0.2,0.9,0.3,1), transform .22s cubic-bezier(0.2,0.9,0.3,1);
    pointer-events:none;
  }
  .popup-box.popup-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }
  .popup-content { transition:opacity .13s ease, transform .13s ease; }
  .popup-content.fading { opacity:0; transform:translateY(4px); pointer-events:none; }
  .popup-row {
    display:flex;
    align-items:center;
    gap:12px;
    width:100%;
    padding:12px 14px;
    background:transparent;
    border:none;
    cursor:pointer;
    font-family:inherit;
    text-align:left;
    transition:background .14s ease;
  }
  .popup-row:active { background:var(--row-active); }
  .popup-back { padding:9px 14px; }
  .popup-icon-wrap {
    width:32px;
    height:32px;
    border-radius:50%;
    background:var(--btn-bg);
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
  }
  .popup-app-icon { width:26px; height:26px; border-radius:7px; object-fit:contain; flex-shrink:0; }
  .popup-label { font-size:15px; font-weight:500; color:var(--icon-strong); flex:1; }
  .popup-sep { height:0.5px; background:var(--border-faint); margin:0 14px; }
  .popup-active-dot { width:7px; height:7px; border-radius:50%; background:var(--icon-strong); flex-shrink:0; }

  .drawer-overlay {
    position:fixed;
    inset:0;
    z-index:70;
    background:transparent;
    transition:background .28s ease;
    will-change: background;
  }
  .drawer-overlay.drawer-overlay-in { background:var(--drawer-overlay-in); }

  .drawer {
    position:fixed;
    top:0;
    right:0;
    bottom:0;
    z-index:71;
    width:min(288px,82vw);
    background:var(--drawer-bg);
    border-left:0.5px solid var(--drawer-border);
    box-shadow:-12px 0 48px var(--drawer-shadow);
    display:flex;
    flex-direction:column;
    padding-top:max(env(safe-area-inset-top,0px),16px);
    overflow:hidden;
    transform:translate3d(100%,0,0);
    opacity:0.98;
    transition:transform .28s cubic-bezier(0.25,0.46,0.45,0.94), opacity .18s ease;
    will-change: transform, opacity;
    backface-visibility: hidden;
    contain: layout paint style;
  }
  .drawer.drawer-in {
    transform:translate3d(0,0,0);
    opacity:1;
  }
  .drawer-avatar-block {
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:10px;
    padding:18px 20px;
    flex-shrink:0;
  }
  .drawer-avatar {
    width:84px;
    height:84px;
    border-radius:50%;
    flex-shrink:0;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:32px;
    font-weight:700;
    color:#fff;
  }
  .drawer-user-name {
    font-size:16px;
    font-weight:700;
    color:var(--drawer-text);
    text-align:center;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    max-width:100%;
  }
  .drawer-sep { height:0.5px; background:var(--drawer-sep); margin:0 14px; flex-shrink:0; }
  .drawer-nav {
    display:flex;
    flex-direction:column;
    padding:8px 6px;
    overflow-y:auto;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
    flex:1;
  }
  .drawer-item {
    display:flex;
    align-items:center;
    gap:16px;
    padding:13px 14px;
    border-radius:10px;
    border:none;
    background:transparent;
    cursor:pointer;
    font-family:inherit;
    text-align:left;
    transition:background .12s ease;
    width:100%;
  }
  .drawer-item:active { background:var(--drawer-row-active); }
  .drawer-item-label { font-size:15px; font-weight:400; color:var(--drawer-text); }
  .drawer-chevron { transition:transform .25s cubic-bezier(0.25,0.46,0.45,0.94); }
  .drawer-chevron-open { transform:rotate(90deg); }
  .theme-accordion { display:grid; grid-template-rows:0fr; transition:grid-template-rows .25s cubic-bezier(0.25,0.46,0.45,0.94); }
  .theme-accordion-open { grid-template-rows:1fr; }
  .theme-accordion-inner { overflow:hidden; min-height:0; }
  .theme-opt {
    display:flex;
    align-items:center;
    justify-content:space-between;
    width:100%;
    padding:11px 14px 11px 52px;
    background:transparent;
    border:none;
    cursor:pointer;
    font-family:inherit;
    text-align:left;
    border-radius:8px;
    transition:background .12s ease;
  }
  .theme-opt:active { background:var(--drawer-row-active); }
  .theme-opt-label { font-size:14px; color:var(--drawer-text-faint); flex:1; }

  .apps-switch-row {
    display:flex;
    align-items:center;
    justify-content:space-between;
    width:100%;
    padding:11px 14px 11px 52px;
  }
  .apps-switch-label { font-size:14px; color:var(--drawer-text-faint); flex:1; }
  .switch-track {
    position:relative;
    width:46px;
    height:27px;
    border-radius:999px;
    border:none;
    background:var(--switch-off-bg);
    cursor:pointer;
    padding:0;
    flex-shrink:0;
    transition:background .2s ease;
  }
  .switch-track.switch-on { background:var(--switch-on-bg); }
  .switch-thumb {
    position:absolute;
    top:2px;
    left:2px;
    width:23px;
    height:23px;
    border-radius:50%;
    background:var(--switch-thumb-bg);
    box-shadow:0 1px 3px rgba(0,0,0,0.3);
    transition:transform .2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .switch-thumb.switch-thumb-on { transform:translateX(19px); }

  .drawer-logout {
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    margin:14px 14px 4px;
    padding:14px 16px;
    border-radius:999px;
    border:0.5px solid var(--border-soft);
    background:var(--logout-bg);
    cursor:pointer;
    font-family:inherit;
    flex-shrink:0;
    transition:background .18s ease, transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .drawer-logout:active { background:var(--logout-bg-active); transform:scale(0.97); }
  .drawer-logout-label {
    font-size:15px;
    font-weight:700;
    color:var(--logout-icon);
  }

  .pulse-tap {
    cursor:pointer;
    transition:transform .14s cubic-bezier(0.25,0.46,0.45,0.94), opacity .14s ease;
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
  .icon-mask {
    display:block;
    mask-size:contain;
    -webkit-mask-size:contain;
    mask-repeat:no-repeat;
    -webkit-mask-repeat:no-repeat;
    mask-position:center;
    -webkit-mask-position:center;
    flex-shrink:0;
  }
</style>