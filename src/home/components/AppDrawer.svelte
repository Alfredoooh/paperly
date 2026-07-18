<!-- src/home/components/AppDrawer.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { DRAWER_ITEMS } from '../lib/constants.js';

  export let drawerOpen = false;
  export let drawerVisible = false;
  export let drawerPushed = false; // bind bidirecional: controla o "empurrar" do ecrã por trás
  export let rootEl = null; // elemento .root do App.svelte, para animar o "empurrar" 1:1 durante o gesto
  export let themeValue = 'dark'; // 'light' | 'dark' | 'system'

  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let avatarUrl = '';

  export let showInstall = false;

  export let onClose;
  export let onApplyTheme;
  export let onLogout;
  export let onInstall;
  export let onOpenProfile = () => {}; // navegação interna, sem reload
  export let onOpenViaGesture = () => {}; // completa o ciclo de vida real quando o gesto abre o drawer

  const dispatch = createEventDispatcher();

  let showLogoutDialog = false;
  let dialogVisible = false; // controla a animação de entrada/saída do dialog

  const THEME_CARDS = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
    { id: 'system', label: 'Sistema' },
  ];

  // FIX (bug: clicar em perfil deixava o drawer/ecrã empurrado presos
  // a meio da animação enquanto o perfil já tinha navegado por cima):
  // Antes, esta função chamava onClose() (history.back(), assíncrono)
  // E onOpenProfile() (pushState, síncrono) no mesmo tick — as duas
  // disparavam por cima uma da outra, corrompendo a pilha de histórico.
  // Agora chama-se APENAS onOpenProfile(); é o App.svelte (via a
  // função openProfile) quem decide, de forma sequencial, fechar
  // primeiro o drawer (só se estiver aberto) e esperar o popstate REAL
  // do fecho antes de navegar — garantindo que o drawer fecha e o
  // ecrã "desempurra" por completo antes da tela de perfil aparecer.
  function goProfile() {
    onOpenProfile();
  }

  // Mesmo padrão usado no ProfilePage.svelte (dispatch('nav', {to:'settings'})),
  // para o App.svelte pai tratar a navegação exatamente da mesma forma.
  function goSettings() {
    onClose();
    dispatch('nav', { to: 'settings' });
  }

  function goHelp() {
    onClose();
    dispatch('nav', { to: 'help' });
  }

  function handleItemClick(item) {
    if (typeof item.action === 'function') {
      item.action();
    }
    onClose();
  }

  function openLogoutDialog() {
    showLogoutDialog = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { dialogVisible = true; }));
  }

  function confirmLogout() {
    dialogVisible = false;
    setTimeout(() => { showLogoutDialog = false; }, 260);
    onClose();
    if (onLogout) onLogout();
    if (window.AndroidSession) window.AndroidSession.onLogout();
  }

  function cancelLogout() {
    dialogVisible = false;
    setTimeout(() => { showLogoutDialog = false; }, 260);
  }

  // ------------------------------------------------------------------
  // Swipe gesture nativo (estilo Android Navigation Drawer):
  // 1) Arrastar a partir da borda DIREITA do ecrã (o drawer entra pela
  //    direita) abre o drawer seguindo o dedo 1:1 — incluindo o efeito
  //    de "empurrar" o ecrã por trás, também 1:1 com o gesto.
  // 2) Com o drawer aberto, arrastar para a direita fecha-o, também
  //    seguindo o dedo 1:1, com "solta e decide" por threshold/velocidade.
  // 3) Nada de listeners globais permanentes: o listener de abertura só
  //    fica ativo quando o drawer está fechado, e vice-versa — para não
  //    conflitar com o scroll normal do resto da app.
  // 4) touch-action + listeners não-passivos: sem isto, o WebView tenta
  //    decidir se o gesto é scroll/zoom nativo AO MESMO TEMPO que o teu
  //    handler corre, o que causa o atraso/engasgo entre o dedo e o
  //    drawer. Com touch-action:none no elemento e preventDefault() a
  //    valer (listener não-passivo), o browser entrega o gesto 100% ao
  //    teu JS desde o primeiro touchmove, sem competir por ele.
  // ------------------------------------------------------------------
  const EDGE_ZONE = 24;       // px a partir da borda direita para iniciar o "abrir"
  const DRAWER_WIDTH_FRACTION = 1; // drawer cobre 100% da largura do ecrã
  const OPEN_THRESHOLD = 0.35;  // % arrastado para considerar "abrir" ao soltar
  const CLOSE_THRESHOLD = 0.35; // % arrastado para considerar "fechar" ao soltar
  const VELOCITY_FLING = 0.55;  // px/ms — acima disto, decide pela direção do gesto

  // Amplitude do "empurrar" do ecrã de fundo, tem de refletir os
  // mesmos valores usados em .root.pushed-by-drawer no App.svelte.
  const PUSH_TRANSLATE = -10; // %
  const PUSH_SCALE_MIN = 0.965;

  let dragging = false;
  let dragStartX = 0;
  let dragStartTime = 0;
  let dragCurrentX = 0;
  let dragW = 300;
  let liveDragActive = false; // true enquanto o dedo controla o drawer em tempo real
  let drawerEl;

  function getDrawerWidth() {
    if (drawerEl) return drawerEl.getBoundingClientRect().width;
    return window.innerWidth * DRAWER_WIDTH_FRACTION;
  }

  function onEdgeTouchStart(e) {
    if (drawerOpen) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    if (x < window.innerWidth - EDGE_ZONE) return; // só a partir da borda direita
    dragging = true;
    liveDragActive = false;
    dragStartX = x;
    dragCurrentX = x;
    dragStartTime = performance.now();
    dragW = getDrawerWidth();
  }

  function onDrawerTouchStart(e) {
    if (!drawerOpen) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    dragging = true;
    liveDragActive = false;
    dragStartX = x;
    dragCurrentX = x;
    dragStartTime = performance.now();
    dragW = getDrawerWidth();
  }

  function onDragMove(e) {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    dragCurrentX = x;
    const delta = x - dragStartX;

    if (!drawerOpen) {
      // gesto de ABRIR: arrastar para a esquerda a partir da borda direita
      if (delta > 6 && !liveDragActive) return; // ainda não decidiu a direção
      if (delta >= -6) {
        if (!liveDragActive) {
          liveDragActive = true;
          document.documentElement.style.touchAction = 'none';
        }
        if (!drawerVisible) {
          // ativa o drawer em modo "seguindo o dedo" sem a transição de entrada normal
          drawerVisible = true;
          drawerPushed = true;
        }
        const progress = Math.min(1, Math.max(0, -delta / dragW));
        applyLiveTransform(1 - progress);
        e.preventDefault();
      }
    } else {
      // gesto de FECHAR: arrastar para a direita com o drawer aberto
      if (delta < -6 && !liveDragActive) return;
      if (delta <= 6) return;
      if (!liveDragActive) {
        liveDragActive = true;
        document.documentElement.style.touchAction = 'none';
      }
      const progress = Math.min(1, Math.max(0, delta / dragW));
      applyLiveTransform(progress);
      e.preventDefault();
    }
  }

  function applyLiveTransform(closedFraction) {
    // closedFraction: 0 = totalmente aberto, 1 = totalmente fechado
    if (drawerEl) {
      drawerEl.style.transition = 'none';
      drawerEl.style.transform = `translate3d(${closedFraction * 100}%, 0, 0)`;
    }
    // Ecrã de fundo acompanha o mesmo progresso, 1:1 com o dedo, para
    // que o "empurrar" pareça parte do mesmo gesto físico e não um
    // efeito a reagir com atraso.
    if (rootEl) {
      const openFraction = 1 - closedFraction;
      const translate = PUSH_TRANSLATE * openFraction;
      const scale = 1 - (1 - PUSH_SCALE_MIN) * openFraction;
      rootEl.style.transition = 'none';
      rootEl.style.transform = `translate3d(${translate}%, 0, 0) scale(${scale})`;
    }
  }

  function releaseLiveTransform() {
    if (drawerEl) {
      drawerEl.style.transition = '';
      drawerEl.style.transform = '';
    }
    if (rootEl) {
      rootEl.style.transition = '';
      rootEl.style.transform = '';
    }
  }

  function onDragEnd(e) {
    if (!dragging) return;
    dragging = false;
    document.documentElement.style.touchAction = '';
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const delta = dragCurrentX - dragStartX;
    const velocity = Math.abs(delta) / elapsed; // px/ms

    if (!liveDragActive) {
      liveDragActive = false;
      return;
    }
    liveDragActive = false;

    if (!drawerOpen) {
      // estava a tentar abrir
      const openedFraction = Math.min(1, Math.max(0, -delta / dragW));
      const shouldOpen = openedFraction > OPEN_THRESHOLD || (delta < 0 && velocity > VELOCITY_FLING);
      releaseLiveTransform();
      if (shouldOpen) {
        openViaGesture();
      } else {
        drawerVisible = false;
        drawerPushed = false;
      }
    } else {
      // estava a tentar fechar
      const closedFraction = Math.min(1, Math.max(0, delta / dragW));
      const shouldClose = closedFraction > CLOSE_THRESHOLD || (delta > 0 && velocity > VELOCITY_FLING);
      releaseLiveTransform();
      if (shouldClose) {
        onClose();
      }
    }
  }

  function openViaGesture() {
    // O gesto já moveu drawerVisible/drawerPushed para dar resposta
    // imediata ao dedo, mas isto sozinho NUNCA monta {#if drawerOpen}
    // nem empurra histórico — o drawer ficava "visualmente aberto" só
    // enquanto o transform inline do arrasto durava, sem estado real
    // por trás, sem history.state.nexaDrawer. É por isto que o gesto
    // parecia bugado: o listener de "abrir" nunca se desligava (porque
    // drawerOpen continuava false) e competia com o de "fechar" no
    // frame seguinte, e o botão físico de voltar não fechava nada.
    //
    // onOpenViaGesture (vindo de home/App.svelte) completa o ciclo de
    // vida real — monta drawerOpen=true e empurra história — sem
    // repetir a animação de entrada, porque o dedo já fez esse trabalho
    // visualmente.
    onOpenViaGesture();
  }

  function bindWindowTouchListeners(node) {
    // svelte:window não permite passar { passive:false } por sintaxe;
    // sem isso, touchmove é tratado como passivo pelo browser e
    // e.preventDefault() é ignorado silenciosamente — o WebView então
    // tenta fazer scroll nativo AO MESMO TEMPO que o teu JS processa o
    // gesto, o que é a causa do atraso/engasgo entre o dedo e o drawer.
    const opts = { passive: false };
    const ts = (e) => { if (!drawerOpen) onEdgeTouchStart(e); };
    const tm = (e) => { if (dragging) onDragMove(e); };
    const te = (e) => { if (dragging) onDragEnd(e); };
    node.addEventListener('touchstart', ts, opts);
    node.addEventListener('touchmove', tm, opts);
    node.addEventListener('touchend', te, opts);
    node.addEventListener('touchcancel', te, opts);
    return {
      destroy() {
        node.removeEventListener('touchstart', ts, opts);
        node.removeEventListener('touchmove', tm, opts);
        node.removeEventListener('touchend', te, opts);
        node.removeEventListener('touchcancel', te, opts);
      }
    };
  }
</script>

<svelte:body use:bindWindowTouchListeners />

{#if drawerOpen}
  <div class="drawer-overlay" class:drawer-overlay-in={drawerVisible} on:click={onClose}></div>
  <div
    class="drawer"
    class:drawer-in={drawerVisible}
    bind:this={drawerEl}
    on:touchstart={onDrawerTouchStart}
  >
    <div class="drawer-topbar">
      <button class="drawer-help-btn pulse-tap" on:click={goHelp} aria-label="Ajuda">
        <span class="icon-mask" style="mask-image:url('/icons/svg/help.svg');-webkit-mask-image:url('/icons/svg/help.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
      </button>
    </div>

    <button class="drawer-avatar-block pulse-tap" on:click={goProfile}>
      {#if avatarUrl}
        <img src={avatarUrl} alt={userName} class="drawer-avatar-img" />
      {:else}
        <div class="drawer-avatar" style="background:{avatarColor}">{userInitial}</div>
      {/if}
      <span class="drawer-user-name">{userName}</span>
    </button>
    <div class="drawer-sep"></div>
    <nav class="drawer-nav">
      {#if showInstall}
        <button class="drawer-item pulse-tap" on:click={onInstall}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/download.svg');-webkit-mask-image:url('/icons/svg/download.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label" style="flex:1">Instalar app</span>
        </button>
      {/if}

      <div class="theme-section">
        <span class="theme-section-label">Tema</span>
        <div class="theme-cards">
          <button
            class="theme-card pulse-tap theme-card-light"
            class:theme-card-active={themeValue === 'light'}
            on:click={() => onApplyTheme('light')}
          >
            <span class="theme-swatch theme-swatch-light"></span>
            <span class="theme-card-label">Claro</span>
          </button>
          <button
            class="theme-card pulse-tap theme-card-dark"
            class:theme-card-active={themeValue === 'dark'}
            on:click={() => onApplyTheme('dark')}
          >
            <span class="theme-swatch theme-swatch-dark"></span>
            <span class="theme-card-label">Escuro</span>
          </button>
          <button
            class="theme-card pulse-tap theme-card-system"
            class:theme-card-active={themeValue === 'system'}
            on:click={() => onApplyTheme('system')}
          >
            <span class="theme-swatch theme-swatch-system"></span>
            <span class="theme-card-label">Sistema</span>
          </button>
        </div>
      </div>

      {#each DRAWER_ITEMS as item}
        <button class="drawer-item pulse-tap" on:click={() => handleItemClick(item)}>
          <span class="drawer-item-label" style="flex:1">{item.label}</span>
        </button>
      {/each}
    </nav>

    <div class="drawer-bottom-row">
      <button class="drawer-logout pulse-tap" on:click={openLogoutDialog}>
        <span class="drawer-logout-label">Terminar sessão</span>
      </button>
      <button class="drawer-settings-btn pulse-tap" on:click={goSettings} aria-label="Definições">
        <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');width:19px;height:19px;background:var(--drawer-text)"></span>
      </button>
    </div>
  </div>
{/if}

{#if showLogoutDialog}
  <div class="logout-overlay" class:logout-overlay-in={dialogVisible} on:click={cancelLogout}>
    <div class="logout-dialog" class:logout-dialog-in={dialogVisible} on:click|stopPropagation>
      <p class="logout-dialog-text">Tens a certeza que queres terminar sessão?</p>
      <div class="logout-dialog-actions">
        <button class="logout-btn-cancel pulse-tap" on:click={cancelLogout}>Cancelar</button>
        <button class="logout-btn-confirm pulse-tap" on:click={confirmLogout}>Terminar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(0,0,0,0);
    transition: background .32s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .drawer-overlay.drawer-overlay-in {
    background: var(--drawer-overlay-in);
  }
  .drawer {
    position: fixed;
    inset: 0;
    z-index: 61;
    width: 100%;
    background: var(--drawer-bg);
    border-left: none;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    transform: translate3d(100%, 0, 0);
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
    contain: layout style paint;
    touch-action: pan-y;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .drawer.drawer-in {
    transform: translate3d(0, 0, 0);
  }

  .drawer-topbar {
    display: flex;
    justify-content: flex-end;
    padding: 10px 14px 0;
    flex-shrink: 0;
  }
  .drawer-help-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--drawer-row-active, var(--btn-bg));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .drawer-avatar-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 10px 20px 18px;
    flex-shrink: 0;
    background: transparent;
    border: none;
    width: 100%;
    cursor: pointer;
    font-family: inherit;
  }
  .drawer-avatar-block:active {
    opacity: .7;
  }
  .drawer-avatar {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }
  .drawer-avatar-img {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .drawer-user-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .drawer-sep {
    height: 0.5px;
    background: var(--drawer-sep);
    margin: 0 14px;
    flex-shrink: 0;
  }
  .drawer-nav {
    display: flex;
    flex-direction: column;
    padding: 8px 6px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    flex: 1;
  }
  .drawer-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 13px 14px;
    border-radius: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1);
    width: 100%;
  }
  .drawer-item:active {
    background: var(--drawer-row-active, var(--btn-bg));
  }
  .drawer-item-label {
    font-size: 15px;
    font-weight: 400;
    color: var(--drawer-text);
  }

  /* ── Tema: 3 cards horizontais, maiores, com um "swatch" (miniatura)
     em cima do label. Swatch claro = branco sólido; escuro = escuro
     sólido; sistema = dividido ao meio por uma linha inclinada,
     metade branco / metade escuro. Ativo = borda azul. ── */
  .theme-section {
    padding: 10px 14px 14px;
  }
  .theme-section-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--drawer-text-faint);
    padding: 4px 4px 10px;
  }
  .theme-cards {
    display: flex;
    gap: 10px;
  }
  .theme-card {
    flex: 1;
    padding: 10px;
    border-radius: 18px;
    border: 2px solid var(--drawer-sep);
    background: var(--drawer-row-active, var(--btn-bg));
    cursor: pointer;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: border-color .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .theme-card-active {
    border-color: #0A84FF;
  }
  .theme-swatch {
    width: 100%;
    height: 56px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .theme-swatch-light {
    background: #FFFFFF;
  }
  .theme-swatch-dark {
    background: #1C1C1E;
  }
  .theme-swatch-system {
    background: linear-gradient(
      115deg,
      #FFFFFF 0%,
      #FFFFFF 47%,
      #1C1C1E 53%,
      #1C1C1E 100%
    );
  }
  .theme-card-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--drawer-text);
  }

  .drawer-bottom-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
    flex-shrink: 0;
  }
  .drawer-logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 16px;
    border-radius: 999px;
    border: 0.5px solid var(--border-soft);
    background: var(--btn-bg);
    cursor: pointer;
    font-family: inherit;
    flex: 1;
    transition: background .24s cubic-bezier(0.32, 0.72, 0, 1), transform .24s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .drawer-logout:active {
    background: var(--btn-bg-active);
    transform: scale(0.96);
  }
  .drawer-logout-label {
    font-size: 15px;
    font-weight: 700;
    color: var(--logout-icon);
  }
  .drawer-settings-btn {
    flex-shrink: 0;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 0.5px solid var(--border-soft);
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .24s cubic-bezier(0.32, 0.72, 0, 1), transform .24s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .drawer-settings-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.9);
  }

  .logout-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(0, 0, 0, 0);
    transition: background .32s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .logout-overlay.logout-overlay-in {
    background: rgba(0, 0, 0, 0.5);
  }
  .logout-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    background: var(--surface);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 81;
    min-width: 280px;
    max-width: 90vw;
    transition: transform .38s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .28s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .logout-dialog.logout-dialog-in {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  .logout-dialog-text {
    font-size: 16px;
    color: var(--text-primary);
    margin: 0 0 20px;
    text-align: center;
    font-family: inherit;
  }
  .logout-dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
  .logout-btn-cancel,
  .logout-btn-confirm {
    flex: 1;
    padding: 12px 20px;
    border-radius: 999px;
    border: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    transition: background .2s cubic-bezier(0.32, 0.72, 0, 1), transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel {
    background: var(--btn-bg);
    color: var(--text-primary);
  }
  .logout-btn-cancel:active {
    background: var(--btn-bg-active);
    transform: scale(0.96);
  }
  .logout-btn-confirm {
    background: #FF3B30;
    color: white;
  }
  .logout-btn-confirm:active {
    background: #E0342A;
    transform: scale(0.96);
  }
  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
  }
  .pulse-tap {
    cursor: pointer;
    transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .18s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .pulse-tap:active {
    transform: scale(0.96);
    opacity: .80;
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer-overlay,
    .drawer,
    .drawer-item,
    .theme-card,
    .drawer-logout,
    .drawer-settings-btn,
    .logout-overlay,
    .logout-dialog,
    .logout-btn-cancel,
    .logout-btn-confirm,
    .pulse-tap {
      transition: none !important;
    }
  }
</style>