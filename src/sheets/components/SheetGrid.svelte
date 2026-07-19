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

  function colWidth(colIdx) {
    return doc.colWidths[String(colIdx)] || DEFAULT_COL_W;
  }

  let scrollerEl;
  let colHeaderEl;
  let rowHeaderEl;

  function syncHeaderScroll() {
    if (!scrollerEl) return;
    if (colHeaderEl) colHeaderEl.scrollLeft = scrollerEl.scrollLeft;
    if (rowHeaderEl) rowHeaderEl.scrollTop = scrollerEl.scrollTop;
  }

  // ── Edição de célula ──────────────────────────────────────────

  let editingAddr = null;
  let editingValue = '';
  let editInputEl;

  function cellRawValue(addr) {
    const cell = doc.cells[addr];
    return cell && cell.raw !== undefined && cell.raw !== null ? cell.raw : '';
  }

  function cellMeta(addr) {
    return doc.cells[addr] || {};
  }

  async function beginEdit(addr, presetValue = null) {
    editingAddr = addr;
    editingValue = presetValue !== null ? presetValue : String(cellRawValue(addr));
    await tick();
    editInputEl && editInputEl.focus();
    if (presetValue === null && editInputEl) {
      // seleciona tudo ao entrar por duplo-toque, mas não quando se
      // começou a escrever diretamente por cima (presetValue setado)
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
  let selectStartAddr = null;

  function onCellPointerDown(addr, e) {
    if (editingAddr && editingAddr !== addr) {
      commitEdit();
    }
    if (editingAddr === addr) return; // já a editar esta célula, deixa o input tratar
    isSelecting = true;
    selectStartAddr = addr;
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
    selectStartAddr = null;
  }

  function onCellDoubleClick(addr) {
    beginEdit(addr);
  }

  function onCellClick(addr) {
    // clique simples numa célula já ativa (não em edição) prepara mas não edita —
    // edição real é por duplo-toque ou por escrever diretamente.
  }

  function handleTypeToEdit(e) {
    if (editingAddr) return; // já em edição, deixa passar para o input
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

  function displayValueFor(addr) {
    const val = resolvedValues[addr];
    const format = cellMeta(addr).format;
    if (val === undefined) return '';
    return formatDisplayValue(val, format);
  }
  function isErrorCell(addr) {
    return resolvedValues[addr] instanceof FormulaError;
  }

  onMount(() => {
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('keydown', handleTypeToEdit);
  });
  onDestroy(() => {
    window.removeEventListener('pointerup', onGlobalPointerUp);
    window.removeEventListener('keydown', handleTypeToEdit);
  });

  // Expõe para o pai poder pedir foco/edit programaticamente (ex: barra de fórmulas)
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
  <!-- Canto superior-esquerdo fixo -->
  <div class="corner" style="background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};width:{ROW_HEADER_W}px;height:{HEADER_H}px;"></div>

  <!-- Cabeçalho de colunas (A, B, C...) — sincroniza scroll horizontal com o corpo -->
  <div class="col-header" bind:this={colHeaderEl} style="left:{ROW_HEADER_W}px;height:{HEADER_H}px;background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};">
    <div class="col-header-inner" style="width:{totalWidth}px;">
      {#each Array(doc.cols) as _, col}
        <div
          class="col-head-cell"
          class:col-head-active={selRange && col >= selRange.c0 && col <= selRange.c1}
          style="width:{colWidth(col)}px;color:{c.textSecondary};border-color:{c.divider};"
        >
          {cellId(0, col).replace(/\d+$/, '')}
        </div>
      {/each}
    </div>
  </div>

  <!-- Cabeçalho de linhas (1, 2, 3...) — sincroniza scroll vertical com o corpo -->
  <div class="row-header" bind:this={rowHeaderEl} style="top:{HEADER_H}px;width:{ROW_HEADER_W}px;background:{c.sheetHeaderBg || c.dialogBackground};border-color:{c.divider};">
    <div class="row-header-inner" style="height:{totalHeight}px;">
      {#each Array(doc.rows) as _, row}
        <div
          class="row-head-cell"
          class:row-head-active={selRange && row >= selRange.r0 && row <= selRange.r1}
          style="height:{ROW_H}px;color:{c.textSecondary};border-color:{c.divider};"
        >
          {row + 1}
        </div>
      {/each}
    </div>
  </div>

  <!-- Corpo da grelha (o "papel" de sheets) — scroll bidirecional -->
  <div
    class="grid-scroller"
    bind:this={scrollerEl}
    style="left:{ROW_HEADER_W}px;top:{HEADER_H}px;"
    on:scroll={syncHeaderScroll}
  >
    <div class="grid-canvas" style="width:{totalWidth}px;height:{totalHeight}px;background:{c.sheetCellBg};">
      {#each Array(doc.rows) as _, row}
        {#each Array(doc.cols) as __, col}
          {@const addr = cellId(row, col)}
          {@const meta = cellMeta(addr)}
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
              border-color:{c.sheetGridLine};
              font-weight:{meta.bold ? 700 : 400};
              font-style:{meta.italic ? 'italic' : 'normal'};
              text-decoration:{meta.underline ? 'underline' : 'none'};
              text-align:{meta.align || (typeof resolvedValues[addr] === 'number' ? 'right' : 'left')};
              color:{isErrorCell(addr) ? '#C42B1C' : (meta.color || c.textPrimary)};
              background:{editingAddr === addr ? c.sheetCellBg : (meta.fill || 'transparent')};
            "
            on:pointerdown={(e) => onCellPointerDown(addr, e)}
            on:pointerenter={() => onCellPointerEnter(addr)}
            on:click={() => onCellClick(addr)}
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

      <!-- Retângulo de destaque da seleção múltipla, desenhado por cima -->
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

      <!-- Contorno da célula ativa -->
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