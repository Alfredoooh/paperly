<script>
  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let element = null;
  
  const dispatch = createEventDispatcher();
  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';
</script>

{#if element}
<div class="ctx-toolbar" style="background:{c.toolbarSolidBg}">
  {#if element.type === 'text'}
    <button class="ctx-btn" on:click={() => dispatch('edittext')} aria-label="Editar texto">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}edit_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}edit_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="ctx-btn" on:click={() => dispatch('opentab', 'text')} aria-label="Tipografia">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_font_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_font_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="ctx-btn" on:click={() => dispatch('opentextcolor')} aria-label="Cor do texto">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}color_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}color_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
  {:else if element.type === 'shape'}
    <button class="ctx-btn" on:click={() => dispatch('openfill')} aria-label="Preenchimento">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}paint_bucket_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}paint_bucket_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="ctx-btn" on:click={() => dispatch('opentab', 'border')} aria-label="Contorno">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}border_all_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}border_all_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="ctx-btn" on:click={() => dispatch('opentab', 'radius')} aria-label="Arredondamento">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
  {:else if element.type === 'image'}
    <button class="ctx-btn" on:click={() => dispatch('opentab', 'crop')} aria-label="Recortar">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}crop_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}crop_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
    <button class="ctx-btn" on:click={() => dispatch('opentab', 'radius')} aria-label="Arredondamento">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
    </button>
  {/if}
  <button class="ctx-btn" on:click={() => dispatch('opentab', 'opacity')} aria-label="Opacidade">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}drop_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}drop_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
  </button>
  <button class="ctx-btn" on:click={() => dispatch('opentab', 'blend')} aria-label="Mistura">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}layer_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}layer_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
  </button>
  <div class="ctx-divider" style="background:{c.divider}"></div>
  <button class="ctx-btn" on:click={() => dispatch('duplicate')} aria-label="Duplicar">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}copy_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}copy_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
  </button>
  <button class="ctx-btn" on:click={() => dispatch('front')} aria-label="Trazer para a frente">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_up_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_up_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
  </button>
  <button class="ctx-btn" on:click={() => dispatch('back')} aria-label="Enviar para trás">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_down_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_down_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
  </button>
  <button class="ctx-btn" on:click={() => dispatch('delete')} aria-label="Eliminar">
    <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}delete_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}delete_24_regular.svg');background:#FF3B30;width:18px;height:18px;"></span>
  </button>
</div>
{/if}

<style>
  .ctx-toolbar {
    position:fixed; left:50%; bottom:calc(env(safe-area-inset-bottom,0px) + 14px); transform:translateX(-50%); z-index:35;
    display:flex; align-items:center; gap:1px; padding:5px; border-radius:999px;
    box-shadow:0 1px 3px rgba(0,0,0,0.10), 0 10px 28px rgba(0,0,0,0.16);
    max-width:calc(100vw - 24px); overflow-x:auto; -webkit-overflow-scrolling:touch;
  }
  .ctx-toolbar::-webkit-scrollbar { display:none; }
  .ctx-btn { width:36px; height:36px; border:none; background:transparent; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:transform .12s cubic-bezier(0.34,1.56,0.64,1), background .15s; }
  .ctx-btn:active { transform:scale(0.84); background:rgba(127,127,127,0.14); }
  .ctx-divider { width:1px; height:18px; margin:0 3px; flex-shrink:0; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>