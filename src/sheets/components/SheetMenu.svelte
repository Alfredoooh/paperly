<!-- components/SheetMenu.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { iconWithFallback } from '../lib/icon-fallback.js';
  
  export let visible = false;
  export let anchor = { top: 0, right: 0 };
  export let c;
  
  const dispatch = createEventDispatcher();
  
  const ITEMS = [
    { id: 'duplicate', label: 'Duplicar', icon: 'duplicate' },
    { id: 'export', label: 'Exportar CSV', icon: 'export' },
    { id: 'delete', label: 'Apagar', icon: 'delete', danger: true },
  ];
  
  function select(id) {
    dispatch('select', id);
  }
</script>

{#if visible}
  <button class="anchor-overlay" on:click={() => dispatch('close')} aria-label="Fechar menu"></button>
  <div class="anchor-menu" style="background:{c.dialogBackground}; border-color:{c.divider}; top:{anchor.top}px; right:{anchor.right}px;">
    {#each ITEMS as item, i}
      <button class="anchor-item" class:anchor-danger={item.danger} style={item.danger ? '' : `color:${c.textPrimary}`} on:click={() => select(item.id)}>
        <img
          src="/icons/svg/docs/{item.icon}.svg"
          use:iconWithFallback={item.icon}
          class="anchor-icon"
          style={item.danger ? 'filter: invert(20%) sepia(90%) saturate(4000%) hue-rotate(350deg);' : ''}
          alt=""
        />
        <span>{item.label}</span>
      </button>
      {#if i < ITEMS.length - 1}
        <div class="anchor-divider" style="background:{c.divider}"></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .anchor-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: transparent; border: none; cursor: default; width: 100%; height: 100%;
  }
  .anchor-menu {
    position: fixed;
    min-width: 200px;
    border-radius: 18px;
    border: 1px solid;
    padding: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.16);
    z-index: 81;
    transform-origin: top right;
    animation: anchorPop .26s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  @keyframes anchorPop {
    0% { transform: scale(0.85) translateY(-6px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .anchor-item {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 13px 14px; border-radius: 12px;
    font-size: 15px; font-weight: 500; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: background .12s;
  }
  .anchor-item:active { background: rgba(127,127,127,0.10); }
  .anchor-danger { color: #C42B1C; }
  .anchor-divider { height: 1px; margin: 0 10px; }

  .anchor-icon { width: 18px; height: 18px; flex-shrink: 0; display: block; object-fit: contain; }

  @media (prefers-reduced-motion: reduce) {
    .anchor-menu { animation: none; }
  }
</style>