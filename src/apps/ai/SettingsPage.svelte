<script>
  import { createEventDispatcher, tick } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { getThemeColors } from '../../core/theme.js';
  import { AuthApiService } from '../../core/api.js';
  import { showToast } from '../../core/utils.js';
  import { AVAILABLE_LANGUAGES } from '../../core/plans.js';
  import PlansModal from '../shared/PlansModal.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  $: credits      = user?.credits ?? 0;
  $: maxCredits   = 100; // ajusta conforme o plano
  $: creditsPct   = Math.min(Math.max(credits / maxCredits, 0), 1);
  $: creditsColor = credits <= 10 ? '#FF3B30' : credits <= 30 ? '#FF9500' : '#34C759';
  $: creditsLabel = credits <= 10 ? 'Créditos a acabar' : `${credits} créditos`;

  const AVATAR_COLORS = [
    '#FF3B30','#FF9500','#FFCC00','#34C759',
    '#00C7BE','#007AFF','#5856D6','#AF52DE',
    '#FF2D55','#A2845E'
  ];
  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  $: userName    = user?.name || user?.displayName || user?.email || 'U';
  $: userEmail   = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: avatarColor = getAvatarColor(userName);

  // ── Loader state ──
  let loading      = true;
  let loadingMsg   = '';

  // Simula load inicial
  import { onMount } from 'svelte';
  onMount(() => {
    setTimeout(() => { loading = false; }, 700);
  });

  // ── Popup anchored state ──
  let showThemePicker  = false;
  let showLangPicker   = false;
  let showPlansModal   = false;
  let langSearch       = '';
  let currentLanguage  = localStorage.getItem('nexa_language') || 'pt';
  let popupAnchor      = { x: 0, y: 0 }; // posição do clique

  $: filteredLangs = AVAILABLE_LANGUAGES.filter(l => {
    const f = langSearch.trim().toLowerCase();
    return !f || l.name.toLowerCase().includes(f) || l.native.toLowerCase().includes(f);
  });

  function openPopup(type, event) {
    const rect = event.currentTarget.getBoundingClientRect();
    // ancora ao centro vertical da row, lado direito
    popupAnchor = {
      x: rect.right - 16,
      y: rect.top + rect.height / 2
    };
    if (type === 'theme') { showLangPicker = false; showThemePicker = true; }
    if (type === 'lang')  { langSearch = ''; showThemePicker = false; showLangPicker = true; }
  }

  function setLang(code) {
    currentLanguage = code;
    localStorage.setItem('nexa_language', code);
    showLangPicker = false;
    showToast(`Idioma: ${AVAILABLE_LANGUAGES.find(l=>l.code===code)?.name}`);
  }

  async function handleLogout() {
    showThemePicker = false;
    showLangPicker  = false;
    loadingMsg = 'A terminar sessão…';
    loading    = true;
    if (user) await AuthApiService.logout(user.token);
    await tick();
    setTimeout(() => {
      loading = false;
      dispatch('logout');
    }, 800);
  }

  // Calcula posição do popup para não sair do ecrã
  function popupStyle(anchor, width = 220, height = 120) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x - width; // abre para a esquerda do ponto
    let top  = anchor.y - height / 2;
    if (left < 12) left = 12;
    if (top < 12)  top  = 12;
    if (top + height > vh - 12) top = vh - height - 12;
    return `left:${left}px;top:${top}px;width:${width}px;`;
  }
</script>

<!-- ══════════════════════════════════════════
     LOADER OVERLAY (abertura + logout)
══════════════════════════════════════════ -->
{#if loading}
  <div class="loader-overlay" class:dark={isDark} transition:fade={{ duration: 200 }}>
    <div class="ios-spinner" class:dark={isDark}>
      {#each Array(12) as _, i}
        <div class="spoke" style="--i:{i};--color:{isDark ? '#ffffff' : '#000000'}"></div>
      {/each}
    </div>
    {#if loadingMsg}
      <span class="loading-msg" class:dark={isDark}>{loadingMsg}</span>
    {/if}
  </div>
{/if}

<!-- ══════════════════════════════════════════
     PÁGINA PRINCIPAL
══════════════════════════════════════════ -->
{#if !loading}
<div class="page" class:dark={isDark} transition:fade={{ duration: 180 }}>

  <!-- Header -->
  <div class="header">
    <button type="button" class="back-btn" on:click={() => dispatch('close')}>
      <span
        class="icon-mask"
        style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:18px;height:18px;transform:rotate(180deg);"
      ></span>
    </button>
    <span class="header-title">Definições</span>
    <button type="button" class="logout-btn" on:click={handleLogout}>
      <span
        class="icon-mask"
        style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');width:18px;height:18px;"
      ></span>
    </button>
  </div>

  <!-- Scroll body -->
  <div class="body">

    <!-- Avatar / user info -->
    <div class="user-block">
      <div class="avatar" style="background:{avatarColor}">{userInitial}</div>
      <div class="user-info">
        <span class="user-name">{userName}</span>
        {#if userEmail && userEmail !== userName}
          <span class="user-email">{userEmail}</span>
        {/if}
      </div>
    </div>

    <!-- Secção: Conta -->
    <div class="section-label">Conta</div>
    <div class="section">

      <!-- Planos -->
      <button type="button" class="row" on:click={() => showPlansModal = true}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/tabs.svg');-webkit-mask-image:url('/icons/svg/tabs.svg');"></span>
        <span class="row-label">Planos</span>
        <span class="row-sub">Básico e Premium</span>
      </button>

      <!-- Créditos — container com barra progressiva -->
      <div class="credits-container" class:dark={isDark}>
        <div class="credits-top">
          <div class="credits-left">
            <span class="icon-mask credits-icon" style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{creditsColor};"></span>
            <span class="credits-title" class:dark={isDark}>Saldo de créditos</span>
          </div>
          <span class="credits-value" style="color:{creditsColor}">{creditsLabel}</span>
        </div>
        <div class="progress-track" class:dark={isDark}>
          <div
            class="progress-fill"
            style="width:{creditsPct * 100}%;background:{creditsColor};box-shadow:0 0 6px {creditsColor}66;"
          ></div>
        </div>
        <div class="credits-bottom">
          <span class="credits-hint" class:dark={isDark}>{credits} de {maxCredits} créditos disponíveis</span>
        </div>
      </div>

    </div>

    <!-- Secção: Preferências -->
    <div class="section-label">Preferências</div>
    <div class="section">
      <button type="button" class="row" on:click={(e) => openPopup('theme', e)}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');"></span>
        <span class="row-label">Aparência</span>
        <span class="row-trail">{isDark ? 'Escuro' : 'Claro'}</span>
      </button>

      <button type="button" class="row" on:click={(e) => openPopup('lang', e)}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/language.svg');-webkit-mask-image:url('/icons/svg/language.svg');"></span>
        <span class="row-label">Idioma</span>
        <span class="row-trail">{AVAILABLE_LANGUAGES.find(l=>l.code===currentLanguage)?.name || 'Português'}</span>
      </button>

      <button type="button" class="row" on:click={() => showToast('Privacidade em breve')}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/privacy.svg');-webkit-mask-image:url('/icons/svg/privacy.svg');"></span>
        <span class="row-label">Privacidade</span>
      </button>

      <button type="button" class="row" on:click={() => showToast('Segurança em breve')}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/security.svg');-webkit-mask-image:url('/icons/svg/security.svg');"></span>
        <span class="row-label">Segurança</span>
      </button>
    </div>

    <!-- Secção: Informação -->
    <div class="section-label">Informação</div>
    <div class="section">
      <button type="button" class="row" on:click={() => showToast('Sobre a app em breve')}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/about.svg');-webkit-mask-image:url('/icons/svg/about.svg');"></span>
        <span class="row-label">Sobre a app</span>
      </button>

      <button type="button" class="row" on:click={() => showToast('Web & links em breve')}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/web.svg');-webkit-mask-image:url('/icons/svg/web.svg');"></span>
        <span class="row-label">Web & links</span>
      </button>

      <button type="button" class="row danger" on:click={handleLogout}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');background:#FF3B30;"></span>
        <span class="row-label">Terminar sessão</span>
      </button>
    </div>

  </div>
</div>
{/if}

<!-- Plans modal — navega para outra tela, sem popup anchored -->
<PlansModal {isDark} {user} open={showPlansModal} on:close={() => showPlansModal=false} />

<!-- ══════════════════════════════════════════
     POPUP ANCHORED — Tema
══════════════════════════════════════════ -->
{#if showThemePicker}
  <div class="popup-overlay" on:click={() => showThemePicker=false}></div>
  <div
    class="popup-box anchored"
    class:dark={isDark}
    style={popupStyle(popupAnchor, 200, 108)}
    transition:scale={{ duration: 160, start: 0.88, opacity: 0 }}
  >
    {#each [[false,'Claro'],[true,'Escuro']] as [dark, label], i}
      {#if i > 0}<div class="popup-sep"></div>{/if}
      <button type="button" class="popup-row" on:click={() => { showThemePicker=false; dispatch('themeChange',{isDark:dark}); }}>
        <span class="popup-label">{label}</span>
        {#if isDark === dark}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- ══════════════════════════════════════════
     POPUP ANCHORED — Idioma
══════════════════════════════════════════ -->
{#if showLangPicker}
  <div class="popup-overlay" on:click={() => showLangPicker=false}></div>
  <div
    class="popup-box anchored lang-box"
    class:dark={isDark}
    style={popupStyle(popupAnchor, 240, Math.min(filteredLangs.length * 49 + 90, 340))}
    transition:scale={{ duration: 160, start: 0.88, opacity: 0 }}
  >
    <div class="lang-search-wrap">
      <input
        class="lang-search"
        class:dark={isDark}
        placeholder="Pesquisar idioma..."
        bind:value={langSearch}
        autofocus
      />
    </div>
    <div class="lang-list">
      {#if !filteredLangs.length}
        <div class="lang-empty">Nenhum idioma encontrado</div>
      {:else}
        {#each filteredLangs as lang, i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button type="button" class="popup-row" on:click={() => setLang(lang.code)}>
            <div class="lang-info">
              <span class="lang-name" class:active={lang.code === currentLanguage}>{lang.name}</span>
              <span class="lang-native">{lang.native}</span>
            </div>
            {#if lang.code === currentLanguage}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  /* ══════════ LOADER OVERLAY ══════════ */
  .loader-overlay {
    position: fixed; inset: 0; z-index: 200;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px;
    background: #ffffff;
  }
  .loader-overlay.dark { background: #111111; }

  /* iOS spinner — 12 spokes */
  .ios-spinner {
    position: relative;
    width: 32px; height: 32px;
  }
  .spoke {
    position: absolute;
    top: 50%; left: 50%;
    width: 2.6px; height: 7px;
    border-radius: 2px;
    background: var(--color, #000);
    transform-origin: center -6px;
    transform: rotate(calc(var(--i) * 30deg)) translateY(-50%);
    animation: ios-fade 1s linear infinite;
    animation-delay: calc(var(--i) * -0.0833s);
    opacity: 0.15;
  }
  @keyframes ios-fade {
    0%   { opacity: 1; }
    100% { opacity: 0.15; }
  }

  .loading-msg {
    font-size: 13px; color: rgba(60,60,67,0.5);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .loading-msg.dark { color: rgba(235,235,245,0.4); }

  /* ══════════ PAGE ══════════ */
  .page {
    position: fixed; inset: 0; z-index: 150;
    display: flex; flex-direction: column;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }
  .page.dark { background: #111111; }

  /* ══════════ HEADER ══════════ */
  .header {
    display: flex; align-items: center;
    padding: 16px 16px 10px;
    padding-top: calc(16px + env(safe-area-inset-top));
    flex-shrink: 0; gap: 8px;
  }
  .header-title {
    flex: 1; font-size: 17px; font-weight: 600;
    color: #000; text-align: center; letter-spacing: -0.3px;
  }
  .page.dark .header-title { color: #fff; }

  .back-btn, .logout-btn {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer; border-radius: 50%;
    transition: background .12s ease;
  }
  .back-btn:active, .logout-btn:active { background: rgba(0,0,0,0.06); }
  .page.dark .back-btn:active, .page.dark .logout-btn:active { background: rgba(255,255,255,0.08); }
  .back-btn .icon-mask { background: #000; }
  .page.dark .back-btn .icon-mask { background: #fff; }
  .logout-btn .icon-mask { background: #FF3B30; }

  /* ══════════ BODY ══════════ */
  .body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 8px 0 40px;
    display: flex; flex-direction: column;
  }

  /* ══════════ USER BLOCK ══════════ */
  .user-block {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px 20px;
  }
  .avatar {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700; color: #fff;
    flex-shrink: 0; letter-spacing: -0.5px;
  }
  .user-info { display: flex; flex-direction: column; min-width: 0; }
  .user-name {
    font-size: 16px; font-weight: 600; color: #000;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .page.dark .user-name { color: #fff; }
  .user-email {
    font-size: 13px; color: rgba(60,60,67,0.5);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
  }
  .page.dark .user-email { color: rgba(235,235,245,0.4); }

  /* ══════════ SECTION ══════════ */
  .section-label {
    font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: rgba(60,60,67,0.5);
    padding: 16px 20px 6px;
  }
  .page.dark .section-label { color: rgba(235,235,245,0.4); }
  .section { display: flex; flex-direction: column; padding: 0 12px; }

  /* ══════════ ROW ══════════ */
  .row {
    width: 100%; display: flex; align-items: center; gap: 13px;
    padding: 13px 10px; background: transparent; border: none;
    cursor: pointer; text-align: left; border-radius: 10px;
    -webkit-user-select: none; user-select: none;
    transition: background .12s ease; color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }
  .page.dark .row { color: #fff; }
  .row:active { background: rgba(0,0,0,0.05); }
  .page.dark .row:active { background: rgba(255,255,255,0.06); }
  .row.danger { color: #FF3B30; }

  .row-icon {
    width: 17px; height: 17px;
    background: rgba(60,60,67,0.55); flex-shrink: 0; display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .page.dark .row-icon { background: rgba(235,235,245,0.55); }
  .danger .row-icon { background: #FF3B30 !important; }

  .row-label { flex: 1; font-size: 15px; font-weight: 400; min-width: 0; }
  .row.danger .row-label { color: #FF3B30; }
  .row-sub { font-size: 13px; color: rgba(60,60,67,0.45); flex-shrink: 0; }
  .page.dark .row-sub { color: rgba(235,235,245,0.35); }
  .row-trail { font-size: 13px; color: rgba(60,60,67,0.45); flex-shrink: 0; }
  .page.dark .row-trail { color: rgba(235,235,245,0.35); }

  /* ══════════ CREDITS CONTAINER ══════════ */
  .credits-container {
    margin: 4px 10px 6px;
    padding: 13px 14px 11px;
    border-radius: 12px;
    background: rgba(0,0,0,0.03);
    border: 0.5px solid rgba(0,0,0,0.06);
  }
  .credits-container.dark {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.07);
  }
  .credits-top {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 10px;
  }
  .credits-left {
    display: flex; align-items: center; gap: 8px;
  }
  .credits-icon {
    width: 15px; height: 15px; flex-shrink: 0; display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .credits-title {
    font-size: 13.5px; font-weight: 500; color: #000;
  }
  .credits-title.dark { color: #fff; }
  .credits-value {
    font-size: 13px; font-weight: 600;
  }

  /* barra de progresso */
  .progress-track {
    height: 5px; border-radius: 10px;
    background: rgba(0,0,0,0.08); overflow: hidden;
  }
  .progress-track.dark { background: rgba(255,255,255,0.1); }
  .progress-fill {
    height: 100%; border-radius: 10px;
    transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1);
    min-width: 4px;
  }

  .credits-bottom { margin-top: 7px; }
  .credits-hint {
    font-size: 11.5px; color: rgba(60,60,67,0.4);
  }
  .credits-hint.dark { color: rgba(235,235,245,0.3); }

  /* ══════════ POPUP OVERLAY ══════════ */
  .popup-overlay {
    position: fixed; inset: 0; z-index: 160;
    /* sem background para ficar invisível mas capturar clicks */
  }

  /* ══════════ POPUP BOX — ANCHORED ══════════ */
  .popup-box.anchored {
    position: fixed; z-index: 161;
    border-radius: 14px; overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
    background: #ffffff;
    /* origin: canto superior direito (ponto de clique) */
    transform-origin: top right;
  }
  .popup-box.anchored.dark { background: #2c2c2e; }

  .popup-sep {
    height: 0.5px;
    background: rgba(0,0,0,0.08);
    margin: 0 14px;
  }
  .popup-box.dark .popup-sep { background: rgba(255,255,255,0.08); }

  .popup-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px; background: none; border: none;
    cursor: pointer; font-family: inherit;
    transition: background .1s ease;
  }
  .popup-row:active { background: rgba(0,0,0,0.04); }
  .popup-box.dark .popup-row:active { background: rgba(255,255,255,0.05); }

  .popup-label { font-size: 15px; font-weight: 400; color: #000; }
  .popup-box.dark .popup-label { color: #fff; }

  /* ══════════ LANG PICKER ══════════ */
  .lang-box {
    display: flex; flex-direction: column;
    max-height: 360px;
  }
  .lang-search-wrap { padding: 10px 12px 8px; flex-shrink: 0; }
  .lang-search {
    width: 100%; border: none; outline: none;
    border-radius: 8px; padding: 8px 11px;
    font-size: 14px; font-family: inherit;
    background: rgba(0,0,0,0.05); color: #000;
    -webkit-user-select: text; user-select: text;
    box-sizing: border-box;
  }
  .lang-search.dark { background: rgba(255,255,255,0.08); color: #fff; }
  .lang-search::placeholder { color: rgba(60,60,67,0.4); }
  .lang-search.dark::placeholder { color: rgba(235,235,245,0.3); }

  .lang-list { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
  .lang-empty {
    padding: 16px; text-align: center; font-size: 13px;
    color: rgba(60,60,67,0.4);
  }
  .popup-box.dark .lang-empty { color: rgba(235,235,245,0.3); }

  .lang-info { display: flex; flex-direction: column; text-align: left; }
  .lang-name { font-size: 15px; font-weight: 400; color: #000; }
  .popup-box.dark .lang-name { color: #fff; }
  .lang-name.active { color: #007AFF; font-weight: 600; }
  .lang-native { font-size: 12px; color: rgba(60,60,67,0.5); margin-top: 1px; }
  .popup-box.dark .lang-native { color: rgba(235,235,245,0.35); }

  /* ══════════ ICON MASK UTILITY ══════════ */
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center; flex-shrink: 0;
  }
</style>