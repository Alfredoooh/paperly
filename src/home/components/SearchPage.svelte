<!-- src/home/components/SearchPage.svelte -->
<script>
  import { onMount } from 'svelte';

  export let pushed = false; // true = tela empurrada para dentro (visível)
  export let platformApps = [];
  export let imageModels = [];
  export let onOpenApp = () => {};
  export let docModels = [];
  export let onUsePrompt = () => {};
  export let onClose = () => {};

  let query = '';
  let inputEl;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  $: searchPool = [
    ...platformApps.map(a => ({ id: `app-${a.id}`, type: 'App', label: a.label, action: () => openApp(a) })),
    ...imageModels.map(m => ({ id: m.id, type: 'Modelo de imagem', label: m.label, action: () => onUsePrompt(m.prompt) })),
    ...docModels.map(m => ({ id: m.id, type: 'Modelo de documento', label: m.label, action: () => onUsePrompt(m.prompt) })),
  ];

  $: results = query.trim().length === 0
    ? []
    : searchPool.filter(r => normalize(r.label).includes(normalize(query)));

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    onOpenApp(app);
  }

  function pickResult(r) {
    buzz();
    r.action?.();
  }

  function clearQuery() {
    buzz();
    query = '';
    inputEl?.focus();
  }

  function handleClose() {
    buzz();
    onClose();
  }

  onMount(() => {
    // foca depois da transição de entrada terminar, para não atrapalhar
    // a animação de slide com o teclado a abrir no meio do movimento
    setTimeout(() => inputEl?.focus(), 340);
  });
</script>

<div class="search-page" class:pushed>
  <header class="search-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg')"></span>
    </button>

    <div class="search-field">
      <span class="icon-mask search-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        inputmode="search"
        enterkeyhint="search"
        placeholder="Pesquisar designs, projetos, modelos…"
        class="search-input"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if query}
        <button class="clear-btn pulse-tap" on:click={clearQuery} aria-label="Limpar pesquisa">
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg')"></span>
        </button>
      {/if}
    </div>
  </header>

  <div class="search-body">
    {#if query.trim().length === 0}
      <div class="search-empty">
        <span class="icon-mask search-empty-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
        <p class="search-empty-title">Pesquisa em toda a Nexa</p>
        <p class="search-empty-sub">Designs, projetos e modelos, tudo num só sítio.</p>
      </div>
    {:else if results.length === 0}
      <div class="search-empty">
        <p class="search-empty-title">Sem resultados</p>
        <p class="search-empty-sub">Tenta outro termo de pesquisa.</p>
      </div>
    {:else}
      <div class="search-results">
        {#each results as r (r.id)}
          <button class="search-result-row" on:click={() => pickResult(r)}>
            <span class="search-result-label">{r.label}</span>
            <span class="search-result-type">{r.type}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .search-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    transform: translate3d(100%, 0, 0);
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
    box-shadow: -6px 0 24px rgba(0,0,0,0.18);
  }
  .search-page.pushed {
    transform: translate3d(0, 0, 0);
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .back-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask {
    width: 26px;
    height: 26px;
  }

  .search-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--btn-bg);
    border-radius: 999px;
    padding: 0 16px;
    height: 48px;
  }
  .search-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0.6;
  }
  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font: inherit;
    font-size: 16.5px;
    color: var(--icon-strong);
    padding: 0;
  }
  .search-input::placeholder {
    color: var(--text-faint);
  }
  .clear-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg-active);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }
  .clear-btn .icon-mask {
    width: 10px;
    height: 10px;
  }

  .icon-mask {
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .search-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 24px);
  }

  .search-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 18vh 24px 0;
    gap: 8px;
  }
  .search-empty-icon {
    width: 40px;
    height: 40px;
    background: var(--icon-faint);
    margin-bottom: 6px;
  }
  .search-empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    margin: 0;
  }
  .search-empty-sub {
    font-size: 13.5px;
    color: var(--text-faint);
    margin: 0;
    max-width: 260px;
  }

  .search-results {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }
  .search-result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 4px;
    border-bottom: 1px solid var(--border-faint);
    border-top: none;
    border-left: none;
    border-right: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: opacity .14s, background .14s;
  }
  .search-result-row:active {
    opacity: .6;
    background: var(--row-active);
  }
  .search-result-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--drawer-text);
  }
  .search-result-type {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-faint);
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .search-page { transition: none !important; }
  }
</style>