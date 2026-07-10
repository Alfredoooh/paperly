<!-- src/home/components/CreateTab.svelte -->
<script>
  export let platformApps = [];
  
  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    window.location.href = app.path;
  }
</script>

<div class="create-tab">
  <div class="apps-grid">
    {#each platformApps as app}
      <button class="app-item" on:click={() => openApp(app)}>
        <img src={app.icon} alt={app.label} class="app-icon-img" />
        <span class="app-label">{app.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .create-tab {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 8px;
    padding-top: 6px;
  }
  .app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
  }
  .app-icon-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-item:active .app-icon-img {
    transform: scale(0.88);
  }
  .app-label {
    font-size: 11.5px;
    font-weight: 600;
    text-align: center;
    line-height: 1.25;
    max-width: 68px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
</style>