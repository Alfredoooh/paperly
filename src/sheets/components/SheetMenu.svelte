<!-- components/SheetMenu.svelte -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fluentIconUrl } from '../lib/icon-fallback.js';
  
  export let visible = false;
  export let anchor = { top: 0, right: 0 };
  export let c;
  
  const dispatch = createEventDispatcher();
  
  const ITEMS = [
    { id: 'duplicate', label: 'Duplicar', icon: 'duplicate' },
    { id: 'export', label: 'Exportar CSV', icon: 'export' },
    { id: 'delete', label: 'Apagar', icon: 'delete', danger: true },
  ];
  
  function select(id) {
    dispatch('select', id);
  }
  
  // ────────────────────────────────────────────────────────────────
  // FIX (bug de navegação): antes, este menu abria/fechava só por
  // estado local (`visible`), sem empurrar história nenhuma — o botão
  // físico de voltar do Android saltava por cima dele e fechava a
  // app inteira em vez de só fechar o menu. Agora segue a MESMA
  // "regra de ouro" já usada por drawer/search no home: abrir empurra
  // um estado real (pushState com `nexaSheetMenu`), e fechar nunca
  // esconde o menu diretamente — só pede history.back(); quem de
  // facto esconde é sempre o onpopstate.
  // ────────────────────────────────────────────────────────────────
  let lastVisible = false;
  let suppressOwnPopstate = false;
  
  function pushMenuState() {
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaSheetMenu: true, fromPath: currentPath }, '', currentPath);
  }
  
  function requestClose() {
    if (history.state && history.state.nexaSheetMenu) {
      history.back();
    } else {
      dispatch('close');
    }
  }
  
  function onPopState() {
    if (suppressOwnPopstate) return;
    const state = history.state;
    if (visible && (!state || state.nexaSheetMenu === undefined)) {
      dispatch('close');
    }
  }
  
  $: if (visible !== lastVisible) {
    lastVisible = visible;
    if (visible) pushMenuState();
  }
  
  onMount(() => {
    window.addEventListener('popstate', onPopState);
  });
  onDestroy(() => {
    window.removeEventListener('popstate', onPopState);
  });
</script>

{#if visible}
  <button class="anchor-overlay" on:click={requestClose} aria-label="Fechar menu"></button>
  <div class="anchor-menu" style="background:{c.dialogBackground}; border-color:{c.divider}; top:{anchor.top}px; right:{anchor.right}px;">
    {#each ITEMS as item, i}
      <button class="anchor-item" class:anchor-danger={item.danger} style={item.danger ? '' : `color:${c.textPrimary}`} on:click={() => select(item.id)}>
        <span
          class="anchor-icon"
          style="mask-image:url('{fluentIconUrl(item.icon)}');-webkit-mask-image:url('{fluentIconUrl(item.icon)}');background:{item.danger ? '#C42B1C' : c.iconTint};"
        ></span>
        <span>{item.label}</span>
      </button>
      {#if i < ITEMS.length - 1}
        <div class="anchor-divider" style="background:{c.divider}"></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .anchor-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: transparent; border: none; cursor: default; width: 100%; height: 100%;
  }
  .anchor-menu {
    position: fixed;
    min-width: 220px; width: min(240px, calc(100vw - 24px));
    border-radius: 22px;
    border: 1px solid;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.16);
    z-index: 81;
    transform-origin: top right;
    animation: anchorPop .26s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  @keyframes anchorPop {
    0% { transform: scale(0.85) translateY(-6px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .anchor-item {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 12px 14px; border-radius: 14px;
    font-size: 15px; font-weight: 600; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: background .12s;
  }
  .anchor-item:active { background: rgba(127,127,127,0.10); }
  .anchor-danger { color: #C42B1C; }
  .anchor-divider { height: 1px; margin: 0 10px; }

  .anchor-menu { overflow: hidden; }

  .anchor-icon {
    width: 24px; height: 24px; flex-shrink: 0; display: block;
    mask-repeat: no-repeat; mask-position: center; mask-size: contain;
    -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
  }

  @media (prefers-reduced-motion: reduce) {
    .anchor-menu { animation: none; }
  }
</style>