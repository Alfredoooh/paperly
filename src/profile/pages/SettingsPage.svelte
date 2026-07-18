<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';
  import { logout } from '$shared/auth-guard.js';
  import { AuthApiService } from '$shared/api.js';
  import { AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { showToast } from '$shared/utils.js';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  // slideX vem PRONTO do spring do App.svelte pai (settingsSlide) — a
  // própria tela já não gere o seu próprio slide de entrada/saída,
  // eliminando a duplicação de spring que causava a dessincronia com
  // a MainPage (a "animação estranha" reportada).
  export let slideX = 100;
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // ── Gesto de arrastar da borda esquerda para fechar (edge-swipe) ───
  // Segue o dedo 1:1 escrevendo diretamente no elemento (sem tocar no
  // spring do pai, que pertence à App.svelte) — ao soltar, decide por
  // threshold/velocidade e delega ao dispatch('nav',{to:'main'}), que
  // é o MESMO caminho usado pelo botão "voltar" do cabeçalho.
  const EDGE_ZONE = 24;
  const CLOSE_THRESHOLD = 0.32;
  const VELOCITY_FLING = 0.5; // px/ms
  let dragging = false;
  let dragLiveActive = false;
  let dragStartX = 0;
  let dragCurrentX = 0;
  let dragStartTime = 0;
  let dragW = 360;
  let rootEl;
  let liveOverrideX = null; // null = usa slideX do pai; número = dedo está a controlar

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
    // se não fechar, o próximo valor de slideX do pai (já em 0) volta
    // a assumir o controlo visual automaticamente
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

  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'settings', data: { isDark: dark } });
  }

  // ── Idioma: bottom sheet com spring próprio + arrastável ──────────
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
    localStorage.setItem('nexa_lang', code);
    closeLangSheet();
    showToast('Idioma atualizado');
  }

  // ══════════════════════════════════════════════════════════════════
  //  CONFIRMAR LOGOUT — MESMO padrão visual/comportamental do
  //  logout-dialog do AppDrawer no home: overlay a escurecer + dialog
  //  central com scale-in (não é um bottom sheet), duas ações
  //  (Cancelar / Terminar sessão), empilhadas verticalmente para que
  //  "Terminar sessão" não fique espremido ao lado de "Cancelar".
  // ══════════════════════════════════════════════════════════════════
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

  // ── Gesto de arrastar genérico para o sheet de idioma ─────────────
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
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>
    <span class="st-header-title" style="color:{c.textPrimary}">Definições gerais</span>
    <div style="width:36px"></div>
  </div>

  <div class="st-body">
    <div class="st-profile-card" style="background:{c.authInputFill}">
      {#if user?.avatar}
        <img class="st-avatar-img" src={user.avatar} alt={userName} />
      {:else}
        <div class="st-avatar" style="background:{c.primary}">{userInitial}</div>
      {/if}
      <div class="st-profile-info">
        <div class="st-profile-name" style="color:{c.textPrimary}">{userName}</div>
        {#if userEmail}<div class="st-profile-email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
      </div>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="st-section" style="background:{c.authInputFill}">
      {#each THEME_OPTIONS as opt, i}
        <button class="st-row" on:click={() => setThemeValue(opt.id)}>
          <span class="st-row-label" style="color:{c.textPrimary}">{opt.label}</span>
          {#if themeValue === opt.id}
            <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:{c.primary};width:16px;height:16px"></span>
          {/if}
        </button>
        {#if i < THEME_OPTIONS.length - 1}<div class="st-divider" style="background:{c.divider}"></div>{/if}
      {/each}
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Idioma</div>
    <div class="st-section" style="background:{c.authInputFill}">
      <button class="st-row" on:click={openLangSheet}>
        <span class="st-row-label" style="color:{c.textPrimary}">Idioma da app</span>
        <span class="st-row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Notificações</div>
    <div class="st-section" style="background:{c.authInputFill}">
      <button class="st-row" on:click={() => showToast('Em breve')}>
        <span class="st-row-label" style="color:{c.textPrimary}">Notificações por email</span>
        <span class="st-row-value" style="color:{c.textSecondary}">Em breve</span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="st-section" style="background:{c.authInputFill}">
      <button class="st-row" on:click={() => openLogoutDialog('all')}>
        <span class="st-row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
      </button>
      <div class="st-divider" style="background:{c.divider}"></div>
      <button class="st-row st-danger" on:click={() => openLogoutDialog('single')}>
        <span class="st-row-label">Terminar sessão</span>
      </button>
    </div>
  </div>

  <!-- ══ POPUP — Idioma (spring nativo + arrastável, flutuante) ══════ -->
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
              <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:{c.primary};width:16px;height:16px"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       CONFIRMAR LOGOUT — mesmo padrão do logout-dialog no AppDrawer
       do home: overlay a escurecer + cartão central com scale-in,
       flutuante, botões empilhados (Terminar sessão em cima,
       Cancelar por baixo) para não ficarem espremidos lado a lado.
  ══════════════════════════════════════════════════════════════ -->
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
        <button class="logout-btn-cancel" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={cancelLogoutDialog} disabled={loggingOut}>Cancelar</button>
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
  }
  .st-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 16px 12px; flex-shrink: 0;
  }
  .st-icon-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .16s ease;
  }
  .st-icon-btn:active { transform: scale(0.86); opacity: .65; }
  .st-header-title { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
  .st-body { flex: 1; overflow-y: auto; padding: 8px 16px 24px; -webkit-overflow-scrolling: touch; }
  .st-profile-card {
    display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 20px; margin-bottom: 26px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .st-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .st-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .st-profile-name { font-size: 16px; font-weight: 700; }
  .st-profile-email { font-size: 13px; margin-top: 2px; }
  .st-section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 0 4px 10px; }
  .st-section {
    border-radius: 20px; overflow: hidden; margin-bottom: 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .st-row {
    width: 100%; background: transparent; border: none; display: flex; align-items: center;
    justify-content: space-between; padding: 15px 16px; font-size: 15px; cursor: pointer; text-align: left;
    transition: opacity .16s ease, background-color .16s ease;
  }
  .st-row:active { opacity: .7; }
  .st-danger { color: #FF3B30; justify-content: flex-start; }
  .st-row-value { font-size: 13px; }
  .st-divider { height: 1px; margin: 0 16px; opacity: .7; }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  /* ── Bottom sheet (idioma) — flutuante, não toca nas bordas ───────── */
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
    border-radius: 26px; z-index: 700;
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

  /* ── Confirmar logout — flutuante, cartão central com respiro lateral ── */
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
    border-radius: 24px;
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
    width: 100%; padding: 13px 20px; border-radius: 999px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: background .2s cubic-bezier(0.32, 0.72, 0, 1), transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel:active { transform: scale(0.96); }
  .logout-btn-confirm { background: #FF3B30; color: white; }
  .logout-btn-confirm:active { background: #E0342A; transform: scale(0.96); }
  .logout-btn-cancel:disabled, .logout-btn-confirm:disabled { opacity: .6; }

  @media (prefers-reduced-motion: reduce) {
    .st-icon-btn, .st-row, .sheet-opt, .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm, .overlay {
      transition: none !important;
    }
  }
</style>