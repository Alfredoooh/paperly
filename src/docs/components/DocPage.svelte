<script>
  import PinchZoom from '../widgets/PinchZoom.svelte';
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let initialContent = '';
  export let footnotes = [];

  const dispatch = createEventDispatcher();

  // ══════════════════════════════════════════════════════════════════
  //  MOTOR DE PAGINAÇÃO — portado diretamente do protótipo HTML puro
  //  fornecido (múltiplas divs contenteditable reais, uma por folha;
  //  reequilíbrio por empurrar/puxar elementos DOM entre folhas). Isto
  //  substitui a abordagem anterior de "master único" que quebrava
  //  sempre que o Svelte recriava nodes do {#each}. Aqui cada folha é
  //  o seu próprio contenteditable real e permanece assim — nada é
  //  movido por JS para dentro de nodes geridos pelo Svelte.
  // ══════════════════════════════════════════════════════════════════

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAGE_PAD_Y = 96;
  const PAGE_PAD_X = 72;

  let containerEl;
  let stackEl;
  let fitScale = 1;
  let pinchScale = 1;
  let resizeObserver;

  function ajustarZoom() {
    if (!containerEl) return;
    const margem = 40;
    const escala = Math.min((containerEl.clientWidth - margem) / PAGE_W, 1);
    fitScale = escala > 0 && isFinite(escala) ? escala : 1;
  }

  // Cada folha é: { id, contentEl } — contentEl é a div contenteditable
  // real daquela folha, criada e mantida diretamente pelo Svelte via
  // bind:this num {#each}, nunca movida entre folhas por appendChild
  // cruzado (só os FILHOS de dentro do contenteditable são movidos).
  let folhas = [{ id: 0 }];
  let contentEls = [];
  let nextFolhaId = 1;

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
      if (conteudoPai) conteudoPai.focus();
    } catch (erro) {}
  }

  let isRebalancing = false;

  async function reequilibrarDocumento() {
    if (isRebalancing) return;
    isRebalancing = true;

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

    isRebalancing = false;
  }

  let timeoutReequilibrio;
  function agendarReequilibrio() {
    clearTimeout(timeoutReequilibrio);
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

  function handleInput() {
    dispatch('input');
    agendarReequilibrio();
  }
  function handleKeydown(e) {
    dispatch('keydown', e);
  }

  // ══════════════════════════════════════════════════════════════════
  //  API pública (usada pela MainPage via bind:this)
  // ══════════════════════════════════════════════════════════════════
  export function getContent() {
    return contentEls.map(el => el ? el.innerHTML : '').join('<div class="page-break-marker"></div>');
  }

  export async function setContent(html) {
    const parts = (html || '').split('<div class="page-break-marker"></div>');
    const htmls = parts.length ? parts : ['<p><br></p>'];
    folhas = htmls.map((_, i) => ({ id: i }));
    nextFolhaId = htmls.length;
    await tick();
    htmls.forEach((h, i) => {
      const el = getConteudoEl(i);
      if (el) el.innerHTML = h || '<p><br></p>';
    });
    await reequilibrarDocumento();
  }

  export function focusEditor() {
    contentEls[0]?.focus();
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
    return contentEls[0];
  }

  export async function insertImageAtCursor(dataUrl) {
    const target = getActiveContentEl();
    target?.focus();
    const wrapperId = 'img_' + Date.now().toString(36);
    document.execCommand('insertHTML', false,
      `<span class="doc-img-wrap doc-img-inline" data-img-id="${wrapperId}" contenteditable="false">` +
        `<img src="${dataUrl}" style="width:220px;" draggable="false" />` +
        `<span class="doc-img-handle doc-img-handle-se"></span>` +
      `</span>&nbsp;`
    );
    dispatch('input');
    await reequilibrarDocumento();
  }

  export async function applyImageOptions(imgEl, opts) {
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
    await reequilibrarDocumento();
  }

  export async function deleteImage(imgEl) {
    if (!imgEl) return;
    const wrap = imgEl.closest('.doc-img-wrap');
    wrap?.remove();
    await reequilibrarDocumento();
  }

  export async function insertTable(rows, cols) {
    const target = getActiveContentEl();
    target?.focus();
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
    dispatch('input');
    await reequilibrarDocumento();
  }

  // ── Redimensionar imagens/tabelas por arrasto na alça ──────────────
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
    agendarReequilibrio();
  }

  function ligarEventosFolha(idx) {
    // os handlers on:input/on:keydown/on:paste já estão no template;
    // esta função existe só para paridade conceptual com o protótipo.
  }

  onMount(async () => {
    ajustarZoom();
    resizeObserver = new ResizeObserver(() => ajustarZoom());
    if (containerEl) resizeObserver.observe(containerEl);
    window.addEventListener('orientationchange', ajustarZoom);

    document.execCommand('defaultParagraphSeparator', false, 'p');

    await tick();
    const first = getConteudoEl(0);
    if (first) {
      first.innerHTML = initialContent || '<p><br></p>';
    }
    dispatch('ready', { html: getContent() });
    await reequilibrarDocumento();

    window.addEventListener('mousemove', onDocPointerMove);
    window.addEventListener('mouseup', onDocPointerUp);
    window.addEventListener('touchmove', onDocPointerMove, { passive: false });
    window.addEventListener('touchend', onDocPointerUp);
  });
  onDestroy(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('orientationchange', ajustarZoom);
    window.removeEventListener('mousemove', onDocPointerMove);
    window.removeEventListener('mouseup', onDocPointerUp);
    window.removeEventListener('touchmove', onDocPointerMove);
    window.removeEventListener('touchend', onDocPointerUp);
    clearTimeout(timeoutReequilibrio);
  });
</script>

<div class="canvas-scroll" bind:this={containerEl} on:pointerdown={onDocPointerDown}>
  <PinchZoom bind:scale={pinchScale} minScale={1} maxScale={4} on:zoomchange>
    <div class="pages-stack" bind:this={stackEl} style="transform: scale({fitScale}); transform-origin: top center;">
      {#each folhas as folha, i (folha.id)}
        <div class="page-a4" style="width:{PAGE_W}px; height:{PAGE_H}px; padding:{PAGE_PAD_Y}px {PAGE_PAD_X}px;">
          <div
            class="conteudo"
            contenteditable="true"
            bind:this={contentEls[i]}
            on:input={handleInput}
            on:keydown={handleKeydown}
            on:paste={aoColar}
            spellcheck="true"
            role="textbox"
            aria-multiline="true"
            aria-label="Conteúdo do documento"
          ></div>
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
  }
  .conteudo :global(p) {
    margin: 0;
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