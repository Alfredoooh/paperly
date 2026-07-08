<!-- src/routes/home/components/AppHeader.svelte -->
<script>
  import { NEXA_CHOICES } from '../lib/constants.js';

  export let mounted = false;
  export let topPanelEl;
  export let scrolled = 0;
  export let onOpenDrawer;
  export let onSelectChoice; // (choiceObj) => void — enviar mensagem já no app

  let choicesOpen = false;
  let choicesVisible = false;
  let choiceBtnEl;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function handleMenu() { buzz(); onOpenDrawer?.(); }

  function toggleChoices() {
    buzz();
    if (choicesOpen) {
      closeChoices();
    } else {
      choicesOpen = true;
      requestAnimationFrame(() => requestAnimationFrame(() => choicesVisible = true));
    }
  }
  function closeChoices() {
    choicesVisible = false;
    setTimeout(() => choicesOpen = false, 200);
  }
  function pickChoice(choice) {
    buzz();
    closeChoices();
    onSelectChoice?.(choice);
  }
  function handleOutside(e) {
    if (choicesOpen && choiceBtnEl && !choiceBtnEl.contains(e.target)) closeChoices();
  }
</script>

<svelte:window on:pointerdown={handleOutside} />

<div class="top-panel" class:in={mounted} bind:this={topPanelEl}>
  <header class="header">
    <div class="header-inner">
      <img src="/icons/png/logo.png" alt="Nexa" class="logo-mark" />
      <div class="flex1"></div>

      <div class="choice-anchor" bind:this={choiceBtnEl}>
        <button class="upgrade-btn pulse-tap" class:open={choicesOpen} on:click={toggleChoices}>
          <span class="icon-mask upgrade-icon" style="mask-image:url('/icons/svg/upgrade_plan.svg');-webkit-mask-image:url('/icons/svg/upgrade_plan.svg')"></span>
          <span>Escolha do Nexa</span>
        </button>

        {#if choicesOpen}
          <div class="choices-card" class:show={choicesVisible}>
            {#each NEXA_CHOICES as c (c.id)}
              <button class="choice-item pulse-tap" on:click={() => pickChoice(c)}>
                {c.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="flex1"></div>
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
    position:fixed;
    top:0; left:0; right:0;
    z-index:15;
    display:flex;
    flex-direction:column;
    background:rgba(var(--header-glass-rgb), 0.74);
    backdrop-filter:blur(20px) saturate(180%);
    -webkit-backdrop-filter:blur(20px) saturate(180%);
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
  .header-elevate {
    position:absolute;
    left:0; right:0; bottom:-1px;
    height:1px;
    background:var(--border-soft);
    box-shadow:0 8px 20px var(--drawer-shadow);
    pointer-events:none;
    transition:opacity .18s linear;
  }
  .header {
    display:flex;
    align-items:center;
    justify-content:center;
    padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-top,0px) + 4px);
  }
  .header-inner {
    display:flex;
    align-items:center;
    width:100%;
    max-width:640px;
    gap:10px;
  }
  .logo-mark {
    height:24px;
    width:auto;
    display:block;
    flex-shrink:0;
    transition:transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* Botão "Escolha do Nexa" — bordas quase retas, branco puro, sombra escura, bem centrado */
  .choice-anchor { position:relative; display:flex; justify-content:center; flex-shrink:0; }
  .upgrade-btn {
    display:flex; align-items:center; justify-content:center; gap:7px;
    height:36px;
    padding:0 16px;
    border:none;
    border-radius:6px;
    font:inherit;
    font-size:13px;
    font-weight:700;
    letter-spacing:0.1px;
    color:#111;
    background:#fff;
    box-shadow:0 2px 3px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.22);
    cursor:pointer;
    flex-shrink:0;
    white-space:nowrap;
    transition:transform .18s cubic-bezier(0.34,1.56,0.64,1), box-shadow .22s cubic-bezier(0.16,1,0.3,1);
  }
  .upgrade-btn:active, .upgrade-btn.open { transform:scale(0.97); box-shadow:0 1px 2px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.18); }
  .upgrade-icon { width:16px; height:16px; background:#111 !important; }

  /* Card de opções */
  .choices-card {
    position:absolute; top:calc(100% + 8px); left:50%;
    transform:translate(-50%, -6px) scale(0.96);
    width:250px;
    background:var(--surface);
    border:0.5px solid var(--border-soft);
    border-radius:14px;
    box-shadow:0 10px 32px rgba(0,0,0,0.28);
    padding:6px;
    display:flex; flex-direction:column; gap:2px;
    opacity:0;
    transition:opacity .18s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.16,1,0.3,1);
    z-index:30;
  }
  .choices-card.show { opacity:1; transform:translate(-50%, 0) scale(1); }
  .choice-item {
    text-align:left; border:none; background:transparent; cursor:pointer;
    font:inherit; font-size:13.5px; font-weight:600; color:var(--icon-strong);
    padding:10px 10px; border-radius:9px; line-height:1.35;
    transition:background .16s cubic-bezier(0.16,1,0.3,1);
  }
  .choice-item:active { background:var(--btn-bg-active); }
  @media (hover:hover) and (pointer:fine) {
    .choice-item:hover { background:var(--btn-bg); }
    .hdr-seg:hover { background:var(--btn-bg-active); }
    .logo-mark:hover { transform:scale(1.05); }
  }
  @media (prefers-reduced-motion: reduce) {
    .top-panel, .logo-mark, .upgrade-btn, .hdr-seg, .header-elevate, .choices-card {
      transition:none !important;
    }
    .logo-mark:hover { transform:none; }
  }

  /* Drawer — mesmo container circular do bb-btn do bottom bar */
  .header-right { display:flex; align-items:center; flex-shrink:0; }
  .hdr-seg {
    width:40px; height:40px; display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:0.5px solid var(--border-faint);
    background:var(--btn-bg); cursor:pointer;
    transition:background .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .hdr-seg:active { background:var(--btn-bg-active); transform:scale(0.86); }

  .flex1 { flex:1; }
  @media (min-width: 720px) {
    .top-panel { border-bottom-left-radius:0; border-bottom-right-radius:0; }
    .header-inner { max-width:760px; }
    .logo-mark { height:26px; }
  }
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