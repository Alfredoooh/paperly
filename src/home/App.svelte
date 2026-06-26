<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme, getThemeColors } from '$shared/theme.js';
  import { requireAuth, logout } from '$shared/auth-guard.js';
  import { ALL_APPS } from '$shared/plans.js';

  let isDark = false;
  let user   = null;
  let c      = getThemeColors(false);

  $: c = getThemeColors(isDark);

  $: userName    = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  const AVATAR_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE'];
  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  $: avatarColor = getAvatarColor(userName);

  const platformApps = ALL_APPS.filter(a => a.id !== 'home');

  onMount(() => {
    user = requireAuth();
    if (!user) return;
    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);
  });

  function openApp(app) {
    window.location.href = app.path;
  }

  function handleLogout() {
    logout();
  }

  function toggleTheme() {
    isDark = !isDark;
    const { setTheme } = { setTheme: (v) => { localStorage.setItem('nexa_theme', v); syncTheme(v === 'dark'); } };
    localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    syncTheme(isDark);
  }
</script>

<div class="home-root" style="background:{c.background}">

  <!-- Header -->
  <div class="home-header">
    <div class="header-left">
      <img src="/icons/png/logo.png" class="header-logo" alt="Nexa" />
      <span class="header-title" style="color:{c.textPrimary}">Nexa</span>
    </div>
    <div class="header-right">
      <button class="icon-btn" style="background:{c.appbarBtnBg}" on:click={toggleTheme}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="avatar-btn" style="background:{avatarColor}" on:click={handleLogout}>
        {userInitial}
      </button>
    </div>
  </div>

  <!-- Greeting -->
  <div class="home-greeting">
    <div class="greeting-text" style="color:{c.textPrimary}">
      Olá, <span style="color:#2F7BF6">{userName.split(' ')[0]}</span> 👋
    </div>
    <div class="greeting-sub" style="color:{c.textSecondary}">O que queres fazer hoje?</div>
  </div>

  <!-- Apps grid -->
  <div class="apps-grid">
    {#each platformApps as app}
      <button class="app-card" style="background:{c.dialogBackground};border-color:{c.divider}" on:click={() => openApp(app)}>
        <div class="app-icon-wrap" style="background:{isDark ? '#2C2C2E' : '#F0F0F5'}">
          {#if app.icon.endsWith('.svg')}
            <span class="icon-mask app-icon-mask" style="mask-image:url('{app.icon}');-webkit-mask-image:url('{app.icon}');background:{c.iconTint};"></span>
          {:else}
            <img src={app.icon} class="app-icon-img" alt={app.label} />
          {/if}
        </div>
        <span class="app-label" style="color:{c.textPrimary}">{app.label}</span>
      </button>
    {/each}
  </div>

</div>

<style>
  .home-root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    transition: background 0.3s;
  }

  .home-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 52px 20px 12px;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-logo { width: 30px; height: 30px; border-radius: 8px; }
  .header-title { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
  .header-right { display: flex; align-items: center; gap: 10px; }

  .icon-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity 0.15s;
  }
  .icon-btn:active { opacity: 0.6; }

  .avatar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    font-size: 14px; font-weight: 700; color: #fff;
    cursor: pointer; transition: opacity 0.15s;
  }
  .avatar-btn:active { opacity: 0.7; }

  .home-greeting {
    padding: 16px 24px 8px;
    flex-shrink: 0;
  }
  .greeting-text { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
  .greeting-sub { font-size: 14px; margin-top: 4px; }

  .apps-grid {
    flex: 1;
    padding: 20px 16px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    align-content: start;
  }

  .app-card {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 24px 16px;
    border-radius: 20px; border: 1px solid;
    cursor: pointer; transition: transform 0.15s, opacity 0.15s;
    background: none;
  }
  .app-card:active { transform: scale(0.96); opacity: 0.8; }

  .app-icon-wrap {
    width: 58px; height: 58px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
  }
  .app-icon-mask {
    width: 28px; height: 28px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .app-icon-img { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; }
  .app-label { font-size: 14px; font-weight: 600; }

  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>