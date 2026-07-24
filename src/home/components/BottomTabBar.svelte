<!-- src/home/components/BottomTabBar.svelte -->
<script>
  import { TABS, AI_FAB } from '../lib/constants.js';
  
  export let activeTab = 'create';
  export let onSelect = () => {};
  export let onOpenAI = () => {};
  
  export let avatarUrl = '';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  
  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  
  function select(tab) {
    buzz();
    if (tab.id === activeTab) return;
    onSelect(tab.id);
  }

  // O botão central NUNCA passa por select()/onSelect — não é um tab,
  // não muda activeTab, não toca no router. Abre sempre o chat da
  // Nexa IA como bottom-sheet modal, por cima de tudo.
  let fabPressed = false;
  function openAI() {
    try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
    fabPressed = true;
    setTimeout(() => { fabPressed = false; }, 150);
    onOpenAI();
  }
</script>

<nav class="tab-bar">
  {#each TABS.slice(0, 2) as tab}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      on:click={() => select(tab)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon" class:tab-icon-avatar={tab.isAvatar}>
        {#if tab.isAvatar}
          <span class="tab-avatar" class:active={activeTab === tab.id}>
            {#if avatarUrl}
              <img src={avatarUrl} alt={tab.label} class="tab-avatar-img" />
            {:else}
              <span class="tab-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
            {/if}
          </span>
        {:else}
          <span
            class="icon-mask"
            style="mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}');-webkit-mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}')"
          ></span>
        {/if}
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}

  <div class="fab-slot" aria-hidden="true"></div>

  {#each TABS.slice(2) as tab}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      on:click={() => select(tab)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon" class:tab-icon-avatar={tab.isAvatar}>
        {#if tab.isAvatar}
          <span class="tab-avatar" class:active={activeTab === tab.id}>
            {#if avatarUrl}
              <img src={avatarUrl} alt={tab.label} class="tab-avatar-img" />
            {:else}
              <span class="tab-avatar-initial" style="background:{avatarColor}">{userInitial}</span>
            {/if}
          </span>
        {:else}
          <span
            class="icon-mask"
            style="mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}');-webkit-mask-image:url('{activeTab === tab.id && tab.iconFilled ? tab.iconFilled : tab.icon}')"
          ></span>
        {/if}
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}

  <button
    class="fab-btn"
    class:pressed={fabPressed}
    on:click={openAI}
    aria-label={AI_FAB.label}
  >
    <span class="fab-icon-mask" style="mask-image:url('{AI_FAB.icon}');-webkit-mask-image:url('{AI_FAB.icon}')"></span>
  </button>
</nav>

<style>
  .tab-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    display: flex;
    align-items: stretch;
    justify-content: space-around;

    background: rgb(var(--header-glass-rgb));
    background-clip: padding-box;

    border-top: none;
    box-shadow: none;

    padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px);
    contain: layout paint style;
    touch-action: pan-y;

    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* Tema escuro: em vez do glass genérico (--header-glass-rgb), a
     bottombar passa a derivar diretamente de --app-bg (o mesmo fundo
     do corpo), só um pouco mais clara — "quase idêntico mas um
     pouquinho menos escuro", como pedido. color-mix evita depender de
     uma variável --drawer-bg-strong que podia não bater certo com o
     fundo real do body em todos os temas escuros. */
  :global([data-theme="dark"]) .tab-bar {
    background: color-mix(in srgb, var(--app-bg) 88%, white 12%);
  }

  .tab-bar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -40px;
    height: 40px;
    background: rgb(var(--header-glass-rgb));
    z-index: -1;
  }

  :global([data-theme="dark"]) .tab-bar::after {
    background: color-mix(in srgb, var(--app-bg) 88%, white 12%);
  }

  .tab-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 42px;
    border: none;
    background: transparent;
    color: var(--icon-faint);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
  }

  .tab-btn.active { color: var(--accent-primary); }

  .tab-icon {
    position: relative;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .18s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .tab-icon-avatar {
    width: 26px;
    height: 26px;
  }

  .tab-btn:active .tab-icon {
    transform: scale(0.88);
  }

  .icon-mask {
    position: absolute;
    inset: 0;
    display: block;
    background: currentColor;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: opacity .18s ease;
  }

  /* ícone: regular por padrão, filled quando ativo; cor ativa vem
     de var(--accent-primary), definida em src/shared/theme.css */

  .tab-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid transparent;
    transition: border-color .18s ease;
  }
  .tab-avatar.active {
    border-color: var(--accent-primary);
  }
  .tab-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .tab-avatar-initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    opacity: 0.7;
    transition: opacity .18s ease, font-weight .18s ease;
  }
  .tab-btn.active .tab-label {
    opacity: 1;
    font-weight: 700;
  }

  /* ---------- Botão central (FAB) da Nexa IA ----------
     Reserva-se um "slot" fantasma do mesmo flex dos outros tab-btn
     no fluxo normal (para a distribuição space-around ficar simétrica
     nos dois lados), e o botão real é posicionado absoluto por cima,
     elevado acima da linha da bottombar — padrão FAB central nativo. */
  .fab-slot {
    flex: 1;
    height: 42px;
    pointer-events: none;
  }

  .fab-btn {
    position: absolute;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
    transform: translate(-50%, 0) scale(1);
    z-index: 2;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: none;
    background: var(--accent-primary, #0A84FF);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 4px 14px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.16);
    -webkit-tap-highlight-color: transparent;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), box-shadow .18s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .fab-btn.pressed,
  .fab-btn:active {
    transform: translate(-50%, 0) scale(0.90);
    box-shadow: 0 2px 8px rgba(0,0,0,0.24);
  }
  .fab-icon-mask {
    width: 24px;
    height: 24px;
    background: #fff;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-mask, .tab-label, .tab-icon, .fab-btn { transition: none !important; }
  }
</style>