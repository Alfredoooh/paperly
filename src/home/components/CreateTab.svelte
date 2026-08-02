<!-- src/home/components/CreateTab.svelte -->
<script>
  export let platformApps = null;
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};

  export let heroProgress = 0;
  export let isDark = false;

  export let mounted = false;
  export let title = '';

  export let onOpenNotifications = () => {};
  export let hasUnreadNotifications = false;

  export let rootEl = null;
  export let appbarHeight = 56;

  export let recentProjects = null;
  export let onOpenProject = () => {};

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const NOTIF_ICON = `${FLUENT_BASE}/alert_24_regular.svg`;

  // silver appbar REMOVIDO por completo — o header do Create fica
  // sempre no estado glass/transparente original, nunca fica sólido
  // ao rolar. isSolid deixou de existir; searchBtnVisible/demais
  // lógicas de opacidade continuam iguais, só a mudança de fundo foi
  // retirada.
  $: searchBarOpacity = 1 - heroProgress;
  $: searchBarScale = 1 - 0.08 * heroProgress;
  $: searchBarInert = heroProgress > 0.9;

  $: searchBtnVisible = searchBarOpacity <= 0;

  import { onMount as onLocalMount } from 'svelte';
  let localMounted = false;
  $: effectiveMounted = mounted || localMounted;
  onLocalMount(() => {
    const t = setTimeout(() => {
      if (!mounted) localMounted = true;
    }, 600);
    return () => clearTimeout(t);
  });

  function openApp(app) {
    try { navigator.vibrate && navigator.vibrate(7); } catch (e) {}
    onOpenApp(app);
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  function handleOpenSearch() {
    buzz();
    onOpenSearch(null);
  }

  function handleNotifications() {
    buzz();
    onOpenNotifications?.();
  }

  function openProject(p) {
    try { navigator.vibrate && navigator.vibrate(7); } catch (e) {}
    onOpenProject(p);
  }

  function timeAgo(updatedAt) {
    if (!updatedAt) return '';
    const then = new Date(updatedAt).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d}d`;
    const w = Math.floor(d / 7);
    return `há ${w}sem`;
  }

  const SKELETON_COUNT = 4;
  const APPS_SKELETON_COUNT = 6;
</script>

<!-- Header próprio do Create: SEM estado "solid" — fica sempre no
     mesmo visual glass/transparente, independentemente do scroll. -->
<div class="create-header" class:in={effectiveMounted}>
  <div class="create-header-inner">
    <h1 class="create-header-title visible">Criar</h1>
    <div class="header-actions">
      <button
        class="search-btn pulse-tap"
        class:visible={searchBtnVisible}
        tabindex={searchBtnVisible ? 0 : -1}
        aria-hidden={!searchBtnVisible}
        on:click={handleOpenSearch}
        aria-label="Pesquisar"
      >
        <span class="icon-mask header-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
      </button>
      <button class="notif-btn pulse-tap" on:click={handleNotifications} aria-label="Notificações">
        <span class="icon-mask notif-icon" style="mask-image:url('{NOTIF_ICON}');-webkit-mask-image:url('{NOTIF_ICON}')"></span>
        {#if hasUnreadNotifications}
          <span class="notif-dot"></span>
        {/if}
      </button>
    </div>
  </div>
</div>

<div class="create-tab">

  <div class="hero-bg">
    <button
      class="search-bar pulse-tap"
      style="opacity:{searchBarOpacity}; transform:scale({searchBarScale});"
      class:search-bar-inert={searchBarInert}
      on:click={handleOpenSearch}
    >
      <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
      <span class="search-bar-placeholder">Pesquisar designs, projetos, modelos…</span>
    </button>
  </div>

  <span class="apps-card-title">Comece a criar com</span>
  <div class="apps-card">
    {#if platformApps === null || platformApps === undefined || platformApps.length === 0}
      <div class="apps-grid">
        {#each Array(APPS_SKELETON_COUNT) as _, i}
          <div class="app-item app-item-skeleton">
            <div class="app-icon-plain recent-skeleton"></div>
            <span class="recent-skeleton recent-skeleton-line" style="width:{i % 2 === 0 ? '68%' : '52%'}"></span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="apps-grid">
        {#each platformApps as app}
          <button class="app-item native-tap" on:click={() => openApp(app)}>
            <span class="app-icon-plain">
              <img src={app.icon} alt={app.label} class="app-icon-img" />
            </span>
            <span class="app-label">{app.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if recentProjects === null}
    <div class="recent-section">
      <div class="recent-section-head">
        <span class="recent-skeleton recent-skeleton-title"></span>
      </div>
      <div class="recent-row">
        <div class="recent-row-spacer" aria-hidden="true"></div>
        {#each Array(SKELETON_COUNT) as _}
          <div class="recent-card recent-card-skeleton">
            <div class="recent-thumb recent-skeleton"></div>
            <span class="recent-skeleton recent-skeleton-line" style="width:70%"></span>
            <span class="recent-skeleton recent-skeleton-line" style="width:45%"></span>
          </div>
        {/each}
        <div class="recent-row-spacer" aria-hidden="true"></div>
      </div>
    </div>
  {:else if recentProjects.length > 0}
    <div class="recent-section">
      <div class="recent-section-head">
        <h2 class="recent-section-title">Continue a criar designs</h2>
        <span class="recent-section-cta">Ver tudo</span>
      </div>
      <div class="recent-row">
        <div class="recent-row-spacer" aria-hidden="true"></div>
        {#each recentProjects as p (p.id)}
          <button class="recent-card native-tap" on:click={() => openProject(p)}>
            <div class="recent-thumb">
              {#if p.thumbnail}
                <img src={p.thumbnail} alt={p.title} loading="lazy" />
              {:else}
                <div class="recent-thumb-fallback" style="background:{p.color || 'var(--accent-primary)'}"></div>
              {/if}
            </div>
            <span class="recent-card-title">{p.title}</span>
            {#if p.updatedAt}
              <span class="recent-card-time">{timeAgo(p.updatedAt)}</span>
            {/if}
          </button>
        {/each}
        <div class="recent-row-spacer" aria-hidden="true"></div>
      </div>
    </div>
  {:else}
    <div class="recent-section">
      <div class="empty-state">
        <svg class="empty-state-illustration" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="14" y="18" width="70" height="54" rx="10" fill="var(--row-active, rgba(127,127,127,0.10))" />
          <rect x="14" y="18" width="70" height="54" rx="10" stroke="var(--drawer-sep, rgba(127,127,127,0.25))" stroke-width="1.5" />
          <rect x="26" y="32" width="46" height="6" rx="3" fill="var(--drawer-sep, rgba(127,127,127,0.3))" />
          <rect x="26" y="44" width="34" height="6" rx="3" fill="var(--drawer-sep, rgba(127,127,127,0.22))" />
          <rect x="26" y="56" width="24" height="6" rx="3" fill="var(--drawer-sep, rgba(127,127,127,0.18))" />
          <circle cx="92" cy="66" r="20" fill="var(--accent-primary)" />
          <path d="M92 57v18M83 66h18" stroke="var(--text-on-accent)" stroke-width="3.4" stroke-linecap="round" />
        </svg>
        <p class="empty-state-title">Ainda sem criações recentes</p>
        <p class="empty-state-text">Os teus projetos vão aparecer aqui assim que começares a criar.</p>
      </div>
    </div>
  {/if}

</div>

<style>
  .create-tab,
  .apps-card,
  .search-bar,
  .recent-card,
  .recent-thumb,
  .create-header-title,
  .apps-card-title,
  .app-label,
  .recent-card-title,
  .recent-card-time,
  .recent-section-title,
  .recent-section-cta,
  .empty-state-title,
  .empty-state-text {
    font-family: 'Google Sans Text', 'Roboto Flex', 'Segoe UI Variable', system-ui, -apple-system, sans-serif;
  }

  /* Header do Create: SEMPRE glass/transparente, nunca sólido —
     silver appbar removido por completo, sem classe .solid, sem
     transição de background. */
  .create-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 15;
    height: calc(env(safe-area-inset-top, 0px) + 56px);
    background: transparent;
    opacity: 0;
    transform: translateY(-16px) translateZ(0);
    transition:
      opacity .42s cubic-bezier(0.32, 0.72, 0, 1),
      transform .42s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
    overflow: hidden;
  }
  .create-header.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .create-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    height: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: env(safe-area-inset-top, 0px) 16px 0;
  }
  /* Título "Criar": peso máximo (900, tipo WhatsApp) e azul Microsoft
     que muda por tema — antes tinha lógica de cor separada para
     "solid", que deixou de existir junto com o silver appbar. */
  .create-header-title {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.4px;
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0;
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  :global([data-theme="light"]) .create-header-title { color: var(--accent-primary); }
  :global([data-theme="dark"]) .create-header-title { color: var(--accent-primary); }
  .create-header-title.visible {
    opacity: 1;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .search-btn {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    opacity: 0;
    transform: scale(0.7);
    transition:
      opacity .2s cubic-bezier(0.32, 0.72, 0, 1),
      transform .2s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events: none;
  }
  .search-btn.visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .search-btn:active {
    opacity: 0.6;
  }
  .header-icon {
    width: 21px;
    height: 21px;
    background: var(--drawer-text);
  }

  .notif-btn {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: opacity .16s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .notif-btn:active {
    opacity: 0.55;
    transform: scale(0.92);
  }
  .notif-icon {
    width: 21px;
    height: 21px;
    background: var(--drawer-text);
  }
  .notif-dot {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger-active);
    border: 1.5px solid var(--app-bg, #ffffff);
  }

  @media (min-width: 720px) {
    .create-header-inner { max-width:760px; }
  }

  .create-tab {
    width: 100%;
  }

  .hero-bg {
    position: relative;
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 68px) 0 8px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(100% - 28px);
    height: 44px;
    margin: 0 14px 0;
    padding: 0 16px;
    border: 1px solid var(--drawer-sep, rgba(127,127,127,0.22));
    border-radius: 999px;
    background: var(--drawer-bg);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    z-index: 1;
    transition: border-color .16s cubic-bezier(0.32,0.72,0,1), background .2s cubic-bezier(0.32,0.72,0,1);
  }
  :global([data-theme="light"]) .search-bar:active { border-color: var(--accent-primary); }
  :global([data-theme="dark"]) .search-bar:active { border-color: var(--accent-primary); }
  .search-bar.search-bar-inert {
    pointer-events: none;
  }
  .search-bar-icon {
    width: 17px;
    height: 17px;
    background: var(--icon-faint);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
    opacity: 0.65;
  }
  .search-bar-placeholder {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-faint);
  }

  .apps-card-title {
    display: block;
    margin: 18px 14px 10px;
    padding: 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
  }

  .apps-card {
    margin: 0 14px 0;
    padding: 16px 12px 12px;
    border-radius: 22px;
    background: var(--drawer-bg);
    border: 1px solid var(--drawer-sep, rgba(127,127,127,0.16));
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  :global([data-theme="dark"]) .apps-card {
    background: var(--btn-bg);
    border-color: rgba(255,255,255,0.08);
    box-shadow: none;
  }
  :global([data-theme="dark"]) .search-bar {
    background: var(--btn-bg);
    border-color: rgba(255,255,255,0.10);
  }
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px 8px;
  }
  .app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    -webkit-tap-highlight-color: transparent;
  }
  .app-item-skeleton {
    cursor: default;
  }
  .app-icon-plain {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 12px;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .app-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .native-tap:active .app-icon-plain {
    transform: scale(0.86);
  }
  .native-tap:active .app-label {
    opacity: 0.6;
  }
  .app-label {
    font-size: 12.5px;
    font-weight: 400;
    text-align: center;
    line-height: 1.25;
    max-width: 88px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    transition: opacity .16s cubic-bezier(0.16,1,0.3,1);
  }

  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    background: var(--icon-strong);
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.98); opacity: .85; }

  .recent-section {
    margin-top: 28px;
  }
  .recent-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 12px;
  }
  .recent-section-title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--drawer-text);
    margin: 0;
  }
  .recent-section-cta {
    font-size: 13px;
    font-weight: 600;
  }
  :global([data-theme="light"]) .recent-section-cta { color: var(--accent-primary); }
  :global([data-theme="dark"]) .recent-section-cta { color: var(--accent-primary); }

  .recent-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    scroll-padding-left: 14px;
    scroll-padding-right: 14px;
  }
  .recent-row::-webkit-scrollbar {
    display: none;
  }
  .recent-row-spacer {
    flex: 0 0 auto;
    width: 2px;
    scroll-snap-align: none;
  }
  .recent-card {
    flex: 0 0 auto;
    width: 132px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: none;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    scroll-snap-align: start;
    -webkit-tap-highlight-color: transparent;
    font: inherit;
    color: var(--drawer-text);
  }
  .recent-thumb {
    width: 132px;
    height: 132px;
    border-radius: 20px;
    overflow: hidden;
    background: var(--row-active, rgba(127,127,127,0.10));
    border: 1px solid var(--drawer-sep, rgba(127,127,127,0.14));
    flex-shrink: 0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .recent-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .recent-thumb-fallback {
    width: 100%;
    height: 100%;
  }
  .recent-card-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .recent-card-time {
    font-size: 11.5px;
    font-weight: 400;
    color: var(--text-faint);
  }
  .native-tap:active .recent-thumb {
    transform: scale(0.97);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 32px 8px;
  }
  .empty-state-illustration {
    width: 120px;
    height: 100px;
    margin-bottom: 14px;
  }
  .empty-state-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: var(--drawer-text);
  }
  .empty-state-text {
    margin: 0;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--text-faint);
    max-width: 260px;
  }

  .recent-skeleton {
    position: relative;
    overflow: hidden;
    background: var(--row-active, rgba(127,127,127,0.12));
    border-radius: 10px;
  }
  .recent-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--drawer-text) 8%, transparent) 50%,
      transparent 100%
    );
    animation: skeleton-shimmer 1.3s ease-in-out infinite;
  }
  @keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .recent-skeleton-title {
    width: 160px;
    height: 17px;
    border-radius: 8px;
  }
  .recent-card-skeleton {
    cursor: default;
  }
  .recent-card-skeleton .recent-thumb {
    border-radius: 20px;
  }
  .recent-skeleton-line {
    height: 11px;
    border-radius: 6px;
  }
  @media (prefers-reduced-motion: reduce) {
    .recent-skeleton::after { animation: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .search-bar { transition: none !important; }
    .search-btn { transition: none !important; }
  }
</style>