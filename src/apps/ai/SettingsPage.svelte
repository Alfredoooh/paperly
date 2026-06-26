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
  $: creditsColor = credits <= 10 ? '#EF4444' : credits <= 30 ? '#F59E0B' : c.primary;
  $: creditsLabel = credits <= 10 ? '⚠️ Créditos a acabar' : `${credits} créditos disponíveis`;

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

  $: cardBg   = isDark ? '#0F1115' : '#F5F7FC';
  $: panelBg  = isDark ? '#151821' : '#FFFFFF';
  $: divColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  $: heroBg   = isDark ? 'linear-gradient(180deg,#0F1115,#0B0D11)' : 'linear-gradient(180deg,#F5F7FC,#F5F7FC)';
</script>

<div class="settings-backdrop open">
  <div class="settings-card" style="background:{cardBg};color:{c.textPrimary}">

    <!-- Header -->
    <div class="settings-hero" style="background:{heroBg}">
      <div class="hero-row">
        <h1 class="settings-title" style="color:{c.textPrimary}">Definições</h1>
        <div class="hero-btns">
          <button class="icon-btn pulse-tap" style="background:{isDark?'#1D212A':'#FFFFFF'};color:#EF4444" on:click={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
          <button class="icon-btn pulse-tap" style="background:{isDark?'#1D212A':'#FFFFFF'};color:{c.textPrimary}" on:click={() => dispatch('close')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Scroll -->
    <div class="settings-scroll">
      <div class="panel" style="background:{panelBg}">
        <!-- Credits -->
        <div class="row" style="border-bottom:1px solid {divColor}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={creditsColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span class="row-label" style="color:{c.textPrimary}">Saldo</span>
          <span style="font-size:14px;font-weight:750;color:{creditsColor}">{creditsLabel}</span>
        </div>
        <!-- Plans -->
        <button class="row row-btn pulse-tap" style="border-bottom:1px solid {divColor}" on:click={() => showPlansModal=true}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/tabs.svg');-webkit-mask-image:url('/icons/svg/tabs.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
          <div style="flex:1;text-align:left">
            <div style="font-size:15px;color:{c.textPrimary};font-weight:700">Planos</div>
            <div style="font-size:12.5px;color:{c.textSecondary};margin-top:2px">Básico e Premium</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <!-- Tiles -->
        <div style="padding:10px 0">
          {#each [['appearance','Aparência','theme'],['language','Idioma','language'],['privacy','Privacidade','privacy'],['security','Segurança','security']] as [icon,label,action], i}
            <button class="row row-btn pulse-tap" style="{i<3?`border-bottom:1px solid ${divColor}`:''}" on:click={() => {
              if (action==='theme') showThemePicker=true;
              else if (action==='language') { langSearch=''; showLangPicker=true; }
              else showToast(`${label} em breve`);
            }}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
              <span style="margin-left:14px;flex:1;font-size:15px;color:{c.textPrimary};text-align:left">{label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          {/each}
        </div>
      </div>

      <p class="section-label" style="color:{isDark?'#8E95A3':'#6C7381'}">INFORMAÇÃO</p>
      <div class="panel" style="background:{panelBg}">
        {#each [['about','Sobre a app'],['web','Web & links'],['warning','Ajuda e suporte']] as [icon,label], i}
          <button class="row row-btn pulse-tap" style="{i<2?`border-bottom:1px solid ${divColor}`:''}" on:click={() => showToast(`${label} em breve`)}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:{c.textPrimary};text-align:left">{label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Plans modal — componente próprio com styles isolados -->
<PlansModal {isDark} {user} open={showPlansModal} on:close={() => showPlansModal=false} />

<!-- Theme picker -->
{#if showThemePicker}
  <div class="popup-overlay" on:click={() => showThemePicker=false}></div>
  <div class="popup-box" style="background:{isDark?'#151821':'#FFFFFF'}">
    <div class="popup-title" style="color:{c.textPrimary}">Tema</div>
    {#each [[false,'Claro'],[true,'Escuro']] as [dark,label]}
      <div style="border-top:1px solid {divColor}"></div>
      <button class="popup-row pulse-tap" on:click={() => { showThemePicker=false; dispatch('themeChange',{isDark:dark}); }}>
        <span style="font-size:15px;flex:1;color:{c.textPrimary};text-align:left">{label}</span>
        {#if isDark === dark}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.primary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- Language picker -->
{#if showLangPicker}
  <div class="popup-overlay" on:click={() => showLangPicker=false}></div>
  <div class="popup-box lang-box" style="background:{isDark?'#151821':'#FFFFFF'}">
    <div class="popup-title" style="color:{c.textPrimary}">Idioma</div>
    <div style="padding:0 16px 10px;flex-shrink:0">
      <input class="lang-search" style="background:{isDark?'#232833':'#F2F4FA'};color:{c.textPrimary}" placeholder="Pesquisar idioma..." bind:value={langSearch} />
    </div>
    <div class="lang-list" style="border-top:1px solid {divColor}">
      {#if !filteredLangs.length}
        <div style="padding:24px 20px;text-align:center;font-size:13px;color:{c.textSecondary}">Nenhum idioma encontrado</div>
      {:else}
        {#each filteredLangs as lang, i}
          {#if i > 0}<div style="height:1px;background:{divColor}"></div>{/if}
          <button class="popup-row pulse-tap" on:click={() => setLang(lang.code)}>
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:600;color:{lang.code===currentLanguage?c.primary:c.textPrimary}">{lang.name}</div>
              <div style="font-size:12.5px;color:{c.textSecondary};margin-top:1px">{lang.native}</div>
            </div>
            {#if lang.code === currentLanguage}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.primary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .settings-backdrop { position:fixed; inset:0; z-index:150; background:rgba(0,0,0,.22); opacity:0; pointer-events:none; backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px); transition:opacity .28s ease,backdrop-filter .28s ease; display:flex; align-items:stretch; justify-content:stretch; padding:0; }
  .settings-backdrop.open { opacity:1; pointer-events:auto; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); }
  .settings-card { width:100%; height:100%; border-radius:0; overflow:hidden; display:flex; flex-direction:column; }
  .settings-hero { padding:calc(14px + env(safe-area-inset-top)) 16px 18px; flex-shrink:0; }
  .hero-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .settings-title { margin:0; font-size:22px; font-weight:850; letter-spacing:-.03em; }
  .hero-btns { display:flex; align-items:center; gap:8px; }
  .icon-btn { width:42px; height:42px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; border-radius:50%; box-shadow:0 10px 24px rgba(0,0,0,.12); }
  .settings-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:16px 16px calc(22px + env(safe-area-inset-bottom)); }
  .panel { border-radius:26px; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,.08); }
  .row { display:flex; align-items:center; padding:16px; }
  .row-btn { width:100%; background:none; border:none; cursor:pointer; }
  .row-label { margin-left:14px; flex:1; font-size:15px; font-weight:650; }
  .section-label { font-size:11px; font-weight:750; letter-spacing:.08em; margin:18px 4px 10px; text-transform:uppercase; }

  .popup-overlay { position:fixed; inset:0; z-index:230; background:rgba(0,0,0,.06); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }
  .popup-box { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(86vw,340px); z-index:231; border-radius:18px; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.28); padding:8px 0 12px; }
  .popup-title { padding:10px 20px 12px; font-size:16px; font-weight:700; }
  .popup-row { width:100%; display:flex; align-items:center; padding:13px 20px; background:none; border:none; cursor:pointer; font-family:inherit; }
  .lang-box { max-height:70vh; display:flex; flex-direction:column; padding:8px 0 4px; }
  .lang-search { width:100%; border:none; outline:none; border-radius:10px; padding:10px 13px; font-size:14px; font-family:inherit; -webkit-user-select:text; user-select:text; }
  .lang-list { overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; }

  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>