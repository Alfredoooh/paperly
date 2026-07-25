<!-- src/home/components/MeTab.svelte -->
<!-- Tab "Eu": absorve TODA a lógica que antes vivia em AppDrawer.svelte
     (perfil, tema, ajuda, outros, definições, logout com dialog de
     confirmação e window.AndroidSession.onLogout()). O AppDrawer foi
     eliminado — este tab tem agora tudo o que ele tinha, e mais
     secções de definições reais (conta, notificações, privacidade,
     armazenamento, idioma, sobre), ao estilo de configurações
     Microsoft/M3, em vez do menu minimalista de 4 linhas anterior. -->
<script>
  import { THEME_OPTIONS } from '../lib/constants.js';

  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let userEmail = '';

  // Tema: mesma prop/callback que o AppDrawer recebia
  // (themeValue + onApplyTheme), agora aqui.
  export let themeValue = 'dark';
  export let onApplyTheme = () => {};

  // Navegação: onOpenProfile segue EXATAMENTE a mesma lógica que
  // App.svelte já usa em openProfile() — dispatch('nav', {to:'profile'}).
  // Passada como prop a partir de App.svelte para não duplicar a
  // física de fecho de overlays/histórico que lá existe.
  export let onOpenProfile = () => {};

  // Definições: cada item chama onOpenSettings(id) — o próprio
  // App.svelte decide o que fazer com cada id (abrir rota, modal, etc).
  export let onOpenSettings = () => {};

  export let onLogout = () => {};

  // Instalar app (PWA): mesma prop que o AppDrawer usava.
  export let showInstall = false;
  export let onInstall = () => {};

  // Ícones da biblioteca oficial Fluent System Icons (Microsoft) via
  // CDN — mesmo padrão usado em TemplatePreviewPage.svelte e agora
  // também no header do CreateTab.
  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    chevron: `${FLUENT_BASE}/chevron_right_20_regular.svg`,
    info: `${FLUENT_BASE}/info_24_regular.svg`,
    more: `${FLUENT_BASE}/more_horizontal_24_regular.svg`,
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    settings: `${FLUENT_BASE}/settings_24_regular.svg`,
    signout: `${FLUENT_BASE}/arrow_exit_24_regular.svg`,
    person: `${FLUENT_BASE}/person_24_regular.svg`,
    shield: `${FLUENT_BASE}/shield_24_regular.svg`,
    bell: `${FLUENT_BASE}/alert_24_regular.svg`,
    storage: `${FLUENT_BASE}/database_24_regular.svg`,
    globe: `${FLUENT_BASE}/globe_24_regular.svg`,
    help: `${FLUENT_BASE}/question_circle_24_regular.svg`,
  };

  // Secção "Conta" — definições diretamente relacionadas com o perfil.
  const accountItems = [
    { id: 'account', label: 'Conta', sublabel: 'Editar perfil, email, palavra-passe', icon: ICON.person },
    { id: 'privacy', label: 'Privacidade e segurança', sublabel: null, icon: ICON.shield },
    { id: 'notifications', label: 'Notificações', sublabel: null, icon: ICON.bell },
  ];

  // Secção "Preferências" — armazenamento, idioma.
  const preferenceItems = [
    { id: 'storage', label: 'Armazenamento', sublabel: null, icon: ICON.storage },
    { id: 'language', label: 'Idioma', sublabel: 'Português (Portugal)', icon: ICON.globe },
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

  function goOthers() {
    openSetting('others');
  }

  function goSettings() {
    openSetting('settings');
  }

  // ------------------------------------------------------------------
  // Logout: MESMA lógica que existia em AppDrawer.svelte — dialog de
  // confirmação com transição de entrada/saída via classes, e chamada
  // a window.AndroidSession.onLogout() depois de onLogout(), para o
  // wrapper nativo (Kotlin/WebView) ficar a par do fim de sessão.
  // ------------------------------------------------------------------
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
  <!-- Bloco de avatar + nome: EXATAMENTE a mesma lógica de navegação
       para o perfil que o AppDrawer tinha em goProfile()/onOpenProfile. -->
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

  <!-- Grupo M3: Ajuda / Tema / Outros — mesmo padrão visual de cantos
       (18px nas pontas, 5px nas junções internas) que o AppDrawer
       usava no seu .m3-group, agora aqui. -->
  <div class="section-label">Aparência</div>
  <div class="m3-group">
    <button class="m3-item m3-item-first pulse-tap" on:click={goHelp}>
      <span class="icon-mask" style="mask-image:url('{ICON.info}');-webkit-mask-image:url('{ICON.info}');width:24px;height:24px;background:var(--drawer-text)"></span>
      <span class="drawer-item-label" style="flex:1">Ajuda</span>
    </button>

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
      <div class="theme-labels">
        {#each THEME_OPTIONS as opt}
          <span class="theme-label" class:theme-label-active={themeValue === opt.id}>{opt.label}</span>
        {/each}
      </div>
    </div>

    <button class="m3-item m3-item-last pulse-tap" on:click={goOthers}>
      <span class="icon-mask" style="mask-image:url('{ICON.more}');-webkit-mask-image:url('{ICON.more}');width:24px;height:24px;background:var(--drawer-text)"></span>
      <span class="drawer-item-label" style="flex:1">Outros</span>
    </button>
  </div>

  <!-- Secção Conta -->
  <div class="section-label">Conta</div>
  <div class="me-section">
    {#each accountItems as item (item.id)}
      <button class="me-row native-tap" on:click={() => openSetting(item.id)}>
        <span class="me-row-icon" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}')"></span>
        <span class="me-row-text">
          <span class="me-row-label">{item.label}</span>
          {#if item.sublabel}
            <span class="me-row-sublabel">{item.sublabel}</span>
          {/if}
        </span>
        <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
      </button>
    {/each}
  </div>

  <!-- Secção Preferências -->
  <div class="section-label">Preferências</div>
  <div class="me-section">
    {#each preferenceItems as item (item.id)}
      <button class="me-row native-tap" on:click={() => openSetting(item.id)}>
        <span class="me-row-icon" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}')"></span>
        <span class="me-row-text">
          <span class="me-row-label">{item.label}</span>
          {#if item.sublabel}
            <span class="me-row-sublabel">{item.sublabel}</span>
          {/if}
        </span>
        <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
      </button>
    {/each}
  </div>

  <!-- Secção Definições + Ajuda e suporte -->
  <div class="section-label">Geral</div>
  <div class="me-section">
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

  <!-- Logout: mesmo botão + dialog de confirmação que o AppDrawer tinha. -->
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

  /* ---------- Bloco de avatar (navega para o perfil) ---------- */
  .me-avatar-block {
    display: flex;
    align-items: center;
    gap: 14px;
    width: calc(100% - 28px);
    margin: 0 14px 18px;
    padding: 16px;
    border-radius: 18px;
    border: none;
    background: var(--drawer-bg);
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  :global([data-theme="dark"]) .me-avatar-block {
    background: var(--btn-bg);
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
  .me-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .me-avatar-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: #fff;
  }
  .me-identity {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .me-name {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.2px;
    color: var(--drawer-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .me-email {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .me-avatar-chevron {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: block;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    opacity: 0.5;
  }

  /* ---------- Instalar app ---------- */
  .me-install {
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(100% - 28px);
    margin: 0 14px 18px;
    padding: 13px 16px;
    border-radius: 14px;
    border: 1px solid rgba(24,90,189,0.28);
    background: rgba(24,90,189,0.08);
    cursor: pointer;
    font: inherit;
  }
  .me-install-label {
    font-size: 14.5px;
    font-weight: 600;
    color: #185ABD;
  }

  .section-label {
    margin: 22px 20px 8px;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .me-tab > .section-label:first-of-type {
    margin-top: 4px;
  }

  /* ---------- Grupo M3 (Ajuda / Tema / Outros) ----------
     Mesmo padrão de cantos que o AppDrawer usava: pontas externas do
     grupo a 18px, junções internas a 5px, gap de 2px sem linha
     divisória. */
  .m3-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 14px;
  }
  .m3-item {
    width: 100%;
    background: color-mix(in srgb, var(--btn-bg) 55%, transparent);
  }
  .m3-item-first {
    border-radius: 18px 18px 5px 5px;
  }
  .m3-item-mid {
    border-radius: 5px;
  }
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
  .drawer-item-label {
    font-size: 15px;
    font-weight: 400;
    color: var(--drawer-text);
  }

  .theme-section {
    padding: 14px 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  .theme-labels {
    display: flex;
    gap: 8px;
  }
  .theme-label {
    flex: 1;
    text-align: center;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-faint);
  }
  .theme-label-active {
    font-weight: 700;
    color: var(--drawer-text);
  }

  /* ---------- Secções de linhas (Conta / Preferências / Geral) ---------- */
  .me-section {
    margin: 0 14px 0;
    border-radius: 14px;
    overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .me-section {
    background: var(--btn-bg);
  }
  .me-section-danger {
    margin-top: 22px;
    margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  }

  .me-row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 58px;
    padding: 10px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
    border-bottom: 1px solid var(--drawer-sep, rgba(127,127,127,0.14));
  }
  .me-row:last-child {
    border-bottom: none;
  }
  .me-row-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .me-row-icon-danger {
    background: #FF3B30;
  }
  .me-row-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    text-align: left;
  }
  .me-row-label {
    font-size: 15px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .me-row-sublabel {
    font-size: 12.5px;
    font-weight: 400;
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .me-row-label-danger {
    color: #FF3B30;
  }
  .me-row-chevron {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    opacity: 0.5;
  }

  .native-tap:active {
    background: var(--row-active, rgba(127,127,127,0.08));
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.97); opacity: .85; }

  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  /* ---------- Dialog de confirmação de logout: EXATAMENTE o mesmo
     que o AppDrawer.svelte tinha. ---------- */
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

  @media (prefers-reduced-motion: reduce) {
    .me-row, .theme-card, .m3-item, .me-avatar-block, .me-install,
    .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm,
    .pulse-tap { transition: none !important; }
  }
</style>