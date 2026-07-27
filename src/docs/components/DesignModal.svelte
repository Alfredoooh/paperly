<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let isDark = false;
  export let activeTool = null;

  const dispatch = createEventDispatcher();

  const TOOLS = [
    { id: 'pencil', label: 'Lápis', src: localIconPath('pen_24_regular') },
    { id: 'crayon', label: 'Marcador', src: localIconPath('calligraphy_pen_24_regular') },
    { id: 'paintbrush', label: 'Pincel', src: localIconPath('paint_brush_24_regular') },
    { id: 'artistpalette', label: 'Paleta', src: localIconPath('color_24_regular') },
    { id: 'straightruler', label: 'Régua', src: localIconPath('ruler_24_regular') },
    { id: 'triangularruler', label: 'Esquadro', src: localIconPath('triangle_24_regular') },
    { id: 'scissors', label: 'Tesoura', src: localIconPath('cut_24_regular') },
    { id: 'eraser', label: 'Borracha', src: localIconPath('eraser_24_regular') },
    { id: 'mechanicalpencil', label: 'Lapiseira', src: localIconPath('edit_24_regular') },
  ];

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

  function select(item) {
    dispatch('select', item.id);
  }

  $: sheetModalBg = isDark ? c.dialogBackground : '#FFFFFF';

  onDestroy(() => { unsubscribe?.(); slide.destroy?.(); });
</script>

{#if showSheet}
  <button
    class="dg-overlay"
    class:dg-overlay-in={overlayVisible}
    on:click={close}
    aria-label="Fechar equipamentos de design"
  ></button>
  <div class="dg-sheet" style="background:{sheetModalBg}; transform: translate3d(0, {sheetY}%, 0);">
    <div class="dg-handle" style="background:{c.divider}"></div>
    <h3 class="dg-title" style="color:{c.textPrimary}">Design</h3>
    <div class="dg-grid">
      {#each TOOLS as item}
        <button
          class="dg-item"
          class:dg-active={activeTool === item.id}
          on:click={() => select(item)}
          aria-label={item.label}
        >
          <span class="dg-icon-wrap">
            <span class="icon-mask dg-icon" style="mask-image:url('{item.src}');-webkit-mask-image:url('{item.src}');background:{c.iconTint};"></span>
          </span>
          <span class="dg-label" style="color:{c.textPrimary}">{item.label}</span>
        </button>
      {/each}
    </div>
    <div class="dg-safe-bottom"></div>
  </div>
{/if}

<style>
  .dg-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0);
    border: none; cursor: default; width: 100%; height: 100%;
    transition: background .3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .dg-overlay-in { background: rgba(0,0,0,0.45); }

  .dg-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 81;
    border-radius: 20px 20px 0 0;
    padding: 8px 16px 4px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    transition: transform .34s cubic-bezier(0.32, 0.72, 0, 1);
    max-height: 72vh;
    overflow-y: auto;
  }
  .dg-handle {
    width: 36px; height: 4px; border-radius: 2px;
    margin: 6px auto 10px;
  }
  .dg-title {
    font-size: 17px; font-weight: 700; margin: 4px 4px 14px;
  }
  .dg-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px 4px;
  }
  .dg-item {
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    gap: 8px;
    background: none; border: none; border-radius: 16px;
    padding: 12px 4px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .dg-item:active { background: rgba(127,127,127,0.10); transform: scale(0.95); }
  .dg-active { background: rgba(47,123,246,0.12); }
  .dg-icon-wrap {
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
  }
  .dg-icon {
    width: 100%; height: 100%; object-fit: contain;
    pointer-events: none;
  }
  .dg-label {
    font-size: 12px; font-weight: 500; text-align: center;
    line-height: 1.2;
  }
  .dg-safe-bottom { height: calc(env(safe-area-inset-bottom, 0px) + 8px); }

  @media (prefers-reduced-motion: reduce) {
    .dg-overlay, .dg-sheet, .dg-item { transition: none !important; }
  }
</style>