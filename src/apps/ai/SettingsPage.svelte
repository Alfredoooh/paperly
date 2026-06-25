<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { AuthApiService, CreditsApiService } from '../../core/api.js';
  import { showToast } from '../../core/utils.js';
  import { AVAILABLE_LANGUAGES, PLANS_DATA } from '../../core/plans.js';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  $: credits = user?.credits ?? 0;
  $: creditsColor = credits <= 10 ? '#EF4444' : credits <= 30 ? '#F59E0B' : c.primary;
  $: creditsLabel = credits <= 10 ? '⚠️ Créditos a acabar' : `${credits} créditos disponíveis`;

  let showThemePicker    = false;
  let showLangPicker     = false;
  let showPlansModal     = false;
  let langSearch         = '';
  let activePlan         = 'basic';

  let currentLanguage = localStorage.getItem('nexa_language') || 'pt';

  $: filteredLangs = AVAILABLE_LANGUAGES.filter(l => {
    const f = langSearch.trim().toLowerCase();
    return !f || l.name.toLowerCase().includes(f) || l.native.toLowerCase().includes(f);
  });

  function setLang(code) {
    currentLanguage = code; localStorage.setItem('nexa_language', code);
    showLangPicker = false; showToast(`Idioma: ${AVAILABLE_LANGUAGES.find(l=>l.code===code)?.name}`);
  }

  async function handleLogout() {
    if (user) await AuthApiService.logout(user.token);
    dispatch('logout');
  }

  async function handleBuyPlan(planId) {
    if (!user) { showToast('Cria uma conta primeiro'); return; }
    try {
      const data = await CreditsApiService.checkout(user.token, planId);
      if (data.checkout_url) { window.open(data.checkout_url, '_blank'); showToast('A abrir pagamento…'); }
      else showToast('Erro ao gerar link de pagamento');
    } catch (e) { showToast('Erro: ' + e.message); }
  }

  const cardBg    = (d) => d ? '#0F1115' : '#F5F7FC';
  const panelBg   = (d) => d ? '#151821' : '#FFFFFF';
  const divColor  = (d) => d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
</script>

<div class="settings-backdrop open">
  <div class="settings-card" style="background:{cardBg(isDark)};color:{c.textPrimary}">

    <!-- Header -->
    <div class="settings-hero" style="background:{isDark?'linear-gradient(180deg,#0F1115,#0B0D11)':'linear-gradient(180deg,#F5F7FC,#F5F7FC)'}">
      <div class="settings-hero-row">
        <h1 class="settings-title" style="color:{c.textPrimary}">Definições</h1>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="settings-icon-btn pulse-tap" style="background:{isDark?'#1D212A':'#FFFFFF'};color:#EF4444" on:click={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
          <button class="settings-icon-btn pulse-tap" style="background:{isDark?'#1D212A':'#FFFFFF'};color:{c.textPrimary}" on:click={() => dispatch('close')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Scroll content -->
    <div class="settings-scroll">

      <!-- Credits + Plan panel -->
      <div class="settings-panel" style="background:{panelBg(isDark)}">
        <!-- Credits row -->
        <div class="settings-row" style="border-bottom:1px solid {divColor(isDark)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={creditsColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span class="settings-row-label" style="color:{c.textPrimary}">Saldo</span>
          <span style="font-size:14px;font-weight:750;color:{creditsColor}">{creditsLabel}</span>
        </div>
        <!-- Plans row -->
        <button class="settings-row pulse-tap settings-row-btn" style="border-bottom:1px solid {divColor(isDark)}" on:click={() => showPlansModal=true}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/tabs.svg');-webkit-mask-image:url('/icons/svg/tabs.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
          <div style="flex:1;text-align:left">
            <div style="font-size:15px;color:{c.textPrimary};font-weight:700">Planos</div>
            <div style="font-size:12.5px;color:{c.textSecondary};margin-top:2px">Básico e Premium</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <!-- Settings tiles -->
        <div style="padding:10px 0">
          {#each [['appearance','Aparência','theme'],['language','Idioma','language'],['privacy','Privacidade','privacy'],['security','Segurança','security']] as [icon,label,action], i}
            <button class="settings-row pulse-tap settings-row-btn" style="{i<3?`border-bottom:1px solid ${divColor(isDark)}`:''}" on:click={() => {
              if(action==='theme') showThemePicker=true;
              else if(action==='language') { langSearch=''; showLangPicker=true; }
              else showToast(`${label} em breve`);
            }}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
              <span style="margin-left:14px;flex:1;font-size:15px;color:{c.textPrimary};text-align:left">{label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          {/each}
        </div>
      </div>

      <p class="settings-section-label" style="color:{isDark?'#8E95A3':'#6C7381'}">INFORMAÇÃO</p>
      <div class="settings-panel" style="background:{panelBg(isDark)}">
        {#each [['about','Sobre a app','about'],['web','Web & links','web'],['warning','Ajuda e suporte','support']] as [icon,label,action], i}
          <button class="settings-row pulse-tap settings-row-btn" style="{i<2?`border-bottom:1px solid ${divColor(isDark)}`:''}" on:click={() => showToast(`${label} em breve`)}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{c.iconTint};width:20px;height:20px;flex-shrink:0"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:{c.textPrimary};text-align:left">{label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.iconTintSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- Theme picker popup -->
{#if showThemePicker}
  <div class="popup-overlay" on:click={() => showThemePicker=false}></div>
  <div class="popup-box" style="background:{isDark?'#151821':'#FFFFFF'}">
    <div class="popup-title" style="color:{c.textPrimary}">Tema</div>
    {#each [[false,'Claro'],[true,'Escuro']] as [dark,label]}
      <div style="border-top:1px solid {divColor(isDark)}"></div>
      <button class="popup-row pulse-tap" on:click={() => { showThemePicker=false; dispatch('themeChange',{isDark:dark}); }}>
        <span style="font-size:15px;flex:1;color:{c.textPrimary};text-align:left">{label}</span>
        {#if isDark === dark}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.primary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- Language picker popup -->
{#if showLangPicker}
  <div class="popup-overlay" on:click={() => showLangPicker=false}></div>
  <div class="popup-box lang-box" style="background:{isDark?'#151821':'#FFFFFF'}">
    <div class="popup-title" style="color:{c.textPrimary}">Idioma</div>
    <div style="padding:0 16px 10px;flex-shrink:0">
      <input class="lang-search" style="background:{isDark?'#232833':'#F2F4FA'};color:{c.textPrimary}" placeholder="Pesquisar idioma..." bind:value={langSearch} />
    </div>
    <div class="lang-list" style="border-top:1px solid {divColor(isDark)}">
      {#if filteredLangs.length === 0}
        <div style="padding:24px 20px;text-align:center;font-size:13px;color:{c.textSecondary}">Nenhum idioma encontrado</div>
      {:else}
        {#each filteredLangs as lang, i}
          {#if i > 0}<div style="height:1px;background:{divColor(isDark)}"></div>{/if}
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

<!-- Plans modal -->
{#if showPlansModal}
  {@const p = PLANS_DATA[activePlan]}
  <div class="plans-overlay" on:click={() => showPlansModal=false}></div>
  <div class="plans-box" style="background:{isDark?'#0A0B0E':'#F5F6FA'};color:{c.textPrimary}">
    <div class="plans-hero" style="background:radial-gradient(circle at 20% 0%,{activePlan==='basic'?'rgba(47,123,246,.22)':'rgba(16,185,129,.22)'} 0%,rgba(0,0,0,0) 45%),{isDark?'#0A0B0E':'#F5F6FA'}">
      <button class="settings-icon-btn pulse-tap" style="background:{isDark?'#171A21':'#FFFFFF'};color:{c.textPrimary}" on:click={() => showPlansModal=false}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div style="margin-top:18px">
        <div style="font-size:54px;line-height:1;font-weight:900;letter-spacing:-.05em;color:{c.textPrimary}">Planos</div>
        <div style="margin-top:10px;font-size:16px;font-weight:750;color:{c.textPrimary}">Experimenta <span style="color:{p.accent}">{p.trial}</span> durante 3 dias</div>
      </div>
      <div class="plan-tabs-wrap" style="background:{isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'}">
        {#each ['basic','premium'] as pid}
          <button class="plan-tab pulse-tap" style="background:{activePlan===pid?PLANS_DATA[pid].accent:'transparent'};color:{activePlan===pid?'#fff':c.textPrimary}" on:click={() => activePlan=pid}>
            {PLANS_DATA[pid].title}
          </button>
        {/each}
      </div>
    </div>
    <div class="plans-scroll">
      <!-- Features -->
      <div class="plans-card" style="background:{isDark?'#12141A':'#FFFFFF'};border:1px solid {divColor(isDark)}">
        {#each p.features as feat, i}
          <div class="plan-feat-row" style="{i<p.features.length-1?`border-bottom:1px solid ${divColor(isDark)}`:''}" >
            <div class="plan-feat-check" style="background:{isDark?'rgba(255,255,255,.06)':'#F3F5FB'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.accent} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div style="font-size:16px;font-weight:800;color:{c.textPrimary};line-height:1.2">{feat}</div>
          </div>
        {/each}
      </div>
      <!-- Price -->
      <div class="plans-card" style="background:{isDark?'#12141A':'#FFFFFF'};border:1px solid {divColor(isDark)};margin-top:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:18px;font-weight:850;color:{c.textPrimary}">{p.badge}</div>
          <div style="padding:5px 10px;border-radius:999px;background:{p.accent};color:#fff;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">Gratuito</div>
        </div>
        <div style="margin-top:12px;font-size:34px;font-weight:900;letter-spacing:-.04em;color:{c.textPrimary}">{p.price}</div>
        <div style="margin-top:2px;font-size:15px;color:{c.textSecondary}">{p.monthlyText}</div>
      </div>
    </div>
    <!-- CTA -->
    <div class="plans-cta" style="background:{isDark?'#0A0B0E':'#F5F6FA'}">
      <button class="plans-buy-btn pulse-tap" style="background:{isDark?'#F2F2F7':'#111827'};color:{isDark?'#111827':'#FFFFFF'}" on:click={() => handleBuyPlan(activePlan)}>
        Iniciar o teste de 3 dias por 0,00 US$
      </button>
      <div style="text-align:center;margin-top:12px;font-size:12px;line-height:1.4;color:{c.textSecondary}">Renova a {p.monthlyText} após o período de teste, cancela a qualquer momento</div>
      <div style="text-align:center;margin-top:10px;font-size:12px;font-weight:700;color:{c.textSecondary}">Termos | Política de Privacidade</div>
    </div>
  </div>
{/if}

<style>
  .settings-backdrop { position:fixed; inset:0; z-index:150; background:rgba(0,0,0,.22); opacity:0; pointer-events:none; backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px); transition:opacity .28s ease,backdrop-filter .28s ease; display:flex; align-items:stretch; justify-content:stretch; padding:0; }
  .settings-backdrop.open { opacity:1; pointer-events:auto; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); }
  .settings-card { width:100%; height:100%; border-radius:0; overflow:hidden; display:flex; flex-direction:column; }
  .settings-hero { padding:calc(14px + env(safe-area-inset-top)) 16px 18px; flex-shrink:0; }
  .settings-hero-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .settings-title { margin:0; font-size:22px; font-weight:850; letter-spacing:-.03em; }
  .settings-icon-btn { width:42px; height:42px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; border-radius:50%; box-shadow:0 10px 24px rgba(0,0,0,.12); }
  .settings-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:16px 16px calc(22px + env(safe-area-inset-bottom)); }
  .settings-panel { border-radius:26px; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,.08); margin-bottom:0; }
  .settings-row { display:flex; align-items:center; padding:16px 16px; }
  .settings-row-btn { width:100%; background:none; border:none; cursor:pointer; }
  .settings-row-label { margin-left:14px; flex:1; font-size:15px; font-weight:650; }
  .settings-section-label { font-size:11px; font-weight:750; letter-spacing:.08em; margin:18px 4px 10px; text-transform:uppercase; }

  /* Popup */
  .popup-overlay { position:fixed; inset:0; z-index:230; background:rgba(0,0,0,.06); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }
  .popup-box { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(86vw,340px); z-index:231; border-radius:18px; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.28); padding:8px 0 12px; }
  .popup-title { padding:10px 20px 12px; font-size:16px; font-weight:700; }
  .popup-row { width:100%; display:flex; align-items:center; padding:13px 20px; background:none; border:none; cursor:pointer; font-family:inherit; }
  .lang-box { max-height:70vh; display:flex; flex-direction:column; padding:8px 0 4px; }
  .lang-search { width:100%; border:none; outline:none; border-radius:10px; padding:10px 13px; font-size:14px; font-family:inherit; -webkit-user-select:text; user-select:text; }
  .lang-list { overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch; }

  /* Plans */
  .plans-overlay { position:fixed; inset:0; z-index:260; background:rgba(0,0,0,.08); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
  .plans-box { position:fixed; inset:0; z-index:261; display:flex; flex-direction:column; overflow:hidden; }
  .plans-hero { position:relative; flex-shrink:0; padding:calc(14px + env(safe-area-inset-top)) 16px 18px; }
  .plan-tabs-wrap { display:flex; gap:8px; margin-top:22px; width:max-content; padding:4px; border-radius:999px; }
  .plan-tab { border:none; border-radius:999px; padding:11px 18px; font-size:14px; font-weight:800; cursor:pointer; font-family:inherit; transition:background .15s,color .15s; }
  .plans-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:0 16px 18px; }
  .plans-card { border-radius:28px; padding:14px 14px 8px; }
  .plan-feat-row { display:flex; align-items:flex-start; gap:14px; padding:14px 6px; }
  .plan-feat-check { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .plans-cta { flex-shrink:0; padding:0 16px calc(16px + env(safe-area-inset-bottom)); }
  .plans-buy-btn { width:100%; height:58px; border:none; border-radius:999px; font-size:16px; font-weight:850; box-shadow:0 18px 40px rgba(0,0,0,.16); cursor:pointer; font-family:inherit; }

  /* pulse-tap / icon-mask */
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>