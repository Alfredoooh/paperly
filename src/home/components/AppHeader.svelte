<!-- src/home/components/AppHeader.svelte -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;
  export let onOpenDrawer;

  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';

  export let title = '';

  // appbar sem blur, com gradiente sólido->transparente (usado no tab "Templates")
  export let solidGradient = false;

  // appbar totalmente transparente, sem fundo nem blur (usado no tab "Criar")
  export let transparent = false;

  // botão de pesquisa (usado apenas no tab "Templates")
  export let showSearchBtn = false;
  export let onOpenSearch = () => {};

  // toggle nativo (usado apenas no tab "Templates")
  export let showToggle = false;
  export let toggleOptions = []; // [{id,label}]
  export let toggleValue = '';
  export let onToggleChange = () => {};

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function handleMenu() {
    buzz();
    if (window.AndroidDrawer && typeof window.AndroidDrawer.openAccountDrawer === 'function') {
      window.AndroidDrawer.openAccountDrawer();
    } else {
      onOpenDrawer?.();
    }
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

<div class="top-panel" class:in={mounted} class:solid-gradient={solidGradient} class:transparent-panel={transparent} bind:this={topPanelEl}>
  <div class="gradient-layer"></div>
  <header class="header">
    <div class="header-inner">
      <h1 class="header-title" class:on-image={transparent}>{title}</h1>
      <div class="header-actions">
        {#if showSearchBtn}
          <button class="action-btn pulse-tap" on:click={handleSearch} aria-label="Pesquisar">
            <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg')"></span>
          </button>
        {/if}
        <button class="profile-btn pulse-tap" on:click={handleMenu} aria-label="Perfil">
          {#if avatarUrl}
            <img src={avatarUrl} alt={userName} class="profile-img" />
          {:else}
            <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
          {/if}
        </button>
      </div>
    </div>

    {#if showToggle && toggleOptions.length > 0}
      <div class="segmented" style="--count:{toggleOptions.length}">
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
  <div class="header-elevate" style="opacity:{(solidGradient || transparent) ? 0 : scrolled}"></div>
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
    transition: opacity .5s cubic-bezier(0.16,1,0.3,1), transform .5s cubic-bezier(0.16,1,0.3,1), background .2s ease;
    pointer-events: none;
    contain: layout style paint;
  }
  .top-panel.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }

  /* Templates: sem blur, gradiente sólido (topo) -> transparente (fundo).
     CORRIGIDO: antes o gradiente ficava sólido só até 55% da própria
     altura do appbar e desvanecia lentamente até 100% — como a faixa é
     estreita, na prática isso lia como "transparente demais, cedo
     demais", deixando o conteúdo por trás visível perto da base do
     appbar. Agora fica sólido até mais tarde (78%) e o fade final é
     bem mais curto e abrupto, then close to nothing bleeds through. */
  .top-panel.solid-gradient {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
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
  .top-panel.solid-gradient .gradient-layer {
    opacity: 1;
  }

  /* Criar & Workspace: appbar 100% transparente, sem fundo, sem blur,
     sem gradiente — a imagem de fundo do CreateTab passa por trás
     dele livremente, tal como no CapCut. */
  .top-panel.transparent-panel {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .top-panel.transparent-panel .gradient-layer {
    opacity: 0;
  }
  /* título em branco fixo sobre a imagem (independente do tema) */
  .header-title.on-image {
    color: #fff;
    text-shadow: 0 1px 6px rgba(0,0,0,0.35);
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
  .header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 16px calc(env(safe-area-inset-top,0px) + 4px);
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
  .action-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
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

  .profile-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--btn-solid-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .profile-btn:active {
    background: var(--btn-solid-bg-active);
    transform: scale(0.9);
  }
  .profile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .profile-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }

  /* Toggle */
  .segmented {
    position: relative;
    display: flex;
    width: 100%;
    max-width: 640px;
    background: var(--btn-bg);
    border-radius: 999px;
    padding: 4px;
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
  .segmented-opt.active .segmented-opt-label {
    color: var(--btn-solid-text);
    transform: scale(1.04);
  }
  .segmented-opt:active .segmented-opt-label {
    transform: scale(0.92);
  }

  @media (hover:hover) and (pointer:fine) {
    .profile-btn:hover { background: var(--btn-solid-bg-active); }
    .action-btn:hover { background: var(--btn-bg-active); }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-panel, .profile-btn, .action-btn, .header-elevate, .segmented-thumb, .segmented-opt-label { transition: none !important; }
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