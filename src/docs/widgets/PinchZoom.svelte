<!-- src/home/widgets/PinchZoom.svelte -->
<script>
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  // Widget reutilizável: aplica pinch-to-zoom + pan de dois dedos a
  // um conteúdo filho, sem qualquer UI própria (sem botões, sem %).
  // O consumidor só liga <slot> e recebe 'zoomchange' com a escala atual.
  export let minScale = 1;   // escala mínima relativa à base (1 = ajustado à tela)
  export let maxScale = 4;   // escala máxima relativa à base
  export let scale = 1;      // escala atual (bindable)

  const dispatch = createEventDispatcher();

  let containerEl;
  let panX = 0;
  let panY = 0;

  let pointers = new Map();
  let startDist = 0;
  let startScale = 1;
  let startPanX = 0;
  let startPanY = 0;
  let startMidX = 0;
  let startMidY = 0;
  let isPinching = false;

  // Pan de um dedo só (quando já está em zoom > base, para navegar a folha ampliada)
  let singleStartX = 0;
  let singleStartY = 0;
  let singlePanStartX = 0;
  let singlePanStartY = 0;
  let isSinglePanning = false;

  // ══════════════════════════════════════════════════════════════════
  //  touch-action DINÂMICO — este era o bug real do "não desliza
  //  verticalmente": o CSS tinha touch-action:none FIXO no
  //  .pinch-root, o que diz ao browser "nunca trates nenhum toque
  //  aqui, eu (JS) controlo tudo" — independentemente de estar ou não
  //  a fazer pinch/pan naquele momento. Isso bloqueava o scroll
  //  nativo do .canvas-scroll (que é o pai) mesmo com 1 dedo parado,
  //  sem gesto nenhum em curso.
  //
  //  Correção: quando scale está na base (sem zoom aplicado), o touch
  //  action passa a ser "pan-y" — o browser fica livre para rolar
  //  verticalmente com 1 dedo, exatamente como antes de existir este
  //  widget. Só quando já se está ampliado (scale > minScale) é que
  //  voltamos a "none", porque aí sim precisamos de capturar nós
  //  mesmos o pan de 1 dedo dentro da folha ampliada.
  // ══════════════════════════════════════════════════════════════════
  $: touchActionValue = scale > minScale + 0.01 ? 'none' : 'pan-y';

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function clampScale(s) {
    return Math.min(maxScale, Math.max(minScale, s));
  }

  function clampPan() {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    // Permite pan livre mas evita perder o conteúdo totalmente fora de vista
    const maxOffsetX = rect.width * 0.5 * (scale - 1) + rect.width * 0.15;
    const maxOffsetY = rect.height * 0.5 * (scale - 1) + rect.height * 0.15;
    panX = Math.min(maxOffsetX, Math.max(-maxOffsetX, panX));
    panY = Math.min(maxOffsetY, Math.max(-maxOffsetY, panY));
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Com 1 dedo só e sem zoom ativo, não capturamos o ponteiro nem
    // interceptamos nada — deixamos o browser tratar o gesto como
    // scroll nativo (é isso que touch-action:pan-y já garante, mas
    // reforçamos aqui não fazendo setPointerCapture/preventDefault
    // neste caso, para não competir de forma nenhuma com o scroll).
    if (pointers.size === 0 && scale <= minScale + 0.01) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    containerEl?.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      isSinglePanning = false;
      const [a, b] = [...pointers.values()];
      startDist = dist(a, b);
      startScale = scale;
      const m = mid(a, b);
      startMidX = m.x;
      startMidY = m.y;
      startPanX = panX;
      startPanY = panY;
      isPinching = true;
    } else if (pointers.size === 1 && scale > minScale + 0.01) {
      isPinching = false;
      isSinglePanning = true;
      const p = [...pointers.values()][0];
      singleStartX = p.x;
      singleStartY = p.y;
      singlePanStartX = panX;
      singlePanStartY = panY;
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (isPinching && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const newDist = dist(a, b);
      if (startDist > 0) {
        const rawScale = startScale * (newDist / startDist);
        scale = clampScale(rawScale);
      }
      const m = mid(a, b);
      panX = startPanX + (m.x - startMidX);
      panY = startPanY + (m.y - startMidY);
      clampPan();
      dispatch('zoomchange', { scale });
      e.preventDefault();
    } else if (isSinglePanning && pointers.size === 1) {
      const p = [...pointers.values()][0];
      panX = singlePanStartX + (p.x - singleStartX);
      panY = singlePanStartY + (p.y - singleStartY);
      clampPan();
      e.preventDefault();
    }
    // Se nem isPinching nem isSinglePanning estiverem ativos (caso do
    // dedo único sem zoom), não chamamos preventDefault nenhum — o
    // scroll nativo do pai continua a acontecer livremente.
  }

  function settleToBaseIfClose() {
    // Se o utilizador soltar muito perto da escala base, "respira" de
    // volta suavemente para 1 — não é um snap forçado, é só o
    // comportamento natural de quem tentou voltar ao tamanho normal.
    if (Math.abs(scale - minScale) < 0.06) {
      scale = minScale;
      panX = 0;
      panY = 0;
      dispatch('zoomchange', { scale });
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
    if (pointers.size === 0) {
      isSinglePanning = false;
      settleToBaseIfClose();
    }
  }

  function onDblClick() {
    // Duplo toque: alterna entre a base (1) e 2x, tal como Preview/Fotos no iOS.
    if (scale > minScale + 0.01) {
      scale = minScale;
      panX = 0;
      panY = 0;
    } else {
      scale = clampScale(2);
    }
    dispatch('zoomchange', { scale });
  }

  onDestroy(() => {
    pointers.clear();
  });
</script>

<div
  class="pinch-root"
  bind:this={containerEl}
  style="touch-action: {touchActionValue};"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:dblclick={onDblClick}
>
  <div
    class="pinch-content"
    class:pinch-transition={!isPinching && !isSinglePanning}
    style="transform: translate3d({panX}px, {panY}px, 0) scale({scale});"
  >
    <slot />
  </div>
</div>

<script>
  import { onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let minScale = 1;
  export let maxScale = 4;
  export let scale = 1;

  const dispatch = createEventDispatcher();

  let containerEl;
  let panX = 0;
  let panY = 0;

  let pointers = new Map();
  let startDist = 0;
  let startScale = 1;
  let startPanX = 0;
  let startPanY = 0;
  let startMidX = 0;
  let startMidY = 0;
  let isPinching = false;

  let singleStartX = 0;
  let singleStartY = 0;
  let singlePanStartX = 0;
  let singlePanStartY = 0;
  let isSinglePanning = false;

  $: touchActionValue = scale > minScale + 0.01 ? 'none' : 'pan-y';

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function clampScale(s) {
    return Math.min(maxScale, Math.max(minScale, s));
  }

  function clampPan() {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const maxOffsetX = rect.width * 0.5 * (scale - 1) + rect.width * 0.15;
    const maxOffsetY = rect.height * 0.5 * (scale - 1) + rect.height * 0.15;
    panX = Math.min(maxOffsetX, Math.max(-maxOffsetX, panX));
    panY = Math.min(maxOffsetY, Math.max(-maxOffsetY, panY));
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (pointers.size === 0 && scale <= minScale + 0.01) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    containerEl?.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      isSinglePanning = false;
      const [a, b] = [...pointers.values()];
      startDist = dist(a, b);
      startScale = scale;
      const m = mid(a, b);
      startMidX = m.x;
      startMidY = m.y;
      startPanX = panX;
      startPanY = panY;
      isPinching = true;
    } else if (pointers.size === 1 && scale > minScale + 0.01) {
      isPinching = false;
      isSinglePanning = true;
      const p = [...pointers.values()][0];
      singleStartX = p.x;
      singleStartY = p.y;
      singlePanStartX = panX;
      singlePanStartY = panY;
    }
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (isPinching && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const newDist = dist(a, b);
      if (startDist > 0) {
        const rawScale = startScale * (newDist / startDist);
        scale = clampScale(rawScale);
      }
      const m = mid(a, b);
      panX = startPanX + (m.x - startMidX);
      panY = startPanY + (m.y - startMidY);
      clampPan();
      dispatch('zoomchange', { scale });
      e.preventDefault();
    } else if (isSinglePanning && pointers.size === 1) {
      const p = [...pointers.values()][0];
      panX = singlePanStartX + (p.x - singleStartX);
      panY = singlePanStartY + (p.y - singleStartY);
      clampPan();
      e.preventDefault();
    }
  }

  function settleToBaseIfClose() {
    if (Math.abs(scale - minScale) < 0.06) {
      scale = minScale;
      panX = 0;
      panY = 0;
      dispatch('zoomchange', { scale });
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
    if (pointers.size === 0) {
      isSinglePanning = false;
      settleToBaseIfClose();
    }
  }

  function onDblClick(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  onDestroy(() => {
    pointers.clear();
  });
</script>

<div
  class="pinch-root"
  bind:this={containerEl}
  style="touch-action: {touchActionValue};"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerUp}
  on:dblclick={onDblClick}
>
  <div
    class="pinch-content"
    class:pinch-transition={!isPinching && !isSinglePanning}
    style="transform: translate3d({panX}px, {panY}px, 0) scale({scale});"
  >
    <slot />
  </div>
</div>

<style>
  .pinch-root {
    width: 100%;
    height: 100%;
    overflow: visible;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .pinch-content {
    transform-origin: top center;
    will-change: transform;
  }

  .pinch-content.pinch-transition {
    transition: transform .22s cubic-bezier(0.22, 1, 0.36, 1);
  }
</style>