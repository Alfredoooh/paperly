<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme, getThemeColors } from '$shared/theme.js';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';

  let isDark = false;
  let user   = null;

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

  // Backgrounds — carrega todos os ficheiros de static/images/backgrounds/
  // Como não podemos listar dinamicamente, usamos um glob via import.meta
  let bgImages = [];
  try {
    const modules = import.meta.glob('/static/images/backgrounds/*', { eager: true, as: 'url' });
    bgImages = Object.values(modules);
  } catch(e) {
    bgImages = [];
  }
  // Fallback: se o glob não retornar nada (runtime), tentamos caminhos convencionais
  // e deixamos o array vazio para mostrar um gradiente

  const QUOTES = [
    { text: 'A criatividade é a inteligência a divertir-se.', author: 'Albert Einstein' },
    { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
    { text: 'Não contes os dias. Faz com que os dias contem.', author: 'Muhammad Ali' },
    { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tzu' },
    { text: 'Acredita que podes e já estás a meio caminho.', author: 'Theodore Roosevelt' },
    { text: 'A vida é o que acontece enquanto estás ocupado a fazer outros planos.', author: 'John Lennon' },
    { text: 'Sê a mudança que queres ver no mundo.', author: 'Mahatma Gandhi' },
  ];

  // Quote do dia — baseado no dia do ano para ser consistente
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const todayQuote = QUOTES[dayOfYear % QUOTES.length];

  // Background rotativo
  let bgIndex  = 0;
  let bgVisible = true; // para crossfade
  let bgNext   = 1;

  function nextBg() {
    if (bgImages.length < 2) return;
    bgVisible = false;
    setTimeout(() => {
      bgIndex   = (bgIndex + 1) % bgImages.length;
      bgVisible = true;
    }, 600);
  }

  let bgTimer;

  onMount(() => {
    user = requireAuth();
    if (!user) return;
    // Tema NÃO é aplicado nesta tela — sempre escuro/imagem
    // mas gravamos para as outras telas usarem
    const t = getTheme();
    isDark = t === 'dark';
    // Não chamamos syncTheme aqui para não alterar o body

    if (bgImages.length > 1) {
      bgTimer = setInterval(nextBg, 5000);
    }
    return () => clearInterval(bgTimer);
  });

  function openApp(app) {
    window.location.href = app.path;
  }

  function openAI(query) {
    const aiApp = ALL_APPS.find(a => a.id === 'ai');
    if (!aiApp) return;
    if (query?.trim()) {
      sessionStorage.setItem('nexa_ai_prefill', query.trim());
    }
    window.location.href = aiApp.path;
  }

  function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    syncTheme(isDark);
  }

  function handleLogout() {
    logout();
  }

  let inputVal = '';

  function onInputKeydown(e) {
    if (e.key === 'Enter' && inputVal.trim()) {
      openAI(inputVal);
    }
  }

  // Greeting por hora
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }
</script>

<div class="root">

  <!-- BG IMAGES -->
  {#if bgImages.length > 0}
    <div
      class="bg-img"
      class:visible={bgVisible}
      style="background-image:url({bgImages[bgIndex]});"
    ></div>
  {:else}
    <!-- Fallback gradient quando não há imagens -->
    <div class="bg-gradient"></div>
  {/if}

  <!-- SCRIM -->
  <div class="scrim"></div>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <img src="/icons/png/logo.png" class="header-logo" alt="Nexa" />
      <span class="header-wordmark">Nexa</span>
    </div>
    <div class="header-right">
      <button class="hdr-btn" on:click={toggleTheme}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');background:rgba(255,255,255,0.85);width:20px;height:20px;"></span>
      </button>
      <button class="avatar-btn" style="background:{avatarColor}" on:click={handleLogout}>
        {userInitial}
      </button>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- GREETING + QUOTE -->
    <div class="greeting-block">
      <div class="greeting-line">{greeting()}, <span class="greeting-name">{userName.split(' ')[0]}</span></div>
      <div class="quote-text">"{todayQuote.text}"</div>
      <div class="quote-author">— {todayQuote.author}</div>
    </div>

    <!-- APPS GRID (só ícones, sem container) -->
    <div class="apps-grid">
      {#each platformApps as app}
        <button class="app-btn" on:click={() => openApp(app)}>
          <div class="app-icon-wrap">
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
    <div class="input-wrap" on:click={() => openAI(inputVal)}>
      <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <input
        class="ai-input"
        placeholder="Pergunta algo à IA…"
        bind:value={inputVal}
        on:focus|stopPropagation={() => openAI(inputVal)}
        on:keydown={onInputKeydown}
        readonly
      />
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
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

  /* BG */
  .bg-img {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    opacity: 0;
    transition: opacity .6s ease;
  }
  .bg-img.visible { opacity: 1; }
  .bg-gradient {
    position: absolute; inset: 0; z-index: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  }

  /* SCRIM — gradiente escuro em cima da imagem para legibilidade */
  .scrim {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.45) 0%,
      rgba(0,0,0,0.15) 40%,
      rgba(0,0,0,0.15) 60%,
      rgba(0,0,0,0.65) 100%
    );
  }

  /* HEADER */
  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 8px; }
  .header-logo { width: 28px; height: 28px; border-radius: 8px; }
  .header-wordmark { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -.3px; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .hdr-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity .15s;
  }
  .hdr-btn:active { opacity: 0.6; }
  .avatar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 14px; font-weight: 700; color: #fff;
    cursor: pointer; transition: opacity .15s;
  }
  .avatar-btn:active { opacity: 0.7; }

  /* BODY */
  .body {
    position: relative; z-index: 10;
    flex: 1; display: flex; flex-direction: column;
    justify-content: space-between;
    padding: 8px 0 0;
    overflow: hidden;
  }

  /* GREETING */
  .greeting-block { padding: 20px 24px 0; }
  .greeting-line { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -.5px; margin-bottom: 14px; }
  .greeting-name { color: rgba(255,255,255,0.75); }
  .quote-text {
    font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.7);
    line-height: 1.5; font-style: italic; margin-bottom: 4px;
  }
  .quote-author { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 500; }

  /* APPS GRID */
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 24px 20px 16px;
  }
  .app-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: transparent; border: none; cursor: pointer;
    padding: 8px 4px;
    transition: transform .15s, opacity .15s;
  }
  .app-btn:active { transform: scale(0.9); opacity: 0.7; }
  .app-icon-wrap {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  }
  .app-icon-svg { width: 26px; height: 26px; }
  .app-icon-img { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; }
  .app-label {
    font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.85);
    text-align: center; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; max-width: 64px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }

  /* BOTTOM BAR */
  .bottom-bar {
    position: relative; z-index: 10;
    padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 16px);
    flex-shrink: 0;
  }
  .input-wrap {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 14px 16px;
    border: 0.5px solid rgba(255,255,255,0.2);
    cursor: pointer;
    transition: background .15s;
  }
  .input-wrap:active { background: rgba(255,255,255,0.2); }
  .ai-input {
    flex: 1; background: transparent; border: none; outline: none;
    font-size: 15px; color: #fff; font-family: inherit;
    cursor: pointer;
  }
  .ai-input::placeholder { color: rgba(255,255,255,0.55); }
  .input-icon { flex-shrink: 0; }

  /* SVG MASK */
  .svg-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>