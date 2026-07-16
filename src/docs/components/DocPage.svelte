<script>
  import PinchZoom from '../widgets/PinchZoom.svelte';
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let initialContent = '';
  export let footnotes = [];
  export let activePageIndex = 0; // controlado pelo pai via botões prev/next no appbar

  const dispatch = createEventDispatcher();

  // ══════════════════════════════════════════════════════════════════
  //  MOTOR DE PAGINAÇÃO — inalterado. A navegação entre páginas passou
  //  a ser por botões (prev/next no appbar), mas isso NUNCA exigiu
  //  remover o PinchZoom: o pan de 1 dedo dele só age quando scale >
  //  minScale (já em zoom), então não competia com nada. Erro meu na
  //  resposta anterior ter tirado — devolvido tal como estava.
  //
  //  O bug real de "parou de criar folhas" era outro: as folhas
  //  não-ativas estavam com display:none, e um elemento display:none
  //  tem clientHeight/scrollHeight = 0 (o browser não calcula layout
  //  para ele). O motor de empurrar overflow compara scrollHeight >
  //  clientHeight — com os dois em 0 essa comparação nunca é verdadeira,
  //  então o texto nunca transbordava para a próxima página.
  //
  //  Correção: folhas não-ativas usam visibility:hidden + saem do
  //  fluxo via position:absolute + deslocadas para fora da área visível.
  //  Isso mantém layout real (clientHeight/scrollHeight corretos, o
  //  motor volta a funcionar) sem aparecer na tela nem ocupar espaço
  //  na pilha visual.
  // ══════════════════════════════════════════════════════════════════

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
  function handleFocusPagina(i) {
    if (activePageIndex !== i) activePageIndex = i;
    dispatch('pagefocus', i);
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
    activePageIndex = 0;
    await tick();
    htmls.forEach((h, i) => {
      const el = getConteudoEl(i);
      if (el) el.innerHTML = h || '<p><br></p>';
    });
    await reequilibrarDocumento();
  }

  export function focusEditor() {
    contentEls[activePageIndex]?.focus();
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
    return contentEls[activePageIndex] || contentEls[0];
  }

  // ══════════════════════════════════════════════════════════════════
  //  IMAGENS EM CANVAS LIVRE (estilo Canva) — cada imagem inserida
  //  vira um objeto flutuante independente do fluxo de texto, com
  //  posição (x,y), tamanho (w,h) e ângulo (deg) próprios, guardado
  //  por página em floatingObjects[pageIndex] = [ {id,x,y,w,h,deg,src} ].
  //  O objeto vive como filho posicionado ABSOLUTAMENTE dentro de
  //  .page-a4 (que é position:relative), FORA da div .conteudo — ou
  //  seja, nunca entra no contenteditable, nunca é tocado pelo motor
  //  de reequilíbrio de parágrafos, e nunca "pula" o cursor de texto.
  // ══════════════════════════════════════════════════════════════════

  let floatingObjects = [[]]; // um array por folha
  let nextFloatId = 1;
  let selectedFloatId = null; // "pageIndex:objId"

  function ensureFloatingArrayFor(pageIndex) {
    while (floatingObjects.length <= pageIndex) {
      floatingObjects = [...floatingObjects, []];
    }
  }

  export async function insertImageAtCursor(dataUrl) {
    const pageIndex = activePageIndex;
    ensureFloatingArrayFor(pageIndex);

    const img = new Image();
    img.onload = () => {
      const naturalRatio = img.naturalWidth / img.naturalHeight || 1;
      const w = Math.min(320, PAGE_W - PAGE_PAD_X * 2);
      const h = w / naturalRatio;
      const id = nextFloatId++;
      const obj = {
        id,
        src: dataUrl,
        x: (PAGE_W - w) / 2,
        y: (PAGE_H - h) / 2,
        w,
        h,
        deg: 0,
        z: 'front', // 'front' | 'behind'
      };
      floatingObjects[pageIndex] = [...floatingObjects[pageIndex], obj];
      floatingObjects = floatingObjects;
      selectFloat(pageIndex, id);
      dispatch('input');
    };
    img.src = dataUrl;
  }

  function selectFloat(pageIndex, objId) {
    selectedFloatId = `${pageIndex}:${objId}`;
    const obj = floatingObjects[pageIndex]?.find(o => o.id === objId);
    if (obj) {
      dispatch('imagerequestedit', {
        pageIndex,
        objId,
        state: { width: Math.round(obj.w), height: Math.round(obj.h), rotation: obj.deg, wrap: obj.z },
      });
    }
  }

  export function deselectFloat() {
    selectedFloatId = null;
  }

  export async function applyImageOptions(target, opts) {
    if (!target) return;
    const { pageIndex, objId } = target;
    const list = floatingObjects[pageIndex];
    if (!list) return;
    const obj = list.find(o => o.id === objId);
    if (!obj) return;

    if (typeof opts.width === 'number') {
      const ratio = obj.h / obj.w;
      obj.w = opts.width;
      obj.h = opts.width * ratio;
    }
    if (opts.wrap) obj.z = opts.wrap;

    floatingObjects[pageIndex] = [...list];
    floatingObjects = floatingObjects;
    dispatch('input');
  }

  export async function deleteImage(target) {
    if (!target) return;
    const { pageIndex, objId } = target;
    const list = floatingObjects[pageIndex];
    if (!list) return;
    floatingObjects[pageIndex] = list.filter(o => o.id !== objId);
    floatingObjects = floatingObjects;
    selectedFloatId = null;
    dispatch('input');
  }

  // ── Arrastar / redimensionar / rodar por gesto direto no objeto ──
  let gesture = null;

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function startMove(e, pageIndex, objId) {
    e.stopPropagation();
    e.preventDefault();
    selectFloat(pageIndex, objId);
    const obj = floatingObjects[pageIndex].find(o => o.id === objId);
    const p = pointerXY(e);
    gesture = {
      mode: 'move', pageIndex, objId,
      startX: p.x, startY: p.y,
      startObjX: obj.x, startObjY: obj.y,
    };
  }

  function startResize(e, pageIndex, objId) {
    e.stopPropagation();
    e.preventDefault();
    const obj = floatingObjects[pageIndex].find(o => o.id === objId);
    const p = pointerXY(e);
    gesture = {
      mode: 'resize', pageIndex, objId,
      startX: p.x, startY: p.y,
      startObjW: obj.w, startObjH: obj.h,
      startObjX: obj.x, startObjY: obj.y,
      aspectRatio: obj.w / obj.h,
    };
  }

  function startRotate(e, pageIndex, objId) {
    e.stopPropagation();
    e.preventDefault();
    const obj = floatingObjects[pageIndex].find(o => o.id === objId);
    const pageEl = getConteudoEl(pageIndex)?.closest('.page-a4');
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const scaleFactor = (fitScale || 1) * (pinchScale || 1);
    const centerX = rect.left + (obj.x + obj.w / 2) * scaleFactor;
    const centerY = rect.top + (obj.y + obj.h / 2) * scaleFactor;
    const p = pointerXY(e);
    const startAngle = Math.atan2(p.y - centerY, p.x - centerX) * (180 / Math.PI);
    gesture = {
      mode: 'rotate', pageIndex, objId,
      centerX, centerY, startAngle,
      startObjDeg: obj.deg,
    };
  }

  function onGestureMove(e) {
    if (!gesture) return;
    const p = pointerXY(e);
    const list = floatingObjects[gesture.pageIndex];
    const obj = list?.find(o => o.id === gesture.objId);
    if (!obj) return;
    const scaleFactor = (fitScale || 1) * (pinchScale || 1);

    if (gesture.mode === 'move') {
      const dx = (p.x - gesture.startX) / scaleFactor;
      const dy = (p.y - gesture.startY) / scaleFactor;
      obj.x = gesture.startObjX + dx;
      obj.y = gesture.startObjY + dy;
    } else if (gesture.mode === 'resize') {
      const dx = (p.x - gesture.startX) / scaleFactor;
      let newW = Math.max(32, gesture.startObjW + dx);
      let newH = newW / gesture.aspectRatio;
      obj.w = newW;
      obj.h = newH;
    } else if (gesture.mode === 'rotate') {
      const angleNow = Math.atan2(p.y - gesture.centerY, p.x - gesture.centerX) * (180 / Math.PI);
      const delta = angleNow - gesture.startAngle;
      obj.deg = gesture.startObjDeg + delta;
    }

    floatingObjects[gesture.pageIndex] = [...list];
    floatingObjects = floatingObjects;
    e.preventDefault();
  }

  function onGestureEnd() {
    if (!gesture) return;
    gesture = null;
    dispatch('input');
  }

  function onPageBackgroundTap(pageIndex) {
    handleFocusPagina(pageIndex);
    if (selectedFloatId && selectedFloatId.startsWith(pageIndex + ':')) {
      selectedFloatId = null;
    }
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
  });
  onDestroy(() => {
    window.removeEventListener('resize', ajustarZoom);
    window.removeEventListener('orientationchange', ajustarZoom);
    window.removeEventListener('mousemove', onGestureMove);
    window.removeEventListener('mouseup', onGestureEnd);
    window.removeEventListener('touchmove', onGestureMove);
    window.removeEventListener('touchend', onGestureEnd);
    clearTimeout(timeoutReequilibrio);
  });
</script>

<div class="canvas-scroll" bind:this={containerEl}>
  <PinchZoom bind:scale={pinchScale} minScale={1} maxScale={4} on:zoomchange>
    <div class="pages-stack" bind:this={stackEl} style="transform: scale({fitScale}); transform-origin: top center;">
      {#each folhas as folha, i (folha.id)}
        <!--
          Folhas não-ativas: visibility:hidden + position:absolute
          fora da área visível (top:-99999px). Isto MANTÉM o layout
          real calculado pelo browser (clientHeight/scrollHeight
          corretos), ao contrário de display:none — é exatamente por
          isso que o motor de paginação volta a funcionar. A folha
          ativa usa position:relative normal, dentro do fluxo da
          pilha, para ocupar o espaço visível de sempre.
        -->
        <div
          class="page-a4"
          class:page-active={i === activePageIndex}
          style="width:{PAGE_W}px; height:{PAGE_H}px; padding:{PAGE_PAD_Y}px {PAGE_PAD_X}px;"
        >
          <div
            class="conteudo"
            contenteditable="true"
            bind:this={contentEls[i]}
            on:input={handleInput}
            on:keydown={handleKeydown}
            on:paste={aoColar}
            on:focus={() => handleFocusPagina(i)}
            on:pointerdown={() => onPageBackgroundTap(i)}
            spellcheck="true"
            role="textbox"
            aria-multiline="true"
            aria-label="Conteúdo do documento"
          ></div>

          <!-- Camada de objetos flutuantes (imagens em canvas livre) -->
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
    position: absolute;
    top: -99999px;
    left: -99999px;
    visibility: hidden;
    overflow: hidden;
  }
  /* Folha ativa: sai do "limbo" e volta ao fluxo normal da pilha
     visual, ocupando o espaço real na tela. */
  .page-a4.page-active {
    position: relative;
    top: 0;
    left: 0;
    visibility: visible;
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
  }
  .conteudo :global(p) {
    margin: 0;
  }
  .page-number {
    position: absolute; bottom: 14px; right: 0; left: 0;
    text-align: center; font-size: 10px; color: #9a9a9a; pointer-events: none;
    z-index: 1;
  }

  /* ── Objetos flutuantes (canvas livre) ───────────────────────── */
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