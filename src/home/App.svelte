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

  // Input — idêntico ao ChatPage
  let inputText = '';
  let textInputEl;
  let pendingAttachments = [];

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

  <!-- HEADER: só logo PNG maior, sem texto -->
  <header class="header" class:in={mounted}>
    <div class="logo-row">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-img" />
    </div>
    <button class="avatar-pill" style="background:{avatarColor}" on:click={logout}>
      {userInitial}
    </button>
  </header>

  <main class="content">

    <div class="greeting" class:in={mounted}>
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

    <div class="quote-block" class:in={mounted}>
      <p class="quote-text">"{todayQuote.text}"</p>
      <p class="quote-author">— {todayQuote.author}</p>
    </div>

  </main>

  <!-- BOTTOM BAR — pixel perfect igual ao ChatPage -->
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
        <!-- botão + igual ao ChatPage -->
        <button class="add-btn pulse-tap" on:click={() => {}}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:rgba(255,255,255,0.75)"></span>
        </button>
        <div class="flex1"></div>
        <!-- botão Apps igual ao ChatPage -->
        <button class="edit-btn pulse-tap">
          <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:20px;height:20px;background:rgba(255,255,255,0.85)"></span>
          <span class="edit-label">Apps</span>
        </button>
        <div style="width:8px"></div>
        <!-- send / mic igual ao ChatPage -->
        {#if inputText.trim()}
          <button class="send-btn pulse-tap" on:click={navigateToAI}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:#000"></span>
          </button>
        {:else}
          <button class="send-btn pulse-tap" on:click={() => {}}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:#000"></span>
          </button>
        {/if}
      </div>
    </div>
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

  .logo-row { display: flex; align-items: center; }

  /* Logo PNG maior, sem border-radius, sem texto */
  .logo-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  .avatar-pill {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 15px; font-weight: 700; color: #fff;
    cursor: pointer; transition: transform .15s, opacity .15s;
    flex-shrink: 0;
  }
  .avatar-pill:active { transform: scale(0.9); opacity: 0.8; }

  .content {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: flex-end;
    padding-bottom: 8px;
    overflow: hidden;
  }

  .greeting {
    padding: 0 24px 28px;
    opacity: 0; transform: translateY(16px);
    transition: opacity .55s .1s ease, transform .55s .1s ease;
  }
  .greeting.in { opacity: 1; transform: translateY(0); }
  .greeting-sub {
    font-size: 14px; font-weight: 400;
    color: rgba(255,255,255,0.55);
    letter-spacing: .02em; margin-bottom: 2px;
  }
  .greeting-name {
    font-size: 38px; font-weight: 800;
    color: #fff; letter-spacing: -1.2px; line-height: 1.05;
    text-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }

  .apps-wrap {
    opacity: 0; transform: translateY(20px);
    transition: opacity .55s .2s ease, transform .55s .2s ease;
  }
  .apps-wrap.in { opacity: 1; transform: translateY(0); }

  .apps-scroll {
    display: flex; gap: 6px;
    padding: 0 18px 28px;
    overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
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

  .quote-block {
    padding: 0 26px 32px;
    opacity: 0; transform: translateY(12px);
    transition: opacity .55s .35s ease, transform .55s .35s ease;
  }
  .quote-block.in { opacity: 1; transform: translateY(0); }
  .quote-text {
    font-size: 13px; font-weight: 400;
    color: rgba(255,255,255,0.5);
    line-height: 1.6; font-style: italic; margin-bottom: 4px;
  }
  .quote-author {
    font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.3); letter-spacing: .02em;
  }

  /* BOTTOM — igual ao ChatPage */
  .bottom {
    position: relative; z-index: 10;
    padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 22px);
    flex-shrink: 0;
    opacity: 0; transform: translateY(20px);
    transition: opacity .5s .45s ease, transform .5s .45s ease;
  }
  .bottom.in { opacity: 1; transform: translateY(0); }

  /* Mesmo fundo glass do ChatPage com blur */
  .bottom-bar {
    border-radius: 22px;
    background: rgba(255,255,255,0.12);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 0.5px solid rgba(255,255,255,0.18);
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0,0,0,0.30);
  }

  /* Textarea — cópia exacta do ChatPage */
  .chat-input {
    resize: none; outline: none; border: none;
    background: transparent;
    font-size: 15px; line-height: 1.5;
    padding: 12px 18px 0;
    width: 100%; font-family: inherit;
    color: #F3F4F6;
    max-height: 150px; overflow-y: auto;
    -webkit-user-select: text; user-select: text;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.5); }

  /* bb-row — cópia exacta do ChatPage */
  .bb-row {
    display: flex; align-items: center;
    height: 52px; padding: 0 10px;
  }
  .flex1 { flex: 1; }

  .add-btn {
    width: 40px; height: 40px; margin-left: 4px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none;
    background: rgba(255,255,255,0.14);
    cursor: pointer;
  }

  .edit-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 20px; border: none;
    background: rgba(255,255,255,0.14);
    cursor: pointer;
  }
  .edit-label {
    font-size: 14px; font-weight: 700;
    color: rgba(255,255,255,0.85);
  }

  .send-btn {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: none;
    background: rgba(255,255,255,0.9);
    cursor: pointer;
  }

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