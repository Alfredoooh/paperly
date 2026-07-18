<!-- src/home/components/BottomTabBar.svelte -->
<script>
  import { TABS } from '../lib/constants.js';
  
  export let activeTab = 'create';
  export let onSelect = () => {};
  
  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }
  
  function select(tab) {
    buzz();
    if (tab.id === activeTab) return;
    onSelect(tab.id);
  }
</script>

<nav class="tab-bar">
  {#each TABS as tab}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      on:click={() => select(tab)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon">
        <span
          class="icon-mask icon-outline"
          style="mask-image:url('{tab.icon}');-webkit-mask-image:url('{tab.icon}')"
        ></span>
        <span
          class="icon-mask icon-filled"
          style="mask-image:url('{tab.iconFilled}');-webkit-mask-image:url('{tab.iconFilled}')"
        ></span>
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    display: flex;
    align-items: stretch;
    justify-content: space-around;

    background: rgb(var(--header-glass-rgb));
    background-clip: padding-box;

    border-top: none;
    box-shadow: none;

    padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px);
    contain: layout paint style;
    touch-action: pan-y;

    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* Camada extra opaca atrás da nav, cobrindo qualquer overscroll/
     rubber-band do WebView, pra nunca revelar o conteúdo por trás. */
  .tab-bar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -40px;
    height: 40px;
    background: rgb(var(--header-glass-rgb));
    z-index: -1;
  }

  .tab-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 42px;
    border: none;
    background: transparent;
    color: var(--icon-faint);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
  }

  .tab-btn.active { color: var(--icon-strong); }

  .tab-icon {
    position: relative;
    width: 19px;
    height: 19px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .18s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .tab-btn:active .tab-icon {
    transform: scale(0.88);
  }

  .icon-mask {
    position: absolute;
    inset: 0;
    display: block;
    background: currentColor;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: opacity .18s ease;
  }

  .icon-outline {
    opacity: 1;
  }
  .icon-filled {
    opacity: 0;
  }
  .tab-btn.active .icon-outline {
    opacity: 0;
  }
  .tab-btn.active .icon-filled {
    opacity: 1;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    opacity: 0.7;
    transition: opacity .18s ease, font-weight .18s ease;
  }
  .tab-btn.active .tab-label {
    opacity: 1;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-mask, .tab-label, .tab-icon { transition: none !important; }
  }
</style>