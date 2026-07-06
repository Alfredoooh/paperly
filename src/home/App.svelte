<!-- src/routes/home/+page.svelte -->
<script>
  import { onMount, tick } from 'svelte';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';

  import { HERO_PHRASE, getAvatarColor } from './lib/constants.js';
  import AppHeader from './components/AppHeader.svelte';
  import HeroSection from './components/HeroSection.svelte';
  import SuggestionToggles from './components/SuggestionToggles.svelte';
  import SearchSuggestBox from './components/SearchSuggestBox.svelte';
  import RecordingCard from './components/RecordingCard.svelte';
  import BottomBar from './components/BottomBar.svelte';
  import ExtrasPopup from './components/ExtrasPopup.svelte';
  import AppsModelsPopup from './components/AppsModelsPopup.svelte';
  import AppDrawer from './components/AppDrawer.svelte';

  let user = null;
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: avatarColor = getAvatarColor(userName);

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  let themeValue = 'dark';
  let isDark = true;
  let mediaQuery;
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
    requestAnimationFrame(() => drawerVisible = true);
  }
  function closeDrawer() {
    drawerVisible = false;
    themeExpanded = false;
    appsExpanded = false;
    setTimeout(() => drawerOpen = false, 320);
  }
  function toggleThemeExpanded() {
    themeExpanded = !themeExpanded;
    if (themeExpanded) appsExpanded = false;
  }
  function toggleAppsExpanded() {
    appsExpanded = !appsExpanded;
    if (appsExpanded) themeExpanded = false;
  }
  function applyThemeFromDrawer(id) {
    applyThemeValue(id);
    themeExpanded = false;
  }
  function toggleAppsHidden() {
    // Preservado para compatibilidade visual, mas o tab de apps mostra a lista completa.
  }

  const POPUP_W = 230;
  let showPopup = false;
  let popupVisible = false;
  let popupMode = '';
  let popupPos = { bottom: 0, left: 0 };
  let popupFading = false;

  // Flash vem sempre ativo por padrão. Ao ativar Think More, Flash desativa-se
  // automaticamente (e vice-versa) — são mutuamente exclusivos.
  let flashMode = true;
  let thinkMoreMode = false;
  let sheetsEnabled = false;

  function toggleFlash() {
    flashMode = !flashMode;
    if (flashMode) thinkMoreMode = false;
  }
  function toggleThink() {
    thinkMoreMode = !thinkMoreMode;
    if (thinkMoreMode) flashMode = false;
  }
  function toggleSheets() {
    sheetsEnabled = !sheetsEnabled;
  }

  function openPopup(mode, event) {
    popupMode = mode;
    const rect = event.currentTarget.getBoundingClientRect();
    const M = 12;
    let left = rect.left - 8;
    if (left + POPUP_W > window.innerWidth - M) left = window.innerWidth - POPUP_W - M;
    if (left < M) left = M;
    popupPos = { bottom: window.innerHeight - rect.top + 8, left };
    showPopup = true;
    requestAnimationFrame(() => requestAnimationFrame(() => popupVisible = true));
  }
  function closePopup() {
    popupVisible = false;
    setTimeout(() => { showPopup = false; popupMode = ''; }, 240);
  }
  function switchPopup(mode) {
    popupFading = true;
    setTimeout(() => { popupMode = mode; popupFading = false; }, 130);
  }

  const APPS_POPUP_MARGIN_X = 10;
  const APPS_POPUP_MARGIN_BOTTOM = 10;
  let showAppsPopup = false;
  let appsPopupVisible = false;
  let appsPopupStyle = '';
  let modelsTab = 'docs';

  const APP_ROUTES = { HOME: '/', APPS: '/apps-models' };
  let currentRoute = typeof window !== 'undefined' && (window.location.pathname.replace(/\/$/, '') || '/') === APP_ROUTES.APPS ? 'apps-models' : 'home';

  function syncRouteFromLocation() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    currentRoute = path === APP_ROUTES.APPS ? 'apps-models' : 'home';
    showAppsPopup = currentRoute === 'apps-models';
    appsPopupVisible = showAppsPopup;
  }
  function navigate(path) {
    drawerOpen = false;
    drawerVisible = false;
    themeExpanded = false;
    appsExpanded = false;
    popupVisible = false;
    showPopup = false;
    popupMode = '';
    showAppsPopup = false;
    appsPopupVisible = false;
    if (window.location.pathname === path) {
      syncRouteFromLocation();
      return;
    }
    history.pushState({}, '', path);
    syncRouteFromLocation();
  }
  function openAppsPopup() {
    navigate(APP_ROUTES.APPS);
  }
  function closeAppsPopup() {
    navigate(APP_ROUTES.HOME);
  }

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch(e) {}
    }
    window.location.href = app.path;
  }
  function goToPlans() { window.location.href = '/plans'; }

  // Modelos de documentos e imagens: pré-preenchem o prompt e navegam para o chat AI.
  function selectDocModel(doc) {
    closeAppsPopup();
    inputText = doc.prompt;
    setTimeout(() => { navigateToAI(); }, 10);
  }
  function selectImageModel(img) {
    closeAppsPopup();
    inputText = img.prompt;
    setTimeout(() => { navigateToAI(); }, 10);
  }

  let lottieEl;
  let lottieInstance;
  let lottieFinished = false;
  let shouldPlayLottie = false;
  let togglesVisible = false;
  let mountToggles = false;

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

  let heroDisplayText = '';
  let heroTimer = null;
  let heroLocked = false;

  function runTypewriter() {
    if (heroLocked) return;
    clearTimeout(heroTimer);
    const full = HERO_PHRASE;
    let charIdx = 0;
    heroDisplayText = '';

    function typeStep() {
      if (charIdx <= full.length) {
        heroDisplayText = full.slice(0, charIdx);
        charIdx++;
        heroTimer = setTimeout(typeStep, 38);
      } else {
        heroLocked = true;
        heroTimer = null;
      }
    }
    typeStep();
  }

  let scrollRootEl;
  let scrollProgress = 0;

  let appbarHeight = 0;
  let topPanelEl;
  function measureAppbar() {
    if (topPanelEl) {
      appbarHeight = topPanelEl.getBoundingClientRect().height;
      if (scrollRootEl) scrollRootEl.style.setProperty('--appbar-h', appbarHeight + 'px');
    }
  }

  const BOTTOM_HIDE_DISTANCE = 180;
  let bottomHideProgress = 0;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  const HOME_SHAPES = Array.from({ length: 42 }, (_, i) => {
    const shapeTypes = ['dot', 'circle', 'square', 'triangle', 'diamond'];
    const palette = [
      'rgba(255, 92, 92, 0.26)',
      'rgba(255, 173, 51, 0.24)',
      'rgba(255, 228, 99, 0.20)',
      'rgba(86, 204, 242, 0.22)',
      'rgba(111, 207, 151, 0.24)',
      'rgba(167, 139, 250, 0.22)',
      'rgba(244, 114, 182, 0.20)',
      'rgba(148, 163, 184, 0.18)',
    ];
    const seed = i + 1;
    const rand = (n) => {
      const x = Math.sin(seed * (n + 1) * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      left: Math.round(rand(1) * 1000) / 10,
      top: Math.round(rand(2) * 1000) / 10,
      size: 3 + Math.round(rand(3) * 11),
      driftX: Math.round((rand(4) - 0.5) * 80),
      driftY: Math.round((rand(5) - 0.5) * 120),
      duration: 14 + Math.round(rand(6) * 18),
      delay: -Math.round(rand(7) * 1200) / 100,
      opacity: 0.08 + rand(8) * 0.18,
      shape: shapeTypes[i % shapeTypes.length],
      color: palette[i % palette.length],
      blur: rand(9) > 0.82 ? 1 : 0,
    };
  });

  let snapSettleTimer;
  function handleScroll() {
    if (!scrollRootEl) return;
    const max = scrollRootEl.scrollHeight - scrollRootEl.clientHeight;
    const st = scrollRootEl.scrollTop;
    scrollProgress = max > 0 ? Math.min(1, st / max) : 0;
    const raw = Math.min(1, Math.max(0, st / BOTTOM_HIDE_DISTANCE));
    bottomHideProgress = easeOutCubic(raw);

    clearTimeout(snapSettleTimer);
    snapSettleTimer = setTimeout(() => {
      if (!scrollRootEl) return;
      const pageH = scrollRootEl.clientHeight;
      const cur = scrollRootEl.scrollTop;
      const target = cur < pageH / 2 ? 0 : pageH;
      if (Math.abs(cur - target) > 1) {
        scrollRootEl.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 90);
  }

  let inputText = '';
  let textInputEl;
  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, 150) + 'px';
  }

  let pendingAttachments = [];
  function readFileAsDataUrl(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  async function addAttachment(file, kind) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      pendingAttachments = [...pendingAttachments, {
        kind,
        name: file.name,
        size: file.size,
        mime: file.type,
        dataUrl: kind === 'image' ? dataUrl : null,
        rawDataUrl: dataUrl,
      }];
    } catch (e) {}
  }
  function removeAttachment(i) {
    pendingAttachments = pendingAttachments.filter((_, idx) => idx !== i);
  }
  async function handleAddFile(e, kind) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    closePopup();
    await addAttachment(f, kind);
  }

  function navigateToAI() {
    const text = inputText.trim();
    if (!text && pendingAttachments.length === 0) return;
    const ai = ALL_APPS.find(x => x.id === 'ai');
    if (!ai) return;
    try {
      sessionStorage.setItem('nexa_pending_message', text);
      if (pendingAttachments.length) {
        sessionStorage.setItem('nexa_pending_attachments', JSON.stringify(pendingAttachments));
      } else {
        sessionStorage.removeItem('nexa_pending_attachments');
      }
    } catch(e) {}
    window.location.href = ai.path;
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const mob = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
      if (!mob && !e.shiftKey) {
        e.preventDefault();
        if (inputText.trim() || pendingAttachments.length) navigateToAI();
      }
    }
  }

  function handleInputFocus() { inputFocused = true; }
  function handleInputBlur() { inputFocused = false; }

  let showSuggestBox = false;
  let suggestLoading = false;
  let searchSuggestions = [];
  let suggestDebounce;
  let abortSuggest;
  let inputFocused = false;
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
      const res = await fetch(googleUrl, { signal: abortSuggest.signal, mode: 'cors', cache: 'no-store' });
      if (!res.ok) throw new Error('google suggest http ' + res.status);
      const data = await res.json();
      const raw = Array.isArray(data?.[1]) ? data[1] : [];
      if (inputText.trim() !== q) return;
      searchSuggestions = raw.filter(Boolean).slice(0, 6);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        try {
          const fallbackUrl = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
          const res2 = await fetch(fallbackUrl, { signal: abortSuggest.signal, mode: 'cors', cache: 'no-store' });
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

  function selectToggle(t) {
    if (!togglesShouldShow) return;
    activeToggle = activeToggle?.id === t.id ? null : t;
    if (activeToggle) {
      inputText = activeToggle.prompt;
      setTimeout(() => {
        autoResize();
        textInputEl?.focus();
        textInputEl?.setSelectionRange(inputText.length, inputText.length);
      }, 80);
    } else {
      inputText = '';
      setTimeout(autoResize, 10);
    }
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
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
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
          return Math.pow(sl.reduce((a,b)=>a+b,0)/Math.max(sl.length,1)/255,0.5);
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
    if (waveSource) { try { waveSource.disconnect(); } catch(e) {} waveSource = null; }
    if (waveCtx) { try { waveCtx.close(); } catch(e) {} waveCtx = null; }
    waveAnalyser = null;
  }

  let currentModelId = 'mistral-nemo';

  let activeToggle = null;
  $: if (!togglesShouldShow && activeToggle) activeToggle = null;
  $: contentPaddingBottom = 28;
  let justRegistered = false;

  let togglesShouldShow = false;
  $: togglesShouldShow = (lottieFinished || !shouldPlayLottie) && !inputText.trim() && !inputFocused;
  $: panelShouldShow = mountToggles ? togglesShouldShow : false;

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const saved = getTheme();
    applyThemeValue(localStorage.getItem('nexa_theme') || saved, false);

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);

    function onStorage(e) {
      if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue, false);
    }
    window.addEventListener('storage', onStorage);

    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    requestAnimationFrame(() => { mounted = true; measureAppbar(); });
    window.addEventListener('resize', measureAppbar);

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
      mountToggles = true;
      runTypewriter();
    }

    return () => {
      if (lottieInstance) lottieInstance.destroy();
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', measureAppbar);
      clearTimeout(suggestDebounce);
      clearTimeout(heroTimer);
      clearTimeout(snapSettleTimer);
      abortSuggest?.abort();
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
  });

  let mounted = false;
  $: if (mounted && topPanelEl) measureAppbar();
  $: if (lottieFinished && shouldPlayLottie && heroDisplayText === '' && !heroTimer) runTypewriter();
</script>

<div class="root">
  <div class="bg-layer" aria-hidden="true">
    <div class="bg-orb bg-orb-a"></div>
    <div class="bg-orb bg-orb-b"></div>
    <div class="bg-orb bg-orb-c"></div>
    <div class="bg-particles">
      {#each HOME_SHAPES as particle}
        <span
          class={`bg-particle ${particle.shape}`}
          style={`left:${particle.left}%; top:${particle.top}%; width:${particle.size}px; height:${particle.size}px; --size:${particle.size}; --dx:${particle.driftX}px; --dy:${particle.driftY}px; --dur:${particle.duration}s; --delay:${particle.delay}s; --tone:${particle.color}; --opacity:${particle.opacity}; --blur:${particle.blur};`}
        ></span>
      {/each}
    </div>
  </div>

  {#if currentRoute === 'apps-models'}
    <AppsModelsPopup
      {modelsTab}
      {platformApps}
      onClose={closeAppsPopup}
      onSelectDocModel={selectDocModel}
      onSelectImageModel={selectImageModel}
      onOpenApp={openApp}
    />
  {:else}
    <AppHeader {mounted} bind:topPanelEl onUpgrade={goToPlans} onOpenDrawer={openDrawer} />

    <div class="scroll-root" bind:this={scrollRootEl} on:scroll={handleScroll}>
      <div class="scroll-page">
        <div style="padding-bottom:{contentPaddingBottom}px; display:flex; flex-direction:column; flex:1;">
          <HeroSection
            {shouldPlayLottie}
            {lottieFinished}
            bind:lottieEl
            {heroDisplayText}
            {heroLocked}
          />
        </div>
      </div>
    </div>

    <SuggestionToggles
      {togglesVisible}
      {mountToggles}
      {avatarColor}
      {userInitial}
      {userName}
      onSelect={selectToggle}
    />

    <SearchSuggestBox
      {showSuggestBox}
      {suggestLoading}
      {searchSuggestions}
      onUse={useSuggestion}
      onFill={fillSuggestion}
    />

    {#if isRecording}
      <RecordingCard
        bind:recCanvasEl
        {recTimerStr}
        onCancel={cancelRecording}
        onStop={stopRecording}
      />
    {:else}
      <BottomBar
        {pendingAttachments}
        bind:inputText
        bind:textInputEl
        onAutoResize={autoResize}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onRemoveAttachment={removeAttachment}
        onOpenAddPopup={(e) => openPopup('add', e)}
        onOpenAppsPopup={openAppsPopup}
        onSend={sendMessage}
      />
    {/if}

    <div class="bottom {mounted ? 'in' : ''}" style="transform: translateY({bottomHideProgress * 18}px); pointer-events:{bottomHideProgress > 0.96 ? 'none' : 'auto'};">
      <div class="legal-row-plain">
        <button class="legal-link pulse-tap" on:click={() => window.location.href = '/legal/terms'}>Termos de Serviço</button>
        <span class="legal-dot">•</span>
        <button class="legal-link pulse-tap" on:click={() => window.location.href = '/legal/privacy'}>Política de Privacidade</button>
      </div>
    </div>

    <ExtrasPopup
      {showPopup}
      {popupVisible}
      {popupMode}
      {popupPos}
      {popupFading}
      {POPUP_W}
      {flashMode}
      {thinkMoreMode}
      {sheetsEnabled}
      onClose={closePopup}
      onSwitchPopup={switchPopup}
      onAddFile={handleAddFile}
      onToggleFlash={toggleFlash}
      onToggleThink={toggleThink}
      onToggleSheets={toggleSheets}
    />

    <AppDrawer
      {drawerOpen}
      {drawerVisible}
      bind:topPanelEl
      {avatarColor}
      {userInitial}
      {userName}
      onClose={closeDrawer}
      onToggleThemeExpanded={toggleThemeExpanded}
      onToggleAppsExpanded={toggleAppsExpanded}
      onApplyTheme={applyThemeFromDrawer}
      onToggleAppsHidden={toggleAppsHidden}
      onLogout={logout}
    />
  {/if}
</div>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  :global(html), :global(body) {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
  }
  :global([data-theme="dark"]) {
    --app-bg: #0F0F0F;
    --surface: #0F0F0F;
    --surface-strong: #0F0F0F;
    /* Tab "Apps & Utilitários": 5% menos escuro que o fundo base no modo escuro */
    --surface-apps-tab: #171717;
    --border-soft: rgba(255,255,255,0.12);
    --border-faint: rgba(255,255,255,0.09);
    --icon-strong: rgba(255,255,255,0.88);
    --icon-faint: rgba(255,255,255,0.30);
    --text-faint: rgba(255,255,255,0.38);
    --row-active: rgba(255,255,255,0.07);
    --btn-bg: rgba(255,255,255,0.10);
    --btn-bg-active: rgba(255,255,255,0.18);
    --hdr-seg-bg: rgba(255,255,255,0.08);
    --hdr-seg-active: rgba(255,255,255,0.16);
    --drawer-bg: #0F0F0F;
    --drawer-border: rgba(255,255,255,0.08);
    --drawer-shadow: rgba(0,0,0,0.45);
    --drawer-text: rgba(255,255,255,0.82);
    --drawer-text-faint: rgba(255,255,255,0.35);
    --drawer-sep: rgba(255,255,255,0.10);
    --drawer-overlay-in: rgba(0,0,0,0.35);
    --toggle-bg: #1a1a1a;
    --toggle-bg-act: #232323;
    --toggle-border: rgba(255,255,255,0.14);
    --toggle-border-act: rgba(255,255,255,0.32);
    --toggle-label: rgba(255,255,255,0.90);
    --upgrade-text: #6ea8ff;
    --logout-icon: #FF453A;
    --switch-off-bg: rgba(255,255,255,0.16);
    --switch-on-bg: #34C759;
    --switch-thumb-bg: #ffffff;
    --divider-color: rgba(255,255,255,0.10);
  }
  :global([data-theme="light"]) {
    --app-bg: #FFFFFF;
    --surface: #FFFFFF;
    --surface-strong: #FFFFFF;
    --surface-apps-tab: #FFFFFF;
    --border-soft: rgba(0,0,0,0.09);
    --border-faint: rgba(0,0,0,0.07);
    --icon-strong: rgba(20,20,20,0.85);
    --icon-faint: rgba(20,20,20,0.28);
    --text-faint: rgba(20,20,20,0.40);
    --row-active: rgba(0,0,0,0.05);
    --btn-bg: rgba(0,0,0,0.06);
    --btn-bg-active: rgba(0,0,0,0.11);
    --hdr-seg-bg: rgba(0,0,0,0.06);
    --hdr-seg-active: rgba(0,0,0,0.11);
    --drawer-bg: #ffffff;
    --drawer-border: rgba(0,0,0,0.07);
    --drawer-shadow: rgba(0,0,0,0.13);
    --drawer-text: #111111;
    --drawer-text-faint: rgba(0,0,0,0.30);
    --drawer-sep: rgba(0,0,0,0.09);
    --drawer-overlay-in: rgba(0,0,0,0.20);
    --toggle-bg: #ffffff;
    --toggle-bg-act: #f0f0f2;
    --toggle-border: rgba(0,0,0,0.10);
    --toggle-border-act: rgba(0,0,0,0.24);
    --toggle-label: rgba(20,20,20,0.85);
    --upgrade-text: #2f6fe0;
    --logout-icon: #E0342A;
    --switch-off-bg: rgba(0,0,0,0.14);
    --switch-on-bg: #34C759;
    --switch-thumb-bg: #ffffff;
    --divider-color: rgba(0,0,0,0.08);
  }

  .root {
    position:fixed;
    inset:0;
    overflow:hidden;
    overscroll-behavior:none;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    touch-action: pan-y;
  }
  .bg-layer { position:absolute; inset:0; z-index:0; background:var(--app-bg); overflow:hidden; }
  .bg-orb {
    position:absolute;
    border-radius:50%;
    filter: blur(18px);
    opacity:0.18;
    pointer-events:none;
    animation: orbFloat 16s ease-in-out infinite;
  }
  .bg-orb-a { width:180px; height:180px; left:-36px; top:12%; background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0)); }
  .bg-orb-b { width:220px; height:220px; right:-72px; top:28%; background:radial-gradient(circle at 30% 30%, rgba(90,150,255,0.11), rgba(90,150,255,0)); animation-delay:-4s; }
  .bg-orb-c { width:160px; height:160px; left:18%; bottom:-44px; background:radial-gradient(circle at 30% 30%, rgba(255,145,120,0.10), rgba(255,145,120,0)); animation-delay:-8s; }
  .bg-particles {
    position:absolute;
    inset:0;
    pointer-events:none;
    opacity:0.95;
  }
  .bg-particle {
    position:absolute;
    display:block;
    background:var(--tone);
    opacity:var(--opacity);
    filter: blur(calc(var(--blur) * 1px));
    animation: particleFloat var(--dur) linear infinite;
    animation-delay:var(--delay);
    will-change:transform, opacity;
  }
  .bg-particle.dot,
  .bg-particle.circle {
    border-radius:999px;
  }
  .bg-particle.square {
    border-radius:2px;
  }
  .bg-particle.diamond {
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    border-radius: 0;
  }
  .bg-particle.triangle {
    width:0 !important;
    height:0 !important;
    background:transparent;
    border-left:calc(var(--size, 8) * 0.5px) solid transparent;
    border-right:calc(var(--size, 8) * 0.5px) solid transparent;
    border-bottom:calc(var(--size, 8) * 0.9px) solid var(--tone);
    opacity:calc(var(--opacity) * 0.95);
    filter: blur(calc(var(--blur) * 1px));
  }
  @keyframes particleFloat {
    0%   { transform: translate3d(0,0,0) scale(0.96); }
    50%  { transform: translate3d(calc(var(--dx) * 0.5), calc(var(--dy) * -0.5), 0) scale(1.05); }
    100% { transform: translate3d(var(--dx), var(--dy), 0) scale(0.96); }
  }
  @keyframes orbFloat {
    0%, 100% { transform: translate3d(0,0,0) scale(1); }
    50% { transform: translate3d(0,-12px,0) scale(1.06); }
  }

  .scroll-root {
    position:absolute; inset:0; z-index:10;
    overflow-y:auto; overflow-x:hidden;
    scroll-snap-type:y mandatory;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior-y:contain;
    scroll-behavior:auto;
  }
  .scroll-page {
    min-height:100%;
    width:100%;
    scroll-snap-align:start;
    scroll-snap-stop:always;
    display:flex;
    flex-direction:column;
  }

  .bottom {
    position:fixed; bottom:0; left:0; right:0; z-index:20;
    padding-left:16px; padding-right:16px;
    padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px);
    opacity:0;
    transition:opacity .22s cubic-bezier(0.16,1,0.3,1), transform .12s cubic-bezier(0.16,1,0.3,1);
    will-change: transform, opacity;
  }
  .bottom.in { opacity:1; }

  .legal-row-plain {
    margin-top: 12px;
    display:flex; align-items:center; justify-content:center; gap:6px;
  }
  .legal-link {
    background:none; border:none; font-family:inherit; font-size:10.5px; font-weight:500;
    color:var(--text-faint); cursor:pointer; padding:2px 1px;
  }
  .legal-link:active { color:var(--icon-faint); }
  .legal-dot { font-size:10px; color:var(--text-faint); }

  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
</style>