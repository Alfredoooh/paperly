<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import {
    getThemeColors, getTheme,
    getSurfaceTone, setSurfaceTone, getSurfaceTones,
  } from '$shared/theme.js';
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
    person: `${FLUENT_BASE}/person_24_regular.svg`,
    mail: `${FLUENT_BASE}/mail_24_regular.svg`,
    lock: `${FLUENT_BASE}/lock_closed_24_regular.svg`,
    shield: `${FLUENT_BASE}/shield_24_regular.svg`,
    bell: `${FLUENT_BASE}/alert_24_regular.svg`,
    storage: `${FLUENT_BASE}/database_24_regular.svg`,
    globe: `${FLUENT_BASE}/globe_24_regular.svg`,
    help: `${FLUENT_BASE}/question_circle_24_regular.svg`,
    info: `${FLUENT_BASE}/info_24_regular.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
    add: `${FLUENT_BASE}/add_24_regular.svg`,
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

  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: currentLangLabel = AVAILABLE_LANGUAGES.find(l => l.code === currentLang)?.native || 'Português (Portugal)';

  const THEME_OPTIONS = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
    { id: 'system', label: 'Sistema' },
  ];

  $: effectiveIsDark = themeValue === 'dark' || (themeValue === 'system' && isDark);

  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'settings', data: { isDark: dark } });
  }

  $: surfaceTones = getSurfaceTones(effectiveIsDark);
  let currentTone = getSurfaceTone(effectiveIsDark);
  $: currentTone = getSurfaceTone(effectiveIsDark);

  function pickTone(toneId) {
    setSurfaceTone(toneId, effectiveIsDark);
    currentTone = toneId;
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

  function goEditProfile() {
    dispatch('nav', { to: 'profile' });
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
    <button class="st-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'main' })}>
      <span class="icon-mask" style="mask-image:url('{ICON.back}');-webkit-mask-image:url('{ICON.back}');background:{c.iconTint};width:24px;height:24px"></span>
    </button>
    <span class="st-header-title" style="color:{c.textPrimary}">Definições</span>
    <div style="width:36px"></div>
  </div>

  <div class="st-body">

    <button class="st-profile-card" on:click={goEditProfile}>
      {#if user?.avatar}
        <img class="st-avatar-img" src={user.avatar} alt={userName} />
      {:else}
        <div class="st-avatar" style="background:{c.primary}">{userInitial}</div>
      {/if}
      <div class="st-profile-info">
        <div class="st-profile-name" style="color:{c.textPrimary}">{userName}</div>
        {#if userEmail}<div class="st-profile-email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
      </div>
      <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:16px;height:16px;opacity:.5"></span>
    </button>

    <div class="st-section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="st-section">
      <div class="st-theme-row">
        {#each THEME_OPTIONS as opt}
          <button class="st-theme-item" on:click={() => setThemeValue(opt.id)}>
            <div class="theme-preview" class:theme-preview-active={themeValue === opt.id}>
              {#if opt.id === 'light'}
                <div class="theme-preview-face theme-preview-light">
                  <span class="theme-line" style="width:70%"></span>
                  <span class="theme-line" style="width:85%"></span>
                </div>
              {:else if opt.id === 'dark'}
                <div class="theme-preview-face theme-preview-dark">
                  <span class="theme-line theme-line-dark" style="width:70%"></span>
                  <span class="theme-line theme-line-dark" style="width:85%"></span>
                </div>
              {:else}
                <div class="theme-preview-face theme-preview-system">
                  <div class="theme-preview-half theme-preview-half-light"></div>
                  <div class="theme-preview-half theme-preview-half-dark"></div>
                </div>
              {/if}
            </div>
            <span class="theme-item-label" class:theme-item-label-active={themeValue === opt.id} style="color:{themeValue === opt.id ? c.textPrimary : c.textSecondary}">{opt.label}</span>
          </button>
        {/each}
      </div>

      <button class="st-row" on:click={openLangSheet}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.globe}');-webkit-mask-image:url('{ICON.globe}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Idioma da app</span>
        </div>
        <div class="st-row-right-group">
          <span class="st-row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
          <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
        </div>
      </button>

      <div class="tone-block">
        <div class="tone-header">
          <span class="st-row-label" style="color:{c.textPrimary}">Tom do app</span>
          <span class="tone-header-sub" style="color:{c.textSecondary}">Aplica-se ao tema {effectiveIsDark ? 'escuro' : 'claro'}</span>
        </div>
        <div class="tone-scroll">
          {#each surfaceTones as tone (tone.id)}
            <button class="tone-swatch-btn" on:click={() => pickTone(tone.id)} aria-label={tone.label}>
              <span
                class="tone-swatch"
                class:tone-swatch-active={currentTone === tone.id}
                style="background:{tone.swatch};border-color:{c.divider}"
              >
                {#if currentTone === tone.id}
                  <span class="icon-mask" style="mask-image:url('{ICON.checkmark}');-webkit-mask-image:url('{ICON.checkmark}');background:{effectiveIsDark ? '#fff' : '#111'};width:15px;height:15px"></span>
                {/if}
              </span>
              <span class="tone-swatch-label" style="color:{c.textSecondary}">{tone.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="st-section">
      <button class="st-row" on:click={goEditProfile}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.person}');-webkit-mask-image:url('{ICON.person}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Editar perfil</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
      <button class="st-row" on:click={() => openPlaceholderModal('Email')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.mail}');-webkit-mask-image:url('{ICON.mail}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Email</span>
        </div>
        <div class="st-row-right-group">
          <span class="st-row-value" style="color:{c.textSecondary}">{userEmail || '—'}</span>
          <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
        </div>
      </button>
      <button class="st-row" on:click={() => openPlaceholderModal('Palavra-passe')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.lock}');-webkit-mask-image:url('{ICON.lock}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Palavra-passe</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Privacidade e segurança</div>
    <div class="st-section">
      <button class="st-row" on:click={() => openPlaceholderModal('Privacidade e segurança')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.shield}');-webkit-mask-image:url('{ICON.shield}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Privacidade e segurança</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Notificações</div>
    <div class="st-section">
      <button class="st-row" on:click={() => openPlaceholderModal('Notificações por email')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.bell}');-webkit-mask-image:url('{ICON.bell}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Notificações por email</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Preferências</div>
    <div class="st-section">
      <button class="st-row" on:click={() => openPlaceholderModal('Armazenamento')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.storage}');-webkit-mask-image:url('{ICON.storage}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Armazenamento</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Geral</div>
    <div class="st-section">
      <button class="st-row" on:click={() => openPlaceholderModal('Ajuda e suporte')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.help}');-webkit-mask-image:url('{ICON.help}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Ajuda e suporte</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
      <button class="st-row" on:click={() => openPlaceholderModal('Sobre')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.info}');-webkit-mask-image:url('{ICON.info}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Sobre</span>
        </div>
        <span class="icon-mask" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}');background:{c.textSecondary};width:14px;height:14px;opacity:.5"></span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Sessão</div>
    <div class="st-section">
      <button class="st-row" on:click={() => openLogoutDialog('all')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}');background:{c.textSecondary}"></span>
          <span class="st-row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
        </div>
      </button>
      <button class="st-row st-danger" on:click={() => openLogoutDialog('single')}>
        <div class="st-row-left">
          <span class="icon-mask st-row-icon" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}');background:var(--danger)"></span>
          <span class="st-row-label" style="color:var(--danger)">Terminar sessão</span>
        </div>
      </button>
    </div>
  </div>

  {#if showFieldModal}
    <div class="fluent-overlay" class:fluent-overlay-in={fieldModalVisible} on:click={closeFieldModal}></div>
    <div class="fluent-modal" class:fluent-modal-in={fieldModalVisible} style="background:{c.dialogBackground}">
      <div class="fluent-modal-title" style="color:{c.textPrimary}">{fieldModalTitle}</div>
      <div class="fluent-modal-sub" style="color:{c.textSecondary}">Em breve</div>
      <div class="fluent-modal-actions">
        <button class="fluent-btn-save" style="background:{c.primary}" on:click={closeFieldModal}>Entendido</button>
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
              <span class="icon-mask" style="mask-image:url('{ICON.checkmark}');-webkit-mask-image:url('{ICON.checkmark}');background:{c.primary};width:16px;height:16px"></span>
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
  .st-icon-btn {
    width: 36px; height: 36px; border-radius: 4px; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .16s ease;
  }
  .st-icon-btn:active { transform: scale(0.86); opacity: .65; }
  .st-header-title { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
  .st-body { flex: 1; overflow-y: auto; padding: 8px 16px 24px; -webkit-overflow-scrolling: touch; }

  .st-profile-card {
    display: flex; align-items: center; gap: 14px; padding: 16px; width: 100%;
    border: none; cursor: pointer; text-align: left; font: inherit;
    border-radius: 16px; margin-bottom: 26px;
    background: var(--drawer-bg);
    transition: opacity .16s ease;
  }
  .st-profile-card:active { opacity: .8; }
  :global([data-theme="dark"]) .st-profile-card { background: var(--btn-bg); }
  .st-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .st-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .st-profile-info { flex: 1; min-width: 0; }
  .st-profile-name { font-size: 16px; font-weight: 700; }
  .st-profile-email { font-size: 13px; margin-top: 2px; }

  .st-section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 22px 4px 10px; }
  .st-body > .st-section-label:first-of-type { padding-top: 0; }

  .st-section {
    border-radius: 16px; overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .st-section { background: var(--btn-bg); }

  .st-row {
    width: 100%; background: transparent; border: none; display: flex; align-items: center;
    justify-content: space-between; padding: 14px 16px; font-size: 15px; cursor: pointer; text-align: left;
    border-bottom: 1px solid var(--drawer-sep);
    gap: 12px;
    transition: opacity .16s ease;
  }
  .st-row:last-child { border-bottom: none; }
  .st-row:active { opacity: .7; }
  .st-row-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .st-row-icon { width: 22px; height: 22px; flex-shrink: 0; }
  .st-row-label { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-row-right-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .st-row-value { font-size: 13.5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-danger { color: var(--danger); }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .st-theme-row {
    display: flex; gap: 10px;
    padding: 16px 16px 14px;
    border-bottom: 1px solid var(--drawer-sep);
  }
  .st-theme-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    background: none; border: none; cursor: pointer; padding: 0;
  }
  .theme-preview {
    width: 100%; aspect-ratio: 1 / 0.68;
    border-radius: 10px;
    border: 2px solid transparent;
    padding: 3px;
    display: flex;
    transition: border-color .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .theme-preview-active { border-color: var(--accent-primary); }
  .theme-preview-face {
    flex: 1; border-radius: 7px; overflow: hidden;
    display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 0 8px;
  }
  .theme-preview-light { background: #EDEDED; }
  .theme-preview-dark { background: #1C1C1E; }
  .theme-line { display: block; height: 4px; border-radius: 2px; background: #D9D9DE; }
  .theme-line-dark { background: #48484A; }
  .theme-preview-system { padding: 0; flex-direction: row; }
  .theme-preview-half { flex: 1; }
  .theme-preview-half-light { background: #EDEDED; }
  .theme-preview-half-dark { background: #1C1C1E; }
  .theme-item-label { font-size: 12.5px; font-weight: 500; }
  .theme-item-label-active { font-weight: 700; }

  .tone-block { padding: 16px 0 12px; }
  .tone-header { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; padding: 0 16px; }
  .tone-header-sub { font-size: 12px; }
  .tone-scroll {
    display: flex; gap: 12px; overflow-x: auto; padding: 2px 16px 6px;
    -webkit-overflow-scrolling: touch; scrollbar-width: thin;
  }
  .tone-scroll::-webkit-scrollbar { height: 4px; }
  .tone-scroll::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.3); border-radius: 2px; }
  .tone-swatch-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer; flex-shrink: 0; padding: 2px;
  }
  .tone-swatch {
    width: 44px; height: 44px; border-radius: 12px; border: 1.5px solid;
    display: flex; align-items: center; justify-content: center;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), box-shadow .16s ease;
  }
  .tone-swatch-active { box-shadow: 0 0 0 2px var(--accent-primary); transform: scale(1.04); }
  .tone-swatch-btn:active .tone-swatch { transform: scale(0.92); }
  .tone-swatch-label { font-size: 10.5px; font-weight: 500; max-width: 50px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
    transition: opacity .15s ease, transform .15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .fluent-btn-save:active { transform: scale(0.97); opacity: .85; }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .34s cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-backdrop-filter: blur(0px);
    backdrop-filter: blur(0px);
  }
  .overlay.overlay-in {
    background: rgba(0,0,0,.42);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
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
    -webkit-backdrop-filter: blur(0px);
    backdrop-filter: blur(0px);
  }
  .logout-overlay.logout-overlay-in {
    background: rgba(0, 0, 0, 0.45);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
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
  .logout-btn-confirm { background: var(--danger); color: white; }
  .logout-btn-confirm:active { background: var(--danger-active); transform: scale(0.96); }
  .logout-btn-cancel:disabled, .logout-btn-confirm:disabled { opacity: .6; }

  @media (prefers-reduced-motion: reduce) {
    .st-icon-btn, .st-row, .sheet-opt, .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .overlay, .fluent-overlay, .fluent-modal, .theme-preview, .tone-swatch {
      transition: none !important;
    }
  }
</style>