<script>
  import PinchZoom from '../widgets/PinchZoom.svelte';
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let initialContent = '';
  export let footnotes = [];
  export let activePageIndex = 0; // ainda existe (usado p/ saber onde inserir imagem/tabela)
  export let totalPages = 1; // NOVO: bindable, espelha folhas.length para o pai

  const dispatch = createEventDispatcher();

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAGE_PAD_Y = 96;
  const PAGE_PAD_X = 72;

  let containerEl;
  let stackEl;
  let fitScale = 1;
  let pinchScale = 1;

  function ajustarZoom() {
    if (!containerEl) return;
    const margem = 40;
    const escala = Math.min((containerEl.clientWidth - margem) / PAGE_W, 1);
    fitScale = escala > 0 && isFinite(escala) ? escala : 1;
  }

  let folhas = [{ id: 0 }];
  let contentEls = [];
  let nextFolhaId = 1;

  $: totalPages = folhas.length;

  function criarFolha() {
    const id = nextFolhaId++;
    folhas = [...folhas, { id }];
    return id;
  }

  function getConteudoEl(idx) {
    return contentEls[idx];
  }

  function normalizarFilhosSoltos(conteudo) {
    let noAtual = conteudo.firstChild;
    while (noAtual) {
      const proximo = noAtual.nextSibling;
      if (noAtual.nodeType === 3) {
        if (noAtual.textContent.trim() !== '') {
          const p = document.createElement('p');
          conteudo.insertBefore(p, noAtual);
          p.appendChild(noAtual);
        } else {
          conteudo.removeChild(noAtual);
        }
      }
      noAtual = proximo;
    }
    if (!conteudo.firstElementChild) {
      conteudo.innerHTML = '<p><br></p>';
    }
  }

  async function obterOuCriarProximaPagina(idxAtual) {
    if (idxAtual + 1 < folhas.length) {
      return idxAtual + 1;
    }
    criarFolha();
    await tick();
    return idxAtual + 1;
  }

  async function empurrarTransbordoDaPagina(idx) {
    let empurrouAlgo = false;
    let guarda = 0;
    let conteudo = getConteudoEl(idx);
    if (!conteudo) return false;

    while (conteudo.scrollHeight > conteudo.clientHeight + 1 && conteudo.children.length > 1 && guarda < 500) {
      const ultimoElemento = conteudo.lastElementChild;
      const proximoIdx = await obterOuCriarProximaPagina(idx);
      const proximaConteudo = getConteudoEl(proximoIdx);
      if (!proximaConteudo) break;

      if (proximaConteudo.firstChild) {
        proximaConteudo.insertBefore(ultimoElemento, proximaConteudo.firstChild);
      } else {
        proximaConteudo.appendChild(ultimoElemento);
      }

      empurrouAlgo = true;
      guarda++;
      conteudo = getConteudoEl(idx);
    }

    return empurrouAlgo;
  }

  function puxarConteudoDaProximaPagina(idx) {
    if (idx + 1 >= folhas.length) return false;
    const conteudo = getConteudoEl(idx);
    const proximaConteudo = getConteudoEl(idx + 1);
    if (!conteudo || !proximaConteudo || !proximaConteudo.firstElementChild) return false;

    let puxouAlgo = false;
    let guarda = 0;

    while (proximaConteudo.firstElementChild && guarda < 500) {
      const candidato = proximaConteudo.firstElementChild;

      conteudo.appendChild(candidato);
      const causaOverflow = conteudo.scrollHeight > conteudo.clientHeight + 1;

      if (causaOverflow) {
        if (proximaConteudo.firstChild) {
          proximaConteudo.insertBefore(candidato, proximaConteudo.firstChild);
        } else {
          proximaConteudo.appendChild(candidato);
        }
        break;
      } else {
        puxouAlgo = true;
      }

      guarda++;
    }

    return puxouAlgo;
  }

  async function removerPaginasVaziasNoFim() {
    for (let i = folhas.length - 1; i > 0; i--) {
      const conteudo = getConteudoEl(i);
      if (conteudo && conteudo.children.length === 0) {
        folhas = folhas.slice(0, i);
        contentEls = contentEls.slice(0, i);
        if (activePageIndex > i - 1) activePageIndex = Math.max(0, i - 1);
        await tick();
      } else {
        break;
      }
    }
  }

  function obterPosicaoSelecao() {
    const selecao = window.getSelection();
    if (selecao.rangeCount === 0) return null;
    const range = selecao.getRangeAt(0);
    return {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
    };
  }

  function restaurarSelecao(posicao) {
    if (!posicao) return;
    if (!document.contains(posicao.startContainer)) return;

    try {
      const range = document.createRange();
      range.setStart(posicao.startContainer, posicao.startOffset);
      range.setEnd(posicao.endContainer, posicao.endOffset);
      const selecao = window.getSelection();
      selecao.removeAllRanges();
      selecao.addRange(range);

      const elementoBase = posicao.startContainer.nodeType === 3
        ? posicao.startContainer.parentElement
        : posicao.startContainer;
      const conteudoPai = elementoBase.closest('.conteudo');
      if (conteudoPai) {
        debugLog('restaurarSelecao: vai chamar .focus()');
        try { conteudoPai.focus({ preventScroll: true }); }
        catch (e) { conteudoPai.focus(); }
      }
    } catch (erro) {}
  }

  let isRebalancing = false;

  async function reequilibrarDocumento() {
    if (isRebalancing) return;
    isRebalancing = true;
    debugLog('reequilibrarDocumento: INÍCIO');

    const posicaoSelecao = obterPosicaoSelecao();

    for (let i = 0; i < contentEls.length; i++) {
      const conteudo = getConteudoEl(i);
      if (conteudo) normalizarFilhosSoltos(conteudo);
    }

    let mudouEmpurrando = true;
    let guardaGeral = 0;
    while (mudouEmpurrando && guardaGeral < 100) {
      mudouEmpurrando = false;
      for (let i = 0; i < folhas.length; i++) {
        if (await empurrarTransbordoDaPagina(i)) mudouEmpurrando = true;
      }
      guardaGeral++;
    }

    let mudouPuxando = true;
    let guardaPuxar = 0;
    while (mudouPuxando && guardaPuxar < 100) {
      mudouPuxando = false;
      for (let i = 0; i < folhas.length - 1; i++) {
        if (puxarConteudoDaProximaPagina(i)) mudouPuxando = true;
      }
      guardaPuxar++;
    }

    await removerPaginasVaziasNoFim();
    restaurarSelecao(posicaoSelecao);

    debugLog('reequilibrarDocumento: FIM');
    isRebalancing = false;
  }

  let timeoutReequilibrio;
  function agendarReequilibrio() {
    clearTimeout(timeoutReequilibrio);
    debugLog('agendarReequilibrio: timeout (re)agendado a 150ms');
    timeoutReequilibrio = setTimeout(reequilibrarDocumento, 150);
  }

  function aoColar(evento) {
    evento.preventDefault();
    const htmlColado = evento.clipboardData.getData('text/html');
    const textoColado = evento.clipboardData.getData('text/plain');

    if (htmlColado) {
      document.execCommand('insertHTML', false, htmlColado);
    } else {
      const linhas = textoColado.split(/\n+/).filter((l) => l.trim() !== '');
      const htmlParagrafos = linhas.map((l) => '<p>' + l + '</p>').join('');
      document.execCommand('insertHTML', false, htmlParagrafos || '<p>' + textoColado + '</p>');
    }

    dispatch('input');
    agendarReequilibrio();
  }

  function handleInput(e) {
    debugLog(`input event: inputType=${e?.inputType || '?'} data=${JSON.stringify(e?.data || '')}`);
    dispatch('input');
    agendarReequilibrio();
  }
  function handleKeydown(e) {
    dispatch('keydown', e);
  }

  function travarScrollNoFoco() {
    if (!containerEl) return;
    const scrollTravado = containerEl.scrollTop;
    requestAnimationFrame(() => {
      if (containerEl && containerEl.scrollTop !== scrollTravado) {
        containerEl.scrollTop = scrollTravado;
      }
      requestAnimationFrame(() => {
        if (containerEl && containerEl.scrollTop !== scrollTravado) {
          containerEl.scrollTop = scrollTravado;
        }
      });
    });
  }

  function handleFocusPagina(i) {
    debugLog(`focus na página ${i}`);
    travarScrollNoFoco();
    if (activePageIndex !== i) activePageIndex = i;
    dispatch('pagefocus', i);
  }

  export function getContent() {
    return contentEls.map(el => el ? el.innerHTML : '').join('<div class="page-break-marker"></div>');
  }

  export async function setContent(html) {
    const parts = (html || '').split('<div class="page-break-marker"></div>');
    const htmls = parts.length ? parts : ['<p><br></p>'];
    folhas = htmls.map((_, i) => ({ id: i }));
    nextFolhaId = htmls.length;
    activePageIndex = 0;
    await tick();
    htmls.forEach((h, i) => {
      const el = getConteudoEl(i);
      if (el) el.innerHTML = h || '<p><br></p>';
    });
    await reequilibrarDocumento();
  }

  export function focusEditor() {
    const el = contentEls[activePageIndex];
    if (!el) return;
    try { el.focus({ preventScroll: true }); }
    catch (e) { el.focus(); }
  }

  export function blurEditor() {
    const active = document.activeElement;
    if (active && active.classList && active.classList.contains('conteudo')) {
      active.blur();
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
  }

  export function getPlainText() {
    return contentEls.map(el => el ? el.innerText : '').join('\n\n');
  }

  export async function normalizeFontSizeMarkers(px) {
    for (const el of contentEls) {
      if (!el) continue;
      const found = el.querySelectorAll('font[size="7"]');
      found.forEach(f => {
        f.removeAttribute('size');
        f.style.fontSize = px + 'px';
      });
    }
    await reequilibrarDocumento();
  }

  export function tagLinksWithHref(url) {
    const escaped = (window.CSS && CSS.escape) ? CSS.escape(url) : url.replace(/(["\\])/g, '\\$1');
    for (const el of contentEls) {
      if (!el) continue;
      const anchors = el.querySelectorAll('a[href="' + escaped + '"]');
      anchors.forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      });
    }
  }

  export async function removeFootnoteRef(id) {
    for (const el of contentEls) {
      if (!el) continue;
      const ref = el.querySelector(`sup[data-footnote-id="${id}"]`);
      if (ref) { ref.remove(); break; }
    }
    await reequilibrarDocumento();
  }

  function getActiveContentEl() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const node = sel.anchorNode;
      const base = node && node.nodeType === 3 ? node.parentElement : node;
      const conteudoPai = base && base.closest ? base.closest('.conteudo') : null;
      if (conteudoPai) return conteudoPai;
    }
    return contentEls[activePageIndex] || null;
  }

  export function insertImageAtCursor(dataUrl) {
    const el = getActiveContentEl();
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    document.execCommand('insertImage', false, dataUrl);
    dispatch('input');
    agendarReequilibrio();
  }

  export function insertTable(rows, cols) {
    const el = getActiveContentEl();
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }

    let tableHtml = '<div class="doc-table-wrap"><table class="doc-table doc-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        tableHtml += '<td><br></td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table></div><p><br></p>';

    document.execCommand('insertHTML', false, tableHtml);
    dispatch('input');
    agendarReequilibrio();
  }

  let floatingObjects = {};
  let selectedFloatId = null;
  let nextFloatId = 1;

  export function getFloatingObjectsForPage(pageIndex) {
    return floatingObjects[pageIndex] || [];
  }

  function onPageBackgroundTap(pageIndex) {}

  export function deselectFloat() {
    selectedFloatId = null;
  }

  export function selectFloatById(pageIndex, objId) {
    selectedFloatId = `${pageIndex}:${objId}`;
  }

  export function deleteImage({ pageIndex, objId }) {
    const list = floatingObjects[pageIndex] || [];
    floatingObjects = { ...floatingObjects, [pageIndex]: list.filter(o => o.id !== objId) };
    if (selectedFloatId === `${pageIndex}:${objId}`) selectedFloatId = null;
  }

  let gestureState = null;

  function startMove(e, pageIndex, objId) {
    e.stopPropagation();
    selectedFloatId = `${pageIndex}:${objId}`;
    const obj = (floatingObjects[pageIndex] || []).find(o => o.id === objId);
    if (!obj) return;
    const point = e.touches ? e.touches[0] : e;
    gestureState = {
      type: 'move', pageIndex, objId,
      startX: point.clientX, startY: point.clientY,
      origX: obj.x, origY: obj.y,
    };
  }

  function startResize(e, pageIndex, objId) {
    e.stopPropagation();
    const obj = (floatingObjects[pageIndex] || []).find(o => o.id === objId);
    if (!obj) return;
    const point = e.touches ? e.touches[0] : e;
    gestureState = {
      type: 'resize', pageIndex, objId,
      startX: point.clientX, startY: point.clientY,
      origW: obj.w, origH: obj.h,
    };
  }

  function startRotate(e, pageIndex, objId) {
    e.stopPropagation();
    const obj = (floatingObjects[pageIndex] || []).find(o => o.id === objId);
    if (!obj) return;
    const point = e.touches ? e.touches[0] : e;
    gestureState = {
      type: 'rotate', pageIndex, objId,
      startX: point.clientX, startY: point.clientY,
      origDeg: obj.deg,
    };
  }

  function updateFloatObj(pageIndex, objId, patch) {
    const list = floatingObjects[pageIndex] || [];
    floatingObjects = {
      ...floatingObjects,
      [pageIndex]: list.map(o => o.id === objId ? { ...o, ...patch } : o),
    };
  }

  function onGestureMove(e) {
    if (!gestureState) return;
    const point = e.touches ? e.touches[0] : e;
    if (e.touches) e.preventDefault();
    const dx = (point.clientX - gestureState.startX) / (fitScale * pinchScale);
    const dy = (point.clientY - gestureState.startY) / (fitScale * pinchScale);

    if (gestureState.type === 'move') {
      updateFloatObj(gestureState.pageIndex, gestureState.objId, {
        x: gestureState.origX + dx,
        y: gestureState.origY + dy,
      });
    } else if (gestureState.type === 'resize') {
      updateFloatObj(gestureState.pageIndex, gestureState.objId, {
        w: Math.max(24, gestureState.origW + dx),
        h: Math.max(24, gestureState.origH + dy),
      });
    } else if (gestureState.type === 'rotate') {
      const deg = gestureState.origDeg + (dx * 0.5);
      updateFloatObj(gestureState.pageIndex, gestureState.objId, { deg });
    }
  }

  function onGestureEnd() {
    gestureState = null;
  }

  export function insertFloatImageAtCenter(dataUrl, pageIndex) {
    const id = nextFloatId++;
    const list = floatingObjects[pageIndex] || [];
    floatingObjects = {
      ...floatingObjects,
      [pageIndex]: [...list, {
        id, src: dataUrl,
        x: PAGE_W / 2 - 100, y: PAGE_H / 2 - 100,
        w: 200, h: 200, deg: 0, z: 'front',
      }],
    };
    selectedFloatId = `${pageIndex}:${id}`;
  }

  function handlePageFocusFromTap(pageIndex) {
    handleFocusPagina(pageIndex);
    if (selectedFloatId && selectedFloatId.startsWith(pageIndex + ':')) {
      selectedFloatId = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PAINEL DE DEBUG — TEMPORÁRIO
  //  Um pequeno log visual, sempre por cima de tudo, para vermos os
  //  eventos reais a acontecer no momento do salto sem precisar de
  //  computador nenhum. Remove-se assim que identificarmos a causa.
  // ══════════════════════════════════════════════════════════════════
  let debugLines = [];
  let debugPanelEl;
  function debugLog(msg) {
    const t = performance.now().toFixed(0);
    debugLines = [...debugLines.slice(-11), `${t}ms  ${msg}`];
    if (debugPanelEl) {
      debugPanelEl.textContent = debugLines.join('\n');
      debugPanelEl.scrollTop = debugPanelEl.scrollHeight;
    }
  }
  let debugRafId = null;
  function debugTick() {
    if (debugPanelEl && containerEl) {
      const appbarEl = document.querySelector('.appbar, .nexa-static-appbar');
      const appbarTop = appbarEl ? appbarEl.getBoundingClientRect().top : 'N/A';
      const line2 = `scrollTop=${containerEl.scrollTop} appbarTop=${appbarTop} isRebalancing=${isRebalancing}`;
      const el2 = document.getElementById('nexaDebugLive');
      if (el2) el2.textContent = line2;
    }
    debugRafId = requestAnimationFrame(debugTick);
  }

  onMount(async () => {
    ajustarZoom();
    window.addEventListener('resize', ajustarZoom);
    window.addEventListener('orientationchange', ajustarZoom);

    document.execCommand('defaultParagraphSeparator', false, 'p');

    await tick();
    const first = getConteudoEl(0);
    if (first) {
      first.innerHTML = initialContent || '<p><br></p>';
    }
    dispatch('ready', { html: getContent() });
    await reequilibrarDocumento();

    window.addEventListener('mousemove', onGestureMove);
    window.addEventListener('mouseup', onGestureEnd);
    window.addEventListener('touchmove', onGestureMove, { passive: false });
    window.addEventListener('touchend', onGestureEnd);

    debugRafId = requestAnimationFrame(debugTick);
  });
  onDestroy(() => {
    window.removeEventListener('resize', ajustarZoom);
    window.removeEventListener('orientationchange', ajustarZoom);
    window.removeEventListener('mousemove', onGestureMove);
    window.removeEventListener('mouseup', onGestureEnd);
    window.removeEventListener('touchmove', onGestureMove);
    window.removeEventListener('touchend', onGestureEnd);
    clearTimeout(timeoutReequilibrio);
    if (debugRafId) cancelAnimationFrame(debugRafId);
  });
</script>

<div class="canvas-scroll" bind:this={containerEl}>
  <PinchZoom bind:scale={pinchScale} minScale={1} maxScale={4} on:zoomchange>
    <div class="pages-stack" bind:this={stackEl} style="transform: scale({fitScale}); transform-origin: top center;">
      {#each folhas as folha, i (folha.id)}
        <div
          class="page-a4"
          style="width:{PAGE_W}px; height:{PAGE_H}px; padding:{PAGE_PAD_Y}px {PAGE_PAD_X}px;"
        >
          <div
            class="conteudo"
            contenteditable="true"
            bind:this={contentEls[i]}
            on:input={handleInput}
            on:keydown={handleKeydown}
            on:paste={aoColar}
            on:focus={() => { handleFocusPagina(i); }}
            on:pointerdown={() => onPageBackgroundTap(i)}
            spellcheck="true"
            role="textbox"
            aria-multiline="true"
            aria-label="Conteúdo do documento"
          ></div>

          {#if floatingObjects[i]}
            {#each floatingObjects[i] as obj (obj.id)}
              <div
                class="float-obj"
                class:float-behind={obj.z === 'behind'}
                class:float-selected={selectedFloatId === `${i}:${obj.id}`}
                style="left:{obj.x}px; top:{obj.y}px; width:{obj.w}px; height:{obj.h}px; transform: rotate({obj.deg}deg);"
                on:pointerdown={(e) => startMove(e, i, obj.id)}
                on:touchstart={(e) => startMove(e, i, obj.id)}
              >
                <img src={obj.src} draggable="false" alt="" class="float-img" />
                {#if selectedFloatId === `${i}:${obj.id}`}
                  <div class="float-handle float-handle-resize"
                    on:pointerdown={(e) => startResize(e, i, obj.id)}
                    on:touchstart={(e) => startResize(e, i, obj.id)}
                  ></div>
                  <div class="float-rotate-line"></div>
                  <div class="float-handle float-handle-rotate"
                    on:pointerdown={(e) => startRotate(e, i, obj.id)}
                    on:touchstart={(e) => startRotate(e, i, obj.id)}
                  ></div>
                {/if}
              </div>
            {/each}
          {/if}

          <div class="page-number">{i + 1}</div>

          {#if i === folhas.length - 1 && footnotes.length > 0}
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
</div>

<!-- PAINEL DE DEBUG — remover depois de encontrarmos a causa -->
<div id="nexaDebugPanel" style="position:fixed; left:4px; right:4px; bottom:4px; max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.88); color:#0f0; font-size:9px; font-family:monospace; z-index:999999; padding:4px; border-radius:6px; pointer-events:none; white-space:pre-wrap; line-height:1.3;">
  <div id="nexaDebugLive" style="color:#0ff; margin-bottom:2px;"></div>
  <div bind:this={debugPanelEl}></div>
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
    overscroll-behavior: none;
    touch-action: pan-y;
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
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .conteudo {
    flex: 1;
    min-height: 0;
    width: 100%;
    font-size: 15px;
    line-height: 1.6;
    color: #1a1a1a;
    outline: none;
    overflow: hidden;
    overflow-wrap: break-word;
    position: relative;
    z-index: 1;
    -webkit-user-select: text;
    user-select: text;
  }
  .conteudo :global(p) {
    margin: 0;
  }
  .page-number {
    position: absolute; bottom: 14px; right: 0; left: 0;
    text-align: center; font-size: 10px; color: #9a9a9a; pointer-events: none;
    z-index: 1;
  }

  .float-obj {
    position: absolute;
    cursor: grab;
    touch-action: none;
    z-index: 5;
    -webkit-user-select: none;
    user-select: none;
  }
  .float-obj.float-behind {
    z-index: 0;
  }
  .float-obj:active {
    cursor: grabbing;
  }
  .float-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
    pointer-events: none;
    border-radius: 2px;
  }
  .float-obj.float-selected {
    outline: 1.5px solid #2F7BF6;
    outline-offset: 2px;
  }
  .float-handle {
    position: absolute;
    width: 16px;
    height: 16px;
    background: #2F7BF6;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    touch-action: none;
  }
  .float-handle-resize {
    right: -8px;
    bottom: -8px;
    cursor: nwse-resize;
  }
  .float-rotate-line {
    position: absolute;
    left: 50%;
    top: -28px;
    width: 1.5px;
    height: 26px;
    background: #2F7BF6;
    transform: translateX(-50%);
  }
  .float-handle-rotate {
    left: 50%;
    top: -36px;
    transform: translateX(-50%);
    cursor: grab;
  }

  :global(.doc-table.doc-table) { border-collapse: collapse; width: 100%; margin: 4px 0; }
  :global(.doc-table td) { border: 1px solid #d0d0d0; padding: 8px; min-width: 32px; height: 26px; vertical-align: top; }
  :global(.doc-table-wrap) { position: relative; display: block; margin: 8px 0; }
  :global(.doc-table-handle) {
    position: absolute; width: 14px; height: 14px; background: #2F7BF6; border: 2px solid #fff;
    border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); touch-action: none;
  }
  :global(.doc-table-handle-se) { right: -7px; bottom: -7px; cursor: nwse-resize; }

  :global(a) { color: #2F7BF6; text-decoration: underline; }
  :global(.footnote-ref) { color: #2F7BF6; cursor: default; }

  .footnotes-block { margin-top: 24px; flex-shrink: 0; position: relative; z-index: 1; }
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