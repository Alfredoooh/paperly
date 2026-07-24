<!-- src/home/components/CreateTab.svelte -->
<!-- Tem o SEU PRÓPRIO header, fixo e sempre transparente/branco.
     Não usa AppHeader — este tab é o único caso especial. -->
<script>
  export let platformApps = null;
  export let onOpenSearch = () => {};
  export let onOpenApp = () => {};

  export let heroProgress = 0;
  export let isDark = false;

  // dados do header próprio (antes vinham via AppHeader)
  export let mounted = false;
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  export let title = '';
  export let onOpenDrawer = () => {};

  // Notificações: aberto pelo App.svelte (mesmo padrão do onOpenDrawer).
  export let onOpenNotifications = () => {};
  export let hasUnreadNotifications = false;

  // Mantidas apenas para não quebrar o binding vindo do App.svelte —
  // já não são usadas aqui (o sheet deixou de ter push/limite).
  export let rootEl = null;
  export let appbarHeight = 56;

  // Recentes: lista de projetos recentes do utilizador. Cada item
  // esperado com {id, title, thumbnail, updatedAt}. Enquanto
  // recentProjects é null/undefined mostramos skeleton loader; um
  // array vazio [] significa "carregado, sem projetos" — mostra a
  // ilustração de estado vazio (sem skeleton).
  export let recentProjects = null;
  export let onOpenProject = () => {};

  // ══════════════════════════════════════════════════════════════════
  //  SILVER APPBAR: header sólido separado, que SÓ aparece ao deslizar
  //  para cima. Independente do .create-header original. Título fixo
  //  "Criar" à esquerda; avatar + notificações + pesquisa à direita.
  //  Fundo: azul Fluent (Microsoft 365) sólido/flat, sem gradiente.
  // ══════════════════════════════════════════════════════════════════
  const SOLID_THRESHOLD = 0.5;
  $: isSolid = heroProgress >= SOLID_THRESHOLD;

  // A search-bar desaparece progressivamente com o próprio scroll —
  // opacity e scale seguem heroProgress (0→1) continuamente, sem
  // liga/desliga abrupto. Só fica não-interativa perto do fim.
  $: searchBarOpacity = 1 - heroProgress;
  $: searchBarScale = 1 - 0.08 * heroProgress;
  $: searchBarInert = heroProgress > 0.9;

  // FIX (bug: "Criar" não aparecia): o título do .create-header
  // dependia SÓ de `mounted` — se o requestAnimationFrame do
  // App.svelte falhasse ou fosse cancelado antes de `mounted = true`
  // (ex: componente desmontado/remontado rápido durante troca de
  // tab), o header ficava preso em opacity:0 para sempre, e por
  // consequência o título "Criar" do silver-appbar (que só depende de
  // isSolid, independente de mounted) era a ÚNICA forma de ver
  // "Criar" — mas só ao rolar. Agora .create-header tem um fallback:
  // se este componente já correu onMount local e passaram mais de
  // 600ms sem `mounted` vir true por fora, força localMounted = true
  // por si próprio. Isto NÃO substitui a prop `mounted` (continua a
  // ser respeitada normalmente, incluindo a transição suave), é só
  // uma rede de segurança.
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
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    onOpenApp(app);
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  // Clique na search-bar: sempre slide normal, sem container
  // transform/origin — nada de medir getBoundingClientRect aqui.
  function handleOpenSearch() {
    buzz();
    onOpenSearch(null);
  }

  function handleMenu() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    if (window.AndroidDrawer && typeof window.AndroidDrawer.openAccountDrawer === 'function') {
      window.AndroidDrawer.openAccountDrawer();
    } else {
      onOpenDrawer?.();
    }
  }

  function handleNotifications() {
    buzz();
    onOpenNotifications?.();
  }

  function openProject(p) {
    try { navigator.vibrate && navigator.vibrate(7); } catch (e) {}
    onOpenProject(p);
  }

  // Formata "há X" de forma simples a partir de updatedAt (ISO string
  // ou timestamp), sem depender de libs externas.
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
  const APPS_SKELETON_COUNT = 6; // 2 filas de 3 colunas
</script>

<!-- Header próprio do Create: título fixo "Criar" + notificações + avatar. -->
<div class="create-header" class:in={effectiveMounted} class:solid={isSolid}>
  <div class="create-header-inner">
    <h1 class="create-header-title" class:visible={isSolid}>Criar</h1>
    <div class="header-actions">
      <button class="icon-btn pulse-tap" class:solid={isSolid} on:click={handleNotifications} aria-label="Notificações">
        <span class="icon-mask header-icon" style="mask-image:url('/icons/svg/regular/notification.svg');-webkit-mask-image:url('/icons/svg/regular/notification.svg')"></span>
        {#if hasUnreadNotifications}
          <span class="notif-dot"></span>
        {/if}
      </button>
      <button class="profile-btn pulse-tap" class:solid={isSolid} on:click={handleMenu} aria-label="Perfil">
        {#if avatarUrl}
          <img src={avatarUrl} alt={userName} class="profile-img" />
        {:else}
          <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
        {/if}
      </button>
    </div>
  </div>
</div>

<!-- Silver appbar: título fixo "Criar" à esquerda, notificações +
     avatar + botão de pesquisa à direita. Azul Fluent sólido. -->
<div class="silver-appbar" class:visible={isSolid} aria-hidden={!isSolid}>
  <div class="silver-appbar-inner">
    <span class="silver-appbar-title">Criar</span>
    <div class="silver-appbar-actions">
      <button
        class="silver-search-btn pulse-tap"
        class:visible={isSolid}
        tabindex={isSolid ? 0 : -1}
        aria-hidden={!isSolid}
        on:click={handleOpenSearch}
        aria-label="Pesquisar"
      >
        <span class="icon-mask silver-icon" style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
      </button>
      <button class="silver-search-btn pulse-tap" class:visible={isSolid} on:click={handleNotifications} aria-label="Notificações">
        <span class="icon-mask silver-icon" style="mask-image:url('/icons/svg/regular/notification.svg');-webkit-mask-image:url('/icons/svg/regular/notification.svg')"></span>
        {#if hasUnreadNotifications}
          <span class="notif-dot notif-dot-silver"></span>
        {/if}
      </button>
      <button class="profile-btn pulse-tap solid" on:click={handleMenu} aria-label="Perfil">
        {#if avatarUrl}
          <img src={avatarUrl} alt={userName} class="profile-img" />
        {:else}
          <span class="profile-initial" style="background:{avatarColor}">{userInitial}</span>
        {/if}
      </button>
    </div>
  </div>
</div>

<div class="create-tab">

  <!-- Sem saudação: a search-bar sobe para logo depois do appbar,
       com respiro mínimo. -->
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

  <!-- Apps: card estilo Microsoft 365 — título pequeno + grid 3
       colunas, ícones PNG soltos (sem círculo/fundo colorido).
       Skeleton cobre AMBOS os estados de carregamento:
       platformApps === null (ainda não chegou nada do pai) E
       platformApps === [] (chegou mas está vazio — tratado como
       "ainda a carregar" aqui, porque uma plataforma sem nenhuma app
       disponível é sinal de falha/timing, não de estado vazio real
       como acontece em "Continue a criar", que tem o seu próprio
       empty-state distinto do skeleton). -->
  <div class="apps-card">
    <span class="apps-card-title">Comece a criar com</span>

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

  <!-- Continuar a criar: skeleton enquanto carrega, ilustração de
       estado vazio quando não há nenhum projeto recente, lista
       normal quando há. -->
  {#if recentProjects === null}
    <div class="recent-section">
      <div class="recent-section-head">
        <span class="recent-skeleton recent-skeleton-title"></span>
      </div>
      <div class="recent-row">
        {#each Array(SKELETON_COUNT) as _}
          <div class="recent-card recent-card-skeleton">
            <div class="recent-thumb recent-skeleton"></div>
            <span class="recent-skeleton recent-skeleton-line" style="width:70%"></span>
            <span class="recent-skeleton recent-skeleton-line" style="width:45%"></span>
          </div>
        {/each}
      </div>
    </div>
  {:else if recentProjects.length > 0}
    <div class="recent-section">
      <div class="recent-section-head">
        <h2 class="recent-section-title">Continue a criar designs</h2>
        <span class="recent-section-cta">Ver tudo</span>
      </div>
      <div class="recent-row">
        {#each recentProjects as p (p.id)}
          <button class="recent-card native-tap" on:click={() => openProject(p)}>
            <div class="recent-thumb">
              {#if p.thumbnail}
                <img src={p.thumbnail} alt={p.title} loading="lazy" />
              {:else}
                <div class="recent-thumb-fallback" style="background:{p.color || '#8E8E93'}"></div>
              {/if}
            </div>
            <span class="recent-card-title">{p.title}</span>
            {#if p.updatedAt}
              <span class="recent-card-time">{timeAgo(p.updatedAt)}</span>
            {/if}
          </button>
        {/each}
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
          <circle cx="92" cy="66" r="20" fill="#185ABD" />
          <path d="M92 57v18M83 66h18" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        </svg>
        <p class="empty-state-title">Ainda sem criações recentes</p>
        <p class="empty-state-text">Os teus projetos vão aparecer aqui assim que começares a criar.</p>
      </div>
    </div>
  {/if}

</div>

<style>
  /* ════════════════════════════════════════════════════════════════
     FLUENT DESIGN (Microsoft 365): variáveis locais de cor/forma.
     Azul Fluent: #185ABD (acento principal). Cantos AGORA mais
     curvos em todo o ecrã (pedido explícito): search-bar 100% pill,
     apps-card e thumbs com raio bem maior que o Fluent "oficial"
     (que usa 8-12px) — aqui prioriza-se a curvatura pedida sobre a
     fidelidade estrita ao Fluent anguloso. Elevação por BORDA FINA +
     sombra muito subtil, em vez de sombra grande. Tipografia: Segoe
     UI com fallback do sistema.
     ════════════════════════════════════════════════════════════════ */
  .create-tab,
  .apps-card,
  .search-bar,
  .recent-card,
  .recent-thumb,
  .silver-appbar,
  .create-header-title,
  .apps-card-title,
  .app-label,
  .recent-card-title,
  .recent-card-time,
  .recent-section-title,
  .recent-section-cta,
  .silver-appbar-title,
  .empty-state-title,
  .empty-state-text {
    font-family: 'Segoe UI', 'Segoe UI Variable', system-ui, -apple-system, sans-serif;
  }

  /* ---------- Header próprio do Create ---------- */
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
      transform .42s cubic-bezier(0.32, 0.72, 0, 1),
      background .28s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
    overflow: hidden;
  }
  .create-header.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .create-header.solid {
    background: var(--app-bg);
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
  .create-header-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--drawer-text);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0;
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .create-header-title.visible {
    opacity: 1;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
  }
  .icon-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
    transition:
      background .28s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow .28s cubic-bezier(0.32, 0.72, 0, 1),
      transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .icon-btn.solid {
    background: var(--row-active, rgba(127,127,127,0.12));
    box-shadow: none;
  }
  .icon-btn:active {
    transform: scale(0.9);
  }
  .icon-btn:not(.solid):active {
    background: rgba(255,255,255,0.26);
  }
  .icon-btn.solid:active {
    background: var(--row-hover, rgba(127,127,127,0.2));
  }
  .header-icon {
    width: 19px;
    height: 19px;
    background: var(--icon-strong);
  }
  .create-header .header-icon {
    background: var(--drawer-text);
  }
  .create-header .icon-btn:not(.solid) .header-icon {
    background: #FFFFFF;
  }
  .notif-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E3242B;
    border: 1.5px solid var(--app-bg, #fff);
  }
  .profile-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
    transition:
      background .28s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow .28s cubic-bezier(0.32, 0.72, 0, 1),
      transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .profile-btn.solid {
    background: var(--row-active, rgba(127,127,127,0.12));
    box-shadow: none;
  }
  .profile-btn:active {
    transform: scale(0.9);
  }
  .profile-btn:not(.solid):active {
    background: rgba(255,255,255,0.26);
  }
  .profile-btn.solid:active {
    background: var(--row-hover, rgba(127,127,127,0.2));
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
    font-weight: 600;
    color: #fff;
  }
  @media (hover:hover) and (pointer:fine) {
    .icon-btn:not(.solid):hover { background: rgba(255,255,255,0.24); }
    .icon-btn.solid:hover { background: var(--row-hover, rgba(127,127,127,0.2)); }
    .profile-btn:not(.solid):hover { background: rgba(255,255,255,0.24); }
    .profile-btn.solid:hover { background: var(--row-hover, rgba(127,127,127,0.2)); }
  }
  @media (min-width: 720px) {
    .create-header-inner { max-width:760px; }
  }

  /* ---------- Silver appbar ----------
     Azul Fluent (Microsoft 365) sólido, sem gradiente. Agora com 3
     ações à direita (pesquisa, notificações, avatar) — gap reduzido
     para 6px para caberem confortavelmente. */
  .silver-appbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 16;
    height: calc(env(safe-area-inset-top, 0px) + 52px);
    background: #185ABD;
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    backdrop-filter: blur(18px) saturate(140%);
    border-bottom: 1px solid rgba(255,255,255,0.14);
    opacity: 0;
    transform: translateY(-10px) translateZ(0);
    transition:
      opacity .24s cubic-bezier(0.32, 0.72, 0, 1),
      transform .24s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
    contain: layout style paint;
  }
  .silver-appbar.visible {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .silver-appbar-inner {
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
  .silver-appbar-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0;
    color: #FFFFFF;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
  .silver-appbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  @media (min-width: 720px) {
    .silver-appbar-inner { max-width:760px; }
  }
  .silver-search-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.16);
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
      transform .2s cubic-bezier(0.34,1.56,0.64,1),
      background .2s cubic-bezier(0.32, 0.72, 0, 1);
    pointer-events: none;
  }
  .silver-search-btn.visible {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  .silver-search-btn:active {
    background: rgba(255,255,255,0.26);
    transform: scale(0.94);
  }
  .silver-icon {
    width: 17px;
    height: 17px;
    background: #FFFFFF;
  }
  .notif-dot-silver {
    border-color: #185ABD;
  }

  /* ---------- Conteúdo do Create ---------- */
  .create-tab {
    width: 100%;
  }

  /* Sem saudação: respiro mínimo — só a altura do appbar fixo mais
     um pequeno espaço, a search-bar fica logo abaixo dele. */
  .hero-bg {
    position: relative;
    width: 100%;
    padding: calc(env(safe-area-inset-top, 0px) + 68px) 0 8px;
  }

  /* Search bar: 100% curva (pill), borda fina em vez de sombra
     grande, foco em azul Fluent. */
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
    transition: border-color .16s cubic-bezier(0.32,0.72,0,1);
  }
  .search-bar:active {
    border-color: #185ABD;
  }
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

  /* ---------- Apps: card estilo Microsoft 365 (Fluent), cantos
     mais curvos por pedido explícito. ---------- */
  .apps-card {
    margin: 18px 14px 0;
    padding: 16px 12px 12px;
    border-radius: 22px;
    background: var(--drawer-bg);
    border: 1px solid var(--drawer-sep, rgba(127,127,127,0.16));
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .apps-card-title {
    display: block;
    padding: 0 6px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
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

  /* ---------- Recentes ----------
     Cantos mais curvos por pedido explícito nas thumbs. */
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
    color: #185ABD;
  }
  .recent-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    padding: 0 14px 4px;
  }
  .recent-row::-webkit-scrollbar {
    display: none;
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

  /* ---------- Estado vazio (sem criações recentes) ----------
     Ilustração SVG inline leve, sem dependência de ficheiros
     externos. Aparece só quando recentProjects é [] (carregado e
     confirmadamente vazio) — nunca durante o loading (esse caso usa
     o skeleton acima). */
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

  /* ---------- Skeleton loader ---------- */
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
    .silver-appbar { transition: none !important; }
    .silver-search-btn { transition: none !important; }
  }
</style>