<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';

  export let c;
  export let hidden = false;
  export let boardW = 512;
  export let boardH = 512;

  const dispatch = createEventDispatcher();

  function buzz() { try { navigator.vibrate && navigator.vibrate(6); } catch (e) {} }

  function mkText() {
    const w = 320, h = 60;
    return {
      type: 'text', x: Math.max(0, Math.round((boardW - w) / 2)), y: Math.max(0, Math.round((boardH - h) / 2)),
      w, h, deg: 0, text: 'Toque para editar', fontSize: 36, color: 'var(--text-primary)', align: 'left', weight: '600',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", opacity: 1, blend: 'normal',
    };
  }

  function addText() { buzz(); dispatch('addtext', mkText()); }

  let fileInputEl;
  function triggerImagePicker() { fileInputEl?.click(); }
  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        buzz();
        const maxDim = Math.min(boardW, boardH) * 0.7;
        const ratio = img.width / img.height;
        let w = maxDim, h = maxDim / ratio;
        if (h > maxDim) { h = maxDim; w = maxDim * ratio; }
        const x = Math.max(0, Math.round((boardW - w) / 2));
        const y = Math.max(0, Math.round((boardH - h) / 2));
        dispatch('addimage', {
          type: 'image', x, y, w, h, deg: 0, src: ev.target.result,
          opacity: 1, radius: 0, blend: 'normal', cropX: 0, cropY: 0, cropW: 100, cropH: 100,
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
</script>

<div class="bottom-bar" class:bottom-bar-hidden={hidden} style="background:{c.creationBarBg}">
  <button class="bb-item" on:click={() => { buzz(); dispatch('templates'); }} aria-label="Modelos">
    <span class="icon-mask" style="mask-image:url('{localIconPath('document_multiple_24_regular')}');-webkit-mask-image:url('{localIconPath('text_add_space_before_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Modelos</span>
  </button>
  <button class="bb-item" on:click={addText} aria-label="Adicionar texto">
    <span class="icon-mask" style="mask-image:url('{localIconPath('image_24_regular')}');-webkit-mask-image:url('{localIconPath('shapes_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Texto</span>
  </button>
  <button class="bb-item" on:click={() => { buzz(); triggerImagePicker(); }} aria-label="Adicionar imagem">
    <span class="icon-mask" style="mask-image:url('{localIconPath('table_simple_24_regular')}');-webkit-mask-image:url('{localIconPath('layer_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Imagem</span>
  </button>
  <button class="bb-item" on:click={() => { buzz(); dispatch('shapes'); }} aria-label="Adicionar forma">
    <span class="icon-mask" style="mask-image:url('{localIconPath('question_circle_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Formas</span>
  </button>
  <button class="bb-item" on:click={() => { buzz(); dispatch('size'); }} aria-label="Tamanho e fundo">
    <span class="icon-mask" style="mask-image:url('{localIconPath('question_circle_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Tamanho</span>
  </button>
  <button class="bb-item" on:click={() => { buzz(); dispatch('layers'); }} aria-label="Camadas">
    <span class="icon-mask" style="mask-image:url('{localIconPath('question_circle_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    <span class="bb-label" style="color:{c.textSecondary}">Camadas</span>
  </button>

  <input type="file" accept="image/*" bind:this={fileInputEl} on:change={handleFileChosen} style="display:none" />
</div>

<style>
  .bottom-bar {
    flex-shrink:0; display:flex; align-items:center; justify-content:space-around;
    padding:6px 4px calc(env(safe-area-inset-bottom,0px) + 6px); box-shadow:0 -1px 0 0 rgba(127,127,127,0.14);
    transition:opacity .2s cubic-bezier(0.32,0.72,0,1), transform .2s cubic-bezier(0.32,0.72,0,1);
    opacity:1; transform:translateY(0);
  }
  .bottom-bar-hidden { opacity:0; transform:translateY(12px); pointer-events:none; }
  .bb-item { display:flex; flex-direction:column; align-items:center; gap:3px; background:transparent; border:none; padding:6px 8px; border-radius:12px; flex:1; max-width:90px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .bb-item:active { opacity:.6; }
  .bb-label { font-size:9px; font-weight:600; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>