<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';
  import { logout } from '$shared/auth-guard.js';
  import { AuthApiService } from '$shared/api.js';
  import { AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { showToast } from '$shared/utils.js';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let pushed = false;
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const slide = createSlideTransition({});
  let slideX = 100;
  const unsubscribeSlide = slide.subscribe((v) => { slideX = v; });
  let lastPushed = null;
  $: if (pushed !== lastPushed) {
    lastPushed = pushed;
    if (pushed) slide.open(); else slide.close();
  }

  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });
  onDestroy(() => { unsubscribeSlide?.(); slide.destroy(); });

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

  // ── Bottom sheet — idioma (popup nativo) ─────────────────────────
  let showLangSheet = false, langSheetVisible = false;
  function openLangSheet() {
    showLangSheet = true;
    requestAnimationFrame(() => { langSheetVisible = true; });
  }
  function closeLangSheet() {
    langSheetVisible = false;
    setTimeout(() => { showLangSheet = false; }, 260);
  }
  function selectLang(code) {
    currentLang = code;
    localStorage.setItem('nexa_lang', code);
    closeLangSheet();
    showToast('Idioma atualizado');
  }

  // ── Bottom sheet — confirmação de logout (popup nativo) ──────────
  let showLogoutSheet = false, logoutSheetVisible = false;
  let logoutMode = 'single';
  function openLogoutSheet(mode) {
    logoutMode = mode;
    showLogoutSheet = true;
    requestAnimationFrame(() => { logoutSheetVisible = true; });
  }
  function closeLogoutSheet() {
    logoutSheetVisible = false;
    setTimeout(() => { showLogoutSheet = false; }, 260);
  }

  let loggingOut = false;
  async function confirmLogout() {
    loggingOut = true;
    try {
      if (logoutMode === 'all' && user?.token && AuthApiService.logoutAll) {
        const ok = await AuthApiService.logoutAll(user.token);
        showToast(ok ? 'Sessões terminadas em todos os dispositivos' : 'Não foi possível terminar as outras sessões');
        if (!ok) { loggingOut = false; closeLogoutSheet(); return; }
      }
      logout();
    } finally {
      loggingOut = false;
    }
  }
</script>

<div class="st-root" class:st-in={pageVisible} style="background:{c.background}; transform: translate3d({slideX}%, 0, 0);">
  <div class="st-header">
    <button class="st-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'main' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>
    <span class="st-header-title" style="color:{c.textPrimary}">Definições gerais</span>
    <div style="width:36px"></div>
  </div>

  <div class="st-body">
    <div class="st-profile-card" style="background:{c.dialogBackground}">
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
    <div class="st-section" style="background:{c.dialogBackground}">
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
    <div class="st-section" style="background:{c.dialogBackground}">
      <button class="st-row" on:click={openLangSheet}>
        <span class="st-row-label" style="color:{c.textPrimary}">Idioma da app</span>
        <span class="st-row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Notificações</div>
    <div class="st-section" style="background:{c.dialogBackground}">
      <button class="st-row" on:click={() => showToast('Em breve')}>
        <span class="st-row-label" style="color:{c.textPrimary}">Notificações por email</span>
        <span class="st-row-value" style="color:{c.textSecondary}">Em breve</span>
      </button>
    </div>

    <div class="st-section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="st-section" style="background:{c.dialogBackground}">
      <button class="st-row" on:click={() => openLogoutSheet('all')}>
        <span class="st-row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
      </button>
      <div class="st-divider" style="background:{c.divider}"></div>
      <button class="st-row st-danger" on:click={() => openLogoutSheet('single')}>
        <span class="st-row-label">Terminar sessão</span>
      </button>
    </div>
  </div>

  <!-- ══ POPUP — Idioma ══════════════════════════════════════════ -->
  {#if showLangSheet}
    <button class="overlay" class:overlay-in={langSheetVisible} on:click={closeLangSheet}></button>
    <div class="bottom-sheet" class:sheet-in={langSheetVisible} style="background:{c.dialogBackground}">
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Idioma da app</div>
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

  <!-- ══ POPUP — Confirmar logout ════════════════════════════════ -->
  {#if showLogoutSheet}
    <button class="overlay" class:overlay-in={logoutSheetVisible} on:click={closeLogoutSheet}></button>
    <div class="bottom-sheet sheet-confirm" class:sheet-in={logoutSheetVisible} style="background:{c.dialogBackground}">
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-confirm-title" style="color:{c.textPrimary}">
        {logoutMode === 'all' ? 'Terminar sessão em todos os dispositivos?' : 'Terminar sessão?'}
      </div>
      <p class="sheet-confirm-desc" style="color:{c.textSecondary}">
        {logoutMode === 'all'
          ? 'Vais ser desconectado deste e de todos os outros dispositivos onde tens sessão iniciada.'
          : 'Vais precisar de voltar a iniciar sessão neste dispositivo.'}
      </p>
      <div class="sheet-confirm-actions">
        <button class="sheet-cancel-btn" style="border-color:{c.divider};color:{c.textPrimary}" on:click={closeLogoutSheet} disabled={loggingOut}>Cancelar</button>
        <button class="sheet-danger-btn" on:click={confirmLogout} disabled={loggingOut}>
          {loggingOut ? 'A terminar…' : 'Terminar sessão'}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .st-root {
    position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    opacity: 0; transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
  }
  .st-root.st-in { opacity: 1; transform: translateY(0); }
  .st-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 16px 12px; flex-shrink: 0;
  }
  .st-icon-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .st-icon-btn:active { transform: scale(0.86); opacity: .65; }
  .st-header-title { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
  .st-body { flex: 1; overflow-y: auto; padding: 8px 16px 24px; -webkit-overflow-scrolling: touch; }
  .st-profile-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 18px; margin-bottom: 24px; }
  .st-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
  .st-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .st-profile-name { font-size: 16px; font-weight: 700; }
  .st-profile-email { font-size: 13px; margin-top: 2px; }
  .st-section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 0 2px 10px; }
  .st-section { border-radius: 18px; overflow: hidden; margin-bottom: 20px; }
  .st-row {
    width: 100%; background: transparent; border: none; display: flex; align-items: center;
    justify-content: space-between; padding: 14px 16px; font-size: 15px; cursor: pointer; text-align: left;
    transition: opacity .14s;
  }
  .st-row:active { opacity: .7; }
  .st-danger { color: #FF3B30; justify-content: flex-start; }
  .st-row-value { font-size: 13px; }
  .st-divider { height: 1px; margin: 0 16px; }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  /* ── Overlay + bottom sheet (popup nativo) ───────────────────────── */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .32s ease;
  }
  .overlay.overlay-in { background: rgba(0,0,0,.45); }
  .bottom-sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-radius: 20px 20px 0 0; z-index: 700;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    transform: translateY(100%);
    transition: transform .34s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 -4px 40px rgba(0,0,0,.16);
  }
  .bottom-sheet.sheet-in { transform: translateY(0); }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; }
  .sheet-scroll { max-height: 50vh; overflow-y: auto; }
  .sheet-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; background: none; border: none; cursor: pointer; text-align: left;
    transition: opacity .14s;
  }
  .sheet-opt:active { opacity: .6; }
  .sheet-opt-label { font-size: 15px; font-weight: 500; }

  .sheet-confirm { padding-left: 18px; padding-right: 18px; }
  .sheet-confirm-title { font-size: 17px; font-weight: 700; padding: 4px 0 6px; }
  .sheet-confirm-desc { font-size: 13.5px; line-height: 1.5; margin: 0 0 18px; }
  .sheet-confirm-actions { display: flex; gap: 10px; padding-bottom: 4px; }
  .sheet-cancel-btn {
    flex: 1; padding: 13px; border-radius: 14px; border: 1px solid; background: transparent;
    font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .sheet-danger-btn {
    flex: 1; padding: 13px; border: none; border-radius: 14px; background: #FF3B30; color: #fff;
    font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .sheet-cancel-btn:disabled, .sheet-danger-btn:disabled { opacity: .6; }
</style>