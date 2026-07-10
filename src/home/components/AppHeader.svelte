<!-- src/home/components/AppHeader.svelte -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;
  export let onOpenDrawer;
  
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  
  export let title = '';
  
  // toggle nativo (usado apenas no tab "Templates")
  export let showToggle = false;
  export let toggleOptions = []; // [{id,label}]
  export let toggleValue = '';
  export let onToggleChange = () => {};
  
  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  
  function handleMenu() {
    buzz();
    if (window.AndroidDrawer && typeof window.AndroidDrawer.openAccountDrawer === 'function') {
      window.AndroidDrawer.openAccountDrawer();
    } else {
      onOpenDrawer?.();
    }
  }
  
  function selectToggle(id) {
    if (id === toggleValue) return;
    buzz();
    onToggleChange(id);
  }
  
  $: toggleIndex = Math.max(0, toggleOptions.findIndex(o => o.id === toggleValue));
</script>

<div class="top-panel" class:in={mounted} bind:this={topPanelEl}>
  <header class="header">
    <div class="header-inner">
      <h1 class="header-title">{title}</h1>
      <button class="profile-btn pulse-tap" on:click={handleMenu}>
        {#if avatarUrl}
          <img src={avatarUrl} alt={userName} class="profile-img" />
        {:else}
          <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
        {/if}
      </button>
    </div>

    {#if showToggle && toggleOptions.length > 0}
      <div class="segmented" style="--count:{toggleOptions.length}">
        <div class="segmented-thumb" style="--index:{toggleIndex}"></div>
        {#each toggleOptions as opt}
          <button
            class="segmented-opt"
            class:active={toggleValue === opt.id}
            on:click={() => selectToggle(opt.id)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    {/if}
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
    flex-direction: column;
    gap: 10px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 16px calc(env(safe-area-inset-top,0px) + 4px);
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 640px;
  }

  .header-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: var(--icon-strong);
    margin: 0;
  }

  .profile-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--btn-solid-bg);
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
    background: var(--btn-solid-bg-active);
    transform: scale(0.9);
  }
  .profile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .profile-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }

  .segmented {
    position: relative;
    display: flex;
    width: 100%;
    max-width: 640px;
    background: var(--btn-bg);
    border-radius: 12px;
    padding: 3px;
  }
  .segmented-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--count));
    height: calc(100% - 6px);
    border-radius: 9px;
    background: var(--btn-solid-bg);
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    transform: translateX(calc(var(--index) * 100%));
    transition: transform .38s cubic-bezier(0.34, 1.2, 0.4, 1);
  }
  .segmented-opt {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 8px 4px;
    border: none;
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
    cursor: pointer;
    border-radius: 9px;
    transition: color .22s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .segmented-opt.active {
    color: var(--btn-solid-text);
  }

  @media (hover:hover) and (pointer:fine) {
    .profile-btn:hover { background: var(--btn-solid-bg-active); }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-panel, .profile-btn, .header-elevate, .segmented-thumb { transition: none !important; }
  }

  @media (min-width: 720px) {
    .header-inner, .segmented { max-width:760px; }
  }

  .pulse-tap {
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }
</style>