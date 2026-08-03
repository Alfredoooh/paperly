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
  import { showToast } from '$shared/utils.js';
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
  export let resourceId = null;
  export let appTitle = 'Nexa Sheets';
  export let appId = 'sheets';
  export let iconPath = '/icons/svg/apps/sheets.svg';

  const dispatch = createEventDispatcher();

  $: c = getThemeColors(isDark);

  // ── Conteúdo pendente vindo do Assistente de IA ─────────────────
  // Quando o utilizador prime "Aplicar" num cartão de folha de cálculo
  // gerado pela IA (ver ai/pages/ChatPage.svelte -> renderNativeAppContent
  // -> applySheetsContent), o chat grava aqui um payload
  // {name, sheets:[{name, cells, colWidths}]} em sessionStorage e
  // navega para /sheets/. Como esta app SEMPRE cria um documento novo
  // ao montar (ver loadOrCreate abaixo, que ignora resourceId de
  // propósito — nota histórica do projeto), o payload pendente é
  // aplicado sobre esse documento novo antes de ser guardado.
  const PENDING_APPLY_KEY = 'nexa_pending_apply_sheets';

  function readPendingApply() {
    try {
      const raw = sessionStorage.getItem(PENDING_APPLY_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(PENDING_APPLY_KEY);
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sheets) || !parsed.sheets.length) return null;
      return parsed;
    } catch (e) { return null; }
  }

  // Converte o payload solto vindo da IA (sheets:[{name,cells,colWidths}])
  // para a forma interna completa que sheet-store.js espera de cada
  // folha (id, rows, cols, charts, images), reaproveitando createSheet
  // como base e sobrepondo os campos que a IA de facto forneceu.
  function applyPendingToDoc(doc, pending) {
    if (!pending) return doc;
    const nextSheets = pending.sheets.map((s, i) => {
      const base = doc.sheets[i] || createSheetShim();
      return {
        ...base,
        name: s.name || base.name || `Folha${i + 1}`,
        cells: s.cells || {},
        colWidths: s.colWidths || {},
        charts: base.charts || [],
        images: base.images || [],
      };
    });
    return {
      ...doc,
      name: pending.name || doc.name,
      sheets: nextSheets,
      activeSheetId: nextSheets[0] ? nextSheets[0].id : doc.activeSheetId,
    };
  }

  // Pequeno gerador local de folha "em branco" para preencher índices
  // extra do array de pending que ultrapassem o único createDocument()
  // inicial (createDocument só cria 1 folha; se a IA mandar 3 abas,
  // as duas seguintes nascem aqui com o mesmo formato de createSheet).
  function createSheetShim() {
    return {
      id: 'tab_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Folha1',
      rows: 60,
      cols: 1000,
      cells: {},
      colWidths: {},
      charts: [],
      images: [],
    };
  }

  // ── Documento ────────────────────────────────────────────────

  let doc = null;
  let resolvedValues = {};
  let resolvedErrors = {};
  let docReady = false;
  let appliedFromAi = false;

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

    // Consumir conteúdo pendente da IA, se existir, ANTES da primeira
    // recomputação — assim as fórmulas já entram calculadas no primeiro
    // paint em vez de aparecerem vazias por uma fração de segundo.
    const pending = readPendingApply();
    if (pending) {
      loaded = applyPendingToDoc(loaded, pending);
      appliedFromAi = true;
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

  function handleFormulaBarFocus() {
    formulaBarFocused = true;
    formulaBarDraft = formulaBarValue;
  }
  function handleFormulaBarInput(e) {
    formulaBarDraft = e.target.value;
  }
  function commitFormulaBarDraft() {
    if (!formulaBarFocused) return;
    formulaBarFocused = false;
    if (formulaBarDraft === formulaBarValue) return;
    handleCellChange({ detail: { addr: activeAddr, raw: formulaBarDraft } });
  }
  function handleFormulaBarKeydown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitFormulaBarDraft(); gridComp && gridComp.focusCell(activeAddr); }
    if (e.key === 'Escape') { formulaBarFocused = false; formulaBarDraft = formulaBarValue; }
  }

  // ── Seleção de célula/range vinda do grid ───────────────────

  function handleCellSelect(e) {
    activeAddr = e.detail.addr;
    selectionAnchor = e.detail.anchor || e.detail.addr;
    selectionFocus = e.detail.focus || e.detail.addr;
    selectedChartId = null;
    selectedImageId = null;
  }

  // ── Formatação de célula (negrito, itálico, alinhamento, cor, etc.) ──

  $: activeCellMeta = activeSheet && activeAddr ? (activeSheet.cells[activeAddr] || {}) : {};

  function rangeAddrs() {
    const a = parseCellId(selectionAnchor);
    const f = parseCellId(selectionFocus);
    if (!a || !f) return [activeAddr];
    const r0 = Math.min(a.row, f.row), r1 = Math.max(a.row, f.row);
    const c0 = Math.min(a.col, f.col), c1 = Math.max(a.col, f.col);
    const addrs = [];
    for (let r = r0; r <= r1; r++) for (let cIdx = c0; cIdx <= c1; cIdx++) addrs.push(cellId(r, cIdx));
    return addrs;
  }

  function toggleCellFormat(key) {
    scheduleHistoryPush();
    const cells = { ...activeSheet.cells };
    const addrs = rangeAddrs();
    const allActive = addrs.every((addr) => cells[addr] && cells[addr][key]);
    addrs.forEach((addr) => {
      const meta = { ...(cells[addr] || { raw: '' }) };
      meta[key] = !allActive;
      cells[addr] = meta;
    });
    applyCellsToActiveSheet(cells);
    scheduleSave();
  }

  function setCellFormat(key, value) {
    scheduleHistoryPush();
    const cells = { ...activeSheet.cells };
    const addrs = rangeAddrs();
    addrs.forEach((addr) => {
      const meta = { ...(cells[addr] || { raw: '' }) };
      meta[key] = value;
      cells[addr] = meta;
    });
    applyCellsToActiveSheet(cells);
    scheduleSave();
  }

  function handleToggleBold() { toggleCellFormat('bold'); }
  function handleToggleItalic() { toggleCellFormat('italic'); }
  function handleSetAlign(e) { setCellFormat('align', e.detail); }

  let colorModalOpen = false;
  let colorModalTarget = 'color';
  let colorPickerOpen = false;
  let customColors = [];

  function loadCustomColors() {
    try {
      const raw = localStorage.getItem('sheets_custom_colors');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  customColors = loadCustomColors();
  function persistCustomColors() {
    try { localStorage.setItem('sheets_custom_colors', JSON.stringify(customColors)); } catch (e) {}
  }

  function openColorModal(target) { colorModalTarget = target; colorModalOpen = true; }
  function handleColorSelect(e) {
    setCellFormat(colorModalTarget === 'fill' ? 'fill' : 'color', e.detail);
    colorModalOpen = false;
  }
  function requestAddColor() { colorModalOpen = false; colorPickerOpen = true; }
  function confirmCustomColor(e) {
    const hex = e.detail;
    customColors = [hex, ...customColors.filter((c) => c !== hex)].slice(0, 12);
    persistCustomColors();
    colorPickerOpen = false;
    setCellFormat(colorModalTarget === 'fill' ? 'fill' : 'color', hex);
  }
  function cancelCustomColor() { colorPickerOpen = false; }

  let numberFormatModalOpen = false;
  function handleSetNumberFormat(e) {
    setCellFormat('format', e.detail);
    numberFormatModalOpen = false;
  }

  // ── Menu da folha (abas, adicionar, duplicar, exportar, apagar) ──

  let sheetMenuOpen = false;
  function openSheetMenu() { sheetMenuOpen = true; }
  function closeSheetMenu() { sheetMenuOpen = false; }

  function handleAddSheet() {
    doc = addSheet(doc);
    activeAddr = 'A1'; selectionAnchor = 'A1'; selectionFocus = 'A1';
    selectedChartId = null; selectedImageId = null;
    recompute();
    scheduleSave();
  }
  function handleRemoveSheet(e) {
    doc = removeSheet(doc, e.detail);
    activeAddr = 'A1'; selectionAnchor = 'A1'; selectionFocus = 'A1';
    selectedChartId = null; selectedImageId = null;
    recompute();
    scheduleSave();
  }
  function handleRenameSheet(e) {
    doc = renameSheet(doc, e.detail.sheetId, e.detail.name);
    scheduleSave();
  }
  function handleDuplicateSheet(e) {
    doc = duplicateSheet(doc, e.detail);
    recompute();
    scheduleSave();
  }
  function handleSetActiveSheet(e) {
    doc = setActiveSheet(doc, e.detail);
    activeAddr = 'A1'; selectionAnchor = 'A1'; selectionFocus = 'A1';
    selectedChartId = null; selectedImageId = null;
    recompute();
  }
  function handleExportCsv() {
    downloadCsv(doc, resolvedValues);
    sheetMenuOpen = false;
  }
  function handleDuplicateDoc() {
    const copy = duplicateDocument(doc.id);
    if (copy) showToast('Pasta de cálculo duplicada');
    sheetMenuOpen = false;
  }

  let showDeleteConfirm = false;
  function requestDeleteDoc() { sheetMenuOpen = false; showDeleteConfirm = true; }
  function cancelDeleteDoc() { showDeleteConfirm = false; }
  function confirmDeleteDoc() {
    showDeleteConfirm = false;
    deleteDocument(doc.id);
    dispatch('nav', { to: 'home' });
  }

  // ── Gráficos flutuantes ──────────────────────────────────────

  let chartModalOpen = false;
  let chartModalEditId = null;
  let selectedChartId = null;

  function openChartModalForNew() {
    chartModalEditId = null;
    chartModalOpen = true;
  }
  function openChartModalForEdit(chartId) {
    chartModalEditId = chartId;
    chartModalOpen = true;
  }
  function handleChartConfirm(e) {
    if (chartModalEditId) {
      doc = updateChart(doc, activeSheet.id, chartModalEditId, e.detail);
    } else {
      doc = addChart(doc, activeSheet.id, e.detail);
    }
    chartModalOpen = false;
    chartModalEditId = null;
    scheduleSave();
  }
  function handleChartMove(e) {
    doc = moveChart(doc, activeSheet.id, e.detail.id, e.detail.x, e.detail.y);
    scheduleSave();
  }
  function handleChartResize(e) {
    doc = resizeChart(doc, activeSheet.id, e.detail.id, e.detail.w, e.detail.h);
    scheduleSave();
  }
  function handleChartSelect(e) {
    selectedChartId = e.detail;
    selectedImageId = null;
  }
  function handleRemoveSelectedChart() {
    if (!selectedChartId) return;
    doc = removeChart(doc, activeSheet.id, selectedChartId);
    selectedChartId = null;
    scheduleSave();
  }

  // ── Imagens flutuantes ───────────────────────────────────────

  let selectedImageId = null;
  let sheetFileInputEl;

  function requestInsertImage() { sheetFileInputEl && sheetFileInputEl.click(); sheetMenuOpen = false; }
  function handleImageFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      doc = addImage(doc, activeSheet.id, { src: reader.result });
      scheduleSave();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function handleImageMove(e) {
    doc = moveImage(doc, activeSheet.id, e.detail.id, e.detail.x, e.detail.y);
    scheduleSave();
  }
  function handleImageResize(e) {
    doc = resizeImage(doc, activeSheet.id, e.detail.id, e.detail.w, e.detail.h);
    scheduleSave();
  }
  function handleImageSelect(e) {
    selectedImageId = e.detail;
    selectedChartId = null;
  }
  function handleRemoveSelectedImage() {
    if (!selectedImageId) return;
    doc = removeImage(doc, activeSheet.id, selectedImageId);
    selectedImageId = null;
    scheduleSave();
  }

  // ── Zoom ─────────────────────────────────────────────────────

  let zoomLevel = 1;
  function handleZoomChange(e) { zoomLevel = e.detail; }

  // ── Navegação para trás ──────────────────────────────────────

  function goBack() {
    saveImmediately();
    dispatch('nav', { to: 'home' });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────

  onMount(() => {
    loadOrCreate();
    // Se este documento nasceu a partir de um cartão "Aplicar" da IA,
    // persistimos de imediato para aparecer logo na lista de
    // pastas de cálculo (DocumentsTab/home) e avisamos com um toast,
    // tal como qualquer outra criação bem-sucedida na app.
    if (appliedFromAi) {
      persistDocument(doc);
      showToast('Folha de cálculo aplicada com sucesso');
      appliedFromAi = false;
    }
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
    {:else}
      <button class="appbar-btn" disabled={!canUndo} on:click={undo} aria-label="Desfazer">
        <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_undo_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_undo_24_regular')}');background:{c.iconTint};opacity:{canUndo ? 1 : 0.32};"></span>
      </button>
      <button class="appbar-btn" disabled={!canRedo} on:click={redo} aria-label="Refazer">
        <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_redo_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_redo_24_regular')}');background:{c.iconTint};opacity:{canRedo ? 1 : 0.32};"></span>
      </button>
      <button class="appbar-btn" on:click={openChartModalForNew} aria-label="Inserir gráfico">
        <span class="icon-mask" style="mask-image:url('{localIconPath('data_bar_vertical_24_regular')}');-webkit-mask-image:url('{localIconPath('data_bar_vertical_24_regular')}');background:{c.iconTint};"></span>
      </button>
    {/if}

    <button class="appbar-btn" on:click={openSheetMenu} aria-label="Mais opções">
      <span class="icon-mask" style="mask-image:url('{localIconPath('more_horizontal_24_regular')}');-webkit-mask-image:url('{localIconPath('more_horizontal_24_regular')}');background:{c.iconTint};"></span>
    </button>
  </div>

  {#if docReady && activeSheet}
    <div class="grid-area">
      <SheetZoom bind:zoom={zoomLevel} on:zoomchange={handleZoomChange}>
        <SheetGrid
          bind:this={gridComp}
          {c}
          {isDark}
          sheet={activeSheet}
          {resolvedValues}
          {resolvedErrors}
          {activeAddr}
          {selectionAnchor}
          {selectionFocus}
          zoom={zoomLevel}
          on:cellchange={handleCellChange}
          on:cellselect={handleCellSelect}
          on:deselectfloating={() => { selectedChartId = null; selectedImageId = null; }}
        />
        {#each activeSheet.charts || [] as chart (chart.id)}
          <ChartCanvas
            {chart}
            {c}
            {isDark}
            sheet={activeSheet}
            {resolvedValues}
            selected={selectedChartId === chart.id}
            on:move={handleChartMove}
            on:resize={handleChartResize}
            on:select={() => handleChartSelect({ detail: chart.id })}
          />
        {/each}
        {#each activeSheet.images || [] as image (image.id)}
          <FloatingImage
            {image}
            selected={selectedImageId === image.id}
            on:move={handleImageMove}
            on:resize={handleImageResize}
            on:select={() => handleImageSelect({ detail: image.id })}
          />
        {/each}
      </SheetZoom>
    </div>

    <div class="formula-bar" style="background:{c.dialogBackground};border-color:{c.divider};">
      <span class="formula-addr" style="color:{c.textSecondary};">{activeAddr}</span>
      <input
        class="formula-input"
        style="color:{c.textPrimary};"
        value={formulaBarFocused ? formulaBarDraft : formulaBarValue}
        on:focus={handleFormulaBarFocus}
        on:input={handleFormulaBarInput}
        on:blur={commitFormulaBarDraft}
        on:keydown={handleFormulaBarKeydown}
        placeholder="Introduz um valor ou fórmula (=A1+B1)"
      />
    </div>

    <CellFormatBar
      {c}
      {isDark}
      cellMeta={activeCellMeta}
      on:togglebold={handleToggleBold}
      on:toggleitalic={handleToggleItalic}
      on:setalign={handleSetAlign}
      on:openColorModal={(e) => openColorModal(e.detail)}
      on:openNumberFormat={() => numberFormatModalOpen = true}
    />
  {/if}

  <SheetMenu
    visible={sheetMenuOpen}
    {c}
    {isDark}
    {doc}
    activeSheetId={activeSheet ? activeSheet.id : null}
    {MAX_SHEETS}
    on:close={closeSheetMenu}
    on:addSheet={handleAddSheet}
    on:removeSheet={handleRemoveSheet}
    on:renameSheet={handleRenameSheet}
    on:duplicateSheet={handleDuplicateSheet}
    on:setActiveSheet={handleSetActiveSheet}
    on:exportCsv={handleExportCsv}
    on:duplicateDoc={handleDuplicateDoc}
    on:insertImage={requestInsertImage}
    on:deleteDoc={requestDeleteDoc}
  />

  <ChartModal
    visible={chartModalOpen}
    {c}
    {isDark}
    sheet={activeSheet}
    editingChart={chartModalEditId ? (activeSheet.charts || []).find((ch) => ch.id === chartModalEditId) : null}
    on:close={() => { chartModalOpen = false; chartModalEditId = null; }}
    on:confirm={handleChartConfirm}
  />

  <ColorModal
    visible={colorModalOpen}
    {c}
    {customColors}
    on:close={() => colorModalOpen = false}
    on:select={handleColorSelect}
    on:addcolor={requestAddColor}
  />

  <ColorPickerModal
    visible={colorPickerOpen}
    {c}
    on:confirm={confirmCustomColor}
    on:cancel={cancelCustomColor}
  />

  <CellNumberFormatModal
    visible={numberFormatModalOpen}
    {c}
    currentFormat={activeCellMeta.format || 'general'}
    on:close={() => numberFormatModalOpen = false}
    on:select={handleSetNumberFormat}
  />

  <ConfirmDialog
    visible={showDeleteConfirm}
    {c}
    message={`Tens a certeza que queres apagar "${doc ? doc.name : ''}"? Esta ação não pode ser desfeita.`}
    confirmLabel="Apagar"
    on:cancel={cancelDeleteDoc}
    on:confirm={confirmDeleteDoc}
  />

  <input type="file" accept="image/*" bind:this={sheetFileInputEl} on:change={handleImageFileChange} style="display:none" />
</div>

<style>
  :global(html), :global(body) { width: 100%; height: 100%; overflow: hidden; }

  .page-shell {
    position: fixed;
    inset: 0;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .appbar {
    display: flex; align-items: center; gap: 4px;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 8px 12px;
    flex-shrink: 0;
    border-bottom: 1px solid;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 8px; border: none;
    background: transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .14s;
  }
  .appbar-btn:active { opacity: .55; }
  .appbar-btn:disabled { cursor: default; }
  .appbar-btn:disabled:active { opacity: 1; }
  .appbar-spacer { flex: 1; }

  .grid-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .formula-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px;
    border-top: 1px solid;
    flex-shrink: 0;
  }
  .formula-addr {
    font-size: 12px; font-weight: 700; min-width: 40px;
    font-variant-numeric: tabular-nums;
  }
  .formula-input {
    flex: 1; min-width: 0; border: none; background: transparent; outline: none;
    font-size: 14px; font-family: 'Courier New', Courier, monospace;
    -webkit-user-select: text; user-select: text;
  }

  .icon-mask {
    display: block; width: 22px; height: 22px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>