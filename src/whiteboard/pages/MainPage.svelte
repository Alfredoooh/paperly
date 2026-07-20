<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let isDark = false;
  export let user = null;
  export let resourceId = null;
  export let appTitle = 'Nexa Whiteboard';
  export let appId = 'whiteboard';
  export let iconPath = '/icons/svg/whiteboard.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';
  const STORAGE_PREFIX = 'whiteboard_';
  const INDEX_KEY = STORAGE_PREFIX + 'index';

  // ══════════════════════════════════════════════════════════════════
  //  CONVERSÃO DE UNIDADES — 96dpi é o standard CSS (1cm = 37.795...px)
  // ══════════════════════════════════════════════════════════════════
  const CM_TO_PX = 96 / 2.54;
  const MM_TO_PX = CM_TO_PX / 10;
  function cmToPx(cm) { return Math.round(cm * CM_TO_PX * 100) / 100; }
  function mmToPx(mm) { return Math.round(mm * MM_TO_PX * 100) / 100; }
  function pxToCm(px) { return Math.round((px / CM_TO_PX) * 100) / 100; }
  function pxToMm(px) { return Math.round((px / MM_TO_PX) * 100) / 100; }

  // ══════════════════════════════════════════════════════════════════
  //  PRESETS — tamanhos fixos reais (px a 96dpi, exceto onde indicado)
  // ══════════════════════════════════════════════════════════════════
  const SIZE_PRESETS = [
    { id: 'ig-post',   label: 'Post Instagram',     sub: '1080 × 1080 px', w: 1080, h: 1080, cat: 'social' },
    { id: 'ig-story',  label: 'Story / Reels',       sub: '1080 × 1920 px', w: 1080, h: 1920, cat: 'social' },
    { id: 'ig-port',   label: 'Post retrato',        sub: '1080 × 1350 px', w: 1080, h: 1350, cat: 'social' },
    { id: 'fb-cover',  label: 'Capa Facebook',       sub: '820 × 312 px',   w: 820,  h: 312,  cat: 'social' },
    { id: 'yt-thumb',  label: 'Thumbnail YouTube',   sub: '1280 × 720 px',  w: 1280, h: 720,  cat: 'social' },
    { id: 'sq-512',    label: 'Quadrado 512',        sub: '512 × 512 px',   w: 512,  h: 512,  cat: 'generic' },
    { id: 'sq-256',    label: 'Quadrado 256',        sub: '256 × 256 px',   w: 256,  h: 256,  cat: 'generic' },
    { id: 'logo-1024', label: 'Logótipo',            sub: '1024 × 1024 px', w: 1024, h: 1024, cat: 'generic' },
    { id: 'banner-web',label: 'Banner web',          sub: '1200 × 628 px',  w: 1200, h: 628,  cat: 'web' },
    { id: 'a4-flyer',  label: 'Flyer A4',            sub: '21 × 29,7 cm',   w: Math.round(cmToPx(21)), h: Math.round(cmToPx(29.7)), cat: 'print' },
    { id: 'a5-flyer',  label: 'Flyer A5',            sub: '14,8 × 21 cm',   w: Math.round(cmToPx(14.8)), h: Math.round(cmToPx(21)), cat: 'print' },
    { id: 'biz-card',  label: 'Cartão de visita',    sub: '9 × 5 cm',       w: Math.round(cmToPx(9)), h: Math.round(cmToPx(5)), cat: 'print' },
    { id: 'poster-a3', label: 'Cartaz A3',           sub: '29,7 × 42 cm',   w: Math.round(cmToPx(29.7)), h: Math.round(cmToPx(42)), cat: 'print' },
  ];

  // ══════════════════════════════════════════════════════════════════
  //  FORMAS OFICIAIS FLUENT — apenas nomes reais do pacote @fluentui/svg-icons.
  //  Nunca SVGs inventados: são sempre carregados via mask-image do CDN,
  //  exatamente como o resto do projeto já faz para todos os ícones.
  // ══════════════════════════════════════════════════════════════════
  const SHAPE_ICONS = [
    { id: 'square_24_filled',            label: 'Quadrado' },
    { id: 'circle_24_filled',            label: 'Círculo' },
    { id: 'triangle_24_filled',          label: 'Triângulo' },
    { id: 'pentagon_24_filled',          label: 'Pentágono' },
    { id: 'hexagon_24_filled',           label: 'Hexágono' },
    { id: 'octagon_24_filled',           label: 'Octógono' },
    { id: 'star_24_filled',              label: 'Estrela' },
    { id: 'heart_24_filled',             label: 'Coração' },
    { id: 'diamond_24_filled',           label: 'Diamante' },
    { id: 'oval_24_filled',              label: 'Oval' },
    { id: 'rhombus_24_filled',           label: 'Losango' },
    { id: 'line_24_regular',             label: 'Linha' },
    { id: 'arrow_right_24_filled',       label: 'Seta' },
    { id: 'bookmark_24_filled',          label: 'Marcador' },
    { id: 'cloud_24_filled',             label: 'Nuvem' },
    { id: 'flag_24_filled',              label: 'Bandeira' },
  ];

  const TEMPLATES = [
    {
      id: 'tpl-promo',
      label: 'Promoção',
      w: 1080, h: 1080,
      thumb: '#0F6CBD',
      build: () => ([
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 1080, h: 1080, fill: '#0F6CBD', radius: 0, opacity: 1 }),
        mkText({ x: 90, y: 380, w: 900, h: 200, text: 'GRANDE\nPROMOÇÃO', fontSize: 96, color: '#FFFFFF', align: 'left', weight: '800' }),
        mkText({ x: 90, y: 640, w: 700, h: 80, text: 'Até 50% de desconto', fontSize: 34, color: '#E8F1FE', align: 'left', weight: '500' }),
        mkShape({ shape: 'circle_24_filled', x: 780, y: 70, w: 220, h: 220, fill: '#FFB900', radius: 999, opacity: 1 }),
      ]),
    },
    {
      id: 'tpl-story',
      label: 'Story minimal',
      w: 1080, h: 1920,
      thumb: '#111318',
      build: () => ([
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 1080, h: 1920, fill: '#111318', radius: 0, opacity: 1 }),
        mkText({ x: 90, y: 820, w: 900, h: 300, text: 'Nova coleção\ndisponível agora', fontSize: 64, color: '#FFFFFF', align: 'left', weight: '700' }),
        mkShape({ shape: 'line_24_regular', x: 90, y: 780, w: 160, h: 6, fill: '#2F7BF6', radius: 0, opacity: 1 }),
      ]),
    },
    {
      id: 'tpl-quote',
      label: 'Citação',
      w: 1080, h: 1080,
      thumb: '#F5F1E8',
      build: () => ([
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 1080, h: 1080, fill: '#F5F1E8', radius: 0, opacity: 1 }),
        mkText({ x: 130, y: 380, w: 820, h: 340, text: '"O design é a forma\nmais visível do\nque fazemos."', fontSize: 58, color: '#1A1A1A', align: 'left', weight: '600' }),
        mkText({ x: 130, y: 760, w: 500, h: 60, text: '— Autor', fontSize: 26, color: '#6E6E6E', align: 'left', weight: '500' }),
      ]),
    },
    {
      id: 'tpl-flyer',
      label: 'Flyer evento',
      w: 794, h: 1123,
      thumb: '#D63384',
      build: () => ([
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 794, h: 1123, fill: '#FFFFFF', radius: 0, opacity: 1 }),
        mkShape({ shape: 'square_24_filled', x: 0, y: 0, w: 794, h: 380, fill: '#D63384', radius: 0, opacity: 1 }),
        mkText({ x: 60, y: 130, w: 674, h: 160, text: 'FESTIVAL\nDE VERÃO', fontSize: 70, color: '#FFFFFF', align: 'left', weight: '800' }),
        mkText({ x: 60, y: 460, w: 674, h: 60, text: '15 de Agosto · 20h00', fontSize: 30, color: '#1A1A1A', align: 'left', weight: '600' }),
        mkText({ x: 60, y: 540, w: 674, h: 200, text: 'Um dia inteiro de música ao vivo, comida de rua e boa companhia.', fontSize: 22, color: '#4A4A4A', align: 'left', weight: '400' }),
      ]),
    },
  ];

  // ══════════════════════════════════════════════════════════════════
  //  ESTADO DO DESIGN
  // ══════════════════════════════════════════════════════════════════
  let boardName = 'Design sem título';
  let boardId = resourceId || ('wb_' + Date.now().toString(36));
  let boardW = 512;
  let boardH = 512;

  let elements = []; // { id, type:'text'|'image'|'shape', x,y,w,h,deg, opacity, fill, border, borderWidth, radius, shadow, blend, ... }
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
          return parsed.elements || [];
        } catch (e) {}
      }
    }
    boardId = resourceId || ('wb_' + Date.now().toString(36));
    boardName = 'Design sem título';
    return [];
  }
  elements = loadOrCreateBoard();
  if (elements.length) {
    nextElId = Math.max(...elements.map(e => e.id)) + 1;
  }

  function persist() {
    savedState = 'saving';
    const payload = { name: boardName, w: boardW, h: boardH, elements, updatedAt: Date.now() };
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

  function handleNameInput(e) { boardName = e.target.value; scheduleSave(); }
  function handleNameBlur(e) {
    if (!boardName || !boardName.trim()) { boardName = 'Design sem título'; e.target.value = boardName; }
    scheduleSave();
  }

  function buzz() { try { navigator.vibrate && navigator.vibrate(6); } catch (e) {} }

  // ══════════════════════════════════════════════════════════════════
  //  HISTÓRICO — undo/redo por snapshot (mesmo padrão do docs)
  // ══════════════════════════════════════════════════════════════════
  let historyStack = [];
  let historyIndex = -1;
  let isRestoringHistory = false;
  let historyDebounce;
  const HISTORY_LIMIT = 80;

  function snapshotState() {
    return JSON.stringify({ w: boardW, h: boardH, elements });
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

  async function restoreSnapshot(snap) {
    try {
      const parsed = JSON.parse(snap);
      boardW = parsed.w;
      boardH = parsed.h;
      elements = parsed.elements;
      await tick();
      computeFit();
    } catch (e) {}
  }
  async function undo() {
    if (historyIndex <= 0) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex -= 1;
    await restoreSnapshot(historyStack[historyIndex]);
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  async function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    clearTimeout(historyDebounce);
    isRestoringHistory = true;
    historyIndex += 1;
    await restoreSnapshot(historyStack[historyIndex]);
    isRestoringHistory = false;
    scheduleSave();
    buzz();
  }
  $: canUndo = historyIndex > 0;
  $: canRedo = historyIndex < historyStack.length - 1;

  // ══════════════════════════════════════════════════════════════════
  //  ZOOM — a prancheta tem SEMPRE o tamanho fixo boardW×boardH em px.
  //  fitScale ajusta automaticamente esse tamanho fixo ao ecrã onde
  //  está a correr (nunca torna o papel responsivo em si). Por cima
  //  disso, pinchScale permite ampliar manualmente com 2 dedos, tal
  //  como no docs — os dois valores multiplicam-se.
  // ══════════════════════════════════════════════════════════════════
  let containerEl;
  let stageWrapEl;
  let fitScale = 1;
  let pinchScale = 1;
  let panX = 0;
  let panY = 0;

  function computeFit() {
    if (!containerEl) return;
    const margin = 28;
    const availW = containerEl.clientWidth - margin * 2;
    const availH = containerEl.clientHeight - margin * 2;
    const s = Math.min(availW / boardW, availH / boardH);
    fitScale = s > 0 && isFinite(s) ? Math.max(0.02, Math.min(s, 3)) : 1;
    pinchScale = 1;
    panX = 0; panY = 0;
  }

  // ── Pinça de 2 dedos + pan (independente do PinchZoom do docs porque
  //    aqui não há scroll de documento — a prancheta é sempre um
  //    retângulo fixo, centrado, sem overflow de conteúdo). ──────────
  let pointers = new Map();
  let pinchStartDist = 0, pinchStartScale = 1;
  let pinchStartPanX = 0, pinchStartPanY = 0, pinchStartMidX = 0, pinchStartMidY = 0;
  let isPinching = false;

  function ptXY(e) { return { x: e.clientX, y: e.clientY }; }
  function distPts(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function midPts(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function onStagePointerDown(e) {
    if (e.target.closest('.el')) return; // gestos de elemento tratados à parte
    pointers.set(e.pointerId, ptXY(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDist = distPts(a, b);
      pinchStartScale = pinchScale;
      const m = midPts(a, b);
      pinchStartMidX = m.x; pinchStartMidY = m.y;
      pinchStartPanX = panX; pinchStartPanY = panY;
      isPinching = true;
      selectedId = null;
    }
  }
  function onStagePointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, ptXY(e));
    if (isPinching && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const nd = distPts(a, b);
      if (pinchStartDist > 0) {
        pinchScale = Math.min(4, Math.max(1, pinchStartScale * (nd / pinchStartDist)));
      }
      const m = midPts(a, b);
      panX = pinchStartPanX + (m.x - pinchStartMidX);
      panY = pinchStartPanY + (m.y - pinchStartMidY);
      e.preventDefault();
    }
  }
  function onStagePointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) isPinching = false;
    if (pointers.size === 0 && pinchScale < 1.04) { pinchScale = 1; panX = 0; panY = 0; }
  }
  function onStageDblClick(e) {
    if (e.target.closest('.el')) return;
    if (pinchScale > 1.04) { pinchScale = 1; panX = 0; panY = 0; }
    else { pinchScale = 2; }
  }
  function zoomIn() { pinchScale = Math.min(4, pinchScale + 0.25); }
  function zoomOut() {
    pinchScale = Math.max(1, pinchScale - 0.25);
    if (pinchScale <= 1.001) { panX = 0; panY = 0; }
  }
  function zoomReset() { pinchScale = 1; panX = 0; panY = 0; }
  $: totalScale = fitScale * pinchScale;
  $: zoomPercent = Math.round(totalScale * 100);

  // ══════════════════════════════════════════════════════════════════
  //  CRIAÇÃO DE ELEMENTOS
  // ══════════════════════════════════════════════════════════════════
  function centerXY(w, h) {
    return { x: Math.max(0, Math.round((boardW - w) / 2)), y: Math.max(0, Math.round((boardH - h) / 2)) };
  }

  function mkText(opts = {}) {
    const w = opts.w ?? 320, h = opts.h ?? 80;
    const pos = opts.x !== undefined ? { x: opts.x, y: opts.y } : centerXY(w, h);
    return {
      id: nextElId++, type: 'text',
      x: pos.x, y: pos.y, w, h, deg: 0,
      text: opts.text ?? 'Toque para editar', fontSize: opts.fontSize ?? 36,
      color: opts.color ?? '#1A1A1A', align: opts.align ?? 'left', weight: opts.weight ?? '600',
      fontFamily: opts.fontFamily ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      opacity: opts.opacity ?? 1, blend: 'normal',
    };
  }
  function mkImage(src, opts = {}) {
    const w = opts.w ?? 280, h = opts.h ?? 280;
    const pos = centerXY(w, h);
    return {
      id: nextElId++, type: 'image',
      x: pos.x, y: pos.y, w, h, deg: 0,
      src, opacity: 1, radius: 0, blend: 'normal',
      cropX: 0, cropY: 0, cropW: 100, cropH: 100, // percentagens — janela de crop dentro da imagem original
    };
  }
  function mkShape(opts = {}) {
    const w = opts.w ?? 200, h = opts.h ?? 200;
    const pos = opts.x !== undefined ? { x: opts.x, y: opts.y } : centerXY(w, h);
    return {
      id: nextElId++, type: 'shape',
      x: pos.x, y: pos.y, w, h, deg: 0,
      shape: opts.shape ?? 'square_24_filled',
      fill: opts.fill ?? '#2F7BF6', border: opts.border ?? 'transparent', borderWidth: opts.borderWidth ?? 0,
      radius: opts.radius ?? 0, opacity: opts.opacity ?? 1,
      shadow: opts.shadow ?? false, blend: opts.blend ?? 'normal',
    };
  }

  function addElement(el) {
    elements = [...elements, el];
    selectedId = el.id;
    scheduleSave();
    pushHistory(true);
  }

  function addTextEl() { buzz(); addElement(mkText({})); openPropsFor('text'); }
  function addShapeEl(shapeId) { buzz(); addElement(mkShape({ shape: shapeId })); sheetShapes = false; openPropsFor('shape'); }

  let fileInputEl;
  function triggerImagePicker() { fileInputEl?.click(); }
  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        buzz();
        const maxDim = Math.min(boardW, boardH) * 0.7;
        const ratio = img.width / img.height;
        let w = maxDim, h = maxDim / ratio;
        if (h > maxDim) { h = maxDim; w = maxDim * ratio; }
        addElement(mkImage(ev.target.result, { w, h }));
        openPropsFor('image');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function applyTemplate(tpl) {
    buzz();
    boardW = tpl.w; boardH = tpl.h;
    elements = tpl.build();
    nextElId = Math.max(1, ...elements.map(e => e.id)) + 1;
    selectedId = null;
    sheetTemplates = false;
    scheduleSave();
    pushHistory(true);
    tick().then(computeFit);
  }

  // ══════════════════════════════════════════════════════════════════
  //  SELEÇÃO / EDIÇÃO / REMOÇÃO
  // ══════════════════════════════════════════════════════════════════
  $: selectedEl = elements.find(e => e.id === selectedId) || null;

  function selectElement(id) { selectedId = id; }
  function deselectAll() { selectedId = null; editingTextId = null; }

  function updateSelected(patch) {
    if (!selectedId) return;
    elements = elements.map(e => e.id === selectedId ? { ...e, ...patch } : e);
  }
  function commitChange() { scheduleSave(); pushHistory(); }
  function commitChangeImmediate() { scheduleSave(); pushHistory(true); }

  function duplicateSelected() {
    if (!selectedEl) return;
    buzz();
    const clone = { ...selectedEl, id: nextElId++, x: selectedEl.x + 20, y: selectedEl.y + 20 };
    elements = [...elements, clone];
    selectedId = clone.id;
    commitChangeImmediate();
  }
  function deleteSelected() {
    if (!selectedId) return;
    buzz();
    elements = elements.filter(e => e.id !== selectedId);
    selectedId = null;
    activePropTab = null;
    commitChangeImmediate();
  }
  function bringToFront() {
    if (!selectedEl) return;
    elements = [...elements.filter(e => e.id !== selectedId), selectedEl];
    commitChangeImmediate();
  }
  function sendToBack() {
    if (!selectedEl) return;
    elements = [selectedEl, ...elements.filter(e => e.id !== selectedId)];
    commitChangeImmediate();
  }

  let editingTextId = null;
  function startEditText(id) {
    editingTextId = id;
    selectedId = id;
    tick().then(() => {
      const node = document.getElementById('text-edit-' + id);
      if (node) { node.focus(); placeCaretEnd(node); }
    });
  }
  function placeCaretEnd(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function stopEditText(e, id) {
    const text = e.target.innerText || '';
    elements = elements.map(el => el.id === id ? { ...el, text } : el);
    editingTextId = null;
    commitChangeImmediate();
  }

  // ══════════════════════════════════════════════════════════════════
  //  GESTOS — move / resize (4 cantos) / rotate, com compensação da
  //  escala total (fitScale * pinchScale), tal como no docs.
  // ══════════════════════════════════════════════════════════════════
  let gesture = null;

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function startMove(e, el) {
    e.stopPropagation(); e.preventDefault();
    if (editingTextId === el.id) return;
    selectElement(el.id);
    const p = pointerXY(e);
    gesture = { mode: 'move', id: el.id, startX: p.x, startY: p.y, startObjX: el.x, startObjY: el.y };
  }

  function startResize(e, el, corner) {
    e.stopPropagation(); e.preventDefault();
    const p = pointerXY(e);
    gesture = {
      mode: 'resize', id: el.id, corner, startX: p.x, startY: p.y,
      startW: el.w, startH: el.h, startObjX: el.x, startObjY: el.y,
      aspectRatio: el.w / el.h, shiftLock: false,
    };
  }

  function startRotate(e, el) {
    e.stopPropagation(); e.preventDefault();
    const stageRect = stageWrapEl.getBoundingClientRect();
    const centerX = stageRect.left + (el.x + el.w / 2) * totalScale;
    const centerY = stageRect.top + (el.y + el.h / 2) * totalScale;
    const p = pointerXY(e);
    const startAngle = Math.atan2(p.y - centerY, p.x - centerX) * (180 / Math.PI);
    gesture = { mode: 'rotate', id: el.id, centerX, centerY, startAngle, startDeg: el.deg };
  }

  // Crop: arrasta a janela de recorte dentro da imagem (percentagens 0-100)
  function startCropMove(e, el) {
    e.stopPropagation(); e.preventDefault();
    const p = pointerXY(e);
    gesture = { mode: 'crop', id: el.id, startX: p.x, startY: p.y, startCropX: el.cropX, startCropY: el.cropY };
  }

  function onGestureMove(e) {
    if (!gesture) return;
    const p = pointerXY(e);
    const el = elements.find(x => x.id === gesture.id);
    if (!el) return;

    if (gesture.mode === 'move') {
      const dx = (p.x - gesture.startX) / totalScale;
      const dy = (p.y - gesture.startY) / totalScale;
      updateSelected({ x: gesture.startObjX + dx, y: gesture.startObjY + dy });
    } else if (gesture.mode === 'resize') {
      const dx = (p.x - gesture.startX) / totalScale;
      const dy = (p.y - gesture.startY) / totalScale;
      let { startW, startH, startObjX, startObjY, corner, aspectRatio } = gesture;
      let newW = startW, newH = startH, newX = startObjX, newY = startObjY;
      const minSize = 16;
      const lockRatio = el.type === 'image';

      if (corner === 'br') { newW = Math.max(minSize, startW + dx); newH = lockRatio ? newW / aspectRatio : Math.max(minSize, startH + dy); }
      else if (corner === 'bl') { newW = Math.max(minSize, startW - dx); newX = startObjX + (startW - newW); newH = lockRatio ? newW / aspectRatio : Math.max(minSize, startH + dy); }
      else if (corner === 'tr') { newW = Math.max(minSize, startW + dx); newH = lockRatio ? newW / aspectRatio : Math.max(minSize, startH - dy); if (!lockRatio) newY = startObjY + (startH - newH); else newY = startObjY + (startH - newH); }
      else if (corner === 'tl') { newW = Math.max(minSize, startW - dx); newX = startObjX + (startW - newW); newH = lockRatio ? newW / aspectRatio : Math.max(minSize, startH - dy); newY = startObjY + (startH - newH); }

      updateSelected({ w: newW, h: newH, x: newX, y: newY });
    } else if (gesture.mode === 'rotate') {
      const angleNow = Math.atan2(p.y - gesture.centerY, p.x - gesture.centerX) * (180 / Math.PI);
      updateSelected({ deg: gesture.startDeg + (angleNow - gesture.startAngle) });
    } else if (gesture.mode === 'crop') {
      const dxPct = ((p.x - gesture.startX) / totalScale / el.w) * 100;
      const dyPct = ((p.y - gesture.startY) / totalScale / el.h) * 100;
      const maxX = 100 - el.cropW, maxY = 100 - el.cropH;
      updateSelected({
        cropX: Math.min(maxX, Math.max(0, gesture.startCropX - dxPct)),
        cropY: Math.min(maxY, Math.max(0, gesture.startCropY - dyPct)),
      });
    }
    e.preventDefault();
  }
  function onGestureEnd() {
    if (!gesture) return;
    gesture = null;
    commitChange();
  }

  onMount(() => {
    window.addEventListener('mousemove', onGestureMove);
    window.addEventListener('mouseup', onGestureEnd);
    window.addEventListener('touchmove', onGestureMove, { passive: false });
    window.addEventListener('touchend', onGestureEnd);
  });
  onDestroy(() => {
    window.removeEventListener('mousemove', onGestureMove);
    window.removeEventListener('mouseup', onGestureEnd);
    window.removeEventListener('touchmove', onGestureMove);
    window.removeEventListener('touchend', onGestureEnd);
    clearTimeout(saveTimeout);
    clearTimeout(historyDebounce);
  });

  // ══════════════════════════════════════════════════════════════════
  //  PAINEL DE PROPRIEDADES + FOLHAS (bottom sheets)
  // ══════════════════════════════════════════════════════════════════
  let activePropTab = null; // null | 'fill' | 'border' | 'opacity' | 'radius' | 'shadow' | 'blend' | 'text' | 'crop'
  function openPropsFor(type) { activePropTab = null; }
  function closeProps() { activePropTab = null; }

  let sheetSize = false;
  let sheetShapes = false;
  let sheetTemplates = false;
  let sheetLayers = false;
  let colorPickerOpen = false;
  let colorPickerTarget = 'fill'; // 'fill' | 'border' | 'text'

  const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'color-dodge'];
  const PRESET_COLORS = [
    'transparent', '#000000', '#FFFFFF', '#3C3C43', '#8E8E93',
    '#F0384A', '#E8720F', '#F5B700', '#1FA34A', '#0FA3A3',
    '#2F7BF6', '#5856D6', '#8B3FE0', '#D63384',
  ];

  function openColorPicker(target) { colorPickerTarget = target; colorPickerOpen = true; }
  function applyColorFromPicker(hex) {
    if (colorPickerTarget === 'fill') updateSelected({ fill: hex });
    else if (colorPickerTarget === 'border') updateSelected({ border: hex });
    else if (colorPickerTarget === 'text') updateSelected({ color: hex });
    colorPickerOpen = false;
    commitChangeImmediate();
  }

  // ── HSB color wheel state (reaproveitado do docs) ──
  let pickHue = 210, pickSat = 70, pickBright = 90;
  let svAreaEl, hueSliderEl, draggingSV = false, draggingHue = false;
  function hsbToHex(h, s, v) {
    s /= 100; v /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(f(5)) + toHex(f(3)) + toHex(f(1));
  }
  $: previewHex = hsbToHex(pickHue, pickSat, pickBright);
  $: pureHueHex = hsbToHex(pickHue, 100, 100);
  function updateSVFromEvent(clientX, clientY) {
    if (!svAreaEl) return;
    const rect = svAreaEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
    pickSat = (x / rect.width) * 100;
    pickBright = 100 - (y / rect.height) * 100;
  }
  function updateHueFromEvent(clientX) {
    if (!hueSliderEl) return;
    const rect = hueSliderEl.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    pickHue = (x / rect.width) * 360;
  }
  function onSVDown(e) { draggingSV = true; const p = e.touches ? e.touches[0] : e; updateSVFromEvent(p.clientX, p.clientY); }
  function onSVMove(e) { if (!draggingSV) return; const p = e.touches ? e.touches[0] : e; updateSVFromEvent(p.clientX, p.clientY); e.preventDefault(); }
  function onSVUp() { draggingSV = false; }
  function onHueDown(e) { draggingHue = true; const p = e.touches ? e.touches[0] : e; updateHueFromEvent(p.clientX); }
  function onHueMove(e) { if (!draggingHue) return; const p = e.touches ? e.touches[0] : e; updateHueFromEvent(p.clientX); e.preventDefault(); }
  function onHueUp() { draggingHue = false; }

  // ══════════════════════════════════════════════════════════════════
  //  SHEET drag-to-close helper (mesmo padrão do docs, reaproveitado
  //  para todos os bottom sheets desta página)
  // ══════════════════════════════════════════════════════════════════
  function makeSheetController() {
    const slide = createSlideTransition({});
    let y = 100;
    const unsub = slide.subscribe(v => { y = v; });
    return { slide, get y() { return y; }, unsub };
  }
  function makeSheetDrag(slideCtrl, getHeight, onClose) {
    let dragging = false, liveActive = false, startY = 0, currentY = 0, startTime = 0, sheetH = 400;
    return {
      touchstart(e) { dragging = true; liveActive = false; startY = e.touches[0].clientY; currentY = startY; startTime = performance.now(); sheetH = getHeight(); },
      touchmove(e) {
        if (!dragging) return;
        const y = e.touches[0].clientY; currentY = y;
        const delta = y - startY;
        if (delta <= 4) return;
        if (!liveActive) liveActive = true;
        slideCtrl.setDragValue(Math.min(1, Math.max(0, delta / sheetH)) * 100);
        e.preventDefault();
      },
      touchend() {
        if (!dragging) return;
        dragging = false;
        if (!liveActive) { liveActive = false; return; }
        liveActive = false;
        const elapsed = Math.max(1, performance.now() - startTime);
        const delta = currentY - startY;
        const velocity = Math.abs(delta) / elapsed;
        const draggedFraction = Math.min(1, Math.max(0, delta / sheetH));
        if (draggedFraction > 0.3 || (delta > 0 && velocity > 0.5)) onClose();
        else slideCtrl.releaseDragTo('open');
      },
    };
  }

  const sizeSheetCtrl = makeSheetController();
  const shapesSheetCtrl = makeSheetController();
  const templatesSheetCtrl = makeSheetController();
  const layersSheetCtrl = makeSheetController();
  const propsSheetCtrl = makeSheetController();
  const colorSheetCtrl = makeSheetController();

  let sizeSheetMounted = false, sizeSheetIn = false;
  let shapesSheetMounted = false, shapesSheetIn = false;
  let templatesSheetMounted = false, templatesSheetIn = false;
  let layersSheetMounted = false, layersSheetIn = false;
  let propsSheetMounted = false, propsSheetIn = false;
  let colorSheetMounted = false, colorSheetIn = false;

  function openGenericSheet(ctrl, setMounted, setIn) {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => { setIn(true); ctrl.slide.open(); }));
  }
  function closeGenericSheet(ctrl, setMounted, setIn) {
    setIn(false);
    ctrl.slide.close();
    setTimeout(() => setMounted(false), 300);
  }

  $: if (sheetSize && !sizeSheetMounted) openGenericSheet(sizeSheetCtrl, v => sizeSheetMounted = v, v => sizeSheetIn = v);
  else if (!sheetSize && sizeSheetMounted) closeGenericSheet(sizeSheetCtrl, v => sizeSheetMounted = v, v => sizeSheetIn = v);

  $: if (sheetShapes && !shapesSheetMounted) openGenericSheet(shapesSheetCtrl, v => shapesSheetMounted = v, v => shapesSheetIn = v);
  else if (!sheetShapes && shapesSheetMounted) closeGenericSheet(shapesSheetCtrl, v => shapesSheetMounted = v, v => shapesSheetIn = v);

  $: if (sheetTemplates && !templatesSheetMounted) openGenericSheet(templatesSheetCtrl, v => templatesSheetMounted = v, v => templatesSheetIn = v);
  else if (!sheetTemplates && templatesSheetMounted) closeGenericSheet(templatesSheetCtrl, v => templatesSheetMounted = v, v => templatesSheetIn = v);

  $: if (sheetLayers && !layersSheetMounted) openGenericSheet(layersSheetCtrl, v => layersSheetMounted = v, v => layersSheetIn = v);
  else if (!sheetLayers && layersSheetMounted) closeGenericSheet(layersSheetCtrl, v => layersSheetMounted = v, v => layersSheetIn = v);

  $: if (activePropTab && !propsSheetMounted) openGenericSheet(propsSheetCtrl, v => propsSheetMounted = v, v => propsSheetIn = v);
  else if (!activePropTab && propsSheetMounted) closeGenericSheet(propsSheetCtrl, v => propsSheetMounted = v, v => propsSheetIn = v);

  $: if (colorPickerOpen && !colorSheetMounted) openGenericSheet(colorSheetCtrl, v => colorSheetMounted = v, v => colorSheetIn = v);
  else if (!colorPickerOpen && colorSheetMounted) closeGenericSheet(colorSheetCtrl, v => colorSheetMounted = v, v => colorSheetIn = v);

  const sizeDrag = makeSheetDrag(sizeSheetCtrl.slide, () => 400, () => sheetSize = false);
  const shapesDrag = makeSheetDrag(shapesSheetCtrl.slide, () => 400, () => sheetShapes = false);
  const templatesDrag = makeSheetDrag(templatesSheetCtrl.slide, () => 400, () => sheetTemplates = false);
  const layersDrag = makeSheetDrag(layersSheetCtrl.slide, () => 400, () => sheetLayers = false);
  const propsDrag = makeSheetDrag(propsSheetCtrl.slide, () => 400, closeProps);
  const colorDrag = makeSheetDrag(colorSheetCtrl.slide, () => 400, () => colorPickerOpen = false);

  onDestroy(() => {
    sizeSheetCtrl.unsub(); sizeSheetCtrl.slide.destroy();
    shapesSheetCtrl.unsub(); shapesSheetCtrl.slide.destroy();
    templatesSheetCtrl.unsub(); templatesSheetCtrl.slide.destroy();
    layersSheetCtrl.unsub(); layersSheetCtrl.slide.destroy();
    propsSheetCtrl.unsub(); propsSheetCtrl.slide.destroy();
    colorSheetCtrl.unsub(); colorSheetCtrl.slide.destroy();
  });

  // ── Tamanho custom em px ou cm ──
  let sizeUnit = 'px'; // 'px' | 'cm'
  let customWDraft = boardW;
  let customHDraft = boardH;
  $: if (sheetSize) { customWDraft = sizeUnit === 'cm' ? pxToCm(boardW) : boardW; customHDraft = sizeUnit === 'cm' ? pxToCm(boardH) : boardH; }

  function setSizeUnit(u) {
    if (u === sizeUnit) return;
    customWDraft = u === 'cm' ? pxToCm(boardW) : Math.round(cmToPx(customWDraft));
    customHDraft = u === 'cm' ? pxToCm(boardH) : Math.round(cmToPx(customHDraft));
    sizeUnit = u;
  }
  function applyPreset(preset) {
    buzz();
    boardW = preset.w; boardH = preset.h;
    sheetSize = false;
    scheduleSave(); pushHistory(true);
    tick().then(computeFit);
  }
  function applyCustomSize() {
    buzz();
    const wPx = sizeUnit === 'cm' ? Math.round(cmToPx(Number(customWDraft) || 1)) : Math.round(Number(customWDraft) || 1);
    const hPx = sizeUnit === 'cm' ? Math.round(cmToPx(Number(customHDraft) || 1)) : Math.round(Number(customHDraft) || 1);
    boardW = Math.max(16, Math.min(6000, wPx));
    boardH = Math.max(16, Math.min(6000, hPx));
    sheetSize = false;
    scheduleSave(); pushHistory(true);
    tick().then(computeFit);
  }

  function typeLabel(el) {
    if (el.type === 'text') return (el.text || '').slice(0, 22) || 'Texto vazio';
    if (el.type === 'image') return 'Imagem';
    if (el.type === 'shape') return SHAPE_ICONS.find(s => s.id === el.shape)?.label || 'Forma';
    return 'Elemento';
  }
  function selectFromLayers(id) { selectedId = id; sheetLayers = false; }
  function deleteFromLayers(e, id) {
    e.stopPropagation();
    elements = elements.filter(x => x.id !== id);
    if (selectedId === id) selectedId = null;
    commitChangeImmediate();
  }

  onMount(() => {
    computeFit();
    window.addEventListener('resize', computeFit);
    window.addEventListener('orientationchange', computeFit);
  });
  onDestroy(() => {
    window.removeEventListener('resize', computeFit);
    window.removeEventListener('orientationchange', computeFit);
  });

  function backToHome() { dispatch('nav', { to: 'home' }); }
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">
  <div class="appbar" style="background:{c.background};border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={backToHome} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_left_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
    </button>

    <div class="appbar-center">
      <input class="board-name-input" style="color:{c.textPrimary}" value={boardName} on:input={handleNameInput} on:blur={handleNameBlur} aria-label="Nome do design" />
      <span class="save-state" style="color:{c.textSecondary}">
        {#if savedState === 'saving'}A gravar…{:else if savedState === 'dirty'}Não gravado{:else}Gravado{/if}
      </span>
    </div>

    <button class="appbar-btn" style="background:{c.appbarBtnBg};opacity:{canUndo ? 1 : 0.4}" on:click={undo} disabled={!canUndo} aria-label="Desfazer">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_undo_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_undo_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
    </button>
    <button class="appbar-btn" style="background:{c.appbarBtnBg};opacity:{canRedo ? 1 : 0.4}" on:click={redo} disabled={!canRedo} aria-label="Refazer">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_redo_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_redo_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
    </button>
  </div>

  <div class="zoom-pill" style="background:{c.toolbarSolidBg}">
    <button class="zoom-btn" on:click={zoomOut} aria-label="Reduzir zoom">−</button>
    <button class="zoom-value" style="color:{c.textSecondary}" on:click={zoomReset}>{zoomPercent}%</button>
    <button class="zoom-btn" on:click={zoomIn} aria-label="Aumentar zoom">+</button>
  </div>

  <div
    class="canvas-area"
    style="background:{c.docCanvasBg}"
    bind:this={containerEl}
    on:pointerdown={onStagePointerDown}
    on:pointermove={onStagePointerMove}
    on:pointerup={onStagePointerUp}
    on:pointercancel={onStagePointerUp}
    on:dblclick={onStageDblClick}
  >
    <div class="stage-center" style="transform: translate3d({panX}px, {panY}px, 0);">
      <div
        class="stage-wrap"
        bind:this={stageWrapEl}
        style="width:{boardW}px; height:{boardH}px; transform: scale({totalScale}); transform-origin: center center;"
        on:pointerdown={(e) => { if (e.target === e.currentTarget) deselectAll(); }}
      >
        {#each elements as el (el.id)}
          <div
            class="el"
            class:el-selected={selectedId === el.id}
            style="left:{el.x}px; top:{el.y}px; width:{el.w}px; height:{el.h}px; transform: rotate({el.deg}deg); opacity:{el.opacity ?? 1}; mix-blend-mode:{el.blend || 'normal'};"
            on:pointerdown={(e) => startMove(e, el)}
          >
            {#if el.type === 'shape'}
              <div
                class="shape-fill"
                style="
                  background:{el.fill === 'transparent' ? 'transparent' : el.fill};
                  border-radius:{el.shape === 'circle_24_filled' ? '50%' : (el.radius || 0) + 'px'};
                  border:{el.borderWidth || 0}px solid {el.border === 'transparent' ? 'transparent' : el.border};
                  box-shadow:{el.shadow ? '0 8px 24px rgba(0,0,0,0.28)' : 'none'};
                "
              ></div>
            {:else if el.type === 'text'}
              {#if editingTextId === el.id}
                <div
                  id={'text-edit-' + el.id}
                  class="text-el text-editing"
                  contenteditable="true"
                  style="font-size:{el.fontSize}px; color:{el.color}; text-align:{el.align}; font-weight:{el.weight}; font-family:{el.fontFamily};"
                  on:blur={(e) => stopEditText(e, el.id)}
                  on:pointerdown={(e) => e.stopPropagation()}
                >{el.text}</div>
              {:else}
                <div
                  class="text-el"
                  style="font-size:{el.fontSize}px; color:{el.color}; text-align:{el.align}; font-weight:{el.weight}; font-family:{el.fontFamily}; white-space:pre-wrap;"
                  on:dblclick|stopPropagation={() => startEditText(el.id)}
                >{el.text}</div>
              {/if}
            {:else if el.type === 'image'}
              <div class="image-crop-window" style="border-radius:{el.radius || 0}px;" on:dblclick|stopPropagation={() => { activePropTab = 'crop'; }}>
                <img
                  src={el.src}
                  alt=""
                  draggable="false"
                  style="
                    width:{10000 / el.cropW}%; height:{10000 / el.cropH}%;
                    left:{-el.cropX * (10000 / el.cropW) / 100}%; top:{-el.cropY * (10000 / el.cropH) / 100}%;
                  "
                />
              </div>
            {/if}

            {#if selectedId === el.id && editingTextId !== el.id}
              <div class="handle handle-tl" on:pointerdown={(e) => startResize(e, el, 'tl')}></div>
              <div class="handle handle-tr" on:pointerdown={(e) => startResize(e, el, 'tr')}></div>
              <div class="handle handle-bl" on:pointerdown={(e) => startResize(e, el, 'bl')}></div>
              <div class="handle handle-br" on:pointerdown={(e) => startResize(e, el, 'br')}></div>
              <div class="rotate-line"></div>
              <div class="handle handle-rotate" on:pointerdown={(e) => startRotate(e, el)}></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- ── Toolbar contextual do elemento selecionado (aparece só quando há seleção) ── -->
  {#if selectedEl}
    <div class="ctx-toolbar" style="background:{c.toolbarSolidBg}">
      {#if selectedEl.type === 'text'}
        <button class="ctx-btn" on:click={() => startEditText(selectedEl.id)} aria-label="Editar texto">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}edit_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}edit_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
        <button class="ctx-btn" on:click={() => activePropTab = 'text'} aria-label="Tipografia">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_font_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_font_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
        <button class="ctx-btn" on:click={() => openColorPicker('text')} aria-label="Cor do texto">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}color_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}color_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
      {:else if selectedEl.type === 'shape'}
        <button class="ctx-btn" on:click={() => openColorPicker('fill')} aria-label="Preenchimento">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}paint_bucket_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}paint_bucket_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
        <button class="ctx-btn" on:click={() => activePropTab = 'border'} aria-label="Contorno">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}border_all_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}border_all_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
        <button class="ctx-btn" on:click={() => activePropTab = 'radius'} aria-label="Arredondamento">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
      {:else if selectedEl.type === 'image'}
        <button class="ctx-btn" on:click={() => activePropTab = 'crop'} aria-label="Recortar">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}crop_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}crop_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
        <button class="ctx-btn" on:click={() => activePropTab = 'radius'} aria-label="Arredondamento">
          <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}corner_double_arrow_up_left_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
        </button>
      {/if}
      <button class="ctx-btn" on:click={() => activePropTab = 'opacity'} aria-label="Opacidade">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}drop_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}drop_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
      </button>
      <button class="ctx-btn" on:click={() => activePropTab = 'blend'} aria-label="Mistura">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}layer_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}layer_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
      </button>
      <div class="ctx-divider" style="background:{c.divider}"></div>
      <button class="ctx-btn" on:click={duplicateSelected} aria-label="Duplicar">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}copy_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}copy_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
      </button>
      <button class="ctx-btn" on:click={bringToFront} aria-label="Trazer para a frente">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_up_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_up_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
      </button>
      <button class="ctx-btn" on:click={sendToBack} aria-label="Enviar para trás">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}arrow_down_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}arrow_down_24_regular.svg');background:{c.iconTint};width:18px;height:18px;"></span>
      </button>
      <button class="ctx-btn ctx-danger" on:click={deleteSelected} aria-label="Eliminar">
        <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}delete_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}delete_24_regular.svg');background:#FF3B30;width:18px;height:18px;"></span>
      </button>
    </div>
  {/if}

  <!-- ── Bottom bar — tab-bar nativa, sem overlay escuro ── -->
  <div class="bottom-bar" style="background:{c.creationBarBg}">
    <button class="bb-item" on:click={() => { buzz(); sheetTemplates = true; }} aria-label="Modelos">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}document_multiple_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}document_multiple_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Modelos</span>
    </button>
    <button class="bb-item" on:click={addTextEl} aria-label="Adicionar texto">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Texto</span>
    </button>
    <button class="bb-item" on:click={() => { buzz(); triggerImagePicker(); }} aria-label="Adicionar imagem">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}image_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}image_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Imagem</span>
    </button>
    <button class="bb-item" on:click={() => { buzz(); sheetShapes = true; }} aria-label="Adicionar forma">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}shapes_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}shapes_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Formas</span>
    </button>
    <button class="bb-item" on:click={() => { buzz(); sheetSize = true; }} aria-label="Tamanho da prancheta">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}table_simple_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}table_simple_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Tamanho</span>
    </button>
    <button class="bb-item" on:click={() => { buzz(); sheetLayers = true; }} aria-label="Camadas">
      <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}layer_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}layer_24_regular.svg');background:{c.iconTint};width:20px;height:20px;"></span>
      <span class="bb-label" style="color:{c.textSecondary}">Camadas</span>
    </button>
  </div>

  <input type="file" accept="image/*" bind:this={fileInputEl} on:change={handleFileChosen} style="display:none" />
</div>

<!-- ══════════════════════════════════ SHEET: TAMANHO DA PRANCHETA ══════════════════════════════════ -->
{#if sizeSheetMounted}
  <button class="overlay" class:overlay-in={sizeSheetIn} on:click={() => sheetSize = false} aria-label="Fechar"></button>
  <div class="bottom-sheet sheet-tall" style="background:{c.dialogBackground};transform:translate3d(0,{sizeSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={sizeDrag.touchstart} on:touchmove|nonpassive={sizeDrag.touchmove} on:touchend={sizeDrag.touchend} on:touchcancel={sizeDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Tamanho da prancheta</div>
    </div>
    <div class="sheet-body">
      <div class="unit-switch" style="background:{c.appbarBtnBg}">
        <button class="unit-btn" class:unit-active={sizeUnit === 'px'} style={sizeUnit === 'px' ? 'background:#2F7BF6;color:#fff' : `color:${c.textPrimary}`} on:click={() => setSizeUnit('px')}>px</button>
        <button class="unit-btn" class:unit-active={sizeUnit === 'cm'} style={sizeUnit === 'cm' ? 'background:#2F7BF6;color:#fff' : `color:${c.textPrimary}`} on:click={() => setSizeUnit('cm')}>cm</button>
      </div>

      <div class="custom-size-row">
        <div class="field-col">
          <label style="color:{c.textSecondary}">Largura ({sizeUnit})</label>
          <input type="number" step={sizeUnit === 'cm' ? '0.1' : '1'} bind:value={customWDraft} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </div>
        <div class="size-x" style="color:{c.textSecondary}">×</div>
        <div class="field-col">
          <label style="color:{c.textSecondary}">Altura ({sizeUnit})</label>
          <input type="number" step={sizeUnit === 'cm' ? '0.1' : '1'} bind:value={customHDraft} style="background:{c.appbarBtnBg};color:{c.textPrimary}" />
        </div>
      </div>
      <button class="apply-btn" on:click={applyCustomSize}>Aplicar tamanho</button>

      <div class="section-label" style="color:{c.textSecondary}">Redes sociais</div>
      <div class="preset-list">
        {#each SIZE_PRESETS.filter(p => p.cat === 'social') as preset}
          <button class="preset-row" style="background:{c.appbarBtnBg}" on:click={() => applyPreset(preset)}>
            <div class="preset-label">
              <strong style="color:{c.textPrimary}">{preset.label}</strong>
              <small style="color:{c.textSecondary}">{preset.sub}</small>
            </div>
            <div class="preset-preview" style="width:{Math.max(14, Math.min(40, 34 * (preset.w / preset.h)))}px; height:34px; border-color:{c.divider};"></div>
          </button>
        {/each}
      </div>

      <div class="section-label" style="color:{c.textSecondary}">Genérico</div>
      <div class="preset-list">
        {#each SIZE_PRESETS.filter(p => p.cat === 'generic') as preset}
          <button class="preset-row" style="background:{c.appbarBtnBg}" on:click={() => applyPreset(preset)}>
            <div class="preset-label">
              <strong style="color:{c.textPrimary}">{preset.label}</strong>
              <small style="color:{c.textSecondary}">{preset.sub}</small>
            </div>
            <div class="preset-preview" style="width:{Math.max(14, Math.min(40, 34 * (preset.w / preset.h)))}px; height:34px; border-color:{c.divider};"></div>
          </button>
        {/each}
      </div>

      <div class="section-label" style="color:{c.textSecondary}">Web</div>
      <div class="preset-list">
        {#each SIZE_PRESETS.filter(p => p.cat === 'web') as preset}
          <button class="preset-row" style="background:{c.appbarBtnBg}" on:click={() => applyPreset(preset)}>
            <div class="preset-label">
              <strong style="color:{c.textPrimary}">{preset.label}</strong>
              <small style="color:{c.textSecondary}">{preset.sub}</small>
            </div>
            <div class="preset-preview" style="width:{Math.max(14, Math.min(40, 34 * (preset.w / preset.h)))}px; height:34px; border-color:{c.divider};"></div>
          </button>
        {/each}
      </div>

      <div class="section-label" style="color:{c.textSecondary}">Impressão</div>
      <div class="preset-list">
        {#each SIZE_PRESETS.filter(p => p.cat === 'print') as preset}
          <button class="preset-row" style="background:{c.appbarBtnBg}" on:click={() => applyPreset(preset)}>
            <div class="preset-label">
              <strong style="color:{c.textPrimary}">{preset.label}</strong>
              <small style="color:{c.textSecondary}">{preset.sub}</small>
            </div>
            <div class="preset-preview" style="width:{Math.max(14, Math.min(40, 34 * (preset.w / preset.h)))}px; height:34px; border-color:{c.divider};"></div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ SHEET: FORMAS OFICIAIS FLUENT ══════════════════════════════════ -->
{#if shapesSheetMounted}
  <button class="overlay" class:overlay-in={shapesSheetIn} on:click={() => sheetShapes = false} aria-label="Fechar"></button>
  <div class="bottom-sheet" style="background:{c.dialogBackground};transform:translate3d(0,{shapesSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={shapesDrag.touchstart} on:touchmove|nonpassive={shapesDrag.touchmove} on:touchend={shapesDrag.touchend} on:touchcancel={shapesDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Formas</div>
    </div>
    <div class="sheet-body">
      <div class="shape-grid">
        {#each SHAPE_ICONS as s}
          <button class="shape-item" style="background:{c.appbarBtnBg}" on:click={() => addShapeEl(s.id)}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}{s.id}.svg');-webkit-mask-image:url('{FLUENT_CDN}{s.id}.svg');background:{c.iconTint};width:26px;height:26px;"></span>
            <span class="shape-label" style="color:{c.textSecondary}">{s.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ SHEET: MODELOS PRONTOS ══════════════════════════════════ -->
{#if templatesSheetMounted}
  <button class="overlay" class:overlay-in={templatesSheetIn} on:click={() => sheetTemplates = false} aria-label="Fechar"></button>
  <div class="bottom-sheet sheet-tall" style="background:{c.dialogBackground};transform:translate3d(0,{templatesSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={templatesDrag.touchstart} on:touchmove|nonpassive={templatesDrag.touchmove} on:touchend={templatesDrag.touchend} on:touchcancel={templatesDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Modelos prontos</div>
    </div>
    <div class="sheet-body">
      <div class="tpl-grid">
        {#each TEMPLATES as tpl}
          <button class="tpl-item" on:click={() => applyTemplate(tpl)}>
            <div class="tpl-thumb" style="background:{tpl.thumb}; aspect-ratio:{tpl.w}/{tpl.h};"></div>
            <span class="tpl-label" style="color:{c.textPrimary}">{tpl.label}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ SHEET: CAMADAS ══════════════════════════════════ -->
{#if layersSheetMounted}
  <button class="overlay" class:overlay-in={layersSheetIn} on:click={() => sheetLayers = false} aria-label="Fechar"></button>
  <div class="bottom-sheet" style="background:{c.dialogBackground};transform:translate3d(0,{layersSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={layersDrag.touchstart} on:touchmove|nonpassive={layersDrag.touchmove} on:touchend={layersDrag.touchend} on:touchcancel={layersDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Camadas</div>
    </div>
    <div class="sheet-body">
      {#if elements.length === 0}
        <div class="empty" style="color:{c.textSecondary}">Ainda não há elementos nesta prancheta.</div>
      {:else}
        {#each [...elements].reverse() as el (el.id)}
          <button class="layer-row" class:layer-row-active={selectedId === el.id} style={selectedId === el.id ? 'background:rgba(47,123,246,0.12)' : ''} on:click={() => selectFromLayers(el.id)}>
            {#if el.type === 'image'}
              <div class="layer-thumb"><img src={el.src} alt="" /></div>
            {:else if el.type === 'shape'}
              <div class="layer-thumb" style="background:{c.appbarBtnBg}">
                <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}{el.shape}.svg');-webkit-mask-image:url('{FLUENT_CDN}{el.shape}.svg');background:{el.fill === 'transparent' ? c.iconTint : el.fill};width:16px;height:16px;"></span>
              </div>
            {:else}
              <div class="layer-thumb" style="background:{c.appbarBtnBg}">
                <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_add_space_before_24_regular.svg');background:{c.iconTint};width:16px;height:16px;"></span>
              </div>
            {/if}
            <span class="layer-label" style="color:{c.textPrimary}">{typeLabel(el)}</span>
            <button class="layer-delete" on:click={(e) => deleteFromLayers(e, el.id)} aria-label="Remover" style="color:#FF3B30">×</button>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ SHEET: PROPRIEDADES ══════════════════════════════════ -->
{#if propsSheetMounted && selectedEl}
  <button class="overlay" class:overlay-in={propsSheetIn} on:click={closeProps} aria-label="Fechar"></button>
  <div class="bottom-sheet" style="background:{c.dialogBackground};transform:translate3d(0,{propsSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={propsDrag.touchstart} on:touchmove|nonpassive={propsDrag.touchmove} on:touchend={propsDrag.touchend} on:touchcancel={propsDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">
        {#if activePropTab === 'opacity'}Opacidade
        {:else if activePropTab === 'border'}Contorno
        {:else if activePropTab === 'radius'}Arredondamento
        {:else if activePropTab === 'shadow'}Sombra
        {:else if activePropTab === 'blend'}Mistura
        {:else if activePropTab === 'text'}Tipografia
        {:else if activePropTab === 'crop'}Recortar imagem
        {/if}
      </div>
    </div>
    <div class="sheet-body">
      {#if activePropTab === 'opacity'}
        <div class="field-label" style="color:{c.textSecondary}">Opacidade — {Math.round((selectedEl.opacity ?? 1) * 100)}%</div>
        <input type="range" min="0" max="100" step="1"
          value={Math.round((selectedEl.opacity ?? 1) * 100)}
          on:input={(e) => updateSelected({ opacity: Number(e.target.value) / 100 })}
          on:change={commitChangeImmediate}
          class="range-slider" />

      {:else if activePropTab === 'border'}
        <div class="field-label" style="color:{c.textSecondary}">Cor do contorno</div>
        <div class="color-grid">
          {#each PRESET_COLORS as hex}
            <button class="color-dot" class:color-dot-transparent={hex === 'transparent'} style="background:{hex === 'transparent' ? '#fff' : hex}" on:click={() => { updateSelected({ border: hex }); commitChangeImmediate(); }} aria-label={hex}></button>
          {/each}
          <button class="color-dot color-dot-custom" on:click={() => openColorPicker('border')} aria-label="Cor personalizada">+</button>
        </div>
        <div class="field-label" style="color:{c.textSecondary}">Espessura — {selectedEl.borderWidth || 0}px</div>
        <input type="range" min="0" max="24" step="1"
          value={selectedEl.borderWidth || 0}
          on:input={(e) => updateSelected({ borderWidth: Number(e.target.value) })}
          on:change={commitChangeImmediate}
          class="range-slider" />

      {:else if activePropTab === 'radius'}
        <div class="field-label" style="color:{c.textSecondary}">Border radius — {selectedEl.radius || 0}px</div>
        <input type="range" min="0" max="200" step="1"
          value={selectedEl.radius || 0}
          on:input={(e) => updateSelected({ radius: Number(e.target.value) })}
          on:change={commitChangeImmediate}
          class="range-slider" />
        {#if selectedEl.type === 'shape'}
          <label class="toggle-row">
            <span style="color:{c.textPrimary}">Sombra projetada</span>
            <input type="checkbox" checked={!!selectedEl.shadow} on:change={(e) => { updateSelected({ shadow: e.target.checked }); commitChangeImmediate(); }} />
          </label>
        {/if}

      {:else if activePropTab === 'blend'}
        <div class="opt-grid">
          {#each BLEND_MODES as mode}
            <button class="opt-chip" class:opt-chip-active={selectedEl.blend === mode} style="background:{selectedEl.blend === mode ? '#2F7BF6' : c.appbarBtnBg};color:{selectedEl.blend === mode ? '#fff' : c.textPrimary}" on:click={() => { updateSelected({ blend: mode }); commitChangeImmediate(); }}>{mode}</button>
          {/each}
        </div>

      {:else if activePropTab === 'text'}
        <div class="field-label" style="color:{c.textSecondary}">Tamanho — {selectedEl.fontSize}px</div>
        <input type="range" min="10" max="220" step="1"
          value={selectedEl.fontSize}
          on:input={(e) => updateSelected({ fontSize: Number(e.target.value) })}
          on:change={commitChangeImmediate}
          class="range-slider" />
        <div class="field-label" style="color:{c.textSecondary}">Alinhamento</div>
        <div class="opt-grid">
          <button class="opt-icon-btn" style="background:{selectedEl.align === 'left' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => { updateSelected({ align: 'left' }); commitChangeImmediate(); }}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_left_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{selectedEl.align === 'center' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => { updateSelected({ align: 'center' }); commitChangeImmediate(); }}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_center_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
          <button class="opt-icon-btn" style="background:{selectedEl.align === 'right' ? 'rgba(47,123,246,0.16)' : c.appbarBtnBg}" on:click={() => { updateSelected({ align: 'right' }); commitChangeImmediate(); }}>
            <span class="icon-mask" style="mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');-webkit-mask-image:url('{FLUENT_CDN}text_align_right_24_regular.svg');background:{c.iconTint};width:19px;height:19px;"></span>
          </button>
        </div>
        <div class="field-label" style="color:{c.textSecondary}">Peso</div>
        <div class="opt-grid">
          {#each [['400','Normal'],['600','Semi'],['800','Negrito']] as [w, label]}
            <button class="opt-chip" style="background:{selectedEl.weight === w ? '#2F7BF6' : c.appbarBtnBg};color:{selectedEl.weight === w ? '#fff' : c.textPrimary}" on:click={() => { updateSelected({ weight: w }); commitChangeImmediate(); }}>{label}</button>
          {/each}
        </div>

      {:else if activePropTab === 'crop'}
        <div class="crop-hint" style="color:{c.textSecondary}">Arrasta a imagem por baixo para reposicionar o recorte, e usa o slider para ampliar.</div>
        <div class="field-label" style="color:{c.textSecondary}">Zoom do recorte</div>
        <input type="range" min="20" max="100" step="1"
          value={selectedEl.cropW}
          on:input={(e) => {
            const w = Number(e.target.value);
            updateSelected({ cropW: w, cropH: w, cropX: Math.min(100 - w, selectedEl.cropX), cropY: Math.min(100 - w, selectedEl.cropY) });
          }}
          on:change={commitChangeImmediate}
          class="range-slider" />
        <div class="crop-preview-wrap" on:pointerdown={(e) => startCropMove(e, selectedEl)}>
          <img src={selectedEl.src} alt="" draggable="false"
            style="left:{-selectedEl.cropX}%; top:{-selectedEl.cropY}%; width:{10000 / selectedEl.cropW}%; height:auto;" />
          <div class="crop-frame"></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- ══════════════════════════════════ SHEET: SELETOR DE COR (roda HSB) ══════════════════════════════════ -->
<svelte:window on:mousemove={onSVMove} on:mouseup={onSVUp} on:touchmove|nonpassive={onSVMove} on:touchend={onSVUp} />
{#if colorSheetMounted}
  <button class="overlay" class:overlay-in={colorSheetIn} on:click={() => colorPickerOpen = false} aria-label="Fechar"></button>
  <div class="bottom-sheet" style="background:{c.dialogBackground};transform:translate3d(0,{colorSheetCtrl.y}%,0);">
    <div class="sheet-grab-zone" on:touchstart={colorDrag.touchstart} on:touchmove|nonpassive={colorDrag.touchmove} on:touchend={colorDrag.touchend} on:touchcancel={colorDrag.touchend}>
      <div class="sheet-handle" style="background:{c.divider}"></div>
      <div class="sheet-title" style="color:{c.textPrimary}">Escolher cor</div>
    </div>
    <div class="sheet-body">
      <div class="sv-area" bind:this={svAreaEl}
        style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, {pureHueHex});"
        on:mousedown={onSVDown} on:touchstart|nonpassive={onSVDown}>
        <div class="sv-thumb" style="left:{pickSat}%; top:{100 - pickBright}%; background:{previewHex};"></div>
      </div>
      <div class="hue-slider" bind:this={hueSliderEl}
        on:mousedown={onHueDown} on:touchstart|nonpassive={onHueDown} on:mousemove={onHueMove} on:touchmove|nonpassive={onHueMove} on:mouseup={onHueUp} on:touchend={onHueUp}>
        <div class="hue-thumb" style="left:{(pickHue/360)*100}%; background:{pureHueHex};"></div>
      </div>
      <div class="preview-row">
        <div class="preview-swatch" style="background:{previewHex}"></div>
        <span class="preview-hex" style="color:{c.textSecondary}">{previewHex.toUpperCase()}</span>
      </div>
      <div class="sheet-actions">
        <button class="btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => colorPickerOpen = false}>Cancelar</button>
        <button class="btn-primary" on:click={() => applyColorFromPicker(previewHex)}>Aplicar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(html), :global(body) { width:100%; height:100%; overflow:hidden; overscroll-behavior:none; position:relative; }

  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; contain:layout style paint; }

  .appbar { display:flex; align-items:center; gap:8px; padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 10px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s; }
  .appbar-btn:active { transform:scale(0.94); }
  .appbar-btn:disabled { cursor:default; }
  .appbar-center { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; }
  .board-name-input { width:100%; max-width:200px; text-align:center; font-size:16px; font-weight:700; border:none; background:transparent; outline:none; padding:0; }
  .save-state { font-size:11px; font-weight:500; margin-top:1px; white-space:nowrap; }

  .zoom-pill { position:absolute; top:calc(env(safe-area-inset-top,0px) + 58px); right:12px; z-index:15; display:flex; align-items:center; gap:2px; border-radius:999px; padding:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1), 0 6px 18px rgba(0,0,0,0.14); }
  .zoom-btn { width:26px; height:26px; border:none; border-radius:50%; background:transparent; font-size:16px; font-weight:700; cursor:pointer; color:#2F7BF6; display:flex; align-items:center; justify-content:center; -webkit-tap-highlight-color:transparent; }
  .zoom-btn:active { opacity:.6; }
  .zoom-value { border:none; background:transparent; font-size:11px; font-weight:700; padding:0 6px; cursor:pointer; -webkit-tap-highlight-color:transparent; }

  .canvas-area {
    flex:1; min-height:0; overflow:hidden; position:relative;
    display:flex; align-items:center; justify-content:center;
    touch-action:none;
  }
  .stage-center { display:flex; align-items:center; justify-content:center; }
  .stage-wrap {
    position:relative;
    background:#FFFFFF;
    box-shadow:0 1px 2px rgba(0,0,0,0.08), 0 16px 44px rgba(0,0,0,0.20);
    flex-shrink:0;
    background-image:
      linear-gradient(45deg, #eee 25%, transparent 25%),
      linear-gradient(-45deg, #eee 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #eee 75%),
      linear-gradient(-45deg, transparent 75%, #eee 75%);
    background-size:20px 20px;
    background-position:0 0, 0 10px, 10px -10px, -10px 0px;
  }

  .el { position:absolute; touch-action:none; -webkit-user-select:none; user-select:none; cursor:grab; }
  .el:active { cursor:grabbing; }
  .el-selected { outline:1.5px solid #2F7BF6; outline-offset:2px; }

  .shape-fill { width:100%; height:100%; box-sizing:border-box; }

  .text-el { width:100%; height:100%; outline:none; overflow:hidden; word-break:break-word; display:flex; align-items:flex-start; }
  .text-editing { cursor:text; box-shadow:0 0 0 1.5px #2F7BF6 inset; }

  .image-crop-window { position:relative; width:100%; height:100%; overflow:hidden; }
  .image-crop-window img { position:absolute; max-width:none; pointer-events:none; }

  .handle { position:absolute; width:16px; height:16px; background:#2F7BF6; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.3); touch-action:none; }
  .handle-tl { left:-8px; top:-8px; cursor:nwse-resize; }
  .handle-tr { right:-8px; top:-8px; cursor:nesw-resize; }
  .handle-bl { left:-8px; bottom:-8px; cursor:nesw-resize; }
  .handle-br { right:-8px; bottom:-8px; cursor:nwse-resize; }
  .rotate-line { position:absolute; left:50%; top:-28px; width:1.5px; height:26px; background:#2F7BF6; transform:translateX(-50%); }
  .handle-rotate { left:50%; top:-36px; transform:translateX(-50%); cursor:grab; }

  /* ── Toolbar contextual do elemento ── */
  .ctx-toolbar {
    position:fixed; left:50%; bottom:76px; transform:translateX(-50%); z-index:35;
    display:flex; align-items:center; gap:1px; padding:5px; border-radius:999px;
    box-shadow:0 1px 3px rgba(0,0,0,0.10), 0 10px 28px rgba(0,0,0,0.16);
    max-width:calc(100vw - 24px); overflow-x:auto; -webkit-overflow-scrolling:touch;
  }
  .ctx-toolbar::-webkit-scrollbar { display:none; }
  .ctx-btn { width:36px; height:36px; border:none; background:transparent; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:transform .12s cubic-bezier(0.34,1.56,0.64,1), background .15s; }
  .ctx-btn:active { transform:scale(0.84); background:rgba(127,127,127,0.14); }
  .ctx-divider { width:1px; height:18px; margin:0 3px; flex-shrink:0; }
  .ctx-danger { }

  /* ── Bottom bar (tab-bar nativa, sem overlay escuro) ── */
  .bottom-bar {
    flex-shrink:0; display:flex; align-items:center; justify-content:space-around;
    padding:6px 4px calc(env(safe-area-inset-bottom,0px) + 6px); box-shadow:0 -1px 0 0 rgba(127,127,127,0.14);
  }
  .bb-item { display:flex; flex-direction:column; align-items:center; gap:3px; background:transparent; border:none; padding:6px 8px; border-radius:12px; flex:1; max-width:90px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .bb-item:active { opacity:.6; }
  .bb-label { font-size:9px; font-weight:600; }

  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }

  /* ── Bottom sheets ── */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0); z-index:600; border:none; cursor:default; width:100%; height:100%; transition:background .32s ease; }
  .overlay.overlay-in { background:rgba(0,0,0,.45); }
  .bottom-sheet { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; z-index:700; padding:0 0 calc(env(safe-area-inset-bottom,0px) + 24px); will-change:transform; box-shadow:0 -4px 40px rgba(0,0,0,.16); max-height:72vh; display:flex; flex-direction:column; }
  .sheet-tall { max-height:82vh; }
  .sheet-grab-zone { touch-action:none; flex-shrink:0; }
  .sheet-handle { width:36px; height:4px; border-radius:2px; margin:10px auto 8px; }
  .sheet-title { font-size:13px; font-weight:700; padding:4px 18px 10px; opacity:.6; text-transform:uppercase; letter-spacing:.05em; text-align:center; }
  .sheet-body { padding:8px 18px 4px; overflow-y:auto; -webkit-overflow-scrolling:touch; }

  .empty { text-align:center; padding:24px 16px; font-size:14px; font-weight:500; }

  /* ── Tamanho ── */
  .unit-switch { display:flex; padding:3px; border-radius:12px; gap:3px; margin-bottom:16px; }
  .unit-btn { flex:1; border:none; background:transparent; padding:9px 0; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; -webkit-tap-highlight-color:transparent; }
  .custom-size-row { display:flex; align-items:flex-end; gap:8px; }
  .field-col { flex:1; display:flex; flex-direction:column; gap:5px; }
  .field-col label { font-size:11px; font-weight:600; }
  .field-col input[type="number"] { width:100%; padding:11px 12px; border:none; border-radius:12px; font-size:15px; box-sizing:border-box; }
  .size-x { font-size:16px; font-weight:600; padding-bottom:11px; }
  .apply-btn { width:100%; margin-top:14px; border:none; border-radius:999px; padding:13px 16px; font-size:14px; font-weight:700; cursor:pointer; background:#2F7BF6; color:#fff; -webkit-tap-highlight-color:transparent; transition:transform .16s cubic-bezier(0.34,1.56,0.64,1); }
  .apply-btn:active { transform:scale(0.97); }
  .section-label { font-size:12px; font-weight:700; margin:18px 0 8px; text-transform:uppercase; letter-spacing:.04em; }
  .preset-list { display:flex; flex-direction:column; gap:8px; }
  .preset-row { display:flex; align-items:center; justify-content:space-between; border:none; border-radius:14px; padding:12px 14px; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s; }
  .preset-row:active { transform:scale(0.98); }
  .preset-label { display:flex; flex-direction:column; gap:2px; text-align:left; }
  .preset-label strong { font-size:13.5px; }
  .preset-label small { font-size:11px; }
  .preset-preview { border:1.5px solid; border-radius:3px; flex-shrink:0; background:rgba(127,127,127,0.08); }

  /* ── Formas ── */
  .shape-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
  .shape-item { display:flex; flex-direction:column; align-items:center; gap:7px; border:none; border-radius:14px; padding:14px 6px; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .shape-item:active { transform:scale(0.92); }
  .shape-label { font-size:10.5px; font-weight:600; text-align:center; }

  /* ── Modelos ── */
  .tpl-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .tpl-item { display:flex; flex-direction:column; gap:7px; border:none; background:transparent; cursor:pointer; padding:0; -webkit-tap-highlight-color:transparent; }
  .tpl-thumb { width:100%; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.12); }
  .tpl-item:active .tpl-thumb { transform:scale(0.97); }
  .tpl-label { font-size:12.5px; font-weight:600; }

  /* ── Camadas ── */
  .layer-row { width:100%; display:flex; align-items:center; gap:12px; background:none; border:none; padding:11px 10px; text-align:left; cursor:pointer; -webkit-tap-highlight-color:transparent; border-radius:14px; transition:background .14s, transform .14s; }
  .layer-row:active { transform:scale(0.98); }
  .layer-thumb { width:32px; height:32px; border-radius:8px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .layer-thumb img { width:100%; height:100%; object-fit:cover; }
  .layer-label { flex:1; font-size:14px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .layer-delete { background:none; border:none; font-size:20px; line-height:1; padding:4px 6px; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; }

  /* ── Propriedades ── */
  .field-label { font-size:12px; font-weight:600; margin:14px 0 10px; text-transform:uppercase; letter-spacing:.04em; }
  .range-slider { width:100%; height:34px; -webkit-appearance:none; appearance:none; background:transparent; margin:0 0 4px; }
  .range-slider::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:rgba(127,127,127,0.28); }
  .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:#2F7BF6; margin-top:-9px; box-shadow:0 1px 4px rgba(0,0,0,0.3); }
  .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:14px 2px 4px; font-size:14px; font-weight:600; }
  .toggle-row input[type="checkbox"] { width:20px; height:20px; }

  .opt-grid { display:flex; flex-wrap:wrap; gap:8px; padding:2px 0 4px; }
  .opt-chip { border:none; border-radius:999px; padding:10px 15px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .opt-chip:active { transform:scale(0.95); }
  .opt-icon-btn { width:46px; height:46px; border:none; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); }
  .opt-icon-btn:active { transform:scale(0.9); }

  .color-grid { display:flex; flex-wrap:wrap; gap:10px; padding:2px 0 4px; }
  .color-dot { width:34px; height:34px; border-radius:50%; border:2px solid rgba(127,127,127,0.18); cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .14s cubic-bezier(0.34,1.56,0.64,1); background-image:linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%); background-size:8px 8px; background-position:0 0, 0 4px, 4px -4px, -4px 0px; }
  .color-dot:active { transform:scale(0.86); }
  .color-dot-custom { display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#2F7BF6; background:rgba(47,123,246,0.1); }

  .crop-hint { font-size:12.5px; line-height:1.5; margin-bottom:6px; }
  .crop-preview-wrap { position:relative; width:100%; aspect-ratio:1; border-radius:14px; overflow:hidden; margin-top:14px; background:#111; touch-action:none; }
  .crop-preview-wrap img { position:absolute; max-width:none; pointer-events:none; }
  .crop-frame { position:absolute; inset:0; border:2px solid #2F7BF6; border-radius:14px; pointer-events:none; box-shadow:0 0 0 2000px rgba(0,0,0,0.35); }

  /* ── Color wheel (HSB) ── */
  .sv-area { position:relative; width:100%; height:160px; border-radius:14px; touch-action:none; margin-bottom:14px; }
  .sv-thumb { position:absolute; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.4); transform:translate(-50%,-50%); pointer-events:none; }
  .hue-slider { position:relative; width:100%; height:20px; border-radius:999px; touch-action:none; margin-bottom:16px; background:linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
  .hue-thumb { position:absolute; top:50%; width:22px; height:22px; border-radius:50%; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.4); transform:translate(-50%,-50%); pointer-events:none; }
  .preview-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .preview-swatch { width:30px; height:30px; border-radius:50%; border:2px solid rgba(127,127,127,0.18); flex-shrink:0; }
  .preview-hex { font-size:13px; font-weight:600; letter-spacing:.03em; }
  .sheet-actions { display:flex; gap:10px; padding-bottom:4px; }
  .btn-primary, .btn-secondary { flex:1; padding:12px 16px; border-radius:999px; border:none; font-size:14px; font-weight:600; cursor:pointer; text-align:center; -webkit-tap-highlight-color:transparent; transition:transform .16s cubic-bezier(0.34,1.56,0.64,1); }
  .btn-primary { background:#2F7BF6; color:#fff; }
  .btn-primary:active, .btn-secondary:active { transform:scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .overlay, .bottom-sheet, .appbar-btn, .ctx-btn, .bb-item, .opt-chip, .opt-icon-btn, .color-dot, .apply-btn, .preset-row, .shape-item, .layer-row, .btn-primary, .btn-secondary { transition:none !important; }
  }
</style>