<script>
  import { createEventDispatcher } from 'svelte';
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
  function openConv(conv) { dispatch('openConv', { conv }); closeDrawer(); }
  function longPressConv(conv) { dispatch('convOptions', { conv }); }
  function toggleConvSection() { conversationsCollapsed = !conversationsCollapsed; }

  const appMenu = {
    ai: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'folder', label: 'Projetos', action: () => { closeDrawer(); dispatch('projects'); } },
      { icon: 'extras', label: 'Extras', action: () => { closeDrawer(); dispatch('extras'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ],
    music: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'bookmark', label: 'Favoritos', action: () => { closeDrawer(); dispatch('favorites'); } },
      { icon: 'history', label: 'Recentes', action: () => { closeDrawer(); dispatch('history'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ],
    games: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'game_filled', label: 'Biblioteca', action: () => { closeDrawer(); dispatch('library'); } },
      { icon: 'star', label: 'Destaques', action: () => { closeDrawer(); dispatch('highlights'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ],
    media: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'image', label: 'Galeria', action: () => { closeDrawer(); dispatch('gallery'); } },
      { icon: 'bookmark', label: 'Guardados', action: () => { closeDrawer(); dispatch('saved'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ],
    news: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'web', label: 'Tendências', action: () => { closeDrawer(); dispatch('trending'); } },
      { icon: 'bookmark', label: 'Ler depois', action: () => { closeDrawer(); dispatch('saved'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ],
    downloader: [
      { icon: 'user', label: user?.name || 'Perfil', action: () => { closeDrawer(); dispatch('settings'); } },
      { icon: 'download', label: 'Downloads', action: () => { closeDrawer(); dispatch('downloads'); } },
      { icon: 'history', label: 'Histórico', action: () => { closeDrawer(); dispatch('history'); } },
      { icon: 'settings', label: 'Definições', action: () => { closeDrawer(); dispatch('settings'); } },
    ]
  };

  $: menuItems = appMenu[activeApp] || appMenu.ai;

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

<div class="drawer-overlay" class:open on:click={closeDrawer}></div>

<div class="drawer" class:open class:light={!isDark} class:dark={isDark}>
  <div class="drawer-main">
    <div class="dh">
      <div class="dh-left">
        <div class="drawer-title" style="color:{c.textPrimary}">Menu</div>
      </div>
      <button class="pulse-tap icon-btn" style="color:{c.iconTint}" on:click={closeDrawer}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:{c.iconTint}"></span>
      </button>
    </div>

    <div class="menu-section">
      {#each menuItems as item}
        <button class="menu-item pulse-tap" style="color:{c.drawerText}" on:click={item.action}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:18px;height:18px;background:{c.iconTint}"></span>
          <span class="menu-label">{item.label}</span>
        </button>
      {/each}
    </div>

    {#if activeApp === 'ai'}
      <div class="section-block">
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
      </div>
    {/if}
  </div>
</div>

<style>
  .drawer-overlay {
    position:fixed; inset:0;
    background:rgba(0,0,0,0.08); z-index:100;
    opacity:0; pointer-events:none;
    backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px);
    transition:opacity .28s ease, backdrop-filter .28s ease;
  }
  .drawer-overlay.open { opacity:1; pointer-events:auto; backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }

  .drawer {
    position:fixed; top:0; left:0; bottom:0;
    width:84vw; max-width:420px; z-index:101;
    transform:translateX(-100%);
    transition:transform .3s cubic-bezier(0.4,0,0.2,1);
    overflow:hidden;
    border-right:1px solid transparent;
  }
  .drawer.open { transform:translateX(0); }
  .drawer.light { background:#F8FAFD; border-right-color:#E7EBF2; }
  .drawer.dark  { background:#0E131C; border-right-color:#243043; }

  .drawer-main { height:100%; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
  .dh { display:flex; align-items:center; justify-content:space-between; padding:18px 14px 12px 22px; flex-shrink:0; }
  .dh-left { display:flex; align-items:center; gap:10px; min-width:0; }
  .drawer-title { font-size:24px; font-weight:900; letter-spacing:-0.04em; }
  .icon-btn { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:none; border:none; cursor:pointer; }

  .menu-section { padding:0 12px 6px; display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
  .menu-item {
    width:100%;
    display:flex;
    align-items:center;
    gap:14px;
    padding:12px 14px;
    border-radius:16px;
    border:none;
    cursor:pointer;
    font-size:14.5px;
    font-weight:600;
    background:transparent;
    text-align:left;
  }
  .menu-item:hover, .menu-item:active { background:rgba(127,127,127,0.08); }
  .menu-label { flex:1; }

  .section-block { padding-top:4px; display:flex; flex-direction:column; min-height:0; flex:1; }
  .conv-header { display:flex; align-items:center; gap:9px; padding:10px 24px 8px; cursor:pointer; flex-shrink:0; }
  .conv-label { font-size:11px; font-weight:700; letter-spacing:.08em; flex:1; }
  .conv-chevron { transition:transform .25s cubic-bezier(0.4,0,0.2,1); transform:rotate(90deg); }
  .conv-chevron.collapsed { transform:rotate(0deg); }

  .conv-list-outer { display:grid; grid-template-rows:1fr; transition:grid-template-rows .32s cubic-bezier(0.4,0,0.2,1); min-height:0; flex:1; }
  .conv-list-outer.collapsed { grid-template-rows:0fr; }
  .conv-list { overflow-y:auto; overflow-x:hidden; min-height:0; -webkit-overflow-scrolling:touch; }

  .conv-item { padding:11px 24px; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background .15s; -webkit-user-select:none; user-select:none; border:none; background:transparent; width:100%; text-align:left; }
  .conv-item:active { background:rgba(127,127,127,0.06); }
  .pin-icon { width:11px; height:11px; flex-shrink:0; }
  .conv-title { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }

  .conv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:10px; opacity:.45; font-size:13px; text-align:center; }

  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>
