<!-- src/home/components/AIChatModal.svelte -->
<script>
  import AiApp from '../../ai/App.svelte';
  
  export let open = false;
  export let pushed = false;
  export let origin = null;
  export let onClose = () => {};
  
  function handleClose() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    onClose();
  }
  
  $: vw = typeof window !== 'undefined' ? window.innerWidth : 360;
  $: vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  $: fabCenterX = origin ? origin.left + origin.width / 2 : vw / 2;
  $: fabCenterY = origin ? origin.top + origin.height / 2 : vh;
  $: fabW = origin ? origin.width : 44;
  $: fabH = origin ? origin.height : 40;
  
  $: scaleClosedX = fabW / vw;
  $: scaleClosedY = fabH / vh;
  
  $: scaleX = pushed ? 1 : scaleClosedX;
  $: scaleY = pushed ? 1 : scaleClosedY;
  
  $: originXPercent = (fabCenterX / vw) * 100;
  $: originYPercent = (fabCenterY / vh) * 100;
  
  $: contentOpacity = pushed ? 1 : 0;
  
  function handleAiNav(e) {
    const { to } = e.detail || {};
    if (to === 'home') handleClose();
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    style="opacity:{pushed ? 0.55 : 0}"
  ></div>
  <div
    class="ai-container"
    style="transform: scale({scaleX}, {scaleY}); transform-origin: {originXPercent}% {originYPercent}%;"
  >
    <div class="ai-inner" style="opacity:{contentOpacity};">
      <button class="close-btn" on:click={handleClose} aria-label="Fechar">
        <span class="close-icon"></span>
      </button>

      <div class="ai-body">
        {#if open}
          <AiApp embedded={true} pushed={true} on:nav={handleAiNav} />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0,0,0,0.45);
    pointer-events: none;
    transition: opacity .52s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity;
  }

  .ai-container {
    position: fixed;
    inset: 0;
    z-index: 91;
    width: 100vw;
    height: 100dvh;
    background: var(--app-bg);
    border-radius: 24px;
    will-change: transform;
    overflow: hidden;
    contain: layout style paint;
    transition: transform .62s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ai-inner {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    transition: opacity .34s ease;
  }

  .close-btn {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    right: 14px;
    z-index: 2;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .close-btn:active {
    transform: scale(0.9);
    background: var(--btn-bg-active);
  }
  .close-icon {
    position: relative;
    width: 16px;
    height: 16px;
    display: block;
  }
  .close-icon::before,
  .close-icon::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    width: 16px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 1px;
  }
  .close-icon::before { transform: translate(-50%, -50%) rotate(45deg); }
  .close-icon::after  { transform: translate(-50%, -50%) rotate(-45deg); }

  .ai-body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .ai-container, .modal-overlay, .ai-inner, .close-btn { transition: none !important; }
  }
</style>