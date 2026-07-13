<script>
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Docs';
  export let appId = 'docs';
  export let iconPath = '/icons/svg/docs/docs.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const STORAGE_PREFIX = 'nexa_docs_';

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
    // Sem resourceId ou não encontrado: documento novo vazio.
    docId = resourceId || ('doc_' + Date.now().toString(36));
    docName = 'Documento sem título';
    return '';
  }

  let initialContent = loadOrCreateDoc();

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
      // Mantém um índice simples de documentos para o Tab de Projetos poder listar.
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

  // --- Formatação ---
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
  // document.execCommand('undo') é inconsistente entre browsers WebView,
  // por isso mantemos uma pilha de snapshots do innerHTML.
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
      // Corta qualquer "futuro" (redo) se estivermos a meio da pilha.
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push(snapshot);
      if (historyStack.length > HISTORY_LIMIT) {
        historyStack.shift();
      }
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

  // --- Zoom da página A4 ---
  // Controla a escala visual da folha, tal como o zoom de um leitor de
  // PDF/Word no desktop. A folha mantém sempre a proporção real 210:297;
  // o zoom apenas dimensiona o contentor, não distorce a página.
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2;
  const ZOOM_STEP = 0.1;
  let zoom = 1;

  function zoomIn() {
    zoom = Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2));
    buzz();
  }
  function zoomOut() {
    zoom = Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2));
    buzz();
  }
  function zoomReset() {
    zoom = 1;
    buzz();
  }
  $: zoomPct = Math.round(zoom * 100);

  // --- Estado da toolbar: painéis expansíveis (agora modals centrados) ---
  let activePanel = null; // null | 'font' | 'size' | 'color' | 'align' | 'list' | 'insert' | 'table' | 'link' | 'footnote'
  let panelVisible = false;

  function togglePanel(name) {
    buzz();
    if (activePanel === name) {
      closePanel();
    } else {
      activePanel = name;
      panelVisible = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { panelVisible = true; }));
    }
  }
  function closePanel() {
    panelVisible = false;
    setTimeout(() => { activePanel = null; }, 220);
  }

  const FONTS = [
    { label: 'Padrão', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: "'SF Mono', Menlo, monospace" },
    { label: 'Arredondada', value: "'SF Pro Rounded', sans-serif" },
  ];
  const SIZES = ['12', '14', '16', '18', '24', '32', '48'];
  const COLORS = ['#000000', '#F0384A', '#E8720F', '#1FA34A', '#2F7BF6', '#8B3FE0', '#8E8E93'];

  function setFont(value) {
    exec('fontName', value);
    closePanel();
  }
  function setSize(px) {
    // execCommand fontSize só aceita 1-7; aplicamos via span+style para px reais.
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
    closePanel();
  }
  function setColor(hex) {
    exec('foreColor', hex);
    closePanel();
  }
  function setAlign(cmd) {
    exec(cmd);
    closePanel();
  }
  function setList(cmd) {
    exec(cmd);
    closePanel();
  }

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
    closePanel();
    e.target.value = '';
  }

  function insertTable(rows, cols) {
    editorEl?.focus();
    let html = '<table class="doc-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        html += '<td>&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
    scheduleSave();
    pushHistory();
    closePanel();
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
    togglePanel('link');
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
      // Sem texto selecionado: insere o próprio URL como texto do link.
      document.execCommand('insertHTML', false,
        `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
      // Garante target/rel corretos no link recém-criado.
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
    closePanel();
  }

  function removeLink() {
    editorEl?.focus();
    restoreSelection();
    document.execCommand('unlink');
    scheduleSave();
    pushHistory();
    closePanel();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  function nextFootnoteNumber() {
    footnoteCounter += 1;
    return footnoteCounter;
  }

  function openFootnotePanel() {
    editorEl?.focus();
    footnoteDraft = '';
    togglePanel('footnote');
  }

  function confirmInsertFootnote() {
    const text = footnoteDraft.trim();
    if (!text) return;
    editorEl?.focus();
    const num = nextFootnoteNumber();
    const noteId = 'fn' + num + '_' + Date.now().toString(36);
    footnotes = [...footnotes, { id: noteId, num, text }];
    document.execCommand('insertHTML', false,
      `<sup class="footnote-ref" data-footnote-id="${noteId}">${num}</sup>`);
    scheduleSave();
    pushHistory();
    footnoteDraft = '';
    closePanel();
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

  $: hasFootnotes = footnotes.length > 0;

  let fileInputEl;
  function triggerImagePicker() {
    fileInputEl?.click();
  }

  // --- Atalhos de teclado (útil quando há teclado físico ligado ao dispositivo) ---
  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((key === 'z' && e.shiftKey) || key === 'y') {
      e.preventDefault();
      redo();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD AVOIDING — a bottom bar (e o painel ativo, se aberto)
  //  sobem para cima do teclado físico do dispositivo, usando
  //  visualViewport (fiável em iOS/Android WebView), com fallback para
  //  window.innerHeight em browsers sem suporte.
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
  //  POPUP MENU DO DOCUMENTO — substitui o antigo botão de settings.
  //  Mesmo padrão de overlay a escurecer + scale-in usado no
  //  logout-dialog do SettingsPage, mas ancorado junto ao botão em vez
  //  de centrado no ecrã.
  // ══════════════════════════════════════════════════════════════════
  let showDocMenu = false;
  let docMenuVisible = false;

  function openDocMenu() {
    buzz();
    showDocMenu = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { docMenuVisible = true; }));
  }
  function closeDocMenu() {
    docMenuVisible = false;
    setTimeout(() => { showDocMenu = false; }, 220);
  }

  function duplicateDoc() {
    const raw = localStorage.getItem(STORAGE_PREFIX + docId);
    if (!raw) { closeDocMenu(); return; }
    try {
      const parsed = JSON.parse(raw);
      const newId = 'doc_' + Date.now().toString(36);
      const payload = {
        name: parsed.name + ' (cópia)',
        content: parsed.content,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_PREFIX + newId, JSON.stringify(payload));
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      index.push({ id: newId, name: payload.name, updatedAt: payload.updatedAt });
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(index));
      showToast('Documento duplicado');
    } catch (e) {
      showToast('Não foi possível duplicar');
    }
    closeDocMenu();
  }

  async function shareDoc() {
    closeDocMenu();
    const text = editorEl ? editorEl.innerText : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: docName, text });
      } catch (e) {
        // utilizador cancelou a partilha nativa, nada a fazer
      }
    } else {
      showToast('Partilha não suportada neste dispositivo');
    }
  }

  function exportDoc() {
    closeDocMenu();
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
  let deleteConfirmVisible = false;

  function askDeleteDoc() {
    closeDocMenu();
    showDeleteConfirm = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { deleteConfirmVisible = true; }));
  }
  function cancelDeleteDoc() {
    deleteConfirmVisible = false;
    setTimeout(() => { showDeleteConfirm = false; }, 260);
  }
  function confirmDeleteDoc() {
    try {
      localStorage.removeItem(STORAGE_PREFIX + docId);
      const indexRaw = localStorage.getItem(STORAGE_PREFIX + 'index');
      const index = indexRaw ? JSON.parse(indexRaw) : [];
      const filtered = index.filter(d => d.id !== docId);
      localStorage.setItem(STORAGE_PREFIX + 'index', JSON.stringify(filtered));
    } catch (e) {}
    deleteConfirmVisible = false;
    setTimeout(() => { showDeleteConfirm = false; }, 260);
    dispatch('nav', { to: 'home' });
  }
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">

  <!-- Appbar: nativo, fino, com nome do documento editável e estado de gravação -->
  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'home' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
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
      <span class="icon-mask" style="mask-image:url('/icons/svg/docs/more.svg');-webkit-mask-image:url('/icons/svg/docs/more.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <!-- Área do documento: folha real de desktop, com zoom, sobre uma "secretária" cinzenta -->
  <div class="canvas-scroll" style="background:{c.docs_canvas_bg || (isDark ? '#1c1c1e' : '#e9e9ec')}">
    <div class="page-a4-wrap" style="transform: scale({zoom});">
      <div class="page-a4" style="background:#FFFFFF">
        <div
          class="editor"
          contenteditable="true"
          bind:this={editorEl}
          on:input={handleInput}
          on:keydown={handleKeydown}
          spellcheck="true"
          role="textbox"
          aria-multiline="true"
          aria-label="Conteúdo do documento"
        ></div>

        {#if hasFootnotes}
          <div class="footnotes-block">
            <div class="footnotes-divider"></div>
            {#each footnotes as fn (fn.id)}
              <div class="footnote-line">
                <span class="footnote-num">{fn.num}.</span>
                <span class="footnote-text">{fn.text}</span>
                <button class="footnote-remove" on:click={() => removeFootnote(fn.id)} aria-label="Remover nota">×</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Controlo de zoom: flutuante, canto inferior direito, acima da bottom bar -->
  <div class="zoom-control" style="background:{c.dialogBackground};bottom:calc(env(safe-area-inset-bottom,0px) + 78px + {kbOffset}px)">
    <button class="zoom-btn" on:click={zoomOut} aria-label="Reduzir">–</button>
    <button class="zoom-pct" on:click={zoomReset} aria-label="Repor zoom">{zoomPct}%</button>
    <button class="zoom-btn" on:click={zoomIn} aria-label="Ampliar">+</button>
  </div>

  <!-- Toolbar inferior nativa: pílula flutuante, ícones redondos, com keyboard avoiding -->
  <div class="bottom-toolbar-wrap" style="transform: translate3d(0, -{kbOffset}px, 0);">
    <div class="bottom-toolbar" style="background:{c.dialogBackground}">
      <button class="tb-btn" on:click={undo} disabled={!canUndo} aria-label="Desfazer">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/undo.svg');-webkit-mask-image:url('/icons/svg/docs/undo.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;opacity:{canUndo ? 1 : 0.35};"></span>
      </button>
      <button class="tb-btn" on:click={redo} disabled={!canRedo} aria-label="Refazer">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/redo.svg');-webkit-mask-image:url('/icons/svg/docs/redo.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;opacity:{canRedo ? 1 : 0.35};"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" on:click={() => exec('bold')} aria-label="Negrito">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/bold.svg');-webkit-mask-image:url('/icons/svg/docs/bold.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" on:click={() => exec('italic')} aria-label="Itálico">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/italic.svg');-webkit-mask-image:url('/icons/svg/docs/italic.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" on:click={() => exec('underline')} aria-label="Sublinhado">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/underline.svg');-webkit-mask-image:url('/icons/svg/docs/underline.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='font'} on:click={() => togglePanel('font')} aria-label="Fonte">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/font.svg');-webkit-mask-image:url('/icons/svg/docs/font.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='size'} on:click={() => togglePanel('size')} aria-label="Tamanho">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/font_size.svg');-webkit-mask-image:url('/icons/svg/docs/font_size.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='color'} on:click={() => togglePanel('color')} aria-label="Cor">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/text_color.svg');-webkit-mask-image:url('/icons/svg/docs/text_color.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='align'} on:click={() => togglePanel('align')} aria-label="Alinhamento">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_left.svg');-webkit-mask-image:url('/icons/svg/docs/align_left.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='list'} on:click={() => togglePanel('list')} aria-label="Listas">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/list_bullet.svg');-webkit-mask-image:url('/icons/svg/docs/list_bullet.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='link'} on:click={openLinkPanel} aria-label="Inserir link">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/link.svg');-webkit-mask-image:url('/icons/svg/docs/link.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='footnote'} on:click={openFootnotePanel} aria-label="Inserir nota de rodapé">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/footnote.svg');-webkit-mask-image:url('/icons/svg/docs/footnote.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='insert'} on:click={() => togglePanel('insert')} aria-label="Inserir imagem">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/image.svg');-webkit-mask-image:url('/icons/svg/docs/image.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='table'} on:click={() => togglePanel('table')} aria-label="Inserir tabela">
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/table.svg');-webkit-mask-image:url('/icons/svg/docs/table.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
    </div>
  </div>

  <!-- ══ MODAL — Formatação (font/size/color/align/list/insert/table/link/footnote) ══
       Mesmo padrão do SettingsPage: overlay a escurecer + cartão central com scale-in. -->
  {#if activePanel}
    <div class="modal-overlay" class:modal-overlay-in={panelVisible} on:click={closePanel}></div>
    <div class="modal-card" class:modal-card-in={panelVisible} style="background:{c.dialogBackground}">
      {#if activePanel === 'font'}
        <div class="modal-title" style="color:{c.textPrimary}">Fonte</div>
        <div class="modal-grid">
          {#each FONTS as f}
            <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary};font-family:{f.value}" on:click={() => setFont(f.value)}>{f.label}</button>
          {/each}
        </div>
      {:else if activePanel === 'size'}
        <div class="modal-title" style="color:{c.textPrimary}">Tamanho</div>
        <div class="modal-grid">
          {#each SIZES as s}
            <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => setSize(s)}>{s}</button>
          {/each}
        </div>
      {:else if activePanel === 'color'}
        <div class="modal-title" style="color:{c.textPrimary}">Cor do texto</div>
        <div class="modal-grid">
          {#each COLORS as col}
            <button class="color-dot" style="background:{col}" on:click={() => setColor(col)} aria-label={col}></button>
          {/each}
        </div>
      {:else if activePanel === 'align'}
        <div class="modal-title" style="color:{c.textPrimary}">Alinhamento</div>
        <div class="modal-grid">
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyLeft')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_left.svg');-webkit-mask-image:url('/icons/svg/docs/align_left.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyCenter')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_center.svg');-webkit-mask-image:url('/icons/svg/docs/align_center.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyRight')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_right.svg');-webkit-mask-image:url('/icons/svg/docs/align_right.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyFull')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_justify.svg');-webkit-mask-image:url('/icons/svg/docs/align_justify.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
        </div>
      {:else if activePanel === 'list'}
        <div class="modal-title" style="color:{c.textPrimary}">Listas</div>
        <div class="modal-grid">
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setList('insertUnorderedList')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/list_bullet.svg');-webkit-mask-image:url('/icons/svg/docs/list_bullet.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setList('insertOrderedList')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/docs/list_number.svg');-webkit-mask-image:url('/icons/svg/docs/list_number.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
        </div>
      {:else if activePanel === 'insert'}
        <div class="modal-title" style="color:{c.textPrimary}">Inserir</div>
        <div class="modal-grid">
          <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={triggerImagePicker}>Imagem</button>
        </div>
      {:else if activePanel === 'table'}
        <div class="modal-title" style="color:{c.textPrimary}">Inserir tabela</div>
        <div class="modal-grid">
          <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(2,2)}>2×2</button>
          <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(3,3)}>3×3</button>
          <button class="modal-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(4,3)}>4×3</button>
        </div>
      {:else if activePanel === 'link'}
        <div class="modal-title" style="color:{c.textPrimary}">Inserir link</div>
        <input
          class="modal-input"
          style="background:{c.appbarBtnBg};color:{c.textPrimary}"
          placeholder="https://..."
          bind:value={linkUrlDraft}
          on:keydown={(e) => e.key === 'Enter' && confirmInsertLink()}
        />
        <div class="modal-actions">
          <button class="modal-btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={removeLink}>Remover</button>
          <button class="modal-btn-primary" on:click={confirmInsertLink}>Aplicar</button>
        </div>
      {:else if activePanel === 'footnote'}
        <div class="modal-title" style="color:{c.textPrimary}">Nova nota de rodapé</div>
        <input
          class="modal-input"
          style="background:{c.appbarBtnBg};color:{c.textPrimary}"
          placeholder="Texto da nota…"
          bind:value={footnoteDraft}
          on:keydown={(e) => e.key === 'Enter' && confirmInsertFootnote()}
        />
        <div class="modal-actions">
          <button class="modal-btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={closePanel}>Cancelar</button>
          <button class="modal-btn-primary" on:click={confirmInsertFootnote}>Inserir</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ══ POPUP MENU DO DOCUMENTO — substitui o botão de settings ══
       Ancorado junto ao botão, mesmo padrão overlay + scale-in. -->
  {#if showDocMenu}
    <button class="doc-menu-overlay" class:doc-menu-overlay-in={docMenuVisible} on:click={closeDocMenu}></button>
    <div class="doc-menu" class:doc-menu-in={docMenuVisible} style="background:{c.dialogBackground}">
      <button class="doc-menu-item" style="color:{c.textPrimary}" on:click={duplicateDoc}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/duplicate.svg');-webkit-mask-image:url('/icons/svg/docs/duplicate.svg');background:{c.iconTint};width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Duplicar
      </button>
      <div class="doc-menu-divider" style="background:{c.divider}"></div>
      <button class="doc-menu-item" style="color:{c.textPrimary}" on:click={shareDoc}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/share.svg');-webkit-mask-image:url('/icons/svg/docs/share.svg');background:{c.iconTint};width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Partilhar
      </button>
      <div class="doc-menu-divider" style="background:{c.divider}"></div>
      <button class="doc-menu-item" style="color:{c.textPrimary}" on:click={exportDoc}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/export.svg');-webkit-mask-image:url('/icons/svg/docs/export.svg');background:{c.iconTint};width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Exportar
      </button>
      <div class="doc-menu-divider" style="background:{c.divider}"></div>
      <button class="doc-menu-item doc-menu-danger" on:click={askDeleteDoc}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/docs/delete.svg');-webkit-mask-image:url('/icons/svg/docs/delete.svg');background:#FF3B30;width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Apagar
      </button>
    </div>
  {/if}

  <!-- ══ MODAL — Confirmar apagar documento ══
       Mesmo padrão do logout-dialog: overlay a escurecer + cartão central scale-in. -->
  {#if showDeleteConfirm}
    <div class="modal-overlay" class:modal-overlay-in={deleteConfirmVisible}></div>
    <div class="confirm-dialog" class:confirm-dialog-in={deleteConfirmVisible} style="background:{c.dialogBackground}">
      <p class="confirm-dialog-text" style="color:{c.textPrimary}">
        Tens a certeza que queres apagar "{docName}"? Esta ação não pode ser desfeita.
      </p>
      <div class="confirm-dialog-actions">
        <button class="confirm-btn-cancel" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={cancelDeleteDoc}>Cancelar</button>
        <button class="confirm-btn-danger" on:click={confirmDeleteDoc}>Apagar</button>
      </div>
    </div>
  {/if}

  <input type="file" accept="image/*" bind:this={fileInputEl} on:change={insertImage} style="display:none" />
</div>

<style>
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }

  /* ---------- Appbar ---------- */
  .appbar { display:flex; align-items:center; gap:10px; padding:52px 12px 12px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
  .appbar-btn:active { opacity:.7; transform:scale(0.94); }
  .appbar-center { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; }
  .doc-name-input {
    width:100%; max-width:220px; text-align:center; font-size:16px; font-weight:700;
    border:none; background:transparent; outline:none; padding:0;
  }
  .save-state { font-size:11px; font-weight:500; margin-top:1px; }

  /* ---------- Canvas / secretária + folha A4 real com zoom ---------- */
  .canvas-scroll {
    flex:1; overflow:auto;
    padding: 32px 16px calc(env(safe-area-inset-bottom,0px) + 140px);
    display:flex; flex-direction:column; align-items:center;
    -webkit-overflow-scrolling: touch;
  }
  .page-a4-wrap {
    flex-shrink:0;
    transform-origin: top center;
    transition: transform .12s ease-out;
  }
  /* Proporção A4 real (210×297mm ≈ 1:1.4142). Largura fixa (não elástica
     ao ecrã) para se comportar como uma folha real de desktop — quem
     quer ver mais folha usa o zoom, tal como no Word/Google Docs. */
  .page-a4 {
    width: 595px;
    aspect-ratio: 210 / 297;
    border-radius: 0;
    padding: 64px 56px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.16);
    display: flex;
    flex-direction: column;
  }
  .editor {
    width:100%; flex:1; outline:none;
    font-size:15px; line-height:1.6; color:#1a1a1a;
    overflow-wrap:break-word;
  }
  .editor :global(table.doc-table) {
    border-collapse:collapse; width:100%; margin:12px 0;
  }
  .editor :global(table.doc-table td) {
    border:1px solid #d0d0d0; padding:8px; min-width:40px; height:28px;
  }
  .editor :global(img) { max-width:100%; height:auto; border-radius:4px; }
  .editor :global(a) { color:#2F7BF6; text-decoration:underline; }
  .editor :global(.footnote-ref) { color:#2F7BF6; cursor:default; }

  /* ---------- Bloco de notas de rodapé ---------- */
  .footnotes-block { margin-top:24px; flex-shrink:0; }
  .footnotes-divider { width:120px; height:1px; background:#d0d0d0; margin-bottom:10px; }
  .footnote-line { display:flex; align-items:flex-start; gap:6px; font-size:11px; color:#555; margin-bottom:4px; }
  .footnote-num { font-weight:700; flex-shrink:0; }
  .footnote-text { flex:1; line-height:1.5; }
  .footnote-remove {
    border:none; background:transparent; color:#999; font-size:14px; line-height:1; cursor:pointer;
    padding:0 2px; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .footnote-remove:active { color:#F0384A; }

  /* ---------- Controlo de zoom flutuante ---------- */
  .zoom-control {
    position: fixed; right: 16px;
    display:flex; align-items:center; gap:2px;
    border-radius: 999px; padding: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.12);
    z-index: 40;
    transition: bottom .18s ease-out;
  }
  .zoom-btn {
    width:30px; height:30px; border:none; border-radius:50%; background:transparent;
    font-size:17px; font-weight:600; line-height:1; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    -webkit-tap-highlight-color:transparent;
  }
  .zoom-btn:active { transform:scale(0.88); background:rgba(127,127,127,0.14); }
  .zoom-pct {
    min-width:44px; border:none; background:transparent; font-size:12px; font-weight:600;
    padding:0 4px; cursor:pointer; -webkit-tap-highlight-color:transparent;
  }

  /* ---------- Bottom toolbar nativa: pílula flutuante com keyboard avoiding ---------- */
  .bottom-toolbar-wrap {
    position: fixed;
    left: 0; right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    padding: 0 12px calc(env(safe-area-inset-bottom,0px) + 14px);
    pointer-events: none;
    transition: transform .15s ease-out;
  }
  .bottom-toolbar {
    pointer-events: auto;
    display:flex; align-items:center; gap:2px;
    padding: 6px 8px;
    border-radius: 999px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.14);
    overflow-x:auto; -webkit-overflow-scrolling:touch;
    max-width: 100%;
  }
  .bottom-toolbar::-webkit-scrollbar { display: none; }
  .tb-btn {
    width:38px; height:38px; border:none; background:transparent; border-radius:50%;
    display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;
    -webkit-tap-highlight-color:transparent;
    transition: background .16s cubic-bezier(0.34,1.56,0.64,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tb-btn:active { transform:scale(0.88); background:rgba(127,127,127,0.12); }
  .tb-btn:disabled { cursor:default; }
  .tb-active { background:rgba(47,123,246,0.14); }
  .tb-divider { width:1px; height:20px; margin:0 3px; flex-shrink:0; }

  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  /* ══════════════════════════════════════════════════════════════
     MODAL de formatação — MESMO padrão visual do logout-dialog do
     SettingsPage: overlay a escurecer + cartão central com scale-in.
  ══════════════════════════════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0, 0, 0, 0); border: none; cursor: default; width: 100%; height: 100%;
    transition: background .28s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .modal-overlay.modal-overlay-in { background: rgba(0, 0, 0, 0.45); }
  .modal-card {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 81;
    min-width: 280px; max-width: 90vw;
    transition: transform .38s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .26s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .modal-card.modal-card-in { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  .modal-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; text-align: center; }
  .modal-grid { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
  .modal-chip {
    border:none; border-radius:14px; padding:10px 16px; font-size:14px; font-weight:600;
    cursor:pointer; white-space:nowrap; -webkit-tap-highlight-color:transparent;
  }
  .modal-chip.round { border-radius: 999px; }
  .modal-chip:active { transform:scale(0.95); }
  .panel-icon-btn {
    width:44px; height:44px; border:none; border-radius:50%; display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .panel-icon-btn:active { transform:scale(0.9); }
  .color-dot {
    width:32px; height:32px; border-radius:50%; border:2px solid rgba(127,127,127,0.2);
    cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .color-dot:active { transform:scale(0.88); }
  .modal-input {
    width:100%; border:none; border-radius:999px; padding:12px 16px;
    font-size:14px; outline:none; margin-bottom:14px; box-sizing:border-box;
  }
  .modal-actions { display:flex; gap:10px; }
  .modal-btn-primary, .modal-btn-secondary {
    flex:1; padding:11px 16px; border-radius:999px; border:none;
    font-size:14px; font-weight:600; cursor:pointer; text-align:center;
    -webkit-tap-highlight-color:transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-btn-primary { background:#2F7BF6; color:#fff; }
  .modal-btn-primary:active, .modal-btn-secondary:active { transform:scale(0.96); }

  /* ══════════════════════════════════════════════════════════════
     POPUP MENU do documento — ancorado ao canto superior direito,
     mesmo overlay + scale-in do padrão do SettingsPage.
  ══════════════════════════════════════════════════════════════ */
  .doc-menu-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0); border: none; cursor: default; width: 100%; height: 100%;
    transition: background .28s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .doc-menu-overlay.doc-menu-overlay-in { background: rgba(0,0,0,0.28); }
  .doc-menu {
    position: fixed;
    top: calc(env(safe-area-inset-top,0px) + 96px);
    right: 12px;
    transform-origin: top right;
    transform: scale(0.90);
    opacity: 0;
    border-radius: 16px;
    padding: 6px;
    min-width: 190px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.24);
    z-index: 81;
    transition: transform .3s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .22s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .doc-menu.doc-menu-in { transform: scale(1); opacity: 1; }
  .doc-menu-item {
    width:100%; display:flex; align-items:center; gap:10px;
    background:none; border:none; padding:11px 12px; border-radius:10px;
    font-size:14px; font-weight:500; text-align:left; cursor:pointer;
    -webkit-tap-highlight-color:transparent; transition: opacity .14s;
  }
  .doc-menu-item:active { opacity:.6; }
  .doc-menu-danger { color:#FF3B30; }
  .doc-menu-divider { height:1px; margin:2px 8px; }

  /* ══════════════════════════════════════════════════════════════
     Confirmar apagar — mesmo padrão do logout-dialog.
  ══════════════════════════════════════════════════════════════ */
  .confirm-dialog {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 81;
    min-width: 280px; max-width: 90vw;
    transition: transform .38s cubic-bezier(0.34, 1.35, 0.64, 1), opacity .28s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform, opacity;
  }
  .confirm-dialog.confirm-dialog-in { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  .confirm-dialog-text { font-size: 16px; margin: 0 0 20px; text-align: center; font-family: inherit; }
  .confirm-dialog-actions { display: flex; gap: 12px; justify-content: center; }
  .confirm-btn-cancel, .confirm-btn-danger {
    flex: 1; padding: 12px 20px; border-radius: 999px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .confirm-btn-cancel:active { transform: scale(0.96); }
  .confirm-btn-danger { background: #FF3B30; color: white; }
  .confirm-btn-danger:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay, .modal-card, .doc-menu-overlay, .doc-menu, .confirm-dialog,
    .modal-btn-primary, .modal-btn-secondary, .confirm-btn-cancel, .confirm-btn-danger {
      transition: none !important;
    }
  }
</style>