<!-- src/home/components/ProfileSettingsPage.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';

  export let pushed = false;
  export let onClose = () => {};

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
</script>

<div class="settings-page" style="transform: translate3d({slideX}%, 0, 0);">
  <header class="settings-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg')"></span>
    </button>
    <span class="settings-header-title">Definições</span>
    <span class="settings-header-spacer"></span>
  </header>

  <div class="settings-body">
    <!-- ------------------------------------------------------------
         COLE AQUI o conteúdo interno do teu SettingsPage.svelte atual.
    ------------------------------------------------------------- -->
  </div>
</div>

<style>
  .settings-page {
    position: fixed;
    inset: 0;
    z-index: 32; /* acima do ProfilePage (30) — é uma tela empilhada por cima */
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    will-change: transform;
  }

  .settings-header {
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
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .back-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask {
    width: 18px;
    height: 18px;
  }

  .settings-header-title {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
  }
  .settings-header-spacer {
    width: 36px;
    flex-shrink: 0;
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

  .settings-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding: 8px 18px calc(env(safe-area-inset-bottom, 0px) + 24px);
  }

  .pulse-tap {
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.95); opacity: .78; }

  @media (prefers-reduced-motion: reduce) {
    .settings-page { transition: none !important; }
  }
</style>