<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
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

  // Backgrounds via glob
  let bgImages = [];
  try {
    const modules = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(modules);
  } catch(e) {
    bgImages = [];
  }

  const QUOTES = [
    { text: 'A criatividade é a inteligência a divertir-se.', author: 'Albert Einstein' },
    { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
    { text: 'Não contes os dias. Faz com que os dias contem.', author: 'Muhammad Ali' },
    { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tzu' },
    { text: 'Acredita que podes e já estás a meio caminho.', author: 'Theodore Roosevelt' },
    { text: 'A vida é o que acontece enquanto estás ocupado a fazer outros planos.', author: 'John Lennon' },
    { text: 'Sê a mudança que queres ver no mundo.', author: 'Mahatma Gandhi' },
  ];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const todayQuote = QUOTES[dayOfYear % QUOTES.length];

  // Dois layers para crossfade perfeito
  let layerA = { index: 0, active: true  };
  let layerB = { index: 1, active: false };
  let useA   = true; // qual layer está "por cima" a entrar

  function nextBg() {
    if (bgImages.length < 2) return;
    if (useA) {
      // A está visível, B vai entrar com a próxima imagem
      layerB = { index: (layerA.index + 1) % bgImages.length, active: false };
      // tick para aplicar o index antes de animar
      setTimeout(() => { layerB = { ...layerB, active: true }; }, 20);
      // depois de entrar, A sai
      setTimeout(() => { layerA = { ...layerA, active: false }; useA = false; }, 1000);
    } else {
      layerA = { index: (layerB.index + 1) % bgImages.length, active: false };
      setTimeout(() => { layerA = { ...layerA, active: true }; }, 20);
      setTimeout(() => { layerB = { ...layerB, active: false }; useA = true; }, 1000);
    }
  }

  let bgTimer;

  onMount(() => {
    user = requireAuth();
    if (!user) return;
    const t = getTheme();
    localStorage.setItem('nexa_theme', t); // preserva para outras telas

    if (bgImages.length > 0) {
      layerA = { index: 0, active: true };
      layerB = { index: Math.min(1, bgImages.length - 1), active: false };
      useA = true;
      if (bgImages.length > 1) {
        bgTimer = setInterval(nextBg, 15000);
      }
    }

    return () => clearInterval(bgTimer);
  });

  function openApp(app) { window.location.href = app.path; }

  function openAI() {
    const aiApp = ALL_APPS.find(a => a.id === 'ai');
    if (aiApp) window.location.href = aiApp.path;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }
</script>

<div class="root">

  <!-- LAYER A -->
  {#if bgImages.length > 0}
    <div
      class="bg-layer"
      class:bg-visible={layerA.active}
      style="background-image:url({bgImages[layerA.index]});"
    ></div>
    <!-- LAYER B -->
    <div
      class="bg-layer"
      class:bg-visible={layerB.active}
      style="background-image:url({bgImages[layerB.index]});"
    ></div>
  {:else}
    <div class="bg-fallback"></div>
  {/if}

  <!-- SCRIM -->
  <div class="scrim"></div>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <img src="/icons/png/logo.png" class="header-logo" alt="Nexa" />
      <span class="header-wordmark">Nexa</span>
    </div>
    <button class="avatar-btn" style="background:{avatarColor}" on:click={logout}>
      {userInitial}
    </button>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- GREETING + QUOTE -->
    <div class="greeting-block">
      <div class="greeting-line">
        {greeting()}, <span class="greeting-name">{userName.split(' ')[0]}</span>
      </div>
      <div class="quote-text">"{todayQuote.text}"</div>
      <div class="quote-author">— {todayQuote.author}</div>
    </div>

    <!-- APPS — linha horizontal com scroll -->
    <div class="apps-row">
      {#each platformApps as app}
        <button class="app-btn" on:click={() => openApp(app)}>
          <div class="app-icon-circle">
            {#if app.icon.endsWith('.svg')}
              <span class="svg-mask app-icon-svg" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');background:#fff;"></span>
            {:else}
              <img src={app.icon} class="app-icon-img" alt={app.label} />
            {/if}
          </div>
          <span class="app-label">{app.label}</span>
        </button>
      {/each}
    </div>

  </div>

  <!-- BOTTOM INPUT -->
  <div class="bottom-bar">
    <div class="input-wrap" on:click={openAI} role="button" tabindex="0">
      <span class="input-placeholder">Pergunta algo à IA…</span>
    </div>
  </div>

</div>

<style>
  .root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }

  /* BG LAYERS */
  .bg-layer {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    opacity: 0;
    transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity;
  }
  .bg-layer.bg-visible { opacity: 1; }

  .bg-fallback {
    position: absolute; inset: 0; z-index: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  }

  /* SCRIM */
  .scrim {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.5)  0%,
      rgba(0,0,0,0.1)  35%,
      rgba(0,0,0,0.1)  55%,
      rgba(0,0,0,0.72) 100%
    );
  }

  /* HEADER */
  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 20px 12px;
    flex-shrink: 0;
  }
  .header-left  { display: flex; align-items: center; gap: 8px; }
  .header-logo  { width: 28px; height: 28px; border-radius: 8px; }
  .header-wordmark { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -.3px; }

  .avatar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 14px; font-weight: 700; color: #fff;
    cursor: pointer; transition: opacity .15s;
    flex-shrink: 0;
  }
  .avatar-btn:active { opacity: 0.7; }

  /* BODY */
  .body {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    padding: 12px 0 0;
  }

  /* GREETING */
  .greeting-block { padding: 16px 24px 0; }
  .greeting-line {
    font-size: 30px; font-weight: 800; color: #fff;
    letter-spacing: -.6px; margin-bottom: 16px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.4);
  }
  .greeting-name { color: rgba(255,255,255,0.7); }
  .quote-text {
    font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.65);
    line-height: 1.55; font-style: italic; margin-bottom: 5px;
    text-shadow: 0 1px 6px rgba(0,0,0,0.4);
  }
  .quote-author {
    font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500;
  }

  /* APPS ROW */
  .apps-row {
    display: flex; flex-direction: row;
    gap: 0;
    padding: 24px 12px 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .apps-row::-webkit-scrollbar { display: none; }

  .app-btn {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    background: transparent; border: none; cursor: pointer;
    padding: 0 12px;
    transition: transform .15s, opacity .15s;
    flex-shrink: 0;
  }
  .app-btn:active { transform: scale(0.88); opacity: 0.7; }

  .app-icon-circle {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 0.5px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  }

  .app-icon-svg { width: 26px; height: 26px; }
  .app-icon-img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }

  .app-label {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.88);
    text-align: center;
    white-space: nowrap;
    text-shadow: 0 1px 5px rgba(0,0,0,0.55);
    max-width: 64px;
    overflow: hidden; text-overflow: ellipsis;
  }

  /* BOTTOM */
  .bottom-bar {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 24px);
    flex-shrink: 0;
  }
  .input-wrap {
    display: flex; align-items: center;
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border-radius: 24px;
    padding: 20px 22px;
    border: 0.5px solid rgba(255,255,255,0.22);
    cursor: pointer;
    transition: background .2s;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  }
  .input-wrap:active { background: rgba(255,255,255,0.25); }
  .input-placeholder {
    font-size: 16px;
    color: rgba(255,255,255,0.55);
    font-family: inherit;
    user-select: none;
  }

  /* SVG MASK */
  .svg-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>