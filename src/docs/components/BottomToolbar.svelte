<!-- components/BottomToolbar.svelte -->
<script>
  import { localIconPath, localColorIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';

  export let c;
  export let activePanel = null;
  export let visible = false;

  const dispatch = createEventDispatcher();
  const ICON_PX = 24;

  // Todas as opções acessíveis por scroll horizontal — sem chevron
  // "mais opções" a esconder itens. A barra é full-width, colada ao
  // fundo, com scroll-x nativo para as opções que não cabem.
  //
  // `colorIcon: true` → o item usa o ícone Fluent "_color" (multi-
  // colorido, estilo Office/Word) em vez do "_regular" mono. Só faz
  // sentido para ícones de INSERÇÃO DE CONTEÚDO (imagem, tabela),
  // porque o pacote Fluent não tem variante colorida para ícones de
  // formatação de texto (bold/italic/etc) — esses ficam sempre mono.
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
    { id: 'insert', icon: 'image_24_color', label: 'Imagem', colorIcon: true },
    { id: 'table', icon: 'table_24_color', label: 'Tabela', colorIcon: true },
    { id: 'layers', icon: 'layer_24_regular', label: 'Camadas', panel: true },
    { id: 'design', icon: 'paint_brush_24_regular', label: 'Design', panel: true },
  ];

  function iconUrl(item) {
    return item.colorIcon ? localColorIconPath(item.icon) : localIconPath(item.icon);
  }

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
        {#if item.colorIcon}
          <!-- Ícone colorido (imagem/tabela): sem mask, cores próprias do SVG. -->
          <img
            class="icon-color"
            src={iconUrl(item)}
            alt=""
            width="24"
            height="24"
            style="opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
          />
        {:else}
          <span
            class="icon-mask"
            style="mask-image:url('{iconUrl(item)}');-webkit-mask-image:url('{iconUrl(item)}');background:{c.iconTint};width:24px;height:24px;max-width:24px;max-height:24px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
          ></span>
        {/if}
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
    /* FIX (keyboard avoiding): a barra sobe exatamente o valor do
       teclado, calculado em MainPage.svelte e exposto na variável
       global --kb-offset. Quando o teclado fecha, --kb-offset volta
       a 0 e a barra volta à posição normal — a MESMA transition acima
       trata a subida e a descida, por isso não há "salto". */
    transform: translate3d(0, calc(-1 * var(--kb-offset, 0px)), 0);
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, calc(100% + var(--kb-offset, 0px)), 0);
  }
  /* Scroll horizontal nativo: todas as opções ficam disponíveis
     deslizando, sem nenhum botão "mais opções"/chevron a escondê-las. */
  .tb-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 10px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    /* FIX (poucos ícones a aparecer): sem isto, alguns motores WebView
       colapsam a largura do flex container para a largura do conteúdo
       visível na primeira pintura, cortando o scroll antes de todos os
       filhos serem medidos. width:100% + min-width:100% fixam a caixa
       de scroll à largura real do ecrã desde o primeiro frame. */
    width: 100%;
    min-width: 100%;
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
  .icon-color {
    display: block;
    width: 24px; height: 24px;
    flex-shrink: 0;
    object-fit: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    .tb-wrap { transition: none !important; }
  }
</style>