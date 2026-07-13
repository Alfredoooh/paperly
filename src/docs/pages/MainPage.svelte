<script>
  import { onMount, afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Docs';
  export let appId = 'docs';
  export let iconPath = '/icons/svg/docs.svg';

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

  // --- Estado da toolbar: painéis expansíveis ---
  let activePanel = null; // null | 'font' | 'size' | 'color' | 'align' | 'list' | 'insert' | 'table' | 'link'

  function togglePanel(name) {
    buzz();
    activePanel = activePanel === name ? null : name;
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
    activePanel = null;
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
    activePanel = null;
  }
  function setColor(hex) {
    exec('foreColor', hex);
    activePanel = null;
  }
  function setAlign(cmd) {
    exec(cmd);
    activePanel = null;
  }
  function setList(cmd) {
    exec(cmd);
    activePanel = null;
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
    activePanel = null;
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
    activePanel = null;
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

  onMount(() => {
    initHistory();
  });
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
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'settings' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <!-- Área do documento: página A4 rolável, com bordas retas como no desktop -->
  <div class="canvas-scroll">
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

  <!-- Painel expansível: abre acima da toolbar quando uma ferramenta pede mais opções -->
  {#if activePanel}
    <div class="panel-sheet" style="background:{c.dialogBackground};border-top:0.5px solid {c.divider}">
      {#if activePanel === 'font'}
        <div class="panel-row">
          {#each FONTS as f}
            <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary};font-family:{f.value}" on:click={() => setFont(f.value)}>{f.label}</button>
          {/each}
        </div>
      {:else if activePanel === 'size'}
        <div class="panel-row">
          {#each SIZES as s}
            <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => setSize(s)}>{s}</button>
          {/each}
        </div>
      {:else if activePanel === 'color'}
        <div class="panel-row">
          {#each COLORS as col}
            <button class="color-dot" style="background:{col}" on:click={() => setColor(col)} aria-label={col}></button>
          {/each}
        </div>
      {:else if activePanel === 'align'}
        <div class="panel-row">
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyLeft')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/align_left.svg');-webkit-mask-image:url('/icons/svg/align_left.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyCenter')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/align_center.svg');-webkit-mask-image:url('/icons/svg/align_center.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyRight')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/align_right.svg');-webkit-mask-image:url('/icons/svg/align_right.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setAlign('justifyFull')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/align_justify.svg');-webkit-mask-image:url('/icons/svg/align_justify.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
        </div>
      {:else if activePanel === 'list'}
        <div class="panel-row">
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setList('insertUnorderedList')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/list_bullet.svg');-webkit-mask-image:url('/icons/svg/list_bullet.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
          <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => setList('insertOrderedList')}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/list_number.svg');-webkit-mask-image:url('/icons/svg/list_number.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
          </button>
        </div>
      {:else if activePanel === 'insert'}
        <div class="panel-row">
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={triggerImagePicker}>Imagem</button>
        </div>
      {:else if activePanel === 'table'}
        <div class="panel-row">
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(2,2)}>2×2</button>
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(3,3)}>3×3</button>
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(4,3)}>4×3</button>
        </div>
      {:else if activePanel === 'link'}
        <div class="panel-row link-row">
          <input
            class="link-input"
            style="background:{c.appbarBtnBg};color:{c.textPrimary}"
            placeholder="https://..."
            bind:value={linkUrlDraft}
            on:keydown={(e) => e.key === 'Enter' && confirmInsertLink()}
          />
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={confirmInsertLink}>Aplicar</button>
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={removeLink}>Remover</button>
        </div>
      {:else if activePanel === 'footnote'}
        <div class="panel-row link-row">
          <input
            class="link-input"
            style="background:{c.appbarBtnBg};color:{c.textPrimary}"
            placeholder="Texto da nota…"
            bind:value={footnoteDraft}
            on:keydown={(e) => e.key === 'Enter' && confirmInsertFootnote()}
          />
          <button class="panel-chip round" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={confirmInsertFootnote}>Inserir</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Toolbar inferior nativa: pílula flutuante, ícones redondos, sempre visível -->
  <div class="bottom-toolbar-wrap">
    <div class="bottom-toolbar" style="background:{c.dialogBackground}">
      <button class="tb-btn" on:click={undo} disabled={!canUndo} aria-label="Desfazer">
        <span class="icon-mask" style="mask-image:url('/icons/svg/undo.svg');-webkit-mask-image:url('/icons/svg/undo.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;opacity:{canUndo ? 1 : 0.35};"></span>
      </button>
      <button class="tb-btn" on:click={redo} disabled={!canRedo} aria-label="Refazer">
        <span class="icon-mask" style="mask-image:url('/icons/svg/redo.svg');-webkit-mask-image:url('/icons/svg/redo.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;opacity:{canRedo ? 1 : 0.35};"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" on:click={() => exec('bold')} aria-label="Negrito">
        <span class="icon-mask" style="mask-image:url('/icons/svg/bold.svg');-webkit-mask-image:url('/icons/svg/bold.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" on:click={() => exec('italic')} aria-label="Itálico">
        <span class="icon-mask" style="mask-image:url('/icons/svg/italic.svg');-webkit-mask-image:url('/icons/svg/italic.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" on:click={() => exec('underline')} aria-label="Sublinhado">
        <span class="icon-mask" style="mask-image:url('/icons/svg/underline.svg');-webkit-mask-image:url('/icons/svg/underline.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='font'} on:click={() => togglePanel('font')} aria-label="Fonte">
        <span class="icon-mask" style="mask-image:url('/icons/svg/font.svg');-webkit-mask-image:url('/icons/svg/font.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='size'} on:click={() => togglePanel('size')} aria-label="Tamanho">
        <span class="icon-mask" style="mask-image:url('/icons/svg/font_size.svg');-webkit-mask-image:url('/icons/svg/font_size.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='color'} on:click={() => togglePanel('color')} aria-label="Cor">
        <span class="icon-mask" style="mask-image:url('/icons/svg/text_color.svg');-webkit-mask-image:url('/icons/svg/text_color.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='align'} on:click={() => togglePanel('align')} aria-label="Alinhamento">
        <span class="icon-mask" style="mask-image:url('/icons/svg/align_left.svg');-webkit-mask-image:url('/icons/svg/align_left.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='list'} on:click={() => togglePanel('list')} aria-label="Listas">
        <span class="icon-mask" style="mask-image:url('/icons/svg/list_bullet.svg');-webkit-mask-image:url('/icons/svg/list_bullet.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='link'} on:click={openLinkPanel} aria-label="Inserir link">
        <span class="icon-mask" style="mask-image:url('/icons/svg/link.svg');-webkit-mask-image:url('/icons/svg/link.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='footnote'} on:click={openFootnotePanel} aria-label="Inserir nota de rodapé">
        <span class="icon-mask" style="mask-image:url('/icons/svg/footnote.svg');-webkit-mask-image:url('/icons/svg/footnote.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <div class="tb-divider" style="background:{c.divider}"></div>
      <button class="tb-btn" class:tb-active={activePanel==='insert'} on:click={() => togglePanel('insert')} aria-label="Inserir imagem">
        <span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <button class="tb-btn" class:tb-active={activePanel==='table'} on:click={() => togglePanel('table')} aria-label="Inserir tabela">
        <span class="icon-mask" style="mask-image:url('/icons/svg/table.svg');-webkit-mask-image:url('/icons/svg/table.svg');background:{c.iconTint};width:19px;height:19px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
    </div>
  </div>

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

  /* ---------- Canvas / página A4: bordas retas, tipo folha de desktop ---------- */
  .canvas-scroll {
    flex:1; overflow-y:auto; overflow-x:hidden;
    padding: 20px 16px calc(env(safe-area-inset-bottom,0px) + 96px);
    display:flex; flex-direction:column; align-items:center;
    -webkit-overflow-scrolling: touch;
  }
  /* Proporção A4 (210x297mm ≈ 1:1.414), escalada para caber no ecrã.
     Bordas retas (sem border-radius) e sombra discreta para dar profundidade,
     como uma folha de papel sobre uma secretária no desktop. */
  .page-a4 {
    width: 100%;
    max-width: 620px;
    aspect-ratio: 210 / 297;
    border-radius: 0;
    padding: 48px 40px;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 10px 28px rgba(0,0,0,0.14);
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

  /* ---------- Painel expansível ---------- */
  .panel-sheet {
    position: fixed;
    left: 0; right: 0;
    bottom: calc(env(safe-area-inset-bottom,0px) + 78px);
    flex-shrink:0; padding:10px 12px;
    overflow-x:auto;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
  }
  .panel-row { display:flex; gap:8px; align-items:center; }
  .panel-chip {
    border:none; border-radius:14px; padding:10px 16px; font-size:14px; font-weight:600;
    cursor:pointer; white-space:nowrap; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .panel-chip.round {
    border-radius: 999px;
  }
  .panel-chip:active { transform:scale(0.95); }
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

  /* ---------- Painel de link / nota: input + ações ---------- */
  .link-row { width:100%; }
  .link-input {
    flex:1; min-width:0; border:none; border-radius:999px; padding:10px 16px;
    font-size:14px; outline:none;
  }

  /* ---------- Bottom toolbar nativa: pílula flutuante, redonda, com profundidade ---------- */
  .bottom-toolbar-wrap {
    position: fixed;
    left: 0; right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    padding: 0 12px calc(env(safe-area-inset-bottom,0px) + 14px);
    pointer-events: none;
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
</style>