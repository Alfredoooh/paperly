<!-- src/home/components/AppDrawer.svelte -->
<script>
  import { THEME_OPTIONS, DRAWER_ITEMS } from '../lib/constants.js';

  export let drawerOpen = false;
  export let drawerVisible = false;
  export let themeExpanded = false;
  export let themeValue = 'dark';

  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let avatarUrl = '';

  export let showInstall = false;

  export let onClose;
  export let onToggleThemeExpanded;
  export let onApplyTheme;
  export let onLogout;
  export let onInstall;

  let showLogoutDialog = false;

  function goProfile() {
    onClose();
    window.location.href = '/profile/';
  }

  function handleItemClick(item) {
    if (item.url) {
      window.location.href = item.url;
    } else if (typeof item.action === 'function') {
      item.action();
    }
    onClose();
  }

  function confirmLogout() {
    showLogoutDialog = false;
    onClose();
    if (onLogout) onLogout();
  }

  function cancelLogout() {
    showLogoutDialog = false;
  }

  // ------------------------------------------------------------------
  // Swipe gesture nativo (estilo Android Navigation Drawer):
  // 1) Arrastar a partir da borda DIREITA do ecrã (o drawer entra pela
  //    direita) abre o drawer seguindo o dedo 1:1.
  // 2) Com o drawer aberto, arrastar para a direita fecha-o, também
  //    seguindo o dedo 1:1, com "solta e decide" por threshold/velocidade.
  // 3) Nada de listeners globais permanentes: o listener de abertura só
  //    fica ativo quando o drawer está fechado, e vice-versa — para não
  //    conflitar com o scroll normal do resto da app.
  // ------------------------------------------------------------------
  const EDGE_ZONE = 24;       // px a partir da borda direita para iniciar o "abrir"
  const DRAWER_WIDTH_FRACTION = 0.82; // deve refletir min(288px, 82vw) do CSS
  const OPEN_THRESHOLD = 0.35;  // % arrastado para considerar "abrir" ao soltar
  const CLOSE_THRESHOLD = 0.35; // % arrastado para considerar "fechar" ao soltar
  const VELOCITY_FLING = 0.55;  // px/ms — acima disto, decide pela direção do gesto

  let dragging = false;
  let dragStartX = 0;
  let dragStartTime = 0;
  let dragCurrentX = 0;
  let dragW = 300;
  let liveDragActive = false; // true enquanto o dedo controla o drawer em tempo real
  let drawerEl;

  function getDrawerWidth() {
    if (drawerEl) return drawerEl.getBoundingClientRect().width;
    return Math.min(288, window.innerWidth * DRAWER_WIDTH_FRACTION);
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
        liveDragActive = true;
        if (!drawerVisible) {
          // ativa o drawer em modo "seguindo o dedo" sem a transição de entrada normal
          drawerVisible = true;
        }
        const progress = Math.min(1, Math.max(0, -delta / dragW));
        applyLiveTransform(1 - progress);
        e.preventDefault?.();
      }
    } else {
      // gesto de FECHAR: arrastar para a direita com o drawer aberto
      if (delta < -6 && !liveDragActive) return;
      if (delta <= 6) return;
      liveDragActive = true;
      const progress = Math.min(1, Math.max(0, delta / dragW));
      applyLiveTransform(progress);
      e.preventDefault?.();
    }
  }

  function applyLiveTransform(closedFraction) {
    // closedFraction: 0 = totalmente aberto, 1 = totalmente fechado
    if (!drawerEl) return;
    drawerEl.style.transition = 'none';
    drawerEl.style.transform = `translate3d(${closedFraction * 100}%, 0, 0)`;
    drawerEl.style.opacity = String(1 - closedFraction * 0.02);
  }

  function releaseLiveTransform() {
    if (!drawerEl) return;
    drawerEl.style.transition = '';
    drawerEl.style.transform = '';
    drawerEl.style.opacity = '';
  }

  function onDragEnd(e) {
    if (!dragging) return;
    dragging = false;
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

  async function openViaGesture() {
    drawerOpen = true;
    drawerVisible = false;
    await new Promise(r => requestAnimationFrame(r));
    requestAnimationFrame(() => drawerVisible = true);
  }
</script>

<svelte:window
  on:touchstart={drawerOpen ? undefined : onEdgeTouchStart}
  on:touchmove={dragging ? onDragMove : undefined}
  on:touchend={dragging ? onDragEnd : undefined}
  on:touchcancel={dragging ? onDragEnd : undefined}
/>

{#if drawerOpen}
  <div class="drawer-overlay" class:drawer-overlay-in={drawerVisible} on:click={onClose}></div>
  <div
    class="drawer"
    class:drawer-in={drawerVisible}
    bind:this={drawerEl}
    on:touchstart={onDrawerTouchStart}
  >
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

      <button class="drawer-item pulse-tap" on:click={onToggleThemeExpanded}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
        <span class="drawer-item-label" style="flex:1">Tema</span>
        <span class="icon-mask drawer-chevron" class:drawer-chevron-open={themeExpanded} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:14px;height:14px;background:var(--drawer-text-faint)"></span>
      </button>
      <div class="theme-accordion" class:theme-accordion-open={themeExpanded}>
        <div class="theme-accordion-inner">
          {#each THEME_OPTIONS as opt}
            <button class="theme-opt pulse-tap" on:click={() => onApplyTheme(opt.id)}>
              <span class="theme-opt-label" style={themeValue === opt.id ? 'color:var(--drawer-text);font-weight:600' : ''}>{opt.label}</span>
              {#if themeValue === opt.id}
                <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');width:14px;height:14px;background:var(--drawer-text);"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#each DRAWER_ITEMS as item}
        <button class="drawer-item pulse-tap" on:click={() => handleItemClick(item)}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label">{item.label}</span>
        </button>
      {/each}
    </nav>
    <button class="drawer-logout pulse-tap" on:click={() => showLogoutDialog = true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');width:18px;height:18px;background:var(--drawer-text)"></span>
      <span class="drawer-logout-label">Terminar sessão</span>
    </button>
  </div>
{/if}

{#if showLogoutDialog}
  <div class="logout-overlay" on:click={cancelLogout}></div>
  <div class="logout-dialog">
    <p class="logout-dialog-text">Tem a certeza que deseja terminar sessão?</p>
    <div class="logout-dialog-actions">
      <button class="logout-btn-cancel pulse-tap" on:click={cancelLogout}>Cancelar</button>
      <button class="logout-btn-confirm pulse-tap" on:click={confirmLogout}>Sair</button>
    </div>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: var(--drawer-overlay);
    opacity: 0;
    transition: background .32s cubic-bezier(0.2, 0, 0, 1);
    contain: strict;
  }
  .drawer-overlay.drawer-overlay-in {
    background: var(--drawer-overlay-in);
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 71;
    width: min(288px, 82vw);
    background: var(--drawer-bg);
    border-left: 0.5px solid var(--drawer-border);
    box-shadow: -12px 0 48px var(--drawer-shadow);
    display: flex;
    flex-direction: column;
    padding-top: max(env(safe-area-inset-top, 0px), 16px);
    overflow: hidden;
    transform: translate3d(100%, 0, 0);
    opacity: 1;
    /* curva estilo Material (decelerate/standard) — mais próxima do
       Android Navigation Drawer real do que a curva anterior */
    transition: transform .32s cubic-bezier(0.2, 0, 0, 1);
    touch-action: pan-y;
    will-change: transform, opacity;
    backface-visibility: hidden;
    contain: layout paint style;
  }
  .drawer.drawer-in {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
  .drawer-avatar-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 20px;
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
    transition: background .14s cubic-bezier(0.2, 0, 0, 1);
    width: 100%;
  }
  .drawer-item:active {
    background: var(--drawer-row-active);
  }
  .drawer-item-label {
    font-size: 15px;
    font-weight: 400;
    color: var(--drawer-text);
  }
  .drawer-chevron {
    transition: transform .3s cubic-bezier(0.2, 0, 0, 1);
  }
  .drawer-chevron-open {
    transform: rotate(90deg);
  }
  .theme-accordion {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows .3s cubic-bezier(0.2, 0, 0, 1);
  }
  .theme-accordion-open {
    grid-template-rows: 1fr;
  }
  .theme-accordion-inner {
    overflow: hidden;
    min-height: 0;
  }
  .theme-opt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 11px 14px 11px 52px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    border-radius: 8px;
    transition: background .14s cubic-bezier(0.2, 0, 0, 1);
  }
  .theme-opt:active {
    background: var(--drawer-row-active);
  }
  .theme-opt-label {
    font-size: 14px;
    color: var(--drawer-text-faint);
    flex: 1;
  }
  .drawer-logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 14px 14px 4px;
    padding: 14px 16px;
    border-radius: 999px;
    border: 0.5px solid var(--border-soft);
    background: var(--btn-bg);
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    transition: background .2s cubic-bezier(0.2, 0, 0, 1), transform .2s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  .logout-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(0, 0, 0, 0.5);
  }
  .logout-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 81;
    min-width: 280px;
    max-width: 90vw;
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
    padding: 10px 20px;
    border-radius: 999px;
    border: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  .logout-btn-cancel {
    background: var(--btn-bg);
    color: var(--text-primary);
  }
  .logout-btn-confirm {
    background: #FF3B30;
    color: white;
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
    transition: transform .16s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .16s cubic-bezier(0.2, 0, 0, 1);
  }
  .pulse-tap:active {
    transform: scale(0.96);
    opacity: .80;
  }
</style>