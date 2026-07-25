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
  export let onWhatsapp = () => {};

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
  // PopupMenu nativo simples: dropdown ancorado no botão more_vert,
  // sem overlay escurecido, sem animação customizada, sem drag-select.
  // Fecha ao clicar fora ou numa opção.
  // ------------------------------------------------------------------
  const MENU_OPTIONS = [
    { id: 'share',    icon: '/icons/svg/regular/share.svg',         label: 'Partilhar' },
    { id: 'pin',      icon: '/icons/svg/regular/pin.svg',           label: 'Fixar' },
    { id: 'search',   icon: '/icons/svg/regular/search.svg',        label: 'Pesquisar' },
    { id: 'whatsapp', icon: '/icons/svg/regular/chat_multiple.svg', label: 'WhatsApp' },
  ];

  let menuOpen = false;
  let menuBtnEl;
  let menuEl;
  let menuAlignRight = true;

  async function toggleMenu() {
    menuOpen = !menuOpen;
    if (menuOpen) {
      buzz();
      await tick();
      positionMenu();
    }
  }

  function positionMenu() {
    if (!menuBtnEl || !menuEl) return;
    const btnRect = menuBtnEl.getBoundingClientRect();
    const menuWidth = menuEl.offsetWidth;
    menuAlignRight = (btnRect.right - menuWidth) >= 8;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function selectOption(id) {
    buzz();
    closeMenu();
    if (id === 'share') onShare(item);
    else if (id === 'pin') onPin(item);
    else if (id === 'search') onSearch(item);
    else if (id === 'whatsapp') onWhatsapp(item);
  }

  function handleWindowPointerDown(e) {
    if (!menuOpen) return;
    if (menuEl?.contains(e.target) || menuBtnEl?.contains(e.target)) return;
    closeMenu();
  }
  function handleWindowKeydown(e) {
    if (menuOpen && e.key === 'Escape') closeMenu();
  }

  onMount(() => {
    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('keydown', handleWindowKeydown);
  });
  onDestroy(() => {
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
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/more_vert.svg');-webkit-mask-image:url('/icons/svg/regular/more_vert.svg')"></span>
      </button>

      {#if menuOpen}
        <div
          class="popup-menu"
          class:align-right={menuAlignRight}
          class:align-left={!menuAlignRight}
          bind:this={menuEl}
          role="menu"
        >
          {#each MENU_OPTIONS as opt (opt.id)}
            <button
              class="popup-menu-item"
              role="menuitem"
              on:click={() => selectOption(opt.id)}
            >
              <span class="popup-menu-icon icon-mask" style="mask-image:url('{opt.icon}');-webkit-mask-image:url('{opt.icon}')"></span>
              <span class="popup-menu-label">{opt.label}</span>
            </button>
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
  .back-btn .icon-mask, .more-btn .icon-mask {
    width: 18px;
    height: 18px;
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

  .popup-menu {
    position: absolute;
    top: calc(100% + 6px);
    min-width: 178px;
    background: var(--surface-apps-tab);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.18);
    padding: 6px;
    z-index: 40;
    animation: popupIn .14s cubic-bezier(0.16,1,0.3,1);
  }
  .popup-menu.align-right { right: 0; }
  .popup-menu.align-left { left: 0; }

  @keyframes popupIn {
    from { opacity: 0; transform: translateY(-4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .popup-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 10px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--drawer-text);
    text-align: left;
    transition: background .12s ease;
  }
  .popup-menu-item:active {
    background: var(--row-active);
  }
  .popup-menu-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  .popup-menu-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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