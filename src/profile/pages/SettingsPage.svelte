<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';
  import { logout } from '$shared/auth-guard.js';
  import { AuthApiService } from '$shared/api.js';
  import { AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { setLanguage } from '$shared/i18n.js';
  import { showToast } from '$shared/utils.js';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let slideX = 100;
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    back: `${FLUENT_BASE}/arrow_left_24_regular.svg`,
    checkmark: `${FLUENT_BASE}/checkmark_24_regular.svg`,
    chevron: `${FLUENT_BASE}/chevron_right_20_regular.svg`,
    shield: `${FLUENT_BASE}/shield_24_color.svg`,
    bell: `${FLUENT_BASE}/alert_24_color.svg`,
    storage: `${FLUENT_BASE}/database_24_color.svg`,
    globe: `${FLUENT_BASE}/globe_24_color.svg`,
    help: `${FLUENT_BASE}/question_circle_24_color.svg`,
    info: `${FLUENT_BASE}/info_24_color.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
  };

  const EDGE_ZONE = 24;
  const CLOSE_THRESHOLD = 0.32;
  const VELOCITY_FLING = 0.5;
  let dragging = false;
  let dragLiveActive = false;
  let dragStartX = 0;
  let dragCurrentX = 0;
  let dragStartTime = 0;
  let dragW = 360;
  let rootEl;
  let liveOverrideX = null;

  function onEdgeTouchStart(e) {
    const x = e.touches[0].clientX;
    if (x > EDGE_ZONE) return;
    dragging = true;
    dragLiveActive = false;
    dragStartX = x;
    dragCurrentX = x;
    dragStartTime = performance.now();
    dragW = window.innerWidth || 360;
  }
  function onEdgeTouchMove(e) {
    if (!dragging) return;
    const x = e.touches[0].clientX;
    dragCurrentX = x;
    const delta = x - dragStartX;
    if (delta <= 4) return;
    if (!dragLiveActive) dragLiveActive = true;
    const progress = Math.min(1, Math.max(0, delta / dragW));
    liveOverrideX = progress * 100;
    e.preventDefault();
  }
  function onEdgeTouchEnd() {
    if (!dragging) return;
    dragging = false;
    if (!dragLiveActive) { dragLiveActive = false; liveOverrideX = null; return; }
    dragLiveActive = false;
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const delta = dragCurrentX - dragStartX;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / dragW));
    const shouldClose = draggedFraction > CLOSE_THRESHOLD || (delta > 0 && velocity > VELOCITY_FLING);
    liveOverrideX = null;
    if (shouldClose) {
      dispatch('nav', { to: 'main' });
    }
  }

  $: displayX = liveOverrideX !== null ? liveOverrideX : slideX;

  let themeValue = getTheme();
  let currentLang = user?.preferences?.language || 'pt';

  $: currentLangLabel = AVAILABLE_LANGUAGES.find(l => l.code === currentLang)?.native || 'Português (Portugal)';

  const THEME_OPTIONS = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
    { id: 'system', label: 'Sistema' },
  ];

  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'settings', data: { isDark: dark } });
  }

  const langSlide = createSlideTransition({});
  let langSheetY = 100;
  const unsubscribeLangSlide = langSlide.subscribe((v) => { langSheetY = v; });
  let showLangSheet = false;
  let langOverlayVisible = false;

  function openLangSheet() {
    showLangSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      langOverlayVisible = true;
      langSlide.open();
    }));
  }
  function closeLangSheet() {
    langOverlayVisible = false;
    langSlide.close();
    setTimeout(() => { showLangSheet = false; }, 300);
  }
  function selectLang(code) {
    currentLang = code;
    setLanguage(code);
    closeLangSheet();
    showToast('Idioma atualizado');
  }

  let showFieldModal = false;
  let fieldModalVisible = false;
  let fieldModalTitle = '';

  function openPlaceholderModal(title) {
    fieldModalTitle = title;
    showFieldModal = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { fieldModalVisible = true; }));
  }
  function closeFieldModal() {
    fieldModalVisible = false;
    setTimeout(() => { showFieldModal = false; }, 240);
  }

  let showLogoutDialog = false;
  let logoutDialogVisible = false;
  let logoutMode = 'single';

  function openLogoutDialog(mode) {
    logoutMode = mode;
    showLogoutDialog = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { logoutDialogVisible = true; }));
  }
  function cancelLogoutDialog() {
    logoutDialogVisible = false;
    setTimeout(() => { showLogoutDialog = false; }, 260);
  }

  let loggingOut = false;
  async function confirmLogout() {
    loggingOut = true;
    try {
      if (logoutMode === 'all' && user?.token && AuthApiService.logoutAll) {
        const ok = await AuthApiService.logoutAll(user.token);
        showToast(ok ? 'Sessões terminadas em todos os dispositivos' : 'Não foi possível terminar as outras sessões');
        if (!ok) { loggingOut = false; cancelLogoutDialog(); return; }
      }
      logoutDialogVisible = false;
      setTimeout(() => { showLogoutDialog = false; }, 260);
      logout();
    } finally {
      loggingOut = false;
    }
  }

  function makeSheetDrag(slideCtrl, getHeight, onClose) {
    let dragging = false, liveActive = false;
    let startY = 0, currentY = 0, startTime = 0, sheetH = 400;
    return {
      touchstart(e) {
        dragging = true;
        liveActive = false;
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = performance.now();
        sheetH = getHeight();
      },
      touchmove(e) {
        if (!dragging) return;
        const y = e.touches[0].clientY;
        currentY = y;
        const delta = y - startY;
        if (delta <= 4) return;
        if (!liveActive) liveActive = true;
        const progress = Math.min(1, Math.max(0, delta / sheetH));
        slideCtrl.setDragValue(progress * 100);
        e.preventDefault();
      },
      touchend() {
        if (!dragging) return;
        dragging = false;
        if (!liveActive) { liveActive = false; return; }
        liveActive = false;
        const elapsed = Math.max(1, performance.now() - startTime);
        const delta = currentY - startY;
        const velocity = Math.abs(delta) / elapsed;
        const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
        const shouldClose = draggedFraction > 0.3 || (delta > 0 && velocity > 0.5);
        if (shouldClose) onClose();
        else slideCtrl.releaseDragTo('open');
      },
    };
  }

  let langSheetEl;
  const langDrag = makeSheetDrag(langSlide, () => langSheetEl ? langSheetEl.getBoundingClientRect().height : 400, closeLangSheet);

  onDestroy(() => {
    unsubscribeLangSlide?.();
    langSlide.destroy();
  });
</script>

<svelte:window on:touchstart={onEdgeTouchStart} on:touchmove|nonpassive={onEdgeTouchMove} on:touchend={onEdgeTouchEnd} on:touchcancel={onEdgeTouchEnd} />

<div class="st-root" bind:this={rootEl} style="background:{c.background}; transform: translate3d({displayX}%, 0, 0);">
  <div class="st-header">
    <button class="st-back-btn" on:click={() => dispatch('nav', { to: 'main' })} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{ICON.back}');-webkit-mask-image:url('{ICON.back}');background:{c.iconTint};width:24px;height:24px"></span>
    </button>
    <span class="st-header-title" style="color:{c.textPrimary}">Definições</span>
    <div style="width:36px"></div>
  </div>

  <div class="st-body">

    <div class="st-group">
      <div class="st-theme-tabs" style="background:{c.appbarBtnBg}">
        {#each THEME_OPTIONS as opt}
          <button
            class="st-theme-tab"
            class:st-theme-tab-active={themeValue === opt.id}
            style={themeValue === opt.id ? `background:${c.background};color:${c.textPrimary}` : `color:${c.textSecondary}`}
            on:click={() => setThemeValue(opt.id)}
          >{opt.label}</button>
        {/each}
      </div>

      <button class="st-row" on:click={openLangSheet}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.globe} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Idioma da app</span>
        </div>
        <div class="st-row-right-group">
          <span class="st-row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
          <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
        </div>
      </button>
    </div>

    <div class="st-group">
      <button class="st-row" on:click={() => openPlaceholderModal('Privacidade e segurança')}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.shield} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Privacidade e segurança</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-group">
      <button class="st-row" on:click={() => openPlaceholderModal('Notificações por email')}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.bell} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Notificações por email</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-group">
      <button class="st-row" on:click={() => openPlaceholderModal('Armazenamento')}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.storage} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Armazenamento</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-group">
      <button class="st-row" on:click={() => openPlaceholderModal('Ajuda e suporte')}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.help} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Ajuda e suporte</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
      <button class="st-row" on:click={() => openPlaceholderModal('Sobre')}>
        <div class="st-row-left">
          <img class="st-row-icon" src={ICON.info} alt="" />
          <span class="st-row-label" style="color:{c.textPrimary}">Sobre</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-group">
      <button class="st-row" on:click={() => openLogoutDialog('all')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
        </div>
      </button>
    </div>
  </div>

  <button class="logout-fab pulse-tap" on:click={() => openLogoutDialog('single')}>
    <span class="icon-mask logout-fab-icon" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}')"></span>
    <span class="logout-fab-label">Terminar sessão</span>
  </button>

  {#if showFieldModal}
    <div class="fluent-overlay" class:fluent-overlay-in={fieldModalVisible} on:click={closeFieldModal}></div>
    <div class="fluent-modal" class:fluent-modal-in={fieldModalVisible} style="background:{c.dialogBackground}">
      <div class="fluent-modal-title" style="color:{c.textPrimary}">{fieldModalTitle}</div>
      <div class="fluent-modal-sub" style="color:{c.textSecondary}">Em breve</div>
      <div class="fluent-modal-actions">
        <button class="fluent-btn-save" on:click={closeFieldModal}>Entendido</button>
      </div>
    </div>
  {/if}

  {#if showLangSheet}
    <button class="overlay" class:overlay-in={langOverlayVisible} on:click={closeLangSheet}></button>
    <div class="bottom-sheet" bind:this={langSheetEl} style="background:{c.dialogBackground};transform: translate3d(0, {langSheetY}%, 0);">
      <div class="sheet-grab-zone"
        on:touchstart={langDrag.touchstart}
        on:touchmove|nonpassive={langDrag.touchmove}
        on:touchend={langDrag.touchend}
        on:touchcancel={langDrag.touchend}>
        <div class="sheet-handle" style="background:{c.divider}"></div>
        <div class="sheet-title" style="color:{c.textPrimary}">Idioma da app</div>
      </div>
      <div class="sheet-scroll">
        {#each AVAILABLE_LANGUAGES as lang}
          <button class="sheet-opt" on:click={() => selectLang(lang.code)}>
            <span class="sheet-opt-label" style="color:{c.textPrimary}">{lang.native}</span>
            {#if currentLang === lang.code}
              <span class="icon-mask" style="mask-image:url('{ICON.checkmark}');-webkit-mask-image:url('{ICON.checkmark}');background:#0078D4;width:16px;height:16px"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if showLogoutDialog}
    <div class="logout-overlay" class:logout-overlay-in={logoutDialogVisible}></div>
    <div class="logout-dialog" class:logout-dialog-in={logoutDialogVisible} style="background:{c.dialogBackground}">
      <p class="logout-dialog-text" style="color:{c.textPrimary}">
        {logoutMode === 'all' ? 'Tens a certeza que queres terminar a sessão em todos os dispositivos?' : 'Tens a certeza que queres terminar a sessão?'}
      </p>
      <div class="logout-dialog-actions">
        <button class="logout-btn-confirm" on:click={confirmLogout} disabled={loggingOut}>
          {loggingOut ? 'A terminar…' : 'Terminar sessão'}
        </button>
        <button class="logout-btn-cancel" style="color:{c.textPrimary}" on:click={cancelLogoutDialog} disabled={loggingOut}>Cancelar</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .st-root {
    position: fixed; inset: 0; z-index: 30;
    display: flex; flex-direction: column; overflow: hidden;
    will-change: transform;
    box-shadow: -6px 0 24px rgba(0,0,0,0.18);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }
  .st-root * { box-sizing: border-box; }

  .st-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 16px 12px; flex-shrink: 0;
  }
  .st-back-btn {
    width: 36px; height: 36px; border: none; background: transparent; padding: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .16s ease;
  }
  .st-back-btn:active { opacity: .55; }
  .st-header-title { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
  .st-body { flex: 1; overflow-y: auto; padding: 8px 16px calc(env(safe-area-inset-bottom,0px) + 88px); -webkit-overflow-scrolling: touch; }

  .st-group { margin-bottom: 26px; }
  .st-group:last-child { margin-bottom: 0; }

  .st-theme-tabs {
    display: flex; gap: 4px;
    border-radius: 10px;
    padding: 3px;
    margin-bottom: 8px;
  }
  .st-theme-tab {
    flex: 1;
    padding: 9px 0;
    border: none; border-radius: 8px;
    background: transparent;
    font-size: 13.5px; font-weight: 600; font-family: inherit;
    cursor: pointer;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1), color .18s ease;
  }
  .st-theme-tab-active { font-weight: 700; }

  .st-row {
    width: 100%; background: transparent; border: none; display: flex; align-items: center;
    justify-content: space-between; padding: 12px 0; font-size: 15px; cursor: pointer; text-align: left;
    gap: 12px;
    transition: opacity .16s ease;
  }
  .st-row:active { opacity: .7; }
  .st-row-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .st-row-icon { width: 22px; height: 22px; flex-shrink: 0; display: block; }
  .st-row-label { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-row-right-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .st-row-value { font-size: 13.5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .logout-fab {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 54px + 14px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 44px;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    z-index: 10;
    background: #0078D4;
  }
  :global([data-theme="dark"]) .logout-fab { background: rgba(0,120,212,0.55); }
  :global([data-theme="light"]) .logout-fab { background: #0078D4; }
  .logout-fab-icon { width: 18px; height: 18px; background: #fff; }
  .logout-fab-label { font-size: 14px; font-weight: 700; color: #fff; }
  .pulse-tap { transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1); }
  .pulse-tap:active { transform: scale(0.97); opacity: .85; }

  .fluent-overlay {
    position: fixed; inset: 0; z-index: 800;
    background: rgba(0,0,0,0);
    transition: background .3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .fluent-overlay.fluent-overlay-in { background: rgba(0,0,0,.5); }
  .fluent-modal {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0;
    width: calc(100vw - 56px); max-width: 340px;
    border-radius: 16px; z-index: 801;
    padding: 20px 18px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08);
    transition: transform .34s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .26s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .fluent-modal.fluent-modal-in { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  .fluent-modal-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .fluent-modal-sub { font-size: 12.5px; margin-bottom: 16px; }
  .fluent-modal-actions { display: flex; gap: 8px; margin-top: 18px; }
  .fluent-btn-save {
    flex: 1; padding: 11px; border-radius: 10px; border: none;
    font-size: 14.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: #fff;
    background: #0078D4;
    transition: opacity .15s ease, transform .15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .fluent-btn-save:active { transform: scale(0.97); opacity: .85; }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .34s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .overlay.overlay-in { background: rgba(0,0,0,.42); }
  .bottom-sheet {
    position: fixed; left: 12px; right: 12px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 12px);
    border-radius: 24px; z-index: 700;
    padding: 0 0 10px;
    will-change: transform;
    box-shadow: 0 12px 40px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
    overflow: hidden;
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; opacity: .8; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; }
  .sheet-scroll { max-height: 50vh; overflow-y: auto; }
  .sheet-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; background: none; border: none; cursor: pointer; text-align: left;
    transition: opacity .16s ease;
  }
  .sheet-opt:active { opacity: .6; }
  .sheet-opt-label { font-size: 15px; font-weight: 500; }

  .logout-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0, 0, 0, 0);
    transition: background .34s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .logout-overlay.logout-overlay-in { background: rgba(0, 0, 0, 0.45); }
  .logout-dialog {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0;
    border-radius: 16px;
    padding: 26px 22px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0,0,0,0.08);
    z-index: 81;
    width: calc(100vw - 56px); max-width: 320px;
    transition: transform .4s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .logout-dialog.logout-dialog-in { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  .logout-dialog-text { font-size: 15.5px; line-height: 1.45; margin: 0 0 22px; text-align: center; font-family: inherit; }
  .logout-dialog-actions { display: flex; flex-direction: column; gap: 10px; }
  .logout-btn-cancel, .logout-btn-confirm {
    width: 100%; padding: 13px 20px; border-radius: 12px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: background .2s cubic-bezier(0.32, 0.72, 0, 1), transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel { background: var(--btn-bg); }
  .logout-btn-cancel:active { background: var(--btn-bg-active); transform: scale(0.96); }
  .logout-btn-confirm { background: #0078D4; color: white; }
  .logout-btn-confirm:active { background: #005A9E; transform: scale(0.96); }
  .logout-btn-cancel:disabled, .logout-btn-confirm:disabled { opacity: .6; }

  @media (prefers-reduced-motion: reduce) {
    .st-back-btn, .st-row, .sheet-opt, .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .overlay, .fluent-overlay, .fluent-modal, .st-theme-tab, .logout-fab, .pulse-tap {
      transition: none !important;
    }
  }
</style>