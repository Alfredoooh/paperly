<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import { createBackRecoilTransition, createSlideTransition } from '../../home/lib/nav-transition.js';

  import DocPage from '../components/DocPage.svelte';
  import DocMenu from '../components/DocMenu.svelte';
  import BottomToolbar from '../components/BottomToolbar.svelte';
  import CreationToolsBar from '../components/CreationToolsBar.svelte';
  import ColorModal from '../components/ColorModal.svelte';
  import ColorPickerModal from '../components/ColorPickerModal.svelte';
  import FormatModal from '../components/FormatModal.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import TableModal from '../components/TableModal.svelte';
  import LayersModal from '../components/LayersModal.svelte';
  import ExportPickerPage from './ExportPickerPage.svelte';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Docs';
  export let appId = 'docs';
  export let iconPath = '/icons/svg/docs/docs.svg';
  export let setSuppressRouterPopstate = () => {};

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const STORAGE_PREFIX = 'docs_';
  const CUSTOM_COLORS_KEY = STORAGE_PREFIX + 'custom_colors';

  let docPageComp;
  let docName = 'Documento sem título';
  let docId = resourceId || null;
  let saveTimeout;
  let savedState = 'saved';

  function loadOrCreateDoc() {
    if (resourceId) {
      const raw = localStorage.getItem(STORAGE_PREFIX + resourceId);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          docId = resourceId;
          docName = parsed.name || 'Documento sem título';
          return parsed.content || '';
        } catch (e) {}
      }
    }
    docId = resourceId || ('doc_' + Date.now().toString(36));
    docName = 'Documento sem título';
    return '';
  }

  let initialContent = loadOrCreateDoc();

  function loadCustomColors() {
    try {
      const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  let customColors = loadCustomColors();

  function persistCustomColors() {
    try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customColors)); } catch (e) {}
  }

  onMount(() => {
    setupKeyboardAvoidance();
    document.addEventListener('focusin', lockViewport, true);
  });

  function getEditorHTML() { return docPageComp ? docPageComp.getContent() : ''; }
  function setEditorHTML(html) { docPageComp && docPageComp.setContent(html); }
  function focusEditor() { docPageComp && docPageComp.focusEditor(); }

  function persist() {
    savedState = 'saving';
    syncAppbarSaveState();
    const payload = { name: docName, content: getEditorHTML(), updatedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_PREFIX + docId, JSON.stringify(payload));
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const existing = index.find(d => d.id === docId);
      if (existing) { existing.name = docName; existing.updatedAt = payload.updatedAt; }
      else index.push({ id: docId, name: docName, updatedAt: payload.updatedAt });
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
      savedState = 'saved';
    } catch (e) { savedState = 'dirty'; }
    syncAppbarSaveState();
  }

  function scheduleSave() {
    savedState = 'dirty';
    syncAppbarSaveState();
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persist, 700);
  }

  function handleInput() { scheduleSave(); pushHistory(); }

  function handleNameInput(e) { docName = e.target.value; scheduleSave(); }
  function handleNameBlur(e) {
    if (!docName || !docName.trim()) {
      docName = 'Documento sem título';
      e.target.value = docName;
    }
    scheduleSave();
  }

  function exec(command, value = null) {
    focusEditor();
    document.execCommand(command, false, value);
    scheduleSave();
    pushHistory();
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  let historyStack = [];
  let historyIndex = -1;
  let isRestoringHistory = false;
  let historyDebounce;
  const HISTORY_LIMIT = 100;

  function snapshotNow() {
    const html = getEditorHTML();
    if (historyStack[historyIndex] === html) return;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(html);
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

  function initHistory(html) { historyStack = [html || '']; historyIndex = 0; }

  async function undo() {
    if (historyIndex <= 0) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex -= 1;
    setEditorHTML(historyStack[historyIndex]);
    await tick();
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  async function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex += 1;
    setEditorHTML(historyStack[historyIndex]);
    await tick();
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  $: canUndo = historyIndex > 0;
  $: canRedo = historyIndex < historyStack.length - 1;

  function handleDocReady(e) { initHistory(e.detail?.html || ''); }

  let activePanel = null;
  let colorModalOpen = false;
  let colorPickerOpen = false;
  let tableModalOpen = false;
  let layersModalOpen = false;

  // ── Estado das camadas da folha atual ─────────────────────────────
  let currentPageLayers = [];

  function refreshLayers() {
    if (!docPageComp) { currentPageLayers = []; return; }
    const objs = docPageComp.getFloatingObjectsForPage(activePageIndex) || [];
    currentPageLayers = objs.map((o, i) => ({
      id: `${activePageIndex}:${o.id}`,
      pageIndex: activePageIndex,
      objId: o.id,
      type: 'image',
      label: `Imagem ${i + 1}`,
    }));
  }

  // ══════════════════════════════════════════════════════════════════
  //  ESTADO DE EDIÇÃO — isEditing controla qual bottom bar aparece.
  // ══════════════════════════════════════════════════════════════════
  let isEditing = false;

  function handlePageFocus() { if (!isEditing) isEditing = true; }

  function confirmDoneEditing() {
    buzz();
    docPageComp && docPageComp.blurEditor();
    docPageComp && docPageComp.deselectFloat();
    activePanel = null;
    isEditing = false;
  }

  function handleToolbarAction(id) {
    buzz();
    if (id === 'done') { confirmDoneEditing(); return; }
    if (id === 'undo') { undo(); return; }
    if (id === 'redo') { redo(); return; }
    if (id === 'bold') { exec('bold'); return; }
    if (id === 'italic') { exec('italic'); return; }
    if (id === 'underline') { exec('underline'); return; }
    if (id === 'color') { colorModalOpen = true; return; }
    if (id === 'link') { openLinkPanel(); return; }
    if (id === 'footnote') { openFootnotePanel(); return; }
    if (id === 'insert') { triggerImagePicker(); return; }
    if (id === 'table') { tableModalOpen = true; return; }
    if (id === 'layers') { refreshLayers(); layersModalOpen = true; return; }
    activePanel = id;
  }

  function handleCreationToolAction(id) {
    buzz();
    if (id === 'insert') { isEditing = true; triggerImagePicker(); return; }
    if (id === 'table') { isEditing = true; tableModalOpen = true; return; }
    if (id === 'templates') { showToast('Modelos em breve'); return; }
    if (id === 'shapes') { showToast('Formas em breve'); return; }
    if (id === 'tools') { showToast('Ferramentas em breve'); return; }
  }

  function closeFormatModal() { activePanel = null; }

  function setFont(value) { exec('fontName', value); activePanel = null; }
  function setSize(px) {
    focusEditor();
    document.execCommand('fontSize', false, '7');
    docPageComp && docPageComp.normalizeFontSizeMarkers(px);
    scheduleSave();
    pushHistory(true);
    activePanel = null;
  }
  function setAlign(cmd) { exec(cmd); activePanel = null; }
  function setList(cmd) { exec(cmd); activePanel = null; }

  function insertImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      docPageComp && docPageComp.insertImageAtCursor(ev.target.result);
      scheduleSave();
      pushHistory(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleImageRequestEdit(e) {
    refreshLayers();
    layersModalOpen = true;
  }

  function handleLayerSelect(e) {
    const [pageIndexStr, objIdStr] = String(e.detail).split(':');
    docPageComp && docPageComp.selectFloatById(Number(pageIndexStr), Number(objIdStr));
    layersModalOpen = false;
  }

  function handleLayerDelete(e) {
    const [pageIndexStr, objIdStr] = String(e.detail).split(':');
    docPageComp && docPageComp.deleteImage({ pageIndex: Number(pageIndexStr), objId: Number(objIdStr) });
    scheduleSave();
    pushHistory(true);
    refreshLayers();
    if (currentPageLayers.length === 0) layersModalOpen = false;
  }

  function insertTable(e) {
    const { rows, cols } = e.detail;
    docPageComp && docPageComp.insertTable(rows, cols);
    tableModalOpen = false;
    scheduleSave();
    pushHistory(true);
  }

  function selectColor(hex) { exec('foreColor', hex); colorModalOpen = false; }
  function requestAddColor() { colorModalOpen = false; colorPickerOpen = true; }
  function confirmCustomColor(hex) {
    if (!customColors.includes(hex)) { customColors = [...customColors, hex]; persistCustomColors(); }
    colorPickerOpen = false;
    colorModalOpen = true;
  }
  function cancelCustomColor() { colorPickerOpen = false; colorModalOpen = true; }

  let linkUrlDraft = '';
  let savedSelectionRange = null;

  function openLinkPanel() {
    focusEditor();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      savedSelectionRange = sel.getRangeAt(0).cloneRange();
    } else { savedSelectionRange = null; }
    linkUrlDraft = '';
    activePanel = 'link';
  }
  function restoreSelection() {
    if (!savedSelectionRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelectionRange);
  }
  function confirmInsertLink() {
    const url = linkUrlDraft.trim();
    if (!url) return;
    focusEditor();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      document.execCommand('insertHTML', false,
        `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
      docPageComp && docPageComp.tagLinksWithHref(url);
    }
    scheduleSave(); pushHistory(true);
    linkUrlDraft = ''; savedSelectionRange = null; activePanel = null;
  }
  function removeLink() {
    focusEditor(); restoreSelection();
    document.execCommand('unlink');
    scheduleSave(); pushHistory(true); activePanel = null;
  }
  function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(str) { return escapeHtml(str).replace(/"/g,'&quot;'); }

  let footnotes = [];
  let footnoteDraft = '';
  let footnoteCounter = 0;

  function openFootnotePanel() { focusEditor(); footnoteDraft = ''; activePanel = 'footnote'; }
  function confirmInsertFootnote() {
    const text = footnoteDraft.trim();
    if (!text) return;
    focusEditor();
    footnoteCounter += 1;
    const num = footnoteCounter;
    const noteId = 'fn' + num + '_' + Date.now().toString(36);
    footnotes = [...footnotes, { id: noteId, num, text }];
    document.execCommand('insertHTML', false,
      `<sup class="footnote-ref" data-footnote-id="${noteId}">${num}</sup>`);
    scheduleSave(); pushHistory(true);
    footnoteDraft = ''; activePanel = null;
  }
  function removeFootnote(id) {
    footnotes = footnotes.filter(f => f.id !== id);
    docPageComp && docPageComp.removeFootnoteRef(id);
    scheduleSave(); pushHistory(true);
  }

  let fileInputEl;
  function triggerImagePicker() { fileInputEl?.click(); }

  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
  }

  let kbOffset = 0;
  let kbUpdateRaf = null;
  let rootEl;
  let vvRef = null;

  function syncViewportVars() {
    document.documentElement.style.setProperty('--kb-offset', `${kbOffset}px`);
  }

  function computeKbOffset() {
    const vv = window.visualViewport;
    if (!vv) {
      kbOffset = 0;
      syncViewportVars();
      return;
    }
    const overlap = window.innerHeight - (vv.height + vv.offsetTop);
    kbOffset = overlap > 40 ? Math.round(overlap) : 0;
    syncViewportVars();
  }
  function scheduleKbUpdate() {
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    kbUpdateRaf = requestAnimationFrame(computeKbOffset);
  }

  function setupKeyboardAvoidance() {
    requestAnimationFrame(() => {
      computeKbOffset();
      vvRef = window.visualViewport;
      if (!vvRef) return;
      vvRef.addEventListener('resize', scheduleKbUpdate);
      vvRef.addEventListener('scroll', scheduleKbUpdate);
    });
  }

  function lockViewport() {
    const active = document.activeElement;
    const tag = active?.tagName?.toLowerCase?.() || '';
    const isEditable = !!active && (
      active.classList?.contains('conteudo') ||
      active.isContentEditable ||
      tag === 'input' ||
      tag === 'textarea'
    );
    if (!isEditable) return;
    computeKbOffset();
  }

  let activePageIndex = 0;
  let totalPages = 1;

  function handlePageFocusFromChild(e) { activePageIndex = e.detail; handlePageFocus(); }

  const mainRecoil = createBackRecoilTransition();
  let mainRecoilValue = 0;
  const unsubscribeMainRecoil = mainRecoil.subscribe((v) => { mainRecoilValue = v; });

  const exportSlide = createSlideTransition({});
  let exportSlideX = 100;
  const unsubscribeExportSlide = exportSlide.subscribe((v) => { exportSlideX = v; });

  let exportPickerOpen = false;
  let exportPickerVisible = false;
  let exportPickerMode = 'export';
  let exportNavToken = 0;

  function openExport(mode) {
    exportPickerMode = mode;
    exportNavToken += 1;
    const token = exportNavToken;
    exportPickerVisible = true;
    exportPickerOpen = true;
    syncAppbarVisibility();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (exportNavToken !== token) return;
      exportSlide.open();
      mainRecoil.recoil();
    }));
  }

  function closeExportPicker() {
    exportNavToken += 1;
    const token = exportNavToken;
    exportSlide.close();
    mainRecoil.reset();
    setTimeout(() => {
      if (exportNavToken !== token) return;
      exportPickerOpen = false;
      exportPickerVisible = false;
      syncAppbarVisibility();
    }, 340);
  }

  $: mainRecoilTranslate = -8 * mainRecoilValue;
  $: mainRecoilScale = 1 - 0.02 * mainRecoilValue;
  $: mainTransformStyle = `transform: translate3d(${mainRecoilTranslate}%, 0, 0) scale(${mainRecoilScale});`;

  onDestroy(() => {
    if (vvRef) {
      vvRef.removeEventListener('resize', scheduleKbUpdate);
      vvRef.removeEventListener('scroll', scheduleKbUpdate);
    }
    document.removeEventListener('focusin', lockViewport, true);
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
    unsubscribeMainRecoil?.();
    unsubscribeExportSlide?.();
    mainRecoil.destroy?.();
    exportSlide.destroy?.();
    teardownStaticAppbar();
  });

  let showDocMenu = false;
  let docMenuBtnEl;
  let docMenuAnchor = { top: 0, right: 0 };

  function openDocMenu() {
    buzz();
    if (docMenuBtnEl) {
      const r = docMenuBtnEl.getBoundingClientRect();
      docMenuAnchor = { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) };
    }
    showDocMenu = true;
  }
  function closeDocMenu() { showDocMenu = false; }

  function handleDocMenuSelect(e) {
    const id = e.detail;
    showDocMenu = false;
    if (id === 'duplicate') duplicateDoc();
    else if (id === 'share') openExport('share');
    else if (id === 'export') openExport('export');
    else if (id === 'delete') askDeleteDoc();
  }

  function duplicateDoc() {
    const raw = localStorage.getItem(STORAGE_PREFIX + docId);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const newId = 'doc_' + Date.now().toString(36);
      const payload = { name: parsed.name + ' (cópia)', content: parsed.content, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_PREFIX + newId, JSON.stringify(payload));
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      index.push({ id: newId, name: payload.name, updatedAt: payload.updatedAt });
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
      showToast('Documento duplicado');
    } catch (e) { showToast('Não foi possível duplicar'); }
  }

  let showDeleteConfirm = false;
  function askDeleteDoc() { showDeleteConfirm = true; }
  function cancelDeleteDoc() { showDeleteConfirm = false; }
  function confirmDeleteDoc() {
    try {
      localStorage.removeItem(STORAGE_PREFIX + docId);
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index.filter(d => d.id !== docId)));
    } catch (e) {}
    showDeleteConfirm = false;
    dispatch('nav', { to: 'home' });
  }

  // ══════════════════════════════════════════════════════════════════
  //  APPBAR ESTÁTICA — HTML PURO, FORA DO SVELTE
  //
  //  A appbar deixou de ser markup Svelte. É criada UMA VEZ em
  //  onMount, injetada diretamente em document.body via innerHTML,
  //  e a partir daí NUNCA MAIS é tocada pelo ciclo reativo do
  //  componente. Os únicos valores que mudam (cor do tema, nome do
  //  documento, estado "Gravado/Não gravado/A gravar…", visibilidade
  //  quando o Export abre) são escritos diretamente no DOM via
  //  element.style / element.value / element.textContent, chamados
  //  a partir das próprias funções que já mudam esse estado — nunca
  //  a partir de um bloco $: reativo do Svelte.
  //
  //  Isto elimina de vez a hipótese de o Svelte estar a reatribuir o
  //  atributo style="" do elemento fixed a cada re-render do
  //  componente (o que acontecia antes: qualquer mudança de state
  //  neste ficheiro — activePageIndex, kbOffset, docName, savedState
  //  — fazia o Svelte reavaliar TODO o markup do componente,
  //  incluindo o style="...{c.xxx}..." da appbar, mesmo que o valor
  //  final fosse idêntico. Reatribuir style num elemento
  //  position:fixed, a meio de uma transição de teclado, é o tipo
  //  de coisa que pode levar o compositor do WebView a recompor essa
  //  layer de forma errada.).
  // ══════════════════════════════════════════════════════════════════

  let staticAppbarEl = null;

  function buildStaticAppbarHTML() {
    return `
      <div class="nexa-static-appbar" id="nexaStaticAppbar">
        <button class="nexa-appbar-btn" id="nexaAppbarBack" aria-label="Voltar">
          <span class="nexa-icon-mask" id="nexaAppbarBackIcon" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');width:20px;height:20px;"></span>
        </button>
        <div class="nexa-appbar-center">
          <input class="nexa-doc-name-input" id="nexaDocNameInput" aria-label="Nome do documento" />
          <span class="nexa-save-state" id="nexaSaveState"></span>
        </div>
        <button class="nexa-appbar-btn" id="nexaAppbarMenu" aria-label="Mais opções">
          <span class="nexa-icon-mask" id="nexaAppbarMenuIcon" style="mask-image:url('/icons/svg/more_vert.svg');-webkit-mask-image:url('/icons/svg/more_vert.svg');width:20px;height:20px;"></span>
        </button>
      </div>
    `;
  }

  function mountStaticAppbar() {
    if (staticAppbarEl) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildStaticAppbarHTML();
    staticAppbarEl = wrapper.firstElementChild;
    document.body.appendChild(staticAppbarEl);

    const backBtn = staticAppbarEl.querySelector('#nexaAppbarBack');
    const menuBtn = staticAppbarEl.querySelector('#nexaAppbarMenu');
    const nameInput = staticAppbarEl.querySelector('#nexaDocNameInput');

    backBtn.addEventListener('click', () => dispatch('nav', { to: 'home' }));
    menuBtn.addEventListener('click', () => {
      buzz();
      if (menuBtn) {
        const r = menuBtn.getBoundingClientRect();
        docMenuAnchor = { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) };
      }
      showDocMenu = true;
    });
    nameInput.addEventListener('input', (e) => { docName = e.target.value; scheduleSave(); });
    nameInput.addEventListener('blur', (e) => {
      if (!docName || !docName.trim()) {
        docName = 'Documento sem título';
        e.target.value = docName;
      }
      scheduleSave();
    });

    nameInput.value = docName;
    syncAppbarTheme();
    syncAppbarSaveState();
    syncAppbarVisibility();
  }

  function teardownStaticAppbar() {
    if (staticAppbarEl && staticAppbarEl.parentNode) {
      staticAppbarEl.parentNode.removeChild(staticAppbarEl);
    }
    staticAppbarEl = null;
  }

  function syncAppbarTheme() {
    if (!staticAppbarEl) return;
    staticAppbarEl.style.background = c.background;
    staticAppbarEl.style.borderBottom = `0.5px solid ${c.divider}`;
    staticAppbarEl.style.color = c.textPrimary;
    const backBtn = staticAppbarEl.querySelector('#nexaAppbarBack');
    const menuBtn = staticAppbarEl.querySelector('#nexaAppbarMenu');
    const backIcon = staticAppbarEl.querySelector('#nexaAppbarBackIcon');
    const menuIcon = staticAppbarEl.querySelector('#nexaAppbarMenuIcon');
    const nameInput = staticAppbarEl.querySelector('#nexaDocNameInput');
    const saveState = staticAppbarEl.querySelector('#nexaSaveState');
    if (backBtn) backBtn.style.background = c.appbarBtnBg;
    if (menuBtn) menuBtn.style.background = c.appbarBtnBg;
    if (backIcon) backIcon.style.background = c.iconTint;
    if (menuIcon) menuIcon.style.background = c.iconTint;
    if (nameInput) nameInput.style.color = c.textPrimary;
    if (saveState) saveState.style.color = c.textSecondary;
  }

  function syncAppbarSaveState() {
    if (!staticAppbarEl) return;
    const saveState = staticAppbarEl.querySelector('#nexaSaveState');
    if (!saveState) return;
    const label = savedState === 'saving' ? 'A gravar…' : savedState === 'dirty' ? 'Não gravado' : 'Gravado';
    if (saveState.textContent !== label) saveState.textContent = label;
  }

  function syncAppbarVisibility() {
    if (!staticAppbarEl) return;
    staticAppbarEl.style.opacity = exportPickerOpen ? '0' : '1';
    staticAppbarEl.style.visibility = exportPickerOpen ? 'hidden' : 'visible';
    staticAppbarEl.style.pointerEvents = exportPickerOpen ? 'none' : 'auto';
  }

  // Reage a mudanças de tema (isDark) sem re-render Svelte da appbar —
  // só corre quando `c` de facto muda de referência (getThemeColors
  // devolve novo objeto quando isDark muda), nunca a cada tick de
  // outro state não relacionado ao tema.
  $: if (staticAppbarEl && c) syncAppbarTheme();

  onMount(() => {
    mountStaticAppbar();
  });
</script>

<div
  class="root"
  bind:this={rootEl}
  style="background:{c.background};color:{c.textPrimary};{mainTransformStyle}"
>
  <div class="canvas-area" style="background:{c.docCanvasBg}">
    <DocPage
      bind:this={docPageComp}
      {initialContent}
      {footnotes}
      bind:activePageIndex
      on:ready={handleDocReady}
      on:input={handleInput}
      on:keydown={(e) => handleKeydown(e.detail)}
      on:removefootnote={(e) => removeFootnote(e.detail)}
      on:imagerequestedit={handleImageRequestEdit}
      on:pagefocus={handlePageFocusFromChild}
      on:totalpages={(e) => { totalPages = e.detail; }}
    />
  </div>

  <CreationToolsBar
    {c}
    visible={!isEditing}
    on:action={(e) => handleCreationToolAction(e.detail)}
  />

  <BottomToolbar
    {c}
    {activePanel}
    {canUndo}
    {canRedo}
    {kbOffset}
    visible={isEditing}
    on:action={(e) => handleToolbarAction(e.detail)}
  />

  <DocMenu
    visible={showDocMenu}
    anchor={docMenuAnchor}
    {c}
    on:close={closeDocMenu}
    on:select={handleDocMenuSelect}
  />

  <FormatModal
    {activePanel}
    {c}
    bind:linkUrlDraft
    bind:footnoteDraft
    on:close={closeFormatModal}
    on:setfont={(e) => setFont(e.detail)}
    on:setsize={(e) => setSize(e.detail)}
    on:setalign={(e) => setAlign(e.detail)}
    on:setlist={(e) => setList(e.detail)}
    on:confirmlink={confirmInsertLink}
    on:removelink={removeLink}
    on:confirmfootnote={confirmInsertFootnote}
  />

  <ColorModal
    visible={colorModalOpen}
    {c}
    {customColors}
    on:close={() => colorModalOpen = false}
    on:select={(e) => selectColor(e.detail)}
    on:addcolor={requestAddColor}
  />

  <ColorPickerModal
    visible={colorPickerOpen}
    {c}
    on:confirm={(e) => confirmCustomColor(e.detail)}
    on:cancel={cancelCustomColor}
  />

  <TableModal
    visible={tableModalOpen}
    {c}
    on:close={() => tableModalOpen = false}
    on:insert={insertTable}
  />

  <LayersModal
    visible={layersModalOpen}
    {c}
    layers={currentPageLayers}
    on:close={() => layersModalOpen = false}
    on:select={handleLayerSelect}
    on:delete={handleLayerDelete}
  />

  <ConfirmDialog
    visible={showDeleteConfirm}
    {c}
    message={`Tens a certeza que queres apagar "${docName}"? Esta ação não pode ser desfeita.`}
    confirmLabel="Apagar"
    on:cancel={cancelDeleteDoc}
    on:confirm={confirmDeleteDoc}
  />

  <input type="file" accept="image/*" bind:this={fileInputEl} on:change={insertImage} style="display:none" />
</div>

<!-- Camada de overlay (ExportPickerPage) — desliza da direita por cima -->
{#if exportPickerVisible}
  <ExportPickerPage
    slideX={exportSlideX}
    {isDark}
    {docName}
    mode={exportPickerMode}
    getHtml={getEditorHTML}
    {setSuppressRouterPopstate}
    on:close={closeExportPicker}
  />
{/if}

<style>
  :global(html), :global(body) {
    width: 100%;
    height: 100%;
    overflow: hidden;
    overflow-anchor: none;
    overscroll-behavior: none;
    position: relative;
  }

  .root {
    position: fixed;
    left: 0; right: 0; top: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-anchor: none;
    contain: layout style paint;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    overscroll-behavior: none;
  }

  .canvas-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    overflow-anchor: none;
    display: flex;
    flex-direction: column;
    padding-top: 100px;
    contain: strict;
  }

  /* ══════════════════════════════════════════════════════════════
     APPBAR ESTÁTICA — estas classes aplicam-se a um elemento que
     vive em document.body, FORA da árvore Svelte deste componente,
     via :global(). Não há nenhum seletor .appbar Svelte-scoped aqui.
     ══════════════════════════════════════════════════════════════ */
  :global(.nexa-static-appbar) {
    display: flex; align-items: center; gap: 10px;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px;
    flex-shrink: 0;
    position: fixed;
    left: 0; right: 0; top: 0;
    height: 100px;
    z-index: 9999;
    contain: paint;
    transform: translateZ(0);
    will-change: auto;
    overflow-anchor: none;
    pointer-events: auto;
    transition: opacity .2s ease, visibility .2s ease;
    backface-visibility: hidden;
    box-sizing: border-box;
  }
  :global(.nexa-appbar-btn) {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  :global(.nexa-appbar-btn:active) { opacity: .7; transform: scale(0.94); }
  :global(.nexa-appbar-center) { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
  :global(.nexa-doc-name-input) {
    width: 100%; max-width: 220px; text-align: center; font-size: 16px; font-weight: 700;
    border: none; background: transparent; outline: none; padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  :global(.nexa-save-state) { font-size: 11px; font-weight: 500; margin-top: 1px; white-space: nowrap; display: block; }
  :global(.nexa-icon-mask) {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>