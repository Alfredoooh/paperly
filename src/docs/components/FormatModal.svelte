<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let activePanel = null; // null | 'font' | 'size' | 'align' | 'list' | 'link' | 'footnote'
  export let c;
  export let linkUrlDraft = '';
  export let footnoteDraft = '';

  const dispatch = createEventDispatcher();

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

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
            <fluent-button appearance="outline" class="opt-chip" style="font-family:{f.value}" on:click={() => dispatch('setfont', f.value)}>{f.label}</fluent-button>
          {/each}
        </div>
      {:else if activePanel === 'size'}
        <div class="opt-grid">
          {#each SIZES as s}
            <fluent-button appearance="outline" class="opt-chip" on:click={() => dispatch('setsize', s)}>{s}</fluent-button>
          {/each}
        </div>
      {:else if activePanel === 'align'}
        <div class="opt-grid">
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setalign', 'justifyLeft')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setalign', 'justifyCenter')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setalign', 'justifyRight')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setalign', 'justifyFull')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_justify_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_justify_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
        </div>
      {:else if activePanel === 'list'}
        <div class="opt-grid">
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setlist', 'insertUnorderedList')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_bullet_list_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_bullet_list_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
          <fluent-button appearance="subtle" class="opt-icon-btn" on:click={() => dispatch('setlist', 'insertOrderedList')}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_number_list_ltr_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_number_list_ltr_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
          </fluent-button>
        </div>
      {:else if activePanel === 'link'}
        <fluent-text-field
          class="sheet-input"
          placeholder="https://..."
          value={linkUrlDraft}
          on:input={(e) => linkUrlDraft = e.target.value}
          on:keydown={(e) => e.key === 'Enter' && dispatch('confirmlink')}
        ></fluent-text-field>
        <div class="sheet-actions">
          <fluent-button appearance="outline" class="btn-secondary" on:click={() => dispatch('removelink')}>Remover</fluent-button>
          <fluent-button appearance="accent" class="btn-primary" on:click={() => dispatch('confirmlink')}>Aplicar</fluent-button>
        </div>
      {:else if activePanel === 'footnote'}
        <fluent-text-field
          class="sheet-input"
          placeholder="Texto da nota…"
          value={footnoteDraft}
          on:input={(e) => footnoteDraft = e.target.value}
          on:keydown={(e) => e.key === 'Enter' && dispatch('confirmfootnote')}
        ></fluent-text-field>
        <div class="sheet-actions">
          <fluent-button appearance="outline" class="btn-secondary" on:click={close}>Cancelar</fluent-button>
          <fluent-button appearance="accent" class="btn-primary" on:click={() => dispatch('confirmfootnote')}>Inserir</fluent-button>
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
  :global(.opt-chip) {
    --neutral-fill-rest: transparent;
    border-radius: 999px !important; font-size: 14px; font-weight: 600;
    white-space: nowrap;
  }
  :global(.opt-icon-btn) {
    width: 48px; height: 48px; border-radius: 50% !important;
    display: flex; align-items: center; justify-content: center;
    min-width: 0; padding: 0;
  }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  :global(.sheet-input) {
    width: 100%; border-radius: 999px !important;
    font-size: 14px; margin: 6px 0 14px; box-sizing: border-box;
  }
  .sheet-actions { display: flex; gap: 10px; padding-bottom: 4px; }
  :global(.btn-primary), :global(.btn-secondary) {
    flex: 1; border-radius: 999px !important;
    font-size: 14px; font-weight: 600; text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .opt-chip, .opt-icon-btn, .btn-primary, .btn-secondary { transition: none !important; }
  }
</style>