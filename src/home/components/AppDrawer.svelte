<!-- src/home/components/AppDrawer.svelte -->
<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';
  import { DRAWER_ITEMS } from '../lib/constants.js';

  export let drawerOpen = false;
  export let drawerPushed = false;
  export let rootEl = null;
  export let themeValue = 'dark';

  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let avatarUrl = '';

  export let showInstall = false;

  export let onClose;
  export let onApplyTheme;
  export let onLogout;
  export let onInstall;
  export let onOpenProfile = () => {};
  export let onOpenViaGesture = () => {};

  const dispatch = createEventDispatcher();

  let showLogoutDialog = false;
  let dialogVisible = false;

  const PUSH_TRANSLATE = -10;
  const PUSH_SCALE_MIN = 0.965;

  const slide = createSlideTransition({
    onSettleClosed: () => { onClose && closeSettled(); }
  });
  let slideX = 100;
  const unsubscribeSlide = slide.subscribe((v) => {
    slideX = v;
    applyRootPush(v);
  });

  function applyRootPush(x) {
    if (!rootEl) return;
    const openFraction = 1 - x / 100;
    const translate = PUSH_TRANSLATE * openFraction;
    const scale = 1 - (1 - PUSH_SCALE_MIN) * openFraction;
    rootEl.style.transform = `translate3d(${translate}%, 0, 0) scale(${scale})`;
  }

  let lastPushed = null;
  $: if (drawerPushed !== lastPushed) {
    lastPushed = drawerPushed;
    if (drawerPushed) slide.open();
    else slide.close();
  }

  function closeSettled() {
    if (rootEl) rootEl.style.transform = '';
  }

  function goProfile() { onOpenProfile(); }

  function goSettings() {
    onClose();
    dispatch('nav', { to: 'settings' });
  }

  function goHelp() {
    onClose();
    dispatch('nav', { to: 'help' });
  }

  function goOthers() {
    onClose();
  }

  function handleItemClick(item) {
    if (typeof item.action === 'function') item.action();
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

  const EDGE_ZONE = 24;
  const OPEN_THRESHOLD = 0.35;
  const CLOSE_THRESHOLD = 0.35;
  const VELOCITY_FLING = 0.55;

  let dragging = false;
  let dragStartX = 0;
  let dragStartTime = 0;
  let dragCurrentX = 0;
  let dragW = 300;
  let liveDragActive = false;
  let drawerEl;

  function getDrawerWidth() {
    if (drawerEl) return drawerEl.getBoundingClientRect().width;
    return window.innerWidth;
  }

  function onEdgeTouchStart(e) {
    if (drawerOpen) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    if (x < window.innerWidth - EDGE_ZONE) return;
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
      if (delta > 6 && !liveDragActive) return;
      if (delta >= -6) {
        if (!liveDragActive) {
          liveDragActive = true;
          document.documentElement.style.touchAction = 'none';
          onOpenLiveStart();
        }
        const progress = Math.min(1, Math.max(0, -delta / dragW));
        slide.setDragValue((1 - progress) * 100);
        e.preventDefault();
      }
    } else {
      if (delta < -6 && !liveDragActive) return;
      if (delta <= 6) return;
      if (!liveDragActive) {
        liveDragActive = true;
        document.documentElement.style.touchAction = 'none';
      }
      const progress = Math.min(1, Math.max(0, delta / dragW));
      slide.setDragValue(progress * 100);
      e.preventDefault();
    }
  }

  let liveOpenAnnounced = false;
  function onOpenLiveStart() {
    if (liveOpenAnnounced) return;
    liveOpenAnnounced = true;
    onOpenViaGesture('live');
  }

  function onDragEnd(e) {
    if (!dragging) return;
    dragging = false;
    document.documentElement.style.touchAction = '';
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const delta = dragCurrentX - dragStartX;
    const velocity = Math.abs(delta) / elapsed;

    if (!liveDragActive) {
      liveDragActive = false;
      return;
    }
    liveDragActive = false;
    liveOpenAnnounced = false;

    if (!drawerOpen) {
      const openedFraction = Math.min(1, Math.max(0, -delta / dragW));
      const shouldOpen = openedFraction > OPEN_THRESHOLD || (delta < 0 && velocity > VELOCITY_FLING);
      if (shouldOpen) {
        slide.releaseDragTo('open');
        onOpenViaGesture('commit');
      } else {
        slide.releaseDragTo('closed');
      }
    } else {
      const closedFraction = Math.min(1, Math.max(0, delta / dragW));
      const shouldClose = closedFraction > CLOSE_THRESHOLD || (delta > 0 && velocity > VELOCITY_FLING);
      if (shouldClose) {
        onClose();
      } else {
        slide.releaseDragTo('open');
      }
    }
  }

  function bindWindowTouchListeners(node) {
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

  onDestroy(() => {
    unsubscribeSlide();
    slide.destroy();
  });
</script>

<svelte:body use:bindWindowTouchListeners />

{#if drawerOpen}
  <div
    class="drawer-overlay"
    style="opacity:{1 - slideX / 100}"
    on:click={onClose}
  ></div>
  <div
    class="drawer"
    bind:this={drawerEl}
    style="transform: translate3d({slideX}%, 0, 0);"
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
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_download.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_download.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label" style="flex:1">Instalar app</span>
        </button>
      {/if}

      <div class="m3-group">
        <!-- 1º card: cantos superiores grandes (18px), inferiores pequenos (5px) -->
        <button class="m3-item m3-item-first pulse-tap" on:click={goHelp}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/info.svg');-webkit-mask-image:url('/icons/svg/regular/info.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label" style="flex:1">Ajuda</span>
        </button>

        <!-- 2º card: cantos todos pequenos (5px) -->
        <div class="m3-item m3-item-mid theme-section">
          <div class="theme-cards">
            <button
              class="theme-card"
              class:theme-card-active={themeValue === 'light'}
              on:click={() => onApplyTheme('light')}
              aria-label="Tema claro"
            >
              <div class="theme-preview theme-preview-light">
                <span class="theme-line" style="width:70%"></span>
                <span class="theme-line" style="width:85%"></span>
                <span class="theme-line" style="width:55%"></span>
              </div>
            </button>
            <button
              class="theme-card"
              class:theme-card-active={themeValue === 'system'}
              on:click={() => onApplyTheme('system')}
              aria-label="Tema automático"
            >
              <div class="theme-preview theme-preview-system">
                <div class="theme-preview-half theme-preview-half-light">
                  <span class="theme-line" style="width:70%"></span>
                  <span class="theme-line" style="width:55%"></span>
                </div>
                <div class="theme-preview-half theme-preview-half-dark">
                  <span class="theme-line theme-line-dark" style="width:70%"></span>
                  <span class="theme-line theme-line-dark" style="width:55%"></span>
                </div>
              </div>
            </button>
            <button
              class="theme-card"
              class:theme-card-active={themeValue === 'dark'}
              on:click={() => onApplyTheme('dark')}
              aria-label="Tema escuro"
            >
              <div class="theme-preview theme-preview-dark">
                <span class="theme-line theme-line-dark" style="width:70%"></span>
                <span class="theme-line theme-line-dark" style="width:85%"></span>
                <span class="theme-line theme-line-dark" style="width:55%"></span>
              </div>
            </button>
          </div>
        </div>

        <!-- 3º card: cantos superiores pequenos (5px), inferiores grandes (18px) -->
        <button class="m3-item m3-item-last pulse-tap" on:click={goOthers}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/more_horizontal.svg');-webkit-mask-image:url('/icons/svg/regular/more_horizontal.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label" style="flex:1">Outros</span>
        </button>
      </div>

      {#each DRAWER_ITEMS as item}
        <button class="drawer-item pulse-tap" on:click={() => handleItemClick(item)}>
          {#if item.icon}
            <span class="icon-mask" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}');width:20px;height:20px;background:var(--drawer-text)"></span>
          {/if}
          <span class="drawer-item-label" style="flex:1">{item.label}</span>
        </button>
      {/each}
    </nav>

    <div class="drawer-bottom-row">
      <button class="drawer-logout pulse-tap" on:click={openLogoutDialog}>
        <span class="drawer-logout-label">Terminar sessão</span>
      </button>
      <button class="drawer-settings-btn pulse-tap" on:click={goSettings} aria-label="Definições">
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/settings.svg');-webkit-mask-image:url('/icons/svg/regular/settings.svg');width:19px;height:19px;background:var(--drawer-text)"></span>
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
    background: var(--drawer-overlay-in);
    will-change: opacity;
  }
  .drawer {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 61;
    width: 86%;
    max-width: 340px;
    background: var(--drawer-bg-strong);
    box-shadow: -4px 0 24px rgba(0,0,0,0.22);
    display: flex;
    flex-direction: column;
    will-change: transform;
    contain: layout style paint;
    touch-action: pan-y;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .drawer-avatar-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 22px 20px 18px;
    flex-shrink: 0;
    background: transparent;
    border: none;
    width: 100%;
    cursor: pointer;
    font-family: inherit;
  }
  .drawer-avatar-block:active { opacity: .7; }
  .drawer-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
  }
  .drawer-avatar-img {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .drawer-user-name {
    font-size: 15px;
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
  .drawer-item:active { background: var(--drawer-row-active, var(--btn-bg)); }
  .drawer-item-label {
    font-size: 15px;
    font-weight: 400;
    color: var(--drawer-text);
  }

  /* ── Grupo M3 ────────────────────────────────────────────────────
     Pontas externas do grupo: 18px (grandes mas não exageradas).
     Junções internas entre os 3 cards: 5px (quase retas).
     Gap de 2px entre cada card — sem linha divisória, o espaçamento
     é a separação visual. Fundo a 55% para não ficar pesado.      */
  .m3-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 6px 8px 10px;
  }
  .m3-item {
    width: 100%;
    background: color-mix(in srgb, var(--btn-bg) 55%, transparent);
  }
  /* 1º card: superiores grandes (18px), inferiores pequenos (5px) */
  .m3-item-first {
    border-radius: 18px 18px 5px 5px;
  }
  /* card do meio: todos os cantos pequenos (5px) */
  .m3-item-mid {
    border-radius: 5px;
  }
  /* 3º card: superiores pequenos (5px), inferiores grandes (18px) */
  .m3-item-last {
    border-radius: 5px 5px 18px 18px;
  }
  button.m3-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 15px 16px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1);
  }
  button.m3-item:active {
    background: color-mix(in srgb, var(--btn-bg-active) 65%, transparent);
  }

  .theme-section {
    padding: 10px 12px;
  }
  .theme-cards {
    display: flex;
    gap: 8px;
  }
  .theme-card {
    flex: 1;
    aspect-ratio: 1 / 0.62;
    padding: 3px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    display: flex;
    transition: border-color .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .theme-card-active { border-color: #0A84FF; }
  .theme-preview {
    flex: 1;
    border-radius: 7px;
    border: 1px solid rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 0 7px;
    overflow: hidden;
    position: relative;
  }
  .theme-preview-light { background: #EDEDED; }
  .theme-preview-dark  { background: #1C1C1E; }
  .theme-line {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: #D9D9DE;
  }
  .theme-line-dark { background: #48484A; }

  .theme-preview-system {
    padding: 0;
    flex-direction: row;
  }
  .theme-preview-half {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 0 6px;
    position: relative;
  }
  .theme-preview-half-light {
    background: #EDEDED;
    clip-path: polygon(0 0, 100% 0, 78% 100%, 0% 100%);
    padding-right: 12px;
  }
  .theme-preview-half-dark {
    background: #1C1C1E;
    margin-left: -10px;
    clip-path: polygon(22% 0, 100% 0, 100% 100%, 0% 100%);
    padding-left: 14px;
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
    padding: 16px;
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
    background: rgba(0,0,0,0);
    transition: background .32s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .logout-overlay.logout-overlay-in { background: rgba(0,0,0,0.5); }
  .logout-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    background: var(--surface);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
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
  .logout-btn-confirm { background: #FF3B30; color: white; }
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
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .drawer-item, .theme-card, .drawer-logout, .drawer-settings-btn,
    .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .pulse-tap { transition: none !important; }
  }
</style>