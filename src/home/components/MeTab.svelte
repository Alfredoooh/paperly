<script>
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let userEmail = '';

  export let themeValue = 'dark';
  export let onApplyTheme = () => {};

  export let onOpenProfile = () => {};
  export let onOpenSettingsPage = () => {};
  export let onOpenSettings = () => {};
  export let onLogout = () => {};

  export let showInstall = false;
  export let onInstall = () => {};

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    bell: `${FLUENT_BASE}/alert_24_regular.svg`,
    help: `${FLUENT_BASE}/question_circle_24_regular.svg`,
    settings: `${FLUENT_BASE}/settings_24_regular.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
    chevron: `${FLUENT_BASE}/chevron_right_24_regular.svg`,
    sun: `${FLUENT_BASE}/weather_sunny_24_regular.svg`,
    moon: `${FLUENT_BASE}/weather_moon_24_regular.svg`,
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

  function goSettingsPage() {
    buzz();
    onOpenSettingsPage();
  }

  function openSettingRow(id) {
    buzz();
    onOpenSettings(id);
  }

  function goHelp() {
    openSettingRow('help');
  }

  function goNotifications() {
    openSettingRow('notifications');
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
    <span class="icon-mask me-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
  </button>

  {#if showInstall}
    <button class="me-install pulse-tap" on:click={handleInstall}>
      <span class="icon-mask" style="mask-image:url('{ICON.download}');-webkit-mask-image:url('{ICON.download}');width:22px;height:22px;background:var(--accent-primary)"></span>
      <span class="me-install-label">Instalar app</span>
    </button>
  {/if}

  <button class="me-row native-tap" on:click={toggleDarkMode} type="button">
    <span class="icon-mask me-row-icon" style="mask-image:url('{isDark ? ICON.moon : ICON.sun}');-webkit-mask-image:url('{isDark ? ICON.moon : ICON.sun}')"></span>
    <span class="me-row-text">
      <span class="me-row-label">Modo escuro</span>
    </span>
    <span
      class="fluent-switch"
      class:fluent-switch-on={isDark}
      role="switch"
      aria-checked={isDark}
    >
      <span class="fluent-switch-thumb"></span>
    </span>
  </button>

  <button class="me-row native-tap" on:click={goNotifications}>
    <span class="icon-mask me-row-icon" style="mask-image:url('{ICON.bell}');-webkit-mask-image:url('{ICON.bell}')"></span>
    <span class="me-row-text">
      <span class="me-row-label">Notificações</span>
    </span>
  </button>

  <button class="me-row native-tap" on:click={goSettingsPage}>
    <span class="icon-mask me-row-icon" style="mask-image:url('{ICON.settings}');-webkit-mask-image:url('{ICON.settings}')"></span>
    <span class="me-row-text">
      <span class="me-row-label">Definições</span>
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
    font-size: 24px; font-weight: 700; color: var(--text-on-accent);
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
  .me-chevron {
    width: 20px; height: 20px; flex-shrink: 0;
    background: var(--text-faint);
  }

  .me-install {
    display: flex; align-items: center; gap: 10px;
    width: calc(100% - 28px); margin: 0 14px 20px; padding: 13px 16px;
    border-radius: 14px; border: 1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent);
    background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
    cursor: pointer; font: inherit;
  }
  .me-install-label { font-size: 14.5px; font-weight: 600; color: var(--accent-primary); }

  .me-row {
    display: flex; align-items: center; gap: 14px;
    width: 100%; min-height: 58px; padding: 10px 16px;
    border: none; background: transparent; cursor: pointer; font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  .me-row-icon {
    width: 24px; height: 24px; flex-shrink: 0;
    background: var(--drawer-text);
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

  .fluent-switch {
    position: relative;
    flex-shrink: 0;
    width: 42px;
    height: 24px;
    border-radius: 999px;
    border: 1.5px solid var(--icon-faint);
    background: transparent;
    box-sizing: border-box;
    transition: background .28s cubic-bezier(0.32, 0.72, 0, 1), border-color .28s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .fluent-switch-thumb {
    position: absolute;
    top: 3px; left: 3px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--icon-faint);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform .28s cubic-bezier(0.34, 1.3, 0.64, 1), background .28s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .fluent-switch-on {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
  }
  .fluent-switch-on .fluent-switch-thumb {
    background: var(--bg-elevated);
    transform: translateX(18px);
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
  }
  :global([data-theme="dark"]) .logout-fab { background: var(--accent-primary); }
  :global([data-theme="light"]) .logout-fab { background: var(--accent-primary); }

  .logout-fab-icon {
    width: 18px; height: 18px;
    background: var(--bg-elevated);
  }
  :global([data-theme="dark"]) .logout-fab-icon { background: var(--text-on-accent); }
  :global([data-theme="dark"]) .logout-fab-label { color: var(--text-on-accent); }

  .logout-fab-label {
    font-size: 14px; font-weight: 700;
    color: var(--text-on-accent);
  }

  .logout-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0);
    transition: background .32s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .logout-overlay.logout-overlay-in { background: rgba(0,0,0,0.5); }
  .logout-dialog {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    background: var(--surface);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 81;
    min-width: 280px; max-width: 90vw;
    transition: transform .38s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .28s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .logout-dialog.logout-dialog-in { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  .logout-dialog-text { font-size: 16px; color: var(--text-primary); margin: 0 0 20px; text-align: center; font-family: inherit; }
  .logout-dialog-actions { display: flex; gap: 12px; justify-content: center; }
  .logout-btn-cancel, .logout-btn-confirm {
    flex: 1; padding: 12px 20px; border-radius: 12px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: background .2s cubic-bezier(0.32, 0.72, 0, 1), transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel { background: var(--btn-bg); color: var(--text-primary); }
  .logout-btn-cancel:active { background: var(--btn-bg-active); transform: scale(0.96); }
  .logout-btn-confirm { background: var(--accent-primary); color: var(--text-on-accent); }
  .logout-btn-confirm:active { background: var(--accent-primary-active); transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .me-row, .me-avatar-block, .me-install, .logout-fab,
    .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .pulse-tap, .fluent-switch, .fluent-switch-thumb { transition: none !important; }
  }
</style>