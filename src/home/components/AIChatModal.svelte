<!-- src/home/components/AIChatModal.svelte -->
<!-- Único "app" da plataforma que abre sempre como bottom-sheet modal
     por cima de tudo — nunca como navegação de rota. Fecho por: botão
     X, tap no overlay, arrastar a handle para baixo (com threshold/
     fling, mesmo padrão do AppDrawer), ou tecla Escape/gesto voltar
     do sistema (gerido pelo pai via popstate, igual a search/preview/
     drawer).

     CONTEÚDO: este componente NÃO inventa nenhum chat, mensagem, ou
     lógica de IA. O corpo é um <iframe> a apontar para a rota /ai/
     real da plataforma — o que quer que essa rota mostre é o que
     aparece aqui dentro, ponto final. Se /ai/ ainda não existir ou o
     embed for bloqueado, mostra-se um estado de erro explícito
     (nunca um placeholder a fingir ser a IA). -->
<script>
  import { createBackRecoilTransition } from '../lib/nav-transition.js';

  export let open = false;    // montado no DOM
  export let pushed = false;  // deve estar na posição aberta (fonte: App.svelte)
  export let onClose = () => {};

  const AI_ROUTE = '/ai/';
  const LOAD_TIMEOUT_MS = 8000;

  let iframeEl;
  let sheetEl;

  // 'loading' | 'loaded' | 'error'
  let status = 'loading';
  let loadTimeoutId;
  let iframeKey = 0; // força remount do <iframe> ao tentar de novo

  function startLoadWatch() {
    status = 'loading';
    clearTimeout(loadTimeoutId);
    loadTimeoutId = setTimeout(() => {
      if (status === 'loading') status = 'error';
    }, LOAD_TIMEOUT_MS);
  }

  function handleIframeLoad() {
    clearTimeout(loadTimeoutId);
    status = 'loaded';
  }

  function handleIframeError() {
    clearTimeout(loadTimeoutId);
    status = 'error';
  }

  function retryLoad() {
    iframeKey += 1; // recria o elemento <iframe> do zero
    startLoadWatch();
  }

  function openInNewTab() {
    window.open(AI_ROUTE, '_blank', 'noopener');
  }

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
    if (pushed) {
      sheet.recoil(); // reaproveita recoil() como "abrir" (target=1)
      startLoadWatch();
    } else {
      sheet.reset();  // reaproveita reset() como "fechar" (target=0)
    }
  }

  $: translateY = (1 - sheetProgress) * 100; // 100% = fora do ecrã por baixo
  $: overlayOpacity = 0.55 * sheetProgress;

  // ------------------------------------------------------------------
  // Arrastar a handle para fechar — mesmo padrão de threshold/fling
  // já usado no AppDrawer.svelte (onDrawerTouchStart/onDragMove/
  // onDragEnd), só que aqui o eixo é vertical e a folha usa sheet
  // (0..1) em vez de slide (0..100).
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
    clearTimeout(loadTimeoutId);
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

    <header class="ai-header">
      <div class="ai-header-title-wrap">
        <span class="ai-icon-mask" style="mask-image:url('/icons/svg/apps/ai.svg');-webkit-mask-image:url('/icons/svg/apps/ai.svg')"></span>
        <span class="ai-header-title">Nexa IA</span>
      </div>
      <button class="close-btn pulse-tap" on:click={handleClose} aria-label="Fechar">
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/dismiss.svg');-webkit-mask-image:url('/icons/svg/regular/dismiss.svg')"></span>
      </button>
    </header>

    <div class="ai-body">
      {#if status === 'error'}
        <div class="ai-error-state">
          <svg class="ai-error-illustration" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="20" y="18" width="80" height="56" rx="12" fill="var(--row-active, rgba(127,127,127,0.10))" />
            <rect x="20" y="18" width="80" height="56" rx="12" stroke="var(--drawer-sep, rgba(127,127,127,0.25))" stroke-width="1.5" />
            <path d="M52 40l16 16M68 40L52 56" stroke="var(--text-faint, #8E8E93)" stroke-width="3.4" stroke-linecap="round" />
          </svg>
          <p class="ai-error-title">Não foi possível carregar a IA</p>
          <p class="ai-error-text">A rota {AI_ROUTE} não respondeu a tempo, ou o carregamento embutido foi bloqueado.</p>
          <div class="ai-error-actions">
            <button class="ai-error-btn ai-error-btn-primary pulse-tap" on:click={retryLoad}>Tentar novamente</button>
            <button class="ai-error-btn pulse-tap" on:click={openInNewTab}>Abrir em separador novo</button>
          </div>
        </div>
      {/if}

      {#if status === 'loading'}
        <div class="ai-loading-state" aria-hidden="true">
          <div class="ai-loading-line ai-skeleton" style="width:60%"></div>
          <div class="ai-loading-line ai-skeleton" style="width:85%"></div>
          <div class="ai-loading-line ai-skeleton" style="width:40%"></div>
        </div>
      {/if}

      {#key iframeKey}
        <iframe
          bind:this={iframeEl}
          src={AI_ROUTE}
          title="Nexa IA"
          class="ai-iframe"
          class:ai-iframe-visible={status === 'loaded'}
          on:load={handleIframeLoad}
          on:error={handleIframeError}
          allow="microphone; clipboard-write"
        ></iframe>
      {/key}
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

  .ai-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 91;
    height: min(84dvh, 720px);
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -8px 32px rgba(0,0,0,0.28);
    will-change: transform;
    contain: layout style paint;
    overflow: hidden;
  }
  /* Sem transition no transform: o valor vem 100% do spring JS
     (sheetProgress), mesmo racional dos outros ecrãs full-screen do
     projeto — permite redirecionar a meio do gesto sem reflow. */

  .sheet-handle-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0 4px;
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;
  }
  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--border-soft);
  }

  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 16px 12px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border-faint);
  }
  .ai-header-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ai-icon-mask {
    width: 20px;
    height: 20px;
    background: var(--accent-primary, #0A84FF);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .ai-header-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
  }
  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .close-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .icon-mask {
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .close-btn .icon-mask {
    width: 15px;
    height: 15px;
  }

  .ai-body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Iframe da rota /ai/ real — é isto que ocupa o corpo do modal.
     Fica invisível (opacity:0) até status==='loaded' para não mostrar
     um flash de branco/about:blank enquanto a plataforma arranca lá
     dentro, mas continua no DOM e a carregar durante o loading. */
  .ai-iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
    opacity: 0;
    transition: opacity .22s ease;
  }
  .ai-iframe-visible {
    opacity: 1;
  }

  .ai-loading-state {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--app-bg);
  }
  .ai-skeleton {
    position: relative;
    overflow: hidden;
    height: 13px;
    border-radius: 7px;
    background: var(--row-active, rgba(127,127,127,0.12));
  }
  .ai-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, var(--drawer-text) 8%, transparent) 50%,
      transparent 100%
    );
    animation: skeleton-shimmer 1.3s ease-in-out infinite;
  }
  @keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .ai-error-state {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 28px;
    background: var(--app-bg);
  }
  .ai-error-illustration {
    width: 100px;
    height: 84px;
    margin-bottom: 14px;
  }
  .ai-error-title {
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 700;
    color: var(--drawer-text);
  }
  .ai-error-text {
    margin: 0 0 18px;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--text-faint);
    max-width: 280px;
  }
  .ai-error-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 220px;
  }
  .ai-error-btn {
    width: 100%;
    padding: 11px 16px;
    border-radius: 999px;
    border: 1px solid var(--drawer-sep, rgba(127,127,127,0.22));
    background: var(--btn-bg);
    color: var(--drawer-text);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .ai-error-btn-primary {
    border-color: transparent;
    background: var(--accent-primary, #0A84FF);
    color: #fff;
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .ai-sheet { transition: none !important; }
    .ai-skeleton::after { animation: none; }
  }
</style>