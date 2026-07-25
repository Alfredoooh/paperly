<!-- src/home/components/TemplatePreviewPage.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';

  export let pushed = false; // true = tela empurrada para dentro (visível)
  export let kind = 'image'; // 'image' | 'doc'
  export let item = null;
  export let onClose = () => {};
  export let onUse = () => {};
  export let onShare = () => {};
  export let onPin = () => {};
  export let onSearch = () => {};
  export let onReply = () => {};

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  const slide = createSlideTransition({});
  let slideX = 100;
  const unsubscribe = slide.subscribe((v) => { slideX = v; });

  let lastPushed = null;
  $: if (pushed !== lastPushed) {
    lastPushed = pushed;
    if (pushed) slide.open();
    else slide.close();
  }

  onDestroy(() => { unsubscribe(); slide.destroy(); });

  function handleClose() {
    buzz();
    onClose();
  }
  function handleUse() {
    buzz();
    onUse();
  }

  // ------------------------------------------------------------------
  // Popup estilo iOS (UIMenu / context menu nativo):
  // - fundo com vibrancy leve (blur suave, não pesado)
  // - abre com scale-from-corner ancorado ao botão, não fade simples
  // - ícone à DIREITA do label (padrão iOS, ao contrário do Android
  //   que põe ícone à esquerda)
  // - divisores finos de 0.5px entre itens
  // - cantos bem arredondados (14px), largura fixa ~250px como o iOS
  // - ícones: Fluent System Icons via CDN (@fluentui/svg-icons)
  // ------------------------------------------------------------------
  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';

  const MENU_OPTIONS = [
    { id: 'share',  icon: `${FLUENT_BASE}/share_20_regular.svg`,       label: 'Partilhar' },
    { id: 'pin',    icon: `${FLUENT_BASE}/pin_20_regular.svg`,         label: 'Fixar' },
    { id: 'search', icon: `${FLUENT_BASE}/search_20_regular.svg`,      label: 'Pesquisar' },
    { id: 'reply',  icon: `${FLUENT_BASE}/arrow_reply_20_regular.svg`, label: 'Responder' },
  ];
  const MORE_ICON = `${FLUENT_BASE}/more_horizontal_20_regular.svg`;

  let menuOpen = false;
  let menuBtnEl;
  let menuEl;
  let menuAlignRight = true;
  let closing = false;
  let closeTimer = null;

  async function toggleMenu() {
    if (menuOpen) {
      requestClose();
      return;
    }
    buzz();
    menuOpen = true;
    closing = false;
    await tick();
    positionMenu();
  }

  function positionMenu() {
    if (!menuBtnEl || !menuEl) return;
    const btnRect = menuBtnEl.getBoundingClientRect();
    const menuWidth = menuEl.offsetWidth;
    menuAlignRight = (btnRect.right - menuWidth) >= 8;
  }

  // Fecha com uma pequena animação de saída (scale-down + fade), em
  // vez de desmontar abruptamente — é o que falta em popups que
  // "ficam feios ao largar".
  function requestClose() {
    if (!menuOpen || closing) return;
    closing = true;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      menuOpen = false;
      closing = false;
    }, 140);
  }

  function selectOption(id) {
    buzz();
    requestClose();
    if (id === 'share') onShare(item);
    else if (id === 'pin') onPin(item);
    else if (id === 'search') onSearch(item);
    else if (id === 'reply') onReply(item);
  }

  function handleWindowPointerDown(e) {
    if (!menuOpen || closing) return;
    if (menuEl?.contains(e.target) || menuBtnEl?.contains(e.target)) return;
    requestClose();
  }
  function handleWindowKeydown(e) {
    if (menuOpen && e.key === 'Escape') requestClose();
  }

  onMount(() => {
    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeydown);
  });
  onDestroy(() => {
    clearTimeout(closeTimer);
    window.removeEventListener('pointerdown', handleWindowPointerDown, true);
    window.removeEventListener('keydown', handleWindowKeydown);
  });
</script>

<div class="preview-page" style="transform: translate3d({slideX}%, 0, 0);">
  <header class="preview-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_left.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_left.svg')"></span>
    </button>
    <span class="preview-header-title">{item?.label || ''}</span>

    <div class="menu-wrap">
      <button
        class="more-btn pulse-tap"
        bind:this={menuBtnEl}
        on:click={toggleMenu}
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span class="icon-mask more-icon" style="mask-image:url('{MORE_ICON}');-webkit-mask-image:url('{MORE_ICON}')"></span>
      </button>

      {#if menuOpen}
        <div
          class="ios-menu"
          class:align-right={menuAlignRight}
          class:align-left={!menuAlignRight}
          class:closing
          bind:this={menuEl}
          role="menu"
        >
          {#each MENU_OPTIONS as opt, i (opt.id)}
            <button
              class="ios-menu-item"
              role="menuitem"
              on:click={() => selectOption(opt.id)}
            >
              <span class="ios-menu-label">{opt.label}</span>
              <span class="ios-menu-icon icon-mask" style="mask-image:url('{opt.icon}');-webkit-mask-image:url('{opt.icon}')"></span>
            </button>
            {#if i < MENU_OPTIONS.length - 1}
              <div class="ios-menu-divider"></div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <div class="preview-body">
    {#if kind === 'image' && item}
      <img src={item.thumb} alt={item.label} class="preview-image" />
    {:else if kind === 'doc' && item}
      <div class="preview-doc-sheet">
        <span class="preview-doc-icon" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}')"></span>
        <span class="preview-doc-label">{item.label}</span>
      </div>
    {/if}
  </div>

  <div class="preview-actions">
    <button class="preview-btn preview-btn-cancel pulse-tap" on:click={handleClose}>Cancelar</button>
    <button class="preview-btn preview-btn-use pulse-tap" on:click={handleUse}>Usar modelo</button>
  </div>
</div>

<style>
  .preview-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    border-radius: 18px;
    overflow: hidden;
    will-change: transform;
    box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn, .more-btn {
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
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .back-btn:active, .more-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask {
    width: 18px;
    height: 18px;
  }
  .more-icon {
    width: 19px;
    height: 19px;
    transform: rotate(90deg);
  }

  .preview-header-title {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-wrap {
    position: relative;
    flex-shrink: 0;
  }

  /* -------------------------------------------------------------
     Popup estilo iOS: vibrancy leve (blur curto, 12px), cantos bem
     arredondados, largura fixa, abre/fecha com scale ancorado no
     canto próximo do botão (top-right ou top-left), NUNCA do
     centro — é assim que o UIMenu real se comporta.
  ------------------------------------------------------------- */
  .ios-menu {
    position: absolute;
    top: calc(100% + 6px);
    width: 250px;
    background: var(--surface-apps-tab);
    background: color-mix(in srgb, var(--surface-apps-tab) 82%, transparent);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 0.5px solid var(--border-soft);
    border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08);
    overflow: hidden;
    z-index: 40;
    transform-origin: top right;
    animation: iosMenuIn .18s cubic-bezier(0.19,1,0.22,1) forwards;
  }
  .ios-menu.align-left {
    transform-origin: top left;
  }
  .ios-menu.closing {
    animation: iosMenuOut .14s cubic-bezier(0.4,0,1,1) forwards;
  }

  @keyframes iosMenuIn {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes iosMenuOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.9); }
  }

  .ios-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 11px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: background .1s ease;
  }
  .ios-menu-item:active {
    background: rgba(120,120,128,0.16);
  }
  .ios-menu-label {
    font-size: 15.5px;
    font-weight: 400;
    color: var(--drawer-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ios-menu-icon {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
    background: var(--drawer-text);
    opacity: 0.85;
  }
  .ios-menu-divider {
    height: 0.5px;
    margin: 0 16px;
    background: var(--border-soft);
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

  .preview-body {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    overflow: hidden;
  }
  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.14);
  }
  .preview-doc-sheet {
    background: var(--surface-apps-tab);
    width: 100%;
    height: 100%;
    max-width: 420px;
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 24px;
  }
  .preview-doc-icon {
    width: 96px;
    height: 96px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .preview-doc-label {
    font-size: 19px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
  }

  .preview-actions {
    display: flex;
    gap: 12px;
    padding: 12px 18px calc(env(safe-area-inset-bottom, 0px) + 18px);
    flex-shrink: 0;
  }
  .preview-btn {
    flex: 1;
    padding: 15px 10px;
    border-radius: 999px;
    border: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s, background .14s;
  }
  .preview-btn-cancel {
    background: var(--danger);
    color: #fff;
  }
  .preview-btn-cancel:active {
    background: var(--danger-active);
  }
  .preview-btn-use {
    background: var(--accent-primary);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  }
  .preview-btn-use:active {
    background: var(--accent-primary-active);
  }

  .pulse-tap {
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.95); opacity: .78; }
</style>