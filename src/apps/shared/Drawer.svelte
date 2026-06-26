<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';

  export let isDark = false;
  export let user = null;
  export let open = false;
  export let title = 'Menu';
  export let subtitle = '';
  export let menuItems = [];
  export let conversations = [];
  export let currentConvId = '';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  let conversationsCollapsed = false;

  function closeDrawer() {
    dispatch('close');
  }

  function triggerItem(item) {
    if (!item || item.disabled) return;
    item.action?.();
    if (!item.keepOpen) closeDrawer();
  }

  function openConv(conv) {
    dispatch('openConv', { conv });
    closeDrawer();
  }

  function longPressConv(conv) {
    dispatch('convOptions', { conv });
  }

  function toggleConvSection() {
    conversationsCollapsed = !conversationsCollapsed;
  }

  function makeLongPress(conv) {
    let t = null;
    let did = false;
    return {
      down() {
        did = false;
        t = setTimeout(() => {
          did = true;
          longPressConv(conv);
        }, 500);
      },
      up() {
        clearTimeout(t);
      },
      move() {
        clearTimeout(t);
        t = null;
      },
      click(e) {
        if (did) {
          e.stopImmediatePropagation();
          did = false;
        }
      }
    };
  }
</script>

<div class="drawer-overlay" class:open on:click={closeDrawer}></div>

<div class="drawer" class:open class:light={!isDark} class:dark={isDark}>
  <div class="drawer-main">
    <div class="dh">
      <div class="dh-left">
        <div class="drawer-badge" style="background:{isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};color:{c.textPrimary}">
          {(title || 'M').slice(0, 1)}
        </div>
        <div class="head-copy">
          <div class="head-title" style="color:{c.textPrimary}">{title}</div>
          {#if subtitle}
            <div class="head-sub" style="color:{c.textSecondary}">{subtitle}</div>
          {/if}
        </div>
      </div>
    </div>

    {#if menuItems.length}
      <div class="menu-section">
        {#each menuItems as item, i}
          {#if i > 0}<div class="section-divider" style="background:{c.divider}"></div>{/if}
          <button
            type="button"
            class="menu-item pulse-tap"
            style="color:{item.danger ? '#EF4444' : c.drawerText}"
            on:click={() => triggerItem(item)}
          >
            {#if item.icon}
              <span
                class="icon-mask"
                style="mask-image:url('/icons/svg/{item.icon}.svg');-webkit-mask-image:url('/icons/svg/{item.icon}.svg');width:18px;height:18px;background:{item.danger ? '#EF4444' : c.iconTint}"
              ></span>
            {/if}
            <span class="menu-label">{item.label}</span>
            {#if item.badge}
              <span class="menu-badge">{item.badge}</span>
            {/if}
            {#if item.trailingIcon}
              <span
                class="icon-mask"
                style="mask-image:url('/icons/svg/{item.trailingIcon}.svg');-webkit-mask-image:url('/icons/svg/{item.trailingIcon}.svg');width:14px;height:14px;background:{c.iconTintSecondary}"
              ></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    {#if conversations.length}
      {#if menuItems.length}<div class="section-divider section-gap" style="background:{c.divider}"></div>{/if}

      <div class="conv-header pulse-tap" on:click={toggleConvSection}>
        <span
          class="icon-mask"
          style="mask-image:url('/icons/svg/meassage.svg');-webkit-mask-image:url('/icons/svg/meassage.svg');width:16px;height:16px;background:{c.settings_section_label}"
        ></span>
        <span class="conv-label" style="color:{c.settings_section_label}">CONVERSAS</span>
        <span
          class="icon-mask conv-chevron"
          class:collapsed={conversationsCollapsed}
          style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');width:11px;height:11px;background:{c.settings_section_label}"
        ></span>
      </div>

      <div class="conv-list-outer" class:collapsed={conversationsCollapsed}>
        <div class="conv-list">
          {#if conversations.length === 0}
            <div class="conv-empty" style="color:{c.textHint}">
              <span
                class="icon-mask"
                style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');width:28px;height:28px;background:{c.textHint}"
              ></span>
              <span>Ainda não há conversas</span>
            </div>
          {:else}
            {#each conversations as conv}
              {@const lp = makeLongPress(conv)}
              {@const isActive = conv.id === currentConvId}
              <button
                type="button"
                class="conv-item pulse-tap"
                style="background:{isActive ? (c.extrasCardActiveText + '12') : 'transparent'}"
                on:pointerdown={lp.down}
                on:pointerup={lp.up}
                on:pointermove={lp.move}
                on:click={(e) => { lp.click(e); openConv(conv); }}
              >
                {#if conv.pinned}
                  <span
                    class="icon-mask pin-icon"
                    style="mask-image:url('/icons/svg/pin_filled.svg');-webkit-mask-image:url('/icons/svg/pin_filled.svg');background:{isActive ? c.extrasCardActiveText : c.iconTintSecondary}"
                  ></span>
                {/if}
                <span class="conv-title" style="color:{isActive ? c.extrasCardActiveText : c.drawerText}">{conv.title}</span>
              </button>
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

  .drawer-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
  .dh { display:flex; align-items:center; justify-content:space-between; padding:20px 16px 12px 18px; flex-shrink:0; }
  .dh-left { display:flex; align-items:center; gap:12px; min-width:0; }
  .drawer-badge {
    width:38px; height:38px; border-radius:14px; display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:800; flex-shrink:0;
  }
  .head-copy { min-width:0; }
  .head-title { font-size:16px; font-weight:800; line-height:1.1; }
  .head-sub { font-size:12px; font-weight:500; margin-top:3px; }

  .menu-section { padding:4px 12px 8px; flex-shrink:0; }
  .menu-item {
    width:100%; display:flex; align-items:center; gap:14px;
    padding:12px; border-radius:12px; cursor:pointer; font-size:14.5px; font-weight:500;
    transition:background .15s, transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s cubic-bezier(0.4,0,.2,1);
    margin-bottom:2px; border:none; background:transparent; text-align:left;
  }
  .menu-item:hover, .menu-item:active { background:rgba(127,127,127,0.08); }
  .menu-label { flex:1; min-width:0; }
  .menu-badge {
    font-size:10px; font-weight:700; padding:3px 8px; border-radius:999px;
    background:rgba(127,127,127,0.12); color:inherit; flex-shrink:0;
  }
  .section-divider { height:1px; margin:4px 0; flex-shrink:0; }
  .section-gap { margin:8px 12px 0; }

  .conv-header { display:flex; align-items:center; gap:9px; padding:10px 24px 8px; cursor:pointer; flex-shrink:0; }
  .conv-label { font-size:11px; font-weight:600; letter-spacing:.08em; flex:1; }
  .conv-chevron { transition:transform .25s cubic-bezier(0.4,0,0.2,1); transform:rotate(90deg); }
  .conv-chevron.collapsed { transform:rotate(0deg); }

  .conv-list-outer { display:grid; grid-template-rows:1fr; transition:grid-template-rows .32s cubic-bezier(0.4,0,0.2,1); min-height:0; flex:1; }
  .conv-list-outer.collapsed { grid-template-rows:0fr; }
  .conv-list { overflow-y:auto; overflow-x:hidden; min-height:0; -webkit-overflow-scrolling:touch; }

  .conv-item {
    width:100%; padding:11px 24px; cursor:pointer; display:flex; align-items:center; gap:7px;
    transition:background .15s; -webkit-user-select:none; user-select:none;
    border:none; background:transparent; text-align:left;
  }
  .conv-item:active { background:rgba(127,127,127,0.06); }
  .pin-icon { width:11px; height:11px; flex-shrink:0; }
  .conv-title { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }

  .conv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:10px; opacity:.45; font-size:13px; text-align:center; }

  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>
