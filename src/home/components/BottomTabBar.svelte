<!-- src/home/components/BottomTabBar.svelte -->
<script>
  import { TABS, AI_FAB } from '../lib/constants.js';
  
  export let activeTab = 'create';
  export let onSelect = () => {};
  export let onOpenAI = () => {};
  
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  
  let fabBtnEl;
  export function getFabRect() {
    return fabBtnEl ? fabBtnEl.getBoundingClientRect() : null;
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  
  function select(tab) {
    buzz();
    if (tab.id === activeTab) return;
    onSelect(tab.id);
  }

  // Ícone do FAB gira em torno de si mesmo (direita → esquerda,
  // sentido anti-horário) a cada clique.
  let fabPressed = false;
  let fabRotation = 0;
  function openAI() {
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
    fabPressed = true;
    fabRotation -= 360;
    setTimeout(() => { fabPressed = false; }, 150);
    onOpenAI();
  }
</script>

<nav class="tab-bar">
  {#each TABS.slice(0, 2) as tab}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      on:click={() => select(tab)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon" class:tab-icon-avatar={tab.isAvatar}>
        {#if tab.isAvatar}
          <span class="tab-avatar" class:active={activeTab === tab.id}>
            {#if avatarUrl}
              <img src={avatarUrl} alt={tab.label} class="tab-avatar-img" />
            {:else}
              <span class="tab-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
            {/if}
          </span>
        {:else}
          <span
            class="icon-mask"
            style="mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}');-webkit-mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}')"
          ></span>
        {/if}
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}

  <div class="fab-slot" aria-hidden="true">
    <button
      class="fab-btn"
      class:pressed={fabPressed}
      bind:this={fabBtnEl}
      on:click={openAI}
      aria-label={AI_FAB.label}
    >
      <img class="fab-icon" src={AI_FAB.icon} alt={AI_FAB.label} style="transform: rotate({fabRotation}deg);" />
    </button>
  </div>

  {#each TABS.slice(2) as tab}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      on:click={() => select(tab)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon" class:tab-icon-avatar={tab.isAvatar}>
        {#if tab.isAvatar}
          <span class="tab-avatar" class:active={activeTab === tab.id}>
            {#if avatarUrl}
              <img src={avatarUrl} alt={tab.label} class="tab-avatar-img" />
            {:else}
              <span class="tab-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
            {/if}
          </span>
        {:else}
          <span
            class="icon-mask"
            style="mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}');-webkit-mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}')"
          ></span>
        {/if}
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    display: flex;
    align-items: stretch;
    justify-content: space-around;

    background: rgb(var(--header-glass-rgb));
    background-clip: padding-box;

    border-top: none;
    box-shadow: none;

    padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px);
    contain: layout paint style;
    touch-action: pan-y;

    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  :global([data-theme="dark"]) .tab-bar {
    background: var(--app-bg);
    border-top: 1px solid var(--border-soft);
  }

  :global([data-theme="dark"]) .tab-bar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -18px;
    height: 18px;
    background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.22));
    pointer-events: none;
    z-index: 0;
  }

  .tab-bar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -40px;
    height: 40px;
    background: rgb(var(--header-glass-rgb));
    z-index: -1;
  }

  :global([data-theme="dark"]) .tab-bar::after {
    background: var(--app-bg);
  }

  .tab-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 42px;
    border: none;
    background: transparent;
    color: var(--icon-faint);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
  }

  .tab-btn.active { color: var(--accent-primary); }

  .tab-icon {
    position: relative;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .18s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .tab-icon-avatar {
    width: 26px;
    height: 26px;
  }

  .tab-btn:active .tab-icon {
    transform: scale(0.88);
  }

  .icon-mask {
    position: absolute;
    inset: 0;
    display: block;
    background: currentColor;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: opacity .18s ease;
  }

  .tab-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid transparent;
    transition: border-color .18s ease;
  }
  .tab-avatar.active {
    border-color: var(--accent-primary);
  }
  .tab-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .tab-avatar-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--icon-strong);
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    opacity: 0.7;
    transition: opacity .18s ease, font-weight .18s ease;
  }
  .tab-btn.active .tab-label {
    opacity: 1;
    font-weight: 700;
  }

  .fab-slot {
    position: relative;
    z-index: 1;
    flex: 1;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-btn {
    position: relative;
    z-index: 1;
    width: 44px;
    height: 40px;
    border-radius: 0;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    box-shadow: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .fab-btn.pressed,
  .fab-btn:active {
    transform: scale(0.90);
  }
  .fab-icon {
    width: 30px;
    height: 30px;
    object-fit: contain;
    display: block;
    pointer-events: none;
    transition: transform .5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-mask, .tab-label, .tab-icon, .fab-btn, .fab-icon { transition: none !important; }
  }
</style>