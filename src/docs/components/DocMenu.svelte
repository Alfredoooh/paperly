<script>
  import { createEventDispatcher } from 'svelte';
  
  // Popup ancorado ao botão more_vert (não mais um dropdown de canto
  // fixo). A posição vem do MainPage, calculada a partir do
  // getBoundingClientRect() do próprio botão.
  export let visible = false;
  export let anchor = { top: 0, right: 0 };
  export let c;
  
  const dispatch = createEventDispatcher();
  
  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';
  
  const ITEMS = [
    { id: 'duplicate', label: 'Duplicar', icon: 'copy_24_regular' },
    { id: 'share', label: 'Partilhar', icon: 'share_24_regular' },
    { id: 'export', label: 'Exportar', icon: 'arrow_export_24_regular' },
    { id: 'delete', label: 'Apagar', icon: 'delete_24_regular', danger: true },
  ];
  
  function select(id) {
    dispatch('select', id);
  }
</script>

{#if visible}
  <button class="anchor-overlay" on:click={() => dispatch('close')} aria-label="Fechar menu"></button>
  <div class="anchor-menu" style="background:{c.dialogBackground}; top:{anchor.top}px; right:{anchor.right}px;">
    {#each ITEMS as item, i}
      <button class="anchor-item" class:anchor-danger={item.danger} style={item.danger ? '' : `color:${c.textPrimary}`} on:click={() => select(item.id)}>
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}{item.icon}.svg');-webkit-mask-image:url('{FLUENT_CDN}{item.icon}.svg');background:{item.danger ? '#FF3B30' : c.iconTint};width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
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
  .anchor-danger { color: #FF3B30; }
  .anchor-divider { height: 1px; margin: 0 10px; }

  .icon-mask { flex-shrink: 0; }

  @media (prefers-reduced-motion: reduce) {
    .anchor-menu { animation: none; }
  }
</style>