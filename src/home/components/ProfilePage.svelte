<!-- src/home/components/ProfilePage.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { createSlideTransition } from '../lib/nav-transition.js';

  export let pushed = false; // fonte de verdade vinda do App.svelte (history real)
  export let userName = 'Utilizador';
  export let userInitial = 'U';
  export let avatarColor = '#FF3B30';
  export let avatarUrl = '';
  export let onClose = () => {};
  export let onOpenSettings = () => {};

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
  function handleOpenSettings() {
    buzz();
    onOpenSettings();
  }
</script>

<div class="profile-page" style="transform: translate3d({slideX}%, 0, 0);">
  <header class="profile-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg')"></span>
    </button>
    <span class="profile-header-title">Perfil</span>
    <button class="settings-btn pulse-tap" on:click={handleOpenSettings} aria-label="Definições">
      <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg')"></span>
    </button>
  </header>

  <div class="profile-body">
    <!-- ------------------------------------------------------------
         COLE AQUI o conteúdo interno do teu MainPage.svelte atual
         (bloco de avatar grande, informações da conta, estatísticas,
         etc). Deixei um exemplo mínimo de avatar+nome já ligado às
         props recebidas do App.svelte, para o ecrã não ficar vazio
         enquanto colas o resto.
    ------------------------------------------------------------- -->
    <div class="profile-avatar-block">
      {#if avatarUrl}
        <img src={avatarUrl} alt={userName} class="profile-avatar-img" />
      {:else}
        <div class="profile-avatar" style="background:{avatarColor}">{userInitial}</div>
      {/if}
      <span class="profile-name">{userName}</span>
    </div>
  </div>
</div>

<style>
  /* Mesmo padrão do TemplatePreviewPage: posição 100% controlada pelo
     spring via rAF (nav-transition.js), sem CSS transition aqui — é o
     que garante navegação sem congelamento, sem recriação de página. */
  .profile-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    will-change: transform;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn, .settings-btn {
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
  .back-btn:active, .settings-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask, .settings-btn .icon-mask {
    width: 18px;
    height: 18px;
  }

  .profile-header-title {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
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

  .profile-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding: 8px 18px calc(env(safe-area-inset-bottom, 0px) + 24px);
  }

  .profile-avatar-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
  }
  .profile-avatar, .profile-avatar-img {
    width: 96px;
    height: 96px;
    border-radius: 50%;
  }
  .profile-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    font-weight: 700;
    color: #fff;
  }
  .profile-avatar-img {
    object-fit: cover;
  }
  .profile-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--drawer-text);
  }

  .pulse-tap {
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.95); opacity: .78; }

  @media (prefers-reduced-motion: reduce) {
    .profile-page { transition: none !important; }
  }
</style>