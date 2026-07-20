<script>
  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let activePanel = null;
  export let canUndo = false;
  export let canRedo = false;
  export let kbOffset = 0;
  export let visible = false;
  
  const dispatch = createEventDispatcher();

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';
  
  const GROUPS = [
    [
      { id: 'undo', icon: 'arrow_undo_24_regular', label: 'Desfazer', disabled: () => !canUndo },
      { id: 'redo', icon: 'arrow_redo_24_regular', label: 'Refazer', disabled: () => !canRedo },
    ],
    [
      { id: 'bold', icon: 'text_bold_24_regular', label: 'Negrito' },
      { id: 'italic', icon: 'text_italic_24_regular', label: 'Itálico' },
      { id: 'underline', icon: 'text_underline_24_regular', label: 'Sublinhado' },
    ],
    [
      { id: 'font', icon: 'text_font_24_regular', label: 'Fonte', panel: true },
      { id: 'size', icon: 'text_font_size_24_regular', label: 'Tamanho', panel: true },
      { id: 'color', icon: 'color_24_regular', label: 'Cor', panel: true },
    ],
    [
      { id: 'align', icon: 'text_align_left_24_regular', label: 'Alinhamento', panel: true },
      { id: 'list', icon: 'text_bullet_list_24_regular', label: 'Listas', panel: true },
    ],
    [
      { id: 'link', icon: 'link_24_regular', label: 'Link', panel: true },
      { id: 'footnote', icon: 'text_footnote_24_regular', label: 'Nota de rodapé', panel: true },
    ],
    [
      { id: 'insert', icon: 'image_24_regular', label: 'Imagem' },
      { id: 'table', icon: 'table_24_regular', label: 'Tabela' },
    ],
    [
      { id: 'layers', icon: 'layer_24_regular', label: 'Camadas', panel: true },
    ],
  ];
  
  function press(item) {
    if (item.disabled && item.disabled()) return;
    dispatch('action', item.id);
  }

  function pressDone() {
    dispatch('action', 'done');
  }
</script>

<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="transform: translate3d(0, {visible ? -kbOffset : 40}px, 0);"
>
  <!--
    A pill de formatação encolheu (padding menor, gap menor) para
    abrir espaço ao FAB de concluir edição, que agora fica FORA da
    pill, à direita, como um círculo próprio — é para lá que foi o
    botão de check que antes vivia no appbar.
  -->
  <div class="tb-pill" style="background:{c.toolbarSolidBg}">
    {#each GROUPS as group, gi}
      {#each group as item}
        <button
          class="tb-btn"
          class:tb-active={item.panel && activePanel === item.id}
          disabled={item.disabled ? item.disabled() : false}
          on:click={() => press(item)}
          aria-label={item.label}
        >
          <span
            class="icon-mask"
            style="mask-image:url('{FLUENT_CDN}{item.icon}.svg');-webkit-mask-image:url('{FLUENT_CDN}{item.icon}.svg');background:{c.iconTint};width:18px;height:18px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
          ></span>
        </button>
      {/each}
      {#if gi < GROUPS.length - 1}
        <div class="tb-divider" style="background:{c.divider}"></div>
      {/if}
    {/each}
  </div>

  <button class="tb-fab" style="background:#2F7BF6" on:click={pressDone} aria-label="Concluir edição">
    <span
      class="icon-mask"
      style="mask-image:url('{FLUENT_CDN}checkmark_24_filled.svg');-webkit-mask-image:url('{FLUENT_CDN}checkmark_24_filled.svg');background:#FFFFFF;width:20px;height:20px;"
    ></span>
  </button>
</div>

<style>
  .tb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 8px;
    padding: 0 12px calc(env(safe-area-inset-bottom,0px) + 14px);
    pointer-events: none;
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    z-index: 40;
    opacity: 1;
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
  }
  /* Pill encurtada: padding e gap reduzidos, e agora tem um max-width
     próprio (em vez de ocupar toda a largura livre) para deixar
     espaço fixo e reservado ao FAB ao lado. */
  .tb-pill {
    pointer-events: auto;
    display: flex; align-items: center; gap: 1px;
    padding: 4px 5px;
    border-radius: 999px;
    box-shadow:
      0 1px 3px rgba(0,0,0,0.10),
      0 10px 28px rgba(0,0,0,0.16);
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    flex: 1;
    min-width: 0;
  }
  .tb-pill::-webkit-scrollbar { display: none; }
  .tb-btn {
    width: 36px; height: 36px; border: none; background: transparent; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s cubic-bezier(0.34,1.56,0.64,1), transform .12s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tb-btn:active { transform: scale(0.84); background: rgba(127,127,127,0.14); }
  .tb-btn:disabled { cursor: default; }
  .tb-btn:disabled:active { transform: none; background: transparent; }
  .tb-active { background: rgba(47,123,246,0.16); }
  .tb-divider { width: 1px; height: 18px; margin: 0 3px; flex-shrink: 0; }

  /* FAB circular de concluir edição — fora da pill, sempre visível,
     nunca faz parte do scroll horizontal dos ícones de formatação. */
  .tb-fab {
    pointer-events: auto;
    width: 46px; height: 46px; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    box-shadow:
      0 2px 6px rgba(47,123,246,0.35),
      0 8px 20px rgba(0,0,0,0.18);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), box-shadow .16s;
  }
  .tb-fab:active {
    transform: scale(0.88);
    box-shadow:
      0 1px 3px rgba(47,123,246,0.3),
      0 4px 10px rgba(0,0,0,0.14);
  }

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