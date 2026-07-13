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
  }

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  // --- Estado da toolbar: painéis expansíveis ---
  let activePanel = null; // null | 'font' | 'size' | 'color' | 'align' | 'list' | 'insert' | 'table'

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
    activePanel = null;
  }

  let fileInputEl;
  function triggerImagePicker() {
    fileInputEl?.click();
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
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'settings' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <!-- Área do documento: página A4 rolável -->
  <div class="canvas-scroll">
    <div class="page-a4" style="background:#FFFFFF;box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)">
      <div
        class="editor"
        contenteditable="true"
        bind:this={editorEl}
        on:input={handleInput}
        spellcheck="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Conteúdo do documento"
      ></div>
    </div>
  </div>

  <!-- Painel expansível: abre acima da toolbar quando uma ferramenta pede mais opções -->
  {#if activePanel}
    <div class="panel-sheet" style="background:{c.dialogBackground};border-top:0.5px solid {c.divider}">
      {#if activePanel === 'font'}
        <div class="panel-row">
          {#each FONTS as f}
            <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary};font-family:{f.value}" on:click={() => setFont(f.value)}>{f.label}</button>
          {/each}
        </div>
      {:else if activePanel === 'size'}
        <div class="panel-row">
          {#each SIZES as s}
            <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => setSize(s)}>{s}</button>
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
          <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={triggerImagePicker}>Imagem</button>
        </div>
      {:else if activePanel === 'table'}
        <div class="panel-row">
          <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(2,2)}>2×2</button>
          <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(3,3)}>3×3</button>
          <button class="panel-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => insertTable(4,3)}>4×3</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Toolbar inferior nativa: sempre visível, ícones de formatação -->
  <div class="bottom-toolbar" style="background:{c.dialogBackground};border-top:0.5px solid {c.divider}">
    <button class="tb-btn" on:click={() => exec('bold')} aria-label="Negrito">
      <span class="icon-mask" style="mask-image:url('/icons/svg/bold.svg');-webkit-mask-image:url('/icons/svg/bold.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" on:click={() => exec('italic')} aria-label="Itálico">
      <span class="icon-mask" style="mask-image:url('/icons/svg/italic.svg');-webkit-mask-image:url('/icons/svg/italic.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" on:click={() => exec('underline')} aria-label="Sublinhado">
      <span class="icon-mask" style="mask-image:url('/icons/svg/underline.svg');-webkit-mask-image:url('/icons/svg/underline.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <div class="tb-divider" style="background:{c.divider}"></div>
    <button class="tb-btn" class:tb-active={activePanel==='font'} on:click={() => togglePanel('font')} aria-label="Fonte">
      <span class="icon-mask" style="mask-image:url('/icons/svg/font.svg');-webkit-mask-image:url('/icons/svg/font.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" class:tb-active={activePanel==='size'} on:click={() => togglePanel('size')} aria-label="Tamanho">
      <span class="icon-mask" style="mask-image:url('/icons/svg/font_size.svg');-webkit-mask-image:url('/icons/svg/font_size.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" class:tb-active={activePanel==='color'} on:click={() => togglePanel('color')} aria-label="Cor">
      <span class="icon-mask" style="mask-image:url('/icons/svg/text_color.svg');-webkit-mask-image:url('/icons/svg/text_color.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <div class="tb-divider" style="background:{c.divider}"></div>
    <button class="tb-btn" class:tb-active={activePanel==='align'} on:click={() => togglePanel('align')} aria-label="Alinhamento">
      <span class="icon-mask" style="mask-image:url('/icons/svg/align_left.svg');-webkit-mask-image:url('/icons/svg/align_left.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" class:tb-active={activePanel==='list'} on:click={() => togglePanel('list')} aria-label="Listas">
      <span class="icon-mask" style="mask-image:url('/icons/svg/list_bullet.svg');-webkit-mask-image:url('/icons/svg/list_bullet.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <div class="tb-divider" style="background:{c.divider}"></div>
    <button class="tb-btn" class:tb-active={activePanel==='insert'} on:click={() => togglePanel('insert')} aria-label="Inserir imagem">
      <span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="tb-btn" class:tb-active={activePanel==='table'} on:click={() => togglePanel('table')} aria-label="Inserir tabela">
      <span class="icon-mask" style="mask-image:url('/icons/svg/table.svg');-webkit-mask-image:url('/icons/svg/table.svg');background:{c.iconTint};width:21px;height:21px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <input type="file" accept="image/*" bind:this={fileInputEl} on:change={insertImage} style="display:none" />
</div>

<style>
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }

  /* ---------- Appbar ---------- */
  .appbar { display:flex; align-items:center; gap:10px; padding:52px 12px 12px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
  .appbar-btn:active { opacity:.7; transform:scale(0.94); }
  .appbar-center { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; }
  .doc-name-input {
    width:100%; max-width:220px; text-align:center; font-size:16px; font-weight:700;
    border:none; background:transparent; outline:none; padding:0;
  }
  .save-state { font-size:11px; font-weight:500; margin-top:1px; }

  /* ---------- Canvas / página A4 ---------- */
  .canvas-scroll {
    flex:1; overflow-y:auto; overflow-x:hidden;
    padding: 20px 16px calc(env(safe-area-inset-bottom,0px) + 24px);
    display:flex; flex-direction:column; align-items:center;
    -webkit-overflow-scrolling: touch;
  }
  /* Proporção A4 (210x297mm ≈ 1:1.414), escalada para caber no ecrã
     mantendo a proporção real da folha. */
  .page-a4 {
    width: 100%;
    max-width: 620px;
    aspect-ratio: 210 / 297;
    border-radius: 4px;
    padding: 48px 40px;
    flex-shrink: 0;
  }
  .editor {
    width:100%; height:100%; outline:none;
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

  /* ---------- Painel expansível ---------- */
  .panel-sheet {
    flex-shrink:0; padding:12px 12px calc(env(safe-area-inset-bottom,0px) + 4px);
    overflow-x:auto;
  }
  .panel-row { display:flex; gap:8px; align-items:center; }
  .panel-chip {
    border:none; border-radius:12px; padding:10px 16px; font-size:14px; font-weight:600;
    cursor:pointer; white-space:nowrap; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .panel-chip:active { transform:scale(0.95); }
  .panel-icon-btn {
    width:44px; height:44px; border:none; border-radius:12px; display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .panel-icon-btn:active { transform:scale(0.9); }
  .color-dot {
    width:32px; height:32px; border-radius:50%; border:2px solid rgba(127,127,127,0.2);
    cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent;
  }
  .color-dot:active { transform:scale(0.88); }

  /* ---------- Bottom toolbar nativa ---------- */
  .bottom-toolbar {
    flex-shrink:0; display:flex; align-items:center; gap:2px;
    padding: 10px 8px calc(env(safe-area-inset-bottom,0px) + 8px);
    overflow-x:auto; -webkit-overflow-scrolling:touch;
  }
  .tb-btn {
    width:40px; height:40px; border:none; background:transparent; border-radius:10px;
    display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;
    -webkit-tap-highlight-color:transparent;
    transition: background .16s cubic-bezier(0.34,1.56,0.64,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tb-btn:active { transform:scale(0.88); background:rgba(127,127,127,0.12); }
  .tb-active { background:rgba(47,123,246,0.14); }
  .tb-divider { width:1px; height:24px; margin:0 4px; flex-shrink:0; }

  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>