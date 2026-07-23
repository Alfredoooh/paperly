<script>
  import { createEventDispatcher } from 'svelte';
  import { fluentIconUrl } from '../lib/icon-fallback.js';

  export let c;
  export let visible = false;
  export let activeMeta = {}; // { bold, italic, underline, align, format }
  export let canUndo = false;
  export let canRedo = false;

  const dispatch = createEventDispatcher();

  const ALIGN_ICONS = { left: 'align_left', center: 'align_center', right: 'align_right' };

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
  class="fb-wrap"
  class:fb-hidden={!visible}
  style="background:{c.toolbarSolidBg || c.dialogBackground}; border-color:{c.divider}; transform: translate3d(0, {visible ? 0 : 100}%, 0);"
>
  <div class="fb-scroll">
    <button class="fb-btn" disabled={!canUndo} on:click={() => press('undo')} aria-label="Desfazer">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('undo')}');-webkit-mask-image:url('{fluentIconUrl('undo')}');background:{c.iconTint};opacity:{canUndo ? 1 : 0.32};"></span>
    </button>
    <button class="fb-btn" disabled={!canRedo} on:click={() => press('redo')} aria-label="Refazer">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('redo')}');-webkit-mask-image:url('{fluentIconUrl('redo')}');background:{c.iconTint};opacity:{canRedo ? 1 : 0.32};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" class:fb-active={activeMeta.bold} on:click={() => press('bold')} aria-label="Negrito">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('bold')}');-webkit-mask-image:url('{fluentIconUrl('bold')}');background:{activeMeta.bold ? c.primary : c.iconTint};"></span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.italic} on:click={() => press('italic')} aria-label="Itálico">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('italic')}');-webkit-mask-image:url('{fluentIconUrl('italic')}');background:{activeMeta.italic ? c.primary : c.iconTint};"></span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.underline} on:click={() => press('underline')} aria-label="Sublinhado">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('underline')}');-webkit-mask-image:url('{fluentIconUrl('underline')}');background:{activeMeta.underline ? c.primary : c.iconTint};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('textcolor')} aria-label="Cor do texto">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('text_color')}');-webkit-mask-image:url('{fluentIconUrl('text_color')}');background:{c.iconTint};"></span>
    </button>
    <button class="fb-btn" on:click={() => press('fillcolor')} aria-label="Cor de preenchimento">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('fill_color')}');-webkit-mask-image:url('{fluentIconUrl('fill_color')}');background:{c.iconTint};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={cycleAlign} aria-label="Alinhamento">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl(ALIGN_ICONS[activeMeta.align || 'left'])}');-webkit-mask-image:url('{fluentIconUrl(ALIGN_ICONS[activeMeta.align || 'left'])}');background:{c.iconTint};"></span>
    </button>
    <button class="fb-btn" on:click={() => press('numformat')} aria-label="Formato numérico">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('number_format')}');-webkit-mask-image:url('{fluentIconUrl('number_format')}');background:{c.iconTint};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('insertrow')} aria-label="Inserir linha">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('insert_row')}');-webkit-mask-image:url('{fluentIconUrl('insert_row')}');background:{c.iconTint};"></span>
    </button>
    <button class="fb-btn" on:click={() => press('insertcol')} aria-label="Inserir coluna">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('insert_col')}');-webkit-mask-image:url('{fluentIconUrl('insert_col')}');background:{c.iconTint};"></span>
    </button>
    <button class="fb-btn" on:click={() => press('deleterow')} aria-label="Apagar linha">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('delete_row')}');-webkit-mask-image:url('{fluentIconUrl('delete_row')}');background:{c.iconTint};"></span>
    </button>
    <button class="fb-btn" on:click={() => press('deletecol')} aria-label="Apagar coluna">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('delete_col')}');-webkit-mask-image:url('{fluentIconUrl('delete_col')}');background:{c.iconTint};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('insertchart')} aria-label="Inserir gráfico">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('chart')}');-webkit-mask-image:url('{fluentIconUrl('chart')}');background:{c.iconTint};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn fb-done" on:click={() => press('done')} aria-label="Concluir edição">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('check')}');-webkit-mask-image:url('{fluentIconUrl('check')}');background:{c.primary};"></span>
    </button>
  </div>
</div>

<style>
  /* Bottom command bar estilo Fluent/Office: barra retangular sólida
     fixa no rodapé, ocupando toda a largura — SEM pill/cápsula, SEM
     sombra flutuante, SEM border-radius em torno do grupo. Cada botão
     é uma célula de toolbar simples, tal como o Word/Excel mobile da
     Microsoft: fundo transparente por padrão, sem contorno visível,
     só reage com um tap-state discreto. */
  .fb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    border-top: 1px solid;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transition: transform .28s cubic-bezier(0.32, 0.72, 0, 1);
    z-index: 40;
  }
  .fb-wrap.fb-hidden {
    transform: translate3d(0, 100%, 0);
  }
  .fb-scroll {
    display: flex; align-items: center;
    height: 52px;
    padding: 0 4px;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .fb-scroll::-webkit-scrollbar { display: none; }

  .fb-btn {
    width: 44px; height: 44px; border: none; background: transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, transform .1s ease;
  }
  .fb-btn:active { transform: scale(0.9); background: rgba(127,127,127,0.12); }
  .fb-btn:disabled { cursor: default; }
  .fb-btn:disabled:active { transform: none; background: transparent; }
  .fb-active { background: rgba(33,115,70,0.12); }
  .fb-done { }

  .fb-divider { width: 1px; height: 22px; margin: 0 4px; flex-shrink: 0; background: currentColor; opacity: 0.14; }

  /* Todos os ícones desta barra a 24px, sempre vindos do projeto (SVG
     via mask), nunca caracteres/letras do teclado a fazer de ícone. */
  .icon-mask {
    display: block;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .fb-wrap { transition: none !important; }
  }
</style>