<!-- pages/MainPage.svelte -->
<script>
  import { localIconPath } from '$shared/local-icon.js';

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
  import DesignModal from '../components/DesignModal.svelte';
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
  const ICON_PX = 24;

  const STORAGE_PREFIX = 'docs_';
  const CUSTOM_COLORS_KEY = STORAGE_PREFIX + 'custom_colors';

  // ── Conteúdo pendente vindo do Assistente de IA ─────────────────
  // Quando o utilizador prime "Aplicar" num cartão de documento
  // gerado pela IA (ver ai/pages/ChatPage.svelte -> renderNativeAppContent
  // -> applyDocsContent), o chat grava aqui um payload {title, html}
  // em sessionStorage e navega para /docs/ SEM resourceId, o que faz
  // loadOrCreateDoc() criar sempre um documento novo — exatamente
  // como qualquer outro documento novo criado a partir do zero, só
  // que já vem com o conteúdo da IA lá dentro em vez de vazio.
  const PENDING_APPLY_KEY = 'nexa_pending_apply_docs';

  function readPendingApply() {
    try {
      const raw = sessionStorage.getItem(PENDING_APPLY_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(PENDING_APPLY_KEY);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.html !== 'string') return null;
      return parsed;
    } catch (e) { return null; }
  }

  let docPageComp;
  let docName = 'Documento sem título';
  let docId = resourceId || null;
  let saveTimeout;
  let savedState = 'saved';

  // Guardado à parte de loadOrCreateDoc() para o onMount poder
  // injetar o HTML pendente no editor DEPOIS do DocPage estar
  // montado (initialContent só é lido na criação do componente).
  let pendingApplyPayload = null;

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

    // Sem resourceId (documento novo) é exatamente o cenário em que
    // um pedido de aplicação vindo da IA deve ser consumido: se
    // existir, este documento novo nasce já com esse conteúdo.
    if (!resourceId) {
      pendingApplyPayload = readPendingApply();
      if (pendingApplyPayload) {
        docName = pendingApplyPayload.title || docName;
        return pendingApplyPayload.html || '';
      }
    }
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
    // NOTA: os listeners de 'focusin'/'selectionchange'/'pointerdown'
    // globais que existiam aqui em versões anteriores foram REMOVIDOS
    // de propósito. Cada um deles era uma tentativa de "compensar"
    // reflows causados por outra parte do sistema (--app-vh a mudar,
    // o .root a redimensionar) — mas como agora .root é 100dvh FIXO
    // e o appbar não lê nenhuma variável de teclado, não há reflow
    // nenhum para compensar. A única fonte de verdade do teclado é
    // window.visualViewport, e a única coisa que reage a ela é
    // --kb-offset, que só a BottomToolbar/CreationToolsBar leem via
    // transform. Menos código a reagir ao teclado = menos formas de
    // ele saltar.

    // Se este documento nasceu a partir de um cartão "Aplicar" da IA,
    // persistimos imediatamente para o doc aparecer logo na lista de
    // documentos (DocumentsTab/home) e avisamos o utilizador com um
    // toast, tal como qualquer outra ação bem-sucedida na app.
    if (pendingApplyPayload) {
      persist();
      showToast('Documento aplicado com sucesso');
      pendingApplyPayload = null;
    }
  });

  function getEditorHTML() { return docPageComp ? docPageComp.getContent() : ''; }
  function setEditorHTML(html) { docPageComp && docPageComp.setContent(html); }
  function focusEditor() { docPageComp && docPageComp.focusEditor(); }

  function persist() {
    savedState = 'saving';
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
  }

  function scheduleSave() {
    savedState = 'dirty';
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

  // undo/redo já não precisam de suspender nada relacionado ao
  // teclado — setEditorHTML() ainda tira/devolve o foco por um
  // instante, mas como --kb-offset só é recomputado no
  // resize/scroll real do visualViewport (nunca a partir de
  // focusin/pointerdown), essa perda de foco momentânea já não
  // dispara nenhum recálculo. Simplesmente já não há nada para a
  // recriação do DOM "confundir".
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
  let designModalOpen = false;
  let activeDesignTool = null;

  // Grupo ativo no BottomToolbar (Base / Inserir / Desenhar) — vive
  // aqui para poder ser restaurado a 'base' sempre que se sai do modo
  // de edição, tal como o Word faz.
  let activeToolbarGroup = 'base';

  // Cor atual do texto/realçador — refletida nas swatches do
  // BottomToolbar. fontColorHex começa a preto (padrão do texto);
  // highlightHex começa null (sem realce, swatch cinza).
  let fontColorHex = '#1a1a1a';
  let highlightHex = null;

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

  let activePageIndex = 0;
  let totalPages = 1;
  let showDocMenu = false;
  let docMenuAnchor = null;
  let docMenuBtnEl;
  let showDeleteConfirm = false;
  let fileInputEl;
  let footnotes = [];
  let linkUrlDraft = '';
  let footnoteDraft = '';
  let exportPickerVisible = false;
  let exportPickerMode = 'export';
  let exportSlideX = createSlideTransition({});

  let isEditing = false;

  function enterEditing() {
    isEditing = true;
    activeToolbarGroup = 'base';
    requestAnimationFrame(() => focusEditor());
  }
  function exitEditing() {
    isEditing = false;
    activeToolbarGroup = 'base';
    docPageComp && docPageComp.blurEditor();
    activePanel = null;
  }

  function setupKeyboardAvoidance() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    function applyOffset() {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-offset', offset + 'px');
    }
    vv.addEventListener('resize', applyOffset);
    vv.addEventListener('scroll', applyOffset);
    applyOffset();
  }

  function handlePageFocusFromChild(e) {
    activePageIndex = e.detail;
    refreshLayers();
  }

  function handleImageRequestEdit(e) {
    refreshLayers();
  }

  function handleToolbarGroupChange(detail) {
    activeToolbarGroup = detail;
  }

  function closeFormatModal() { activePanel = null; }

  function setFont(font) { exec('fontName', font); }
  function setSize(px) {
    focusEditor();
    document.execCommand('fontSize', false, '7');
    scheduleSave();
    docPageComp && docPageComp.normalizeFontSizeMarkers(px);
    pushHistory();
  }
  function setAlign(align) {
    const map = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' };
    exec(map[align] || 'justifyLeft');
  }
  function setList(kind) {
    exec(kind === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList');
  }

  function confirmInsertLink(e) {
    const url = (e.detail || '').trim();
    if (!url) { activePanel = null; return; }
    focusEditor();
    document.execCommand('createLink', false, url);
    docPageComp && docPageComp.tagLinksWithHref(url);
    scheduleSave();
    pushHistory(true);
    activePanel = null;
  }
  function removeLink() {
    focusEditor();
    document.execCommand('unlink');
    scheduleSave();
    pushHistory(true);
    activePanel = null;
  }

  function confirmInsertFootnote(e) {
    const text = (e.detail || '').trim();
    if (!text) { activePanel = null; return; }
    const id = 'fn' + (footnotes.length + 1) + '_' + Date.now().toString(36);
    footnotes = [...footnotes, { id, text }];
    focusEditor();
    document.execCommand('insertHTML', false, `<sup data-footnote-id="${id}">[${footnotes.length}]</sup>`);
    scheduleSave();
    pushHistory(true);
    activePanel = null;
  }

  function removeFootnote(id) {
    footnotes = footnotes.filter(f => f.id !== id);
    docPageComp && docPageComp.removeFootnoteRef(id);
    scheduleSave();
  }

  function selectColor(hex) {
    if (colorPickerTargetIsHighlight) {
      focusEditor();
      document.execCommand('hiliteColor', false, hex === 'transparent' ? 'transparent' : hex);
      highlightHex = hex === 'transparent' ? null : hex;
    } else {
      focusEditor();
      document.execCommand('foreColor', false, hex);
      fontColorHex = hex;
    }
    scheduleSave();
    pushHistory(true);
    colorModalOpen = false;
  }

  let colorPickerTargetIsHighlight = false;
  function requestAddColor() {
    colorModalOpen = false;
    colorPickerOpen = true;
  }
  function confirmCustomColor(hex) {
    customColors = [hex, ...customColors.filter(c => c !== hex)].slice(0, 12);
    persistCustomColors();
    colorPickerOpen = false;
    selectColor(hex);
  }
  function cancelCustomColor() { colorPickerOpen = false; }

  function insertImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      docPageComp && docPageComp.insertImageAtCursor(reader.result);
      scheduleSave();
      pushHistory(true);
      refreshLayers();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function insertTable(detail) {
    docPageComp && docPageComp.insertTable(detail.rows, detail.cols);
    scheduleSave();
    pushHistory(true);
    tableModalOpen = false;
  }

  function handleLayerSelect(e) {
    const { pageIndex, objId } = e.detail;
    docPageComp && docPageComp.selectFloatById(pageIndex, objId);
  }
  function handleLayerDelete(e) {
    const { pageIndex, objId } = e.detail;
    docPageComp && docPageComp.deleteImage({ pageIndex, objId });
    refreshLayers();
  }

  function handleDesignSelect(e) {
    designModalOpen = false;
    activeDesignTool = null;
    showToast('Modelo aplicado');
  }

  function handleCreationToolAction(action) {
    if (action === 'edit') { enterEditing(); return; }
    if (action === 'table') { tableModalOpen = true; return; }
    if (action === 'image') { fileInputEl && fileInputEl.click(); return; }
    if (action === 'layers') { refreshLayers(); layersModalOpen = true; return; }
    if (action === 'design') { designModalOpen = true; return; }
  }

  function handleToolbarAction(action) {
    const { type, value } = action || {};
    if (type === 'exit') { exitEditing(); return; }
    if (type === 'bold') { exec('bold'); return; }
    if (type === 'italic') { exec('italic'); return; }
    if (type === 'underline') { exec('underline'); return; }
    if (type === 'strike') { exec('strikeThrough'); return; }
    if (type === 'font') { activePanel = 'font'; return; }
    if (type === 'size') { activePanel = 'size'; return; }
    if (type === 'align') { activePanel = 'align'; return; }
    if (type === 'list') { activePanel = 'list'; return; }
    if (type === 'color') { colorPickerTargetIsHighlight = false; colorModalOpen = true; return; }
    if (type === 'highlight') { colorPickerTargetIsHighlight = true; colorModalOpen = true; return; }
    if (type === 'link') { activePanel = 'link'; return; }
    if (type === 'footnote') { activePanel = 'footnote'; return; }
    if (type === 'table') { tableModalOpen = true; return; }
    if (type === 'image') { fileInputEl && fileInputEl.click(); return; }
    if (type === 'undo') { undo(); return; }
    if (type === 'redo') { redo(); return; }
  }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); return; }
    scheduleSave();
    pushHistory();
  }

  function openDocMenu() {
    docMenuAnchor = docMenuBtnEl;
    showDocMenu = true;
  }
  function closeDocMenu() { showDocMenu = false; }

  function handleDocMenuSelect(e) {
    const action = e.detail;
    showDocMenu = false;
    if (action === 'rename') {
      setTimeout(() => {
        const input = document.querySelector('.doc-name-input');
        if (input) { input.focus(); input.select(); }
      }, 200);
      return;
    }
    if (action === 'delete') { showDeleteConfirm = true; return; }
    if (action === 'export') { exportPickerMode = 'export'; exportPickerVisible = true; setSuppressRouterPopstate(true); return; }
    if (action === 'print') { exportPickerMode = 'print'; exportPickerVisible = true; setSuppressRouterPopstate(true); return; }
    if (action === 'duplicate') {
      const newId = 'doc_' + Date.now().toString(36);
      const payload = { name: docName + ' (cópia)', content: getEditorHTML(), updatedAt: Date.now() };
      try {
        localStorage.setItem(STORAGE_PREFIX + newId, JSON.stringify(payload));
        const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
        const index = indexRaw ? JSON.parse(indexRaw) : [];
        index.push({ id: newId, name: payload.name, updatedAt: payload.updatedAt });
        localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
        showToast('Documento duplicado');
      } catch (err) {}
      return;
    }
  }

  function cancelDeleteDoc() { showDeleteConfirm = false; }
  function confirmDeleteDoc() {
    showDeleteConfirm = false;
    try {
      localStorage.removeItem(STORAGE_PREFIX + docId);
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index.filter(d => d.id !== docId)));
    } catch (e) {}
    dispatch('nav', { to: 'home' });
  }

  function closeExportPicker() {
    exportPickerVisible = false;
    setSuppressRouterPopstate(false);
  }

  onDestroy(() => {
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
    if (savedState !== 'saved') persist();
  });
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">
  <div class="appbar" style="background:{c.appbarSurface};">
    <button class="appbar-btn" on:click={() => dispatch('nav', { to: 'home' })} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_left_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_left_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    </button>

    <div class="appbar-center">
      {#if !isEditing}
        <span style="font-size:16px;color:{c.textPrimary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">{docName}</span>
      {:else}
        <input
          class="doc-name-input"
          style="color:{c.textPrimary}"
          value={docName}
          on:input={handleNameInput}
          on:blur={handleNameBlur}
          aria-label="Nome do documento"
        />
      {/if}
    </div>

    {#if isEditing}
      <button class="appbar-btn" on:click={() => showToast('Caligrafia em breve')} aria-label="Caligrafia">
        <span class="icon-mask" style="mask-image:url('{localIconPath('calligraphy_pen_24_regular')}');-webkit-mask-image:url('{localIconPath('calligraphy_pen_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      </button>
      <button class="appbar-btn" on:click={() => showToast('Pesquisar em breve')} aria-label="Pesquisar">
        <span class="icon-mask" style="mask-image:url('{localIconPath('search_24_regular')}');-webkit-mask-image:url('{localIconPath('search_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      </button>
      <button class="appbar-btn" on:click={() => showToast('Esquema em breve')} aria-label="Esquema">
        <span class="icon-mask" style="mask-image:url('{localIconPath('document_24_regular')}');-webkit-mask-image:url('{localIconPath('document_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      </button>
      <button class="appbar-btn" disabled={!canUndo} on:click={undo} aria-label="Desfazer">
        <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_undo_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_undo_24_regular')}');background:{c.iconTint};width:24px;height:24px;opacity:{canUndo ? 1 : 0.32};"></span>
      </button>
    {:else}
      <button class="appbar-btn" on:click={() => showToast('Pesquisar em breve')} aria-label="Pesquisar">
        <span class="icon-mask" style="mask-image:url('{localIconPath('search_24_regular')}');-webkit-mask-image:url('{localIconPath('search_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      </button>
    {/if}

    <button class="appbar-btn" bind:this={docMenuBtnEl} on:click={openDocMenu} aria-label="Mais opções">
      <span class="icon-mask" style="mask-image:url('{localIconPath('more_horizontal_24_regular')}');-webkit-mask-image:url('{localIconPath('more_horizontal_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
    </button>
  </div>

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
    bind:activeGroup={activeToolbarGroup}
    {fontColorHex}
    {highlightHex}
    visible={isEditing}
    on:action={(e) => handleToolbarAction(e.detail)}
    on:groupchange={(e) => handleToolbarGroupChange(e.detail)}
  />

  <DocMenu
    visible={showDocMenu}
    anchor={docMenuAnchor}
    {c}
    {isDark}
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

  <DesignModal
    visible={designModalOpen}
    {c}
    {isDark}
    activeTool={activeDesignTool}
    on:close={() => designModalOpen = false}
    on:select={handleDesignSelect}
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
    /* 100dvh fixo, sem nenhuma dependência de variável JS de altura.
       Isto é a base de tudo: como esta altura NUNCA muda por causa
       do teclado, nada dentro deste container é forçado a
       reposicionar-se quando o teclado abre/fecha. */
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-anchor: none;
    contain: layout style paint;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    overscroll-behavior: none;
  }

  /* APPBAR — 100% ESTÁTICO. Nenhuma propriedade aqui referencia
     --kb-offset, --app-vh, ou qualquer variável ligada ao teclado.
     flex-shrink:0 no topo do .root (que tem altura fixa) significa
     que este elemento nunca é redimensionado nem reposicionado por
     nada relacionado ao teclado — exatamente como pedido: só a
     bottombar/input sobe, o appbar fica sempre parado. */
  .appbar {
    display: flex; align-items: center; gap: 10px;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px;
    flex-shrink: 0;
    background: inherit;
    contain: paint;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 0; border: none;
    background: transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .14s;
  }
  .appbar-btn:active { opacity: .55; }
  .appbar-btn:disabled { cursor: default; }
  .appbar-btn:disabled:active { opacity: 1; }
  .appbar-center { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; }
  .doc-name-input {
    width: 100%; max-width: 220px; text-align: center; font-size: 16px; font-weight: 400;
    border: none; background: transparent; outline: none; padding: 0;
  }

  .canvas-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    overflow-anchor: none;
    display: flex;
    flex-direction: column;
    contain: strict;
  }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>