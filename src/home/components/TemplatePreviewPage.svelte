<!-- src/home/components/TemplatePreviewPage.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';
  import { portal } from '../lib/portal.js';

  export let pushed = false;
  export let kind = 'image';
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

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';

  const MENU_OPTIONS = [
    { id: 'share',  icon: `${FLUENT_BASE}/share_20_regular.svg`,       label: 'Partilhar' },
    { id: 'pin',    icon: `${FLUENT_BASE}/pin_20_regular.svg`,         label: 'Fixar' },
    { id: 'search', icon: `${FLUENT_BASE}/search_20_regular.svg`,      label: 'Pesquisar' },
    { id: 'reply',  icon: `${FLUENT_BASE}/arrow_reply_20_regular.svg`, label: 'Responder' },
  ];
  const MORE_ICON = `${FLUENT_BASE}/more_horizontal_20_regular.svg`;

  const MENU_WIDTH = 250;
  const VIEWPORT_MARGIN = 10;
  const GAP_FROM_BUTTON = 6;

  let menuOpen = false;
  let menuBtnEl;
  let menuEl;
  let closing = false;
  let closeTimer = null;

  let menuTop = 0;
  let menuLeft = 0;
  let originRight = true;

  async function toggleMenu() {
    if (menuOpen) {
      requestClose();
      return;
    }
    buzz();
    computePosition();
    menuOpen = true;
    closing = false;
    await tick();
    computePosition();
  }

  function computePosition() {
    if (!menuBtnEl) return;
    const btnRect = menuBtnEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = menuEl?.offsetWidth || MENU_WIDTH;

    let left = btnRect.right - width;
    originRight = true;

    if (left < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN;
      originRight = false;
    }
    if (left + width > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN - width;
    }

    let top = btnRect.bottom + GAP_FROM_BUTTON;
    const estimatedHeight = menuEl?.offsetHeight || (MENU_OPTIONS.length * 44 + 16);
    if (top + estimatedHeight > vh - VIEWPORT_MARGIN) {
      top = btnRect.top - GAP_FROM_BUTTON - estimatedHeight;
    }

    menuLeft = left;
    menuTop = top;
  }

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
  function handleWindowResize() {
    if (menuOpen && !closing) computePosition();
  }

  onMount(() => {
    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeydown);
    window.addEventListener('resize', handleWindowResize);
  });
  onDestroy(() => {
    clearTimeout(closeTimer);
    window.removeEventListener('pointerdown', handleWindowPointerDown, true);
    window.removeEventListener('keydown', handleWindowKeydown);
    window.removeEventListener('resize', handleWindowResize);
  });
</script>

<div class="preview-page" style="transform: translate3d({slideX}%, 0, 0);">
  <header class="preview-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_left.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_left.svg')"></span>
    </button>
    <span class="preview-header-title">{item?.label || ''}</span>

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

{#if menuOpen}
  <div
    class="ios-menu"
    class:origin-right={originRight}
    class:origin-left={!originRight}
    class:closing
    style="top:{menuTop}px; left:{menuLeft}px; width:{MENU_WIDTH}px;"
    bind:this={menuEl}
    use:portal
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

<style>
  .preview-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: #FAFAFA;
    border-radius: 18px;
    overflow: hidden;
    will-change: transform;
    box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  }
  :global([data-theme="dark"]) .preview-page {
    background: #242424;
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
    background: rgba(26,26,26,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  :global([data-theme="dark"]) .back-btn,
  :global([data-theme="dark"]) .more-btn {
    background: rgba(242,242,242,0.10);
  }
  .back-btn:active, .more-btn:active {
    background: rgba(26,26,26,0.11);
    transform: scale(0.88);
  }
  :global([data-theme="dark"]) .back-btn:active,
  :global([data-theme="dark"]) .more-btn:active {
    background: rgba(242,242,242,0.18);
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
    color: rgba(26,26,26,0.94);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global([data-theme="dark"]) .preview-header-title {
    color: rgba(242,242,242,0.86);
  }

  .ios-menu {
    position: fixed;
    background: rgba(240,240,241,0.82);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 0.5px solid rgba(26,26,26,0.09);
    border-radius: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08);
    overflow: hidden;
    z-index: 500;
    transform-origin: top right;
    animation: iosMenuIn .18s cubic-bezier(0.19,1,0.22,1) forwards;
  }
  :global([data-theme="dark"]) .ios-menu {
    background: rgba(44,44,46,0.82);
    border-color: rgba(242,242,242,0.12);
  }
  .ios-menu.origin-left {
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
    color: rgba(26,26,26,0.94);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global([data-theme="dark"]) .ios-menu-label {
    color: rgba(242,242,242,0.86);
  }
  .ios-menu-icon {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
    background: rgba(26,26,26,0.94);
    opacity: 0.85;
  }
  :global([data-theme="dark"]) .ios-menu-icon {
    background: rgba(242,242,242,0.86);
  }
  .ios-menu-divider {
    height: 0.5px;
    margin: 0 16px;
    background: rgba(26,26,26,0.09);
  }
  :global([data-theme="dark"]) .ios-menu-divider {
    background: rgba(242,242,242,0.12);
  }

  .icon-mask {
    display: block;
    background: rgba(26,26,26,0.85);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  :global([data-theme="dark"]) .icon-mask {
    background: rgba(242,242,242,0.88);
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
    background: #F0F0F1;
    width: 100%;
    height: 100%;
    max-width: 420px;
    border: 1px solid rgba(26,26,26,0.09);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 24px;
  }
  :global([data-theme="dark"]) .preview-doc-sheet {
    background: #2C2C2E;
    border-color: rgba(242,242,242,0.12);
  }
  .preview-doc-icon {
    width: 96px;
    height: 96px;
    background: rgba(26,26,26,0.85);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  :global([data-theme="dark"]) .preview-doc-icon {
    background: rgba(242,242,242,0.88);
  }
  .preview-doc-label {
    font-size: 19px;
    font-weight: 700;
    color: rgba(26,26,26,0.94);
    text-align: center;
  }
  :global([data-theme="dark"]) .preview-doc-label {
    color: rgba(242,242,242,0.86);
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
    background: #D92D2D;
    color: #FFFFFF;
  }
  :global([data-theme="dark"]) .preview-btn-cancel {
    background: #FF6B6B;
    color: #1A1A1A;
  }
  .preview-btn-cancel:active {
    background: #E0342A;
  }
  .preview-btn-use {
    background: #0866D1;
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  }
  :global([data-theme="dark"]) .preview-btn-use {
    background: #4DA8FF;
    color: #1A1A1A;
  }
  .preview-btn-use:active {
    background: #06529E;
  }
  :global([data-theme="dark"]) .preview-btn-use:active {
    background: #2F8FE8;
  }

  .pulse-tap {
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.95); opacity: .78; }
</style>