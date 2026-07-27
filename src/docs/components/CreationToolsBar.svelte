<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';

  export let c;
  export let visible = true;

  const dispatch = createEventDispatcher();
  const ICON_PX = 24;

  const TOOLS = [
    { id: 'devicelayout', icon: 'phone_24_regular', label: 'Vista Para Dispositiv...' },
    { id: 'headings', icon: 'text_bullet_list_square_24_regular', label: 'Cabeçalhos' },
    { id: 'edit', icon: 'edit_24_regular', label: 'Editar' },
    { id: 'share', icon: 'share_24_regular', label: 'Partilhar' },
    { id: 'readaloud', icon: 'speaker_2_24_regular', label: 'Ler em Voz Alta' },
  ];

  function press(item) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
    dispatch('action', item.id);
  }
</script>

<!--
  Barra de navegação inferior (modo não-edição): 5 itens ícone+label,
  full-width, colada ao fundo, sem containers circulares nos
  botões — igual à imagem de referência (Vista Para Dispositivo,
  Cabeçalhos, Editar, Partilhar, Ler em Voz Alta).
-->
<div
  class="ctb-wrap"
  class:ctb-hidden={!visible}
  style="background:{c.creationBarBg};"
>
  {#each TOOLS as item}
    <button
      class="ctb-btn"
      on:click={() => press(item)}
      aria-label={item.label}
    >
      <span
        class="icon-mask"
        style="mask-image:url('{localIconPath(item.icon)}');-webkit-mask-image:url('{localIconPath(item.icon)}');background:{c.iconTint};width:24px;height:24px;max-width:24px;max-height:24px;"
      ></span>
      <span class="ctb-label" style="color:{c.textSecondary}">{item.label}</span>
    </button>
  {/each}
</div>

<style>
  /* .ctb-wrap — MUDANÇA-CHAVE: position:absolute (era fixed) e
     bottom:0 do .root, exatamente como .tb-wrap acima e como
     .bottom-bar do ChatPage.svelte. Esta é a barra que aparece ANTES
     de clicar na folha (visible = !isEditing); ao clicar na folha,
     isEditing passa a true, esta barra desliza para fora e a
     BottomToolbar assume — ambas seguem agora o mesmo mecanismo de
     "subir de graça" quando o .root encolhe via JS. */
  .ctb-wrap {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 10px 8px calc(env(safe-area-inset-bottom, 0px) + 10px);
    box-shadow: 0 -0.5px 0 0 rgba(127,127,127,0.18);
    transition: opacity .3s cubic-bezier(0.32, 0.72, 0, 1), transform .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
  }
  .ctb-wrap.ctb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, 100%, 0);
  }
  /* Botões sem nenhum container circular: sem fundo em repouso nem
     em press, apenas ícone + label empilhados. */
  .ctb-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    border: none;
    background: transparent;
    flex: 1;
    min-width: 0;
    padding: 4px 2px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
    transition: opacity .12s;
  }
  .ctb-btn:active { opacity: .55; }
  .ctb-label {
    font-size: 11px;
    font-weight: 400;
    line-height: 1.2;
    text-align: center;
    max-width: 100%;
  }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .ctb-wrap { transition: none !important; }
  }
</style>