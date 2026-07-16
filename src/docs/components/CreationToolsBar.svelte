<script>
  import { createEventDispatcher } from 'svelte';

  export let c;
  export let visible = true;
  export let kbOffset = 0;

  const dispatch = createEventDispatcher();

  const TOOLS = [
    { id: 'templates', icon: 'templates', label: 'Modelos' },
    { id: 'shapes', icon: 'shapes', label: 'Formas' },
    { id: 'tools', icon: 'tools', label: 'Ferramentas' },
    { id: 'insert', icon: 'image', label: 'Imagem' },
    { id: 'table', icon: 'table', label: 'Tabela' },
  ];

  let pressedId = null;

  function press(item) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
    dispatch('action', item.id);
  }
  function onPointerDown(id) {
    pressedId = id;
  }
  function onPointerUp() {
    pressedId = null;
  }
</script>

<!--
  Barra mais baixa e mais nativa: ícone maior proporcionalmente ao
  espaço, label reduzida a 9px (peso visual de legenda, não de botão),
  altura total ~52px (perto do padrão real de tab bar iOS/Android) em
  vez dos ~74px de antes. O toque em cada botão dá um feedback de
  "pill" (fundo arredondado que aparece no press), que é o mesmo
  padrão tátil que o resto do app já usa, em vez de só opacity solta.
-->
<div
  class="ctb-wrap"
  class:ctb-hidden={!visible}
  style="transform: translate3d(0, {visible ? -kbOffset : 40}px, 0); background:{c.creationBarBg};"
>
  {#each TOOLS as item}
    <button
      class="ctb-btn"
      class:ctb-btn-pressed={pressedId === item.id}
      on:pointerdown={() => onPointerDown(item.id)}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
      on:click={() => press(item)}
      aria-label={item.label}
    >
      <span class="ctb-btn-bg"></span>
      <span
        class="icon-mask"
        style="mask-image:url('/icons/svg/docs/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/docs/{item.icon}.svg');background:{c.iconTint};width:20px;height:20px;"
      ></span>
      <span class="ctb-label" style="color:{c.textSecondary}">{item.label}</span>
    </button>
  {/each}
</div>

<style>
  .ctb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-around;
    /* padding reduzido: era 10px topo / 10px+safe-area fundo.
       Agora 6px topo, safe-area + 6px fundo — barra visivelmente
       mais baixa, mais próxima de uma tab bar nativa. */
    padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px);
    box-shadow: 0 -1px 0 0 rgba(127,127,127,0.14);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
  }
  .ctb-wrap.ctb-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .ctb-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: none;
    background: transparent;
    padding: 6px 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }
  /* "Pill" de fundo que aparece atrás do ícone+label no press —
     mesmo tipo de resposta tátil que os botões nativos do resto do
     app (ex: app-item do CreateTab), em vez de só opacity solta. */
  .ctb-btn-bg {
    position: absolute;
    inset: 2px 4px;
    border-radius: 12px;
    background: rgba(127,127,127,0.12);
    opacity: 0;
    transform: scale(0.88);
    transition: opacity .15s cubic-bezier(0.16,1,0.3,1), transform .15s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events: none;
  }
  .ctb-btn-pressed .ctb-btn-bg {
    opacity: 1;
    transform: scale(1);
  }
  .ctb-btn-pressed .icon-mask,
  .ctb-btn-pressed .ctb-label {
    transform: scale(0.92);
  }
  .icon-mask,
  .ctb-label {
    position: relative;
    z-index: 1;
    transition: transform .15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .ctb-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: -0.05px;
  }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .ctb-wrap, .ctb-btn-bg, .icon-mask, .ctb-label { transition: none !important; }
  }
</style>