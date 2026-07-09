<!-- src/routes/home/components/AppHeader.svelte -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;
  export let onUpgrade;
  export let onOpenDrawer;

  // Props do perfil – devem ser fornecidas pela MainPage
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function handleUpgrade() { buzz(); onUpgrade?.(); }
  function handleMenu() { buzz(); onOpenDrawer?.(); }
</script>

<div class="top-panel" class:in={mounted} bind:this={topPanelEl}>
  <header class="header">
    <div class="header-inner">
      <img src="/icons/svg/logo.svg" alt="Nexa" class="logo-mark" />

      <div class="header-actions">
        <button class="upgrade-btn pulse-tap" on:click={handleUpgrade}>Atualizar</button>

        <button class="profile-btn pulse-tap" on:click={handleMenu}>
          {#if avatarUrl}
            <img src={avatarUrl} alt={userName} class="profile-img" />
          {:else}
            <span class="profile-initial">{userInitial}</span>
          {/if}
        </button>
      </div>
    </div>
  </header>
  <div class="header-elevate" style="opacity:{scrolled}"></div>
</div>

<style>
  .top-panel {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 15;
    display: flex;
    flex-direction: column;
    background: rgba(var(--header-glass-rgb), 0.74);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom-left-radius: 26px;
    border-bottom-right-radius: 26px;
    padding-bottom: 10px;
    opacity: 0;
    transform: translateY(-16px) translateZ(0);
    transition: opacity .5s cubic-bezier(0.16,1,0.3,1), transform .5s cubic-bezier(0.16,1,0.3,1);
    pointer-events: none;
    contain: layout style paint;
  }
  .top-panel.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .header-elevate {
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 1px;
    background: var(--border-soft);
    box-shadow: 0 8px 20px var(--drawer-shadow);
    pointer-events: none;
    transition: opacity .18s linear;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-top,0px) + 4px);
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 640px;
  }
  .logo-mark {
    height: 30px;
    width: auto;
    display: block;
    flex-shrink: 0;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
    filter: invert(0);
  }
  @media (prefers-color-scheme: dark) {
    .logo-mark { filter: invert(1); }
  }
  @media (min-width: 720px) {
    .logo-mark { height: 34px; }
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* Botão Atualizar */
  .upgrade-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1px;
    background: light-dark(#2a2a2a, #f5f5f5);
    color: light-dark(#ffffff, #1a1a1a);
    box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), box-shadow .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .upgrade-btn:active {
    background: light-dark(#1e1e1e, #e0e0e0);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
  }

  /* Botão de perfil minificado */
  .profile-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: light-dark(#2a2a2a, #f5f5f5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .profile-btn:active {
    background: light-dark(#1e1e1e, #e0e0e0);
    transform: scale(0.9);
  }
  .profile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .profile-initial {
    font-size: 15px;
    font-weight: 700;
    color: light-dark(#ffffff, #1a1a1a);
  }

  @media (hover:hover) and (pointer:fine) {
    .upgrade-btn:hover { background: light-dark(#3a3a3a, #ebebeb); }
    .profile-btn:hover { background: light-dark(#3a3a3a, #ebebeb); }
    .logo-mark:hover { transform: scale(1.05); }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-panel, .logo-mark, .upgrade-btn, .profile-btn, .header-elevate { transition: none !important; }
    .logo-mark:hover { transform: none; }
  }

  @media (min-width: 720px) {
    .top-panel { border-bottom-left-radius:0; border-bottom-right-radius:0; }
    .header-inner { max-width:760px; }
  }

  .pulse-tap {
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }
</style>