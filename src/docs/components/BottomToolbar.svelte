<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let activePanel = null;
  export let visible = false;
  
  const dispatch = createEventDispatcher();
  const ICON_PX = 24;
  
  // Todas as opções acessíveis por scroll horizontal — sem chevron
  // "mais opções" a esconder itens. A barra é full-width, colada ao
  // fundo, com scroll-x nativo para as opções que não cabem.
  const ITEMS = [
    { id: 'bold', icon: 'text_bold_24_regular', label: 'Negrito' },
    { id: 'italic', icon: 'text_italic_24_regular', label: 'Itálico' },
    { id: 'underline', icon: 'text_underline_24_regular', label: 'Sublinhado' },
    { id: 'strikethrough', icon: 'text_strikethrough_24_regular', label: 'Rasurado' },
    { id: 'color', icon: 'highlight_24_regular', label: 'Realçador', panel: true },
    { id: 'fontcolor', icon: 'text_color_24_regular', label: 'Cor da fonte', panel: true },
    { id: 'font', icon: 'text_font_24_regular', label: 'Fonte', panel: true },
    { id: 'size', icon: 'text_font_size_24_regular', label: 'Tamanho', panel: true },
    { id: 'align', icon: 'text_align_left_24_regular', label: 'Alinhamento', panel: true },
    { id: 'list', icon: 'text_bullet_list_24_regular', label: 'Marcadores', panel: true },
    { id: 'numbering', icon: 'text_number_list_rtl_24_regular', label: 'Numeração', panel: true },
    { id: 'link', icon: 'link_24_regular', label: 'Link', panel: true },
    { id: 'footnote', icon: 'text_footnote_24_regular', label: 'Nota de rodapé', panel: true },
    { id: 'insert', icon: 'image_24_regular', label: 'Imagem' },
    { id: 'table', icon: 'table_24_regular', label: 'Tabela' },
    { id: 'layers', icon: 'layer_24_regular', label: 'Camadas', panel: true },
    { id: 'design', icon: 'paint_brush_24_regular', label: 'Design', panel: true },
  ];
  
  function press(item) {
    if (item.disabled && item.disabled()) return;
    dispatch('action', item.id);
  }
</script>

<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="background:{c.toolbarSolidBg};"
>
  <div class="tb-scroll">
    {#each ITEMS as item}
      <button
        class="tb-btn"
        class:tb-active={item.panel && activePanel === item.id}
        disabled={item.disabled ? item.disabled() : false}
        on:click={() => press(item)}
        aria-label={item.label}
      >
        <span
          class="icon-mask"
          style="mask-image:url('{localIconPath(item.icon)}');-webkit-mask-image:url('{localIconPath(item.icon)}');background:{c.iconTint};width:24px;height:24px;max-width:24px;max-height:24px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
        ></span>
      </button>
    {/each}
  </div>
</div>

<style>
  .tb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    padding: 10px 0 calc(env(safe-area-inset-bottom,0px) + 10px);
    box-shadow: 0 -0.5px 0 0 rgba(127,127,127,0.18);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, 100%, 0);
  }
  /* Scroll horizontal nativo: todas as opções ficam disponíveis
     deslizando, sem nenhum botão "mais opções"/chevron a escondê-las. */
  .tb-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tb-scroll::-webkit-scrollbar { display: none; }
  /* Botões sem nenhum container: sem fundo em repouso. */
  .tb-btn {
    width: 44px; height: 40px; border: none; background: transparent; border-radius: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s;
  }
  .tb-btn:active { opacity: .55; }
  .tb-btn:disabled { cursor: default; }
  .tb-btn:disabled:active { opacity: .32; }
  .tb-active .icon-mask { background: var(--accent-primary) !important; }

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