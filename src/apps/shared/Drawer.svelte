<script>
  import { createEventDispatcher } from 'svelte';
  import { DRAWER_APPS } from '../../core/plans.js';
  import { getThemeColors } from '../../core/theme.js';

  export let isDark = false;
  export let user = null;
  export let open = false;
  export let activeApp = 'ai';
  export let conversations = [];
  export let currentConvId = '';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  let conversationsCollapsed = false;

  function closeDrawer() { dispatch('close'); }
  function switchApp(id) { dispatch('switchApp', { id }); closeDrawer(); }
  function openConv(conv) { dispatch('openConv', { conv }); closeDrawer(); }
  function longPressConv(conv) { dispatch('convOptions', { conv }); }
  function toggleConvSection() { conversationsCollapsed = !conversationsCollapsed; }

  // Long press
  function makeLongPress(conv) {
    let t = null, did = false;
    return {
      down() { did=false; t=setTimeout(()=>{did=true; longPressConv(conv);},500); },
      up()   { clearTimeout(t); },
      move() { clearTimeout(t); t=null; },
      click(e){ if(did){e.stopImmediatePropagation();did=false;} }
    };
  }
</script>

<!-- Overlay -->
<div class="drawer-overlay" class:open on:click={closeDrawer}></div>

<!-- Drawer -->
<div class="drawer" class:open class:light={!isDark} class:dark={isDark}>

  <!-- Apps bar (barra lateral esquerda com ícones) -->
  <div class="apps-bar">
    {#each DRAWER_APPS as app, i}
      {#if i === 1}<div class="apps-divider"></div>{/if}
      <div
        class="apps-item"
        class:active={app.id === activeApp}
        title={app.title}
        on:click={() => switchApp(app.id)}
      >
        <img src={app.icon} alt={app.title} />
      </div>
    {/each}
  </div>

  <!-- Main content do drawer -->
  <div class="drawer-main" class:compact={activeApp !== 'ai'}>

    {#if activeApp !== 'ai'}
      <!-- Drawer compacto para apps não-AI -->
      <div class="dh">
        <div class="dh-left">
          <img src={DRAWER_APPS.find(a=>a.id===activeApp)?.icon} class="logo-compact" alt="" />
        </div>
      </div>
      <div class="menu-section">
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('settings'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/user.svg');-webkit-mask-image:url('/icons/svg/user.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">{user?.name || 'Perfil'}</span>
        </div>
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('settings'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">Definições</span>
        </div>
      </div>

    {:else}
      <!-- Drawer completo para AI -->
      <div class="dh">
        <div class="dh-left"></div>
        <button class="pulse-tap icon-btn" style="color:{c.iconTint}" on:click={() => dispatch('newChat')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');width:17px;height:17px;background:{c.iconTint}"></span>
        </button>
      </div>

      <div class="menu-section">
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('settings'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/user.svg');-webkit-mask-image:url('/icons/svg/user.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">{user?.name || 'Perfil'}</span>
        </div>
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('projects'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/folder.svg');-webkit-mask-image:url('/icons/svg/folder.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">Projetos</span>
        </div>
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('extras'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">Extras</span>
        </div>
        <div class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={() => { closeDrawer(); dispatch('settings'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">Definições</span>
        </div>
      </div>

      <div class="section-divider" style="background:{c.divider}"></div>

      <!-- Conversas colapsáveis -->
      <div class="conv-header pulse-tap" on:click={toggleConvSection}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/meassage.svg');-webkit-mask-image:url('/icons/svg/meassage.svg');width:16px;height:16px;background:{c.settings_section_label}"></span>
        <span class="conv-label" style="color:{c.settings_section_label}">CONVERSAS</span>
        <span class="icon-mask conv-chevron" class:collapsed={conversationsCollapsed} style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:11px;height:11px;background:{c.settings_section_label}"></span>
      </div>

      <div class="conv-list-outer" class:collapsed={conversationsCollapsed}>
        <div class="conv-list">
          {#if conversations.length === 0}
            <div class="conv-empty" style="color:{c.textHint}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');width:28px;height:28px;background:{c.textHint}"></span>
              <span>Ainda não há conversas</span>
            </div>
          {:else}
            {#each conversations as conv}
              {@const lp = makeLongPress(conv)}
              {@const isActive = conv.id === currentConvId}
              <div
                class="conv-item pulse-tap"
                style="background:{isActive ? (c.extrasCardActiveText + '12') : 'transparent'}"
                on:pointerdown={lp.down}
                on:pointerup={lp.up}
                on:pointermove={lp.move}
                on:click={(e) => { lp.click(e); openConv(conv); }}
              >
                {#if conv.pinned}
                  <span class="icon-mask pin-icon" style="mask-image:url('/icons/svg/pin_filled.svg');-webkit-mask-image:url('/icons/svg/pin_filled.svg');background:{isActive ? c.extrasCardActiveText : c.iconTintSecondary}"></span>
                {/if}
                <div class="conv-title" style="color:{isActive ? c.extrasCardActiveText : c.drawerText}">{conv.title}</div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .drawer-overlay {
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.08); z-index:100;
    opacity:0; pointer-events:none;
    backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px);
    transition:opacity .28s ease, backdrop-filter .28s ease;
  }
  .drawer-overlay.open { opacity:1; pointer-events:auto; backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }

  .drawer {
    position:fixed; top:0; left:0; bottom:0;
    width:82vw; max-width:400px; z-index:101;
    transform:translateX(-100%);
    transition:transform .3s cubic-bezier(0.4,0,0.2,1);
    display:flex; flex-direction:row; overflow:hidden;
    border-right:1px solid transparent;
  }
  .drawer.open { transform:translateX(0); }
  .drawer.light { background:#F3F4F6; border-right-color:#E5E7EB; }
  .drawer.dark  { background:#141414; border-right-color:#1f1f1f; }

  .apps-bar {
    width:64px; flex-shrink:0;
    display:flex; flex-direction:column; align-items:center;
    padding:20px 0 16px; gap:4px;
    overflow-y:auto; -webkit-overflow-scrolling:touch;
    scrollbar-width:none; background:inherit;
  }
  .apps-bar::-webkit-scrollbar { display:none; }
  .drawer.light .apps-bar { border-right:1px solid #E5E7EB; }
  .drawer.dark  .apps-bar { border-right:1px solid #2C2C2E; }

  .apps-item {
    width:48px; height:48px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:background .15s, transform .12s, box-shadow .15s;
    flex-shrink:0; border:1px solid transparent;
  }
  .apps-item:active { transform:scale(0.94); }
  .apps-item.active { background:rgba(47,123,246,0.12); box-shadow:0 0 0 1px rgba(47,123,246,0.16) inset; border-color:rgba(47,123,246,0.16); }
  .apps-item img { width:30px; height:30px; border-radius:50%; object-fit:cover; }
  .apps-divider { width:32px; height:1px; background:#E5E7EB; margin:2px 0; flex-shrink:0; }
  .drawer.dark .apps-divider { background:#2C2C2E; }

  .drawer-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
  .dh { display:flex; align-items:center; justify-content:space-between; padding:20px 14px 10px 22px; flex-shrink:0; }
  .dh-left { display:flex; align-items:center; gap:10px; min-width:0; }
  .logo-compact { width:34px; height:34px; border-radius:12px; }
  .icon-btn { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:none; border:none; cursor:pointer; }

  .menu-section { padding:4px 12px 8px; flex-shrink:0; }
  .menu-item { display:flex; align-items:center; gap:14px; padding:11px 12px; border-radius:10px; cursor:pointer; font-size:14.5px; font-weight:500; transition:background .15s; margin-bottom:2px; }
  .menu-item:hover, .menu-item:active { background:rgba(127,127,127,0.08); }
  .menu-label { flex:1; }
  .section-divider { height:1px; margin:4px 0; flex-shrink:0; }

  .conv-header { display:flex; align-items:center; gap:9px; padding:10px 24px 8px; cursor:pointer; flex-shrink:0; }
  .conv-label { font-size:11px; font-weight:600; letter-spacing:.08em; flex:1; }
  .conv-chevron { transition:transform .25s cubic-bezier(0.4,0,0.2,1); transform:rotate(90deg); }
  .conv-chevron.collapsed { transform:rotate(0deg); }

  .conv-list-outer { display:grid; grid-template-rows:1fr; transition:grid-template-rows .32s cubic-bezier(0.4,0,0.2,1); min-height:0; flex:1; }
  .conv-list-outer.collapsed { grid-template-rows:0fr; }
  .conv-list { overflow-y:auto; overflow-x:hidden; min-height:0; -webkit-overflow-scrolling:touch; }

  .conv-item { padding:11px 24px; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background .15s; -webkit-user-select:none; user-select:none; }
  .conv-item:active { background:rgba(127,127,127,0.06); }
  .pin-icon { width:11px; height:11px; flex-shrink:0; }
  .conv-title { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }

  .conv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:10px; opacity:.45; font-size:13px; text-align:center; }

  /* pulse-tap e icon-mask são globais usados aqui inline */
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,0.2,1), opacity .11s cubic-bezier(0.4,0,0.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>