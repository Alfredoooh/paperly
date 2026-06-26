<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { CreditsApiService } from '../../core/api.js';
  import { showToast } from '../../core/utils.js';
  import { PLANS_DATA } from '../../core/plans.js';

  export let isDark = false;
  export let user   = null;
  export let open   = false;

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  let activePlan = 'basic';
  $: p = PLANS_DATA[activePlan];

  function close() { dispatch('close'); }

  async function handleBuy(planId) {
    if (!user) { showToast('Cria uma conta primeiro'); return; }
    try {
      const data = await CreditsApiService.checkout(user.token, planId);
      if (data.checkout_url) { window.open(data.checkout_url, '_blank'); showToast('A abrir pagamento…'); close(); }
      else showToast('Erro ao gerar link de pagamento');
    } catch (e) { showToast('Erro: ' + e.message); }
  }

  $: divColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
</script>

{#if open}
  <div class="plans-overlay" on:click={close}></div>
  <div class="plans-box" style="background:{isDark?'#0A0B0E':'#F5F6FA'};color:{c.textPrimary}">

    <!-- Hero -->
    <div class="plans-hero" style="background:radial-gradient(circle at 20% 0%,{activePlan==='basic'?'rgba(47,123,246,.22)':'rgba(16,185,129,.22)'} 0%,rgba(0,0,0,0) 45%),{isDark?'#0A0B0E':'#F5F6FA'}">
      <button class="close-btn pulse-tap" style="background:{isDark?'#171A21':'#FFFFFF'};color:{c.textPrimary}" on:click={close}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="plans-headline">
        <div class="plans-big-title" style="color:{c.textPrimary}">Planos</div>
        <div class="plans-trial-text" style="color:{c.textPrimary}">
          Experimenta <span style="color:{p.accent}">{p.trial}</span> durante 3 dias
        </div>
      </div>
      <div class="tabs-wrap" style="background:{isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'}">
        {#each ['basic','premium'] as pid}
          <button
            class="plan-tab pulse-tap"
            style="background:{activePlan===pid?PLANS_DATA[pid].accent:'transparent'};color:{activePlan===pid?'#fff':c.textPrimary}"
            on:click={() => activePlan=pid}
          >{PLANS_DATA[pid].title}</button>
        {/each}
      </div>
    </div>

    <!-- Scroll -->
    <div class="plans-scroll">
      <!-- Features card -->
      <div class="plans-card" style="background:{isDark?'#12141A':'#FFFFFF'};border:1px solid {divColor}">
        {#each p.features as feat, i}
          <div class="feat-row" style="{i<p.features.length-1?`border-bottom:1px solid ${divColor}`:''}">
            <div class="feat-check" style="background:{isDark?'rgba(255,255,255,.06)':'#F3F5FB'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.accent} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div class="feat-text" style="color:{c.textPrimary}">{feat}</div>
          </div>
        {/each}
      </div>
      <!-- Price card -->
      <div class="plans-card price-card" style="background:{isDark?'#12141A':'#FFFFFF'};border:1px solid {divColor}">
        <div class="price-row">
          <div class="price-badge-label" style="color:{c.textPrimary}">{p.badge}</div>
          <div class="price-badge-pill" style="background:{p.accent}">Gratuito</div>
        </div>
        <div class="price-amount" style="color:{c.textPrimary}">{p.price}</div>
        <div class="price-period" style="color:{c.textSecondary}">{p.monthlyText}</div>
      </div>
    </div>

    <!-- CTA -->
    <div class="plans-cta" style="background:{isDark?'#0A0B0E':'#F5F6FA'}">
      <button class="buy-btn pulse-tap" style="background:{isDark?'#F2F2F7':'#111827'};color:{isDark?'#111827':'#FFFFFF'}" on:click={() => handleBuy(activePlan)}>
        Iniciar o teste de 3 dias por 0,00 US$
      </button>
      <div class="cta-sub" style="color:{c.textSecondary}">
        Renova a {p.monthlyText} após o período de teste, cancela a qualquer momento
      </div>
      <div class="cta-links" style="color:{c.textSecondary}">Termos | Política de Privacidade</div>
    </div>
  </div>
{/if}

<style>
  /* Todos os styles são scoped a este componente */
  .plans-overlay {
    position: fixed; inset: 0; z-index: 260;
    background: rgba(0,0,0,.08);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  }
  .plans-box {
    position: fixed; inset: 0; z-index: 261;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .plans-hero {
    position: relative; flex-shrink: 0;
    padding: calc(14px + env(safe-area-inset-top)) 16px 18px;
  }
  .close-btn {
    width: 42px; height: 42px; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; box-shadow: 0 12px 30px rgba(0,0,0,.12);
  }
  .plans-headline { margin-top: 18px; }
  .plans-big-title {
    font-size: 54px; line-height: 1; font-weight: 900;
    letter-spacing: -.05em;
  }
  .plans-trial-text {
    margin-top: 10px; font-size: 16px; font-weight: 750;
  }
  .tabs-wrap {
    display: flex; gap: 8px; margin-top: 22px;
    width: max-content; padding: 4px; border-radius: 999px;
  }
  .plan-tab {
    border: none; border-radius: 999px; padding: 11px 18px;
    font-size: 14px; font-weight: 800; cursor: pointer;
    font-family: inherit; transition: background .15s, color .15s;
  }
  .plans-scroll {
    flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
    padding: 0 16px 18px;
  }
  .plans-card {
    border-radius: 28px; padding: 14px 14px 8px; margin-top: 14px;
  }
  .feat-row {
    display: flex; align-items: flex-start; gap: 14px; padding: 14px 6px;
  }
  .feat-check {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .feat-text { font-size: 16px; font-weight: 800; line-height: 1.2; }
  .price-card { padding: 16px 16px 18px; }
  .price-row { display: flex; align-items: center; gap: 10px; }
  .price-badge-label { font-size: 18px; font-weight: 850; }
  .price-badge-pill {
    padding: 5px 10px; border-radius: 999px; color: #fff;
    font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
  }
  .price-amount { margin-top: 12px; font-size: 34px; font-weight: 900; letter-spacing: -.04em; }
  .price-period { margin-top: 2px; font-size: 15px; }
  .plans-cta {
    flex-shrink: 0;
    padding: 0 16px calc(16px + env(safe-area-inset-bottom));
  }
  .buy-btn {
    width: 100%; height: 58px; border: none; border-radius: 999px;
    font-size: 16px; font-weight: 850;
    box-shadow: 0 18px 40px rgba(0,0,0,.16);
    cursor: pointer; font-family: inherit;
  }
  .cta-sub {
    text-align: center; margin-top: 12px;
    font-size: 12px; line-height: 1.4;
  }
  .cta-links {
    text-align: center; margin-top: 10px;
    font-size: 12px; font-weight: 700;
  }
  .pulse-tap { cursor: pointer; transition: transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform: scale(0.97); opacity: .86; }
</style>