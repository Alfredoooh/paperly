<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';
  import { logout } from '$shared/auth-guard.js';
  import { AuthApiService } from '$shared/api.js';
  import { AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { showToast } from '$shared/utils.js';
  
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';
  
  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);
  
  let themeValue = getTheme();
  let langOpen = false;
  let currentLang = user?.preferences?.language || 'pt';
  
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: currentLangLabel = AVAILABLE_LANGUAGES.find(l => l.code === currentLang)?.native || 'Português (Portugal)';
  
  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'settings', data: { isDark: dark } });
  }
  
  function selectLang(code) {
    currentLang = code;
    langOpen = false;
    localStorage.setItem('nexa_lang', code);
    showToast('Idioma atualizado');
  }
  
  async function handleLogoutEverywhere() {
    if (!user?.token) return;
    const ok = await AuthApiService.logoutAll ? await AuthApiService.logoutAll(user.token) : false;
    showToast(ok ? 'Sessões terminadas em todos os dispositivos' : 'Não foi possível terminar as outras sessões');
    if (ok) logout();
  }
</script>

<div class="settings-root" style="background:{c.background}">
  <div class="topbar">
    <button class="back-btn" style="background:{c.appbarBtnBg}" on:click={()=> dispatch('nav', { to: 'main' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <span class="topbar-title" style="color:{c.textPrimary}">Definições gerais</span>
    <div style="width:36px"></div>
  </div>
  <div class="content">
    <div class="profile-card" style="background:{c.dialogBackground}">
      {#if user?.avatar}
        <img class="avatar-img" src={user.avatar} alt={userName} />
      {:else}
        <div class="avatar" style="background:{c.primary}">{userInitial}</div>
      {/if}
      <div class="profile-info">
        <div class="profile-name" style="color:{c.textPrimary}">{userName}</div>
        {#if userEmail}<div class="profile-email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
      </div>
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="section" style="background:{c.dialogBackground}">
      {#each [['light','Claro'],['dark','Escuro'],['system','Sistema']] as [v, label], i}
        <button class="row" on:click={() => setThemeValue(v)}>
          <span class="row-label" style="color:{c.textPrimary}">{label}</span>
          {#if themeValue === v}<span class="check">✓</span>{/if}
        </button>
        {#if i < 2}<div class="divider" style="background:{c.divider}"></div>{/if}
      {/each}
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Idioma</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={() => langOpen = !langOpen}>
        <span class="row-label" style="color:{c.textPrimary}">Idioma da app</span>
        <span class="row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
      </button>
      {#if langOpen}
        <div class="divider" style="background:{c.divider}"></div>
        <div class="lang-list">
          {#each AVAILABLE_LANGUAGES as lang}
            <button class="row" on:click={() => selectLang(lang.code)}>
              <span class="row-label" style="color:{c.textPrimary}">{lang.native}</span>
              {#if currentLang === lang.code}<span class="check">✓</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Notificações</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={() => showToast('Em breve')}>
        <span class="row-label" style="color:{c.textPrimary}">Notificações por email</span>
        <span class="row-value" style="color:{c.textSecondary}">Em breve</span>
      </button>
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={handleLogoutEverywhere}>
        <span class="row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
      </button>
      <div class="divider" style="background:{c.divider}"></div>
      <button class="row danger" on:click={() => logout()}>
        <span class="row-label">Terminar sessão</span>
      </button>
    </div>
  </div>
</div>

<style>
  .settings-root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:52px 16px 12px; flex-shrink:0; }
  .back-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .back-btn:active { opacity:.7; }
  .topbar-title { font-size:16px; font-weight:700; text-align:center; flex:1; }
  .content { flex:1; overflow-y:auto; padding:8px 16px 16px; }
  .profile-card { display:flex; align-items:center; gap:14px; padding:16px; border-radius:18px; margin-bottom:24px; }
  .avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#fff; flex-shrink:0; }
  .avatar-img { width:48px; height:48px; border-radius:50%; object-fit:cover; flex-shrink:0; }
  .profile-name { font-size:16px; font-weight:700; }
  .profile-email { font-size:13px; margin-top:2px; }
  .section-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:0 2px 10px; }
  .section { border-radius:18px; overflow:hidden; margin-bottom:20px; }
  .row { width:100%; background:transparent; border:none; display:flex; align-items:center; justify-content:space-between; padding:14px 16px; font-size:15px; cursor:pointer; text-align:left; }
  .row:active { opacity:.7; }
  .row.danger { color:#FF3B30; justify-content:flex-start; }
  .row-value { font-size:13px; }
  .check { color:#2F7BF6; font-weight:700; }
  .divider { height:1px; margin:0 16px; }
  .lang-list { max-height:280px; overflow-y:auto; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style><script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';
  import { logout } from '$shared/auth-guard.js';
  import { AuthApiService } from '$shared/api.js';
  import { AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { showToast } from '$shared/utils.js';
  
  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';
  
  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);
  
  let themeValue = getTheme();
  let langOpen = false;
  let currentLang = user?.preferences?.language || 'pt';
  
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: currentLangLabel = AVAILABLE_LANGUAGES.find(l => l.code === currentLang)?.native || 'Português (Portugal)';
  
  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'settings', data: { isDark: dark } });
  }
  
  function selectLang(code) {
    currentLang = code;
    langOpen = false;
    localStorage.setItem('nexa_lang', code);
    showToast('Idioma atualizado');
  }
  
  async function handleLogoutEverywhere() {
    if (!user?.token) return;
    const ok = await AuthApiService.logoutAll ? await AuthApiService.logoutAll(user.token) : false;
    showToast(ok ? 'Sessões terminadas em todos os dispositivos' : 'Não foi possível terminar as outras sessões');
    if (ok) logout();
  }
</script>

<div class="settings-root" style="background:{c.background}">
  <div class="topbar">
    <button class="back-btn" style="background:{c.appbarBtnBg}" on:click={()=> dispatch('nav', { to: 'main' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <span class="topbar-title" style="color:{c.textPrimary}">Definições gerais</span>
    <div style="width:36px"></div>
  </div>
  <div class="content">
    <div class="profile-card" style="background:{c.dialogBackground}">
      {#if user?.avatar}
        <img class="avatar-img" src={user.avatar} alt={userName} />
      {:else}
        <div class="avatar" style="background:{c.primary}">{userInitial}</div>
      {/if}
      <div class="profile-info">
        <div class="profile-name" style="color:{c.textPrimary}">{userName}</div>
        {#if userEmail}<div class="profile-email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
      </div>
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="section" style="background:{c.dialogBackground}">
      {#each [['light','Claro'],['dark','Escuro'],['system','Sistema']] as [v, label], i}
        <button class="row" on:click={() => setThemeValue(v)}>
          <span class="row-label" style="color:{c.textPrimary}">{label}</span>
          {#if themeValue === v}<span class="check">✓</span>{/if}
        </button>
        {#if i < 2}<div class="divider" style="background:{c.divider}"></div>{/if}
      {/each}
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Idioma</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={() => langOpen = !langOpen}>
        <span class="row-label" style="color:{c.textPrimary}">Idioma da app</span>
        <span class="row-value" style="color:{c.textSecondary}">{currentLangLabel}</span>
      </button>
      {#if langOpen}
        <div class="divider" style="background:{c.divider}"></div>
        <div class="lang-list">
          {#each AVAILABLE_LANGUAGES as lang}
            <button class="row" on:click={() => selectLang(lang.code)}>
              <span class="row-label" style="color:{c.textPrimary}">{lang.native}</span>
              {#if currentLang === lang.code}<span class="check">✓</span>{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Notificações</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={() => showToast('Em breve')}>
        <span class="row-label" style="color:{c.textPrimary}">Notificações por email</span>
        <span class="row-value" style="color:{c.textSecondary}">Em breve</span>
      </button>
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="section" style="background:{c.dialogBackground}">
      <button class="row" on:click={handleLogoutEverywhere}>
        <span class="row-label" style="color:{c.textPrimary}">Terminar sessão em todos os dispositivos</span>
      </button>
      <div class="divider" style="background:{c.divider}"></div>
      <button class="row danger" on:click={() => logout()}>
        <span class="row-label">Terminar sessão</span>
      </button>
    </div>
  </div>
</div>

<style>
  .settings-root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:52px 16px 12px; flex-shrink:0; }
  .back-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .back-btn:active { opacity:.7; }
  .topbar-title { font-size:16px; font-weight:700; text-align:center; flex:1; }
  .content { flex:1; overflow-y:auto; padding:8px 16px 16px; }
  .profile-card { display:flex; align-items:center; gap:14px; padding:16px; border-radius:18px; margin-bottom:24px; }
  .avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#fff; flex-shrink:0; }
  .avatar-img { width:48px; height:48px; border-radius:50%; object-fit:cover; flex-shrink:0; }
  .profile-name { font-size:16px; font-weight:700; }
  .profile-email { font-size:13px; margin-top:2px; }
  .section-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:0 2px 10px; }
  .section { border-radius:18px; overflow:hidden; margin-bottom:20px; }
  .row { width:100%; background:transparent; border:none; display:flex; align-items:center; justify-content:space-between; padding:14px 16px; font-size:15px; cursor:pointer; text-align:left; }
  .row:active { opacity:.7; }
  .row.danger { color:#FF3B30; justify-content:flex-start; }
  .row-value { font-size:13px; }
  .check { color:#2F7BF6; font-weight:700; }
  .divider { height:1px; margin:0 16px; }
  .lang-list { max-height:280px; overflow-y:auto; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>