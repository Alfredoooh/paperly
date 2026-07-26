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
    chevron: `${FLUENT_BASE}/chevron_right_20_regular.svg`,
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    settings: `${FLUENT_BASE}/settings_24_regular.svg`,
    person: `${FLUENT_BASE}/person_24_regular.svg`,
    bell: `${FLUENT_BASE}/alert_24_regular.svg`,
    help: `${FLUENT_BASE}/question_circle_24_regular.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
    moon: `${FLUENT_BASE}/weather_moon_24_regular.svg`,
  };

  const THEME_OPTIONS = [
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
    { id: 'system', label: 'Sistema' },
  ];

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

  function goSettings() {
    openSetting('settings');
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
    <span class="icon-mask me-avatar-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
  </button>

  {#if showInstall}
    <button class="me-install pulse-tap" on:click={handleInstall}>
      <span class="icon-mask" style="mask-image:url('{ICON.download}');-webkit-mask-image:url('{ICON.download}');width:22px;height:22px;background:#185ABD"></span>
      <span class="me-install-label">Instalar app</span>
    </button>
  {/if}

  <div class="section-label">Aparência</div>
  <div class="me-section">
    <div class="me-theme-row">
      <div class="me-theme-row-head">
        <span class="icon-mask" style="mask-image:url('{ICON.moon}');-webkit-mask-image:url('{ICON.moon}');width:22px;height:22px;background:var(--drawer-text)"></span>
        <span class="me-row-label">Tema</span>
      </div>
      <div class="me-theme-pills">
        {#each THEME_OPTIONS as opt}
          <button
            class="me-theme-choice"
            class:me-theme-choice-active={themeValue === opt.id}
            on:click={() => onApplyTheme(opt.id)}
          >{opt.label}</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="section-label">Conta</div>
  <div class="me-section">
    <button class="me-row native-tap" on:click={goProfile}>
      <span class="me-row-icon" style="mask-image:url('{ICON.person}');-webkit-mask-image:url('{ICON.person}')"></span>
      <span class="me-row-text">
        <span class="me-row-label">Perfil</span>
      </span>
      <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
    </button>
    <button class="me-row native-tap" on:click={goNotifications}>
      <span class="me-row-icon" style="mask-image:url('{ICON.bell}');-webkit-mask-image:url('{ICON.bell}')"></span>
      <span class="me-row-text">
        <span class="me-row-label">Notificações</span>
      </span>
      <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
    </button>
    <button class="me-row native-tap" on:click={goSettings}>
      <span class="me-row-icon" style="mask-image:url('{ICON.settings}');-webkit-mask-image:url('{ICON.settings}')"></span>
      <span class="me-row-text">
        <span class="me-row-label">Definições</span>
      </span>
      <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
    </button>
    <button class="me-row native-tap" on:click={goHelp}>
      <span class="me-row-icon" style="mask-image:url('{ICON.help}');-webkit-mask-image:url('{ICON.help}')"></span>
      <span class="me-row-text">
        <span class="me-row-label">Ajuda e suporte</span>
      </span>
      <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
    </button>
  </div>

  <div class="me-section me-section-danger">
    <button class="me-row me-row-danger native-tap" on:click={openLogoutDialog}>
      <span class="me-row-icon me-row-icon-danger" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}')"></span>
      <span class="me-row-text">
        <span class="me-row-label me-row-label-danger">Terminar sessão</span>
      </span>
    </button>
  </div>
</div>

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
    padding: calc(env(safe-area-inset-top, 0px) + 20px) 0 32px;
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
  .me-avatar-chevron {
    width: 18px; height: 18px; flex-shrink: 0; display: block;
    background: var(--icon-faint);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    opacity: 0.5;
  }

  .me-install {
    display: flex; align-items: center; gap: 10px;
    width: calc(100% - 28px); margin: 0 14px 20px; padding: 13px 16px;
    border-radius: 14px; border: 1px solid rgba(24,90,189,0.28);
    background: rgba(24,90,189,0.08);
    cursor: pointer; font: inherit;
  }
  .me-install-label { font-size: 14.5px; font-weight: 600; color: #185ABD; }

  .section-label {
    margin: 22px 20px 8px;
    font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px;
    text-transform: uppercase; color: var(--text-faint);
  }
  .me-tab > .section-label:first-of-type { margin-top: 4px; }

  .me-section {
    margin: 0 14px 0;
    border-radius: 16px;
    overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .me-section { background: var(--btn-bg); }

  .me-theme-row {
    padding: 14px 16px 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .me-theme-row-head { display: flex; align-items: center; gap: 12px; }
  .me-theme-pills {
    display: flex; gap: 6px;
    background: color-mix(in srgb, var(--btn-bg) 70%, transparent);
    border-radius: 10px;
    padding: 3px;
  }
  .me-theme-choice {
    flex: 1;
    padding: 8px 0;
    border: none; border-radius: 8px;
    background: transparent;
    font-size: 13px; font-weight: 600; font-family: inherit;
    color: var(--text-faint);
    cursor: pointer;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1), color .18s ease;
  }
  .me-theme-choice-active {
    background: var(--surface);
    color: var(--drawer-text);
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  .me-row {
    display: flex; align-items: center; gap: 14px;
    width: 100%; min-height: 58px; padding: 10px 16px;
    border: none; background: transparent; cursor: pointer; font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
    border-bottom: 1px solid var(--drawer-sep, rgba(127,127,127,0.14));
  }
  .me-row:last-child { border-bottom: none; }
  .me-row-icon {
    width: 24px; height: 24px; flex-shrink: 0; display: block;
    background: var(--icon-strong);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .me-row-icon-danger { background: #FF3B30; }
  .me-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; text-align: left; }
  .me-row-label {
    font-size: 15px; font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .me-row-label-danger { color: #FF3B30; }
  .me-row-chevron {
    width: 18px; height: 18px; flex-shrink: 0;
    background: var(--icon-faint);
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    opacity: 0.5;
  }

  .me-section-danger {
    margin-top: 22px;
    margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
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
  .logout-btn-confirm { background: #FF3B30; color: white; }
  .logout-btn-confirm:active { background: #E0342A; transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .me-row, .me-avatar-block, .me-install,
    .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .pulse-tap, .me-theme-choice { transition: none !important; }
  }
</style>