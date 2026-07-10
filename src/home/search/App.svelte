<!-- src/home/search/App.svelte -->
<script>
  import { onMount } from 'svelte';
  import { requireAuth } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';
  import { getTheme, syncTheme } from '$shared/theme.js';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';

  let query = '';
  let inputEl;
  let mounted = false;

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // fonte de pesquisa: apps da plataforma + modelos de imagem/documento
  $: searchPool = [
    ...platformApps.map(a => ({ id: `app-${a.id}`, type: 'App', label: a.label, action: () => openApp(a) })),
    ...IMAGE_MODELS.map(m => ({ id: m.id, type: 'Modelo de imagem', label: m.label, action: () => goToAIWithPrompt(m.prompt) })),
    ...DOC_MODELS.map(m => ({ id: m.id, type: 'Modelo de documento', label: m.label, action: () => goToAIWithPrompt(m.prompt) })),
  ];

  $: results = query.trim().length === 0
    ? []
    : searchPool.filter(r => normalize(r.label).includes(normalize(query)));

  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    window.location.href = app.path;
  }

  function goToAIWithPrompt(promptText) {
    try {
      sessionStorage.setItem('nexa_pending_message', promptText);
      sessionStorage.removeItem('nexa_pending_attachments');
    } catch (e) {}
    const ai = platformApps.find(x => x.id === 'ai');
    window.location.href = ai ? ai.path : '/ai/';
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

  // navegação real de página — dispara carregamento nativo (progress bar do browser)
  function goBack() {
    buzz();
    // se veio de dentro do próprio site (has referrer), volta no histórico real;
    // senão força a navegação de página completa para o Workspace.
    if (document.referrer && document.referrer.includes(window.location.host)) {
      history.back();
    } else {
      window.location.href = '/home/';
    }
  }

  onMount(() => {
    const user = requireAuth();
    if (!user) return;

    const saved = getTheme();
    const isDark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    syncTheme(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    mounted = true;
    requestAnimationFrame(() => inputEl?.focus());
  });
</script>

<div class="search-page" class:in={mounted}>
  <header class="search-header">
    <button class="back-btn pulse-tap" on:click={goBack} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/back.svg');-webkit-mask-image:url('/icons/svg/back.svg')"></span>
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html), :global(body) {
    overflow: hidden;
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
  }
  :global([data-theme="dark"]) {
    --app-bg: #0F0F0F;
    --icon-strong: rgba(255,255,255,0.88);
    --icon-faint: rgba(255,255,255,0.30);
    --text-faint: rgba(255,255,255,0.38);
    --border-faint: rgba(255,255,255,0.09);
    --btn-bg: rgba(255,255,255,0.10);
    --btn-bg-active: rgba(255,255,255,0.18);
    --row-active: rgba(255,255,255,0.07);
    --drawer-text: rgba(255,255,255,0.82);
  }
  :global([data-theme="light"]) {
    --app-bg: #FFFFFF;
    --icon-strong: rgba(20,20,20,0.85);
    --icon-faint: rgba(20,20,20,0.28);
    --text-faint: rgba(20,20,20,0.40);
    --border-faint: rgba(0,0,0,0.07);
    --btn-bg: rgba(0,0,0,0.06);
    --btn-bg-active: rgba(0,0,0,0.11);
    --row-active: rgba(0,0,0,0.05);
    --drawer-text: #111111;
  }

  .search-page {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    opacity: 0;
    transition: opacity .22s ease;
  }
  .search-page.in {
    opacity: 1;
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn {
    width: 36px;
    height: 36px;
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
    width: 18px;
    height: 18px;
  }

  .search-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--btn-bg);
    border-radius: 999px;
    padding: 0 12px;
    height: 40px;
  }
  .search-icon {
    width: 16px;
    height: 16px;
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
    font-size: 15px;
    color: var(--icon-strong);
    padding: 0;
  }
  .search-input::placeholder {
    color: var(--text-faint);
  }
  .clear-btn {
    width: 22px;
    height: 22px;
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
    width: 9px;
    height: 9px;
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