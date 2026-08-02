<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let activePanel = null; // null | 'font' | 'size' | 'align' | 'list' | 'link' | 'footnote'
  export let c;
  export let linkUrlDraft = '';
  export let footnoteDraft = '';

  const dispatch = createEventDispatcher();

  const FONTS = [
    { label: 'Padrão', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: "'SF Mono', Menlo, monospace" },
    { label: 'Arredondada', value: "'SF Pro Rounded', sans-serif" },
  ];
  const SIZES = ['12', '14', '16', '18', '24', '32', '48'];

  const TITLES = {
    font: 'Fonte',
    size: 'Tamanho',
    align: 'Alinhamento',
    list: 'Listas',
    link: 'Inserir link',
    footnote: 'Nova nota de rodapé',
  };

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;
  let lastPanel = null;

  $: if (activePanel && activePanel !== lastPanel) {
    lastPanel = activePanel;
    openSheet();
  } else if (!activePanel && lastPanel) {
    lastPanel = null;
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
  function close() {
    dispatch('close');
  }

  let sheetEl;
  function makeSheetDrag(slideCtrl, getHeight, onClose) {
    let dragging = false, liveActive = false;
    let startY = 0, currentY = 0, startTime = 0, sheetH = 400;
    return {
      touchstart(e) {
        dragging = true;
        liveActive = false;
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = performance.now();
        sheetH = getHeight();
      },
      touchmove(e) {
        if (!dragging) return;
        const y = e.touches[0].clientY;
        currentY = y;
        const delta = y - startY;
        if (delta <= 4) return;
        if (!liveActive) liveActive = true;
        const progress = Math.min(1, Math.max(0, delta / sheetH));
        slideCtrl.setDragValue(progress * 100);
        e.preventDefault();
      },
      touchend() {
        if (!dragging) return;
        dragging = false;
        if (!liveActive) { liveActive = false; return; }
        liveActive = false;
        const elapsed = Math.max(1, performance.now() - startTime);
        const delta = currentY - startY;
        const velocity = Math.abs(delta) / elapsed;
        const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
        const shouldClose = draggedFraction > 0.3 || (delta > 0 && velocity > 0.5);
        if (shouldClose) onClose();
        else slideCtrl.releaseDragTo('open');
      },
    };
  }
  const drag = makeSheetDrag(slide, () => sheetEl ? sheetEl.getBoundingClientRect().height : 400, close);

  onDestroy(() => {
    unsubscribe?.();
    slide.destroy();
  });
</script>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform: translate3d(0, {sheetY}%, 0);">
    <div class="sheet-grab-zone"
      on:touchstart={drag.touchstart}
      on:touchmove|nonpassive={drag.touchmove}
      on:touchend={drag.touchend}
      on:touchcancel={drag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">{TITLES[activePanel] || ''}</div>
    </div>

    <div class="sheet-body">
      {#if activePanel === 'font'}
        <div class="opt-grid">
          {#each FONTS as f}
            <button class="opt-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary};font-family:{f.value}" on:click={() => dispatch('setfont', f.value)}>{f.label}</button>
          {/each}
        </div>
      {:else if activePanel === 'size'}
        <div class="opt-grid">
          {#each SIZES as s}
            <button class="opt-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('setsize', s)}>{s}</button>
          {/each}
        </div>
      {:else if activePanel === 'align'}
        <div class="opt-grid">
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyLeft')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_align_left_24_regular')}');-webkit-mask-image:url('{localIconPath('text_align_left_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyCenter')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_align_center_24_regular')}');-webkit-mask-image:url('{localIconPath('text_align_center_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyRight')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_align_right_24_regular')}');-webkit-mask-image:url('{localIconPath('text_align_right_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyFull')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_align_justify_24_regular')}');-webkit-mask-image:url('{localIconPath('text_align_justify_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
        </div>
      {:else if activePanel === 'list'}
        <div class="opt-grid">
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setlist', 'insertUnorderedList')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_bullet_list_24_regular')}');-webkit-mask-image:url('{localIconPath('text_bullet_list_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setlist', 'insertOrderedList')}>
            <span class="icon-mask" style="mask-image:url('{localIconPath('text_number_list_ltr_24_regular')}');-webkit-mask-image:url('{localIconPath('text_number_list_ltr_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          </button>
        </div>
      {:else if activePanel === 'link'}
        <input
          class="sheet-input"
          style="background:{c.appbarBtnBg};color:{c.textPrimary}"
          placeholder="https://..."
          bind:value={linkUrlDraft}
          on:keydown={(e) => e.key === 'Enter' && dispatch('confirmlink')}
        />
        <div class="sheet-actions">
          <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('removelink')}>Remover</button>
          <button class="btn-primary" on:click={() => dispatch('confirmlink')}>Aplicar</button>
        </div>
      {:else if activePanel === 'footnote'}
        <input
          class="sheet-input"
          style="background:{c.appbarBtnBg};color:{c.textPrimary}"
          placeholder="Texto da nota…"
          bind:value={footnoteDraft}
          on:keydown={(e) => e.key === 'Enter' && dispatch('confirmfootnote')}
        />
        <div class="sheet-actions">
          <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={close}>Cancelar</button>
          <button class="btn-primary" on:click={() => dispatch('confirmfootnote')}>Inserir</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .32s ease;
  }
  .overlay.overlay-in { background: rgba(0,0,0,.45); }
  .bottom-sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-radius: 20px 20px 0 0; z-index: 700;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    will-change: transform;
    box-shadow: 0 -4px 40px rgba(0,0,0,.16);
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; text-align: center; }

  .sheet-body { padding: 8px 18px 4px; }
  .opt-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 6px 0 4px; }
  .opt-chip {
    border: none; border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .opt-chip:active { transform: scale(0.95); }
  .opt-icon-btn {
    width: 48px; height: 48px; border: none; border-radius: 10px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .opt-icon-btn:active { transform: scale(0.9); }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .sheet-input {
    width: 100%; border: none; border-radius: 999px; padding: 13px 16px;
    font-size: 14px; outline: none; margin: 6px 0 14px; box-sizing: border-box;
  }
  .sheet-actions { display: flex; gap: 10px; padding-bottom: 4px; }
  .btn-primary, .btn-secondary {
    flex: 1; padding: 12px 16px; border-radius: 999px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .btn-primary { background: var(--accent-primary); color: var(--text-on-accent); }
  .btn-primary:active, .btn-secondary:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .opt-chip, .opt-icon-btn, .btn-primary, .btn-secondary { transition: none !important; }
  }
</style>