<!-- components/SheetMenu.svelte -->
<script>
  import { localIconPath } from '$shared/local-icon.js';
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';

  export let visible = false;
  export let c;
  export let docName = '';

  const dispatch = createEventDispatcher();

  const ITEMS = [
    { id: 'duplicate', label: 'Duplicar', icon: 'copy_24_regular' },
    { id: 'export', label: 'Exportar CSV', icon: 'arrow_export_24_regular' },
    { id: 'delete', label: 'Apagar', icon: 'delete_24_regular', danger: true },
  ];

  let editingName = false;
  let nameDraft = '';
  let nameInputEl;

  async function startEditName() {
    editingName = true;
    nameDraft = docName;
    await tick();
    nameInputEl && nameInputEl.select();
  }
  function commitName() {
    editingName = false;
    const trimmed = nameDraft.trim();
    dispatch('rename', trimmed || docName);
  }

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
    const state = history.state;
    if (visible && (!state || state.nexaSheetMenu === undefined)) {
      dispatch('close');
    }
  }

  $: if (visible !== lastVisible) {
    lastVisible = visible;
    if (visible) pushMenuState();
    else editingName = false;
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
  <div class="anchor-menu" style="background:{c.dialogBackground}; border-color:{c.divider};">
    <div class="menu-handle" style="background:{c.divider}"></div>

    <!-- Nome do documento — vive aqui, não no appbar. -->
    <div class="menu-name-row">
      {#if editingName}
        <input
          class="menu-name-input"
          bind:this={nameInputEl}
          bind:value={nameDraft}
          style="color:{c.textPrimary}"
          on:blur={commitName}
          on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); } else if (e.key === 'Escape') { editingName = false; } }}
        />
      {:else}
        <button class="menu-name-display" style="color:{c.textPrimary}" on:click={startEditName}>
          {docName}
        </button>
      {/if}
    </div>
    <div class="anchor-divider" style="background:{c.divider}"></div>

    {#each ITEMS as item, i}
      <button class="anchor-item" class:anchor-danger={item.danger} style={item.danger ? '' : `color:${c.textPrimary}`} on:click={() => select(item.id)}>
        <span
          class="anchor-icon"
          style="mask-image:url('{localIconPath(item.icon)}');-webkit-mask-image:url('{localIconPath(item.icon)}');background:{item.danger ? 'var(--danger)' : c.iconTint};"
        ></span>
        <span>{item.label}</span>
      </button>
    {/each}
    <div class="menu-safe-bottom"></div>
  </div>
{/if}

<style>
  .anchor-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0);
    border: none; cursor: default; width: 100%; height: 100%;
    transition: background .3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .anchor-menu {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    /* Raio pequeno no topo — não os 20px "enormes" usados antes,
       consistente com a escala de 12-14px já usada nos itens internos. */
    border-radius: 12px 12px 0 0;
    border: 1px solid;
    padding: 8px 8px 4px;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    z-index: 81;
    max-height: 70vh;
    overflow-y: auto;
  }
  .menu-handle { width: 36px; height: 4px; border-radius: 2px; margin: 6px auto 10px; }

  .menu-name-row { padding: 2px 10px 8px; }
  .menu-name-display {
    display: block; width: 100%; background: none; border: none;
    font-size: 17px; font-weight: 700; padding: 6px 4px; border-radius: 10px;
    cursor: pointer; text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .menu-name-display:active { background: rgba(127,127,127,0.10); }
  .menu-name-input {
    width: 100%; background: none; border: none; outline: none;
    font-size: 17px; font-weight: 700; padding: 6px 4px; font-family: inherit;
  }

  .anchor-item {
    width: 100%; display: flex; align-items: center; gap: 14px;
    background: none; border: none; padding: 15px 14px; border-radius: 12px;
    font-size: 16px; font-weight: 500; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent; transition: background .12s;
  }
  .anchor-item:active { background: rgba(127,127,127,0.10); }
  .anchor-danger { color: var(--danger); }
  .anchor-divider { height: 1px; margin: 4px 10px 8px; }
  .menu-safe-bottom { height: env(safe-area-inset-bottom, 0px); }

  .anchor-icon {
    width: 24px; height: 24px; flex-shrink: 0; display: block;
    mask-repeat: no-repeat; mask-position: center; mask-size: contain;
    -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
  }
</style>