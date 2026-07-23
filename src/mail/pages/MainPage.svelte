<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Mail';
  export let appId = 'mail';
  export let iconPath = '/icons/svg/apps/mail.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  const actions = [
    { label: 'Novo', hint: 'Criar um novo item', action: () => showToast('Em breve') },
    { label: 'Recentes', hint: 'Aceder aos últimos ficheiros', action: () => showToast('Em breve') },
    { label: 'Modelos', hint: 'Explorar modelos', action: () => showToast('Em breve') },
  ];
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">
  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'home' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/chevron_left.svg');-webkit-mask-image:url('/icons/svg/regular/chevron_left.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <span class="appbar-title" style="color:{c.textPrimary}">{appTitle}</span>
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'settings' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/settings.svg');-webkit-mask-image:url('/icons/svg/regular/settings.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <div class="hero">
    <div class="hero-badge" style="background:{c.dialogBackground}">
      <span class="icon-mask" style="mask-image:url('{iconPath}');-webkit-mask-image:url('{iconPath}');background:{c.iconTint};width:34px;height:34px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </div>
    <h1>{appTitle}</h1>
    <p style="color:{c.textSecondary}">{appTitle} está pronto para receber o teu fluxo de trabalho.</p>
  </div>

  <div class="section-title" style="color:{c.textSecondary}">Ações rápidas</div>
  <div class="grid">
    {#each actions as action}
      <button class="card" style="background:{c.dialogBackground};border-color:{c.divider}" on:click={action.action}>
        <div class="card-label">{action.label}</div>
        <div class="card-hint" style="color:{c.textSecondary}">{action.hint}</div>
      </button>
    {/each}
  </div>

  <div class="footer" style="background:{c.dialogBackground};border-color:{c.divider}">
    <div class="avatar" style="background:{c.primary}">{userInitial}</div>
    <div class="meta">
      <div class="name" style="color:{c.textPrimary}">{userName}</div>
      {#if userEmail}<div class="email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
    </div>
  </div>
</div>

<style>
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:52px 16px 12px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
  .appbar-btn:active { opacity:.7; }
  .appbar-title { font-size:17px; font-weight:700; text-align:center; flex:1; }
  .hero { padding:28px 16px 8px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; }
  .hero-badge { width:80px; height:80px; border-radius:22px; display:flex; align-items:center; justify-content:center; }
  h1 { margin:0; font-size:28px; line-height:1.1; }
  p { margin:0; max-width:28ch; font-size:14px; line-height:1.45; }
  .section-title { padding:18px 16px 10px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
  .grid { display:grid; grid-template-columns:1fr; gap:10px; padding:0 16px; }
  .card { text-align:left; border:1px solid; border-radius:18px; padding:14px; cursor:pointer; }
  .card:active { transform:scale(.99); }
  .card-label { font-size:15px; font-weight:700; margin-bottom:4px; }
  .card-hint { font-size:13px; line-height:1.4; }
  .footer { margin:16px; margin-top:auto; border:1px solid; border-radius:18px; padding:12px; display:flex; align-items:center; gap:12px; }
  .avatar { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; flex-shrink:0; }
  .name { font-weight:700; }
  .email { font-size:13px; margin-top:2px; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>
