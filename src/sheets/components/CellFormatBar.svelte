<script>
  import { createEventDispatcher } from 'svelte';
  import { iconWithFallback } from '../lib/icon-fallback.js';

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
  <div class="fb-pill" style="background:{c.toolbarSolidBg || c.dialogBackground}; border-color:{c.divider};">
    <button class="fb-btn" disabled={!canUndo} on:click={() => press('undo')} aria-label="Desfazer">
      <img use:iconWithFallback={'undo'} class="icon-img" style="opacity:{canUndo ? 1 : 0.32};" alt="" />
    </button>
    <button class="fb-btn" disabled={!canRedo} on:click={() => press('redo')} aria-label="Refazer">
      <img use:iconWithFallback={'redo'} class="icon-img" style="opacity:{canRedo ? 1 : 0.32};" alt="" />
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" class:fb-active={activeMeta.bold} on:click={() => press('bold')} aria-label="Negrito">
      <span class="fb-glyph" style="color:{activeMeta.bold ? c.primary : c.iconTint};font-weight:800;">B</span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.italic} on:click={() => press('italic')} aria-label="Itálico">
      <span class="fb-glyph" style="color:{activeMeta.italic ? c.primary : c.iconTint};font-style:italic;">I</span>
    </button>
    <button class="fb-btn" class:fb-active={activeMeta.underline} on:click={() => press('underline')} aria-label="Sublinhado">
      <span class="fb-glyph" style="color:{activeMeta.underline ? c.primary : c.iconTint};text-decoration:underline;">S</span>
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('textcolor')} aria-label="Cor do texto">
      <img use:iconWithFallback={'text_color'} class="icon-img" alt="" />
    </button>
    <button class="fb-btn" on:click={() => press('fillcolor')} aria-label="Cor de preenchimento">
      <img use:iconWithFallback={'fill_color'} class="icon-img" alt="" />
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={cycleAlign} aria-label="Alinhamento">
      <img
        use:iconWithFallback={ALIGN_ICONS[activeMeta.align || 'left']}
        class="icon-img"
        alt=""
      />
    </button>
    <button class="fb-btn" on:click={() => press('numformat')} aria-label="Formato numérico">
      <img use:iconWithFallback={'number_format'} class="icon-img" alt="" />
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn" on:click={() => press('insertrow')} aria-label="Inserir linha">
      <img use:iconWithFallback={'insert_row'} class="icon-img" alt="" />
    </button>
    <button class="fb-btn" on:click={() => press('insertcol')} aria-label="Inserir coluna">
      <img use:iconWithFallback={'insert_col'} class="icon-img" alt="" />
    </button>
    <button class="fb-btn" on:click={() => press('deleterow')} aria-label="Apagar linha">
      <img use:iconWithFallback={'delete_row'} class="icon-img" alt="" />
    </button>
    <button class="fb-btn" on:click={() => press('deletecol')} aria-label="Apagar coluna">
      <img use:iconWithFallback={'delete_col'} class="icon-img" alt="" />
    </button>

    <div class="fb-divider" style="background:{c.divider}"></div>

    <button class="fb-btn fb-done" on:click={() => press('done')} aria-label="Concluir edição">
      <img use:iconWithFallback={'check'} class="icon-img" alt="" />
    </button>
  </div>
</div>

<style>
  .fb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
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
    border: 1px solid;
    box-shadow:
      0 1px 3px rgba(0,0,0,0.08),
      0 10px 28px rgba(0,0,0,0.14);
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    max-width: calc(100vw - 24px);
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
  .fb-active { background: rgba(33,115,70,0.14); }
  .fb-done { background: rgba(33,115,70,0.10); }
  .fb-divider { width: 1px; height: 18px; margin: 0 3px; flex-shrink: 0; background: currentColor; opacity: 0.12; }
  .fb-glyph { font-size: 15px; line-height: 1; font-family: Georgia, serif; }

  .icon-img {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    object-fit: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    .fb-wrap { transition: none !important; }
  }
</style>