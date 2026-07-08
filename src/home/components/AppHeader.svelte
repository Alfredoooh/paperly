<!-- src/routes/home/components/AppHeader.svelte -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;
  export let onUpgrade;
  export let onOpenDrawer;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function handleUpgrade() { buzz(); onUpgrade?.(); }
  function handleMenu() { buzz(); onOpenDrawer?.(); }
</script>

<div class="top-panel" class:in={mounted} bind:this={topPanelEl}>
  <header class="header">
    <div class="header-inner">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-mark" />

      <!-- Botão centralizado absolutamente -->
      <div class="header-center">
        <button class="upgrade-btn pulse-tap" on:click={handleUpgrade}>Atualizar</button>
      </div>

      <div class="header-right">
        <button class="hdr-seg pulse-tap" on:click={handleMenu}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:19px;height:19px;background:var(--icon-strong)"></span>
        </button>
      </div>
    </div>
  </header>
  <div class="header-elevate" style="opacity:{scrolled}"></div>
</div>

<style>
  .top-panel {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 15;
    display: flex;
    flex-direction: column;
    background: rgba(var(--header-glass-rgb), 0.74);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom-left-radius: 26px;
    border-bottom-right-radius: 26px;
    padding-bottom: 10px;
    opacity: 0;
    transform: translateY(-16px) translateZ(0);
    transition: opacity .5s cubic-bezier(0.16, 1, 0.3, 1), transform .5s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    contain: layout style paint;
  }
  .top-panel.in {
    opacity: 1;
    transform: translateY(0) translateZ(0);
    pointer-events: auto;
  }
  .header-elevate {
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 1px;
    background: var(--border-soft);
    box-shadow: 0 8px 20px var(--drawer-shadow);
    pointer-events: none;
    transition: opacity .18s linear;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(env(safe-area-inset-top, 0px) + 10px) 14px calc(env(safe-area-inset-top, 0px) + 4px);
  }
  .header-inner {
    position: relative;            /* âncora para o centro absoluto */
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 640px;
    gap: 10px;
  }
  .logo-mark {
    height: 24px;
    width: auto;
    display: block;
    flex-shrink: 0;
    transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Container central absoluto */
  .header-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;          /* garante clique mesmo sobre flex items */
  }

  /* Botão Atualizar — cores escuras/claras e curvatura reduzida */
  .upgrade-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 9px;           /* 10px → 9px (redução de 10%) */
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1px;

    /* Tema claro: fundo #2a2a2a, texto branco. Tema escuro: fundo #f5f5f5, texto #1a1a1a */
    background: light-dark(#2a2a2a, #f5f5f5);
    color: light-dark(#ffffff, #1a1a1a);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);

    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
    transition: background .22s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow .22s cubic-bezier(0.16, 1, 0.3, 1),
                transform .16s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity .16s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .upgrade-btn:active {
    background: light-dark(#1e1e1e, #e0e0e0);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  @media (hover: hover) and (pointer: fine) {
    .upgrade-btn:hover {
      background: light-dark(#3a3a3a, #ebebeb);
    }
    .hdr-seg:hover {
      background: var(--hdr-seg-active);
    }
    .logo-mark:hover {
      transform: scale(1.05);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-panel, .logo-mark, .upgrade-btn, .hdr-seg, .header-elevate {
      transition: none !important;
    }
    .logo-mark:hover {
      transform: none;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    height: 34px;
    border-radius: 17px;
    background: var(--hdr-seg-bg);
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .hdr-seg {
    width: 36px;
    height: 34px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hdr-seg:active {
    background: var(--hdr-seg-active);
  }

  /* removida a antiga .flex1 — não é mais necessária */

  @media (min-width: 720px) {
    .top-panel {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    .header-inner {
      max-width: 760px;
    }
    .logo-mark {
      height: 26px;
    }
  }

  .pulse-tap {
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity .16s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .pulse-tap:active {
    transform: scale(0.96);
    opacity: .80;
  }

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