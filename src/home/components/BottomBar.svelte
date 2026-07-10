<!-- src/home/components/BottomTabBar.svelte -->
<script>
  import { TABS } from '../lib/constants.js';
  
  export let activeTab = 'home';
  export let onSelect = () => {};
  
  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  
  function select(id) {
    if (id === activeTab) return;
    buzz();
    onSelect(id);
  }
</script>

<nav class="tab-bar">
  {#each TABS as tab}
    <button
      class="tab-btn pulse-tap"
      class:active={activeTab === tab.id}
      on:click={() => select(tab.id)}
      aria-label={tab.label}
    >
      <span class="tab-icon">
        {#if tab.id === 'home'}
          {#if activeTab === 'home'}
            <!-- home filled -->
            <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor">
              <path d="M12 2.6 2 11h3v9.4h5.4v-6.2h3.2v6.2H19V11h3L12 2.6Z"/>
            </svg>
          {:else}
            <!-- home outline -->
            <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.6v-6.6H9.6V21H5a1 1 0 0 1-1-1V10.6Z"/>
            </svg>
          {/if}
        {:else if tab.id === 'images'}
          {#if activeTab === 'images'}
            <!-- image filled -->
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3.5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 18l5-5.5 3 3 4-5L20 18H4Z"/>
            </svg>
          {:else}
            <!-- image outline -->
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4.5" width="18" height="15" rx="2"/>
              <circle cx="8.3" cy="9.3" r="1.6"/>
              <path d="m4 17 4.7-5 3.3 3.3 3.5-4.3L21 16.5"/>
            </svg>
          {/if}
        {:else}
          {#if activeTab === 'documents'}
            <!-- document filled -->
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5Z"/>
            </svg>
          {:else}
            <!-- document outline -->
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2.75h7.5L19 8.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 19.5V4.5A1.75 1.75 0 0 1 6 2.75Z"/>
              <path d="M13 2.75V8h5"/>
              <path d="M7.5 13h5M7.5 16.3h5"/>
            </svg>
          {/if}
        {/if}
      </span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: rgba(var(--header-glass-rgb), 0.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-top: 0.5px solid var(--border-soft);
    padding-top: 8px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  }
  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--icon-faint);
    cursor: pointer;
    transition: color .18s cubic-bezier(0.16,1,0.3,1);
  }
  .tab-btn.active {
    color: var(--icon-strong);
  }
  .tab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pulse-tap:active { transform: scale(0.88); }
</style>