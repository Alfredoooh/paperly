<script>
  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let activePanel = null;
  export let visible = false;
  
  const dispatch = createEventDispatcher();

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';
  const ICON_PX = 512;
  
  const ITEMS = [
    { id: 'bold', icon: 'text_bold_24_regular', label: 'Negrito' },
    { id: 'italic', icon: 'text_italic_24_regular', label: 'Itálico' },
    { id: 'underline', icon: 'text_underline_24_regular', label: 'Sublinhado' },
    { id: 'color', icon: 'highlight_24_regular', label: 'Realçador', panel: true },
    { id: 'fontcolor', icon: 'font_color_24_regular', label: 'Cor da fonte', panel: true },
    { id: 'list', icon: 'text_bullet_list_24_regular', label: 'Marcadores', panel: true },
    { id: 'numbering', icon: 'text_number_list_rtl_24_regular', label: 'Numeração', panel: true },
    { id: 'more', icon: 'chevron_up_24_regular', label: 'Mais opções' },
  ];
  
  function press(item) {
    if (item.disabled && item.disabled()) return;
    dispatch('action', item.id);
  }
</script>

<!--
  Barra de formatação: full-width, colada ao fundo do ecrã (NÃO é
  pill flutuante, NÃO tem margens laterais nem sombra de floating
  action bar). Fundo sólido a toda a largura, cada ícone SEM nenhum
  container/fundo próprio (nem círculo nem quadrado) atrás de si —
  apenas o ícone plano em cima da barra, exatamente como a barra de
  formatação nativa do Word Android. Tamanho de ícone igual ao usado
  no appbar (20px visuais), para bater certo com a imagem de
  referência.
-->
<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="background:{c.toolbarSolidBg};"
>
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
        style="mask-image:url('{FLUENT_CDN}{item.icon}.svg');-webkit-mask-image:url('{FLUENT_CDN}{item.icon}.svg');background:{c.iconTint};width:{ICON_PX}px;height:{ICON_PX}px;max-width:20px;max-height:20px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
      ></span>
    </button>
  {/each}
</div>

<style>
  .tb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 4px;
    padding: 10px 14px calc(env(safe-area-inset-bottom,0px) + 10px);
    box-shadow: 0 -0.5px 0 0 rgba(127,127,127,0.18);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    z-index: 40;
    opacity: 1;
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, 100%, 0);
  }
  /* Botões SEM nenhum container: sem fundo, sem border-radius visível
     em repouso — o ícone fica solto diretamente sobre a barra. */
  .tb-btn {
    border: none; background: transparent; border-radius: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    flex: 1; padding: 6px 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s;
  }
  .tb-btn:active { opacity: .55; }
  .tb-btn:disabled { cursor: default; }
  .tb-btn:disabled:active { opacity: .32; }
  .tb-active .icon-mask { background: #2F7BF6 !important; }

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