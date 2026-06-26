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

    <!-- Header -->
    <div class="dh">
      <span class="dh-title">Menu</span>
    </div>

    <!-- Menu Items -->
    {#if menuItems.length}
      <div class="apple-group" style="
        background:{isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
        border:1px solid {isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'};
      ">
        {#each menuItems as item, i}
          {#if i > 0}
            <div class="apple-separator" style="background:{isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}"></div>
          {/if}
          <button
            type="button"
            class="apple-row"
            style="color:{item.danger ? '#FF3B30' : (isDark ? '#fff' : '#000')}"
            on:click={() => triggerItem(item)}
          >
            {#if item.icon}
              <div class="apple-icon-wrap" style="background:{item.danger ? '#FF3B30' : (isDark ? '#636366' : '#8E8E93')}">
                <span
                  class="icon-mask"
                  style="
                    mask-image:url('/icons/svg/{item.icon}.svg');
                    -webkit-mask-image:url('/icons/svg/{item.icon}.svg');
                    width:14px; height:14px;
                    background:#fff;
                  "
                ></span>
              </div>
            {/if}
            <span class="apple-row-label">{item.label}</span>
            {#if item.badge}
              <span class="apple-badge" style="background:{isDark ? '#636366' : '#C7C7CC'};color:{isDark ? '#fff' : '#3C3C43'}">
                {item.badge}
              </span>
            {/if}
            {#if item.trailingIcon}
              <span
                class="icon-mask"
                style="
                  mask-image:url('/icons/svg/{item.trailingIcon}.svg');
                  -webkit-mask-image:url('/icons/svg/{item.trailingIcon}.svg');
                  width:13px; height:13px;
                  background:{isDark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)'};
                "
              ></span>
            {:else}
              <span
                class="icon-mask chevron-trail"
                style="
                  mask-image:url('/icons/svg/chevron_right.svg');
                  -webkit-mask-image:url('/icons/svg/chevron_right.svg');
                  width:13px; height:13px;
                  background:{isDark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)'};
                "
              ></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Conversations Section -->
    {#if conversations.length}
      <div class="conv-section-label" style="color:{isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)'}">
        Conversas
      </div>

      <div class="apple-group" style="
        background:{isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
        border:1px solid {isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'};
      ">
        <!-- Collapse toggle row -->
        <button
          type="button"
          class="apple-row conv-toggle"
          style="color:{isDark ? '#fff' : '#000'}"
          on:click={toggleConvSection}
        >
          <div class="apple-icon-wrap" style="background:{isDark ? '#3A3A3C' : '#8E8E93'}">
            <span
              class="icon-mask"
              style="
                mask-image:url('/icons/svg/meassage.svg');
                -webkit-mask-image:url('/icons/svg/meassage.svg');
                width:14px; height:14px;
                background:#fff;
              "
            ></span>
          </div>
          <span class="apple-row-label">Histórico</span>
          <span
            class="icon-mask conv-chevron"
            class:collapsed={conversationsCollapsed}
            style="
              mask-image:url('/icons/svg/chevron_right.svg');
              -webkit-mask-image:url('/icons/svg/chevron_right.svg');
              width:13px; height:13px;
              background:{isDark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)'};
            "
          ></span>
        </button>

        <!-- Conversation list -->
        <div class="conv-list-outer" class:collapsed={conversationsCollapsed}>
          <div class="conv-inner">
            {#each conversations as conv}
              {@const lp = makeLongPress(conv)}
              {@const isActive = conv.id === currentConvId}
              <div class="apple-separator" style="background:{isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}"></div>
              <button
                type="button"
                class="apple-row conv-row"
                style="
                  color:{isActive ? '#007AFF' : (isDark ? '#fff' : '#000')};
                  background:{isActive ? (isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.07)') : 'transparent'};
                "
                on:pointerdown={lp.down}
                on:pointerup={lp.up}
                on:pointermove={lp.move}
                on:click={(e) => { lp.click(e); openConv(conv); }}
              >
                {#if conv.pinned}
                  <span
                    class="icon-mask pin-icon"
                    style="
                      mask-image:url('/icons/svg/pin_filled.svg');
                      -webkit-mask-image:url('/icons/svg/pin_filled.svg');
                      width:11px; height:11px;
                      background:{isActive ? '#007AFF' : (isDark ? 'rgba(235,235,245,0.4)' : 'rgba(60,60,67,0.4)')}
                    "
                  ></span>
                {/if}
                <span class="conv-title-text">{conv.title}</span>
                {#if isActive}
                  <span
                    class="icon-mask"
                    style="
                      mask-image:url('/icons/svg/chevron_right.svg');
                      -webkit-mask-image:url('/icons/svg/chevron_right.svg');
                      width:13px; height:13px;
                      background:rgba(0,122,255,0.5);
                    "
                  ></span>
                {/if}
              </button>
            {/each}

            {#if conversations.length === 0}
              <div class="apple-separator" style="background:{isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}"></div>
              <div class="conv-empty" style="color:{isDark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)'}">
                Ainda não há conversas
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  /* ── Overlay ── */
  .drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.25);
    z-index: 100;
    opacity: 0; pointer-events: none;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
    transition: opacity .3s ease, backdrop-filter .3s ease;
  }
  .drawer-overlay.open {
    opacity: 1; pointer-events: auto;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* ── Drawer Shell ── */
  .drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 80vw; max-width: 340px;
    z-index: 101;
    transform: translateX(-100%);
    transition: transform .32s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .drawer.open { transform: translateX(0); }

  .drawer.light {
    background: rgba(242,242,247,0.92);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-right: 0.5px solid rgba(0,0,0,0.12);
  }
  .drawer.dark {
    background: rgba(18,18,18,0.88);
    backdrop-filter: saturate(180%) blur(24px);
    -webkit-backdrop-filter: saturate(180%) blur(24px);
    border-right: 0.5px solid rgba(255,255,255,0.08);
  }

  /* ── Main scroll area ── */
  .drawer-main {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 0 16px 32px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Header ── */
  .dh {
    padding: 52px 4px 22px;
    flex-shrink: 0;
  }
  .dh-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.4px;
    font-family: -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif;
  }
  .drawer.light .dh-title { color: #000; }
  .drawer.dark  .dh-title { color: #fff; }

  /* ── Apple grouped card ── */
  .apple-group {
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  /* ── Row ── */
  .apple-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    -webkit-user-select: none;
    user-select: none;
    transition: background .14s ease, opacity .1s ease;
    min-height: 48px;
  }
  .apple-row:active {
    background: rgba(127,127,127,0.12) !important;
    opacity: 0.85;
  }

  /* ── Icon wrap (rounded square like iOS) ── */
  .apple-icon-wrap {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── Row label ── */
  .apple-row-label {
    flex: 1;
    font-size: 15px;
    font-weight: 400;
    font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif;
    min-width: 0;
  }

  /* ── Badge ── */
  .apple-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  /* ── Separator ── */
  .apple-separator {
    height: 0.5px;
    margin-left: 56px;
  }

  /* ── Section label above group ── */
  .conv-section-label {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 18px 4px 6px;
    font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif;
  }

  /* ── Conversations collapse ── */
  .conv-chevron {
    transition: transform .25s cubic-bezier(0.4,0,0.2,1);
    transform: rotate(90deg);
  }
  .conv-chevron.collapsed { transform: rotate(0deg); }

  .conv-list-outer {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows .3s cubic-bezier(0.4,0,0.2,1);
  }
  .conv-list-outer.collapsed { grid-template-rows: 0fr; }
  .conv-inner { overflow: hidden; min-height: 0; }

  /* ── Conversation row ── */
  .conv-row { border-radius: 0; }
  .conv-title-text {
    flex: 1;
    font-size: 14.5px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif;
  }
  .pin-icon { flex-shrink: 0; }

  /* ── Empty state ── */
  .conv-empty {
    padding: 20px 14px;
    font-size: 14px;
    font-family: -apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif;
  }

  /* ── Icon mask utility ── */
  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>