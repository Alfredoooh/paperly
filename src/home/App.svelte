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

  // Backgrounds
  let bgImages = [];
  try {
    const mods = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(mods);
  } catch(e) { bgImages = []; }

  // Dois layers para crossfade suave
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

  // Hora
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // Entrada dos elementos
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

  function openAI() {
    const a = ALL_APPS.find(x => x.id === 'ai');
    if (a) window.location.href = a.path;
  }

  function openApp(app) { window.location.href = app.path; }
</script>

<div class="root">

  <!-- BG LAYERS -->
  {#each layers as layer, i}
    <div
      class="bg-layer"
      class:bg-on={layer.visible}
      style="background-image:url('{layer.img}');"
    ></div>
  {/each}

  {#if !bgImages.length}
    <div class="bg-fallback"></div>
  {/if}

  <!-- SCRIM gradiente duplo -->
  <div class="scrim-top"></div>
  <div class="scrim-bottom"></div>

  <!-- HEADER -->
  <header class="header" class:in={mounted}>
    <div class="logo-row">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
      <span class="logo-text">Nexa</span>
    </div>
    <button class="avatar-pill" style="background:{avatarColor}" on:click={logout}>
      {userInitial}
    </button>
  </header>

  <!-- CONTENT -->
  <main class="content">

    <!-- GREETING -->
    <div class="greeting" class:in={mounted}>
      <p class="greeting-sub">{getGreeting()}</p>
      <h1 class="greeting-name">{userName.split(' ')[0]}</h1>
    </div>

    <!-- APPS -->
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
              {#if app.icon && !app.icon.endsWith('.svg')}
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

    <!-- QUOTE -->
    <div class="quote-block" class:in={mounted}>
      <p class="quote-text">"{todayQuote.text}"</p>
      <p class="quote-author">— {todayQuote.author}</p>
    </div>

  </main>

  <!-- BOTTOM -->
  <div class="bottom" class:in={mounted}>
    <button class="ai-bar" on:click={openAI}>
      <span class="ai-bar-text">Pergunta algo à IA…</span>
      <div class="ai-bar-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </div>
    </button>
  </div>

</div>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }

  /* BG */
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

  /* SCRIMS */
  .scrim-top {
    position: absolute; top: 0; left: 0; right: 0; height: 45%; z-index: 1;
    background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
    pointer-events: none;
  }
  .scrim-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 60%; z-index: 1;
    background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
    pointer-events: none;
  }

  /* HEADER */
  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 22px 10px;
    flex-shrink: 0;
    opacity: 0; transform: translateY(-10px);
    transition: opacity .5s ease, transform .5s ease;
  }
  .header.in { opacity: 1; transform: translateY(0); }

  .logo-row { display: flex; align-items: center; gap: 8px; }
  .logo-img  { width: 30px; height: 30px; border-radius: 9px; }
  .logo-text { font-size: 19px; font-weight: 700; color: #fff; letter-spacing: -.4px; }

  .avatar-pill {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 15px; font-weight: 700; color: #fff;
    cursor: pointer; transition: transform .15s, opacity .15s;
    flex-shrink: 0;
  }
  .avatar-pill:active { transform: scale(0.9); opacity: 0.8; }

  /* CONTENT */
  .content {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 8px;
    overflow: hidden;
  }

  /* GREETING */
  .greeting {
    padding: 0 24px 28px;
    opacity: 0; transform: translateY(16px);
    transition: opacity .55s .1s ease, transform .55s .1s ease;
  }
  .greeting.in { opacity: 1; transform: translateY(0); }
  .greeting-sub {
    font-size: 14px; font-weight: 400;
    color: rgba(255,255,255,0.55);
    letter-spacing: .02em;
    margin-bottom: 2px;
  }
  .greeting-name {
    font-size: 38px; font-weight: 800;
    color: #fff; letter-spacing: -1.2px;
    line-height: 1.05;
    text-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }

  /* APPS */
  .apps-wrap {
    opacity: 0; transform: translateY(20px);
    transition: opacity .55s .2s ease, transform .55s .2s ease;
  }
  .apps-wrap.in { opacity: 1; transform: translateY(0); }

  .apps-scroll {
    display: flex;
    gap: 6px;
    padding: 0 18px 28px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .apps-scroll::-webkit-scrollbar { display: none; }

  .app-item {
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    background: none; border: none; cursor: pointer;
    padding: 0 10px;
    flex-shrink: 0;
    opacity: 0; transform: translateY(12px) scale(0.9);
    transition: opacity .4s ease, transform .4s ease;
  }
  .app-item.app-in {
    opacity: 1; transform: translateY(0) scale(1);
  }
  .app-item:active .app-circle { transform: scale(0.88); }

  .app-circle {
    width: 58px; height: 58px; border-radius: 50%;
    background: rgba(255,255,255,0.14);
    border: 0.5px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s;
    overflow: hidden;
  }

  .app-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

  .app-svg-mask {
    display: block;
    width: 26px; height: 26px;
    background: rgba(255,255,255,0.9);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .app-name {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.82);
    white-space: nowrap;
    text-shadow: 0 1px 6px rgba(0,0,0,0.6);
  }

  /* QUOTE */
  .quote-block {
    padding: 0 26px 32px;
    opacity: 0; transform: translateY(12px);
    transition: opacity .55s .35s ease, transform .55s .35s ease;
  }
  .quote-block.in { opacity: 1; transform: translateY(0); }

  .quote-text {
    font-size: 13px; font-weight: 400;
    color: rgba(255,255,255,0.5);
    line-height: 1.6; font-style: italic;
    margin-bottom: 4px;
  }
  .quote-author {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.3);
    letter-spacing: .02em;
  }

  /* BOTTOM */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 22px);
    flex-shrink: 0;
    opacity: 0; transform: translateY(20px);
    transition: opacity .5s .45s ease, transform .5s .45s ease;
  }
  .bottom.in { opacity: 1; transform: translateY(0); }

  .ai-bar {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(255,255,255,0.12);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 0.5px solid rgba(255,255,255,0.18);
    border-radius: 22px;
    padding: 18px 20px;
    cursor: pointer;
    transition: background .2s, transform .15s;
    font-family: inherit;
  }
  .ai-bar:active { background: rgba(255,255,255,0.2); transform: scale(0.98); }

  .ai-bar-text {
    font-size: 16px; font-weight: 400;
    color: rgba(255,255,255,0.5);
  }
  .ai-bar-icon {
    width: 34px; height: 34px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.7);
    flex-shrink: 0;
  }
</style>