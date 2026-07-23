<!-- src/home/components/MeTab.svelte -->
<script>
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let userEmail = '';
  export let onOpenSettings = () => {};
  export let onLogout = () => {};
  
  import { localIconPath } from '$shared/local-icon.js';

  const ICON = {
    settings: localIconPath('settings_24_regular'),
    shield: localIconPath('shield_24_regular'),
    bell: localIconPath('alert_24_regular'),
    help: localIconPath('question_circle_24_regular'),
    signout: localIconPath('arrow_exit_24_regular'),
    chevron: localIconPath('chevron_right_24_regular'),
  };
  
  const menuItems = [
    { id: 'settings', label: 'Definições', icon: ICON.settings, action: () => onOpenSettings('settings') },
    { id: 'privacy', label: 'Privacidade e segurança', icon: ICON.shield, action: () => onOpenSettings('privacy') },
    { id: 'notifications', label: 'Notificações', icon: ICON.bell, action: () => onOpenSettings('notifications') },
    { id: 'help', label: 'Ajuda e suporte', icon: ICON.help, action: () => onOpenSettings('help') },
  ];
  
  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  
  function handleItem(item) {
    buzz();
    item.action();
  }
  
  function handleLogout() {
    buzz();
    onLogout();
  }
</script>

<div class="me-tab">
  <div class="me-profile">
    <div class="me-avatar">
      {#if avatarUrl}
        <img src={avatarUrl} alt={userName} class="me-avatar-img" />
      {:else}
        <span class="me-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
      {/if}
    </div>
    <p class="me-name">{userName}</p>
    {#if userEmail}
      <p class="me-email">{userEmail}</p>
    {/if}
  </div>

  <div class="me-section">
    {#each menuItems as item (item.id)}
      <button class="me-row native-tap" on:click={() => handleItem(item)}>
        <span class="me-row-icon" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}')"></span>
        <span class="me-row-label">{item.label}</span>
        <span class="me-row-chevron" style="mask-image:url('{ICON.chevron}');-webkit-mask-image:url('{ICON.chevron}')"></span>
      </button>
    {/each}
  </div>

  <div class="me-section">
    <button class="me-row me-row-danger native-tap" on:click={handleLogout}>
      <span class="me-row-icon me-row-icon-danger" style="mask-image:url('{ICON.signout}');-webkit-mask-image:url('{ICON.signout}')"></span>
      <span class="me-row-label me-row-label-danger">Terminar sessão</span>
    </button>
  </div>
</div>

<style>
  .me-tab {
    width: 100%;
    padding: 8px 0 32px;
  }

  .me-profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 28px 20px 24px;
  }
  .me-avatar {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
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
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }
  .me-name {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.2px;
    color: var(--drawer-text);
  }
  .me-email {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-faint);
  }

  .me-section {
    margin: 0 14px 20px;
    border-radius: 14px;
    overflow: hidden;
    background: var(--drawer-bg);
  }

  .me-row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    height: 56px;
    padding: 0 16px;
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
    width: 36px;
    height: 36px;
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
  .me-row-label {
    flex: 1;
    text-align: left;
    font-size: 15px;
    font-weight: 500;
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
</style>