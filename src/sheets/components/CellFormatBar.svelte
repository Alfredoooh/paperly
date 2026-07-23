<script>
  import { localIconPath } from '$shared/local-icon.js';
  import { createEventDispatcher } from 'svelte';

  export let c;
  export let visible = false;
  export let activeMeta = {}; // { bold, italic, underline, align, format }

  const dispatch = createEventDispatcher();

  const ALIGN_ICONS = {
    left: 'text_align_left_24_regular',
    center: 'text_align_center_24_regular',
    right: 'text_align_right_24_regular',
  };

  function press(id) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
    dispatch('action', id);
  }

  function cycleAlign() {
    const order = ['left', 'center', 'right'];
    const cur = activeMeta.align || 'left';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    dispatch('action', { id: 'align', value: next });
  }
</script>

<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="background:{c.toolbarSolidBg || c.dialogBackground};"
>
  <div class="tb-scroll">
    <button class="tb-btn" class:tb-active={activeMeta.bold} on:click={() => press('bold')} aria-label="Negrito">
      <span class="icon-mask" style="mask-image:url('{localIconPath('text_bold_24_regular')}');-webkit-mask-image:url('{localIconPath('text_bold_24_regular')}');background:{activeMeta.bold ? 'var(--accent-primary)' : c.iconTint};"></span>
    </button>
    <button class="tb-btn" class:tb-active={activeMeta.italic} on:click={() => press('italic')} aria-label="Itálico">
      <span class="icon-mask" style="mask-image:url('{localIconPath('text_italic_24_regular')}');-webkit-mask-image:url('{localIconPath('text_italic_24_regular')}');background:{activeMeta.italic ? 'var(--accent-primary)' : c.iconTint};"></span>
    </button>
    <button class="tb-btn" class:tb-active={activeMeta.underline} on:click={() => press('underline')} aria-label="Sublinhado">
      <span class="icon-mask" style="mask-image:url('{localIconPath('text_underline_24_regular')}');-webkit-mask-image:url('{localIconPath('text_underline_24_regular')}');background:{activeMeta.underline ? 'var(--accent-primary)' : c.iconTint};"></span>
    </button>

    <button class="tb-btn" on:click={() => press('textcolor')} aria-label="Cor do texto">
      <span class="icon-mask" style="mask-image:url('{localIconPath('font_color_24_regular')}');-webkit-mask-image:url('{localIconPath('font_color_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('fillcolor')} aria-label="Cor de preenchimento">
      <span class="icon-mask" style="mask-image:url('{localIconPath('paint_bucket_24_regular')}');-webkit-mask-image:url('{localIconPath('paint_bucket_24_regular')}');background:{c.iconTint};"></span>
    </button>

    <button class="tb-btn" on:click={cycleAlign} aria-label="Alinhamento">
      <span class="icon-mask" style="mask-image:url('{localIconPath(ALIGN_ICONS[activeMeta.align || 'left'])}');-webkit-mask-image:url('{localIconPath(ALIGN_ICONS[activeMeta.align || 'left'])}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('numformat')} aria-label="Formato numérico">
      <span class="icon-mask" style="mask-image:url('{localIconPath('number_symbol_24_regular')}');-webkit-mask-image:url('{localIconPath('number_symbol_24_regular')}');background:{c.iconTint};"></span>
    </button>

    <button class="tb-btn" on:click={() => press('insertrow')} aria-label="Inserir linha">
      <span class="icon-mask" style="mask-image:url('{localIconPath('table_insert_row_24_regular')}');-webkit-mask-image:url('{localIconPath('table_insert_row_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('insertcol')} aria-label="Inserir coluna">
      <span class="icon-mask" style="mask-image:url('{localIconPath('table_insert_column_24_regular')}');-webkit-mask-image:url('{localIconPath('table_insert_column_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('deleterow')} aria-label="Apagar linha">
      <span class="icon-mask" style="mask-image:url('{localIconPath('table_delete_row_24_regular')}');-webkit-mask-image:url('{localIconPath('table_delete_row_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('deletecol')} aria-label="Apagar coluna">
      <span class="icon-mask" style="mask-image:url('{localIconPath('table_delete_column_24_regular')}');-webkit-mask-image:url('{localIconPath('table_delete_column_24_regular')}');background:{c.iconTint};"></span>
    </button>

    <button class="tb-btn" on:click={() => press('insertchart')} aria-label="Inserir gráfico">
      <span class="icon-mask" style="mask-image:url('{localIconPath('chart_multiple_24_regular')}');-webkit-mask-image:url('{localIconPath('chart_multiple_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="tb-btn" on:click={() => press('insertimage')} aria-label="Inserir imagem">
      <span class="icon-mask" style="mask-image:url('{localIconPath('image_24_regular')}');-webkit-mask-image:url('{localIconPath('image_24_regular')}');background:{c.iconTint};"></span>
    </button>
  </div>
</div>

<style>
  /* Bottom toolbar Fluent — full-width, colada ao fundo, scroll
     horizontal nativo para as opções que não cabem. SEM pill, SEM
     fundo próprio nos botões em repouso, tal como o BottomToolbar do
     docs. */
  .tb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    padding: 10px 0 calc(env(safe-area-inset-bottom,0px) + 10px);
    box-shadow: 0 -0.5px 0 0 rgba(127,127,127,0.18);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, 100%, 0);
  }
  .tb-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tb-scroll::-webkit-scrollbar { display: none; }
  .tb-btn {
    width: 44px; height: 40px; border: none; background: transparent; border-radius: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s;
  }
  .tb-btn:active { opacity: .55; }
  .tb-active .icon-mask { background: var(--accent-primary) !important; }

  .icon-mask {
    display: block; width: 24px; height: 24px; max-width: 24px; max-height: 24px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .tb-wrap { transition: none !important; }
  }
</style>