<script>
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let userEmail = '';

  export let themeValue = 'dark';
  export let onApplyTheme = () => {};

  export let onOpenProfile = () => {};
  export let onOpenSettings = () => {};
  export let onLogout = () => {};

  export let showInstall = false;
  export let onInstall = () => {};

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    bell: `${FLUENT_BASE}/alert_24_regular.svg`,
    help: `${FLUENT_BASE}/question_circle_24_regular.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
  };

  $: isDark = themeValue === 'dark';

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  function buzzStrong() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function goProfile() {
    buzz();
    onOpenProfile();
  }

  function openSetting(id) {
    buzz();
    onOpenSettings(id);
  }

  function goHelp() {
    openSetting('help');
  }

  function goNotifications() {
    openSetting('notifications');
  }

  function toggleDarkMode() {
    buzz();
    onApplyTheme(isDark ? 'light' : 'dark');
  }

  let showLogoutDialog = false;
  let dialogVisible = false;

  function openLogoutDialog() {
    buzzStrong();
    showLogoutDialog = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { dialogVisible = true; }));
  }

  function confirmLogout() {
    dialogVisible = false;
    setTimeout(() => { showLogoutDialog = false; }, 260);
    if (onLogout) onLogout();
    if (window.AndroidSession) window.AndroidSession.onLogout();
  }

  function cancelLogout() {
    dialogVisible = false;
    setTimeout(() => { showLogoutDialog = false; }, 260);
  }

  function handleInstall() {
    buzz();
    onInstall();
  }
</script>

<div class="me-tab">
  <button class="me-avatar-block pulse-tap" on:click={goProfile}>
    <div class="me-avatar">
      {#if avatarUrl}
        <img src={avatarUrl} alt={userName} class="me-avatar-img" />
      {:else}
        <span class="me-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
      {/if}
    </div>
    <div class="me-identity">
      <p class="me-name">{userName}</p>
      {#if userEmail}
        <p class="me-email">{userEmail}</p>
      {/if}
    </div>
  </button>

  {#if showInstall}
    <button class="me-install pulse-tap" on:click={handleInstall}>
      <span class="icon-mask" style="mask-image:url('{ICON.download}');-webkit-mask-image:url('{ICON.download}');width:22px;height:22px;background:#185ABD"></span>
      <span class="me-install-label">Instalar app</span>
    </button>
  {/if}

  <button class="me-row native-tap" on:click={toggleDarkMode} type="button">
    <span class="me-row-text">
      <span class="me-row-label">Modo escuro</span>
    </span>
    <span
      class="android-switch"
      class:android-switch-on={isDark}
      role="switch"
      aria-checked={isDark}
    >
      <span class="android-switch-track"></span>
      <span class="android-switch-thumb"></span>
    </span>
  </button>

  <button class="me-row native-tap" on:click={goNotifications}>
    <span class="icon-mask me-row-icon" style="mask-image:url('{ICON.bell}');-webkit-mask-image:url('{ICON.bell}')"></span>
    <span class="me-row-text">
      <span class="me-row-label">Notificações</span>
    </span>
  </button>
  <button class="me-row native-tap" on:click={goHelp}>
    <span class="icon-mask me-row-icon" style="mask-image:url('{ICON.help}');-webkit-mask-image:url('{ICON.help}')"></span>
    <span class="me-row-text">
      <span class="me-row-label">Ajuda e suporte</span>
    </span>
  </button>
</div>

<button class="logout-fab pulse-tap" on:click={openLogoutDialog}>
  <span class="icon-mask logout-fab-icon" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}')"></span>
  <span class="logout-fab-label">Terminar sessão</span>
</button>

{#if showLogoutDialog}
  <div class="sheet-overlay" class:sheet-overlay-in={dialogVisible} on:click={cancelLogout}></div>
  <div class="sheet-dialog" class:sheet-dialog-in={dialogVisible}>
    <div class="sheet-handle"></div>
    <p class="logout-dialog-text">Tens a certeza que queres terminar sessão?</p>
    <div class="logout-dialog-actions">
      <button class="logout-btn-confirm pulse-tap" on:click={confirmLogout}>Terminar</button>
      <button class="logout-btn-cancel pulse-tap" on:click={cancelLogout}>Cancelar</button>
    </div>
  </div>
{/if}

<style>
  .me-tab {
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 20px) 0 calc(env(safe-area-inset-bottom, 0px) + 54px + 88px);
  }

  .me-avatar-block {
    display: flex;
    align-items: center;
    gap: 14px;
    width: calc(100% - 28px);
    margin: 0 14px 22px;
    padding: 4px 2px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  .me-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .me-avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .me-avatar-initial {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 700; color: #fff;
  }
  .me-identity { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .me-name {
    margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.2px;
    color: var(--drawer-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .me-email {
    margin: 0; font-size: 13px; font-weight: 500; color: var(--text-faint);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .me-install {
    display: flex; align-items: center; gap: 10px;
    width: calc(100% - 28px); margin: 0 14px 20px; padding: 13px 16px;
    border-radius: 14px; border: 1px solid rgba(24,90,189,0.28);
    background: rgba(24,90,189,0.08);
    cursor: pointer; font: inherit;
  }
  .me-install-label { font-size: 14.5px; font-weight: 600; color: #185ABD; }

  .me-row {
    display: flex; align-items: center; gap: 14px;
    width: 100%; min-height: 58px; padding: 10px 16px;
    border: none; background: transparent; cursor: pointer; font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  .me-row-icon {
    width: 24px; height: 24px; flex-shrink: 0; display: block;
    background: var(--icon-strong);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .me-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; text-align: left; }
  .me-row-label {
    font-size: 15px; font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .native-tap:active { background: var(--row-active, rgba(127,127,127,0.08)); }
  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.97); opacity: .85; }

  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  /* Android (Material) native switch: track + thumb that grows/moves,
     matching the stock Android toggle look (not the thin Fluent rail). */
  .android-switch {
    position: relative;
    flex-shrink: 0;
    width: 52px;
    height: 32px;
    display: flex;
    align-items: center;
  }
  .android-switch-track {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: var(--switch-track-off, rgba(120,120,128,0.32));
    border: 2px solid var(--switch-track-off, rgba(120,120,128,0.32));
    transition: background .2s cubic-bezier(0.2, 0, 0, 1), border-color .2s cubic-bezier(0.2, 0, 0, 1);
  }
  .android-switch-thumb {
    position: absolute;
    top: 50%;
    left: 6px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--switch-thumb-off, #787880);
    transform: translate(0, -50%) scale(1);
    transition: transform .2s cubic-bezier(0.2, 0, 0, 1), background .2s cubic-bezier(0.2, 0, 0, 1), width .15s ease, height .15s ease, left .2s cubic-bezier(0.2, 0, 0, 1);
  }
  .android-switch-on .android-switch-track {
    background: #0078D4;
    border-color: #0078D4;
  }
  .android-switch-on .android-switch-thumb {
    left: 30px;
    width: 24px;
    height: 24px;
    background: #fff;
    transform: translate(0, -50%);
  }

  .logout-fab {
    position: fixed;
    left: 14px;
    right: 14px;
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
    background: #FF444F;
  }
  :global([data-theme="dark"]) .logout-fab { background: rgba(255,68,79,0.5); }
  :global([data-theme="light"]) .logout-fab { background: #FF444F; }

  .logout-fab-icon {
    width: 18px; height: 18px;
    background: #fff;
  }
  .logout-fab-label {
    font-size: 14px; font-weight: 700;
    color: #fff;
  }

  /* Bottom sheet style dialog — replaces the centered modal */
  .sheet-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0);
    transition: background .3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .sheet-overlay.sheet-overlay-in { background: rgba(0,0,0,0.45); }
  .sheet-dialog {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 81;
    background: var(--surface);
    border-radius: 28px 28px 0 0;
    padding: 10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);
    transform: translateY(100%);
    transition: transform .34s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
  }
  .sheet-dialog.sheet-dialog-in { transform: translateY(0); }
  .sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: var(--icon-faint);
    opacity: .6;
    margin: 4px auto 18px;
  }
  .logout-dialog-text { font-size: 16px; color: var(--text-primary); margin: 0 0 20px; text-align: center; font-family: inherit; }
  .logout-dialog-actions { display: flex; flex-direction: column; gap: 10px; }
  .logout-btn-cancel, .logout-btn-confirm {
    width: 100%; padding: 14px 20px; border-radius: 999px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: background .2s cubic-bezier(0.32, 0.72, 0, 1), transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel { background: var(--btn-bg); color: var(--text-primary); }
  .logout-btn-cancel:active { background: var(--btn-bg-active); transform: scale(0.96); }
  .logout-btn-confirm { background: #FF444F; color: white; }
  :global([data-theme="dark"]) .logout-btn-confirm { background: rgba(255,68,79,0.5); }
  :global([data-theme="light"]) .logout-btn-confirm { background: #FF444F; }
  .logout-btn-confirm:active { transform: scale(0.96); opacity: .85; }

  @media (prefers-reduced-motion: reduce) {
    .me-row, .me-avatar-block, .me-install, .logout-fab,
    .sheet-overlay, .sheet-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .pulse-tap, .android-switch-track, .android-switch-thumb { transition: none !important; }
  }
</style>