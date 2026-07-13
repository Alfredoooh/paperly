<!-- src/home/components/ColorPickerModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  // Picker HSB ajustável: área de saturação/brilho (arrastável em 2D) +
  // slider de matiz (arrastável em 1D). Ao confirmar com "OK", devolve
  // o hex ao pai, que fecha este modal e reabre o ColorModal com a
  // nova cor já na secção "Criadas".
  export let visible = false;
  export let c;

  const dispatch = createEventDispatcher();

  let hue = 210;        // 0-360
  let satPct = 70;       // 0-100 (x no quadrado)
  let brightPct = 90;    // 0-100 (y no quadrado, invertido: topo = mais brilho)

  let svAreaEl;
  let hueSliderEl;
  let draggingSV = false;
  let draggingHue = false;

  function hsbToHex(h, s, v) {
    s /= 100; v /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(f(5)) + toHex(f(3)) + toHex(f(1));
  }

  $: previewHex = hsbToHex(hue, satPct, brightPct);

  function updateSVFromEvent(clientX, clientY) {
    if (!svAreaEl) return;
    const rect = svAreaEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
    satPct = (x / rect.width) * 100;
    brightPct = 100 - (y / rect.height) * 100;
  }
  function updateHueFromEvent(clientX) {
    if (!hueSliderEl) return;
    const rect = hueSliderEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    hue = (x / rect.width) * 360;
  }

  function onSVDown(e) {
    draggingSV = true;
    const point = e.touches ? e.touches[0] : e;
    updateSVFromEvent(point.clientX, point.clientY);
  }
  function onSVMove(e) {
    if (!draggingSV) return;
    const point = e.touches ? e.touches[0] : e;
    updateSVFromEvent(point.clientX, point.clientY);
    e.preventDefault();
  }
  function onSVUp() {
    draggingSV = false;
  }

  function onHueDown(e) {
    draggingHue = true;
    const point = e.touches ? e.touches[0] : e;
    updateHueFromEvent(point.clientX);
  }
  function onHueMove(e) {
    if (!draggingHue) return;
    const point = e.touches ? e.touches[0] : e;
    updateHueFromEvent(point.clientX);
    e.preventDefault();
  }
  function onHueUp() {
    draggingHue = false;
  }

  function confirmColor() {
    dispatch('confirm', previewHex);
  }
  function cancel() {
    dispatch('cancel');
  }

  $: pureHueHex = hsbToHex(hue, 100, 100);
</script>

<svelte:window
  on:mousemove={onSVMove} on:mouseup={onSVUp}
  on:touchmove|nonpassive={onSVMove} on:touchend={onSVUp}
/>

{#if visible}
  <div class="modal-overlay" on:click={cancel}></div>
  <div class="modal-card" style="background:{c.dialogBackground}">
    <div class="modal-title" style="color:{c.textPrimary}">Escolher cor</div>

    <div
      class="sv-area"
      bind:this={svAreaEl}
      style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, {pureHueHex});"
      on:mousedown={onSVDown}
      on:touchstart|nonpassive={onSVDown}
    >
      <div class="sv-thumb" style="left:{satPct}%; top:{100 - brightPct}%; background:{previewHex};"></div>
    </div>

    <div
      class="hue-slider"
      bind:this={hueSliderEl}
      on:mousedown={onHueDown}
      on:touchstart|nonpassive={onHueDown}
      on:mousemove={onHueMove}
      on:touchmove|nonpassive={onHueMove}
      on:mouseup={onHueUp}
      on:touchend={onHueUp}
    >
      <div class="hue-thumb" style="left:{(hue/360)*100}%; background:{pureHueHex};"></div>
    </div>

    <div class="preview-row">
      <div class="preview-swatch" style="background:{previewHex}"></div>
      <span class="preview-hex" style="color:{c.textSecondary}">{previewHex.toUpperCase()}</span>
    </div>

    <div class="modal-actions">
      <button class="modal-btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={cancel}>Cancelar</button>
      <button class="modal-btn-primary" on:click={confirmColor}>OK</button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed; inset: 0; z-index: 82;
    background: rgba(0,0,0,0.45);
    animation: fadeIn .26s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .modal-card {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 83;
    width: 280px; max-width: 90vw;
    animation: popIn .38s cubic-bezier(0.34, 1.35, 0.64, 1);
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn {
    0% { transform: translate(-50%, -50%) scale(0.90); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  .modal-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; text-align: center; }

  .sv-area {
    position: relative;
    width: 100%; height: 160px;
    border-radius: 14px;
    touch-action: none;
    margin-bottom: 14px;
  }
  .sv-thumb {
    position: absolute;
    width: 20px; height: 20px; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hue-slider {
    position: relative;
    width: 100%; height: 20px;
    border-radius: 999px;
    touch-action: none;
    margin-bottom: 16px;
    background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  }
  .hue-thumb {
    position: absolute; top: 50%;
    width: 22px; height: 22px; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .preview-swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(127,127,127,0.18); flex-shrink: 0; }
  .preview-hex { font-size: 13px; font-weight: 600; letter-spacing: .03em; }

  .modal-actions { display: flex; gap: 10px; }
  .modal-btn-primary, .modal-btn-secondary {
    flex: 1; padding: 11px 16px; border-radius: 999px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-btn-primary { background: #2F7BF6; color: #fff; }
  .modal-btn-primary:active, .modal-btn-secondary:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay, .modal-card { animation: none !important; }
  }
</style>