<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let c;
  export let boardW = 512;
  export let boardH = 512;
  export let background = { type: 'color', color: '#FFFFFF', image: null, opacity: 1 };
  export let elements = [];
  export let selectedId = null;

  const dispatch = createEventDispatcher();

  let containerEl;
  let stageWrapEl;
  let fitScale = 1;
  let pinchScale = 1;
  let panX = 0;
  let panY = 0;

  function computeFit() {
    if (!containerEl) return;
    const margin = 28;
    const availW = containerEl.clientWidth - margin * 2;
    const availH = containerEl.clientHeight - margin * 2;
    const s = Math.min(availW / boardW, availH / boardH);
    fitScale = s > 0 && isFinite(s) ? Math.max(0.02, Math.min(s, 3)) : 1;
    pinchScale = 1;
    panX = 0; panY = 0;
  }
  $: if (containerEl && (boardW || boardH)) { computeFit(); }

  $: totalScale = fitScale * pinchScale;

  // ══════════════════════════════════════════════════════════════════
  //  PINÇA DE 2 DEDOS + PAN — a prancheta tem SEMPRE boardW×boardH em
  //  px reais; isto só ajusta a exibição, nunca o tamanho de facto.
  // ══════════════════════════════════════════════════════════════════
  let pointers = new Map();
  let pinchStartDist = 0, pinchStartScale = 1;
  let pinchStartPanX = 0, pinchStartPanY = 0, pinchStartMidX = 0, pinchStartMidY = 0;
  let isPinching = false;

  function ptXY(e) { return { x: e.clientX, y: e.clientY }; }
  function distPts(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function midPts(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function onStagePointerDown(e) {
    if (e.target.closest('.el')) return;
    pointers.set(e.pointerId, ptXY(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDist = distPts(a, b);
      pinchStartScale = pinchScale;
      const m = midPts(a, b);
      pinchStartMidX = m.x; pinchStartMidY = m.y;
      pinchStartPanX = panX; pinchStartPanY = panY;
      isPinching = true;
      dispatch('select', null);
    }
  }
  function onStagePointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, ptXY(e));
    if (isPinching && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const nd = distPts(a, b);
      if (pinchStartDist > 0) pinchScale = Math.min(4, Math.max(1, pinchStartScale * (nd / pinchStartDist)));
      const m = midPts(a, b);
      panX = pinchStartPanX + (m.x - pinchStartMidX);
      panY = pinchStartPanY + (m.y - pinchStartMidY);
      e.preventDefault();
    }
  }
  function onStagePointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
    if (pointers.size === 0 && pinchScale < 1.04) { pinchScale = 1; panX = 0; panY = 0; }
  }
  function onStageDblClick(e) {
    if (e.target.closest('.el')) return;
    if (pinchScale > 1.04) { pinchScale = 1; panX = 0; panY = 0; }
    else { pinchScale = 2; }
  }

  function selectElement(id) { dispatch('select', id); }
  function deselectAll() { dispatch('select', null); }

  function updateElements(newList, opts = {}) {
    dispatch('elementschange', { elements: newList, immediate: opts.immediate });
  }
  function patchElement(id, patch, opts = {}) {
    const next = elements.map(e => e.id === id ? { ...e, ...patch } : e);
    updateElements(next, opts);
  }

  // ══════════════════════════════════════════════════════════════════
  //  TEXTO — auto-grow real: sem height fixo no CSS do contenteditable;
  //  ao editar, sincronizamos el.h a partir do scrollHeight verdadeiro.
  // ══════════════════════════════════════════════════════════════════
  let editingTextId = null;

  function startEditText(el) {
    if (el.type !== 'text') return;
    editingTextId = el.id;
    selectElement(el.id);
    tick().then(() => {
      const node = document.getElementById('text-edit-' + el.id);
      if (node) {
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }

  function syncTextHeight(id) {
    const node = document.getElementById('text-edit-' + id);
    if (!node) return;
    const measured = Math.max(24, node.scrollHeight);
    const el = elements.find(x => x.id === id);
    if (el && Math.abs(el.h - measured) > 0.5) {
      patchElement(id, { h: measured });
    }
  }
  function onTextInput(e, id) {
    syncTextHeight(id);
  }
  function stopEditText(e, id) {
    const text = e.target.innerText || '';
    syncTextHeight(id);
    patchElement(id, { text }, { immediate: true });
    editingTextId = null;
  }

  // ══════════════════════════════════════════════════════════════════
  //  GESTOS — move / resize (8 handles: 4 cantos proporcionais + 4
  //  laterais livres numa direção) / rotate / crop de imagem.
  // ══════════════════════════════════════════════════════════════════
  let gesture = null;
  let guideV = null; // linha de guia vertical (x em px da prancheta) ou null
  let guideH = null;
  const SNAP_THRESHOLD = 6; // px na prancheta

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function startMove(e, el) {
    e.stopPropagation(); e.preventDefault();
    if (editingTextId === el.id) return;
    selectElement(el.id);
    const p = pointerXY(e);
    gesture = { mode: 'move', id: el.id, startX: p.x, startY: p.y, startObjX: el.x, startObjY: el.y };
  }
  function startResize(e, el, handle) {
    e.stopPropagation(); e.preventDefault();
    const p = pointerXY(e);
    gesture = {
      mode: 'resize', id: el.id, handle, startX: p.x, startY: p.y,
      startW: el.w, startH: el.h, startObjX: el.x, startObjY: el.y,
      aspectRatio: el.w / el.h,
    };
  }
  function startRotate(e, el) {
    e.stopPropagation(); e.preventDefault();
    const stageRect = stageWrapEl.getBoundingClientRect();
    const centerX = stageRect.left + (el.x + el.w / 2) * totalScale;
    const centerY = stageRect.top + (el.y + el.h / 2) * totalScale;
    const p = pointerXY(e);
    const startAngle = Math.atan2(p.y - centerY, p.x - centerX) * (180 / Math.PI);
    gesture = { mode: 'rotate', id: el.id, centerX, centerY, startAngle, startDeg: el.deg };
  }
  function startCropMove(e, el) {
    e.stopPropagation(); e.preventDefault();
    const p = pointerXY(e);
    gesture = { mode: 'crop', id: el.id, startX: p.x, startY: p.y, startCropX: el.cropX, startCropY: el.cropY };
  }

  function computeGuides(movingEl, newX, newY) {
    const cx = newX + movingEl.w / 2;
    const cy = newY + movingEl.h / 2;
    const boardCx = boardW / 2, boardCy = boardH / 2;
    let snapX = null, snapY = null;
    guideV = null; guideH = null;

    if (Math.abs(cx - boardCx) < SNAP_THRESHOLD) { snapX = boardCx - movingEl.w / 2; guideV = boardCx; }
    if (Math.abs(cy - boardCy) < SNAP_THRESHOLD) { snapY = boardCy - movingEl.h / 2; guideH = boardCy; }

    if (snapX === null || snapY === null) {
      for (const other of elements) {
        if (other.id === movingEl.id) continue;
        const ocx = other.x + other.w / 2;
        const ocy = other.y + other.h / 2;
        if (snapX === null && Math.abs(cx - ocx) < SNAP_THRESHOLD) { snapX = ocx - movingEl.w / 2; guideV = ocx; }
        if (snapY === null && Math.abs(cy - ocy) < SNAP_THRESHOLD) { snapY = ocy - movingEl.h / 2; guideH = ocy; }
      }
    }
    return { x: snapX !== null ? snapX : newX, y: snapY !== null ? snapY : newY };
  }

  function onGestureMove(e) {
    if (!gesture) return;
    const p = pointerXY(e);
    const el = elements.find(x => x.id === gesture.id);
    if (!el) return;

    if (gesture.mode === 'move') {
      const dx = (p.x - gesture.startX) / totalScale;
      const dy = (p.y - gesture.startY) / totalScale;
      const raw = { x: gesture.startObjX + dx, y: gesture.startObjY + dy };
      const snapped = computeGuides(el, raw.x, raw.y);
      patchElement(el.id, snapped);
    } else if (gesture.mode === 'resize') {
      const dx = (p.x - gesture.startX) / totalScale;
      const dy = (p.y - gesture.startY) / totalScale;
      const { startW, startH, startObjX, startObjY, handle, aspectRatio } = gesture;
      let newW = startW, newH = startH, newX = startObjX, newY = startObjY;
      const minSize = 16;
      const isCorner = handle.length === 2;
      const lockRatio = el.type === 'image' && isCorner;

      if (handle.includes('r')) newW = Math.max(minSize, startW + dx);
      if (handle.includes('l')) { newW = Math.max(minSize, startW - dx); newX = startObjX + (startW - newW); }
      if (handle.includes('b')) newH = Math.max(minSize, startH + dy);
      if (handle.includes('t')) { newH = Math.max(minSize, startH - dy); newY = startObjY + (startH - newH); }

      if (lockRatio) {
        if (handle.includes('r') || handle.includes('l')) newH = newW / aspectRatio;
        if (handle === 'tl' || handle === 'tr') newY = startObjY + (startH - newH);
      }
      patchElement(el.id, { w: newW, h: newH, x: newX, y: newY });
      guideV = null; guideH = null;
    } else if (gesture.mode === 'rotate') {
      const angleNow = Math.atan2(p.y - gesture.centerY, p.x - gesture.centerX) * (180 / Math.PI);
      patchElement(el.id, { deg: gesture.startDeg + (angleNow - gesture.startAngle) });
    } else if (gesture.mode === 'crop') {
      const dxPct = ((p.x - gesture.startX) / totalScale / el.w) * 100;
      const dyPct = ((p.y - gesture.startY) / totalScale / el.h) * 100;
      const maxX = 100 - el.cropW, maxY = 100 - el.cropH;
      patchElement(el.id, {
        cropX: Math.min(maxX, Math.max(0, gesture.startCropX - dxPct)),
        cropY: Math.min(maxY, Math.max(0, gesture.startCropY - dyPct)),
      });
    }
    e.preventDefault();
  }
  function onGestureEnd() {
    if (!gesture) return;
    const id = gesture.id;
    gesture = null;
    guideV = null; guideH = null;
    patchElement(id, {}, { immediate: true });
  }

  onMount(() => {
    computeFit();
    window.addEventListener('resize', computeFit);
    window.addEventListener('orientationchange', computeFit);
    window.addEventListener('mousemove', onGestureMove);
    window.addEventListener('mouseup', onGestureEnd);
    window.addEventListener('touchmove', onGestureMove, { passive: false });
    window.addEventListener('touchend', onGestureEnd);
  });
  onDestroy(() => {
    window.removeEventListener('resize', computeFit);
    window.removeEventListener('orientationchange', computeFit);
    window.removeEventListener('mousemove', onGestureMove);
    window.removeEventListener('mouseup', onGestureEnd);
    window.removeEventListener('touchmove', onGestureMove);
    window.removeEventListener('touchend', onGestureEnd);
  });

  $: bgStyle = background.type === 'image' && background.image
    ? `background-image:url('${background.image}'); background-size:cover; background-position:center;`
    : `background:${background.color || '#FFFFFF'};`;
</script>

<div
  class="canvas-area"
  style="background:{c.docCanvasBg}"
  bind:this={containerEl}
  on:pointerdown={onStagePointerDown}
  on:pointermove={onStagePointerMove}
  on:pointerup={onStagePointerUp}
  on:pointercancel={onStagePointerUp}
  on:dblclick={onStageDblClick}
>
  <div class="stage-center" style="transform: translate3d({panX}px, {panY}px, 0);">
    <div
      class="stage-wrap"
      bind:this={stageWrapEl}
      style="width:{boardW}px; height:{boardH}px; transform: scale({totalScale}); transform-origin: center center; {bgStyle} opacity:{background.opacity ?? 1};"
      on:pointerdown={(e) => { if (e.target === e.currentTarget) deselectAll(); }}
    >
      {#if guideV !== null}
        <div class="guide guide-v" style="left:{guideV}px;"></div>
      {/if}
      {#if guideH !== null}
        <div class="guide guide-h" style="top:{guideH}px;"></div>
      {/if}

      {#each elements as el (el.id)}
        <div
          class="el"
          class:el-selected={selectedId === el.id}
          style="left:{el.x}px; top:{el.y}px; width:{el.w}px; height:{el.h}px; transform: rotate({el.deg}deg); opacity:{el.opacity ?? 1}; mix-blend-mode:{el.blend || 'normal'};"
          on:pointerdown={(e) => startMove(e, el)}
        >
          {#if el.type === 'shape'}
            <div
              class="shape-fill"
              style="
                background:{el.fill === 'transparent' ? 'transparent' : el.fill};
                border-radius:{el.shape === 'circle_24_filled' ? '50%' : (el.radius || 0) + 'px'};
                border:{el.borderWidth || 0}px solid {el.border === 'transparent' ? 'transparent' : el.border};
                box-shadow:{el.shadow ? '0 8px 24px rgba(0,0,0,0.28)' : 'none'};
              "
            ></div>
          {:else if el.type === 'text'}
            {#if editingTextId === el.id}
              <div
                id={'text-edit-' + el.id}
                class="text-el text-editing"
                contenteditable="true"
                style="font-size:{el.fontSize}px; color:{el.color}; text-align:{el.align}; font-weight:{el.weight}; font-family:{el.fontFamily};"
                on:input={(e) => onTextInput(e, el.id)}
                on:blur={(e) => stopEditText(e, el.id)}
                on:pointerdown={(e) => e.stopPropagation()}
              >{el.text}</div>
            {:else}
              <div
                class="text-el"
                style="font-size:{el.fontSize}px; color:{el.color}; text-align:{el.align}; font-weight:{el.weight}; font-family:{el.fontFamily};"
                on:dblclick|stopPropagation={() => startEditText(el)}
              >{el.text}</div>
            {/if}
          {:else if el.type === 'image'}
            <div class="image-crop-window" style="border-radius:{el.radius || 0}px;" on:dblclick|stopPropagation={() => dispatch('requestcrop')}>
              <img
                src={el.src}
                alt=""
                draggable="false"
                style="
                  width:{10000 / el.cropW}%; height:{10000 / el.cropH}%;
                  left:{-el.cropX * (10000 / el.cropW) / 100}%; top:{-el.cropY * (10000 / el.cropH) / 100}%;
                "
              />
            </div>
          {/if}

          {#if selectedId === el.id && editingTextId !== el.id}
            <!-- 4 handles de canto — escala proporcional -->
            <div class="handle handle-corner handle-tl" on:pointerdown={(e) => startResize(e, el, 'tl')}></div>
            <div class="handle handle-corner handle-tr" on:pointerdown={(e) => startResize(e, el, 'tr')}></div>
            <div class="handle handle-corner handle-bl" on:pointerdown={(e) => startResize(e, el, 'bl')}></div>
            <div class="handle handle-corner handle-br" on:pointerdown={(e) => startResize(e, el, 'br')}></div>
            <!-- 4 handles de lado — escala livre nessa direção -->
            {#if el.type !== 'image'}
              <div class="handle handle-side handle-t" on:pointerdown={(e) => startResize(e, el, 't')}></div>
              <div class="handle handle-side handle-b" on:pointerdown={(e) => startResize(e, el, 'b')}></div>
              <div class="handle handle-side handle-l" on:pointerdown={(e) => startResize(e, el, 'l')}></div>
              <div class="handle handle-side handle-r" on:pointerdown={(e) => startResize(e, el, 'r')}></div>
            {/if}
            <div class="rotate-line"></div>
            <div class="handle handle-rotate" on:pointerdown={(e) => startRotate(e, el)}></div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .canvas-area { flex:1; min-height:0; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; touch-action:none; }
  .stage-center { display:flex; align-items:center; justify-content:center; }
  .stage-wrap {
    position:relative;
    box-shadow:0 1px 2px rgba(0,0,0,0.08), 0 16px 44px rgba(0,0,0,0.20);
    flex-shrink:0;
    overflow:hidden;
  }

  .guide { position:absolute; background:#FF3B87; z-index:50; pointer-events:none; }
  .guide-v { top:0; bottom:0; width:1px; }
  .guide-h { left:0; right:0; height:1px; }

  .el { position:absolute; touch-action:none; -webkit-user-select:none; user-select:none; cursor:grab; }
  .el:active { cursor:grabbing; }
  .el-selected { outline:1.5px solid #2F7BF6; outline-offset:2px; }

  .shape-fill { width:100%; height:100%; box-sizing:border-box; }

  /* FIX do bug de texto: sem height fixo aqui — a caixa cresce ao
     conteúdo naturalmente (contenteditable block-level sem height
     definido cresce em altura sozinho); o wrapper .el é que carrega
     o h calculado via scrollHeight, sincronizado em onTextInput. */
  .text-el { width:100%; min-height:100%; outline:none; overflow-wrap:break-word; white-space:pre-wrap; display:block; }
  .text-editing { cursor:text; box-shadow:0 0 0 1.5px #2F7BF6 inset; }

  .image-crop-window { position:relative; width:100%; height:100%; overflow:hidden; }
  .image-crop-window img { position:absolute; max-width:none; pointer-events:none; }

  .handle { position:absolute; background:#2F7BF6; touch-action:none; }
  .handle-corner { width:16px; height:16px; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.3); }
  .handle-tl { left:-8px; top:-8px; cursor:nwse-resize; }
  .handle-tr { right:-8px; top:-8px; cursor:nesw-resize; }
  .handle-bl { left:-8px; bottom:-8px; cursor:nesw-resize; }
  .handle-br { right:-8px; bottom:-8px; cursor:nwse-resize; }

  /* handles de lado em formato pílula, como no Canva */
  .handle-side { border:2px solid #fff; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.3); }
  .handle-t, .handle-b { left:50%; width:22px; height:10px; transform:translateX(-50%); }
  .handle-t { top:-6px; cursor:ns-resize; }
  .handle-b { bottom:-6px; cursor:ns-resize; }
  .handle-l, .handle-r { top:50%; width:10px; height:22px; transform:translateY(-50%); }
  .handle-l { left:-6px; cursor:ew-resize; }
  .handle-r { right:-6px; cursor:ew-resize; }

  .rotate-line { position:absolute; left:50%; top:-28px; width:1.5px; height:26px; background:#2F7BF6; transform:translateX(-50%); }
  .handle-rotate { width:16px; height:16px; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.3); left:50%; top:-36px; transform:translateX(-50%); cursor:grab; }
</style>