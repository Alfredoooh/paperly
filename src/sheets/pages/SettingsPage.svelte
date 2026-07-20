<script>
  import { createEventDispatcher } from 'svelte';
  import { iconWithFallback } from '../lib/icon-fallback.js';

  // slideX vem do spring do App.svelte pai (settingsSlide) — este
  // componente já não decide sozinho se está visível ou não; segue o
  // MESMO padrão que profile/pages/SettingsPage.svelte já usa, para
  // que Sheets tenha a mesma navegação suave que o resto do app.
  export let slideX = 100;
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Sheets';

  const dispatch = createEventDispatcher();

  $: c = isDark
    ? {
        background: '#0B0D10',
        textPrimary: '#F2F3F5',
        textSecondary: '#9AA0A8',
        divider: 'rgba(255,255,255,0.10)',
        appbarBtnBg: 'rgba(255,255,255,0.08)',
        iconTint: '#F2F3F5',
        dialogBackground: '#1B1E23',
        settings_section_label: '#7E858E',
        primary: '#21A366',
      }
    : {
        background: '#F3F2F1',
        textPrimary: '#15181D',
        textSecondary: '#6B7280',
        divider: 'rgba(0,0,0,0.10)',
        appbarBtnBg: 'rgba(0,0,0,0.05)',
        iconTint: '#15181D',
        dialogBackground: '#FFFFFF',
        settings_section_label: '#8A9099',
        primary: '#21A366',
      };

  function goBack() {
    dispatch('nav', { to: 'main' });
  }

  function toggleTheme() {
    dispatch('nav', { to: 'main', data: { isDark: !isDark } });
  }

  // ── Gesto de arrastar da borda esquerda para fechar (edge-swipe) ──
  // MESMO padrão de profile/pages/SettingsPage.svelte: segue o dedo
  // 1:1 escrevendo diretamente no elemento (sem tocar no spring do
  // pai), e ao soltar decide por threshold/velocidade e delega ao
  // dispatch('nav',{to:'main'}) — o MESMO caminho do botão "voltar".
  const EDGE_ZONE = 24;
  const CLOSE_THRESHOLD = 0.32;
  const VELOCITY_FLING = 0.5; // px/ms
  let dragging = false;
  let dragLiveActive = false;
  let dragStartX = 0;
  let dragCurrentX = 0;
  let dragStartTime = 0;
  let dragW = 360;
  let liveOverrideX = null; // null = usa slideX do pai; número = dedo está a controlar

  function onEdgeTouchStart(e) {
    const x = e.touches[0].clientX;
    if (x > EDGE_ZONE) return;
    dragging = true;
    dragLiveActive = false;
    dragStartX = x;
    dragCurrentX = x;
    dragStartTime = performance.now();
    dragW = window.innerWidth || 360;
  }
  function onEdgeTouchMove(e) {
    if (!dragging) return;
    const x = e.touches[0].clientX;
    dragCurrentX = x;
    const delta = x - dragStartX;
    if (delta <= 4) return;
    if (!dragLiveActive) dragLiveActive = true;
    const progress = Math.min(1, Math.max(0, delta / dragW));
    liveOverrideX = progress * 100;
    e.preventDefault();
  }
  function onEdgeTouchEnd() {
    if (!dragging) return;
    dragging = false;
    if (!dragLiveActive) { dragLiveActive = false; liveOverrideX = null; return; }
    dragLiveActive = false;
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const delta = dragCurrentX - dragStartX;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / dragW));
    const shouldClose = draggedFraction > CLOSE_THRESHOLD || (delta > 0 && velocity > VELOCITY_FLING);
    liveOverrideX = null;
    if (shouldClose) {
      dispatch('nav', { to: 'main' });
    }
    // se não fechar, o próximo valor de slideX do pai (já em 0) volta
    // a assumir o controlo visual automaticamente
  }

  $: displayX = liveOverrideX !== null ? liveOverrideX : slideX;
</script>

<svelte:window on:touchstart={onEdgeTouchStart} on:touchmove|nonpassive={onEdgeTouchMove} on:touchend={onEdgeTouchEnd} on:touchcancel={onEdgeTouchEnd} />

<div class="page-shell" style="background:{c.background}; transform: translate3d({displayX}%, 0, 0);">
  <div class="appbar" style="background:{c.dialogBackground};border-color:{c.divider};">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={goBack} aria-label="Voltar">
      <img use:iconWithFallback={'back'} class="appbar-icon" alt="" />
    </button>
    <div class="appbar-title" style="color:{c.textPrimary}">Definições</div>
    <div class="appbar-spacer"></div>
  </div>

  <div class="settings-body">
    <div class="settings-section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <button class="settings-row" on:click={toggleTheme}>
        <span class="row-label" style="color:{c.textPrimary}">Tema escuro</span>
        <div class="toggle-track" class:toggle-on={isDark} style={isDark ? `background:${c.primary};` : ''}>
          <div class="toggle-thumb" class:toggle-thumb-on={isDark}></div>
        </div>
      </button>
    </div>

    <div class="settings-section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <div class="settings-row settings-row-static">
        <span class="row-label" style="color:{c.textPrimary}">{user?.name || user?.email || 'Utilizador'}</span>
      </div>
    </div>

    <div class="settings-section-label" style="color:{c.settings_section_label}">Sobre</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <div class="settings-row settings-row-static">
        <span class="row-label" style="color:{c.textPrimary}">{appTitle}</span>
        <span class="row-value" style="color:{c.textSecondary}">v1.0</span>
      </div>
    </div>
  </div>
</div>

<style>
  .page-shell {
    position: fixed; inset: 0; z-index: 30;
    display: flex; flex-direction: column; overflow: hidden;
    will-change: transform;
    box-shadow: -6px 0 24px rgba(0,0,0,0.18);
  }
  .appbar {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px;
    border-bottom: 1px solid; flex-shrink: 0;
  }
  .appbar-btn {
    width: 38px; height: 38px; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .appbar-btn:active { transform: scale(0.88); }
  .appbar-icon { width: 20px; height: 20px; display: block; object-fit: contain; }
  .appbar-title { flex: 1; font-size: 16px; font-weight: 700; text-align: center; margin-right: 38px; }
  .appbar-spacer { width: 38px; flex-shrink: 0; }

  .settings-body { flex: 1; overflow-y: auto; padding: 18px 16px calc(env(safe-area-inset-bottom,0px) + 24px); -webkit-overflow-scrolling: touch; }
  .settings-section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 20px 8px 8px; }
  .settings-section-label:first-child { margin-top: 0; }
  .settings-group { border-radius: 16px; overflow: hidden; }
  .settings-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; background: none; border: none; cursor: pointer; text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .settings-row-static { cursor: default; }
  .row-label { font-size: 15px; font-weight: 500; }
  .row-value { font-size: 14px; }

  .toggle-track {
    width: 46px; height: 27px; border-radius: 999px; background: rgba(127,127,127,0.28);
    position: relative; transition: background .22s ease; flex-shrink: 0;
  }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px; width: 23px; height: 23px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform .22s cubic-bezier(0.34,1.4,0.64,1);
  }
  .toggle-thumb-on { transform: translateX(19px); }
</style>