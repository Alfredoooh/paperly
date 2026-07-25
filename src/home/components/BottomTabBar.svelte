<script>
  import { TABS, AI_FAB } from '../lib/constants.js';

  export let activeTab = 'create';
  export let onSelect = () => {};
  export let onOpenAI = () => {};

  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  function select(tab) {
    buzz();
    if (tab.id === activeTab) return;
    window.dispatchEvent(new CustomEvent('nexa:close-longpress-menu'));
    onSelect(tab.id);
  }

  let fabPressed = false;
  function openAI() {
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
    fabPressed = true;
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
      on:click={openAI}
      aria-label={AI_FAB.label}
    >
      <span class="fab-icon-mask" style="mask-image:url('{AI_FAB.icon}');-webkit-mask-image:url('{AI_FAB.icon}')"></span>
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
    left: 0;
    right: 0;
    bottom: 0;
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
    background: color-mix(in srgb, var(--app-bg) 54%, black 46%);
    box-shadow: 0 -1px 0 rgba(255,255,255,0.04), 0 -10px 24px rgba(0,0,0,0.38);
  }

  :global([data-theme="dark"]) .tab-bar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -18px;
    height: 18px;
    background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.45));
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
    background: color-mix(in srgb, var(--app-bg) 54%, black 46%);
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
    color: #fff;
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
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    pointer-events: none;
  }

  .fab-btn {
    pointer-events: auto;
    width: 54px;
    height: 54px;
    margin-bottom: 2px;
    border: none;
    border-radius: 50%;
    background: var(--accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(0,0,0,0.24);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transform: translateY(-8px);
    transition: transform .18s cubic-bezier(0.32, 0.72, 0, 1), box-shadow .18s ease, background .18s ease;
  }

  .fab-btn.pressed {
    transform: translateY(-8px) scale(0.92);
  }

  .fab-icon-mask {
    width: 24px;
    height: 24px;
    display: block;
    background: #fff;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
</style>