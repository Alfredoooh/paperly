<!-- src/home/components/AIChatModal.svelte -->
<!-- Modal em tela cheia que nasce por container-transform a partir da
     posição/tamanho exatos do botão FAB da bottombar, crescendo até
     cobrir o ecrã inteiro. Fecho: só pelo botão X, que reverte a
     mesma animação (encolhe de volta na direção do FAB). Sem drag,
     sem sheet, sem handle — decisão explícita do pedido. -->
<script>
  import AiApp from '../../ai/App.svelte';
  
  export let open = false; // montado no DOM
  export let pushed = false; // deve estar na posição aberta (fonte: App.svelte)
  export let origin = null; // DOMRect do botão FAB, medido pelo pai antes de abrir
  export let onClose = () => {};
  
  function handleClose() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    onClose();
  }
  
  // Container transform: calcula scale/translate para ir da posição
  // exata do FAB (origin) até cobrir 100% do ecrã. Quando pushed=false
  // (fechado), o transform volta a ser o do FAB — mesmo cálculo,
  // reverso automático porque é function-of-state, não de keyframes.
  $: vw = typeof window !== 'undefined' ? window.innerWidth : 360;
  $: vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  $: fabCenterX = origin ? origin.left + origin.width / 2 : vw / 2;
  $: fabCenterY = origin ? origin.top + origin.height / 2 : vh;
  $: fabW = origin ? origin.width : 44;
  $: fabH = origin ? origin.height : 40;
  
  // Fator de escala do FAB até cobrir a tela inteira
  $: scaleClosedX = fabW / vw;
  $: scaleClosedY = fabH / vh;
  
  // Deslocamento necessário para que o centro do container (que ocupa
  // 100vw x 100vh, ancorado em top:0/left:0) coincida com o centro do
  // FAB quando encolhido.
  $: translateClosedX = fabCenterX - vw / 2;
  $: translateClosedY = fabCenterY - vh / 2;
  
  $: scaleX = pushed ? 1 : scaleClosedX;
  $: scaleY = pushed ? 1 : scaleClosedY;
  $: translateX = pushed ? 0 : translateClosedX;
  $: translateY = pushed ? 0 : translateClosedY;
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
    style="transform: translate3d({translateX}px, {translateY}px, 0) scale({scaleX}, {scaleY});"
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
    background: #000;
    pointer-events: none;
    transition: opacity .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: opacity;
  }

  /* Container ancorado top:0/left:0 cobrindo 100% do viewport — o
     "encolhimento" até o FAB é feito via transform (scale+translate),
     nunca mudando width/height reais, para manter a transição suave
     numa única propriedade composta pelo navegador. */
  .ai-container {
    position: fixed;
    inset: 0;
    z-index: 91;
    width: 100vw;
    height: 100dvh;
    background: var(--app-bg);
    transform-origin: top left;
    will-change: transform;
    overflow: hidden;
    contain: layout style paint;
    transition: transform .42s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .ai-inner {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    transition: opacity .28s ease;
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