<script>
  import { createEventDispatcher } from 'svelte';
  import { localIconPath } from '$shared/local-icon.js';

  export let c;
  export let visible = false;
  export let activeMeta = {}; // { bold, italic, underline, align, format, color, fill }
  export let canUndo = false;
  export let canRedo = false;

  const dispatch = createEventDispatcher();

  const ALIGN_ICONS = {
    left: 'align_left',
    center: 'align_center_horizontal',
    right: 'align_right',
  };

  let currentAlign = 'left';
  let textSwatch = '#2564CF';
  let fillSwatch = '#FFFFFF';
  let alignIcon = ALIGN_ICONS.left;

  $: currentAlign = activeMeta.align || 'left';
  $: textSwatch = activeMeta.color || c?.primary || '#2564CF';
  $: fillSwatch = activeMeta.fill || c?.appbarBtnBgActive || c?.dialogBackground || '#FFFFFF';
  $: alignIcon = ALIGN_ICONS[currentAlign] || ALIGN_ICONS.left;

  function press(id) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
    dispatch('action', id);
  }

  function cycleAlign() {
    const order = ['left', 'center', 'right'];
    const next = order[(order.indexOf(currentAlign) + 1) % order.length];
    dispatch('action', { id: 'align', value: next });
  }
</script>

<div class="fb-wrap" class:fb-hidden={!visible} aria-hidden={!visible}>
  <div class="fb-shell" style="background:{c.toolbarSolidBg || c.dialogBackground}; border-color:{c.divider};">
    <div class="fb-row fb-row-top">
      <div class="fb-group">
        <button class="fb-btn" disabled={!canUndo} on:click={() => press('undo')} aria-label="Desfazer">
          <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_undo')}');-webkit-mask-image:url('{localIconPath('arrow_undo')}');background:{c.iconTint};width:24px;height:24px;opacity:{canUndo ? 1 : 0.32};"></span>
        </button>
        <button class="fb-btn" disabled={!canRedo} on:click={() => press('redo')} aria-label="Refazer">
          <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_redo')}');-webkit-mask-image:url('{localIconPath('arrow_redo')}');background:{c.iconTint};width:24px;height:24px;opacity:{canRedo ? 1 : 0.32};"></span>
        </button>
      </div>

      <div class="fb-divider" style="background:{c.divider};"></div>

      <div class="fb-group">
        <button class="fb-btn" class:fb-active={activeMeta.bold} on:click={() => press('bold')} aria-label="Negrito">
          <span class="fb-glyph" style="color:{activeMeta.bold ? c.primary : c.iconTint}; font-weight:800;">B</span>
        </button>
        <button class="fb-btn" class:fb-active={activeMeta.italic} on:click={() => press('italic')} aria-label="Itálico">
          <span class="fb-glyph" style="color:{activeMeta.italic ? c.primary : c.iconTint}; font-style:italic;">I</span>
        </button>
        <button class="fb-btn" class:fb-active={activeMeta.underline} on:click={() => press('underline')} aria-label="Sublinhado">
          <span class="fb-glyph" style="color:{activeMeta.underline ? c.primary : c.iconTint}; text-decoration:underline;">U</span>
        </button>
      </div>

      <div class="fb-divider" style="background:{c.divider};"></div>

      <div class="fb-group">
        <button class="fb-btn" on:click={cycleAlign} aria-label="Alinhamento">
          <span class="icon-mask" style="mask-image:url('{localIconPath(alignIcon)}');-webkit-mask-image:url('{localIconPath(alignIcon)}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
        <button class="fb-btn fb-color-btn" on:click={() => press('textcolor')} aria-label="Cor do texto">
          <span class="fb-color-letter" style="color:{textSwatch};">A</span>
          <span class="fb-color-line" style="background:{textSwatch};"></span>
        </button>
        <button class="fb-btn fb-fill-btn" on:click={() => press('fillcolor')} aria-label="Cor de preenchimento">
          <span class="fb-fill-swatch" style="background:{fillSwatch}; border-color:{c.divider};"></span>
        </button>
        <button class="fb-btn" on:click={() => press('numformat')} aria-label="Formato numérico">
          <span class="icon-mask" style="mask-image:url('{localIconPath('number_symbol')}');-webkit-mask-image:url('{localIconPath('number_symbol')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
      </div>
    </div>

    <div class="fb-row fb-row-bottom">
      <div class="fb-group fb-group-scroll">
        <button class="fb-btn" on:click={() => press('insertrow')} aria-label="Inserir linha">
          <span class="icon-mask" style="mask-image:url('{localIconPath('table_bottom_row')}');-webkit-mask-image:url('{localIconPath('table_bottom_row')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
        <button class="fb-btn" on:click={() => press('insertcol')} aria-label="Inserir coluna">
          <span class="icon-mask" style="mask-image:url('{localIconPath('column')}');-webkit-mask-image:url('{localIconPath('column')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
        <button class="fb-btn" on:click={() => press('deleterow')} aria-label="Apagar linha">
          <span class="icon-mask" style="mask-image:url('{localIconPath('delete')}');-webkit-mask-image:url('{localIconPath('delete')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
        <button class="fb-btn" on:click={() => press('deletecol')} aria-label="Apagar coluna">
          <span class="icon-mask" style="mask-image:url('{localIconPath('delete')}');-webkit-mask-image:url('{localIconPath('delete')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
      </div>

      <div class="fb-group fb-group-end">
        <button class="fb-btn fb-done" on:click={() => press('done')} aria-label="Concluir">
          <span class="icon-mask" style="mask-image:url('{localIconPath('checkmark')}');-webkit-mask-image:url('{localIconPath('checkmark')}');background:{c.iconTint};width:24px;height:24px;"></span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .fb-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
    justify-content: center;
    padding: 0 10px calc(env(safe-area-inset-bottom, 0px) + 10px);
    pointer-events: none;
    opacity: 1;
    transform: translate3d(0, 0, 0);
    transition: transform .28s cubic-bezier(0.32, 0.72, 0, 1), opacity .24s ease;
  }
  .fb-wrap.fb-hidden {
    opacity: 0;
    transform: translate3d(0, 120px, 0);
  }

  .fb-shell {
    pointer-events: auto;
    width: min(1200px, 100%);
    border: 1px solid;
    border-radius: 24px 24px 0 0;
    box-shadow:
      0 -8px 30px rgba(0, 0, 0, 0.10),
      0 -1px 0 rgba(255, 255, 255, 0.04) inset;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 10px 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .fb-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .fb-row-top {
    justify-content: space-between;
  }

  .fb-row-bottom {
    justify-content: space-between;
  }

  .fb-group {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex-shrink: 0;
  }

  .fb-group-scroll {
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }
  .fb-group-scroll::-webkit-scrollbar {
    display: none;
  }

  .fb-group-end {
    margin-left: auto;
  }

  .fb-divider {
    width: 1px;
    align-self: stretch;
    opacity: 0.14;
    flex-shrink: 0;
    border-radius: 999px;
  }

  .fb-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 12px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform .12s cubic-bezier(0.34, 1.56, 0.64, 1),
      background .14s ease,
      box-shadow .14s ease;
    color: inherit;
  }
  .fb-btn:active {
    transform: scale(0.92);
  }
  .fb-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .fb-btn:disabled:active {
    transform: none;
    background: transparent;
  }

  .fb-active {
    background: rgba(33, 163, 102, 0.14);
  }
  .fb-active .fb-glyph {
    color: var(--accent-primary, #21A366);
  }

  .fb-done {
    background: rgba(33, 163, 102, 0.12);
  }

  .fb-glyph {
    font-size: 15px;
    line-height: 1;
    font-family: Georgia, serif;
    font-weight: 700;
    width: 24px;
    text-align: center;
  }

  .fb-color-btn {
    position: relative;
    flex-direction: column;
    gap: 3px;
  }
  .fb-color-letter {
    font-size: 18px;
    line-height: 1;
    font-family: Georgia, serif;
    font-weight: 700;
    transform: translateY(1px);
  }
  .fb-color-line {
    width: 18px;
    height: 3px;
    border-radius: 999px;
  }

  .fb-fill-btn {
    position: relative;
  }
  .fb-fill-swatch {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid;
    box-sizing: border-box;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
  }

  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  @media (min-width: 860px) {
    .fb-shell {
      padding-inline: 12px;
    }
    .fb-btn {
      width: 42px;
      height: 42px;
    }
  }

  @media (max-width: 640px) {
    .fb-shell {
      border-radius: 20px 20px 0 0;
      padding: 8px 8px 10px;
      gap: 6px;
    }
    .fb-row {
      gap: 6px;
    }
    .fb-divider {
      display: none;
    }
    .fb-row-top {
      overflow-x: auto;
      scrollbar-width: none;
    }
    .fb-row-top::-webkit-scrollbar {
      display: none;
    }
    .fb-row-bottom {
      gap: 6px;
    }
    .fb-group {
      gap: 2px;
    }
    .fb-btn {
      width: 38px;
      height: 38px;
      border-radius: 11px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fb-wrap,
    .fb-btn {
      transition: none !important;
    }
  }
</style>
