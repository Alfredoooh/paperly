<!-- src/home/components/ToolsTab.svelte -->
<script>
  export let tools = [];
  
  function openTool(tool) {
    if (tool?.path) window.location.href = tool.path;
  }
</script>

<div class="tools-tab">
  {#if tools.length === 0}
    <div class="empty-state">
      <span class="empty-icon-mask" style="mask-image:url('/icons/svg/tools.svg');-webkit-mask-image:url('/icons/svg/tools.svg')"></span>
      <p class="empty-title">Ainda sem ferramentas</p>
      <p class="empty-sub">As tuas ferramentas vão aparecer aqui.</p>
    </div>
  {:else}
    <div class="tools-grid">
      {#each tools as tool}
        <button class="tool-item" on:click={() => openTool(tool)}>
          <img src={tool.icon} alt={tool.label} class="tool-icon-img" />
          <span class="tool-label">{tool.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tools-tab {
    width: 100%;
    min-height: 60vh;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 22vh 24px 0;
    gap: 10px;
  }
  .empty-icon-mask {
    width: 44px;
    height: 44px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    margin-bottom: 6px;
  }
  .empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    margin: 0;
  }
  .empty-sub {
    font-size: 13.5px;
    color: var(--text-faint);
    margin: 0;
    max-width: 260px;
  }
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 18px 8px;
    padding-top: 6px;
  }
  .tool-item {
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
  .tool-icon-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tool-item:active .tool-icon-img {
    transform: scale(0.88);
  }
  .tool-label {
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