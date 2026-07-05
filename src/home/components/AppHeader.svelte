<!-- src/routes/home/components/AppHeader.svelte -->
<script>
  export let mounted = false;
  export let topPanelEl;
  export let onUpgrade;
  export let onOpenDrawer;
</script>

<div class="top-panel" class:in={mounted} bind:this={topPanelEl}>
  <header class="header">
    <img src="/icons/png/logo.png" alt="Nexa" class="logo-mark" />
    <div class="flex1"></div>
    <button class="upgrade-link pulse-tap" on:click={onUpgrade}>Upgrade</button>
    <div class="flex1"></div>
    <div class="header-right">
      <button class="hdr-seg pulse-tap" on:click={onOpenDrawer}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:19px;height:19px;background:var(--icon-strong)"></span>
      </button>
    </div>
  </header>
</div>

<style>
  .top-panel {
    position:fixed;
    top:0; left:0; right:0;
    z-index:15;
    display:flex;
    flex-direction:column;
    background:var(--surface);
    border-bottom-left-radius:26px;
    border-bottom-right-radius:26px;
    padding-bottom:10px;
    opacity:0;
    transform:translateY(-16px) translateZ(0);
    transition:opacity .5s cubic-bezier(0.16,1,0.3,1), transform .5s cubic-bezier(0.16,1,0.3,1);
    pointer-events:none;
    contain: layout style paint;
  }
  .top-panel.in { opacity:1; transform:translateY(0) translateZ(0); pointer-events:auto; }
  .header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-top,0px) + 4px);
    gap:10px;
  }
  .logo-mark { height:19px; width:auto; display:block; flex-shrink:0; }
  .upgrade-link {
    background:none; border:none; font:inherit;
    font-size:13px; font-weight:700; color:var(--upgrade-text);
    text-decoration:underline; cursor:pointer; padding:8px 4px;
    flex-shrink:0; white-space:nowrap;
  }
  .header-right {
    display:flex; align-items:center; height:34px; border-radius:17px;
    background:var(--hdr-seg-bg); overflow:hidden; flex-shrink:0;
  }
  .hdr-seg {
    width:36px; height:34px; border:none; background:transparent;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    transition:background .22s cubic-bezier(0.16,1,0.3,1);
  }
  .hdr-seg:active { background:var(--hdr-seg-active); }
  .flex1 { flex:1; }
  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
  .icon-mask {
    display:block;
    mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center;
    flex-shrink:0;
  }
</style>