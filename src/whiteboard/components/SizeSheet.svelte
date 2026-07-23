<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher, onDestroy } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let visible = false;
  export let c;
  export let boardW = 512;
  export let boardH = 512;
  export let background = { type: 'color', color: '#FFFFFF', image: null, opacity: 1 };

  const dispatch = createEventDispatcher();

  const CM_TO_PX = 96 / 2.54;
  function cmToPx(cm) { return cm * CM_TO_PX; }
  function pxToCm(px) { return Math.round((px / CM_TO_PX) * 100) / 100; }

  const SIZE_PRESETS = [
    { id: 'ig-post',   label: 'Post Instagram',     sub: '1080 × 1080 px', w: 1080, h: 1080, cat: 'social' },
    { id: 'ig-story',  label: 'Story / Reels',       sub: '1080 × 1920 px', w: 1080, h: 1920, cat: 'social' },
    { id: 'ig-port',   label: 'Post retrato',        sub: '1080 × 1350 px', w: 1080, h: 1350, cat: 'social' },
    { id: 'fb-cover',  label: 'Capa Facebook',       sub: '820 × 312 px',   w: 820,  h: 312,  cat: 'social' },
    { id: 'yt-thumb',  label: 'Thumbnail YouTube',   sub: '1280 × 720 px',  w: 1280, h: 720,  cat: 'social' },
    { id: 'sq-512',    label: 'Quadrado 512',        sub: '512 × 512 px',   w: 512,  h: 512,  cat: 'generic' },
    { id: 'sq-256',    label: 'Quadrado 256',        sub: '256 × 256 px',   w: 256,  h: 256,  cat: 'generic' },
    { id: 'logo-1024', label: 'Logótipo',            sub: '1024 × 1024 px', w: 1024, h: 1024, cat: 'generic' },
    { id: 'banner-web',label: 'Banner web',          sub: '1200 × 628 px',  w: 1200, h: 628,  cat: 'web' },
    { id: 'a4-flyer',  label: 'Flyer A4',            sub: '21 × 29,7 cm',   w: Math.round(cmToPx(21)), h: Math.round(cmToPx(29.7)), cat: 'print' },
    { id: 'a5-flyer',  label: 'Flyer A5',            sub: '14,8 × 21 cm',   w: Math.round(cmToPx(14.8)), h: Math.round(cmToPx(21)), cat: 'print' },
    { id: 'biz-card',  label: 'Cartão de visita',    sub: '9 × 5 cm',       w: Math.round(cmToPx(9)), h: Math.round(cmToPx(5)), cat: 'print' },
    { id: 'poster-a3', label: 'Cartaz A3',           sub: '29,7 × 42 cm',   w: Math.round(cmToPx(29.7)), h: Math.round(cmToPx(42)), cat: 'print' },
  ];

  let sizeUnit = 'px';
  let customWDraft = boardW;
  let customHDraft = boardH;
  $: if (visible) { customWDraft = sizeUnit === 'cm' ? pxToCm(boardW) : boardW; customHDraft = sizeUnit === 'cm' ? pxToCm(boardH) : boardH; }

  function setSizeUnit(u) {
    if (u === sizeUnit) return;
    customWDraft = u === 'cm' ? pxToCm(boardW) : Math.round(cmToPx(customWDraft));
    customHDraft = u === 'cm' ? pxToCm(boardH) : Math.round(cmToPx(customHDraft));
    sizeUnit = u;
  }
  function applyPreset(preset) {
    dispatch('applysize', { w: preset.w, h: preset.h });
    close();
  }
  function applyCustomSize() {
    const wPx = sizeUnit === 'cm' ? Math.round(cmToPx(Number(customWDraft) || 1)) : Math.round(Number(customWDraft) || 1);
    const hPx = sizeUnit === 'cm' ? Math.round(cmToPx(Number(customHDraft) || 1)) : Math.round(Number(customHDraft) || 1);
    dispatch('applysize', { w: Math.max(16, Math.min(6000, wPx)), h: Math.max(16, Math.min(6000, hPx)) });
    close();
  }

  const BG_PRESET_COLORS = ['#FFFFFF', '#000000', '#F5F1E8', '#111318', '#E8F1FE', '#FFE8EC', '#EAFBEF'];
  function setBgColor(hex) { dispatch('backgroundchange', { ...background, type: 'color', color: hex }); }
  function setBgTransparent() { dispatch('backgroundchange', { ...background, type: 'color', color: 'transparent' }); }
  function setBgOpacity(v) { dispatch('backgroundchange', { ...background, opacity: v }); }

  let bgFileInputEl;
  function triggerBgImagePicker() { bgFileInputEl?.click(); }
  function handleBgFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => dispatch('backgroundchange', { ...background, type: 'image', image: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function removeBgImage() { dispatch('backgroundchange', { ...background, type: 'color', image: null }); }

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

{#if showSheet}
  <button class="overlay" class:overlay-in={overlayVisible} on:click={close} aria-label="Fechar"></button>
  <div class="bottom-sheet sheet-tall" bind:this={sheetEl} style="background:{c.dialogBackground};transform:translate3d(0,{sheetY}%,0);">
    <div class="sheet-grab-zone" on:touchstart={onTouchStart} on:touchmove|nonpassive={onTouchMove} on:touchend={onTouchEnd} on:touchcancel={onTouchEnd}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Tamanho e fundo</div>
    </div>
    <div class="sheet-body">
      <div class="unit-switch" style="background:{c.appbarBtnBg}">
        <button class="unit-btn" style={sizeUnit === 'px' ? 'background:var(--accent-primary);color:#fff' : `color:${c.textPrimary}`} on:click={() => setSizeUnit('px')}>px</button>
        <button class="unit-btn" style={sizeUnit === 'cm' ? 'background:var(--accent-primary);color:#fff' : `color:${c.textPrimary}`} on:click={() => setSizeUnit('cm')}>cm</button>
      </div>

      <div class="custom-size-row">
        <div class="field-col">
          <label style="color:{c.textSecondary}">Largura ({sizeUnit})</label>
          <input type="number" step={sizeUnit === 'cm' ? '0.1' : '1'} bind:value={customWDraft} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </div>
        <div class="size-x" style="color:{c.textSecondary}">×</div>
        <div class="field-col">
          <label style="color:{c.textSecondary}">Altura ({sizeUnit})</label>
          <input type="number" step={sizeUnit === 'cm' ? '0.1' : '1'} bind:value={customHDraft} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </div>
      </div>
      <button class="apply-btn" on:click={applyCustomSize}>Aplicar tamanho</button>

      {#each ['social', 'generic', 'web', 'print'] as cat}
        <div class="section-label" style="color:{c.textSecondary}">{cat === 'social' ? 'Redes sociais' : cat === 'generic' ? 'Genérico' : cat === 'web' ? 'Web' : 'Impressão'}</div>
        <div class="preset-list">
          {#each SIZE_PRESETS.filter(p => p.cat === cat) as preset}
            <button class="preset-row" style="background:{c.appbarBtnBg}" on:click={() => applyPreset(preset)}>
              <div class="preset-label">
                <strong style="color:{c.textPrimary}">{preset.label}</strong>
                <small style="color:{c.textSecondary}">{preset.sub}</small>
              </div>
              <div class="preset-preview" style="width:{Math.max(14, Math.min(40, 34 * (preset.w / preset.h)))}px; height:34px; border-color:{c.divider};"></div>
            </button>
          {/each}
        </div>
      {/each}

      <div class="section-label" style="color:{c.textSecondary}">Fundo</div>
      <div class="color-grid">
        <button class="color-dot color-dot-transparent-swatch" class:swatch-active={background.type === 'color' && background.color === 'transparent'} on:click={setBgTransparent} aria-label="Transparente"></button>
        {#each BG_PRESET_COLORS as hex}
          <button class="color-dot" class:swatch-active={background.type === 'color' && background.color === hex} style="background:{hex}" on:click={() => setBgColor(hex)} aria-label={hex}></button>
        {/each}
        <button class="color-dot color-dot-custom" on:click={() => dispatch('openbgcolorpicker')} aria-label="Cor personalizada">+</button>
      </div>

      {#if background.type === 'image' && background.image}
        <div class="bg-image-preview">
          <img src={background.image} alt="Fundo" />
          <button class="bg-image-remove" on:click={removeBgImage}>Remover imagem de fundo</button>
        </div>
      {:else}
        <button class="bg-image-btn" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={triggerBgImagePicker}>
          <span class="icon-mask" style="mask-image:url('{localIconPath('image_add_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
          Usar imagem de fundo
        </button>
      {/if}

      <div class="field-label" style="color:{c.textSecondary}">Opacidade do fundo — {Math.round((background.opacity ?? 1) * 100)}%</div>
      <input type="range" min="0" max="100" step="1" value={Math.round((background.opacity ?? 1) * 100)} on:input={(e) => setBgOpacity(Number(e.target.value) / 100)} class="range-slider" />
    </div>
  </div>

  <input type="file" accept="image/*" bind:this={bgFileInputEl} on:change={handleBgFileChosen} style="display:none" />
{/if}

<style>
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0); z-index:600; border:none; cursor:default; width:100%; height:100%; transition:background .32s ease; }
  .overlay.overlay-in { background:rgba(0,0,0,.45); }
  .bottom-sheet { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; z-index:700; padding:0 0 calc(env(safe-area-inset-bottom,0px) + 24px); will-change:transform; box-shadow:0 -4px 40px rgba(0,0,0,.16); max-height:72vh; display:flex; flex-direction:column; }
  .sheet-tall { max-height:84vh; }
  .sheet-grab-zone { touch-action:none; flex-shrink:0; }
  .sheet-handle { width:36px; height:4px; border-radius:2px; margin:10px auto 8px; }
  .sheet-title { font-size:13px; font-weight:700; padding:4px 18px 10px; opacity:.6; text-transform:uppercase; letter-spacing:.05em; text-align:center; }
  .sheet-body { padding:8px 18px 4px; overflow-y:auto; -webkit-overflow-scrolling:touch; }

  .unit-switch { display:flex; padding:3px; border-radius:12px; gap:3px; margin-bottom:16px; }
  .unit-btn { flex:1; border:none; background:transparent; padding:9px 0; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .custom-size-row { display:flex; align-items:flex-end; gap:8px; }
  .field-col { flex:1; display:flex; flex-direction:column; gap:5px; }
  .field-col label { font-size:11px; font-weight:600; }
  .field-col input[type="number"] { width:100%; padding:11px 12px; border:none; border-radius:12px; font-size:15px; box-sizing:border-box; }
  .size-x { font-size:16px; font-weight:600; padding-bottom:11px; }
  .apply-btn { width:100%; margin-top:14px; border:none; border-radius:999px; padding:13px 16px; font-size:14px; font-weight:700; cursor:pointer; background:var(--accent-primary); color:#fff; -webkit-tap-highlight-color:transparent; transition:transform .16s cubic-bezier(0.34,1.56,0.64,1); }
  .apply-btn:active { transform:scale(0.97); }
  .section-label { font-size:12px; font-weight:700; margin:18px 0 8px; text-transform:uppercase; letter-spacing:.04em; }
  .field-label { font-size:12px; font-weight:600; margin:14px 0 10px; text-transform:uppercase; letter-spacing:.04em; }
  .preset-list { display:flex; flex-direction:column; gap:8px; }
  .preset-row { display:flex; align-items:center; justify-content:space-between; border:none; border-radius:14px; padding:12px 14px; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s; width:100%; }
  .preset-row:active { transform:scale(0.98); }
  .preset-label { display:flex; flex-direction:column; gap:2px; text-align:left; }
  .preset-label strong { font-size:13.5px; }
  .preset-label small { font-size:11px; }
  .preset-preview { border:1.5px solid; border-radius:3px; flex-shrink:0; background:rgba(127,127,127,0.08); }

  .color-grid { display:flex; flex-wrap:wrap; gap:10px; padding:2px 0 4px; }
  .color-dot { width:34px; height:34px; border-radius:10px; border:2px solid rgba(127,127,127,0.18); cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .color-dot:active { transform:scale(0.86); }
  .swatch-active { box-shadow:0 0 0 2px var(--accent-primary); }
  .color-dot-transparent-swatch { background-image:linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%); background-size:8px 8px; background-position:0 0, 0 4px, 4px -4px, -4px 0px; }
  .color-dot-custom { display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:var(--accent-primary); background:rgba(47,123,246,0.1); }

  .bg-image-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; border:none; border-radius:999px; padding:13px 16px; font-size:14px; font-weight:600; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .bg-image-preview { display:flex; flex-direction:column; gap:8px; }
  .bg-image-preview img { width:100%; height:100px; object-fit:cover; border-radius:12px; }
  .bg-image-remove { border:none; background:rgba(255,59,48,0.12); color:var(--danger); border-radius:999px; padding:10px; font-size:13px; font-weight:600; cursor:pointer; }

  .range-slider { width:100%; height:34px; -webkit-appearance:none; appearance:none; background:transparent; margin:0 0 4px; }
  .range-slider::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:rgba(127,127,127,0.28); }
  .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:10px; background:var(--accent-primary); margin-top:-9px; box-shadow:0 1px 4px rgba(0,0,0,0.3); }

  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  @media (prefers-reduced-motion: reduce) { .overlay, .bottom-sheet { transition:none !important; } }
</style>