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

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD AVOIDANCE — arquitetura idêntica à do ChatPage.svelte
  //  (referência validada): window.visualViewport é a ÚNICA fonte de
  //  verdade, e a altura que ele reporta é aplicada DIRETAMENTE como
  //  height (em px) do container .root via JS.
  //
  //  Isto substitui por completo a tentativa anterior com 100dvh: em
  //  Chrome/Android, 100dvh recalcula-se sozinho quando o teclado
  //  abre (arrastando .root, .appbar e a folha consigo de forma
  //  descontrolada), e a fórmula antiga de --kb-offset
  //  (innerHeight - visualViewport.height) dava quase sempre 0 em
  //  Android, porque aí innerHeight TAMBÉM encolhe com o teclado — só
  //  em iOS Safari é que innerHeight fica fixo. Por isso a barra não
  //  reagia lá e reagia mal noutros dispositivos.
  //
  //  Com .root a receber a altura exata do visualViewport em px:
  //   • .appbar é flex-shrink:0 no topo do .root — nunca é tocado por
  //     nenhuma variável de teclado, nunca sobe nem um pixel.
  //   • .canvas-area (onde vive a folha) é flex:1 puro — não tem
  //     nenhum estilo ligado ao teclado; ocupa sempre "o que sobra"
  //     dentro de um pai já com a altura correta, por isso a folha
  //     em si não sobe nem encolhe de forma visível.
  //   • BottomToolbar/CreationToolsBar são position:absolute;
  //     bottom:0 DENTRO do .root (não fixed ao viewport). Como o
  //     .root encolhe via JS quando o teclado abre, a barra ativa
  //     sobe "de graça" só por estar colada ao fundo desse pai — sem
  //     precisar de nenhum transform nem variável --kb-offset.
  // ══════════════════════════════════════════════════════════════════
  let rootEl;
  let vvRef = null;

  function applyViewportHeight() {
    const vv = window.visualViewport;
    if (!rootEl) return;
    const h = vv ? vv.height : window.innerHeight;
    rootEl.style.height = h + 'px';
  }

  function setupKeyboardAvoidance() {
    applyViewportHeight();
    vvRef = window.visualViewport;
    if (vvRef) {
      vvRef.addEventListener('resize', applyViewportHeight);
      vvRef.addEventListener('scroll', applyViewportHeight);
    }
    window.addEventListener('resize', applyViewportHeight);
    window.addEventListener('orientationchange', handleOrientationChange);
  }

  function handleOrientationChange() {
    setTimeout(applyViewportHeight, 120);
  }

  onMount(() => {
    setupKeyboardAvoidance();
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
      const index = indexRaw ? JSON.parse(indexRaw) : {};
      index[docId] = { name: docName, updatedAt: payload.updatedAt };
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
      savedState = 'saved';
    } catch (e) { savedState = 'saved'; }
  }

  function scheduleSave() {
    savedState = 'saving';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persist, 600);
  }

  function handleInput() {
    scheduleSave();
    updateUndoRedoAvailability();
  }

  function handleDocReady() {
    pushHistorySnapshot(true);
  }

  function handleNameInput(e) {
    docName = e.target.value;
    scheduleSave();
  }
  function handleNameBlur() {
    if (!docName || !docName.trim()) docName = 'Documento sem título';
    scheduleSave();
  }

  // ══════════════════════════════════════════════════════════════════
  //  HISTÓRICO (undo/redo)
  // ══════════════════════════════════════════════════════════════════
  let historyStack = [];
  let historyIndex = -1;
  let historyDebounce;
  let canUndo = false;
  let canRedo = false;

  function updateUndoRedoAvailability() {
    canUndo = historyIndex > 0;
    canRedo = historyIndex < historyStack.length - 1;
  }

  function pushHistorySnapshot(isInitial = false) {
    clearTimeout(historyDebounce);
    const doPush = () => {
      const html = getEditorHTML();
      if (historyIndex >= 0 && historyStack[historyIndex] === html && !isInitial) return;
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(html);
      if (historyStack.length > 60) historyStack.shift();
      historyIndex = historyStack.length - 1;
      updateUndoRedoAvailability();
    };
    if (isInitial) doPush();
    else historyDebounce = setTimeout(doPush, 500);
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    setEditorHTML(historyStack[historyIndex]);
    updateUndoRedoAvailability();
    scheduleSave();
  }
  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex += 1;
    setEditorHTML(historyStack[historyIndex]);
    updateUndoRedoAvailability();
    scheduleSave();
  }

  function handleKeydown(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
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
    }, 340);
  }

  $: mainRecoilTranslate = -8 * mainRecoilValue;
  $: mainRecoilScale = 1 - 0.02 * mainRecoilValue;
  $: mainTransformStyle = `transform: translate3d(${mainRecoilTranslate}%, 0, 0) scale(${mainRecoilScale});`;

  onDestroy(() => {
    if (vvRef) {
      vvRef.removeEventListener('resize', applyViewportHeight);
      vvRef.removeEventListener('scroll', applyViewportHeight);
    }
    window.removeEventListener('resize', applyViewportHeight);
    window.removeEventListener('orientationchange', handleOrientationChange);
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
    unsubscribeMainRecoil?.();
    unsubscribeExportSlide?.();
  });

  // ══════════════════════════════════════════════════════════════════
  //  ESTADO DE EDIÇÃO — isEditing controla TANTO o appbar (que grupo
  //  de botões aparece à esquerda/direita) COMO qual bottom bar
  //  aparece.
  //  O appbar é 100% ESTÁTICO — nunca sobe, nunca desce, nunca
  //  desaparece, independentemente do teclado ou de qualquer ação.
  //  Fica sempre fixo no topo do ecrã. Só a bottom bar
  //  (BottomToolbar/CreationToolsBar) reage ao teclado, exatamente
  //  como no ChatPage.svelte: só o input/toolbar sobe, o appbar
  //  fica parado.
  // ══════════════════════════════════════════════════════════════════
  let isEditing = false;

  function handlePageFocus() { if (!isEditing) isEditing = true; }

  function confirmDoneEditing() {
    buzz();
    docPageComp && docPageComp.blurEditor();
    docPageComp && docPageComp.deselectFloat();
    activePanel = null;
    designModalOpen = false;
    activeToolbarGroup = 'base';
    isEditing = false;
  }

  function handleAppbarLeftAction() {
    buzz();
    if (isEditing) { confirmDoneEditing(); return; }
    dispatch('nav', { to: 'home' });
  }

  function handleToolbarAction(id) {
    buzz();
    if (id === 'done') { confirmDoneEditing(); return; }
    if (id === 'undo') { undo(); return; }
    if (id === 'redo') { redo(); return; }
    if (id === 'bold') { exec('bold'); return; }
    if (id === 'italic') { exec('italic'); return; }
    if (id === 'underline') { exec('underline'); return; }
    if (id === 'strikethrough') { exec('strikeThrough'); return; }
    if (id === 'color') { openColorPanel('highlight'); return; }
    if (id === 'fontcolor') { openColorPanel('font'); return; }
    if (id === 'font') { activePanel = 'font'; return; }
    if (id === 'size') { activePanel = 'size'; return; }
    if (id === 'align') { activePanel = 'align'; return; }
    if (id === 'list') { setList('bullet'); return; }
    if (id === 'numbering') { setList('number'); return; }
    if (id === 'link') { openLinkPanel(); return; }
    if (id === 'footnote') { openFootnotePanel(); return; }
    if (id === 'layers') { openLayersModal(); return; }
    if (id === 'insert') { fileInputEl && fileInputEl.click(); return; }
    if (id === 'table') { tableModalOpen = true; return; }
    if (id === 'design') { designModalOpen = true; return; }
  }

  function handleToolbarGroupChange(id) {
    activeToolbarGroup = id;
  }

  function handleCreationToolAction(id) {
    buzz();
    if (id === 'edit') {
      isEditing = true;
      tick().then(() => focusEditor());
      return;
    }
    if (id === 'share') { showToast('Partilhar em breve'); return; }
    if (id === 'readaloud') { showToast('Ler em voz alta em breve'); return; }
    if (id === 'devicelayout') { showToast('Vista para dispositivo em breve'); return; }
    if (id === 'headings') { showToast('Cabeçalhos em breve'); return; }
  }

  let activePanel = null;
  let activeToolbarGroup = 'base';
  let linkUrlDraft = '';
  let footnoteDraft = '';
  let colorModalOpen = false;
  let colorPickerOpen = false;
  let tableModalOpen = false;
  let layersModalOpen = false;
  let designModalOpen = false;
  let activeDesignTool = null;
  let colorPanelMode = 'font';
  let fontColorHex = '#1a1a1a';
  let highlightHex = null;
  let footnotes = [];
  let showDocMenu = false;
  let docMenuAnchor = null;
  let docMenuBtnEl;
  let showDeleteConfirm = false;
  let fileInputEl;

  function buzz() { try { navigator.vibrate && navigator.vibrate(6); } catch (e) {} }

  function exec(cmd) {
    docPageComp && docPageComp.exec(cmd);
    scheduleSave();
  }

  function setAlign(v) { docPageComp && docPageComp.setAlign(v); activePanel = null; scheduleSave(); }
  function setList(v) { docPageComp && docPageComp.setList(v); activePanel = null; scheduleSave(); }
  function setFont(v) { docPageComp && docPageComp.setFont(v); activePanel = null; scheduleSave(); }
  function setSize(v) { docPageComp && docPageComp.setSize(v); activePanel = null; scheduleSave(); }

  function openColorPanel(mode) {
    colorPanelMode = mode;
    colorModalOpen = true;
  }
  function selectColor(hex) {
    if (colorPanelMode === 'font') {
      fontColorHex = hex;
      docPageComp && docPageComp.exec('foreColor', hex);
    } else {
      highlightHex = hex;
      docPageComp && docPageComp.exec('hiliteColor', hex);
    }
    colorModalOpen = false;
    scheduleSave();
  }
  function requestAddColor() {
    colorModalOpen = false;
    colorPickerOpen = true;
  }
  function confirmCustomColor(hex) {
    if (!customColors.includes(hex)) {
      customColors = [hex, ...customColors].slice(0, 20);
      persistCustomColors();
    }
    colorPickerOpen = false;
    colorModalOpen = true;
    selectColor(hex);
  }
  function cancelCustomColor() {
    colorPickerOpen = false;
    colorModalOpen = true;
  }

  function openLinkPanel() {
    linkUrlDraft = docPageComp ? (docPageComp.getExistingLink() || '') : '';
    activePanel = 'link';
  }
  function confirmInsertLink(e) {
    const url = e.detail;
    docPageComp && docPageComp.insertLink(url);
    activePanel = null;
    scheduleSave();
  }
  function removeLink() {
    docPageComp && docPageComp.removeLink();
    activePanel = null;
    scheduleSave();
  }

  function openFootnotePanel() {
    footnoteDraft = '';
    activePanel = 'footnote';
  }
  function confirmInsertFootnote(e) {
    const text = e.detail;
    if (!text || !text.trim()) { activePanel = null; return; }
    const note = docPageComp && docPageComp.insertFootnote(text.trim());
    if (note) footnotes = [...footnotes, note];
    activePanel = null;
    scheduleSave();
  }
  function removeFootnote(id) {
    footnotes = footnotes.filter(f => f.id !== id);
    scheduleSave();
  }

  function openLayersModal() {
    layersModalOpen = true;
  }
  $: currentPageLayers = docPageComp ? docPageComp.getLayers ? docPageComp.getLayers() : [] : [];

  function handleLayerSelect(e) {
    docPageComp && docPageComp.selectLayer && docPageComp.selectLayer(e.detail);
    layersModalOpen = false;
  }
  function handleLayerDelete(e) {
    docPageComp && docPageComp.deleteLayer && docPageComp.deleteLayer(e.detail);
    layersModalOpen = false;
  }

  function handleImageRequestEdit(e) {
    activeDesignTool = e.detail;
    designModalOpen = true;
  }
  function handleDesignSelect(e) {
    docPageComp && docPageComp.applyDesignTool && docPageComp.applyDesignTool(e.detail);
  }

  function insertImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      docPageComp && docPageComp.insertImage(ev.target.result);
      scheduleSave();
    };
    reader.readAsDataURL(file);
    fileInputEl.value = '';
  }

  function openDocMenu() {
    docMenuAnchor = docMenuBtnEl;
    showDocMenu = true;
  }
  function closeDocMenu() {
    showDocMenu = false;
  }
  function handleDocMenuSelect(e) {
    const id = e.detail;
    closeDocMenu();
    if (id === 'export') { openExport('export'); return; }
    if (id === 'print') { openExport('print'); return; }
    if (id === 'share') { showToast('Partilhar em breve'); return; }
    if (id === 'rename') { showToast('Toca no nome no topo para renomear'); return; }
    if (id === 'delete') { showDeleteConfirm = true; return; }
    if (id === 'duplicate') { showToast('Duplicar em breve'); return; }
  }

  function cancelDeleteDoc() {
    showDeleteConfirm = false;
  }
  function confirmDeleteDoc() {
    showDeleteConfirm = false;
    dispatch('nav', { to: 'home' });
  }
</script>

<div
  class="root"
  bind:this={rootEl}
  style="background:{c.background};color:{c.textPrimary};{mainTransformStyle}"
>
  <div class="appbar-gradient" class:dark={isDark}></div>

  <div class="appbar" style="color:{c.textPrimary};">
    <button class="appbar-btn" on:click={handleAppbarLeftAction} aria-label={isEditing ? 'Concluir edição' : 'Fechar'}>
      {#if isEditing}
        <span class="icon-mask" style="mask-image:url('{localIconPath('checkmark_24_regular')}');-webkit-mask-image:url('{localIconPath('checkmark_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      {:else}
        <span class="icon-mask" style="mask-image:url('{localIconPath('dismiss_24_regular')}');-webkit-mask-image:url('{localIconPath('dismiss_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      {/if}
    </button>

    <div class="appbar-center">
      {#if !isEditing}
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

  /* ROOT — altura em px, imposta via JS a partir de
     window.visualViewport.height (ver applyViewportHeight no script
     acima). NENHUM dvh/vh aqui: são essas unidades que recalculavam
     sozinhas em Chrome/Android quando o teclado abria, arrastando
     tudo lá dentro de forma descontrolada. Com height em px fixo por
     JS, .root só muda quando NÓS mandamos mudar — e só a bottom bar
     ativa (position:absolute; bottom:0 dela) é que está posicionada
     de forma a reagir a essa mudança. */
  .root {
    position: fixed;
    left: 0; right: 0; top: 0;
    height: 100vh; /* valor inicial só para o primeiro paint, antes do JS correr; é substituído em px no onMount */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-anchor: none;
    contain: layout style paint;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    overscroll-behavior: none;
  }

  /* GRADIENTE DE TRANSPARÊNCIA DO APPBAR — mesmo efeito do
     ChatPage.svelte: uma camada atrás do appbar que desvanece de
     opaco (no topo) para transparente, deixando o conteúdo da folha
     visível por trás quando se faz scroll. O appbar em si fica com
     fundo transparente (ver .appbar abaixo) para este gradiente
     aparecer através dele. */
  .appbar-gradient {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 110px;
    pointer-events: none;
    z-index: 39;
  }
  .appbar-gradient:not(.dark) {
    background: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,.97) 50%, rgba(255,255,255,0) 100%);
  }
  .appbar-gradient.dark {
    background: linear-gradient(to bottom, rgba(15,15,15,1) 0%, rgba(15,15,15,.95) 45%, rgba(15,15,15,0) 100%);
  }

  /* APPBAR — 100% ESTÁTICO e agora TRANSPARENTE (o gradiente acima é
     quem dá a leitura visual). flex-shrink:0 no topo do .root
     significa que nunca é redimensionado nem reposicionado por nada
     relacionado ao teclado: só a bottombar/CreationToolsBar sobem, o
     appbar fica sempre parado. */
  .appbar {
    position: relative;
    z-index: 40;
    display: flex; align-items: center; gap: 10px;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px;
    flex-shrink: 0;
    background: transparent;
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

  /* CANVAS-AREA — onde vive a folha (DocPage). flex:1 puro, sem
     nenhuma propriedade ligada ao teclado ou a --kb-offset (essa
     variável deixou de existir em todo o projeto). A folha ocupa
     sempre "o que sobra" dentro de um .root já com a altura correta
     — por isso ela não sobe nem encolhe de forma visível por conta
     própria quando o teclado abre. */
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