<script>
  import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
  import { cellId, parseCellId } from '../lib/sheet-store.js';
  import { formatDisplayValue, FormulaError } from '../lib/formula-engine.js';

  export let doc; // documento completo (rows, cols, cells, colWidths)
  export let resolvedValues = {}; // { addr: value|FormulaError } já calculado pelo pai
  export let c; // paleta de cores do tema
  export let activeAddr = 'A1'; // bindable
  export let selectionAnchor = 'A1'; // bindable — canto inicial do range selecionado
  export let selectionFocus = 'A1'; // bindable — canto atual do range (igual a activeAddr fora de arrasto)

  const dispatch = createEventDispatcher();

  const ROW_HEADER_W = 44;
  const DEFAULT_COL_W = 88;
  const ROW_H = 34;
  const HEADER_H = 30;

  // ── Virtualização ────────────────────────────────────────────
  //
  // PERFORMANCE: com a grelha por defeito, desenhar todas as células
  // de uma vez no mount era o que fazia o Sheets demorar visivelmente
  // mais a abrir do que as outras apps. A partir daqui só se desenham
  // as células realmente visíveis no "grid-scroller" (mais uma
  // margem de OVERSCAN células para fora de cada lado).

  const OVERSCAN_ROWS = 6;
  const OVERSCAN_COLS = 3;

  let scrollTop = 0;
  let scrollLeft = 0;
  let viewportW = 0;
  let viewportH = 0;

  function colWidth(colIdx) {
    return doc.colWidths[String(colIdx)] || DEFAULT_COL_W;
  }

  let scrollerEl;
  let colHeaderEl;
  let rowHeaderEl;

  function syncHeaderScroll() {
    if (!scrollerEl) return;
    scrollTop = scrollerEl.scrollTop;
    scrollLeft = scrollerEl.scrollLeft;
    if (colHeaderEl) colHeaderEl.scrollLeft = scrollerEl.scrollLeft;
    if (rowHeaderEl) rowHeaderEl.scrollTop = scrollerEl.scrollTop;
  }

  function syncViewportSize() {
    if (!scrollerEl) return;
    viewportW = scrollerEl.clientWidth;
    viewportH = scrollerEl.clientHeight;
  }

  let resizeObserver;

  // ── Edição de célula ──────────────────────────────────────────

  let editingAddr = null;
  let editingValue = '';
  let editInputEl;

  function cellRawValue(addr) {
    const cell = doc.cells[addr];
    return cell && cell.raw !== undefined && cell.raw !== null ? cell.raw : '';
  }

  async function beginEdit(addr, presetValue = null) {
    editingAddr = addr;
    editingValue = presetValue !== null ? presetValue : String(cellRawValue(addr));
    await tick();
    editInputEl && editInputEl.focus();
    if (presetValue === null && editInputEl) {
      editInputEl.select();
    }
  }

  function commitEdit(moveDir = null) {
    if (editingAddr) {
      dispatch('cellchange', { addr: editingAddr, raw: editingValue });
    }
    const fromAddr = editingAddr;
    editingAddr = null;
    editingValue = '';
    if (moveDir && fromAddr) {
      moveActive(fromAddr, moveDir);
    }
  }

  function cancelEdit() {
    editingAddr = null;
    editingValue = '';
  }

  function moveActive(fromAddr, dir) {
    const pos = parseCellId(fromAddr);
    if (!pos) return;
    let { row, col } = pos;
    if (dir === 'down') row = Math.min(doc.rows - 1, row + 1);
    else if (dir === 'up') row = Math.max(0, row - 1);
    else if (dir === 'right') col = Math.min(doc.cols - 1, col + 1);
    else if (dir === 'left') col = Math.max(0, col - 1);
    const next = cellId(row, col);
    activeAddr = next;
    selectionAnchor = next;
    selectionFocus = next;
    scrollCellIntoView(next);
  }

  function scrollCellIntoView(addr) {
    const pos = parseCellId(addr);
    if (!pos || !scrollerEl) return;
    const cellLeft = colOffsets[pos.col];
    const cellRight = cellLeft + colWidth(pos.col);
    const cellTop = pos.row * ROW_H;
    const cellBottom = cellTop + ROW_H;

    const viewLeft = scrollerEl.scrollLeft;
    const viewRight = viewLeft + scrollerEl.clientWidth;
    const viewTop = scrollerEl.scrollTop;
    const viewBottom = viewTop + scrollerEl.clientHeight;

    if (cellLeft < viewLeft) scrollerEl.scrollLeft = cellLeft;
    else if (cellRight > viewRight) scrollerEl.scrollLeft = cellRight - scrollerEl.clientWidth;
    if (cellTop < viewTop) scrollerEl.scrollTop = cellTop;
    else if (cellBottom > viewBottom) scrollerEl.scrollTop = cellBottom - scrollerEl.clientHeight;
  }

  // ── Seleção por toque/arrasto ────────────────────────────────

  let isSelecting = false;

  function onCellPointerDown(addr, e) {
    if (editingAddr && editingAddr !== addr) {
      commitEdit();
    }
    if (editingAddr === addr) return;
    isSelecting = true;
    activeAddr = addr;
    selectionAnchor = addr;
    selectionFocus = addr;
  }

  function onCellPointerEnter(addr) {
    if (!isSelecting) return;
    selectionFocus = addr;
  }

  function onGlobalPointerUp() {
    isSelecting = false;
  }

  function onCellDoubleClick(addr) {
    beginEdit(addr);
  }

  function handleTypeToEdit(e) {
    if (editingAddr) return;
    if (!activeAddr) return;
    const key = e.key;
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      beginEdit(activeAddr, key);
      e.preventDefault();
    } else if (key === 'Enter' || key === 'F2') {
      beginEdit(activeAddr);
      e.preventDefault();
    } else if (key === 'Backspace' || key === 'Delete') {
      dispatch('cellchange', { addr: activeAddr, raw: '' });
      e.preventDefault();
    } else if (key === 'ArrowDown') { moveActive(activeAddr, 'down'); e.preventDefault(); }
    else if (key === 'ArrowUp') { moveActive(activeAddr, 'up'); e.preventDefault(); }
    else if (key === 'ArrowLeft') { moveActive(activeAddr, 'left'); e.preventDefault(); }
    else if (key === 'ArrowRight') { moveActive(activeAddr, 'right'); e.preventDefault(); }
  }

  function handleEditKeydown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); }
    else if (e.key === 'Tab') { e.preventDefault(); commitEdit(e.shiftKey ? 'left' : 'right'); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  // ── Cálculo de offsets de coluna (para largura variável) ──────

  $: colOffsets = (() => {
    const offsets = [0];
    for (let i = 0; i < doc.cols; i++) offsets.push(offsets[i] + colWidth(i));
    return offsets;
  })();
  $: totalWidth = colOffsets[doc.cols];
  $: totalHeight = doc.rows * ROW_H;

  // ── Range visível (linhas/colunas), com overscan ─────────────

  $: firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_H));
  $: lastVisibleRow = Math.min(doc.rows - 1, Math.floor((scrollTop + viewportH) / ROW_H));
  $: rowStart = Math.max(0, firstVisibleRow - OVERSCAN_ROWS);
  $: rowEnd = Math.min(doc.rows - 1, lastVisibleRow + OVERSCAN_ROWS);

  $: firstVisibleCol = (() => {
    for (let i = 0; i < doc.cols; i++) {
      if (colOffsets[i + 1] > scrollLeft) return i;
    }
    return Math.max(0, doc.cols - 1);
  })();
  $: lastVisibleCol = (() => {
    const rightEdge = scrollLeft + viewportW;
    for (let i = firstVisibleCol; i < doc.cols; i++) {
      if (colOffsets[i] >= rightEdge) return Math.max(firstVisibleCol, i - 1);
    }
    return doc.cols - 1;
  })();
  $: colStart = Math.max(0, firstVisibleCol - OVERSCAN_COLS);
  $: colEnd = Math.min(doc.cols - 1, lastVisibleCol + OVERSCAN_COLS);

  $: visibleRowIndices = (() => {
    const arr = [];
    for (let r = rowStart; r <= rowEnd; r++) arr.push(r);
    return arr;
  })();
  $: visibleColIndices = (() => {
    const arr = [];
    for (let c = colStart; c <= colEnd; c++) arr.push(c);
    return arr;
  })();

  $: colHeaderLeadWidth = colOffsets[colStart];
  $: colHeaderTrailWidth = totalWidth - colOffsets[colEnd + 1];
  $: rowHeaderLeadHeight = rowStart * ROW_H;
  $: rowHeaderTrailHeight = totalHeight - (rowEnd + 1) * ROW_H;

  // ── Range de seleção (normalizado) ─────────────────────────────

  $: selRange = (() => {
    const a = parseCellId(selectionAnchor);
    const b = parseCellId(selectionFocus);
    if (!a || !b) return null;
    return {
      r0: Math.min(a.row, b.row), r1: Math.max(a.row, b.row),
      c0: Math.min(a.col, b.col), c1: Math.max(a.col, b.col),
    };
  })();

  function isInSelection(row, col) {
    if (!selRange) return false;
    return row >= selRange.r0 && row <= selRange.r1 && col >= selRange.c0 && col <= selRange.c1;
  }
  function isSelectionMultiCell() {
    return selRange && (selRange.r0 !== selRange.r1 || selRange.c0 !== selRange.c1);
  }

  // ══════════════════════════════════════════════════════════════
  //  FIX (atraso ao aplicar bold/itálico/cor/etc — só refletia
  //  visualmente depois de fazer scroll): a versão anterior lia a
  //  formatação de cada célula através de {@const meta = cellMeta(addr)},
  //  onde cellMeta(addr) chamava doc.cells[addr]. Isso funciona para o
  //  PRIMEIRO desenho, mas o corpo dos #each só volta a ser
  //  RE-EXECUTADO quando os arrays de iteração (visibleRowIndices/
  //  visibleColIndices) mudam de referência — o que só acontece ao
  //  fazer scroll (scrollTop/scrollLeft mudam). Uma alteração de
  //  `doc` vinda do pai (ex: aplicar bold) NÃO recria esses arrays,
  //  por isso o valor de `meta` dentro do loop ficava "congelado" no
  //  que já lá estava, até o próximo scroll forçar o Svelte a
  //  reconciliar o bloco inteiro de novo.
  //
  //  CORREÇÃO: em vez de indireção por função dentro de {@const},
  //  cada propriedade de formatação agora lê diretamente
  //  `doc.cells[addr]?.propriedade` inline no atributo `style` do
  //  template. O compilador do Svelte rastreia leituras de
  //  propriedade feitas diretamente no template como dependências
  //  reativas do elemento em si (não do bloco #each todo), por isso
  //  cada `<div class="cell">` volta a atualizar o seu próprio style
  //  assim que `doc` muda, independentemente de scroll.
  // ══════════════════════════════════════════════════════════════

  function displayValueFor(addr) {
    const val = resolvedValues[addr];
    const format = doc.cells[addr] ? doc.cells[addr].format : undefined;
    if (val === undefined) return '';
    return formatDisplayValue(val, format);
  }
  function isErrorCell(addr) {
    return resolvedValues[addr] instanceof FormulaError;
  }

  onMount(() => {
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('keydown', handleTypeToEdit);
    syncViewportSize();
    if (scrollerEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncViewportSize());
      resizeObserver.observe(scrollerEl);
    } else {
      window.addEventListener('resize', syncViewportSize);
    }
  });
  onDestroy(() => {
    window.removeEventListener('pointerup', onGlobalPointerUp);
    window.removeEventListener('keydown', handleTypeToEdit);
    if (resizeObserver) resizeObserver.disconnect();
    else window.removeEventListener('resize', syncViewportSize);
  });

  export function editActiveCell() {
    if (activeAddr) beginEdit(activeAddr);
  }
  export function getActiveRaw() {
    return activeAddr ? cellRawValue(activeAddr) : '';
  }
  export function setActiveRaw(value) {
    if (!activeAddr) return;
    dispatch('cellchange', { addr: activeAddr, raw: value });
  }
</script>

<div class="grid-shell" style="background:{c.sheetPaperBg};">
  <div class="corner" style="background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};width:{ROW_HEADER_W}px;height:{HEADER_H}px;"></div>

  <div class="col-header" bind:this={colHeaderEl} style="left:{ROW_HEADER_W}px;height:{HEADER_H}px;background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};">
    <div class="col-header-inner" style="width:{totalWidth}px;">
      <div class="header-spacer" style="width:{colHeaderLeadWidth}px;"></div>
      {#each visibleColIndices as col (col)}
        <div
          class="col-head-cell"
          class:col-head-active={selRange && col >= selRange.c0 && col <= selRange.c1}
          style="width:{colWidth(col)}px;color:{c.textSecondary};border-color:{c.divider};"
        >
          {cellId(0, col).replace(/\d+$/, '')}
        </div>
      {/each}
      <div class="header-spacer" style="width:{colHeaderTrailWidth}px;"></div>
    </div>
  </div>

  <div class="row-header" bind:this={rowHeaderEl} style="top:{HEADER_H}px;width:{ROW_HEADER_W}px;background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};">
    <div class="row-header-inner" style="height:{totalHeight}px;">
      <div class="header-spacer" style="height:{rowHeaderLeadHeight}px;"></div>
      {#each visibleRowIndices as row (row)}
        <div
          class="row-head-cell"
          class:row-head-active={selRange && row >= selRange.r0 && row <= selRange.r1}
          style="height:{ROW_H}px;color:{c.textSecondary};border-color:{c.divider};"
        >
          {row + 1}
        </div>
      {/each}
      <div class="header-spacer" style="height:{rowHeaderTrailHeight}px;"></div>
    </div>
  </div>

  <div
    class="grid-scroller"
    bind:this={scrollerEl}
    style="left:{ROW_HEADER_W}px;top:{HEADER_H}px;"
    on:scroll={syncHeaderScroll}
  >
    <div class="grid-canvas" style="width:{totalWidth}px;height:{totalHeight}px;background:{c.sheetCellBg};">
      {#each visibleRowIndices as row (row)}
        {#each visibleColIndices as col (col)}
          {@const addr = cellId(row, col)}
          <div
            class="cell"
            class:cell-active={activeAddr === addr}
            class:cell-selected={isInSelection(row, col) && isSelectionMultiCell()}
            class:cell-editing={editingAddr === addr}
            class:cell-error={isErrorCell(addr)}
            class:cell-zebra={row % 2 === 1}
            style="
              left:{colOffsets[col]}px; top:{row * ROW_H}px;
              width:{colWidth(col)}px; height:{ROW_H}px;
              border-color:{c.sheetGridLine}66;
              font-weight:{doc.cells[addr] && doc.cells[addr].bold ? 700 : 400};
              font-style:{doc.cells[addr] && doc.cells[addr].italic ? 'italic' : 'normal'};
              text-decoration:{doc.cells[addr] && doc.cells[addr].underline ? 'underline' : 'none'};
              text-align:{(doc.cells[addr] && doc.cells[addr].align) || (typeof resolvedValues[addr] === 'number' ? 'right' : 'left')};
              color:{isErrorCell(addr) ? '#C42B1C' : ((doc.cells[addr] && doc.cells[addr].color) || c.textPrimary)};
              background:{editingAddr === addr ? c.sheetCellBg : ((doc.cells[addr] && doc.cells[addr].fill) || 'transparent')};
            "
            on:pointerdown={(e) => onCellPointerDown(addr, e)}
            on:pointerenter={() => onCellPointerEnter(addr)}
            on:dblclick={() => onCellDoubleClick(addr)}
          >
            {#if editingAddr === addr}
              <input
                class="cell-input"
                bind:this={editInputEl}
                bind:value={editingValue}
                style="color:{c.textPrimary};"
                on:keydown={handleEditKeydown}
                on:blur={() => commitEdit()}
              />
            {:else}
              <span class="cell-text">{displayValueFor(addr)}</span>
            {/if}
          </div>
        {/each}
      {/each}

      {#if selRange && isSelectionMultiCell()}
        <div
          class="selection-outline"
          style="
            left:{colOffsets[selRange.c0]}px; top:{selRange.r0 * ROW_H}px;
            width:{colOffsets[selRange.c1 + 1] - colOffsets[selRange.c0]}px;
            height:{(selRange.r1 - selRange.r0 + 1) * ROW_H}px;
            border-color:{c.primary};
            background:{c.primary}14;
          "
        ></div>
      {/if}

      {#if activeAddr}
        {@const activePos = parseCellId(activeAddr)}
        {#if activePos}
          <div
            class="active-outline"
            style="
              left:{colOffsets[activePos.col]}px; top:{activePos.row * ROW_H}px;
              width:{colWidth(activePos.col)}px; height:{ROW_H}px;
              border-color:{c.primary};
              box-shadow: 0 0 0 0.5px {c.primary};
            "
          >
            <div class="active-fill-handle" style="background:{c.primary};"></div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .grid-shell {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .corner {
    position: absolute; left: 0; top: 0; z-index: 30;
    border-right: 1px solid; border-bottom: 1px solid;
  }
  .col-header {
    position: absolute; top: 0; right: 0; z-index: 20;
    overflow: hidden; border-bottom: 1px solid;
  }
  .col-header-inner { display: flex; height: 100%; }
  .header-spacer { flex-shrink: 0; }
  .col-head-cell {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 600; border-right: 1px solid;
    -webkit-user-select: none; user-select: none;
  }
  .col-head-active { background: rgba(33,163,102,0.14); font-weight: 700; }

  .row-header {
    position: absolute; left: 0; bottom: 0; z-index: 20;
    overflow: hidden; border-right: 1px solid;
  }
  .row-header-inner { display: flex; flex-direction: column; width: 100%; }
  .row-head-cell {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 600; border-bottom: 1px solid;
    -webkit-user-select: none; user-select: none;
  }
  .row-head-active { background: rgba(33,163,102,0.14); font-weight: 700; }

  .grid-scroller {
    position: absolute; right: 0; bottom: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-x pan-y;
  }
  .grid-canvas {
    position: relative;
  }

  /* Linhas de divisão da grelha revistas — antes usavam c.sheetGridLine
     "puro" (podia vir demasiado forte/escuro consoante o tema), agora
     aplicamos "66" (~40% opacidade) sobre o token diretamente no
     style inline, dando um traço mais discreto e consistente com o
     Excel/Office real, onde as linhas de grelha são muito subtis. */
  .cell {
    position: absolute;
    display: flex; align-items: center;
    padding: 0 6px;
    border-right: 0.5px solid; border-bottom: 0.5px solid;
    font-size: 13px;
    box-sizing: border-box;
    overflow: hidden;
    cursor: cell;
    -webkit-user-select: none; user-select: none;
  }
  .cell-zebra { background: rgba(127,127,127,0.025); }
  .cell-text {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cell-error { font-weight: 600; }
  .cell-selected { background: rgba(33,163,102,0.10) !important; }
  .cell-editing { cursor: text; padding: 0; z-index: 15; }
  .cell-input {
    width: 100%; height: 100%;
    border: none; outline: none; background: transparent;
    font-size: 13px; padding: 0 6px; box-sizing: border-box;
    font-family: inherit;
  }

  .active-outline {
    position: absolute;
    border: 2px solid;
    pointer-events: none;
    z-index: 10;
    box-sizing: border-box;
  }
  .active-fill-handle {
    position: absolute;
    right: -4px; bottom: -4px;
    width: 7px; height: 7px;
    border-radius: 1px;
    border: 1.5px solid #fff;
  }
  .selection-outline {
    position: absolute;
    border: 1.5px solid;
    pointer-events: none;
    z-index: 8;
    box-sizing: border-box;
  }
</style>