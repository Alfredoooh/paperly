<!-- src/home/components/CreateTab.svelte -->
<!-- Header próprio, fixo, sempre transparente/branco no topo e sólido
     ao deslizar. O antigo "silver appbar" duplicado foi removido —
     este único header cobre agora os dois estados (transparente e
     sólido), tal como o resto dos tabs faz através do AppHeader. -->
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

  // Ícones da biblioteca oficial Fluent System Icons (Microsoft),
  // servidos via CDN — mesmo padrão já usado em TemplatePreviewPage.svelte.
  // Usado apenas para o ícone de notificações; o resto do header
  // continua a usar o conjunto local /icons/svg/regular/ como sempre.
  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const NOTIF_ICON = `${FLUENT_BASE}/alert_24_regular.svg`;

  // O header fica sólido a partir de metade do percurso do hero —
  // mantido exatamente como antes, só que agora é o ÚNICO header
  // (o silver-appbar duplicado foi removido).
  const SOLID_THRESHOLD = 0.5;
  $: isSolid = heroProgress >= SOLID_THRESHOLD;

  // A search-bar desaparece progressivamente com o próprio scroll —
  // opacity e scale seguem heroProgress (0→1) continuamente, sem
  // liga/desliga abrupto. Só fica não-interativa perto do fim.
  $: searchBarOpacity = 1 - heroProgress;
  $: searchBarScale = 1 - 0.08 * heroProgress;
  $: searchBarInert = heroProgress > 0.9;

  // Botão de pesquisa no appbar: só aparece quando o input de busca
  // já está COMPLETAMENTE atrás do appbar (opacidade 0, heroProgress
  // no máximo) — não antes disso, mesmo que a search-bar já esteja
  // quase invisível. Fica assim garantido que nunca há sobreposição
  // visual entre "ainda vejo a search-bar" e "já vejo a lupa".
  $: searchBtnVisible = searchBarOpacity <= 0;

  // Fallback de segurança para o título "Criar" nunca ficar preso a
  // opacity:0 caso `mounted` nunca chegue a `true` por fora.
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

<!-- Header próprio do Create: título fixo "Criar" + pesquisa (só quando
     a search-bar está totalmente escondida) + notificações + avatar.
     `isSolid` controla a mudança de fundo transparente → sólido (azul
     Fluent), igual ao padrão usado pelo AppHeader nos outros tabs. -->
<div class="create-header" class:in={effectiveMounted} class:solid={isSolid}>
  <div class="create-header-inner">
    <h1 class="create-header-title visible" class:solid-title={isSolid}>Criar</h1>
    <div class="header-actions">
      <button
        class="search-btn pulse-tap"
        class:visible={searchBtnVisible}
        tabindex={searchBtnVisible ? 0 : -1}
        aria-hidden={!searchBtnVisible}
        on:click={handleOpenSearch}
        aria-label="Pesquisar"
      >
        <span class="icon-mask header-icon" class:header-icon-solid={isSolid} style="mask-image:url('/icons/svg/regular/search.svg');-webkit-mask-image:url('/icons/svg/regular/search.svg')"></span>
      </button>
      <!-- Notificações: ícone da biblioteca oficial Fluent System Icons
           (Microsoft), via CDN — sem círculo de fundo, sem sombra, só
           o glyph, igual ao tratamento visual que já existia. -->
      <button class="notif-btn pulse-tap" on:click={handleNotifications} aria-label="Notificações">
        <span class="icon-mask notif-icon" class:notif-icon-solid={isSolid} style="mask-image:url('{NOTIF_ICON}');-webkit-mask-image:url('{NOTIF_ICON}')"></span>
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

  <!-- Apps: card estilo Android M3 — sólido, pouca sombra, cantos
       generosos. Título pequeno FORA/ACIMA do card + grid 3 colunas,
       ícones PNG soltos (sem círculo/fundo colorido). A Nexa IA NÃO
       aparece aqui — platformApps já vem filtrado (id !== 'ai') a
       partir de App.svelte, porque a IA agora abre exclusivamente
       pelo pill central da bottombar, como modal. -->
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

  <!-- Continuar a criar: skeleton enquanto carrega, ilustração de
       estado vazio quando não há nenhum projeto recente, lista
       normal quando há. Os cards agora NUNCA tocam as bordas do
       telemóvel, mesmo com scroll-snap ativo — ver spacers reais em
       .recent-row-spacer no CSS (padding puro podia ser recortado
       visualmente pelo motor de snap em alguns Android/Chromium). -->
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
                <div class="recent-thumb-fallback" style="background:{p.color || '#8E8E93'}"></div>
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
     M3 EXPRESSIVE: fonte usada nos apps do Material 3 Expressive
     (Google Sans Text é a fonte de produto usada nas apps Google/M3
     Expressive mais recentes; Roboto Flex como intermediário e
     system-ui como fallback universal).
     ════════════════════════════════════════════════════════════════ */
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
  /* Sólido: mesmo azul Fluent usado no AppHeader dos outros tabs
     (#185ABD), em vez do var(--app-bg) genérico anterior — assim o
     Create passa a ficar visualmente igual a Projetos/Templates
     quando desliza. */
  .create-header.solid {
    background: #185ABD;
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
    /* Título "Criar" é sempre visível assim que o header monta —
       .visible fica sempre aplicada no markup; a transição de
       opacidade só suaviza o mount. A cor sim muda com isSolid. */
    opacity: 0;
    transition: opacity .2s cubic-bezier(0.32, 0.72, 0, 1), color .2s ease;
  }
  .create-header-title.visible {
    opacity: 1;
  }
  .create-header-title.solid-title {
    color: #FFFFFF;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
  }

  /* ---------- Pesquisa: só aparece quando a search-bar já está
     totalmente atrás do appbar (searchBtnVisible), sem círculo nem
     sombra — só o glyph, igual ao tratamento das notificações. ---------- */
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
  .header-icon.header-icon-solid {
    background: #FFFFFF;
  }

  /* ---------- Notificações: SEM círculo, SEM sombra ----------
     Só a área de toque (44px, mínimo recomendado de acessibilidade)
     com o glyph Fluent oficial centrado dentro. Nada de background
     nem box-shadow em nenhum estado. */
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
  .notif-icon.notif-icon-solid {
    background: #FFFFFF;
  }
  .notif-dot {
    position: absolute;
    top: 9px;
    right: 9px;
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
    background: var(--row-active, rgba(127,127,127,0.12));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    overflow: hidden;
    box-shadow: none;
    transition:
      background .28s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow .28s cubic-bezier(0.32, 0.72, 0, 1),
      transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .profile-btn.solid {
    background: rgba(255,255,255,0.16);
  }
  .profile-btn:active {
    transform: scale(0.9);
  }
  .profile-btn:not(.solid):active {
    background: var(--row-hover, rgba(127,127,127,0.2));
  }
  .profile-btn.solid:active {
    background: rgba(255,255,255,0.26);
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
    .profile-btn:not(.solid):hover { background: var(--row-hover, rgba(127,127,127,0.2)); }
    .profile-btn.solid:hover { background: rgba(255,255,255,0.24); }
  }
  @media (min-width: 720px) {
    .create-header-inner { max-width:760px; }
  }

  /* ---------- Conteúdo do Create ---------- */
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

  /* ------------------------------------------------------------------
     Título "Comece a criar com" vive FORA do card, por cima dele —
     igual ao padrão dos outros títulos de secção da página (ex:
     .recent-section-title).
     ------------------------------------------------------------------ */
  .apps-card-title {
    display: block;
    margin: 18px 14px 10px;
    padding: 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-faint);
  }

  /* ------------------------------------------------------------------
     Card estilo Android M3: sólido, pouca sombra, cantos generosos.
     No tema claro mantém var(--drawer-bg) (comportamento original).
     No tema escuro usa var(--btn-bg) — a MESMA variável usada pelos
     botões sólidos em todo o projeto (AppDrawer .m3-item, SearchPage),
     e portanto o mesmo tom dos "botões do TemplatesTab" pedido: o
     TemplatesTab também assenta as suas superfícies nas variáveis
     centrais de tema em vez de um valor hardcoded próprio. Isto
     substitui o anterior #24272D fixo, que era um valor isolado só
     deste componente e não batia certo com o resto da app.
     ------------------------------------------------------------------ */
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

  /* ---------- Recentes ---------- */
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

  /* SEM padding no container — usa spacers reais (elementos flex
     nas duas pontas) em vez disso. Padding puro em containers com
     overflow-x + scroll-snap-align:start pode ser visualmente
     recortado pelo motor de snap em alguns browsers Android/
     Chromium (o snap "puxa" o primeiro/último item para a borda
     exata do viewport de scroll, ignorando o padding declarado) —
     um elemento real com largura fixa nunca sofre disso, porque
     participa do layout flex como um item normal, não como
     padding. */
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
    width: 2px; /* o respiro real vem do gap:12px + este mínimo */
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

  /* ---------- Estado vazio ---------- */
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
    .search-btn { transition: none !important; }
  }
</style>