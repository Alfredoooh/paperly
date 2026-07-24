<!-- src/home/components/AIChatModal.svelte -->
<!-- Único "app" da plataforma que abre sempre como bottom-sheet modal
     por cima de tudo — nunca como navegação de rota. Fecho por: botão
     X, tap no overlay, arrastar a handle para baixo (com threshold/
     fling, mesmo padrão do AppDrawer), ou tecla Escape/gesto voltar
     do sistema (gerido pelo pai via popstate, igual a search/preview/
     drawer). -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { createBackRecoilTransition } from '../lib/nav-transition.js';

  export let open = false;   // montado no DOM
  export let pushed = false; // deve estar na posição aberta (fonte: App.svelte)
  export let onClose = () => {};

  let messages = [
    { id: 1, role: 'ai', text: 'Olá! Sou a Nexa IA. Em que posso ajudar-te hoje?' },
  ];
  let draft = '';
  let bodyEl;
  let inputEl;

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
      setTimeout(() => inputEl?.focus(), 320);
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
  let sheetEl;

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

  function autoResize() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + 'px';
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    messages = [...messages, { id: Date.now(), role: 'user', text }];
    draft = '';
    requestAnimationFrame(() => {
      autoResize();
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    });
    // Placeholder de resposta — liga-se aqui ao backend real da Nexa IA.
    setTimeout(() => {
      messages = [...messages, { id: Date.now() + 1, role: 'ai', text: 'Entendido! (resposta de exemplo — por ligar ao backend)' }];
      requestAnimationFrame(() => {
        if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
      });
    }, 500);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

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

    <header class="ai-header">
      <div class="ai-header-title-wrap">
        <span class="ai-icon-mask" style="mask-image:url('/icons/svg/apps/ai.svg');-webkit-mask-image:url('/icons/svg/apps/ai.svg')"></span>
        <span class="ai-header-title">Nexa IA</span>
      </div>
      <button class="close-btn pulse-tap" on:click={handleClose} aria-label="Fechar">
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/dismiss.svg');-webkit-mask-image:url('/icons/svg/regular/dismiss.svg')"></span>
      </button>
    </header>

    <div class="ai-body" bind:this={bodyEl}>
      {#each messages as msg (msg.id)}
        <div class="msg-row" class:msg-row-user={msg.role === 'user'}>
          <div class="msg-bubble" class:msg-bubble-user={msg.role === 'user'}>
            {msg.text}
          </div>
        </div>
      {/each}
    </div>

    <div class="ai-composer">
      <textarea
        bind:this={inputEl}
        bind:value={draft}
        on:input={autoResize}
        on:keydown={handleKeydown}
        rows="1"
        placeholder="Escreve uma mensagem…"
        class="ai-input"
      ></textarea>
      <button
        class="send-btn pulse-tap"
        class:send-btn-active={draft.trim().length > 0}
        on:click={sendMessage}
        aria-label="Enviar"
      >
        <span class="icon-mask send-icon" style="mask-image:url('/icons/svg/regular/arrow_up.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_up.svg')"></span>
      </button>
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
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .msg-row {
    display: flex;
    justify-content: flex-start;
  }
  .msg-row-user {
    justify-content: flex-end;
  }
  .msg-bubble {
    max-width: 78%;
    padding: 10px 14px;
    border-radius: 18px 18px 18px 4px;
    background: var(--btn-bg);
    color: var(--drawer-text);
    font-size: 14.5px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .msg-bubble-user {
    border-radius: 18px 18px 4px 18px;
    background: var(--accent-primary, #0A84FF);
    color: #fff;
  }

  .ai-composer {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px);
    flex-shrink: 0;
    border-top: 1px solid var(--border-faint);
  }
  .ai-input {
    flex: 1;
    min-width: 0;
    max-height: 120px;
    border: none;
    background: var(--btn-bg);
    border-radius: 20px;
    padding: 10px 16px;
    font: inherit;
    font-size: 15px;
    color: var(--icon-strong);
    outline: none;
    resize: none;
    line-height: 1.35;
  }
  .ai-input::placeholder {
    color: var(--text-faint);
  }
  .send-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg-active);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    opacity: 0.5;
    pointer-events: none;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1), opacity .18s ease, transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .send-btn.send-btn-active {
    background: var(--accent-primary, #0A84FF);
    opacity: 1;
    pointer-events: auto;
  }
  .send-btn.send-btn-active:active {
    transform: scale(0.9);
  }
  .send-icon {
    width: 16px;
    height: 16px;
    background: var(--icon-strong);
  }
  .send-btn.send-btn-active .send-icon {
    background: #fff;
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .ai-sheet { transition: none !important; }
  }
</style>