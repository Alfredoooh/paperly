<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';

  import WhiteboardTopBar from '../components/WhiteboardTopBar.svelte';
  import WhiteboardCanvas from '../components/WhiteboardCanvas.svelte';
  import WhiteboardBottomBar from '../components/WhiteboardBottomBar.svelte';
  import ElementToolbar from '../components/ElementToolbar.svelte';
  import SizeSheet from '../components/SizeSheet.svelte';
  import ShapesSheet from '../components/ShapesSheet.svelte';
  import TemplatesSheet from '../components/TemplatesSheet.svelte';
  import LayersSheet from '../components/LayersSheet.svelte';
  import PropertiesSheet from '../components/PropertiesSheet.svelte';
  import ColorPickerSheet from '../components/ColorPickerSheet.svelte';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Whiteboard';
  export let appId = 'whiteboard';
  export let iconPath = '/icons/svg/regular/whiteboard.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const STORAGE_PREFIX = 'whiteboard_';
  const INDEX_KEY = STORAGE_PREFIX + 'index';
  const CM_TO_PX = 96 / 2.54;
  function cmToPx(cm) { return cm * CM_TO_PX; }

  // ══════════════════════════════════════════════════════════════════
  //  ESTADO DO DESIGN — fonte única de verdade, passada para baixo aos
  //  componentes filhos. Cada filho só recebe o que precisa e dispara
  //  eventos para cima; nenhuma lógica de UI vive aqui.
  // ══════════════════════════════════════════════════════════════════
  let boardName = 'Design sem título';
  let boardId = resourceId || ('wb_' + Date.now().toString(36));
  let boardW = 512;
  let boardH = 512;
  let background = { type: 'color', color: '#FFFFFF', image: null, opacity: 1 };
  let elements = [];
  let selectedId = null;
  let nextElId = 1;
  let saveTimeout;
  let savedState = 'saved';

  function loadOrCreateBoard() {
    if (resourceId) {
      const raw = localStorage.getItem(STORAGE_PREFIX + resourceId);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          boardId = resourceId;
          boardName = parsed.name || 'Design sem título';
          boardW = parsed.w || 512;
          boardH = parsed.h || 512;
          background = parsed.background || { type: 'color', color: '#FFFFFF', image: null, opacity: 1 };
          return parsed.elements || [];
        } catch (e) {}
      }
    }
    boardId = resourceId || ('wb_' + Date.now().toString(36));
    return [];
  }
  elements = loadOrCreateBoard();
  if (elements.length) nextElId = Math.max(...elements.map(e => e.id)) + 1;

  function persist() {
    savedState = 'saving';
    const payload = { name: boardName, w: boardW, h: boardH, background, elements, updatedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_PREFIX + boardId, JSON.stringify(payload));
      const indexRaw = localStorage.getItem(INDEX_KEY);
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const existing = index.find(d => d.id === boardId);
      if (existing) { existing.name = boardName; existing.updatedAt = payload.updatedAt; }
      else index.push({ id: boardId, name: boardName, updatedAt: payload.updatedAt });
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
      savedState = 'saved';
    } catch (e) { savedState = 'dirty'; }
  }
  function scheduleSave() {
    savedState = 'dirty';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persist, 700);
  }

  function handleNameInput(e) { boardName = e.detail; scheduleSave(); }

  function buzz() { try { navigator.vibrate && navigator.vibrate(6); } catch (e) {} }

  // ══════════════════════════════════════════════════════════════════
  //  HISTÓRICO — undo/redo por snapshot
  // ══════════════════════════════════════════════════════════════════
  let historyStack = [];
  let historyIndex = -1;
  let isRestoringHistory = false;
  let historyDebounce;
  const HISTORY_LIMIT = 80;

  function snapshotState() {
    return JSON.stringify({ w: boardW, h: boardH, background, elements });
  }
  function snapshotNow() {
    const snap = snapshotState();
    if (historyStack[historyIndex] === snap) return;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(snap);
    if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
    historyIndex = historyStack.length - 1;
    historyStack = historyStack;
  }
  function pushHistory(immediate = false) {
    if (isRestoringHistory) return;
    if (immediate) { clearTimeout(historyDebounce); snapshotNow(); return; }
    clearTimeout(historyDebounce);
    historyDebounce = setTimeout(snapshotNow, 350);
  }
  function initHistory() { historyStack = [snapshotState()]; historyIndex = 0; }
  initHistory();

  function restoreSnapshot(snap) {
    try {
      const parsed = JSON.parse(snap);
      boardW = parsed.w;
      boardH = parsed.h;
      background = parsed.background || background;
      elements = parsed.elements;
    } catch (e) {}
  }
  function undo() {
    if (historyIndex <= 0) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex -= 1;
    restoreSnapshot(historyStack[historyIndex]);
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex += 1;
    restoreSnapshot(historyStack[historyIndex]);
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  $: canUndo = historyIndex > 0;
  $: canRedo = historyIndex < historyStack.length - 1;

  // ══════════════════════════════════════════════════════════════════
  //  MUTAÇÕES DE ELEMENTOS — chamadas pelos eventos dos filhos
  // ══════════════════════════════════════════════════════════════════
  $: selectedEl = elements.find(e => e.id === selectedId) || null;

  function handleElementsChange(e) {
    elements = e.detail.elements;
    if ('immediate' in e.detail) {
      scheduleSave();
      pushHistory(!!e.detail.immediate);
    }
  }
  function handleSelect(e) { selectedId = e.detail; }
  function handleAddElement(e) {
    const el = { ...e.detail, id: nextElId++ };
    elements = [...elements, el];
    selectedId = el.id;
    scheduleSave();
    pushHistory(true);
  }
  function handleBackgroundChange(e) {
    background = e.detail;
    scheduleSave();
    pushHistory(!!e.detail.__immediate);
  }
  function handleBoardSizeChange(e) {
    boardW = e.detail.w;
    boardH = e.detail.h;
    scheduleSave();
    pushHistory(true);
  }
  function handleApplyTemplate(e) {
    boardW = e.detail.w;
    boardH = e.detail.h;
    elements = e.detail.elements;
    background = e.detail.background || background;
    nextElId = elements.length ? Math.max(1, ...elements.map(x => x.id)) + 1 : 1;
    selectedId = null;
    scheduleSave();
    pushHistory(true);
  }

  function duplicateSelected() {
    if (!selectedEl) return;
    buzz();
    const clone = { ...selectedEl, id: nextElId++, x: selectedEl.x + 20, y: selectedEl.y + 20 };
    elements = [...elements, clone];
    selectedId = clone.id;
    scheduleSave(); pushHistory(true);
  }
  function deleteSelected() {
    if (!selectedId) return;
    buzz();
    elements = elements.filter(e => e.id !== selectedId);
    selectedId = null;
    activePropTab = null;
    scheduleSave(); pushHistory(true);
  }
  function bringToFront() {
    if (!selectedEl) return;
    elements = [...elements.filter(e => e.id !== selectedId), selectedEl];
    scheduleSave(); pushHistory(true);
  }
  function sendToBack() {
    if (!selectedEl) return;
    elements = [selectedEl, ...elements.filter(e => e.id !== selectedId)];
    scheduleSave(); pushHistory(true);
  }

  // ══════════════════════════════════════════════════════════════════
  //  VISIBILIDADE DE SHEETS — cada sheet é 100% independente; nenhuma
  //  vive aninhada dentro do canvas, todas são siblings no fim deste
  //  ficheiro, fora de qualquer elemento com contain/transform.
  // ══════════════════════════════════════════════════════════════════
  let sheetSize = false;
  let sheetShapes = false;
  let sheetTemplates = false;
  let sheetLayers = false;
  let activePropTab = null;
  let colorPickerOpen = false;
  let colorPickerTarget = 'fill';

  function openColorPicker(e) { colorPickerTarget = e.detail; colorPickerOpen = true; }
  function applyColorFromPicker(e) {
    const hex = e.detail;
    if (!selectedId) { colorPickerOpen = false; return; }
    if (colorPickerTarget === 'fill') elements = elements.map(el => el.id === selectedId ? { ...el, fill: hex } : el);
    else if (colorPickerTarget === 'border') elements = elements.map(el => el.id === selectedId ? { ...el, border: hex } : el);
    else if (colorPickerTarget === 'text') elements = elements.map(el => el.id === selectedId ? { ...el, color: hex } : el);
    else if (colorPickerTarget === 'bg-color') background = { ...background, type: 'color', color: hex };
    colorPickerOpen = false;
    scheduleSave(); pushHistory(true);
  }
  function handleBgColorPickerRequest() { colorPickerTarget = 'bg-color'; colorPickerOpen = true; }

  function backToHome() { dispatch('nav', { to: 'home' }); }

  onDestroy(() => {
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
  });
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">
  <WhiteboardTopBar
    {c}
    {boardName}
    {savedState}
    {canUndo}
    {canRedo}
    on:back={backToHome}
    on:namechange={handleNameInput}
    on:undo={undo}
    on:redo={redo}
  />

  <WhiteboardCanvas
    {c}
    {boardW}
    {boardH}
    {background}
    {elements}
    {selectedId}
    on:select={handleSelect}
    on:elementschange={handleElementsChange}
    on:requesttext={() => activePropTab = 'text'}
    on:requestcrop={() => activePropTab = 'crop'}
  />

  {#if selectedEl}
    <ElementToolbar
      {c}
      element={selectedEl}
      on:edittext={() => activePropTab = 'text'}
      on:opentab={(e) => activePropTab = e.detail}
      on:openfill={() => openColorPicker({ detail: 'fill' })}
      on:opentextcolor={() => openColorPicker({ detail: 'text' })}
      on:duplicate={duplicateSelected}
      on:front={bringToFront}
      on:back={sendToBack}
      on:delete={deleteSelected}
    />
  {/if}

  <WhiteboardBottomBar
    {c}
    hidden={!!selectedEl}
    on:templates={() => { buzz(); sheetTemplates = true; }}
    on:addtext={(e) => handleAddElement(e)}
    on:addimage={(e) => handleAddElement(e)}
    on:shapes={() => { buzz(); sheetShapes = true; }}
    on:size={() => { buzz(); sheetSize = true; }}
    on:layers={() => { buzz(); sheetLayers = true; }}
    boardW={boardW}
    boardH={boardH}
  />
</div>

<SizeSheet
  visible={sheetSize}
  {c}
  {boardW}
  {boardH}
  {background}
  on:close={() => sheetSize = false}
  on:applysize={handleBoardSizeChange}
  on:backgroundchange={handleBackgroundChange}
  on:openbgcolorpicker={handleBgColorPickerRequest}
/>

<ShapesSheet
  visible={sheetShapes}
  {c}
  {boardW}
  {boardH}
  on:close={() => sheetShapes = false}
  on:addshape={handleAddElement}
/>

<TemplatesSheet
  visible={sheetTemplates}
  {c}
  on:close={() => sheetTemplates = false}
  on:apply={handleApplyTemplate}
/>

<LayersSheet
  visible={sheetLayers}
  {c}
  {elements}
  {selectedId}
  on:close={() => sheetLayers = false}
  on:select={handleSelect}
  on:delete={(e) => { elements = elements.filter(x => x.id !== e.detail); if (selectedId === e.detail) selectedId = null; scheduleSave(); pushHistory(true); }}
/>

<PropertiesSheet
  activePanel={activePropTab}
  {c}
  element={selectedEl}
  on:close={() => activePropTab = null}
  on:update={(e) => { elements = elements.map(el => el.id === selectedId ? { ...el, ...e.detail } : el); }}
  on:commit={() => { scheduleSave(); pushHistory(!!true); }}
  on:openpicker={openColorPicker}
/>

<ColorPickerSheet
  visible={colorPickerOpen}
  {c}
  on:cancel={() => colorPickerOpen = false}
  on:confirm={applyColorFromPicker}
/>

<style>
  :global(html), :global(body) { width:100%; height:100%; overflow:hidden; overscroll-behavior:none; position:relative; }
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
</style>