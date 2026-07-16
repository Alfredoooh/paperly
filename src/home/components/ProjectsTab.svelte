<!-- src/home/components/ProjectsTab.svelte -->
<script>
  export let projects = [];
</script>

<div class="projects-tab">
  {#if projects.length === 0}
    <div class="empty-state">
      <span class="empty-icon-mask" style="mask-image:url('/icons/svg/projects.svg');-webkit-mask-image:url('/icons/svg/projects.svg')"></span>
      <p class="empty-title">Ainda não tens projetos</p>
      <p class="empty-sub">Os teus projetos guardados vão aparecer aqui.</p>
    </div>
  {:else}
    <div class="projects-list">
      {#each projects as project}
        <button class="project-card">
          <span class="project-name">{project.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .projects-tab {
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
  .projects-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 6px;
  }
  .project-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--border-soft);
    background: var(--surface-apps-tab);
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .project-card:active {
    transform: scale(0.98);
    background: var(--row-active);
  }
  .project-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--drawer-text);
  }
</style>