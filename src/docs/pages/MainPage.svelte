<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  import DocPage from '../components/DocPage.svelte';
  import DocMenu from '../components/DocMenu.svelte';
  import BottomToolbar from '../components/BottomToolbar.svelte';
  import ColorModal from '../components/ColorModal.svelte';
  import ColorPickerModal from '../components/ColorPickerModal.svelte';
  import FormatModal from '../components/FormatModal.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Docs';
  export let appId = 'docs';
  export let iconPath = '/icons/svg/docs/docs.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const STORAGE_PREFIX = 'docs_';
  const CUSTOM_COLORS_KEY = STORAGE_PREFIX + 'custom_colors';

  let editorEl;
  let docName = 'Documento sem título';
  let docId = resourceId || null;
  let saveTimeout;
  let savedState = 'saved'; // 'saved' | 'saving' | 'dirty'

  // --- Carregar ou criar documento ---
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
    } catch (e) {
      return [];
    }
  }
  let customColors = loadCustomColors();

  function persistCustomColors() {
    try {
      localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customColors));
    } catch (e) {}
  }

  onMount(() => {
    if (editorEl) editorEl.innerHTML = initialContent;
    initHistory();
    setupKeyboardAvoidance();
  });

  function persist() {
    if (!editorEl) return;
    savedState = 'saving';
    const payload = {
      name: docName,
      content: editorEl.innerHTML,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_PREFIX + docId, JSON.stringify(payload));
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const existing = index.find(d => d.id === docId);
      if (existing) {
        existing.name = docName;
        existing.updatedAt = payload.updatedAt;
      } else {
        index.push({ id: docId, name: docName, updatedAt: payload.updatedAt });
      }
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
      savedState = 'saved';
    } catch (e) {
      savedState = 'dirty';
    }
  }

  function scheduleSave() {
    savedState = 'dirty';
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persist, 700);
  }

  function handleInput() {
    scheduleSave();
    pushHistory();
  }

  function handleNameInput(e) {
    docName = e.target.value || 'Documento sem título';
    scheduleSave();
  }

  function exec(command, value = null) {
    editorEl?.focus();
    document.execCommand(command, false, value);
    scheduleSave();
    pushHistory();
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  // --- Histórico próprio de undo/redo ---
  let historyStack = [];
  let historyIndex = -1;
  let isRestoringHistory = false;
  let historyDebounce;
  const HISTORY_LIMIT = 100;

  function pushHistory() {
    if (isRestoringHistory || !editorEl) return;
    clearTimeout(historyDebounce);
    historyDebounce = setTimeout(() => {
      const snapshot = editorEl.innerHTML;
      if (historyStack[historyIndex] === snapshot) return;
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(snapshot);
      if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
      historyIndex = historyStack.length - 1;
    }, 300);
  }
  function initHistory() {
    historyStack = [editorEl?.innerHTML || ''];
    historyIndex = 0;
  }
  function undo() {
    if (historyIndex <= 0) return;
    isRestoringHistory = true;
    historyIndex -= 1;
    if (editorEl) editorEl.innerHTML = historyStack[historyIndex];
    scheduleSave();
    buzz();
    isRestoringHistory = false;
  }
  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    isRestoringHistory = true;
    historyIndex += 1;
    if (editorEl) editorEl.innerHTML = historyStack[historyIndex];
    scheduleSave();
    buzz();
    isRestoringHistory = false;
  }
  $: canUndo = historyIndex > 0;
  $: canRedo = historyIndex < historyStack.length - 1;

  // --- Estado dos modals ---
  let activePanel = null; // null | 'font' | 'size' | 'align' | 'list' | 'insert' | 'table' | 'link' | 'footnote'
  let colorModalOpen = false;
  let colorPickerOpen = false;

  function handleToolbarAction(id) {
    buzz();
    if (id === 'undo') { undo(); return; }
    if (id === 'redo') { redo(); return; }
    if (id === 'bold') { exec('bold'); return; }
    if (id === 'italic') { exec('italic'); return; }
    if (id === 'underline') { exec('underline'); return; }
    if (id === 'color') { colorModalOpen = true; return; }
    if (id === 'link') { openLinkPanel(); return; }
    if (id === 'footnote') { openFootnotePanel(); return; }
    // font, size, align, list, insert, table → modal genérico
    activePanel = id;
  }

  function closeFormatModal() {
    activePanel = null;
  }

  const FONTS_MAP = {}; // não necessário aqui, FormatModal já traz os valores

  function setFont(value) {
    exec('fontName', value);
    activePanel = null;
  }
  function setSize(px) {
    editorEl?.focus();
    document.execCommand('fontSize', false, '7');
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const container = editorEl.querySelectorAll('font[size="7"]');
      container.forEach(f => {
        f.removeAttribute('size');
        f.style.fontSize = px + 'px';
      });
    }
    scheduleSave();
    pushHistory();
    activePanel = null;
  }
  function setAlign(cmd) { exec(cmd); activePanel = null; }
  function setList(cmd) { exec(cmd); activePanel = null; }

  function insertImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      editorEl?.focus();
      document.execCommand('insertImage', false, ev.target.result);
      scheduleSave();
      pushHistory();
    };
    reader.readAsDataURL(file);
    activePanel = null;
    e.target.value = '';
  }
  function insertTable({ rows, cols }) {
    editorEl?.focus();
    let html = '<table class="doc-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let cIdx = 0; cIdx < cols; cIdx++) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
    scheduleSave();
    pushHistory();
    activePanel = null;
  }

  // --- Cor: fluxo ColorModal ⇄ ColorPickerModal ---
  function selectColor(hex) {
    exec('foreColor', hex);
    colorModalOpen = false;
  }
  function requestAddColor() {
    // Fecha o modal de cores e abre o picker ajustável, como pedido:
    // "fecha o modal de cores e abre o modal de selecionar cor".
    colorModalOpen = false;
    colorPickerOpen = true;
  }
  function confirmCustomColor(hex) {
    if (!customColors.includes(hex)) {
      customColors = [...customColors, hex];
      persistCustomColors();
    }
    colorPickerOpen = false;
    // Volta ao modal de cores com a nova cor já na secção "Criadas".
    colorModalOpen = true;
  }
  function cancelCustomColor() {
    colorPickerOpen = false;
    colorModalOpen = true;
  }

  // --- Links ---
  let linkUrlDraft = '';
  let savedSelectionRange = null;

  function openLinkPanel() {
    editorEl?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      savedSelectionRange = sel.getRangeAt(0).cloneRange();
    } else {
      savedSelectionRange = null;
    }
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
    editorEl?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      document.execCommand('insertHTML', false,
        `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
      const anchors = editorEl.querySelectorAll('a[href="' + cssEscape(url) + '"]');
      anchors.forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      });
    }
    scheduleSave();
    pushHistory();
    linkUrlDraft = '';
    savedSelectionRange = null;
    activePanel = null;
  }
  function removeLink() {
    editorEl?.focus();
    restoreSelection();
    document.execCommand('unlink');
    scheduleSave();
    pushHistory();
    activePanel = null;
  }
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }
  function cssEscape(str) {
    return (window.CSS && CSS.escape) ? CSS.escape(str) : str.replace(/(["\\])/g, '\\$1');
  }

  // --- Notas de rodapé ---
  let footnotes = [];
  let footnoteDraft = '';
  let footnoteCounter = 0;

  function openFootnotePanel() {
    editorEl?.focus();
    footnoteDraft = '';
    activePanel = 'footnote';
  }
  function confirmInsertFootnote() {
    const text = footnoteDraft.trim();
    if (!text) return;
    editorEl?.focus();
    footnoteCounter += 1;
    const num = footnoteCounter;
    const noteId = 'fn' + num + '_' + Date.now().toString(36);
    footnotes = [...footnotes, { id: noteId, num, text }];
    document.execCommand('insertHTML', false,
      `<sup class="footnote-ref" data-footnote-id="${noteId}">${num}</sup>`);
    scheduleSave();
    pushHistory();
    footnoteDraft = '';
    activePanel = null;
  }
  function removeFootnote(id) {
    footnotes = footnotes.filter(f => f.id !== id);
    if (editorEl) {
      const ref = editorEl.querySelector(`sup[data-footnote-id="${id}"]`);
      if (ref) ref.remove();
    }
    scheduleSave();
    pushHistory();
  }

  let fileInputEl;
  function triggerImagePicker() {
    fileInputEl?.click();
  }

  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
  }

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD AVOIDING — appbar NUNCA se move. Só a bottom toolbar (e
  //  a folha, através do padding do canvas) reagem ao teclado.
  // ══════════════════════════════════════════════════════════════════
  let kbOffset = 0;
  let kbUpdateRaf = null;

  function computeKbOffset() {
    const vv = window.visualViewport;
    if (!vv) { kbOffset = 0; return; }
    const overlap = window.innerHeight - (vv.height + vv.offsetTop);
    kbOffset = overlap > 40 ? Math.round(overlap) : 0;
  }
  function scheduleKbUpdate() {
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    kbUpdateRaf = requestAnimationFrame(computeKbOffset);
  }
  let vvRef = null;
  function setupKeyboardAvoidance() {
    vvRef = window.visualViewport;
    if (!vvRef) return;
    vvRef.addEventListener('resize', scheduleKbUpdate);
    vvRef.addEventListener('scroll', scheduleKbUpdate);
  }
  onDestroy(() => {
    if (vvRef) {
      vvRef.removeEventListener('resize', scheduleKbUpdate);
      vvRef.removeEventListener('scroll', scheduleKbUpdate);
    }
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
  });

  // ══════════════════════════════════════════════════════════════════
  //  DocMenu — dropdown ancorado (estilo imagem de referência), sem
  //  overlay escuro, substitui o antigo botão de settings.
  // ══════════════════════════════════════════════════════════════════
  let showDocMenu = false;

  function openDocMenu() {
    buzz();
    showDocMenu = true;
  }
  function closeDocMenu() {
    showDocMenu = false;
  }

  function handleDocMenuSelect(e) {
    const id = e.detail;
    showDocMenu = false;
    if (id === 'duplicate') duplicateDoc();
    else if (id === 'share') shareDoc();
    else if (id === 'export') exportDoc();
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
    } catch (e) {
      showToast('Não foi possível duplicar');
    }
  }

  async function shareDoc() {
    const text = editorEl ? editorEl.innerText : '';
    if (navigator.share) {
      try { await navigator.share({ title: docName, text }); } catch (e) {}
    } else {
      showToast('Partilha não suportada neste dispositivo');
    }
  }

  function exportDoc() {
    if (!editorEl) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(docName)}</title></head><body>${editorEl.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docName.replace(/[^\w\-]+/g, '_') + '.html';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Documento exportado');
  }

  let showDeleteConfirm = false;
  function askDeleteDoc() {
    showDeleteConfirm = true;
  }
  function cancelDeleteDoc() {
    showDeleteConfirm = false;
  }
  function confirmDeleteDoc() {
    try {
      localStorage.removeItem(STORAGE_PREFIX + docId);
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const filtered = index.filter(d => d.id !== docId);
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(filtered));
    } catch (e) {}
    showDeleteConfirm = false;
    dispatch('nav', { to: 'home' });
  }
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">

  <!-- Appbar: FIXO, nunca reage ao teclado. -->
  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'home' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;"></span>
    </button>
    <div class="appbar-center">
      <input
        class="doc-name-input"
        style="color:{c.textPrimary}"
        value={docName}
        on:input={handleNameInput}
        aria-label="Nome do documento"
      />
      <span class="save-state" style="color:{c.textSecondary}">
        {#if savedState === 'saving'}A gravar…{:else if savedState === 'dirty'}Não gravado{:else}Gravado{/if}
      </span>
    </div>
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={openDocMenu} aria-label="Mais opções">
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/more.svg');-webkit-mask-image:url('/icons/svg/docs/more.svg');background:{c.iconTint};width:20px;height:20px;"></span>
    </button>
  </div>

  <!-- Folha A4 com pinch-to-zoom, ajustada à largura do ecrã -->
  <DocPage
    bind:editorEl
    {footnotes}
    on:input={handleInput}
    on:keydown={(e) => handleKeydown(e.detail)}
    on:removefootnote={(e) => removeFootnote(e.detail)}
  />

  <!-- Toolbar inferior nativa, com keyboard avoiding -->
  <BottomToolbar
    {c}
    {activePanel}
    {canUndo}
    {canRedo}
    {kbOffset}
    on:action={(e) => handleToolbarAction(e.detail)}
  />

  <!-- Dropdown ancorado do documento -->
  <DocMenu
    visible={showDocMenu}
    {c}
    on:close={closeDocMenu}
    on:select={handleDocMenuSelect}
  />

  <!-- Modal de formatação genérico -->
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
    on:triggerimage={triggerImagePicker}
    on:inserttable={(e) => insertTable(e.detail)}
    on:confirmlink={confirmInsertLink}
    on:removelink={removeLink}
    on:confirmfootnote={confirmInsertFootnote}
  />

  <!-- Modal de cores -->
  <ColorModal
    visible={colorModalOpen}
    {c}
    {customColors}
    on:close={() => colorModalOpen = false}
    on:select={(e) => selectColor(e.detail)}
    on:addcolor={requestAddColor}
  />

  <!-- Modal de picker ajustável -->
  <ColorPickerModal
    visible={colorPickerOpen}
    {c}
    on:confirm={(e) => confirmCustomColor(e.detail)}
    on:cancel={cancelCustomColor}
  />

  <!-- Confirmar apagar -->
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

<style>
  .root { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; }

  /* Appbar fixo — sem transform, sem transition ligada ao teclado. */
  .appbar {
    display: flex; align-items: center; gap: 10px;
    padding: 52px 12px 12px; flex-shrink: 0;
    background: inherit;
    position: relative;
    z-index: 50;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .appbar-btn:active { opacity: .7; transform: scale(0.94); }
  .appbar-center { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; }
  .doc-name-input {
    width: 100%; max-width: 220px; text-align: center; font-size: 16px; font-weight: 700;
    border: none; background: transparent; outline: none; padding: 0;
  }
  .save-state { font-size: 11px; font-weight: 500; margin-top: 1px; }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
</style>