<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import {
    loadDocument, createDocument, persistDocument, recomputeAll,
    cellId, parseCellId, downloadCsv, duplicateDocument, deleteDocument,
    getActiveSheet, addSheet, removeSheet, renameSheet, duplicateSheet, setActiveSheet,
    addChart, updateChart, moveChart, resizeChart, removeChart,
    MAX_SHEETS,
  } from '../lib/sheet-store.js';
  import { FormulaError } from '../lib/formula-engine.js';
  import { getThemeColors } from '$shared/theme.js';
  import { fluentIconUrl } from '../lib/icon-fallback.js';
  import SheetGrid from '../components/SheetGrid.svelte';
  import CellFormatBar from '../components/CellFormatBar.svelte';
  import CellNumberFormatModal from '../components/CellNumberFormatModal.svelte';
  import ColorModal from '../components/ColorModal.svelte';
  import ColorPickerModal from '../components/ColorPickerModal.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import SheetMenu from '../components/SheetMenu.svelte';
  import ChartModal from '../components/ChartModal.svelte';
  import ChartCanvas from '../components/ChartCanvas.svelte';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Sheets';
  export let appId = 'sheets';
  export let iconPath = '/icons/svg/apps/sheets.svg';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);

  // ── Documento ────────────────────────────────────────────────
  //
  // FIX (link sempre com ID + navegação atrasada + falha ao voltar):
  // esta app deixou de anunciar o ID do documento ao router (ver
  // App.svelte). O id passa a viver só aqui, tal como docId em
  // docs/pages/MainPage.svelte — criado uma vez ao montar e mantido
  // por toda a sessão de navegação dentro do sheets. Reabrir o app
  // (ou recarregar a página) volta sempre ao último documento tocado
  // via loadIndex()/mais recente, exatamente como o docs já fazia.

  let doc = null;
  let resolvedValues = {};
  let resolvedErrors = {};
  let docReady = false;
  let nameInputEl;
  let editingName = false;
  let nameDraft = '';

  // A folha (aba) atualmente ativa — é ISTO que se passa ao SheetGrid
  // no lugar de `doc`, porque o SheetGrid só entende rows/cols/cells/
  // colWidths de uma única folha, exatamente como antes das abas.
  $: activeSheet = doc ? getActiveSheet(doc) : null;

  function newDocId() {
    return 'sheet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function loadOrCreate() {
    const id = newDocId();
    let loaded = loadDocument(id);
    if (!loaded) {
      loaded = createDocument(id);
    }
    doc = loaded;
    activeAddr = 'A1';
    selectionAnchor = 'A1';
    selectionFocus = 'A1';
    recompute();
    docReady = true;
  }

  function recompute() {
    const { values, errors } = recomputeAll(doc);
    resolvedValues = values;
    resolvedErrors = errors;
  }

  // ── Persistência com debounce ───────────────────────────────

  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistDocument(doc);
      saveTimer = null;
    }, 500);
  }
  function saveImmediately() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (doc) persistDocument(doc);
  }

  // ── Undo / Redo ──────────────────────────────────────────────
  //
  // O histórico de undo/redo é POR ABA: trocar de folha não deve
  // desfazer ações da folha anterior nem vice-versa. Por isso as
  // pilhas guardam { sheetId, cells } e undo()/redo() só atuam sobre
  // entradas cujo sheetId bate com a aba ativa no momento.

  let undoStack = [];
  let redoStack = [];
  let historyTimer = null;
  const MAX_HISTORY = 60;

  function snapshotCells() {
    return { sheetId: activeSheet.id, cells: JSON.parse(JSON.stringify(activeSheet.cells)) };
  }

  function pushHistory() {
    undoStack.push(snapshotCells());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  function scheduleHistoryPush() {
    // agrupa alterações rápidas consecutivas (ex: escrever letra a letra)
    // num único ponto de undo, dando um snapshot ANTES de começar o grupo
    if (historyTimer) {
      clearTimeout(historyTimer);
    } else {
      pushHistory();
    }
    historyTimer = setTimeout(() => { historyTimer = null; }, 700);
  }

  function applyCellsToActiveSheet(cells) {
    doc = {
      ...doc,
      sheets: doc.sheets.map((s) => (s.id === activeSheet.id ? { ...s, cells } : s)),
    };
  }

  function undo() {
    // só desfaz se o topo da pilha pertencer à aba atualmente ativa
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].sheetId !== activeSheet.id) {
      // entradas de outras abas ficam intactas na pilha, só as saltamos
      // por agora — reordenar a pilha por aba tornaria undo/redo confuso
      // entre trocas de folha, por isso simplesmente não há nada para
      // desfazer NESTA aba enquanto o topo pertencer a outra.
      break;
    }
    if (undoStack.length === 0 || undoStack[undoStack.length - 1].sheetId !== activeSheet.id) return;
    redoStack.push(snapshotCells());
    const prev = undoStack.pop();
    applyCellsToActiveSheet(prev.cells);
    recompute();
    scheduleSave();
  }

  function redo() {
    if (redoStack.length === 0 || redoStack[redoStack.length - 1].sheetId !== activeSheet.id) return;
    undoStack.push(snapshotCells());
    const next = redoStack.pop();
    applyCellsToActiveSheet(next.cells);
    recompute();
    scheduleSave();
  }

  $: canUndo = undoStack.length > 0 && undoStack[undoStack.length - 1].sheetId === (activeSheet && activeSheet.id);
  $: canRedo = redoStack.length > 0 && redoStack[redoStack.length - 1].sheetId === (activeSheet && activeSheet.id);

  // ── Grid: referência ao componente e estado de seleção ──────

  let gridComp;
  let activeAddr = 'A1';
  let selectionAnchor = 'A1';
  let selectionFocus = 'A1';

  function ensureCell(addr) {
    if (!activeSheet.cells[addr]) {
      const nextCells = { ...activeSheet.cells, [addr]: { raw: '' } };
      applyCellsToActiveSheet(nextCells);
      return doc.sheets.find((s) => s.id === activeSheet.id).cells[addr];
    }
    return activeSheet.cells[addr];
  }

  function handleCellChange(e) {
    const { addr, raw } = e.detail;
    scheduleHistoryPush();
    const cells = { ...activeSheet.cells };
    if (raw === '' || raw === null || raw === undefined) {
      if (cells[addr]) {
        // mantém a formatação da célula (bold/color/etc), só limpa o conteúdo,
        // a menos que a célula não tenha nenhuma formatação — nesse caso remove
        // a entrada por completo para manter a grelha esparsa e leve.
        const meta = cells[addr];
        const hasFormatting = meta.bold || meta.italic || meta.underline || meta.align || meta.color || meta.fill || (meta.format && meta.format !== 'general');
        if (hasFormatting) {
          cells[addr] = { ...meta, raw: '' };
        } else {
          delete cells[addr];
        }
      }
    } else {
      cells[addr] = { ...(cells[addr] || {}), raw };
    }
    applyCellsToActiveSheet(cells);
    recompute();
    scheduleSave();
  }

  // ── Barra de fórmulas (topo) ─────────────────────────────────

  $: formulaBarValue = activeSheet && activeAddr ? (activeSheet.cells[activeAddr] && activeSheet.cells[activeAddr].raw !== undefined ? activeSheet.cells[activeAddr].raw : '') : '';
  let formulaBarFocused = false;
  let formulaBarDraft = '';

  function onFormulaBarFocus() {
    formulaBarFocused = true;
    formulaBarDraft = String(formulaBarValue);
  }
  function onFormulaBarInput(e) {
    formulaBarDraft = e.target.value;
  }
  function commitFormulaBar() {
    if (formulaBarFocused && activeAddr) {
      handleCellChange({ detail: { addr: activeAddr, raw: formulaBarDraft } });
    }
    formulaBarFocused = false;
  }
  function onFormulaBarKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitFormulaBar();
      e.target.blur();
    } else if (e.key === 'Escape') {
      formulaBarFocused = false;
      e.target.blur();
    }
  }

  $: activeCellMeta = activeSheet && activeAddr ? (activeSheet.cells[activeAddr] || {}) : {};
  $: activeErrorCode = activeSheet && activeAddr && resolvedValues[activeAddr] instanceof FormulaError
    ? resolvedValues[activeAddr].code
    : null;

  // ── Barra de formatação de célula ────────────────────────────

  let formatBarVisible = false;
  $: formatBarVisible = docReady; // sempre visível quando o documento está pronto (é a barra principal de ações)

  let colorModalMode = null; // 'text' | 'fill' | null
  let colorModalVisible = false;
  let colorPickerVisible = false;
  let customColors = [];
  let numFormatModalVisible = false;

  function applyMetaToSelection(patchFn) {
    const a = parseCellId(selectionAnchor);
    const b = parseCellId(selectionFocus);
    if (!a || !b) return;
    const r0 = Math.min(a.row, b.row), r1 = Math.max(a.row, b.row);
    const c0 = Math.min(a.col, b.col), c1 = Math.max(a.col, b.col);
    pushHistoryIfNeededOnce();
    const cells = { ...activeSheet.cells };
    for (let r = r0; r <= r1; r++) {
      for (let col = c0; col <= c1; col++) {
        const addr = cellId(r, col);
        const meta = { ...(cells[addr] || { raw: '' }) };
        patchFn(meta);
        cells[addr] = meta;
      }
    }
    applyCellsToActiveSheet(cells);
    recompute();
    scheduleSave();
  }

  let historyPushedForBatch = false;
  function pushHistoryIfNeededOnce() {
    if (!historyPushedForBatch) {
      pushHistory();
      historyPushedForBatch = true;
      setTimeout(() => { historyPushedForBatch = false; }, 50);
    }
  }

  function handleFormatAction(e) {
    const action = e.detail;
    const id = typeof action === 'string' ? action : action.id;

    if (id === 'undo') { undo(); return; }
    if (id === 'redo') { redo(); return; }
    if (id === 'done') {
      // fecha edição ativa se estiver aberta, sem esconder a barra
      // (a barra em sheets é persistente, ao contrário do texto rico)
      if (gridComp) gridComp.editActiveCell && false;
      return;
    }
    if (id === 'bold') {
      applyMetaToSelection((meta) => { meta.bold = !meta.bold; });
      return;
    }
    if (id === 'italic') {
      applyMetaToSelection((meta) => { meta.italic = !meta.italic; });
      return;
    }
    if (id === 'underline') {
      applyMetaToSelection((meta) => { meta.underline = !meta.underline; });
      return;
    }
    if (id === 'align') {
      const value = action.value;
      applyMetaToSelection((meta) => { meta.align = value; });
      return;
    }
    if (id === 'textcolor') {
      colorModalMode = 'text';
      colorModalVisible = true;
      return;
    }
    if (id === 'fillcolor') {
      colorModalMode = 'fill';
      colorModalVisible = true;
      return;
    }
    if (id === 'numformat') {
      numFormatModalVisible = true;
      return;
    }
    if (id === 'insertrow') {
      insertRowAtActive();
      return;
    }
    if (id === 'insertcol') {
      insertColAtActive();
      return;
    }
    if (id === 'deleterow') {
      deleteRowAtActive();
      return;
    }
    if (id === 'deletecol') {
      deleteColAtActive();
      return;
    }
    if (id === 'insertchart') {
      openChartModalForInsert();
      return;
    }
  }

  function handleColorSelect(e) {
    const hex = e.detail;
    if (colorModalMode === 'text') {
      applyMetaToSelection((meta) => { meta.color = hex; });
    } else if (colorModalMode === 'fill') {
      applyMetaToSelection((meta) => { meta.fill = hex; });
    }
    colorModalVisible = false;
    colorModalMode = null;
  }
  function handleAddCustomColor() {
    colorModalVisible = false;
    colorPickerVisible = true;
  }
  function handlePickerConfirm(e) {
    const hex = e.detail;
    if (!customColors.includes(hex)) customColors = [...customColors, hex];
    colorPickerVisible = false;
    if (colorModalMode === 'text') {
      applyMetaToSelection((meta) => { meta.color = hex; });
    } else if (colorModalMode === 'fill') {
      applyMetaToSelection((meta) => { meta.fill = hex; });
    }
    colorModalMode = null;
  }
  function handlePickerCancel() {
    colorPickerVisible = false;
    colorModalVisible = true; // volta ao seletor de presets
  }
  function handleNumFormatSelect(e) {
    const format = e.detail;
    applyMetaToSelection((meta) => { meta.format = format; });
    numFormatModalVisible = false;
  }

  // ── Inserir/apagar linhas e colunas ──────────────────────────
  //
  // NOTA IMPORTANTE: esta operação reendereça as CHAVES das células
  // na grelha esparsa (ex: A2 passa a A3), mas NÃO reescreve o texto
  // das fórmulas guardadas noutras células que referenciam os
  // endereços deslocados. Numa folha pequena isto raramente é
  // notado, mas é uma limitação conhecida desta primeira versão
  // (um "sheets" completo tipo Excel também ajusta o texto das
  // fórmulas — fica como possível melhoria futura).

  function reindexCells(transformFn) {
    const next = {};
    for (const [addr, val] of Object.entries(activeSheet.cells)) {
      const pos = parseCellId(addr);
      if (!pos) continue;
      const result = transformFn(pos.row, pos.col);
      if (result === null) continue; // célula removida pela operação
      next[cellId(result.row, result.col)] = val;
    }
    return next;
  }

  function patchActiveSheet(patch) {
    doc = {
      ...doc,
      sheets: doc.sheets.map((s) => (s.id === activeSheet.id ? { ...s, ...patch } : s)),
    };
  }

  function insertRowAtActive() {
    const pos = parseCellId(activeAddr);
    if (!pos) return;
    pushHistory();
    const cells = reindexCells((row, col) => ({ row: row >= pos.row ? row + 1 : row, col }));
    patchActiveSheet({ cells, rows: activeSheet.rows + 1 });
    recompute();
    scheduleSave();
  }
  function insertColAtActive() {
    const pos = parseCellId(activeAddr);
    if (!pos) return;
    pushHistory();
    const cells = reindexCells((row, col) => ({ row, col: col >= pos.col ? col + 1 : col }));
    patchActiveSheet({ cells, cols: activeSheet.cols + 1 });
    recompute();
    scheduleSave();
  }
  function deleteRowAtActive() {
    const pos = parseCellId(activeAddr);
    if (!pos || activeSheet.rows <= 1) return;
    pushHistory();
    const cells = reindexCells((row, col) => {
      if (row === pos.row) return null;
      return { row: row > pos.row ? row - 1 : row, col };
    });
    patchActiveSheet({ cells, rows: activeSheet.rows - 1 });
    recompute();
    scheduleSave();
  }
  function deleteColAtActive() {
    const pos = parseCellId(activeAddr);
    if (!pos || activeSheet.cols <= 1) return;
    pushHistory();
    const cells = reindexCells((row, col) => {
      if (col === pos.col) return null;
      return { row, col: col > pos.col ? col - 1 : col };
    });
    patchActiveSheet({ cells, cols: activeSheet.cols - 1 });
    recompute();
    scheduleSave();
  }

  // ── Gráficos ──────────────────────────────────────────────────
  //
  // Espelham o padrão imutável já usado por abas/histórico: cada
  // ação chama uma função pura de sheet-store.js que devolve um NOVO
  // `doc`, seguido de scheduleSave(). Gráficos NÃO entram no
  // undo/redo de células (são objetos flutuantes, não conteúdo de
  // célula) — mover/redimensionar um gráfico não deve desfazer texto
  // escrito na grelha, e vice-versa.

  let chartModalVisible = false;
  let editingChartId = null;
  let selectedChartId = null;

  function activeSelectionRange() {
    const a = parseCellId(selectionAnchor);
    const b = parseCellId(selectionFocus);
    if (!a || !b) return '';
    const r0 = Math.min(a.row, b.row), r1 = Math.max(a.row, b.row);
    const c0 = Math.min(a.col, b.col), c1 = Math.max(a.col, b.col);
    return `${cellId(r0, c0)}:${cellId(r1, c1)}`;
  }

  function openChartModalForInsert() {
    editingChartId = null;
    chartModalVisible = true;
  }
  function openChartModalForEdit(chartId) {
    editingChartId = chartId;
    chartModalVisible = true;
  }
  $: editingChartObj = editingChartId && activeSheet
    ? (activeSheet.charts || []).find((ch) => ch.id === editingChartId)
    : null;
  $: chartDefaultRange = (() => {
    const sel = activeSelectionRange();
    // exige pelo menos 2 células selecionadas para servir de range por defeito
    if (!sel) return '';
    const [from, to] = sel.split(':');
    return from === to ? '' : sel;
  })();

  function handleChartConfirm(e) {
    const cfg = e.detail;
    if (editingChartId) {
      doc = updateChart(doc, activeSheet.id, editingChartId, cfg);
    } else {
      doc = addChart(doc, activeSheet.id, cfg);
    }
    chartModalVisible = false;
    editingChartId = null;
    scheduleSave();
  }
  function handleChartSelect(chartId) {
    selectedChartId = chartId;
  }
  function handleChartMove(e) {
    const { id, x, y } = e.detail;
    doc = moveChart(doc, activeSheet.id, id, x, y);
  }
  function handleChartResize(e) {
    const { id, w, h } = e.detail;
    doc = resizeChart(doc, activeSheet.id, id, w, h);
  }
  function handleChartMoveEnd() {
    scheduleSave();
  }
  function handleRemoveSelectedChart() {
    if (!selectedChartId) return;
    doc = removeChart(doc, activeSheet.id, selectedChartId);
    selectedChartId = null;
    scheduleSave();
  }
  function deselectChartOnGridTap() {
    if (selectedChartId) selectedChartId = null;
  }

  // ── Abas (folhas) ─────────────────────────────────────────────

  let renamingSheetId = null;
  let renameDraft = '';
  let renameInputEl;

  function switchToSheet(sheetId) {
    if (sheetId === doc.activeSheetId) return;
    saveImmediately();
    doc = setActiveSheet(doc, sheetId);
    activeAddr = 'A1';
    selectionAnchor = 'A1';
    selectionFocus = 'A1';
    formulaBarFocused = false;
    selectedChartId = null;
    recompute();
    scheduleSave();
  }

  function handleAddSheet() {
    if (doc.sheets.length >= MAX_SHEETS) return;
    saveImmediately();
    doc = addSheet(doc);
    activeAddr = 'A1';
    selectionAnchor = 'A1';
    selectionFocus = 'A1';
    recompute();
    scheduleSave();
  }

  function handleDuplicateSheet(sheetId) {
    if (doc.sheets.length >= MAX_SHEETS) return;
    saveImmediately();
    doc = duplicateSheet(doc, sheetId);
    activeAddr = 'A1';
    selectionAnchor = 'A1';
    selectionFocus = 'A1';
    recompute();
    scheduleSave();
  }

  let confirmDeleteSheetId = null;
  function handleRequestDeleteSheet(sheetId) {
    if (doc.sheets.length <= 1) return; // botão já vem desabilitado neste caso, é só defesa extra
    confirmDeleteSheetId = sheetId;
  }
  function confirmDeleteSheet() {
    if (!confirmDeleteSheetId) return;
    doc = removeSheet(doc, confirmDeleteSheetId);
    confirmDeleteSheetId = null;
    activeAddr = 'A1';
    selectionAnchor = 'A1';
    selectionFocus = 'A1';
    recompute();
    scheduleSave();
  }

  async function startRenameSheet(sheetId) {
    const sheet = doc.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    renamingSheetId = sheetId;
    renameDraft = sheet.name;
    await tick();
    renameInputEl && renameInputEl.select();
  }
  function commitRenameSheet() {
    if (renamingSheetId) {
      doc = renameSheet(doc, renamingSheetId, renameDraft);
      scheduleSave();
    }
    renamingSheetId = null;
  }

  // ── Nome do documento (no appbar) ────────────────────────────

  async function startEditName() {
    editingName = true;
    nameDraft = doc.name;
    await tick();
    nameInputEl && nameInputEl.select();
  }
  function commitName() {
    editingName = false;
    const trimmed = nameDraft.trim();
    doc = { ...doc, name: trimmed || 'Nova pasta de cálculo' };
    saveImmediately();
  }

  // ── Menu (⋮) — duplicar / exportar CSV / apagar ──────────────
  // MESMO padrão local simples do DocMenu em docs: sem history push,
  // só estado local (menuVisible) e overlay de clique-fora.

  let menuVisible = false;
  let menuAnchor = { top: 56, right: 12 };
  let confirmDeleteVisible = false;
  let confirmLoading = false;

  function openMenu() {
    menuVisible = true;
  }

  // FIX (padrão igual ao duplicateDoc() do docs): duplicar já não
  // navega para o novo documento. Só grava a cópia no localStorage
  // e o índice; a sessão de edição continua no documento atual. Isto
  // remove a última chamada que ainda dependia de um resourceId/URL.
  function handleMenuSelect(e) {
    const id = e.detail;
    menuVisible = false;
    if (id === 'duplicate') {
      saveImmediately();
      duplicateDocument(doc.id);
      return;
    }
    if (id === 'export') {
      downloadCsv(doc, resolvedValues);
      return;
    }
    if (id === 'delete') {
      confirmDeleteVisible = true;
      return;
    }
  }
  function confirmDelete() {
    confirmLoading = true;
    deleteDocument(doc.id);
    setTimeout(() => {
      confirmLoading = false;
      confirmDeleteVisible = false;
      dispatch('nav', { to: 'home' });
    }, 200);
  }

  // ── Navegação para trás ──────────────────────────────────────

  function goBack() {
    saveImmediately();
    dispatch('nav', { to: 'home' });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────

  onMount(() => {
    loadOrCreate();
    const beforeUnload = () => { if (doc) saveImmediately(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  });

  onDestroy(() => {
    if (saveTimer) { clearTimeout(saveTimer); if (doc) persistDocument(doc); }
  });
</script>

<div class="page-shell" style="background:{c.background};">
  <!-- Appbar: SEMPRE branco/superfície sólida (dialogBackground) — NUNCA
       o mesmo tom do fundo geral da página, senão perde-se o contraste
       de "barra de ferramentas" que o Excel/Office sempre tem. -->
  <div class="appbar" style="background:{c.dialogBackground};border-color:{c.divider};">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={goBack} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('back')}');-webkit-mask-image:url('{fluentIconUrl('back')}');background:{c.iconTint};width:24px;height:24px;"></span>
    </button>

    <div class="appbar-title">
      {#if editingName}
        <input
          class="name-input"
          bind:this={nameInputEl}
          bind:value={nameDraft}
          style="color:{c.textPrimary}"
          on:blur={commitName}
          on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); } else if (e.key === 'Escape') { editingName = false; } }}
        />
      {:else}
        <button class="name-display" style="color:{c.textPrimary}" on:click={startEditName}>
          {doc ? doc.name : ''}
        </button>
      {/if}
    </div>

    {#if selectedChartId}
      <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => openChartModalForEdit(selectedChartId)} aria-label="Editar gráfico">
        <span class="icon-mask" style="mask-image:url('{fluentIconUrl('settings')}');-webkit-mask-image:url('{fluentIconUrl('settings')}');background:{c.iconTint};width:24px;height:24px;"></span>
      </button>
      <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={handleRemoveSelectedChart} aria-label="Remover gráfico">
        <span class="icon-mask" style="mask-image:url('{fluentIconUrl('delete')}');-webkit-mask-image:url('{fluentIconUrl('delete')}');background:#C42B1C;width:24px;height:24px;"></span>
      </button>
    {/if}

    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={openMenu} aria-label="Mais opções">
      <span class="icon-mask" style="mask-image:url('{fluentIconUrl('more')}');-webkit-mask-image:url('{fluentIconUrl('more')}');background:{c.iconTint};width:24px;height:24px;"></span>
    </button>
  </div>

  <!-- Barra de fórmulas: mostra endereço da célula ativa + conteúdo bruto
       editável. Estilo Excel real: SEM texto de exemplo/placeholder no
       campo — no Office a fx-bar fica simplesmente vazia e em branco
       quando a célula não tem conteúdo, nunca mostra um texto de ajuda
       tipo "Valor ou fórmula (ex: ...)" sobreposto ao campo. -->
  {#if docReady}
    <div class="formula-bar" style="background:{c.dialogBackground};border-color:{c.divider};">
      <div class="fx-addr" style="color:{c.textSecondary};border-color:{c.divider};">{activeAddr}</div>
      <div class="fx-sign" style="color:{c.textSecondary};">ƒx</div>
      <input
        class="fx-input"
        style="color:{c.textPrimary};"
        value={formulaBarFocused ? formulaBarDraft : formulaBarValue}
        on:focus={onFormulaBarFocus}
        on:input={onFormulaBarInput}
        on:blur={commitFormulaBar}
        on:keydown={onFormulaBarKeydown}
      />
      {#if activeErrorCode}
        <div class="fx-error-badge" title={activeErrorCode}>{activeErrorCode}</div>
      {/if}
    </div>
  {/if}

  <!-- Grelha (o "papel" dedicado a sheets) — recebe a FOLHA ATIVA,
       não o documento inteiro, porque o SheetGrid só entende
       rows/cols/cells/colWidths de uma única folha. Os gráficos são
       desenhados por cima, em camada absoluta, ancorados ao mesmo
       grid-shell (tal como objetos flutuantes no Excel/Word). -->
  {#if docReady && activeSheet}
    <div class="grid-with-charts">
      <SheetGrid
        bind:this={gridComp}
        doc={activeSheet}
        {resolvedValues}
        {c}
        bind:activeAddr
        bind:selectionAnchor
        bind:selectionFocus
        on:cellchange={handleCellChange}
        on:pointerdown={deselectChartOnGridTap}
      />
      {#each (activeSheet.charts || []) as chart (chart.id)}
        <ChartCanvas
          {chart}
          {resolvedValues}
          {c}
          selected={selectedChartId === chart.id}
          on:select={(e) => handleChartSelect(e.detail)}
          on:move={handleChartMove}
          on:resize={handleChartResize}
          on:pointerup={handleChartMoveEnd}
        />
      {/each}
    </div>
  {/if}

  <!-- Barra de abas (tabs) — estilo Excel: scroll horizontal, aba
       ativa destacada com a cor primária, "+" para adicionar no fim. -->
  {#if docReady && doc}
    <div class="sheet-tabs" style="background:{c.dialogBackground};border-color:{c.divider};">
      <div class="sheet-tabs-scroll">
        {#each doc.sheets as sheet (sheet.id)}
          <div class="sheet-tab-wrap">
            {#if renamingSheetId === sheet.id}
              <input
                class="sheet-tab-input"
                bind:this={renameInputEl}
                bind:value={renameDraft}
                style="color:{c.primary};border-color:{c.primary};"
                on:blur={commitRenameSheet}
                on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRenameSheet(); } else if (e.key === 'Escape') { renamingSheetId = null; } }}
              />
            {:else}
              <button
                class="sheet-tab"
                class:sheet-tab-active={sheet.id === doc.activeSheetId}
                style={sheet.id === doc.activeSheetId
                  ? `color:${c.primary};border-color:${c.primary};background:${c.appbarBtnBgActive};`
                  : `color:${c.textSecondary};border-color:transparent;`}
                on:click={() => switchToSheet(sheet.id)}
                on:dblclick={() => startRenameSheet(sheet.id)}
              >
                {sheet.name}
              </button>
            {/if}
          </div>
        {/each}
        <button
          class="sheet-tab-add"
          style="color:{c.textSecondary};"
          on:click={handleAddSheet}
          disabled={doc.sheets.length >= MAX_SHEETS}
          aria-label="Nova folha"
        >
          <span class="icon-mask" style="mask-image:url('{fluentIconUrl('add')}');-webkit-mask-image:url('{fluentIconUrl('add')}');background:{c.textSecondary};width:16px;height:16px;"></span>
        </button>
      </div>

      <!-- Ações da aba ativa: duplicar / apagar — só a aba corrente,
           mantém a barra compacta em vez de um menu de contexto por
           aba (que em mobile, com toques, é mais atrito que ajuda). -->
      {#if activeSheet}
        <div class="sheet-tab-actions">
          <button
            class="sheet-tab-action-btn"
            style="background:{c.appbarBtnBg}"
            on:click={() => handleDuplicateSheet(activeSheet.id)}
            disabled={doc.sheets.length >= MAX_SHEETS}
            aria-label="Duplicar folha"
          >
            <span class="icon-mask" style="mask-image:url('{fluentIconUrl('duplicate')}');-webkit-mask-image:url('{fluentIconUrl('duplicate')}');background:{c.iconTint};width:16px;height:16px;"></span>
          </button>
          <button
            class="sheet-tab-action-btn"
            style="background:{c.appbarBtnBg}"
            on:click={() => handleRequestDeleteSheet(activeSheet.id)}
            disabled={doc.sheets.length <= 1}
            aria-label="Apagar folha"
          >
            <span class="icon-mask" style="mask-image:url('{fluentIconUrl('delete')}');-webkit-mask-image:url('{fluentIconUrl('delete')}');background:{doc.sheets.length <= 1 ? c.textSecondary : '#C42B1C'};width:16px;height:16px;"></span>
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Espaço reservado para a barra de formatação fixa no rodapé -->
  {#if docReady}
    <div class="format-bar-spacer"></div>
  {/if}
</div>

<!-- Barra de formatação de célula (substitui o BottomToolbar de texto rico) -->
<CellFormatBar
  {c}
  visible={formatBarVisible}
  activeMeta={activeCellMeta}
  {canUndo}
  {canRedo}
  on:action={handleFormatAction}
/>

<!-- Modais -->
<ColorModal
  visible={colorModalVisible}
  {c}
  {customColors}
  title={colorModalMode === 'fill' ? 'Cor de preenchimento' : 'Cor do texto'}
  on:select={handleColorSelect}
  on:addcolor={handleAddCustomColor}
  on:close={() => { colorModalVisible = false; colorModalMode = null; }}
/>

<ColorPickerModal
  visible={colorPickerVisible}
  {c}
  on:confirm={handlePickerConfirm}
  on:cancel={handlePickerCancel}
/>

<CellNumberFormatModal
  visible={numFormatModalVisible}
  {c}
  currentFormat={activeCellMeta.format || 'general'}
  on:select={handleNumFormatSelect}
  on:close={() => { numFormatModalVisible = false; }}
/>

<ChartModal
  visible={chartModalVisible}
  {c}
  defaultRange={chartDefaultRange}
  editingChart={editingChartObj}
  on:confirm={handleChartConfirm}
  on:close={() => { chartModalVisible = false; editingChartId = null; }}
/>

<SheetMenu
  visible={menuVisible}
  anchor={menuAnchor}
  {c}
  on:select={handleMenuSelect}
  on:close={() => { menuVisible = false; }}
/>

<ConfirmDialog
  visible={confirmDeleteVisible}
  {c}
  message="Apagar esta folha de cálculo? Esta ação não pode ser desfeita."
  confirmLabel="Apagar"
  loading={confirmLoading}
  on:cancel={() => { confirmDeleteVisible = false; }}
  on:confirm={confirmDelete}
/>

<ConfirmDialog
  visible={!!confirmDeleteSheetId}
  {c}
  message="Apagar esta folha? Todas as células e formatação desta aba serão perdidas."
  confirmLabel="Apagar"
  loading={false}
  on:cancel={() => { confirmDeleteSheetId = null; }}
  on:confirm={confirmDeleteSheet}
/>

<style>
  .page-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .appbar {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px;
    border-bottom: 1px solid;
    flex-shrink: 0;
  }
  .appbar-btn {
    width: 38px; height: 38px; border: none; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), background .14s ease;
  }
  .appbar-btn:active { transform: scale(0.88); }
  .appbar-title { flex: 1; min-width: 0; display: flex; }
  .name-display {
    background: none; border: none; font-size: 16px; font-weight: 700;
    padding: 6px 10px; border-radius: 10px; cursor: pointer; text-align: left;
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .name-display:active { background: rgba(127,127,127,0.10); }
  .name-input {
    width: 100%; background: none; border: none; outline: none;
    font-size: 16px; font-weight: 700; padding: 6px 10px; font-family: inherit;
  }

  .formula-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid;
    flex-shrink: 0;
  }
  .fx-addr {
    font-size: 12px; font-weight: 700; font-family: 'SF Mono', 'Courier New', monospace;
    padding: 5px 8px; border-radius: 8px; border: 1px solid;
    min-width: 44px; text-align: center; flex-shrink: 0;
  }
  .fx-sign { font-size: 13px; font-style: italic; font-weight: 700; flex-shrink: 0; opacity: 0.7; }
  .fx-input {
    flex: 1; min-width: 0; border: none; outline: none; background: none;
    font-size: 14px; font-family: 'SF Mono', 'Courier New', monospace; padding: 6px 4px;
  }
  .fx-error-badge {
    font-size: 11px; font-weight: 700; color: #C42B1C;
    background: rgba(196,43,28,0.12); padding: 3px 7px; border-radius: 6px;
    flex-shrink: 0;
  }

  .grid-with-charts {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .grid-with-charts > :global(.grid-shell) {
    position: absolute;
    inset: 0;
  }

  .sheet-tabs {
    display: flex; align-items: center; gap: 4px;
    padding: 4px 6px;
    border-top: 1px solid;
    flex-shrink: 0;
  }
  .sheet-tabs-scroll {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px;
    overflow-x: auto; scrollbar-width: none;
  }
  .sheet-tabs-scroll::-webkit-scrollbar { display: none; }
  .sheet-tab-wrap { flex-shrink: 0; }
  .sheet-tab {
    display: block; flex-shrink: 0;
    font-size: 13px; font-weight: 600;
    padding: 7px 14px; border-radius: 10px 10px 0 0;
    border: none; border-bottom: 2px solid;
    background: none; cursor: pointer; white-space: nowrap;
    max-width: 140px; overflow: hidden; text-overflow: ellipsis;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, color .12s ease;
  }
  .sheet-tab:active { transform: scale(0.97); }
  .sheet-tab-input {
    font-size: 13px; font-weight: 600;
    padding: 6px 10px; border-radius: 8px;
    border: 1.5px solid; outline: none; background: none;
    width: 110px; font-family: inherit;
  }
  .sheet-tab-add {
    flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
    border: none; background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .sheet-tab-add:active { transform: scale(0.9); }
  .sheet-tab-add:disabled { opacity: 0.35; cursor: default; }

  .sheet-tab-actions {
    display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    padding-left: 4px; border-left: 1px solid rgba(127,127,127,0.16);
  }
  .sheet-tab-action-btn {
    width: 30px; height: 30px; border: none; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .12s ease;
  }
  .sheet-tab-action-btn:active { transform: scale(0.88); }
  .sheet-tab-action-btn:disabled { opacity: 0.35; cursor: default; }

  .format-bar-spacer {
    height: calc(52px + env(safe-area-inset-bottom, 0px));
    flex-shrink: 0;
  }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
</style>