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

  function press(item) {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
    dispatch('action', item.id);
  }
</script>

<div
  class="ctb-wrap"
  class:ctb-hidden={!visible}
  style="transform: translate3d(0, {visible ? -kbOffset : 40}px, 0); background:{c.creationBarBg};"
>
  {#each TOOLS as item}
    <button class="ctb-btn" on:click={() => press(item)} aria-label={item.label}>
      <span
        class="icon-mask"
        style="mask-image:url('/icons/svg/docs/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/docs/{item.icon}.svg');background:{c.iconTint};width:22px;height:22px;"
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
    padding: 10px 8px calc(env(safe-area-inset-bottom, 0px) + 10px);
    box-shadow: 0 -1px 0 0 rgba(127,127,127,0.14);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
  }
  .ctb-wrap.ctb-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .ctb-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    padding: 4px 6px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .ctb-btn:active {
    transform: scale(0.9);
    opacity: 0.7;
  }
  .ctb-label {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: -0.1px;
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