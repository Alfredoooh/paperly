<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let activePanel = null;
  export let canUndo = false;
  export let canRedo = false;
  export let kbOffset = 0;
  export let visible = false;
  
  const dispatch = createEventDispatcher();

  let internalKbOffset = 0;
  let rafId = null;
  let vvRef = null;

  function computeKbOffset() {
    const vv = window.visualViewport;
    if (!vv) {
      internalKbOffset = 0;
      return;
    }
    const overlap = window.innerHeight - (vv.height + vv.offsetTop);
    internalKbOffset = overlap > 40 ? Math.round(overlap) : 0;
  }

  function scheduleKbUpdate() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(computeKbOffset);
  }

  onMount(() => {
    requestAnimationFrame(() => {
      computeKbOffset();
      vvRef = window.visualViewport;
      if (!vvRef) return;
      vvRef.addEventListener('resize', scheduleKbUpdate);
      vvRef.addEventListener('scroll', scheduleKbUpdate);
    });
  });

  onDestroy(() => {
    if (vvRef) {
      vvRef.removeEventListener('resize', scheduleKbUpdate);
      vvRef.removeEventListener('scroll', scheduleKbUpdate);
    }
    if (rafId) cancelAnimationFrame(rafId);
  });
  
  const GROUPS = [
    [
      { id: 'undo', icon: 'undo', label: 'Desfazer', disabled: () => !canUndo },
      { id: 'redo', icon: 'redo', label: 'Refazer', disabled: () => !canRedo },
    ],
    [
      { id: 'bold', icon: 'bold', label: 'Negrito' },
      { id: 'italic', icon: 'italic', label: 'Itálico' },
      { id: 'underline', icon: 'underline', label: 'Sublinhado' },
    ],
    [
      { id: 'font', icon: 'font', label: 'Fonte', panel: true },
      { id: 'size', icon: 'font_size', label: 'Tamanho', panel: true },
      { id: 'color', icon: 'text_color', label: 'Cor', panel: true },
    ],
    [
      { id: 'align', icon: 'align_left', label: 'Alinhamento', panel: true },
      { id: 'list', icon: 'list_bullet', label: 'Listas', panel: true },
    ],
    [
      { id: 'link', icon: 'link', label: 'Link', panel: true },
      { id: 'footnote', icon: 'footnote', label: 'Nota de rodapé', panel: true },
    ],
    [
      { id: 'insert', icon: 'image', label: 'Imagem' },
      { id: 'table', icon: 'table', label: 'Tabela' },
    ],
    [
      { id: 'layers', icon: 'layers', label: 'Camadas', panel: true },
    ],
  ];
  
  function press(item) {
    if (item.disabled && item.disabled()) return;
    dispatch('action', item.id);
  }

  function pressDone() {
    dispatch('action', 'done');
  }
</script>

<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="transform: translate3d(0, {visible ? -(Math.max(kbOffset, internalKbOffset)) : 40}px, 0);"
>
  <div class="tb-pill" style="background:{c.toolbarSolidBg}">
    {#each GROUPS as group, gi}
      {#each group as item}
        <button
          class="tb-btn"
          class:tb-active={item.panel && activePanel === item.id}
          disabled={item.disabled ? item.disabled() : false}
          on:click={() => press(item)}
          aria-label={item.label}
        >
          <span
            class="icon-mask"
            style="mask-image:url('/icons/svg/docs/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/docs/{item.icon}.svg');background:{c.iconTint};width:18px;height:18px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
          ></span>
        </button>
      {/each}
      {#if gi < GROUPS.length - 1}
        <div class="tb-divider" style="background:{c.divider}"></div>
      {/if}
    {/each}
  </div>

  <button class="tb-fab" style="background:#2F7BF6" on:click={pressDone} aria-label="Concluir edição">
    <span
      class="icon-mask"
      style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:#FFFFFF;width:20px;height:20px;"
    ></span>
  </button>
</div>

<style>
  .tb-wrap {
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
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .tb-pill {
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
  }
  .tb-pill::-webkit-scrollbar { display: none; }
  .tb-btn {
    width: 36px; height: 36px; border: none; background: transparent; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s cubic-bezier(0.34,1.56,0.64,1), transform .12s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tb-btn:active { transform: scale(0.84); background: rgba(127,127,127,0.14); }
  .tb-btn:disabled { cursor: default; }
  .tb-btn:disabled:active { transform: none; background: transparent; }
  .tb-active { background: rgba(47,123,246,0.16); }
  .tb-divider { width: 1px; height: 18px; margin: 0 3px; flex-shrink: 0; }

  .tb-fab {
    pointer-events: auto;
    width: 46px; height: 46px; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    box-shadow:
      0 2px 6px rgba(47,123,246,0.35),
      0 8px 20px rgba(0,0,0,0.18);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), box-shadow .16s;
  }
  .tb-fab:active {
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
    .tb-wrap { transition: none !important; }
  }
</style>