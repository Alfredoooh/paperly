<!-- src/home/components/AIChatModal.svelte -->
<!-- Único "app" da plataforma que abre sempre como bottom-sheet modal
     por cima de tudo — nunca como navegação de rota. Fecho por: tap
     no overlay, ou arrastar a handle para baixo (com threshold/
     fling, mesmo padrão do AppDrawer) — SEM botão X: o pedido foi
     explícito para removê-lo, o fecho fica só nesses dois gestos
     (mais o gesto físico de voltar do sistema, gerido pelo pai via
     popstate, igual a search/preview/drawer).

     CONTEÚDO: monta o AiApp REAL (../../ai/App.svelte) em modo
     embedded — é literalmente o mesmo ChatPage.svelte da plataforma,
     como componente Svelte em vez de rota de topo. -->
<script>
  import { createBackRecoilTransition } from '../lib/nav-transition.js';
  import AiApp from '../../ai/App.svelte';

  export let open = false;    // montado no DOM
  export let pushed = false;  // deve estar na posição aberta (fonte: App.svelte)
  export let onClose = () => {};

  let sheetEl;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  // Reaproveita o MESMO motor de spring 0..1 já usado pelo pull-to-
  // refresh do TemplatesTab, aqui reinterpretado como progresso de
  // abertura da folha (0 = fechada/fora do ecrã, 1 = totalmente
  // aberta) — evita escrever um terceiro motor de física no projeto.
  const sheet = createBackRecoilTransition();
  let sheetProgress = 0;
  const unsubscribeSheet = sheet.subscribe((v) => { sheetProgress = Math.max(0, v); });

  let lastPushed = null;
  $: if (pushed !== lastPushed) {
    lastPushed = pushed;
    if (pushed) sheet.recoil();  // reaproveita recoil() como "abrir" (target=1)
    else sheet.reset();          // reaproveita reset() como "fechar" (target=0)
  }

  $: translateY = (1 - sheetProgress) * 100; // 100% = fora do ecrã por baixo
  $: overlayOpacity = 0.55 * sheetProgress;

  // Se o AiApp embutido disparar on:nav com to:'home' (ex: um botão
  // de fechar/voltar interno do próprio ChatPage/SettingsPage), o
  // significado correto AQUI é "fechar o modal" — nunca navegar rota
  // nenhuma, já que estamos em modo embedded e o router interno do
  // AiApp está isolado de propósito (ver shared/router.js).
  function handleAiNav(e) {
    const { to } = e.detail || {};
    if (to === 'home') handleClose();
  }

  // ------------------------------------------------------------------
  // Arrastar a handle para fechar — mesmo padrão de threshold/fling
  // já usado no AppDrawer.svelte.
  // ------------------------------------------------------------------
  const CLOSE_THRESHOLD = 0.3;
  const VELOCITY_FLING = 0.6;
  let dragging = false;
  let dragStartY = 0;
  let dragStartTime = 0;
  let dragCurrentY = 0;
  let sheetH = 400;

  function onHandleTouchStart(e) {
    dragging = true;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY = y;
    dragCurrentY = y;
    dragStartTime = performance.now();
    sheetH = sheetEl?.getBoundingClientRect().height || 400;
  }
  function onHandleDragMove(e) {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragCurrentY = y;
    const delta = Math.max(0, y - dragStartY); // só arrasta para baixo
    const progress = Math.max(0, 1 - delta / sheetH);
    sheet.setDragValue(progress);
    if (delta > 0) e.preventDefault?.();
  }
  function onHandleDragEnd() {
    if (!dragging) return;
    dragging = false;
    const elapsed = Math.max(1, performance.now() - dragStartTime);
    const delta = dragCurrentY - dragStartY;
    const velocity = Math.abs(delta) / elapsed;
    const closedFraction = Math.max(0, Math.min(1, delta / sheetH));
    const shouldClose = closedFraction > CLOSE_THRESHOLD || (delta > 0 && velocity > VELOCITY_FLING);
    if (shouldClose) {
      handleClose();
    } else {
      sheet.releaseDragTo();
    }
  }

  function handleClose() {
    buzz();
    onClose();
  }

  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubscribeSheet();
    sheet.destroy();
  });
</script>

{#if open}
  <div
    class="modal-overlay"
    style="opacity:{overlayOpacity}"
    on:click={handleClose}
  ></div>
  <div
    class="ai-sheet"
    bind:this={sheetEl}
    style="transform: translate3d(0, {translateY}%, 0);"
  >
    <div
      class="sheet-handle-zone"
      on:touchstart={onHandleTouchStart}
      on:touchmove|nonpassive={onHandleDragMove}
      on:touchend={onHandleDragEnd}
      on:touchcancel={onHandleDragEnd}
      on:mousedown={onHandleTouchStart}
      on:mousemove={onHandleDragMove}
      on:mouseup={onHandleDragEnd}
      on:mouseleave={onHandleDragEnd}
    >
      <span class="sheet-handle"></span>
    </div>

    <div class="ai-body">
      {#if open}
        <AiApp embedded={true} pushed={true} on:nav={handleAiNav} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: #000;
    will-change: opacity;
  }

  /* 100dvh — sobe até ao limite exato da altura visível do ecrã, sem
     faixa nenhuma acima. Cantos do topo deixam de ser arredondados
     (era 24px 24px 0 0): a 100dvh o topo da folha encosta na área da
     barra de status/notch, e um canto arredondado nesse ponto cortava
     visualmente o próprio conteúdo/handle contra esse limite físico. */
  .ai-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 91;
    height: 100dvh;
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    border-radius: 0;
    box-shadow: 0 -8px 32px rgba(0,0,0,0.28);
    will-change: transform;
    contain: layout style paint;
    overflow: hidden;
  }

  .sheet-handle-zone {
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(env(safe-area-inset-top, 0px) + 10px) 0 4px;
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;
    height: 24px;
  }
  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--border-soft);
  }

  .ai-body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .ai-sheet { transition: none !important; }
  }
</style>