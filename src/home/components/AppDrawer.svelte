<!-- src/routes/home/components/AppDrawer.svelte -->
<script>
  import { THEME_OPTIONS, DRAWER_ITEMS } from '../lib/constants.js';
  
  export let drawerOpen = false;
  export let drawerVisible = false;
  export let themeExpanded = false;
  export let appsExpanded = false;
  export let themeValue = 'dark';
  export let avatarColor = '#FF3B30';
  export let userInitial = 'U';
  export let userName = 'Utilizador';
  
  export let onClose;
  export let onToggleThemeExpanded;
  export let onToggleAppsExpanded;
  export let onApplyTheme;
  export let onToggleAppsHidden;
  export let onLogout;
</script>

{#if drawerOpen}
  <div class="drawer-overlay" class:drawer-overlay-in={drawerVisible} on:click={onClose}></div>
  <div class="drawer" class:drawer-in={drawerVisible}>
    <div class="drawer-avatar-block">
      <div class="drawer-avatar" style="background:{avatarColor}">{userInitial}</div>
      <span class="drawer-user-name">{userName}</span>
    </div>
    <div class="drawer-sep"></div>
    <nav class="drawer-nav">
      <button class="drawer-item pulse-tap" on:click={onToggleThemeExpanded}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/appearance.svg');-webkit-mask-image:url('/icons/svg/appearance.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
        <span class="drawer-item-label" style="flex:1">Tema</span>
        <span class="icon-mask drawer-chevron" class:drawer-chevron-open={themeExpanded} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:14px;height:14px;background:var(--drawer-text-faint)"></span>
      </button>
      <div class="theme-accordion" class:theme-accordion-open={themeExpanded}>
        <div class="theme-accordion-inner">
          {#each THEME_OPTIONS as opt}
            <button class="theme-opt pulse-tap" on:click={() => onApplyTheme(opt.id)}>
              <span class="theme-opt-label" style={themeValue === opt.id ? 'color:var(--drawer-text);font-weight:600' : ''}>{opt.label}</span>
              {#if themeValue === opt.id}
                <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');width:14px;height:14px;background:var(--drawer-text);"></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <button class="drawer-item pulse-tap" on:click={onToggleAppsExpanded}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/apps.svg');-webkit-mask-image:url('/icons/svg/apps.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
        <span class="drawer-item-label" style="flex:1">Apps</span>
        <span class="icon-mask drawer-chevron" class:drawer-chevron-open={appsExpanded} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:14px;height:14px;background:var(--drawer-text-faint)"></span>
      </button>
      <div class="theme-accordion" class:theme-accordion-open={appsExpanded}>
        <div class="theme-accordion-inner">
          <div class="apps-switch-row">
            <span class="apps-switch-label">Ocultar apps</span>
            <button class="switch-track pulse-tap" class:switch-on={false} role="switch" aria-checked={false} on:click={onToggleAppsHidden}>
              <span class="switch-thumb"></span>
            </button>
          </div>
        </div>
      </div>

      {#each DRAWER_ITEMS as item}
        <button class="drawer-item pulse-tap" on:click={() => { item.action(); onClose(); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:20px;height:20px;background:var(--drawer-text)"></span>
          <span class="drawer-item-label">{item.label}</span>
        </button>
      {/each}
    </nav>
    <div style="flex:1"></div>
    <div class="drawer-sep"></div>
    <button class="drawer-logout pulse-tap" on:click={() => { onClose(); onLogout(); }}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/logout.svg');-webkit-mask-image:url('/icons/svg/logout.svg');width:19px;height:19px;background:var(--logout-icon)"></span>
      <span class="drawer-logout-label">Terminar sessão</span>
    </button>
    <div style="height:max(env(safe-area-inset-bottom,0px),12px)"></div>
  </div>
{/if}

<style>
  .drawer-overlay {
    position:fixed; inset:0; z-index:70; background:transparent; transition:background .32s cubic-bezier(0.16,1,0.3,1); will-change: background;
  }
  .drawer-overlay.drawer-overlay-in { background:var(--drawer-overlay-in); }
  .drawer {
    position:fixed; top:0; right:0; bottom:0; z-index:71; width:min(288px,82vw);
    background:var(--drawer-bg); border-left:0.5px solid var(--drawer-border);
    box-shadow:-12px 0 48px var(--drawer-shadow); display:flex; flex-direction:column;
    padding-top:max(env(safe-area-inset-top,0px),16px); overflow:hidden;
    transform:translate3d(100%,0,0); opacity:0.98;
    transition:transform .32s cubic-bezier(0.16,1,0.3,1), opacity .2s cubic-bezier(0.16,1,0.3,1);
    will-change: transform, opacity; backface-visibility: hidden; contain: layout paint style;
  }
  .drawer.drawer-in { transform:translate3d(0,0,0); opacity:1; }
  .drawer-avatar-block {
    display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 20px; flex-shrink:0;
  }
  .drawer-avatar {
    width:84px; height:84px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:32px; font-weight:700; color:#fff;
  }
  .drawer-user-name {
    font-size:16px; font-weight:700; color:var(--drawer-text); text-align:center;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;
  }
  .drawer-sep { height:0.5px; background:var(--drawer-sep); margin:0 14px; flex-shrink:0; }
  .drawer-nav {
    display:flex; flex-direction:column; padding:8px 6px; overflow-y:auto; overflow-x:hidden;
    -webkit-overflow-scrolling:touch; overscroll-behavior:contain; flex:1;
  }
  .drawer-item {
    display:flex; align-items:center; gap:16px; padding:13px 14px; border-radius:10px; border:none;
    background:transparent; cursor:pointer; font-family:inherit; text-align:left;
    transition:background .14s cubic-bezier(0.16,1,0.3,1); width:100%;
  }
  .drawer-item:active { background:var(--drawer-row-active); }
  .drawer-item-label { font-size:15px; font-weight:400; color:var(--drawer-text); }
  .drawer-chevron { transition:transform .3s cubic-bezier(0.16,1,0.3,1); }
  .drawer-chevron-open { transform:rotate(90deg); }
  .theme-accordion { display:grid; grid-template-rows:0fr; transition:grid-template-rows .3s cubic-bezier(0.16,1,0.3,1); }
  .theme-accordion-open { grid-template-rows:1fr; }
  .theme-accordion-inner { overflow:hidden; min-height:0; }
  .theme-opt {
    display:flex; align-items:center; justify-content:space-between; width:100%; padding:11px 14px 11px 52px;
    background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left; border-radius:8px;
    transition:background .14s cubic-bezier(0.16,1,0.3,1);
  }
  .theme-opt:active { background:var(--drawer-row-active); }
  .theme-opt-label { font-size:14px; color:var(--drawer-text-faint); flex:1; }
  .apps-switch-row {
    display:flex; align-items:center; justify-content:space-between; width:100%; padding:11px 14px 11px 52px;
  }
  .apps-switch-label { font-size:14px; color:var(--drawer-text-faint); flex:1; }
  .switch-track {
    position:relative; width:46px; height:27px; border-radius:999px; border:none; background:var(--switch-off-bg);
    cursor:pointer; padding:0; flex-shrink:0; transition:background .24s cubic-bezier(0.16,1,0.3,1);
  }
  .switch-track.switch-on { background:var(--switch-on-bg); }
  .switch-thumb {
    position:absolute; top:2px; left:2px; width:23px; height:23px; border-radius:50%; background:var(--switch-thumb-bg);
    box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:transform .24s cubic-bezier(0.34,1.56,0.64,1);
  }
  .switch-thumb.switch-thumb-on { transform:translateX(19px); }
  .drawer-logout {
    display:flex; align-items:center; justify-content:center; gap:10px; margin:14px 14px 4px;
    padding:14px 16px; border-radius:999px; border:0.5px solid var(--border-soft); background:var(--btn-bg);
    cursor:pointer; font-family:inherit; flex-shrink:0;
    transition:background .2s cubic-bezier(0.16,1,0.3,1), transform .2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .drawer-logout:active { background:var(--btn-bg-active); transform:scale(0.96); }
  .drawer-logout-label { font-size:15px; font-weight:700; color:var(--logout-icon); }
  .icon-mask {
    display:block;
    mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center;
    flex-shrink:0;
  }
  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
</style>