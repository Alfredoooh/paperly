<!-- src/home/components/AIChatModal.svelte -->
<!-- Único "app" da plataforma que abre sempre como bottom-sheet modal
     por cima de tudo — nunca como navegação de rota. Fecho por: botão
     X, tap no overlay, arrastar a handle para baixo (com threshold/
     fling, mesmo padrão do AppDrawer), ou tecla Escape/gesto voltar
     do sistema (gerido pelo pai via popstate, igual a search/preview/
     drawer).

     CONTEÚDO: monta o AiApp REAL (../../ai/App.svelte) em modo
     embedded — é literalmente o mesmo ChatPage.svelte da plataforma,
     como componente Svelte em vez de rota de topo. Nada de iframe:
     um <iframe src="/ai/"> faria um pedido HTTP a um path que esta
     SPA de página única não serve como documento real (só existe
     como estado de pushState interpretado em JS) — daí o "not
     found". Nada de chat simulado: não há nenhuma lógica de
     mensagens escrita aqui, é tudo o AiApp a fazer o que já faz. -->
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

    <button class="close-btn pulse-tap" on:click={handleClose} aria-label="Fechar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/dismiss.svg');-webkit-mask-image:url('/icons/svg/regular/dismiss.svg')"></span>
    </button>

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

  /* Altura do sheet: MUITO maior que a versão anterior (que estava
     limitada a min(84dvh, 720px), o que era curto de mais para um
     chat completo com composer + histórico + sub-páginas de
     settings/widgets). Agora 92dvh — deixa só uma faixa fina no
     topo (8dvh) para se perceber visualmente que é um sheet por
     cima de outra coisa, e não uma nova tela de topo. Sem limite
     fixo em px: em ecrãs grandes (tablet/desktop), 92dvh continua
     proporcional em vez de ficar preso a um valor de telemóvel. */
  .ai-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 91;
    height: 92dvh;
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
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0 4px;
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;
    /* Fica por cima do AiApp real, mas só a faixa da handle
       intercepta toques — o resto do sheet é do AiApp. */
    height: 24px;
  }
  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--border-soft);
  }

  /* Botão de fechar: flutua no canto superior direito, por cima do
     conteúdo real do AiApp (que já tem o seu próprio header interno
     — não duplicamos um "Nexa IA" header aqui, o chat real já tem o
     seu próprio cabeçalho/menu). Fundo semi-opaco com blur para se
     manter legível seja qual for o conteúdo por baixo. */
  .close-btn {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 14px);
    right: 14px;
    z-index: 3;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(127,127,127,0.22);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .close-btn:active {
    background: rgba(127,127,127,0.34);
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

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .ai-sheet { transition: none !important; }
  }
</style>