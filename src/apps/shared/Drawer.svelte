<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';

  export let isDark = false;
  export let user = null;
  export let open = false;
  export let menuItems = [];
  export let conversations = [];
  export let currentConvId = '';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);
  let conversationsCollapsed = false;

  // ── Avatar ──
  const AVATAR_COLORS = [
    '#FF3B30','#FF9500','#FFCC00','#34C759',
    '#00C7BE','#007AFF','#5856D6','#AF52DE',
    '#FF2D55','#A2845E'
  ];

  function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  $: userName    = user?.name || user?.displayName || user?.email || 'U';
  $: userEmail   = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: avatarColor = getAvatarColor(userName);

  function closeDrawer() { dispatch('close'); }

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
      down() { did = false; t = setTimeout(() => { did = true; longPressConv(conv); }, 500); },
      up()   { clearTimeout(t); },
      move() { clearTimeout(t); t = null; },
      click(e) { if (did) { e.stopImmediatePropagation(); did = false; } }
    };
  }
</script>

<div class="overlay" class:open on:click={closeDrawer}></div>

<div class="drawer" class:open class:dark={isDark}>

  <!-- Header -->
  <div class="header">
    <span class="header-title">Menu</span>
  </div>

  <!-- Scroll body -->
  <div class="body">

    <!-- Menu items -->
    {#if menuItems.length}
      <div class="section">
        {#each menuItems as item}
          <button
            type="button"
            class="row"
            class:danger={item.danger}
            on:click={() => triggerItem(item)}
          >
            {#if item.icon}
              <span
                class="icon-mask row-icon"
                style="
                  mask-image:url('/icons/svg/{item.icon}.svg');
                  -webkit-mask-image:url('/icons/svg/{item.icon}.svg');
                "
              ></span>
            {/if}
            <span class="row-label">{item.label}</span>
            {#if item.badge}
              <span class="row-badge">{item.badge}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Conversas -->
    {#if conversations.length}
      <div class="section-label">Conversas</div>

      <div class="section">
        <button type="button" class="row" on:click={toggleConvSection}>
          <span
            class="icon-mask row-icon"
            style="
              mask-image:url('/icons/svg/meassage.svg');
              -webkit-mask-image:url('/icons/svg/meassage.svg');
            "
          ></span>
          <span class="row-label">Histórico</span>
          <span
            class="icon-mask row-chevron"
            class:rotated={!conversationsCollapsed}
            style="
              mask-image:url('/icons/svg/chevron_right.svg');
              -webkit-mask-image:url('/icons/svg/chevron_right.svg');
            "
          ></span>
        </button>

        <div class="conv-outer" class:collapsed={conversationsCollapsed}>
          <div class="conv-inner">
            {#each conversations as conv}
              {@const lp = makeLongPress(conv)}
              {@const active = conv.id === currentConvId}
              <button
                type="button"
                class="row conv-row"
                class:active
                on:pointerdown={lp.down}
                on:pointerup={lp.up}
                on:pointermove={lp.move}
                on:click={(e) => { lp.click(e); openConv(conv); }}
              >
                {#if conv.pinned}
                  <span
                    class="icon-mask pin"
                    style="
                      mask-image:url('/icons/svg/pin_filled.svg');
                      -webkit-mask-image:url('/icons/svg/pin_filled.svg');
                    "
                  ></span>
                {/if}
                <span class="conv-title">{conv.title}</span>
              </button>
            {/each}

            {#if conversations.length === 0}
              <div class="empty">Ainda não há conversas</div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  </div>

  <!-- Avatar footer -->
  {#if user}
    <div class="user-footer" class:dark={isDark}>
      <div class="avatar" style="background:{avatarColor}">
        {userInitial}
      </div>
      <div class="user-info">
        <span class="user-name">{userName}</span>
        {#if userEmail && userEmail !== userName}
          <span class="user-email">{userEmail}</span>
        {/if}
      </div>
    </div>
  {/if}

</div>

<style>
  /* ── Overlay ── */
  .overlay {
    position: fixed; inset: 0;
    z-index: 100;
    opacity: 0; pointer-events: none;
    background: rgba(0,0,0,0.18);
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
    transition: opacity .28s ease, backdrop-filter .28s ease;
  }
  .overlay.open {
    opacity: 1; pointer-events: auto;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  /* ── Drawer ── */
  .drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 78vw; max-width: 320px;
    z-index: 101;
    display: flex; flex-direction: column;
    transform: translateX(-100%);
    transition: transform .3s cubic-bezier(0.4, 0, 0.2, 1);
    background: #ffffff;
    border-right: 0.5px solid rgba(0,0,0,0.09);
  }
  .drawer.dark {
    background: #111111;
    border-right-color: rgba(255,255,255,0.07);
  }
  .drawer.open { transform: translateX(0); }

  /* ── Header ── */
  .header {
    padding: 20px 20px 10px;
    flex-shrink: 0;
  }
  .header-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }
  .dark .header-title { color: #fff; }

  /* ── Scroll body ── */
  .body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 8px 0 16px;
    display: flex;
    flex-direction: column;
  }

  /* ── Section label ── */
  .section-label {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(60,60,67,0.5);
    padding: 20px 20px 6px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .dark .section-label { color: rgba(235,235,245,0.4); }

  /* ── Section ── */
  .section {
    display: flex;
    flex-direction: column;
    padding: 0 12px;
  }

  /* ── Row ── */
  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 13px 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    border-radius: 10px;
    -webkit-user-select: none;
    user-select: none;
    transition: background .12s ease;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  }
  .dark .row { color: #fff; }
  .row:active { background: rgba(0,0,0,0.05); }
  .dark .row:active { background: rgba(255,255,255,0.06); }
  .row.danger { color: #FF3B30; }

  /* ── Row icon ── */
  .row-icon {
    width: 18px; height: 18px;
    background: rgba(60,60,67,0.55);
    flex-shrink: 0;
  }
  .dark .row-icon { background: rgba(235,235,245,0.55); }
  .danger .row-icon { background: #FF3B30; }

  /* ── Row label ── */
  .row-label {
    flex: 1;
    font-size: 15px;
    font-weight: 400;
    min-width: 0;
  }

  /* ── Row badge ── */
  .row-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(0,0,0,0.07);
    color: rgba(60,60,67,0.7);
    flex-shrink: 0;
  }
  .dark .row-badge {
    background: rgba(255,255,255,0.1);
    color: rgba(235,235,245,0.6);
  }

  /* ── Chevron (só conversas) ── */
  .row-chevron {
    width: 13px; height: 13px;
    background: rgba(60,60,67,0.28);
    transition: transform .25s cubic-bezier(0.4,0,0.2,1);
    flex-shrink: 0;
  }
  .dark .row-chevron { background: rgba(235,235,245,0.28); }
  .row-chevron.rotated { transform: rotate(90deg); }

  /* ── Conversations collapse ── */
  .conv-outer {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows .3s cubic-bezier(0.4,0,0.2,1);
  }
  .conv-outer.collapsed { grid-template-rows: 0fr; }
  .conv-inner { overflow: hidden; min-height: 0; }

  /* ── Conversation row ── */
  .conv-row { padding: 11px 10px; }
  .conv-row.active { color: #007AFF; }

  .conv-title {
    flex: 1;
    font-size: 14.5px;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .pin {
    width: 11px; height: 11px;
    background: rgba(60,60,67,0.35);
    flex-shrink: 0;
  }
  .active .pin { background: #007AFF; }
  .dark .pin  { background: rgba(235,235,245,0.35); }

  /* ── Empty ── */
  .empty {
    padding: 16px 10px;
    font-size: 14px;
    color: rgba(60,60,67,0.35);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .dark .empty { color: rgba(235,235,245,0.3); }

  /* ── User footer ── */
  .user-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
    border-top: 0.5px solid rgba(0,0,0,0.07);
    background: #ffffff;
  }
  .user-footer.dark {
    border-top-color: rgba(255,255,255,0.07);
    background: #111111;
  }

  /* ── Avatar circular ── */
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: -0.5px;
  }

  /* ── User info ── */
  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .dark .user-name { color: #fff; }

  .user-email {
    font-size: 12px;
    font-weight: 400;
    color: rgba(60,60,67,0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .dark .user-email { color: rgba(235,235,245,0.4); }

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