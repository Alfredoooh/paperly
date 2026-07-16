<script>
  import { createEventDispatcher } from 'svelte';

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
  style="transform: translate3d(0, {visible ? 0 : 40}px, 0);"
>
  <div class="fb-pill" style="background:{c.toolbarSolidBg || c.dialogBackground};">
    <button class="fb-btn" disabled={!canUndo} on:click={() => press('undo')} aria-label="Desfazer">
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/undo.svg');-webkit-mask-image:url('/icons/svg/docs/undo.svg');background:{c.iconTint};width:18px;height:18px;opacity:{canUndo ? 1 : 0.32};"></span>
    </button>
    <button class="fb-btn" disabled={!canRedo} on:click={() => press('redo')} aria-label="Refazer">
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/redo.svg');-webkit-mask-image:url('/icons/svg/docs/redo.svg');background:{c.iconTint};width:18px;height:18px;opacity:{canRedo ? 1 : 0.32};"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" class:fb-active={activeMeta.bold} on:click={() => press('bold')} aria-label="Negrito">
      <span class="fb-glyph" style="color:{activeMeta.bold ? '#2F7BF6' : c.iconTint};font-weight:800;">B</span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.italic} on:click={() => press('italic')} aria-label="Itálico">
      <span class="fb-glyph" style="color:{activeMeta.italic ? '#2F7BF6' : c.iconTint};font-style:italic;">I</span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.underline} on:click={() => press('underline')} aria-label="Sublinhado">
      <span class="fb-glyph" style="color:{activeMeta.underline ? '#2F7BF6' : c.iconTint};text-decoration:underline;">S</span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('textcolor')} aria-label="Cor do texto">
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/text_color.svg');-webkit-mask-image:url('/icons/svg/docs/text_color.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="fb-btn" on:click={() => press('fillcolor')} aria-label="Cor de preenchimento">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/fill_color.svg');-webkit-mask-image:url('/icons/svg/sheets/fill_color.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={cycleAlign} aria-label="Alinhamento">
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/{ALIGN_ICONS[activeMeta.align || 'left']}.svg');-webkit-mask-image:url('/icons/svg/docs/{ALIGN_ICONS[activeMeta.align || 'left']}.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="fb-btn" on:click={() => press('numformat')} aria-label="Formato numérico">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/number_format.svg');-webkit-mask-image:url('/icons/svg/sheets/number_format.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('insertrow')} aria-label="Inserir linha">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/insert_row.svg');-webkit-mask-image:url('/icons/svg/sheets/insert_row.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="fb-btn" on:click={() => press('insertcol')} aria-label="Inserir coluna">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/insert_col.svg');-webkit-mask-image:url('/icons/svg/sheets/insert_col.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="fb-btn" on:click={() => press('deleterow')} aria-label="Apagar linha">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/delete_row.svg');-webkit-mask-image:url('/icons/svg/sheets/delete_row.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="fb-btn" on:click={() => press('deletecol')} aria-label="Apagar coluna">
      <span class="icon-mask" style="mask-image:url('/icons/svg/sheets/delete_col.svg');-webkit-mask-image:url('/icons/svg/sheets/delete_col.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
  </div>

  <button class="fb-fab" style="background:#2F7BF6" on:click={() => press('done')} aria-label="Concluir edição">
    <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:#FFFFFF;width:20px;height:20px;"></span>
  </button>
</div>

<style>
  .fb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 8px;
    padding: 0 12px calc(env(safe-area-inset-bottom,0px) + 14px);
    pointer-events: none;
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    z-index: 40;
    opacity: 1;
  }
  .fb-wrap.fb-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .fb-pill {
    pointer-events: auto;
    display: flex; align-items: center; gap: 1px;
    padding: 4px 5px;
    border-radius: 999px;
    box-shadow:
      0 1px 3px rgba(0,0,0,0.10),
      0 10px 28px rgba(0,0,0,0.16);
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    flex: 1;
    min-width: 0;
    max-width: calc(100vw - 90px);
  }
  .fb-pill::-webkit-scrollbar { display: none; }
  .fb-btn {
    width: 36px; height: 36px; border: none; background: transparent; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s cubic-bezier(0.34,1.56,0.64,1), transform .12s cubic-bezier(0.34,1.56,0.64,1);
  }
  .fb-btn:active { transform: scale(0.84); background: rgba(127,127,127,0.14); }
  .fb-btn:disabled { cursor: default; }
  .fb-btn:disabled:active { transform: none; background: transparent; }
  .fb-active { background: rgba(47,123,246,0.16); }
  .fb-divider { width: 1px; height: 18px; margin: 0 3px; flex-shrink: 0; }
  .fb-glyph { font-size: 15px; line-height: 1; font-family: Georgia, serif; }

  .fb-fab {
    pointer-events: auto;
    width: 46px; height: 46px; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    box-shadow:
      0 2px 6px rgba(47,123,246,0.35),
      0 8px 20px rgba(0,0,0,0.18);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), box-shadow .16s;
  }
  .fb-fab:active {
    transform: scale(0.88);
    box-shadow:
      0 1px 3px rgba(47,123,246,0.3),
      0 4px 10px rgba(0,0,0,0.14);
  }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .fb-wrap { transition: none !important; }
  }
</style>