<!-- src/home/components/AppHeader.svelte -->
<!-- Usado por TODOS os tabs exceto "Criar" e "Eu" — o Criar tem o seu
     próprio header standalone dentro de CreateTab.svelte, e o Eu não
     tem appbar (é conteúdo direto, com o próprio bloco de perfil lá
     dentro). O avatar deixou de aparecer aqui: o acesso ao perfil
     passou a ser feito exclusivamente pelo tab "Eu" da bottombar
     (que já mostra o avatar como o próprio ícone do tab) e pelo
     bloco de perfil dentro do MeTab — não há mais um segundo ponto
     de entrada duplicado no appbar.
     O comportamento "silver" (fundo azul Fluent sólido, igual ao
     header do CreateTab) é REATIVO ao scroll: aparece assim que
     `scrolled` (já medido/passado por App.svelte a partir do
     scrollTop real) ultrapassa um pequeno threshold. Continua a poder
     ser forçado sempre visível via `solidOnScroll` — controla se este
     comportamento está ativo ou não para o tab atual; quando falso, o
     header mantém-se sempre no glass translúcido original. -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;

  export let title = '';

  // solidOnScroll: quando true, o header fica "silver" (azul Fluent
  // sólido) assim que o utilizador desliza — igual ao CreateTab. Cada
  // tab decide se quer este comportamento via App.svelte.
  export let solidOnScroll = false;

  export let showSearchBtn = false;
  export let onOpenSearch = () => {};

  export let showToggle = false;
  export let toggleOptions = [];
  export let toggleValue = '';
  export let onToggleChange = () => {};

  // Threshold baixo de propósito: `scrolled` já vem normalizado
  // 0→1 pelos primeiros 24px de scroll (ver App.svelte/handleScroll),
  // por isso basta um leve deslize para o silver assumir — igual à
  // sensação do CreateTab, que reage a partir de heroProgress.
  const SILVER_THRESHOLD = 0.4;
  $: isSolid = solidOnScroll && scrolled >= SILVER_THRESHOLD;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function handleSearch() {
    buzz();
    onOpenSearch();
  }

  function selectToggle(id) {
    if (id === toggleValue) return;
    buzz();
    onToggleChange(id);
  }

  $: toggleIndex = Math.max(0, toggleOptions.findIndex(o => o.id === toggleValue));
</script>

<div
  class="top-panel"
  class:in={mounted}
  class:solid={isSolid}
  bind:this={topPanelEl}
>
  <div class="gradient-layer"></div>
  <header class="header">
    <div class="header-inner">
      <h1 class="header-title" class:solid-title={isSolid}>{title}</h1>
      {#if showSearchBtn}
        <div class="header-actions">
          <button class="action-btn pulse-tap" class:solid-btn={isSolid} on:click={handleSearch} aria-label="Pesquisar">
            <span class="icon-mask" class:solid-icon={isSolid} style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
          </button>
        </div>
      {/if}
    </div>

    {#if showToggle && toggleOptions.length > 0}
      <div class="segmented" class:solid-segmented={isSolid} style="--count:{toggleOptions.length}">
        <div class="segmented-thumb" style="--index:{toggleIndex}"></div>
        {#each toggleOptions as opt}
          <button
            class="segmented-opt"
            class:active={toggleValue === opt.id}
            on:click={() => selectToggle(opt.id)}
          >
            <span class="segmented-opt-label">{opt.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </header>
  <div class="header-elevate" style="opacity:{isSolid ? 0 : scrolled}"></div>
</div>

<style>
  .top-panel {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 15;
    display: flex;
    flex-direction: column;
    background: rgba(var(--header-glass-rgb), 0.74);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    opacity: 0;
    transform: translateY(-16px) translateZ(0);
    transition: opacity .5s cubic-bezier(0.16,1,0.3,1), transform .5s cubic-bezier(0.16,1,0.3,1), background .24s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
  }
  .top-panel.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }

  /* ---------- Silver: azul Fluent sólido, igual ao header do
     CreateTab (#185ABD), ativado por scroll via isSolid. ---------- */
  .top-panel.solid {
    background: #185ABD;
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }
  .gradient-layer {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0;
    background: linear-gradient(
      to bottom,
      rgba(var(--header-glass-rgb), 1) 0%,
      rgba(var(--header-glass-rgb), 1) 78%,
      rgba(var(--header-glass-rgb), 0) 100%
    );
    transition: opacity .2s ease;
    pointer-events: none;
  }
  .top-panel.solid .gradient-layer {
    opacity: 0;
  }

  .header-elevate {
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 1px;
    background: var(--border-soft);
    box-shadow: 0 8px 20px var(--drawer-shadow);
    pointer-events: none;
    transition: opacity .18s linear;
  }

  /* ------------------------------------------------------------------
     FIX (bug: header enorme com "espaço de bottombar" dentro dele):
     o padding-bottom usava env(safe-area-inset-top,0px) — a MESMA
     variável do topo — em vez de um valor fixo pequeno. Em qualquer
     aparelho com status bar/notch (inset-top tipicamente 24–48px),
     isto somava esse valor DUAS vezes (uma no padding-top, correta
     para não ficar por baixo da status bar, e outra repetida sem
     necessidade no padding-bottom), inflando a altura total do header
     em dezenas de pixels a mais do que o necessário — daí a sensação
     de um bloco de espaço vazio extra, como se fosse uma bottombar
     lá dentro. Agora o padding-bottom é um valor fixo de design
     (10px), independente da safe-area do topo.
     ------------------------------------------------------------------ */
  .header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 640px;
  }

  .header-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: var(--icon-strong);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color .2s ease;
  }
  .header-title.solid-title {
    color: #FFFFFF;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .action-btn {
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
  .action-btn.solid-btn {
    background: transparent;
  }
  .action-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .action-btn.solid-btn:active {
    background: rgba(255,255,255,0.16);
  }
  .action-btn .icon-mask {
    width: 17px;
    height: 17px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .action-btn .icon-mask.solid-icon {
    background: #FFFFFF;
  }

  .segmented {
    position: relative;
    display: flex;
    width: 100%;
    max-width: 640px;
    background: var(--btn-bg);
    border-radius: 999px;
    padding: 4px;
    transition: background .22s cubic-bezier(0.16,1,0.3,1);
  }
  .segmented.solid-segmented {
    background: rgba(255,255,255,0.14);
  }
  .segmented-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--count));
    height: calc(100% - 8px);
    border-radius: 999px;
    background: var(--btn-solid-bg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.12);
    transform: translateX(calc(var(--index) * 100%));
    transition: transform .48s cubic-bezier(0.22, 1.42, 0.36, 1);
  }
  .solid-segmented .segmented-thumb {
    background: #FFFFFF;
  }
  .segmented-opt {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 6px;
    border: none;
    background: transparent;
    font: inherit;
    cursor: pointer;
    border-radius: 999px;
    -webkit-tap-highlight-color: transparent;
  }
  .segmented-opt-label {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-faint);
    transition: color .22s ease, transform .3s cubic-bezier(0.22, 1.42, 0.36, 1);
  }
  .solid-segmented .segmented-opt-label {
    color: rgba(255,255,255,0.75);
  }
  .segmented-opt.active .segmented-opt-label {
    color: var(--btn-solid-text);
    transform: scale(1.04);
  }
  .solid-segmented .segmented-opt.active .segmented-opt-label {
    color: #185ABD;
  }
  .segmented-opt:active .segmented-opt-label {
    transform: scale(0.92);
  }

  @media (hover:hover) and (pointer:fine) {
    .action-btn:not(.solid-btn):hover { background: var(--btn-bg-active); }
    .action-btn.solid-btn:hover { background: rgba(255,255,255,0.16); }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-panel, .action-btn, .header-elevate, .segmented-thumb, .segmented-opt-label { transition: none !important; }
  }

  @media (min-width: 720px) {
    .header-inner, .segmented { max-width:760px; }
  }

  .pulse-tap {
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }
</style>