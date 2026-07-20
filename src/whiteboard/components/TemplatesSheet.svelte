<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;

  const dispatch = createEventDispatcher();

  function mkText(opts) {
    return {
      type: 'text', x: opts.x, y: opts.y, w: opts.w, h: opts.h, deg: 0,
      text: opts.text, fontSize: opts.fontSize, color: opts.color, align: opts.align || 'left',
      weight: opts.weight || '600', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      opacity: 1, blend: 'normal',
    };
  }
  function mkShape(opts) {
    return {
      type: 'shape', x: opts.x, y: opts.y, w: opts.w, h: opts.h, deg: 0,
      shape: opts.shape, fill: opts.fill, border: 'transparent', borderWidth: 0,
      radius: opts.radius || 0, opacity: 1, shadow: false, blend: 'normal',
    };
  }

  const TEMPLATES = [
    {
      id: 'tpl-promo', label: 'Promoção', w: 1080, h: 1080, thumb: '#0F6CBD',
      background: { type: 'color', color: '#0F6CBD', image: null, opacity: 1 },
      build: () => ([
        mkText({ x: 90, y: 380, w: 900, h: 200, text: 'GRANDE\nPROMOÇÃO', fontSize: 96, color: '#FFFFFF', weight: '800' }),
        mkText({ x: 90, y: 640, w: 700, h: 80, text: 'Até 50% de desconto', fontSize: 34, color: '#E8F1FE', weight: '500' }),
        mkShape({ shape: 'circle_24_filled', x: 780, y: 70, w: 220, h: 220, fill: '#FFB900' }),
      ]),
    },
    {
      id: 'tpl-story', label: 'Story minimal', w: 1080, h: 1920, thumb: '#111318',
      background: { type: 'color', color: '#111318', image: null, opacity: 1 },
      build: () => ([
        mkText({ x: 90, y: 820, w: 900, h: 300, text: 'Nova coleção\ndisponível agora', fontSize: 64, color: '#FFFFFF', weight: '700' }),
        mkShape({ shape: 'line_24_regular', x: 90, y: 780, w: 160, h: 6, fill: '#2F7BF6' }),
      ]),
    },
    {
      id: 'tpl-quote', label: 'Citação', w: 1080, h: 1080, thumb: '#F5F1E8',
      background: { type: 'color', color: '#F5F1E8', image: null, opacity: 1 },
      build: () => ([
        mkText({ x: 130, y: 380, w: 820, h: 340, text: '"O design é a forma\nmais visível do\nque fazemos."', fontSize: 58, color: '#1A1A1A', weight: '600' }),
        mkText({ x: 130, y: 760, w: 500, h: 60, text: '— Autor', fontSize: 26, color: '#6E6E6E', weight: '500' }),
      ]),
    },
    {
      id: 'tpl-flyer', label: 'Flyer evento', w: 794, h: 1123, thumb: '#D63384',
      background: { type: 'color', color: '#FFFFFF', image: null, opacity: 1 },
      build: () => ([
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 794, h: 380, fill: '#D63384' }),
        mkText({ x: 60, y: 130, w: 674, h: 160, text: 'FESTIVAL\nDE VERÃO', fontSize: 70, color: '#FFFFFF', weight: '800' }),
        mkText({ x: 60, y: 460, w: 674, h: 60, text: '15 de Agosto · 20h00', fontSize: 30, color: '#1A1A1A', weight: '600' }),
        mkText({ x: 60, y: 540, w: 674, h: 200, text: 'Um dia inteiro de música ao vivo, comida de rua e boa companhia.', fontSize: 22, color: '#4A4A4A', weight: '400' }),
      ]),
    },
  ];

  function applyTemplate(tpl) {
    dispatch('apply', { w: tpl.w, h: tpl.h, elements: tpl.build(), background: tpl.background });
    close();
  }
  function close() { dispatch('close'); }

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;

  $: if (visible && !showSheet) openSheet();
  else if (!visible && showSheet) closeSheet();

  function openSheet() {
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { overlayVisible = true; slide.open(); }));
  }
  function closeSheet() {
    overlayVisible = false;
    slide.close();
    setTimeout(() => { showSheet = false; }, 300);
  }

  let sheetEl;
  let dragging = false, liveActive = false, startY = 0, currentY = 0, startTime = 0;
  function onTouchStart(e) { dragging = true; liveActive = false; startY = e.touches[0].clientY; currentY = startY; startTime = performance.now(); }
  function onTouchMove(e) {
    if (!dragging) return;
    const y = e.touches[0].clientY; currentY = y;
    const delta = y - startY;
    if (delta <= 4) return;
    if (!liveActive) liveActive = true;
    const sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 400;
    slide.setDragValue(Math.min(1, Math.max(0, delta / sheetH)) * 100);
    e.preventDefault();
  }
  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;
    if (!liveActive) { liveActive = false; return; }
    liveActive = false;
    const elapsed = Math.max(1, performance.now() - startTime);
    const sheetH = sheetEl ? sheetEl.getBoundingClientRect().height : 400;
    const delta = currentY - startY;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
    if (draggedFraction > 0.3 || (delta > 0 && velocity > 0.5)) close();
    else slide.releaseDragTo('open');
  }

  onDestroy(() => { unsubscribe?.(); slide.destroy(); });
</script>

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet sheet-tall" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="sheet-grab-zone" on:touchstart={onTouchStart} on:touchmove|nonpassive={onTouchMove} on:touchend={onTouchEnd} on:touchcancel={onTouchEnd}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Modelos prontos</div>
    </div>
    <div class="sheet-body">
      <div class="tpl-grid">
        {#each TEMPLATES as tpl}
          <button class="tpl-item" on:click={() => applyTemplate(tpl)}>
            <div class="tpl-thumb" style="background:{tpl.thumb}; aspect-ratio:{tpl.w}/{tpl.h};"></div>
            <span class="tpl-label" style="color:{c.textPrimary}">{tpl.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0); z-index:600; border:none; cursor:default; width:100%; height:100%; transition:background .32s ease; }
  .overlay.overlay-in { background:rgba(0,0,0,.45); }
  .bottom-sheet { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; z-index:700; padding:0 0 calc(env(safe-area-inset-bottom,0px) + 24px); will-change:transform; box-shadow:0 -4px 40px rgba(0,0,0,.16); max-height:72vh; display:flex; flex-direction:column; }
  .sheet-tall { max-height:82vh; }
  .sheet-grab-zone { touch-action:none; flex-shrink:0; }
  .sheet-handle { width:36px; height:4px; border-radius:2px; margin:10px auto 8px; }
  .sheet-title { font-size:13px; font-weight:700; padding:4px 18px 10px; opacity:.6; text-transform:uppercase; letter-spacing:.05em; text-align:center; }
  .sheet-body { padding:8px 18px 4px; overflow-y:auto; -webkit-overflow-scrolling:touch; }

  .tpl-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .tpl-item { display:flex; flex-direction:column; gap:7px; border:none; background:transparent; cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent; }
  .tpl-thumb { width:100%; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.12); }
  .tpl-item:active .tpl-thumb { transform:scale(0.97); }
  .tpl-label { font-size:12.5px; font-weight:600; }

  @media (prefers-reduced-motion: reduce) { .overlay, .bottom-sheet { transition:none !important; } }
</style>