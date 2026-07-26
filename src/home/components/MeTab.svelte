<!-- src/home/components/MeTab.svelte -->
<!-- Tab "Eu": agora é apenas um ponto de entrada. O avatar não tem
     card — fica solto sobre o fundo do app, exatamente como pedido.
     Tudo o resto (conta, aparência, idioma, notificações, logout,
     etc.) vive agora dentro da SettingsPage — este tab só navega
     para lá e para o perfil. -->
<script>
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let userEmail = '';

  // Navegação: onOpenProfile segue EXATAMENTE a mesma lógica que
  // App.svelte já usa em openProfile() — dispatch('nav', {to:'profile'}).
  export let onOpenProfile = () => {};

  // Definições: leva para a SettingsPage, que agora concentra tudo.
  export let onOpenSettings = () => {};

  // Instalar app (PWA)
  export let showInstall = false;
  export let onInstall = () => {};

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    chevron: `${FLUENT_BASE}/chevron_right_20_regular.svg`,
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    settings: `${FLUENT_BASE}/settings_24_regular.svg`,
  };

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  function goProfile() {
    buzz();
    onOpenProfile();
  }

  function goSettings() {
    buzz();
    onOpenSettings('settings');
  }

  function handleInstall() {
    buzz();
    onInstall();
  }
</script>

<div class="me-tab">
  <!-- Bloco de avatar + nome: SEM card — solto sobre o fundo do app,
       sem background, sem border-radius de superfície, só o próprio
       avatar circular + texto. Único elemento que fica "descoberto". -->
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

  <!-- Único ponto de entrada para tudo o resto: aparência, conta,
       notificações, privacidade, idioma, armazenamento, logout — tudo
       agora vive dentro da SettingsPage. -->
  <div class="me-section">
    <button class="me-row native-tap" on:click={goSettings}>
      <span class="me-row-icon" style="mask-image:url('{ICON.settings}');-webkit-mask-image:url('{ICON.settings}')"></span>
      <span class="me-row-text">
        <span class="me-row-label">Definições</span>
        <span class="me-row-sublabel">Aparência, conta, notificações e mais</span>
      </span>
      <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
    </button>
  </div>
</div>

<style>
  .me-tab {
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 20px) 0 32px;
  }

  /* ---------- Bloco de avatar: SEM CARD ----------
     Sem background, sem border-radius de superfície — apenas
     padding/gap para respiro, exatamente como pedido: "não vai
     aparecer que não tem card". */
  .me-avatar-block {
    display: flex;
    align-items: center;
    gap: 14px;
    width: calc(100% - 28px);
    margin: 0 14px 18px;
    padding: 4px 2px;
    border-radius: 0;
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
    font-size: 19px;
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

  /* ---------- Secção "Definições" (único item) ---------- */
  .me-section {
    margin: 0 14px 0;
    border-radius: 14px;
    overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .me-section {
    background: var(--btn-bg);
  }

  .me-row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 64px;
    padding: 12px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
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

  @media (prefers-reduced-motion: reduce) {
    .me-row, .me-avatar-block, .me-install, .pulse-tap { transition: none !important; }
  }
</style>