<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let activePanel = null;
  export let c;
  export let element = null;

  const dispatch = createEventDispatcher();

  const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'color-dodge'];
  const PRESET_COLORS = ['transparent', '#000000', '#FFFFFF', '#3C3C43', '#8E8E93', '#F0384A', '#E8720F', '#F5B700', '#1FA34A', '#0FA3A3', '#2F7BF6', '#5856D6', '#8B3FE0', '#D63384'];
  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

  function update(patch) { dispatch('update', patch); }
  function commit() { dispatch('commit'); }
  function updateAndCommit(patch) { update(patch); commit(); }

  function startCropMove(e) {
    // O arrasto de crop acontece na pré-visualização aqui dentro do sheet;
    // delega para o WhiteboardCanvas via evento global de pointermove,
    // mas como estamos fora do canvas, tratamos localmente com o mesmo
    // padrão x/y percentual.
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startCropX = element.cropX, startCropY = element.cropY;
    function onMove(ev) {
      const p = ev.touches ? ev.touches[0] : ev;
      const dxPct = ((p.clientX - startX) / element.w) * 100;
      const dyPct = ((p.clientY - startY) / element.h) * 100;
      const maxX = 100 - element.cropW, maxY = 100 - element.cropH;
      update({
        cropX: Math.min(maxX, Math.max(0, startCropX - dxPct)),
        cropY: Math.min(maxY, Math.max(0, startCropY - dyPct)),
      });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      commit();
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }

  const slide = createSlideTransition({});
  let sheetY = 100;
  const unsubscribe = slide.subscribe((v) => { sheetY = v; });
  let showSheet = false;
  let overlayVisible = false;
  let lastPanel = null;

  $: if (activePanel && activePanel !== lastPanel) { lastPanel = activePanel; openSheet(); }
  else if (!activePanel && lastPanel) { lastPanel = null; closeSheet(); }

  function openSheet() {
    showSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { overlayVisible = true; slide.open(); }));
  }
  function closeSheet() {
    overlayVisible = false;
    slide.close();
    setTimeout(() => { showSheet = false; }, 300);
  }
  function close() { dispatch('close'); }

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

{#if showSheet && element}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="sheet-grab-zone" on:touchstart={onTouchStart} on:touchmove|nonpassive={onTouchMove} on:touchend={onTouchEnd} on:touchcancel={onTouchEnd}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">
        {#if activePanel === 'opacity'}Opacidade
        {:else if activePanel === 'border'}Contorno
        {:else if activePanel === 'radius'}Arredondamento
        {:else if activePanel === 'blend'}Mistura
        {:else if activePanel === 'text'}Tipografia
        {:else if activePanel === 'crop'}Recortar imagem
        {/if}
      </div>
    </div>
    <div class="sheet-body">
      {#if activePanel === 'opacity'}
        <div class="field-label" style="color:{c.textSecondary}">Opacidade — {Math.round((element.opacity ?? 1) * 100)}%</div>
        <input type="range" min="0" max="100" step="1" value={Math.round((element.opacity ?? 1) * 100)}
          on:input={(e) => update({ opacity: Number(e.target.value) / 100 })} on:change={commit} class="range-slider" />

      {:else if activePanel === 'border'}
        <div class="field-label" style="color:{c.textSecondary}">Cor do contorno</div>
        <div class="color-grid">
          {#each PRESET_COLORS as hex}
            <button class="color-dot" style="background:{hex === 'transparent' ? '#fff' : hex}" on:click={() => updateAndCommit({ border: hex })} aria-label={hex}></button>
          {/each}
          <button class="color-dot color-dot-custom" on:click={() => dispatch('openpicker', 'border')} aria-label="Cor personalizada">+</button>
        </div>
        <div class="field-label" style="color:{c.textSecondary}">Espessura — {element.borderWidth || 0}px</div>
        <input type="range" min="0" max="24" step="1" value={element.borderWidth || 0}
          on:input={(e) => update({ borderWidth: Number(e.target.value) })} on:change={commit} class="range-slider" />

      {:else if activePanel === 'radius'}
        <div class="field-label" style="color:{c.textSecondary}">Border radius — {element.radius || 0}px</div>
        <input type="range" min="0" max="200" step="1" value={element.radius || 0}
          on:input={(e) => update({ radius: Number(e.target.value) })} on:change={commit} class="range-slider" />
        {#if element.type === 'shape'}
          <label class="toggle-row">
            <span style="color:{c.textPrimary}">Sombra projetada</span>
            <input type="checkbox" checked={!!element.shadow} on:change={(e) => updateAndCommit({ shadow: e.target.checked })} />
          </label>
        {/if}

      {:else if activePanel === 'blend'}
        <div class="opt-grid">
          {#each BLEND_MODES as mode}
            <button class="opt-chip" style="background:{element.blend === mode ? '#2F7BF6' : c.appbarBtnBg};color:{element.blend === mode ? '#fff' : c.textPrimary}" on:click={() => updateAndCommit({ blend: mode })}>{mode}</button>
          {/each}
        </div>

      {:else if activePanel === 'text'}
        <div class="field-label" style="color:{c.textSecondary}">Tamanho — {element.fontSize}px</div>
        <input type="range" min="10" max="220" step="1" value={element.fontSize}
          on:input={(e) => update({ fontSize: Number(e.target.value) })} on:change={commit} class="range-slider" />
        <div class="field-label" style="color:{c.textSecondary}">Alinhamento</div>
        <div class="opt-grid">
          <button class="opt-icon-btn" style="background:{element.align === 'left' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => updateAndCommit({ align: 'left' })}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{element.align === 'center' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => updateAndCommit({ align: 'center' })}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{element.align === 'right' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => updateAndCommit({ align: 'right' })}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
        </div>
        <div class="field-label" style="color:{c.textSecondary}">Peso</div>
        <div class="opt-grid">
          {#each [['400','Normal'],['600','Semi'],['800','Negrito']] as [w, label]}
            <button class="opt-chip" style="background:{element.weight === w ? '#2F7BF6' : c.appbarBtnBg};color:{element.weight === w ? '#fff' : c.textPrimary}" on:click={() => updateAndCommit({ weight: w })}>{label}</button>
          {/each}
        </div>

      {:else if activePanel === 'crop'}
        <div class="crop-hint" style="color:{c.textSecondary}">Arrasta a imagem abaixo para reposicionar o recorte, e usa o slider para ampliar.</div>
        <div class="field-label" style="color:{c.textSecondary}">Zoom do recorte</div>
        <input type="range" min="20" max="100" step="1" value={element.cropW}
          on:input={(e) => {
            const w = Number(e.target.value);
            update({ cropW: w, cropH: w, cropX: Math.min(100 - w, element.cropX), cropY: Math.min(100 - w, element.cropY) });
          }}
          on:change={commit} class="range-slider" />
        <div class="crop-preview-wrap" on:pointerdown={startCropMove}>
          <img src={element.src} alt="" draggable="false" style="left:{-element.cropX}%; top:{-element.cropY}%; width:{10000 / element.cropW}%; height:auto;" />
          <div class="crop-frame"></div>
        </div>
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

  .field-label { font-size:12px; font-weight:600; margin:14px 0 10px; text-transform:uppercase; letter-spacing:.04em; }
  .range-slider { width:100%; height:34px; -webkit-appearance:none; appearance:none; background:transparent; margin:0 0 4px; }
  .range-slider::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:rgba(127,127,127,0.28); }
  .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:#2F7BF6; margin-top:-9px; box-shadow:0 1px 4px rgba(0,0,0,0.3); }
  .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:14px 2px 4px; font-size:14px; font-weight:600; }
  .toggle-row input[type="checkbox"] { width:20px; height:20px; }

  .opt-grid { display:flex; flex-wrap:wrap; gap:8px; padding:2px 0 4px; }
  .opt-chip { border:none; border-radius:999px; padding:10px 15px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .opt-chip:active { transform:scale(0.95); }
  .opt-icon-btn { width:46px; height:46px; border:none; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .opt-icon-btn:active { transform:scale(0.9); }

  .color-grid { display:flex; flex-wrap:wrap; gap:10px; padding:2px 0 4px; }
  .color-dot { width:34px; height:34px; border-radius:50%; border:2px solid rgba(127,127,127,0.18); cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .color-dot:active { transform:scale(0.86); }
  .color-dot-custom { display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#2F7BF6; background:rgba(47,123,246,0.1); }

  .crop-hint { font-size:12.5px; line-height:1.5; margin-bottom:6px; }
  .crop-preview-wrap { position:relative; width:100%; aspect-ratio:1; border-radius:14px; overflow:hidden; margin-top:14px; background:#111; touch-action:none; }
  .crop-preview-wrap img { position:absolute; max-width:none; pointer-events:none; }
  .crop-frame { position:absolute; inset:0; border:2px solid #2F7BF6; border-radius:14px; pointer-events:none; box-shadow:0 0 0 2000px rgba(0,0,0,0.35); }

  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  @media (prefers-reduced-motion: reduce) { .overlay, .bottom-sheet { transition:none !important; } }
</style>