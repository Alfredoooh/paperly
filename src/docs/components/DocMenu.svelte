<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let anchor = { top: 0, right: 0 }; // mantido por compatibilidade, já não é usado para posicionar
  export let c;
  export let isDark = false;

  const dispatch = createEventDispatcher();

  const ITEMS = [
    { id: 'duplicate', label: 'Duplicar', icon: 'copy_24_regular' },
    { id: 'share', label: 'Partilhar', icon: 'share_24_regular' },
    { id: 'export', label: 'Exportar', icon: 'arrow_export_24_regular' },
    { id: 'delete', label: 'Apagar', icon: 'delete_24_regular', danger: true },
  ];

  // ── Bottom sheet: sobe do fundo, mesmo padrão de spring usado no
  //    resto do app (FormatModal, ExportPickerPage). Fundo SEMPRE
  //    branco puro (#FFFFFF) no tema claro — nunca usa c.dialogBackground
  //    aqui, que noutros sítios do app pode vir ligeiramente
  //    acinzentado.
  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;
  let lastVisible = false;

  $: if (visible && !lastVisible) {
    lastVisible = true;
    openSheet();
  } else if (!visible && lastVisible) {
    lastVisible = false;
    closeSheet();
  }

  function openSheet() {
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlayVisible = true;
      slide.open();
    }));
  }
  function closeSheet() {
    overlayVisible = false;
    slide.close();
    setTimeout(() => { showSheet = false; }, 300);
  }
  function close() { dispatch('close'); }

  function select(id) {
    dispatch('select', id);
  }

  $: sheetModalBg = isDark ? c.dialogBackground : '#FFFFFF';

  onDestroy(() => { unsubscribe?.(); slide.destroy?.(); });
</script>

{#if showSheet}
  <button
    class="dm-overlay"
    class:dm-overlay-in={overlayVisible}
    on:click={close}
    aria-label="Fechar menu"
  ></button>
  <div class="dm-sheet" style="background:{sheetModalBg}; transform: translate3d(0, {sheetY}%, 0);">
    <div class="dm-handle" style="background:{c.divider}"></div>
    {#each ITEMS as item, i}
      <button class="dm-item" class:dm-danger={item.danger} style={item.danger ? '' : `color:${c.textPrimary}`} on:click={() => select(item.id)}>
        <span class="icon-mask" style="mask-image:url('{localIconPath(item.icon)}');-webkit-mask-image:url('{localIconPath(item.icon)}');background:{item.danger ? 'var(--danger)' : c.iconTint};width:24px;height:24px;"></span>
        <span>{item.label}</span>
      </button>
      {#if i < ITEMS.length - 1}
        <div class="dm-divider" style="background:{c.divider}"></div>
      {/if}
    {/each}
    <div class="dm-safe-bottom"></div>
  </div>
{/if}

<style>
  .dm-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0);
    border: none; cursor: default; width: 100%; height: 100%;
    transition: background .3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .dm-overlay-in { background: rgba(0,0,0,0.45); }

  .dm-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 81;
    border-radius: 20px 20px 0 0;
    padding: 8px 8px 4px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    transition: transform .34s cubic-bezier(0.32, 0.72, 0, 1);
    max-height: 70vh;
    overflow-y: auto;
  }
  .dm-handle {
    width: 36px; height: 4px; border-radius: 2px;
    margin: 6px auto 10px;
  }
  .dm-item {
    width: 100%; display: flex; align-items: center; gap: 14px;
    background: none; border: none; padding: 15px 14px; border-radius: 14px;
    font-size: 16px; font-weight: 500; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: background .12s;
  }
  .dm-item:active { background: rgba(127,127,127,0.10); }
  .dm-danger { color: var(--danger); }
  .dm-divider { height: 1px; margin: 0 10px; }
  .dm-safe-bottom { height: env(safe-area-inset-bottom, 0px); }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .dm-overlay, .dm-sheet { transition: none !important; }
  }
</style>