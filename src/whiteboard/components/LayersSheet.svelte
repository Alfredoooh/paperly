<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let elements = [];
  export let selectedId = null;

  const dispatch = createEventDispatcher();
  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

  function typeLabel(el) {
    if (el.type === 'text') return (el.text || '').slice(0, 22) || 'Texto vazio';
    if (el.type === 'image') return 'Imagem';
    if (el.type === 'shape') return el.shape.replace(/_24_(filled|regular)$/, '').replace(/_/g, ' ');
    return 'Elemento';
  }
  function selectLayer(id) { dispatch('select', id); close(); }
  function deleteLayer(e, id) { e.stopPropagation(); dispatch('delete', id); }
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
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="sheet-grab-zone" on:touchstart={onTouchStart} on:touchmove|nonpassive={onTouchMove} on:touchend={onTouchEnd} on:touchcancel={onTouchEnd}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Camadas</div>
    </div>
    <div class="sheet-body">
      {#if elements.length === 0}
        <div class="empty" style="color:{c.textSecondary}">Ainda não há elementos nesta prancheta.</div>
      {:else}
        {#each [...elements].reverse() as el (el.id)}
          <button class="layer-row" style={selectedId === el.id ? 'background:rgba(47,123,246,0.12)' : ''} on:click={() => selectLayer(el.id)}>
            {#if el.type === 'image'}
              <div class="layer-thumb"><img src={el.src} alt="" /></div>
            {:else if el.type === 'shape'}
              <div class="layer-thumb" style="background:{c.appbarBtnBg}">
                <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}{el.shape}.svg');-webkit-mask-image:url('{FLUENT_CDN}{el.shape}.svg');background:{el.fill === 'transparent' ? c.iconTint : el.fill};width:16px;height:16px;"></span>
              </div>
            {:else}
              <div class="layer-thumb" style="background:{c.appbarBtnBg}">
                <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');background:{c.iconTint};width:16px;height:16px;"></span>
              </div>
            {/if}
            <span class="layer-label" style="color:{c.textPrimary}">{typeLabel(el)}</span>
            <button class="layer-delete" on:click={(e) => deleteLayer(e, el.id)} aria-label="Remover" style="color:#FF3B30">×</button>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0); z-index:600; border:none; cursor:default; width:100%; height:100%; transition:background .32s ease; }
  .overlay.overlay-in { background:rgba(0,0,0,.45); }
  .bottom-sheet { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; z-index:700; padding:0 0 calc(env(safe-area-inset-bottom,0px) + 24px); will-change:transform; box-shadow:0 -4px 40px rgba(0,0,0,.16); max-height:72vh; display:flex; flex-direction:column; }
  .sheet-grab-zone { touch-action:none; flex-shrink:0; }
  .sheet-handle { width:36px; height:4px; border-radius:2px; margin:10px auto 8px; }
  .sheet-title { font-size:13px; font-weight:700; padding:4px 18px 10px; opacity:.6; text-transform:uppercase; letter-spacing:.05em; text-align:center; }
  .sheet-body { padding:8px 18px 4px; overflow-y:auto; -webkit-overflow-scrolling:touch; }

  .empty { text-align:center; padding:24px 16px; font-size:14px; font-weight:500; }
  .layer-row { width:100%; display:flex; align-items:center; gap:12px; background:none; border:none; padding:11px 10px; text-align:left; cursor:pointer; -webkit-tap-highlight-color:transparent; border-radius:14px; transition:background .14s, transform .14s; }
  .layer-row:active { transform:scale(0.98); }
  .layer-thumb { width:32px; height:32px; border-radius:8px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .layer-thumb img { width:100%; height:100%; object-fit:cover; }
  .layer-label { flex:1; font-size:14px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-transform:capitalize; }
  .layer-delete { background:none; border:none; font-size:20px; line-height:1; padding:4px 6px; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  @media (prefers-reduced-motion: reduce) { .overlay, .bottom-sheet { transition:none !important; } }
</style>