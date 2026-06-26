<script>
  import { createEventDispatcher } from 'svelte';
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

  let showThemePicker  = false;
  let showLangPicker   = false;
  let showPlansModal   = false;
  let langSearch       = '';
  let currentLanguage  = localStorage.getItem('nexa_language') || 'pt';

  $: filteredLangs = AVAILABLE_LANGUAGES.filter(l => {
    const f = langSearch.trim().toLowerCase();
    return !f || l.name.toLowerCase().includes(f) || l.native.toLowerCase().includes(f);
  });

  function setLang(code) {
    currentLanguage = code;
    localStorage.setItem('nexa_language', code);
    showLangPicker = false;
    showToast(`Idioma: ${AVAILABLE_LANGUAGES.find(l=>l.code===code)?.name}`);
  }

  async function handleLogout() {
    if (user) await AuthApiService.logout(user.token);
    dispatch('logout');
  }
</script>

<div class="page" class:dark={isDark}>

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
      <button type="button" class="row" on:click={() => showPlansModal = true}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/tabs.svg');-webkit-mask-image:url('/icons/svg/tabs.svg');"></span>
        <span class="row-label">Planos</span>
        <span class="row-sub">Básico e Premium</span>
      </button>

      <button type="button" class="row">
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{creditsColor};"></span>
        <span class="row-label">Saldo</span>
        <span class="row-trail" style="color:{creditsColor}">{creditsLabel}</span>
      </button>
    </div>

    <!-- Secção: Preferências -->
    <div class="section-label">Preferências</div>
    <div class="section">
      <button type="button" class="row" on:click={() => showThemePicker = true}>
        <span class="icon-mask row-icon" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');"></span>
        <span class="row-label">Aparência</span>
        <span class="row-trail">{isDark ? 'Escuro' : 'Claro'}</span>
      </button>

      <button type="button" class="row" on:click={() => { langSearch = ''; showLangPicker = true; }}>
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

<!-- Plans modal -->
<PlansModal {isDark} {user} open={showPlansModal} on:close={() => showPlansModal=false} />

<!-- Theme picker -->
{#if showThemePicker}
  <div class="popup-overlay" on:click={() => showThemePicker=false}></div>
  <div class="popup-box" class:dark={isDark}>
    <div class="popup-title">Tema</div>
    {#each [[false,'Claro'],[true,'Escuro']] as [dark, label]}
      <div class="popup-sep"></div>
      <button type="button" class="popup-row" on:click={() => { showThemePicker=false; dispatch('themeChange',{isDark:dark}); }}>
        <span class="popup-label">{label}</span>
        {#if isDark === dark}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- Language picker -->
{#if showLangPicker}
  <div class="popup-overlay" on:click={() => showLangPicker=false}></div>
  <div class="popup-box lang-box" class:dark={isDark}>
    <div class="popup-title">Idioma</div>
    <div class="lang-search-wrap">
      <input
        class="lang-search"
        class:dark={isDark}
        placeholder="Pesquisar idioma..."
        bind:value={langSearch}
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  /* ── Page ── */
  .page {
    position: fixed; inset: 0; z-index: 150;
    display: flex; flex-direction: column;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }
  .page.dark { background: #111111; }

  /* ── Header ── */
  .header {
    display: flex; align-items: center;
    padding: 16px 16px 10px;
    padding-top: calc(16px + env(safe-area-inset-top));
    flex-shrink: 0;
    gap: 8px;
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
    color: #000;
  }
  .page.dark .back-btn, .page.dark .logout-btn { color: #fff; }
  .back-btn:active, .logout-btn:active { background: rgba(0,0,0,0.06); }
  .page.dark .back-btn:active, .page.dark .logout-btn:active { background: rgba(255,255,255,0.08); }
  .back-btn .icon-mask { background: #000; }
  .page.dark .back-btn .icon-mask { background: #fff; }
  .logout-btn .icon-mask { background: #FF3B30; }

  /* ── Scroll body ── */
  .body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 8px 0 40px;
    display: flex; flex-direction: column;
  }

  /* ── User block ── */
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

  /* ── Section label ── */
  .section-label {
    font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: rgba(60,60,67,0.5);
    padding: 16px 20px 6px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .page.dark .section-label { color: rgba(235,235,245,0.4); }

  /* ── Section ── */
  .section { display: flex; flex-direction: column; padding: 0 12px; }

  /* ── Row ── */
  .row {
    width: 100%; display: flex; align-items: center; gap: 13px;
    padding: 13px 10px; background: transparent; border: none;
    cursor: pointer; text-align: left; border-radius: 10px;
    -webkit-user-select: none; user-select: none;
    transition: background .12s ease;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }
  .page.dark .row { color: #fff; }
  .row:active { background: rgba(0,0,0,0.05); }
  .page.dark .row:active { background: rgba(255,255,255,0.06); }
  .row.danger { color: #FF3B30; }

  /* ── Row icon — mesmo tamanho dos extras (17px) ── */
  .row-icon {
    width: 17px; height: 17px;
    background: rgba(60,60,67,0.55);
    flex-shrink: 0;
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .page.dark .row-icon { background: rgba(235,235,245,0.55); }
  .danger .row-icon { background: #FF3B30 !important; }

  .row-label { flex: 1; font-size: 15px; font-weight: 400; min-width: 0; }
  .row.danger .row-label { color: #FF3B30; }

  .row-sub {
    font-size: 13px; color: rgba(60,60,67,0.45); flex-shrink: 0;
  }
  .page.dark .row-sub { color: rgba(235,235,245,0.35); }

  .row-trail {
    font-size: 13px; color: rgba(60,60,67,0.45); flex-shrink: 0;
  }
  .page.dark .row-trail { color: rgba(235,235,245,0.35); }

  /* ── Popup overlay ── */
  .popup-overlay {
    position: fixed; inset: 0; z-index: 160;
    background: rgba(0,0,0,0.06);
    backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
  }

  /* ── Popup box ── */
  .popup-box {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: min(86vw, 320px);
    z-index: 161;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,0.18);
    padding: 0;
  }
  .popup-box.dark { background: #1c1c1e; }

  .popup-title {
    padding: 14px 20px 10px;
    font-size: 13px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
    color: rgba(60,60,67,0.5);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .popup-box.dark .popup-title { color: rgba(235,235,245,0.4); }

  .popup-sep {
    height: 0.5px;
    background: rgba(0,0,0,0.08);
    margin: 0 16px;
  }
  .popup-box.dark .popup-sep { background: rgba(255,255,255,0.08); }

  .popup-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; background: none; border: none;
    cursor: pointer; font-family: inherit;
    transition: background .12s ease;
  }
  .popup-row:active { background: rgba(0,0,0,0.04); }
  .popup-box.dark .popup-row:active { background: rgba(255,255,255,0.05); }

  .popup-label {
    font-size: 15px; font-weight: 400; color: #000;
  }
  .popup-box.dark .popup-label { color: #fff; }

  /* ── Lang picker ── */
  .lang-box {
    max-height: 70vh;
    display: flex; flex-direction: column;
  }
  .lang-search-wrap { padding: 0 16px 10px; flex-shrink: 0; }
  .lang-search {
    width: 100%; border: none; outline: none;
    border-radius: 10px; padding: 9px 13px;
    font-size: 14px; font-family: inherit;
    background: rgba(0,0,0,0.05);
    color: #000;
    -webkit-user-select: text; user-select: text;
  }
  .lang-search.dark { background: rgba(255,255,255,0.08); color: #fff; }
  .lang-search::placeholder { color: rgba(60,60,67,0.4); }
  .lang-search.dark::placeholder { color: rgba(235,235,245,0.3); }

  .lang-list { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
  .lang-empty {
    padding: 20px; text-align: center; font-size: 13px;
    color: rgba(60,60,67,0.4);
  }
  .popup-box.dark .lang-empty { color: rgba(235,235,245,0.3); }

  .lang-info { display: flex; flex-direction: column; text-align: left; }
  .lang-name { font-size: 15px; font-weight: 400; color: #000; }
  .popup-box.dark .lang-name { color: #fff; }
  .lang-name.active { color: #007AFF; font-weight: 600; }
  .lang-native { font-size: 12.5px; color: rgba(60,60,67,0.5); margin-top: 1px; }
  .popup-box.dark .lang-native { color: rgba(235,235,245,0.35); }

  /* ── Icon mask utility ── */
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center; flex-shrink: 0;
  }
</style>