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

  onMount(() => {
    setupKeyboardAvoidance();
    document.addEventListener('focusin', lockViewport, true);
    // NOTA: o listener de 'selectionchange' que existia aqui foi
    // removido de propósito. Ele disparava a CADA tecla premida
    // dentro do contenteditable (selectionchange dispara em todo
    // movimento de cursor), o que recomputava kbOffset e reescrevia
    // a CSS var --kb-offset constantemente enquanto se escrevia —
    // essa era uma das causas dos saltos da bottombar durante a
    // digitação. 'focusin' sozinho já é suficiente para detetar a
    // entrada em qualquer campo editável.

    // ══════════════════════════════════════════════════════════════
    //  FIX #24 (appbar/bottombar saltando ao clicar em QUALQUER botão
    //  fora da folha — bold, cor, undo, ⋮, etc. — mesmo depois de
    //  --app-vh já não depender do ciclo do teclado):
    //
    //  A CAUSA: kbUpdatesSuspended só era ligado dentro de undo()/
    //  redo(). Qualquer outro clique fora do contenteditable (num
    //  botão do appbar, do BottomToolbar, abrir um modal) tira o foco
    //  do editor por uma fração de segundo ANTES de qualquer
    //  focusEditor() de volta correr (exec(), setFont(), etc. só
    //  chamam focusEditor() DEPOIS do clique já ter disparado blur no
    //  contenteditable). Essa perda de foco momentânea faz o Android
    //  reportar uma mudança transitória em visualViewport.height —
    //  como se o teclado tremesse — o que disparava resize→
    //  computeKbOffset() com um valor intermédio, mudando
    //  --kb-offset e dando a impressão de salto, exactamente como no
    //  undo/redo original, só que agora despoletado por QUALQUER
    //  botão, não só undo/redo.
    //
    //  CORREÇÃO: capturar 'pointerdown' em todo o document, em fase
    //  de CAPTURA (antes do blur do editor disparar). Se o alvo do
    //  toque estiver DENTRO da folha (contenteditable), não faz nada
    //  — clicar na folha nunca deve suspender nada, o foco só se
    //  desloca dentro do mesmo contenteditable. Se o alvo estiver
    //  FORA da folha (appbar, bottombar, modais), suspende
    //  imediatamente --kb-offset ANTES do blur/focus real
    //  acontecerem, e só liberta depois de dois requestAnimationFrame
    //  (tempo suficiente para o foco assentar de volta, seja porque
    //  focusEditor() foi chamado, seja porque o utilizador saiu
    //  mesmo do modo de edição) — aí sim recomputa UMA VEZ o valor
    //  final estável.
    // ══════════════════════════════════════════════════════════════
    document.addEventListener('pointerdown', handleGlobalPointerDown, true);
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

  // ══════════════════════════════════════════════════════════════════
  //  FIX (bottombar "pulando" no undo/redo com teclado aberto):
  //  setEditorHTML() → DocPage.setContent() recria as divs
  //  contenteditable do zero (await tick()), o que tira e devolve o
  //  foco num instante. Isso dispara eventos intermédios de
  //  visualViewport.resize/scroll com valores TRANSITÓRIOS (o teclado
  //  "parece" fechar e reabrir durante uma fração de segundo aos
  //  olhos do browser), e cada um desses eventos recalculava
  //  --kb-offset imediatamente — daí o salto visual da bottombar.
  //
  //  Correção: suspende o recálculo de --kb-offset (via
  //  kbUpdatesSuspended) enquanto undo/redo estão a decorrer, e só
  //  volta a calcular UMA VEZ, depois do DOM e do foco já estarem
  //  estáveis outra vez.
  // ══════════════════════════════════════════════════════════════════
  async function undo() {
    if (historyIndex <= 0) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    suspendKbUpdates();
    historyIndex -= 1;
    setEditorHTML(historyStack[historyIndex]);
    await tick();
    isRestoringHistory = false;
    resumeKbUpdatesSoon();
    scheduleSave();
    buzz();
  }
  async function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    suspendKbUpdates();
    historyIndex += 1;
    setEditorHTML(historyStack[historyIndex]);
    await tick();
    isRestoringHistory = false;
    resumeKbUpdatesSoon();
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

  // ══════════════════════════════════════════════════════════════════
  //  ESTADO DE EDIÇÃO — isEditing controla TANTO o appbar (que grupo
  //  de botões aparece à esquerda/direita) COMO qual bottom bar
  //  aparece:
  //   - isEditing = true  → appbar: check (esquerda) + lápis/lupa/
  //     documento/undo/⋮ (direita), SEM nome do documento visível;
  //     bottom bar: BottomToolbar (formatação, scroll horizontal,
  //     todas as opções, incl. Design).
  //   - isEditing = false → appbar: X (esquerda, fecha e navega para
  //     'home') + lupa/⋮ (direita), COM nome do documento visível;
  //     bottom bar: CreationToolsBar (Vista Para Dispositivo /
  //     Cabeçalhos / Editar / Partilhar / Ler em Voz Alta).
  //  O botão "Editar" do CreationToolsBar volta a pôr isEditing=true.
  //  NENHUM botão do appbar tem fundo/container.
  //
  //  IMPORTANTE: o appbar é 100% ESTÁTICO — nunca sobe, nunca desce,
  //  nunca desaparece, independentemente do teclado ou de qualquer
  //  ação. Fica sempre fixo no topo do ecrã. Só a bottom bar
  //  (BottomToolbar) reage ao teclado.
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
    // Fora do modo de edição, o botão esquerdo é o X: fecha o
    // documento e navega de volta para 'home'.
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
    if (id === 'color' || id === 'fontcolor') { colorModalOpen = true; return; }
    if (id === 'link') { openLinkPanel(); return; }
    if (id === 'footnote') { openFootnotePanel(); return; }
    if (id === 'insert') { triggerImagePicker(); return; }
    if (id === 'table') { tableModalOpen = true; return; }
    if (id === 'layers') { refreshLayers(); layersModalOpen = true; return; }
    if (id === 'design') { designModalOpen = true; return; }
    activePanel = id;
  }

  function handleToolbarGroupChange(id) {
    activeToolbarGroup = id;
  }

  function handleCreationToolAction(id) {
    buzz();
    if (id === 'edit') { isEditing = true; requestAnimationFrame(() => focusEditor()); return; }
    if (id === 'devicelayout') { showToast('Vista para dispositivo em breve'); return; }
    if (id === 'headings') { showToast('Cabeçalhos em breve'); return; }
    if (id === 'share') { openExport('share'); return; }
    if (id === 'readaloud') { showToast('Ler em voz alta em breve'); return; }
  }

  function handleDesignSelect(e) {
    activeDesignTool = e.detail;
    designModalOpen = false;
    showToast('Ferramenta selecionada');
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

  // Imagem: sem modal — gestos diretos no DocPage tratam tudo.
  // Ao tocar numa imagem já selecionada abre o painel de camadas
  // para o utilizador poder apagá-la se quiser.
  function handleImageRequestEdit(e) {
    refreshLayers();
    layersModalOpen = true;
  }

  function handleLayerSelect(e) {
    // seleciona a camada no DocPage
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

  function selectColor(hex) {
    exec('foreColor', hex);
    fontColorHex = hex;
    colorModalOpen = false;
  }
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

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD AVOIDANCE — afeta APENAS a BottomToolbar/CreationToolsBar
  //  (via --kb-offset). O appbar NUNCA lê --kb-offset e nunca se
  //  move — está fora deste circuito por completo.
  //
  //  FIX (appbar/bottombar "saltando" com o teclado, mesmo com o
  //  keyboard avoidance desligado):
  //  A CAUSA REAL não estava no appbar em si (que já não tinha
  //  transform nem top ligados ao teclado), mas no .root, que tinha
  //  `height: calc(var(--app-vh, 100vh))`. O antigo computeKbOffset()
  //  escrevia `--app-vh` a CADA evento de visualViewport.resize —
  //  e o teclado a abrir dispara uma RAJADA desses eventos com
  //  alturas intermédias/transitórias antes de estabilizar. Cada
  //  escrita de --app-vh forçava um reflow do .root inteiro (que usa
  //  contain:layout, isolando-o do resto da página), e como o
  //  .appbar é flex-shrink:0 no topo desse .root, ele era
  //  fisicamente empurrado/reposicionado toda vez que o contentor
  //  pai mudava de altura — dando a impressão de "saltar", mesmo sem
  //  nenhum CSS do próprio appbar referenciar o teclado.
  //
  //  CORREÇÃO: `.root` passa a usar 100dvh FIXO no CSS (ver <style>
  //  abaixo) — já não depende de --app-vh para a sua altura de todo.
  //  --app-vh deixa de ser escrito a partir do ciclo do teclado
  //  (visualViewport.resize/scroll). Só é atualizado por eventos
  //  reais de rotação/redimensionamento da JANELA (window.resize +
  //  orientationchange), que são raros e legítimos — nunca pelo
  //  teclado a abrir/fechar. Isto elimina o reflow em rajada do
  //  .root, e o appbar deixa de saltar porque o contentor que o
  //  envolve deixa de mudar de altura durante o ciclo do teclado.
  //  --kb-offset continua a ser a ÚNICA variável que a bottombar lê,
  //  exatamente como antes.
  // ══════════════════════════════════════════════════════════════════
  let kbOffset = 0;
  let kbUpdateRaf = null;
  let rootEl;
  let vvRef = null;
  let kbUpdatesSuspended = false;
  let windowResizeRaf = null;
  let kbResumeRaf1 = null;
  let kbResumeRaf2 = null;

  function syncKbOffsetVar() {
    document.documentElement.style.setProperty('--kb-offset', `${kbOffset}px`);
  }

  function computeKbOffset() {
    if (kbUpdatesSuspended) return;
    const vv = window.visualViewport;
    if (!vv) {
      kbOffset = 0;
      syncKbOffsetVar();
      return;
    }
    const overlap = window.innerHeight - (vv.height + vv.offsetTop);
    kbOffset = overlap > 40 ? Math.round(overlap) : 0;
    syncKbOffsetVar();
  }
  function scheduleKbUpdate() {
    if (kbUpdatesSuspended) return;
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    kbUpdateRaf = requestAnimationFrame(computeKbOffset);
  }

  // Suspende/retoma --kb-offset. Usado tanto pelo undo/redo (FIX
  // original) como agora pelo handleGlobalPointerDown (FIX #24) —
  // ambos partilham a mesma necessidade: "algo vai tirar e devolver
  // o foco num instante, não deixes isso mexer no --kb-offset".
  function suspendKbUpdates() {
    kbUpdatesSuspended = true;
    if (kbUpdateRaf) { cancelAnimationFrame(kbUpdateRaf); kbUpdateRaf = null; }
    if (kbResumeRaf1) { cancelAnimationFrame(kbResumeRaf1); kbResumeRaf1 = null; }
    if (kbResumeRaf2) { cancelAnimationFrame(kbResumeRaf2); kbResumeRaf2 = null; }
  }

  // Retoma passado 2x requestAnimationFrame — tempo suficiente para
  // o browser já ter processado o blur+focus (ou blur+permanência
  // fora do editor) e o visualViewport já ter estabilizado no valor
  // FINAL, não num intermédio. Só então recomputa uma única vez.
  function resumeKbUpdatesSoon() {
    kbResumeRaf1 = requestAnimationFrame(() => {
      kbResumeRaf2 = requestAnimationFrame(() => {
        kbUpdatesSuspended = false;
        computeKbOffset();
      });
    });
  }

  // ── FIX #24: handler global de pointerdown, em fase de captura ──
  // Corre ANTES de qualquer blur/focus disparado pelo clique.
  function handleGlobalPointerDown(e) {
    const target = e.target;
    // Clicar dentro do próprio contenteditable (a folha) nunca deve
    // suspender nada — o foco não sai do editor, só se move dentro
    // dele. Isto preserva o comportamento correto da Imagem 1.
    if (target && typeof target.closest === 'function' && target.closest('.conteudo')) {
      return;
    }
    // Qualquer toque fora da folha (appbar, bottombar, modais,
    // backdrop) pode causar uma perda de foco momentânea do editor.
    // Suspende já, e só recalcula depois do foco assentar.
    if (!isEditing) return; // fora do modo de edição não há teclado para saltar
    suspendKbUpdates();
    resumeKbUpdatesSoon();
  }

  // --app-vh só existe agora para eventuais consumidores externos
  // (ex.: App.svelte global via :global(#app)) que ainda a leiam.
  // É recalculada exclusivamente em resize real de janela/rotação —
  // nunca a partir de visualViewport, para nunca reagir ao teclado.
  function computeWindowVh() {
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
  }
  function scheduleWindowVhUpdate() {
    if (windowResizeRaf) cancelAnimationFrame(windowResizeRaf);
    windowResizeRaf = requestAnimationFrame(computeWindowVh);
  }

  function setupKeyboardAvoidance() {
    computeWindowVh();
    requestAnimationFrame(() => {
      computeKbOffset();
      vvRef = window.visualViewport;
      if (vvRef) {
        vvRef.addEventListener('resize', scheduleKbUpdate);
        vvRef.addEventListener('scroll', scheduleKbUpdate);
      }
      window.addEventListener('resize', scheduleWindowVhUpdate);
      window.addEventListener('orientationchange', scheduleWindowVhUpdate);
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

  // activePageIndex/totalPages continuam a existir (o DocPage ainda
  // os expõe e usa-os internamente para saber onde inserir imagem/
  // tabela), mas os botões de navegação por página saíram do appbar —
  // a navegação volta a ser 100% por scroll vertical contínuo.
  let activePageIndex = 0;
  let totalPages = 1;

  function handlePageFocusFromChild(e) { activePageIndex = e.detail; handlePageFocus(); }

  // ══════════════════════════════════════════════════════════════════
  //  ANIMAÇÃO EXPORT — mainRecoil (fundo recua) + exportSlide (overlay
  //  entra da direita), EXACTAMENTE o mesmo padrão do profile/home.
  //  Dois springs independentes, nunca o mesmo valor.
  // ══════════════════════════════════════════════════════════════════
  const mainRecoil = createBackRecoilTransition();
  let mainRecoilValue = 0;
  const unsubscribeMainRecoil = mainRecoil.subscribe((v) => { mainRecoilValue = v; });

  const exportSlide = createSlideTransition({});
  let exportSlideX = 100;
  const unsubscribeExportSlide = exportSlide.subscribe((v) => { exportSlideX = v; });

  let exportPickerOpen = false;
  let exportPickerVisible = false; // controla montagem
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
      vvRef.removeEventListener('resize', scheduleKbUpdate);
      vvRef.removeEventListener('scroll', scheduleKbUpdate);
    }
    window.removeEventListener('resize', scheduleWindowVhUpdate);
    window.removeEventListener('orientationchange', scheduleWindowVhUpdate);
    document.removeEventListener('focusin', lockViewport, true);
    document.removeEventListener('pointerdown', handleGlobalPointerDown, true);
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    if (windowResizeRaf) cancelAnimationFrame(windowResizeRaf);
    if (kbResumeRaf1) cancelAnimationFrame(kbResumeRaf1);
    if (kbResumeRaf2) cancelAnimationFrame(kbResumeRaf2);
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
    unsubscribeMainRecoil?.();
    unsubscribeExportSlide?.();
    mainRecoil.destroy?.();
    exportSlide.destroy?.();
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
</script>

<div
  class="root"
  bind:this={rootEl}
  style="background:{c.background};color:{c.textPrimary};{mainTransformStyle}"
>
  <div class="appbar" style="background:{c.background};border-bottom:0.5px solid {c.divider};color:{c.textPrimary};">
    <!--
      Botão esquerdo do appbar (SEM fundo/container):
      - isEditing=true  → ícone de check. Clicar SÓ conclui a edição
        (confirmDoneEditing), nunca navega para trás.
      - isEditing=false → ícone de X. Clicar fecha o documento e
        navega para 'home' (dispatch('nav', {to:'home'})).
    -->
    <button class="appbar-btn" on:click={handleAppbarLeftAction} aria-label={isEditing ? 'Concluir edição' : 'Fechar'}>
      {#if isEditing}
        <span class="icon-mask" style="mask-image:url('{localIconPath('checkmark_24_regular')}');-webkit-mask-image:url('{localIconPath('checkmark_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      {:else}
        <span class="icon-mask" style="mask-image:url('{localIconPath('dismiss_24_regular')}');-webkit-mask-image:url('{localIconPath('dismiss_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
      {/if}
    </button>

    <div class="appbar-center">
      {#if !isEditing}
        <!-- Nome do documento só aparece FORA do modo de edição. -->
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
      <!-- Grupo direito em modo de edição: lápis / lupa / documento / undo / ⋮ — todos SEM fundo/container -->
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
      <!-- Grupo direito fora de edição: lupa — SEM fundo/container -->
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

  <!--
    DocMenu agora é um bottom sheet (sobe do fundo), fundo branco
    puro no tema claro. A prop `anchor` deixou de influenciar o
    posicionamento (mantida só por compatibilidade de assinatura).
  -->
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

  <!-- Novo: modal (bottom sheet) de equipamentos de design, com
       ícones Fluent Emoji coloridos (lápis, marcador, pincel,
       paleta, régua, esquadro, tesoura, borracha, lapiseira). -->
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
    /* FIX: altura fixa via dvh, já não depende de --app-vh (que
       era reescrita a cada evento de teclado e causava o reflow em
       rajada que fazia o appbar/bottombar saltarem). dvh já lida
       nativamente com a barra de UI do browser em Android/iOS sem
       precisar de nenhum JS a recalcular no ciclo do teclado. */
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-anchor: none;
    contain: layout style paint;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    overscroll-behavior: none;
  }

  /* APPBAR — ESTÁTICO. Sem transform, sem transition de posição, sem
     ligação a --kb-offset. Ocupa o fluxo normal (flex-shrink:0 no
     topo do .root) e nunca se mexe, nunca desaparece, seja qual for
     a ação do utilizador ou o estado do teclado — inclusive durante
     undo/redo, já que kbUpdatesSuspended garante que nem sequer
     --kb-offset oscila nesse intervalo. Como .root agora tem altura
     fixa em 100dvh (já não lê --app-vh), o contentor deste appbar
     deixou de ser redimensionado durante o ciclo do teclado, o que
     elimina o salto físico que existia antes. */
  .appbar {
    display: flex; align-items: center; gap: 10px;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px;
    flex-shrink: 0;
    background: inherit;
    contain: paint;
  }
  /* Botões do appbar SEM nenhum container: sem fundo, sem
     border-radius, sem círculo/quadrado atrás do ícone — o ícone
     fica solto diretamente sobre a barra. */
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