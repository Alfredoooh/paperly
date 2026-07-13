<script>
  import PinchZoom from '../widgets/PinchZoom.svelte';
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let initialContent = '';
  export let footnotes = [];

  const dispatch = createEventDispatcher();

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAGE_PAD_Y = 76;
  const PAGE_PAD_X = 64;
  const CONTENT_H = PAGE_H - PAGE_PAD_Y * 2;

  let containerEl;
  let fitScale = 1;
  let pinchScale = 1;

  function computeFitScale() {
    if (!containerEl) return;
    const availableWidth = containerEl.clientWidth - 32;
    fitScale = Math.min(1, availableWidth / PAGE_W);
    if (fitScale <= 0 || !isFinite(fitScale)) fitScale = 1;
  }

  let resizeObserver;

  // ══════════════════════════════════════════════════════════════════
  //  CORREÇÃO DEFINITIVA DO BUG "não escreve nada".
  //
  //  Causa real: o master (contenteditable) era movido via appendChild
  //  para dentro de nodes gerados por {#each pages as page (page.id)}.
  //  Sempre que repaginate() reatribuía `pages = fragments.map(...)`,
  //  o Svelte destruía/recriava os nodes do each — incluindo o
  //  .page-body onde o master tinha sido enfiado à força por JS. O
  //  Svelte não sabe que ali dentro há um elemento estranho, então ao
  //  recriar o node ele arranca o master do DOM sem eu saber. A partir
  //  da 1ª repaginação (que acontece quase imediatamente), o master
  //  fica órfão — continuas a escrever para um elemento fantasma que
  //  já não está no ecrã. Por isso "não mostra nada".
  //
  //  Solução: o master deixa de ser injetado dentro do {#each}. Passa
  //  a ser um elemento ÚNICO, PERMANENTE, fora do loop reativo,
  //  sobreposto por CSS (position:absolute) exatamente em cima da
  //  folha ativa. As folhas do {#each} nunca mais tocam no master —
  //  só mostram snapshots estáticos em innerHTML. O Svelte pode
  //  destruir/recriar as folhas à vontade sem nunca afetar o master.
  // ══════════════════════════════════════════════════════════════════

  let masterEl;
  let pages = [{ id: 0 }];
  let pageContents = [''];
  let activePageIndex = 0;
  let pageAEls = [];     // refs aos .page-a4 (para medir posição)
  let repaginateRaf = null;
  let isRepaginating = false;
  let masterReady = false;

  // Posição/tamanho do overlay do master, recalculada sempre que a
  // folha ativa muda ou a página é repaginada.
  let masterTop = 0;
  let masterLeft = 0;
  let masterWidth = PAGE_W - PAGE_PAD_X * 2;
  let masterHeight = CONTENT_H;

  function updateMasterOverlayPosition() {
    const activeEl = pageAEls[activePageIndex];
    if (!activeEl || !containerEl) return;
    // Posição relativa ao containerEl (que é o pai com position:relative implícito via scroll)
    masterTop = activeEl.offsetTop + PAGE_PAD_Y;
    masterLeft = activeEl.offsetLeft + PAGE_PAD_X;
    masterWidth = PAGE_W - PAGE_PAD_X * 2;
    masterHeight = CONTENT_H;
  }

  function measureOverflow(el) {
    return el.scrollHeight - CONTENT_H;
  }

  function pullOverflowingNodes(from, to) {
    let guard = 0;
    while (measureOverflow(from) > 0 && from.lastElementChild && guard < 2000) {
      guard++;
      const last = from.lastElementChild;
      to.insertBefore(last, to.firstChild);
    }
  }

  function ensureScratchPage() {
    let s = document.getElementById('__doc_scratch__');
    if (!s) {
      s = document.createElement('div');
      s.id = '__doc_scratch__';
      s.style.position = 'fixed';
      s.style.left = '-9999px';
      s.style.top = '0';
      s.style.width = (PAGE_W - PAGE_PAD_X * 2) + 'px';
      s.style.visibility = 'hidden';
      s.style.pointerEvents = 'none';
      document.body.appendChild(s);
    }
    return s;
  }

  async function repaginate() {
    if (!masterEl || isRepaginating || !masterReady) return;
    isRepaginating = true;

    const sel = window.getSelection();
    let caretWasInMaster = sel && sel.rangeCount && masterEl.contains(sel.anchorNode);

    // Junta o conteúdo do master (folha ativa) + snapshots estáticos
    // das outras folhas, na ordem certa, numa árvore de trabalho.
    const work = ensureScratchPage();
    work.innerHTML = '';
    const activeHtml = masterEl.innerHTML;
    for (let i = 0; i < pages.length; i++) {
      const html = i === activePageIndex ? activeHtml : (pageContents[i] || '');
      const temp = document.createElement('div');
      temp.innerHTML = html;
      while (temp.firstChild) work.appendChild(temp.firstChild);
    }
    if (!work.firstChild) {
      work.innerHTML = '<p><br></p>';
    }

    const fragments = [];
    let current = work;
    let safety = 0;
    const tempNodes = [];
    while (true) {
      safety++;
      if (safety > 200) break;
      const overflow = measureOverflow(current);
      if (overflow <= 0) {
        fragments.push(current.innerHTML);
        break;
      }
      const next = document.createElement('div');
      next.style.width = (PAGE_W - PAGE_PAD_X * 2) + 'px';
      next.style.position = 'fixed';
      next.style.left = '-9999px';
      next.style.top = '0';
      next.style.visibility = 'hidden';
      document.body.appendChild(next);
      tempNodes.push(next);
      pullOverflowingNodes(current, next);
      fragments.push(current.innerHTML);
      current = next;
    }
    tempNodes.forEach(n => n.remove());

    if (fragments.length === 0) fragments.push('<p><br></p>');

    const prevActive = activePageIndex;
    pageContents = fragments;
    pages = fragments.map((_, i) => ({ id: i }));
    activePageIndex = Math.min(prevActive, pages.length - 1);

    await tick();

    // Repõe no master apenas o conteúdo da página que ficou ativa —
    // o master NUNCA sai do DOM, só o seu innerHTML e a sua posição
    // (via CSS) mudam.
    masterEl.innerHTML = pageContents[activePageIndex] || '<p><br></p>';
    updateMasterOverlayPosition();

    if (caretWasInMaster) {
      try {
        masterEl.focus();
        const range = document.createRange();
        range.selectNodeContents(masterEl);
        range.collapse(false);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);
      } catch (e) {}
    }

    isRepaginating = false;
  }

  function scheduleRepaginate() {
    if (repaginateRaf) cancelAnimationFrame(repaginateRaf);
    repaginateRaf = requestAnimationFrame(() => { repaginate(); });
  }

  async function activatePage(index) {
    if (index === activePageIndex) return;
    pageContents[activePageIndex] = masterEl.innerHTML;
    activePageIndex = index;
    await tick();
    masterEl.innerHTML = pageContents[activePageIndex] || '<p><br></p>';
    updateMasterOverlayPosition();
    masterEl.focus();
  }

  function handleInput() {
    dispatch('input');
    scheduleRepaginate();
  }
  function handleKeydown(e) {
    dispatch('keydown', e);
  }
  function handlePaste() {
    setTimeout(() => scheduleRepaginate(), 0);
  }

  export function getContent() {
    if (!masterEl) return '';
    pageContents[activePageIndex] = masterEl.innerHTML;
    return pageContents.join('<div class="page-break-marker"></div>');
  }

  export function setContent(html) {
    const parts = (html || '').split('<div class="page-break-marker"></div>');
    pageContents = parts.length ? parts : [''];
    pages = pageContents.map((_, i) => ({ id: i }));
    activePageIndex = 0;
    tick().then(() => {
      masterEl.innerHTML = pageContents[0] || '<p><br></p>';
      updateMasterOverlayPosition();
      scheduleRepaginate();
    });
  }

  export function focusEditor() {
    masterEl?.focus();
  }

  export function getPlainText() {
    return pages.map((_, i) => {
      if (i === activePageIndex) return masterEl?.innerText || '';
      const temp = document.createElement('div');
      temp.innerHTML = pageContents[i] || '';
      return temp.innerText;
    }).join('\n\n');
  }

  export function normalizeFontSizeMarkers(px) {
    if (!masterEl) return;
    const found = masterEl.querySelectorAll('font[size="7"]');
    found.forEach(f => {
      f.removeAttribute('size');
      f.style.fontSize = px + 'px';
    });
    scheduleRepaginate();
  }

  export function tagLinksWithHref(url) {
    if (!masterEl) return;
    const escaped = (window.CSS && CSS.escape) ? CSS.escape(url) : url.replace(/(["\\])/g, '\\$1');
    const anchors = masterEl.querySelectorAll('a[href="' + escaped + '"]');
    anchors.forEach(a => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }

  export function removeFootnoteRef(id) {
    const ref = masterEl?.querySelector(`sup[data-footnote-id="${id}"]`);
    if (ref) { ref.remove(); }
    scheduleRepaginate();
  }

  export function insertImageAtCursor(dataUrl) {
    focusEditor();
    const wrapperId = 'img_' + Date.now().toString(36);
    document.execCommand('insertHTML', false,
      `<span class="doc-img-wrap doc-img-inline" data-img-id="${wrapperId}" contenteditable="false">` +
        `<img src="${dataUrl}" style="width:220px;" draggable="false" />` +
        `<span class="doc-img-handle doc-img-handle-se"></span>` +
      `</span>&nbsp;`
    );
    scheduleRepaginate();
  }

  export function applyImageOptions(imgEl, opts) {
    if (!imgEl) return;
    const wrap = imgEl.closest('.doc-img-wrap');
    if (!wrap) return;
    imgEl.style.width = opts.width + 'px';
    wrap.classList.remove('doc-img-inline', 'doc-img-front', 'doc-img-behind', 'doc-img-topbottom', 'doc-img-square-left', 'doc-img-square-right');
    if (opts.wrap === 'front') wrap.classList.add('doc-img-front');
    else if (opts.wrap === 'behind') wrap.classList.add('doc-img-behind');
    else if (opts.wrap === 'topbottom') wrap.classList.add('doc-img-topbottom');
    else if (opts.wrap === 'square-left') wrap.classList.add('doc-img-square-left');
    else if (opts.wrap === 'square-right') wrap.classList.add('doc-img-square-right');
    else wrap.classList.add('doc-img-inline');
    scheduleRepaginate();
  }

  export function deleteImage(imgEl) {
    if (!imgEl) return;
    const wrap = imgEl.closest('.doc-img-wrap');
    wrap?.remove();
    scheduleRepaginate();
  }

  export function insertTable(rows, cols) {
    focusEditor();
    const tableId = 'tbl_' + Date.now().toString(36);
    let html = `<div class="doc-table-wrap" data-table-id="${tableId}">` +
      `<table class="doc-table" style="width:100%;">` +
      `<colgroup>${'<col style="width:' + (100 / cols).toFixed(3) + '%;">'.repeat(cols)}</colgroup><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        html += '<td contenteditable="true">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>' +
      `<span class="doc-table-handle doc-table-handle-se" contenteditable="false"></span>` +
      `</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    scheduleRepaginate();
  }

  let resizingEl = null;
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function onDocPointerDown(e) {
    const handle = e.target.closest('.doc-img-handle, .doc-table-handle');
    if (handle) {
      const wrap = handle.closest('.doc-img-wrap, .doc-table-wrap');
      if (!wrap) return;
      resizingEl = wrap.classList.contains('doc-table-wrap') ? wrap.querySelector('table') : wrap.querySelector('img');
      resizeStartX = (e.touches ? e.touches[0].clientX : e.clientX);
      resizeStartWidth = resizingEl.getBoundingClientRect().width;
      e.preventDefault();
      return;
    }
    const img = e.target.closest('.doc-img-wrap img');
    if (img) {
      dispatch('imagerequestedit', {
        el: img,
        state: {
          width: Math.round(img.getBoundingClientRect().width),
          wrap: currentWrapMode(img.closest('.doc-img-wrap')),
        },
      });
    }
  }
  function currentWrapMode(wrap) {
    if (!wrap) return 'inline';
    if (wrap.classList.contains('doc-img-front')) return 'front';
    if (wrap.classList.contains('doc-img-behind')) return 'behind';
    if (wrap.classList.contains('doc-img-topbottom')) return 'topbottom';
    if (wrap.classList.contains('doc-img-square-left')) return 'square-left';
    if (wrap.classList.contains('doc-img-square-right')) return 'square-right';
    return 'inline';
  }
  function onDocPointerMove(e) {
    if (!resizingEl) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const delta = (x - resizeStartX) / (fitScale * pinchScale || 1);
    const newWidth = Math.max(40, Math.round(resizeStartWidth + delta));
    resizingEl.style.width = newWidth + 'px';
    e.preventDefault();
  }
  function onDocPointerUp() {
    if (!resizingEl) return;
    resizingEl = null;
    scheduleRepaginate();
  }

  onMount(() => {
    computeFitScale();
    resizeObserver = new ResizeObserver(() => {
      computeFitScale();
      updateMasterOverlayPosition();
    });
    if (containerEl) resizeObserver.observe(containerEl);
    window.addEventListener('orientationchange', computeFitScale);

    masterEl.innerHTML = initialContent || '<p><br></p>';
    masterReady = true;

    tick().then(() => {
      updateMasterOverlayPosition();
      dispatch('ready', { html: getContent() });
      scheduleRepaginate();
    });

    window.addEventListener('mousemove', onDocPointerMove);
    window.addEventListener('mouseup', onDocPointerUp);
    window.addEventListener('touchmove', onDocPointerMove, { passive: false });
    window.addEventListener('touchend', onDocPointerUp);
  });
  onDestroy(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('orientationchange', computeFitScale);
    window.removeEventListener('mousemove', onDocPointerMove);
    window.removeEventListener('mouseup', onDocPointerUp);
    window.removeEventListener('touchmove', onDocPointerMove);
    window.removeEventListener('touchend', onDocPointerUp);
    if (repaginateRaf) cancelAnimationFrame(repaginateRaf);
    document.getElementById('__doc_scratch__')?.remove();
  });
</script>

<div class="canvas-scroll" bind:this={containerEl} on:pointerdown={onDocPointerDown}>
  <PinchZoom bind:scale={pinchScale} minScale={1} maxScale={4} on:zoomchange>
    <div class="pages-stack" style="transform: scale({fitScale}); transform-origin: top center;">
      {#each pages as page, i (page.id)}
        <div class="page-a4" bind:this={pageAEls[i]} style="width:{PAGE_W}px; height:{PAGE_H}px; padding:{PAGE_PAD_Y}px {PAGE_PAD_X}px;">
          <div class="page-body" on:click={() => i !== activePageIndex && activatePage(i)}>
            {#if i !== activePageIndex}
              {@html pageContents[i]}
            {/if}
          </div>
          <div class="page-number">{i + 1}</div>

          {#if i === pages.length - 1 && footnotes.length > 0}
            <div class="footnotes-block">
              <div class="footnotes-divider"></div>
              {#each footnotes as fn (fn.id)}
                <div class="footnote-line">
                  <span class="footnote-num">{fn.num}.</span>
                  <span class="footnote-text">{fn.text}</span>
                  <button class="footnote-remove" on:click={() => dispatch('removefootnote', fn.id)} aria-label="Remover nota">×</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </PinchZoom>

  <!-- MASTER: elemento único, permanente, NUNCA dentro do {#each}.
       O Svelte nunca destrói nem recria isto — só o innerHTML e a
       posição (masterTop/Left, via CSS) mudam. Sobreposto por cima da
       folha ativa com position:absolute. -->
  <div
    class="editor-master"
    contenteditable="true"
    bind:this={masterEl}
    on:input={handleInput}
    on:keydown={handleKeydown}
    on:paste={handlePaste}
    spellcheck="true"
    role="textbox"
    aria-multiline="true"
    aria-label="Conteúdo do documento"
    style="
      transform: scale({fitScale});
      transform-origin: top left;
      top: {masterTop}px;
      left: {masterLeft}px;
      width: {masterWidth}px;
      min-height: {masterHeight}px;
    "
  ></div>
</div>

<style>
  .canvas-scroll {
    position: relative;
    flex: 1;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px 0 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
    -webkit-overflow-scrolling: touch;
  }
  .pages-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
  }
  .page-a4 {
    background: #FFFFFF;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.16);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .page-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    font-size: 15px; line-height: 1.6; color: #1a1a1a;
    overflow-wrap: break-word;
  }
  .page-number {
    position: absolute; bottom: 14px; right: 0; left: 0;
    text-align: center; font-size: 10px; color: #9a9a9a; pointer-events: none;
  }

  /* Master sobreposto: posicionado em absolute relativo ao
     .canvas-scroll (que é position:relative), exatamente em cima da
     área de conteúdo da folha ativa. */
  .editor-master {
    position: absolute;
    outline: none;
    font-size: 15px; line-height: 1.6; color: #1a1a1a;
    overflow-wrap: break-word;
    z-index: 10;
    background: transparent;
  }

  :global(.doc-table.doc-table) { border-collapse: collapse; width: 100%; margin: 4px 0; }
  :global(.doc-table td) { border: 1px solid #d0d0d0; padding: 8px; min-width: 32px; height: 26px; vertical-align: top; }
  :global(.doc-table-wrap) { position: relative; display: block; margin: 8px 0; }
  :global(.doc-table-handle) {
    position: absolute; width: 14px; height: 14px; background: #2F7BF6; border: 2px solid #fff;
    border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); touch-action: none;
  }
  :global(.doc-table-handle-se) { right: -7px; bottom: -7px; cursor: nwse-resize; }

  :global(.doc-img-wrap) { position: relative; display: inline-block; line-height: 0; }
  :global(.doc-img-wrap img) { max-width: 100%; height: auto; border-radius: 4px; display: block; }
  :global(.doc-img-handle) {
    position: absolute; width: 14px; height: 14px; background: #2F7BF6; border: 2px solid #fff;
    border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); touch-action: none;
  }
  :global(.doc-img-handle-se) { right: -7px; bottom: -7px; cursor: nwse-resize; }

  :global(.doc-img-inline) { display: inline-block; vertical-align: middle; float: none; }
  :global(.doc-img-square-left) { float: left; margin: 4px 14px 8px 0; }
  :global(.doc-img-square-right) { float: right; margin: 4px 0 8px 14px; }
  :global(.doc-img-topbottom) { display: block; float: none; margin: 10px auto; clear: both; }
  :global(.doc-img-front) { position: relative; z-index: 5; float: none; }
  :global(.doc-img-behind) { position: relative; z-index: 0; opacity: 0.95; float: none; }

  :global(a) { color: #2F7BF6; text-decoration: underline; }
  :global(.footnote-ref) { color: #2F7BF6; cursor: default; }

  .footnotes-block { margin-top: 24px; flex-shrink: 0; }
  .footnotes-divider { width: 120px; height: 1px; background: #d0d0d0; margin-bottom: 10px; }
  .footnote-line { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #555; margin-bottom: 4px; }
  .footnote-num { font-weight: 700; flex-shrink: 0; }
  .footnote-text { flex: 1; line-height: 1.5; }
  .footnote-remove {
    border: none; background: transparent; color: #999; font-size: 14px; line-height: 1; cursor: pointer;
    padding: 0 2px; flex-shrink: 0; -webkit-tap-highlight-color: transparent;
  }
  .footnote-remove:active { color: #F0384A; }
</style>