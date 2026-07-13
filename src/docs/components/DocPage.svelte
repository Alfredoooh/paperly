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
  //  PAGINAÇÃO — CORRIGIDA. O bug anterior: o master ficava
  //  `display:none` sempre que não estava fisicamente dentro de um
  //  .page-body, e um contenteditable com display:none NÃO recebe
  //  foco nem input em nenhum browser — por isso "congelava" mesmo ao
  //  colar ou escrever, porque na primeira renderização o master podia
  //  estar temporariamente fora do DOM visível enquanto aguardava o
  //  tick() de mountMasterIntoActivePage().
  //  Agora: o master nasce SEMPRE dentro do primeiro .page-body, de
  //  forma síncrona, dentro do próprio onMount, sem esperar por tick.
  //  Nunca mais recebe display:none — quando é temporariamente
  //  desacoplado (durante repaginação), fica apenas fora do fluxo por
  //  frações de milissegundo antes de ser reanexado, nunca oculto.
  // ══════════════════════════════════════════════════════════════════

  let masterEl;
  let pages = [{ id: 0 }];
  let pageContents = [''];
  let activePageIndex = 0;
  let pageBodyEls = [];
  let repaginateRaf = null;
  let isRepaginating = false;
  let masterReady = false;

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

    // Guarda a posição do cursor (offset de texto dentro do master)
    // para tentar restaurar depois da repaginação, evitando "saltos".
    const sel = window.getSelection();
    let caretWasInMaster = sel && sel.rangeCount && masterEl.contains(sel.anchorNode);

    const work = ensureScratchPage();
    work.innerHTML = '';
    for (let i = 0; i < pages.length; i++) {
      const src = i === activePageIndex ? masterEl : pageBodyEls[i];
      if (src) {
        while (src.firstChild) work.appendChild(src.firstChild);
      }
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
      next.style.width = current.style.width || (PAGE_W - PAGE_PAD_X * 2) + 'px';
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
    pages = fragments.map((_, i) => ({ id: i }));
    pageContents = fragments;
    await tick();

    activePageIndex = Math.min(prevActive, pages.length - 1);
    await tick();
    mountMasterIntoActivePage();

    if (caretWasInMaster) {
      // Reposiciona o cursor no fim do conteúdo do master remontado —
      // preserva a digitação contínua sem perder o foco.
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

  function mountMasterIntoActivePage() {
    const target = pageBodyEls[activePageIndex];
    if (!target || !masterEl) return;
    if (masterEl.parentElement !== target) {
      masterEl.innerHTML = pageContents[activePageIndex] || '<p><br></p>';
      target.innerHTML = '';
      target.appendChild(masterEl);
    }
  }

  function activatePage(index) {
    if (index === activePageIndex) return;
    pageContents[activePageIndex] = masterEl.innerHTML;
    activePageIndex = index;
    mountMasterIntoActivePage();
    masterEl.focus();
  }

  function handleInput() {
    dispatch('input');
    scheduleRepaginate();
  }
  function handleKeydown(e) {
    dispatch('keydown', e);
  }
  function handlePaste(e) {
    // Deixa o browser colar normalmente (texto/HTML), só garante que
    // a repaginação corre logo a seguir — sem isto, colar conteúdo
    // grande podia ficar "invisível" até ao próximo evento input.
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
      mountMasterIntoActivePage();
      scheduleRepaginate();
    });
  }

  export function focusEditor() {
    masterEl?.focus();
  }

  export function getPlainText() {
    return pages.map((_, i) => (i === activePageIndex ? masterEl?.innerText : pageBodyEls[i]?.innerText) || '').join('\n\n');
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
    for (let i = 0; i < pages.length; i++) {
      const root = i === activePageIndex ? masterEl : pageBodyEls[i];
      const ref = root?.querySelector(`sup[data-footnote-id="${id}"]`);
      if (ref) { ref.remove(); break; }
    }
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
    resizeObserver = new ResizeObserver(() => computeFitScale());
    if (containerEl) resizeObserver.observe(containerEl);
    window.addEventListener('orientationchange', computeFitScale);

    // Montagem SÍNCRONA: o primeiro .page-body já existe no DOM (é
    // renderizado pelo {#each pages} inicial com pages=[{id:0}]), por
    // isso podemos anexar o master a ele imediatamente, sem esperar
    // tick(). Isto é o que elimina a janela de "congelamento".
    masterEl.innerHTML = initialContent || '<p><br></p>';
    const firstTarget = pageBodyEls[0];
    if (firstTarget && masterEl.parentElement !== firstTarget) {
      firstTarget.appendChild(masterEl);
    }
    masterReady = true;
    dispatch('ready', { html: getContent() });
    scheduleRepaginate();

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
        <div class="page-a4" style="width:{PAGE_W}px; height:{PAGE_H}px; padding:{PAGE_PAD_Y}px {PAGE_PAD_X}px;">
          <div
            class="page-body"
            bind:this={pageBodyEls[i]}
            on:click={() => i !== activePageIndex && activatePage(i)}
          >
            {#if i !== activePageIndex}
              {@html pageContents[i]}
            {:else if !masterReady}
              <!-- placeholder até o master ser montado no onMount -->
              <p><br></p>
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

  <!-- O master é criado aqui pelo Svelte na primeira renderização, e
       movido (appendChild) para dentro do .page-body ativo no onMount
       — nunca fica display:none, só temporariamente fora do fluxo
       (sem estar em lado nenhum do DOM) por microssegundos durante a
       reancoragem, o que não afeta contenteditable/foco. -->
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
  ></div>
</div>

<style>
  .canvas-scroll {
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
  }
  .page-body :global(.editor-master) {
    outline: none;
    font-size: 15px; line-height: 1.6; color: #1a1a1a;
    overflow-wrap: break-word;
    width: 100%; height: 100%;
  }
  .page-number {
    position: absolute; bottom: 14px; right: 0; left: 0;
    text-align: center; font-size: 10px; color: #9a9a9a; pointer-events: none;
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