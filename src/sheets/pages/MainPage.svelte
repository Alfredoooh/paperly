<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { localIconPath } from '$shared/local-icon.js';
  import {
    loadDocument, createDocument, persistDocument, recomputeAll,
    cellId, parseCellId, downloadCsv, duplicateDocument, deleteDocument,
    getActiveSheet, addSheet, removeSheet, renameSheet, duplicateSheet, setActiveSheet,
    addChart, updateChart, moveChart, resizeChart, removeChart,
    addImage, updateImage, moveImage, resizeImage, removeImage,
    MAX_SHEETS,
  } from '../lib/sheet-store.js';
  import { FormulaError } from '../lib/formula-engine.js';
  import { getThemeColors } from '$shared/theme.js';
  import SheetGrid from '../components/SheetGrid.svelte';
  import CellFormatBar from '../components/CellFormatBar.svelte';
  import CellNumberFormatModal from '../components/CellNumberFormatModal.svelte';
  import ColorModal from '../components/ColorModal.svelte';
  import ColorPickerModal from '../components/ColorPickerModal.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import SheetMenu from '../components/SheetMenu.svelte';
  import ChartModal from '../components/ChartModal.svelte';
  import ChartCanvas from '../components/ChartCanvas.svelte';
  import FloatingImage from '../components/FloatingImage.svelte';
  import SheetZoom from '../widgets/SheetZoom.svelte';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Sheets';
  export let appId = 'sheets';
  export let iconPath = '/icons/svg/apps/sheets.svg';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);

  // ── Documento ────────────────────────────────────────────────

  let doc = null;
  let resolvedValues = {};
  let resolvedErrors = {};
  let docReady = false;

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

  function handleCellChange(e) {
    const { addr, raw } = e.detail;
    scheduleHistoryPush();
    const cells = { ...activeSheet.cells };
    if (raw === '' || raw === null || raw === undefined) {
      if (cells[addr]) {
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

  // ── Barra de fórmulas (agora ANCORADA ao rodapé, logo acima da
  //    bottom toolbar — NUNCA no topo/appbar. O appbar superior fica
  //    limpo, só com ações de navegação/undo/redo/check, tal como
  //    pedido explicitamente. ─────────────────────────────────────

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

  // ── Barra de formatação de célula (bottom toolbar) ────────────

  let formatBarVisible = false;
  $: formatBarVisible = docReady;

  let colorModalMode = null;
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

    if (id === 'bold') { applyMetaToSelection((meta) => { meta.bold = !meta.bold; }); return; }
    if (id === 'italic') { applyMetaToSelection((meta) => { meta.italic = !meta.italic; }); return; }
    if (id === 'underline') { applyMetaToSelection((meta) => { meta.underline = !meta.underline; }); return; }
    if (id === 'align') { const value = action.value; applyMetaToSelection((meta) => { meta.align = value; }); return; }
    if (id === 'textcolor') { colorModalMode = 'text'; colorModalVisible = true; return; }
    if (id === 'fillcolor') { colorModalMode = 'fill'; colorModalVisible = true; return; }
    if (id === 'numformat') { numFormatModalVisible = true; return; }
    if (id === 'insertrow') { insertRowAtActive(); return; }
    if (id === 'insertcol') { insertColAtActive(); return; }
    if (id === 'deleterow') { deleteRowAtActive(); return; }
    if (id === 'deletecol') { deleteColAtActive(); return; }
    if (id === 'insertchart') { openChartModalForInsert(); return; }
    if (id === 'insertimage') { triggerImagePicker(); return; }
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
    colorModalVisible = true;
  }
  function handleNumFormatSelect(e) {
    const format = e.detail;
    applyMetaToSelection((meta) => { meta.format = format; });
    numFormatModalVisible = false;
  }

  // ── Inserir/apagar linhas e colunas ──────────────────────────

  function reindexCells(transformFn) {
    const next = {};
    for (const [addr, val] of Object.entries(activeSheet.cells)) {
      const pos = parseCellId(addr);
      if (!pos) continue;
      const result = transformFn(pos.row, pos.col);
      if (result === null) continue;
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

  // ── Zoom da folha (diminuir/ampliar o "papel") ───────────────

  let sheetZoomScale = 1;
  function handleZoomChange(e) {
    sheetZoomScale = e.detail.scale;
  }

  // ── Gráficos ──────────────────────────────────────────────────

  let chartModalVisible = false;
  let editingChartId = null;
  let selectedChartId = null;
  let selectedImageId = null;

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
    selectedImageId = null;
  }
  function handleChartMove(e) {
    const { id, x, y } = e.detail;
    doc = moveChart(doc, activeSheet.id, id, x, y);
  }
  function handleChartResize(e) {
    const { id, w, h } = e.detail;
    doc = resizeChart(doc, activeSheet.id, id, w, h);
  }
  function handleGestureEnd() {
    scheduleSave();
  }
  function handleRemoveSelectedChart() {
    if (!selectedChartId) return;
    doc = removeChart(doc, activeSheet.id, selectedChartId);
    selectedChartId = null;
    scheduleSave();
  }

  // ── Imagens flutuantes ────────────────────────────────────────

  let fileInputEl;
  function triggerImagePicker() {
    fileInputEl && fileInputEl.click();
  }
  function onImageFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      doc = addImage(doc, activeSheet.id, {
        src: reader.result,
        x: 60, y: 60, w: 200, h: 200,
      });
      scheduleSave();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function handleImageSelect(imageId) {
    selectedImageId = imageId;
    selectedChartId = null;
  }
  function handleImageMove(e) {
    const { id, x, y } = e.detail;
    doc = moveImage(doc, activeSheet.id, id, x, y);
  }
  function handleImageResize(e) {
    const { id, w, h } = e.detail;
    doc = resizeImage(doc, activeSheet.id, id, w, h);
  }
  function handleRemoveSelectedImage() {
    if (!selectedImageId) return;
    doc = removeImage(doc, activeSheet.id, selectedImageId);
    selectedImageId = null;
    scheduleSave();
  }
  function deselectFloatingOnGridTap() {
    if (selectedChartId) selectedChartId = null;
    if (selectedImageId) selectedImageId = null;
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
    selectedImageId = null;
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
    if (doc.sheets.length <= 1) return;
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

  // ── Nome do documento — vive no SheetMenu, não no appbar ──────

  function handleRenameDoc(e) {
    const trimmed = (e.detail || '').trim();
    doc = { ...doc, name: trimmed || 'Nova pasta de cálculo' };
    saveImmediately();
  }

  // ── Menu (⋮) ──────────────────────────────────────────────────

  let menuVisible = false;
  let confirmDeleteVisible = false;
  let confirmLoading = false;

  function openMenu() {
    menuVisible = true;
  }

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
  <!-- Appbar: SEM nome/título do documento (isso agora vive no
       SheetMenu). Botão esquerdo = voltar. Grupo direito = undo,
       redo, check/concluir, mais opções — todos SEM fundo/container,
       tal como pedido explicitamente. -->
  <div class="appbar" style="background:{c.dialogBackground};border-color:{c.divider};">
    <button class="appbar-btn" on:click={goBack} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_left_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_left_24_regular')}');background:{c.iconTint};"></span>
    </button>

    <div class="appbar-spacer"></div>

    {#if selectedChartId}
      <button class="appbar-btn" on:click={() => openChartModalForEdit(selectedChartId)} aria-label="Editar gráfico">
        <span class="icon-mask" style="mask-image:url('{localIconPath('settings_24_regular')}');-webkit-mask-image:url('{localIconPath('settings_24_regular')}');background:{c.iconTint};"></span>
      </button>
      <button class="appbar-btn" on:click={handleRemoveSelectedChart} aria-label="Remover gráfico">
        <span class="icon-mask" style="mask-image:url('{localIconPath('delete_24_regular')}');-webkit-mask-image:url('{localIconPath('delete_24_regular')}');background:var(--danger);"></span>
      </button>
    {:else if selectedImageId}
      <button class="appbar-btn" on:click={handleRemoveSelectedImage} aria-label="Remover imagem">
        <span class="icon-mask" style="mask-image:url('{localIconPath('delete_24_regular')}');-webkit-mask-image:url('{localIconPath('delete_24_regular')}');background:var(--danger);"></span>
      </button>
    {/if}

    <button class="appbar-btn" disabled={!canUndo} on:click={undo} aria-label="Desfazer">
      <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_undo_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_undo_24_regular')}');background:{c.iconTint};opacity:{canUndo ? 1 : 0.32};"></span>
    </button>
    <button class="appbar-btn" disabled={!canRedo} on:click={redo} aria-label="Refazer">
      <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_redo_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_redo_24_regular')}');background:{c.iconTint};opacity:{canRedo ? 1 : 0.32};"></span>
    </button>
    <button class="appbar-btn" on:click={goBack} aria-label="Concluir">
      <span class="icon-mask" style="mask-image:url('{localIconPath('checkmark_24_regular')}');-webkit-mask-image:url('{localIconPath('checkmark_24_regular')}');background:{c.iconTint};"></span>
    </button>
    <button class="appbar-btn" on:click={openMenu} aria-label="Mais opções">
      <span class="icon-mask" style="mask-image:url('{localIconPath('more_vertical_24_regular')}');-webkit-mask-image:url('{localIconPath('more_vertical_24_regular')}');background:{c.iconTint};"></span>
    </button>
  </div>

  <!-- Grelha (com zoom via SheetZoom) + gráficos/imagens flutuantes
       por cima, em camada absoluta ancorada ao mesmo grid-with-floats. -->
  {#if docReady && activeSheet}
    <div class="grid-with-floats">
      <SheetZoom bind:scale={sheetZoomScale} minScale={0.5} maxScale={3} on:zoomchange={handleZoomChange}>
        <SheetGrid
          bind:this={gridComp}
          doc={activeSheet}
          {resolvedValues}
          {c}
          bind:activeAddr
          bind:selectionAnchor
          bind:selectionFocus
          on:cellchange={handleCellChange}
        />
        {#each (activeSheet.charts || []) as chart (chart.id)}
          <ChartCanvas
            {chart}
            {resolvedValues}
            {c}
            selected={selectedChartId === chart.id}
            scaleFactor={sheetZoomScale}
            on:select={(e) => handleChartSelect(e.detail)}
            on:move={handleChartMove}
            on:resize={handleChartResize}
            on:gestureend={handleGestureEnd}
          />
        {/each}
        {#each (activeSheet.images || []) as image (image.id)}
          <FloatingImage
            {image}
            {c}
            selected={selectedImageId === image.id}
            scaleFactor={sheetZoomScale}
            on:select={(e) => handleImageSelect(e.detail)}
            on:move={handleImageMove}
            on:resize={handleImageResize}
            on:gestureend={handleGestureEnd}
          />
        {/each}
      </SheetZoom>
    </div>
  {/if}

  <input
    type="file"
    accept="image/*"
    bind:this={fileInputEl}
    on:change={onImageFileSelected}
    style="display:none;"
  />

  <!-- Barra de abas (tabs) -->
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
          on:click={handleAddSheet}
          disabled={doc.sheets.length >= MAX_SHEETS}
          aria-label="Nova folha"
        >
          <span class="icon-mask" style="mask-image:url('{localIconPath('add_24_regular')}');-webkit-mask-image:url('{localIconPath('add_24_regular')}');background:{c.textSecondary};width:18px;height:18px;"></span>
        </button>
      </div>

      {#if activeSheet}
        <div class="sheet-tab-actions">
          <button
            class="sheet-tab-action-btn"
            on:click={() => handleDuplicateSheet(activeSheet.id)}
            disabled={doc.sheets.length >= MAX_SHEETS}
            aria-label="Duplicar folha"
          >
            <span class="icon-mask" style="mask-image:url('{localIconPath('copy_24_regular')}');-webkit-mask-image:url('{localIconPath('copy_24_regular')}');background:{c.iconTint};width:18px;height:18px;"></span>
          </button>
          <button
            class="sheet-tab-action-btn"
            on:click={() => handleRequestDeleteSheet(activeSheet.id)}
            disabled={doc.sheets.length <= 1}
            aria-label="Apagar folha"
          >
            <span class="icon-mask" style="mask-image:url('{localIconPath('delete_24_regular')}');-webkit-mask-image:url('{localIconPath('delete_24_regular')}');background:{doc.sheets.length <= 1 ? c.textSecondary : 'var(--danger)'};width:18px;height:18px;"></span>
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Barra de fórmulas: ANCORADA AO RODAPÉ, logo acima do bottom
       toolbar — NUNCA no topo. Fica visível só quando uma célula
       está ativa, como uma faixa fina de contexto imediatamente
       antes das ferramentas de formatação. -->
  {#if docReady}
    <div class="formula-bar" style="background:{c.toolbarSolidBg || c.dialogBackground};border-color:{c.divider};">
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

  {#if docReady}
    <div class="format-bar-spacer"></div>
  {/if}
</div>

<CellFormatBar
  {c}
  visible={formatBarVisible}
  activeMeta={activeCellMeta}
  on:action={handleFormatAction}
/>

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
  {c}
  docName={doc ? doc.name : ''}
  on:select={handleMenuSelect}
  on:rename={handleRenameDoc}
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
    display: flex; align-items: center; gap: 2px;
    padding: calc(env(safe-area-inset-top, 0px) + 8px) 8px 8px;
    border-bottom: 1px solid;
    flex-shrink: 0;
  }
  .appbar-spacer { flex: 1; min-width: 8px; }
  /* SEM fundo/container nos botões do appbar — tal como pedido. */
  .appbar-btn {
    width: 40px; height: 40px; border: none; background: transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s;
  }
  .appbar-btn:active { opacity: .55; }
  .appbar-btn:disabled { cursor: default; }
  .appbar-btn:disabled:active { opacity: .32; }

  .grid-with-floats {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .grid-with-floats :global(.grid-shell) {
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
    background: transparent;
    -webkit-tap-highlight-color: transparent;
    transition: transform .12s ease;
  }
  .sheet-tab-action-btn:active { transform: scale(0.88); }
  .sheet-tab-action-btn:disabled { opacity: 0.35; cursor: default; }

  /* Barra de fórmulas — agora no RODAPÉ (acima do bottom toolbar),
     nunca no topo. */
  .formula-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    border-top: 1px solid;
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
    font-size: 11px; font-weight: 700; color: var(--danger);
    background: rgba(196,43,28,0.12); padding: 3px 7px; border-radius: 6px;
    flex-shrink: 0;
  }

  .format-bar-spacer {
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    flex-shrink: 0;
  }

  .icon-mask {
    display: block; flex-shrink: 0;
    width: 24px; height: 24px; max-width: 24px; max-height: 24px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
</style>