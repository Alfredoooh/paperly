<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { GeminiApiService, AuthApiService, CreditsApiService } from '../../core/api.js';
  import { showToast } from '../../core/utils.js';
  import { AVAILABLE_MODELS, AVAILABLE_LANGUAGES, DRAWER_APPS } from '../../core/plans.js';
  import Drawer       from '../shared/Drawer.svelte';
  import ModalSheet   from '../shared/ModalSheet.svelte';
  import SettingsPage from './SettingsPage.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  // ── Estado ──
  $: c = getThemeColors(isDark);

  let currentModelId   = localStorage.getItem('nexa_model') || 'gemini-2.5-flash';
  let currentLanguage  = localStorage.getItem('nexa_language') || 'pt';
  let drawerOpen       = false;
  let activeApp        = localStorage.getItem('nexa_active_app') || 'ai';
  let conversations    = [];
  let showSettings     = false;

  // Chat state
  let displayMessages  = [];
  let chatHistory      = [];
  let currentConvId    = '';
  let currentConvTitle = 'Nova conversa';
  let titleGenerated   = false;
  let isStreaming      = false;
  let isIncognito      = false;
  let pendingAttachments = [];
  let flashMode        = false;
  let thinkMoreMode    = false;
  let sheetsEnabled    = false;

  // UI
  let inputText        = '';
  let textInputEl;
  let messagesEl;
  let showSheet        = false;
  let sheetMode        = ''; // add | extras | edit | convOptions | userMsgOptions | rename | modelPicker
  let sheetConv        = null;
  let sheetUserMsg     = null;
  let sheetUserIdx     = -1;
  let renameValue      = '';
  let editMsgValue     = '';
  let showCenterDialog = false;
  let centerDialogMode = ''; // rename | editMsg

  // Voice recording
  let mediaRecorder = null, audioChunks = [], isRecording = false;
  let waveOverlayCtx = null, waveOverlayAnalyser = null, waveOverlaySource = null;
  let waveOverlayStream = null, waveOverlayAnimFrame = null;
  let wavePhase = 0, waveSmoothAmp = 6, waveSmoothBoost = 0, waveSmoothScale = 1;
  let showRecOverlay = false;
  let recSeconds = 0;
  let recInterval = null;
  let recCanvasEl;

  $: hasMessages = displayMessages.length > 0;
  $: greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();
  $: getCurrentModelName = () => (AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'Gemini 2.5 Flash');

  // ── Keyboard / viewport ──
  onMount(() => {
    setupVH();
    setupKeyboard();
    setupWidgetSettings();
    window.addEventListener('resize', setupVH);
    window.addEventListener('orientationchange', () => setTimeout(setupVH, 120));
  });

  function setupVH() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
  }

  function setupKeyboard() {
    let lastOffset = -1;
    const compute = () => {
      if (!window.visualViewport) return 0;
      const vv = window.visualViewport;
      return Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    const apply = (offset) => {
      if (offset === lastOffset) return; lastOffset = offset;
      const bbEl = document.getElementById('bottomBar');
      if (bbEl) bbEl.style.bottom = offset > 40 ? offset + 'px' : '0px';
      if (messagesEl) messagesEl.style.paddingBottom = (170 + (offset > 40 ? offset : 0)) + 'px';
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => requestAnimationFrame(() => apply(compute())));
      window.visualViewport.addEventListener('scroll', () => requestAnimationFrame(() => apply(compute())));
    }
  }

  // ── Widget settings ──
  let widgetSettings = {};
  function setupWidgetSettings() {
    try { widgetSettings = JSON.parse(localStorage.getItem('ipc_widget_settings_v1') || '{}'); } catch (e) {}
  }
  function isWidgetEnabled(type) { return widgetSettings[type] !== false; }

  // ── Markdown ──
  const ALL_WIDGETS = new Set(['widget_table','widget_code','widget_bar','widget_pie','widget_sheet','widget_market','widget_calendar','widget_timer','widget_mindmap','widget_graph','widget_map']);

  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function escapeAttr(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function applyInline(text) {
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g,'<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
    text = text.replace(/__([^_\n]+)__/g,'<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
    text = text.replace(/~~([^~\n]+)~~/g,'<del>$1</del>');
    text = text.replace(/`([^`\n]+)`/g,'<code class="inline-code">$1</code>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/(?<!["">])(https?:\/\/[^\s<>"']+)/g,'<a class="md-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/==([^=\n]+)==/g,'<mark class="md-mark">$1</mark>');
    return text;
  }

  const GREEK_MAP = {alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',sigma:'σ',phi:'φ',psi:'ψ',omega:'ω',Alpha:'Α',Beta:'Β',Gamma:'Γ',Delta:'Δ',Pi:'Π',Sigma:'Σ',Omega:'Ω'};
  function renderMathToken(expr) {
    let o = String(expr).trim();
    o = o.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g,'<span class="math-root"><sup class="math-root-index">$1</sup><span class="math-radical">√</span><span class="math-radicand">$2</span></span>');
    o = o.replace(/\\sqrt\{(.+?)\}/g,'<span class="math-root"><span class="math-radical">√</span><span class="math-radicand">$1</span></span>');
    o = o.replace(/\\frac\{(.+?)\}\{(.+?)\}/g,'<span class="math-frac"><span class="math-frac-num">$1</span><span class="math-frac-den">$2</span></span>');
    o = o.replace(/\\([A-Za-z]+)/g,(_,n)=>GREEK_MAP[n]||({sum:'∑',int:'∫',infty:'∞',pm:'±',times:'×',leq:'≤',geq:'≥',neq:'≠',approx:'≈',to:'→',partial:'∂',forall:'∀',in:'∈',emptyset:'∅'}[n])||_);
    o = o.replace(/\^\{(.+?)\}/g,'<sup>$1</sup>');
    o = o.replace(/\^(-?[A-Za-z0-9]+)/g,'<sup>$1</sup>');
    o = o.replace(/_\{(.+?)\}/g,'<sub>$1</sub>');
    o = o.replace(/_(-?[A-Za-z0-9]+)/g,'<sub>$1</sub>');
    return o;
  }

  function tryParseTable(lines, i) {
    if (i+1 >= lines.length) return null;
    const h = lines[i], s = lines[i+1];
    if (!/^\s*\|?.+\|.+\|?\s*$/.test(h)) return null;
    if (!/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s)) return null;
    const splitRow = l => l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
    const headers = splitRow(h);
    const aligns = splitRow(s).map(c => { const l=c.startsWith(':'), r=c.endsWith(':'); return l&&r?'center':r?'right':l?'left':''; });
    let j = i+2; const rows = [];
    while (j < lines.length && /^\s*\|?.+\|.+\|?\s*$/.test(lines[j]) && lines[j].trim()) { rows.push(splitRow(lines[j])); j++; }
    return { headers, aligns, rows, nextIdx: j };
  }

  function buildTableHtml(t) {
    const as = i => t.aligns[i] ? `text-align:${t.aligns[i]};` : '';
    return `<div class="md-table-wrapper"><table class="md-table"><thead><tr>${t.headers.map((h,i)=>`<th style="${as(i)}">${applyInline(escapeHtml(h))}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${r.map((cell,i)=>`<td style="${as(i)}">${applyInline(escapeHtml(cell))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderMarkdown(rawText) {
    if (!rawText) return '';
    const codeBlocks = [], mathBlocks = [];
    let text = rawText.replace(/```([\w_]*?)[\r\n]+([\s\S]*?)```/g, (_, lang, code) => { const idx = codeBlocks.length; codeBlocks.push({lang:lang.trim(), code:code.replace(/\n$/,'')}); return `\u0000CB${idx}\u0000`; });
    text = text.replace(/\$\$([\s\S]+?)\$\$/g,(_,c)=>{ const idx=mathBlocks.length; mathBlocks.push({display:true,content:c}); return `\u0000MB${idx}\u0000`; });
    text = text.replace(/\$([^\$\n]+?)\$/g,(_,c)=>{ const idx=mathBlocks.length; mathBlocks.push({display:false,content:c}); return `\u0000MB${idx}\u0000`; });
    const lines = text.split('\n'); const parts = [];
    let listItems=[], ordItems=[], paraLines=[], bqLines=[], inBq=false;
    const flushPara = () => { if (paraLines.length) { const j=paraLines.join('\n'); if(j.trim()) parts.push(`<p class="md-para">${j}</p>`); paraLines=[]; } };
    const flushList = () => { if (listItems.length) { parts.push(`<ul class="md-list">${listItems.map(li=>`<li class="md-li">${li}</li>`).join('')}</ul>`); listItems=[]; } };
    const flushOrd  = () => { if (ordItems.length)  { parts.push(`<ol class="md-olist">${ordItems.map(li=>`<li class="md-li">${li}</li>`).join('')}</ol>`); ordItems=[]; } };
    const flushBq   = () => { if (bqLines.length) { parts.push(`<blockquote class="md-blockquote">${bqLines.join('<br>')}</blockquote>`); bqLines=[]; inBq=false; } };
    for (let i=0; i<lines.length; i++) {
      const raw=lines[i], esc=escapeHtml(raw);
      if (raw.trim()==='') { flushList();flushOrd();flushBq();flushPara(); continue; }
      if (raw.trim().startsWith('\u0000CB')) { flushList();flushOrd();flushBq();flushPara(); parts.push(raw.trim()); continue; }
      const tbl=tryParseTable(lines,i); if(tbl){flushList();flushOrd();flushBq();flushPara();parts.push(buildTableHtml(tbl));i=tbl.nextIdx-1;continue;}
      const h4=raw.match(/^####\s+(.+)/),h3=raw.match(/^###\s+(.+)/),h2=raw.match(/^##\s+(.+)/),h1=raw.match(/^#\s+(.+)/);
      if(h4||h3||h2||h1){flushList();flushOrd();flushBq();flushPara();if(h4)parts.push(`<h4 class="md-h4">${applyInline(escapeHtml(h4[1]))}</h4>`);else if(h3)parts.push(`<h3 class="md-h3">${applyInline(escapeHtml(h3[1]))}</h3>`);else if(h2)parts.push(`<h2 class="md-h2">${applyInline(escapeHtml(h2[1]))}</h2>`);else parts.push(`<h1 class="md-h1">${applyInline(escapeHtml(h1[1]))}</h1>`);continue;}
      if(/^(\*{3,}|-{3,}|_{3,})\s*$/.test(raw.trim())){flushList();flushOrd();flushBq();flushPara();parts.push('<hr class="md-hr">');continue;}
      const bq=raw.match(/^>\s*(.*)/); if(bq){flushList();flushOrd();flushPara();bqLines.push(applyInline(escapeHtml(bq[1])));inBq=true;continue;}
      if(inBq)flushBq();
      const li=raw.match(/^(\s*)[-*+]\s+(.+)/); if(li){flushOrd();flushPara();listItems.push(applyInline(escapeHtml(li[2])));continue;}
      const ol=raw.match(/^(\s*)\d+\.\s+(.+)/); if(ol){flushList();flushPara();ordItems.push(applyInline(escapeHtml(ol[2])));continue;}
      flushList();flushOrd();paraLines.push(applyInline(esc));
    }
    flushList();flushOrd();flushBq();flushPara();
    text = parts.join('');
    text = text.replace(/\u0000CB(\d+)\u0000/g,(_,idx)=>{
      const blk=codeBlocks[Number(idx)];
      if(ALL_WIDGETS.has(blk.lang)&&isWidgetEnabled(blk.lang)) return `<div class="native-widget" data-widget-type="${blk.lang}" data-widget-json="${escapeAttr(blk.code)}"></div>`;
      const safe=escapeHtml(blk.code);
      const hdr=blk.lang?`<div class="code-block-header"><span class="code-lang-label">${escapeHtml(blk.lang)}</span><button class="code-copy-btn pulse-tap" onclick="copyCodeBlockBtn(this)"><span class="icon-mask" style="mask-image:url('/icons/svg/copy.svg');-webkit-mask-image:url('/icons/svg/copy.svg');width:13px;height:13px;background:currentColor;"></span></button></div>`:'';
      return `<div class="code-block-wrapper">${hdr}<pre class="code-block"><code>${safe}</code></pre></div>`;
    });
    text = text.replace(/\u0000MB(\d+)\u0000/g,(_,idx)=>{const blk=mathBlocks[Number(idx)];const rendered=renderMathToken(blk.content);return blk.display?`<div class="math-display">${rendered}</div>`:`<span class="math-inline">${rendered}</span>`;});
    return text;
  }

  // expose globally for inline onclick
  if (typeof window !== 'undefined') {
    window.copyCodeBlockBtn = (btn) => {
      const code = btn.closest('.code-block-wrapper')?.querySelector('code');
      if (code) navigator.clipboard.writeText(code.textContent).then(()=>showToast('Código copiado!')).catch(()=>{});
    };
  }

  // ── Send message ──
  async function sendMessage(text, attachmentsOverride, skipClear) {
    const trimmed = (text||'').trim();
    const atts = attachmentsOverride !== undefined ? attachmentsOverride : pendingAttachments.slice();
    if (!trimmed && atts.length === 0) return;
    if (isStreaming) return;
    const isFirst = chatHistory.length === 0;
    isStreaming = true;
    chatHistory = [...chatHistory, { role:'user', content:trimmed }];
    displayMessages = [...displayMessages, { role:'user', content:trimmed, attachments:atts }];
    if (!skipClear) { inputText = ''; autoResize(); }
    if (attachmentsOverride === undefined) pendingAttachments = [];
    scrollToBottom();
    const assistantIdx = displayMessages.length;
    displayMessages = [...displayMessages, { role:'assistant', content:'', isStreaming:true, isThinking:thinkMoreMode, thinkingContent:'' }];
    scrollToBottom();
    const think = thinkMoreMode;
    const systemPrompt = GeminiApiService.buildSystemPrompt(currentLanguage, sheetsEnabled);
    const token = user?.token || '';
    try {
      const stream = GeminiApiService.streamChat({ messages: chatHistory, systemPrompt, token, think, language: currentLanguage });
      for await (const chunk of stream) {
        if (chunk.type === 'think') {
          displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], thinkingContent: displayMessages[assistantIdx].thinkingContent + chunk.text };
          displayMessages = [...displayMessages];
        } else if (chunk.type === 'token') {
          displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], isThinking:false, content: displayMessages[assistantIdx].content + chunk.text };
          displayMessages = [...displayMessages]; scrollToBottom();
        } else if (chunk.type === 'done') {
          const finalContent = chunk.fullText || displayMessages[assistantIdx].content;
          chatHistory = [...chatHistory, { role:'assistant', content:finalContent }];
          displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content:finalContent, isStreaming:false, isThinking:false };
          displayMessages = [...displayMessages];
        } else if (chunk.type === 'credits_exhausted') {
          displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content:'⚠️ Créditos esgotados. Adquire mais créditos nas Definições.', isStreaming:false, isThinking:false };
          displayMessages = [...displayMessages];
        } else if (chunk.type === 'error') {
          displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content: chunk.message, isStreaming:false, isThinking:false };
          displayMessages = [...displayMessages];
        }
      }
    } catch (e) {
      displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content:'Erro de rede: '+e.message, isStreaming:false, isThinking:false };
      displayMessages = [...displayMessages];
    }
    isStreaming = false; scrollToBottom();
    if (isFirst && !titleGenerated) {
      titleGenerated = true;
      currentConvTitle = await GeminiApiService.generateTitle(trimmed, token, currentLanguage);
    }
    if (!isIncognito) {
      if (!currentConvId) { const id = await AuthApiService.createConversation(token, currentConvTitle, chatHistory); if (id) currentConvId = id; }
      else { await AuthApiService.updateConversation(token, currentConvId, currentConvTitle, chatHistory); }
      if (user) {
        const list = await AuthApiService.listConversations(token);
        conversations = list.map(cv => ({ id:cv.id, title:cv.title, messages:cv.messages||[], updatedAt:cv.updatedAt||Date.now(), pinned:cv.pinned||false }));
      }
    }
  }

  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, 150) + 'px';
  }

  function scrollToBottom() {
    if (!messagesEl) return;
    requestAnimationFrame(() => { if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; });
    setTimeout(() => { if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; }, 100);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const isMobile = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
      if (!isMobile && !e.shiftKey) { e.preventDefault(); if ((inputText.trim() || pendingAttachments.length) && !isStreaming) sendMessage(inputText); }
    }
  }

  // ── Drawer ──
  function handleDrawerOpen() {
    drawerOpen = true;
    if (user && activeApp === 'ai') {
      AuthApiService.listConversations(user.token).then(list => {
        conversations = list.map(cv => ({ id:cv.id, title:cv.title, messages:cv.messages||[], updatedAt:cv.updatedAt||Date.now(), pinned:cv.pinned||false }));
      });
    }
  }
  function handleSwitchApp(e) {
    const id = e.detail.id;
    activeApp = id; localStorage.setItem('nexa_active_app', id);
    drawerOpen = false;
    if (id !== 'ai') dispatch('nav', { to: id, data: { user } });
    else showToast('IA ativa');
  }
  function handleOpenConv(e) {
    if (isStreaming || isIncognito) { showToast(isIncognito ? 'Não é possível sair da conversa privada' : ''); return; }
    const conv = e.detail.conv;
    currentConvId = conv.id; currentConvTitle = conv.title; titleGenerated = true;
    chatHistory = [...conv.messages];
    displayMessages = conv.messages.map(m => ({ role:m.role, content:m.content }));
  }
  function handleConvOptions(e) { sheetConv = e.detail.conv; sheetMode = 'convOptions'; showSheet = true; }

  // ── New chat ──
  function newChat() {
    if (isIncognito) { showToast('Termina a conversa privada para criar uma nova'); return; }
    displayMessages = []; chatHistory = []; currentConvId = ''; currentConvTitle = 'Nova conversa'; titleGenerated = false; pendingAttachments = [];
  }

  // ── Incognito ──
  function startIncognito() {
    displayMessages = []; chatHistory = []; currentConvId = ''; currentConvTitle = 'Conversa privada';
    titleGenerated = true; pendingAttachments = []; isIncognito = true;
    showToast('Conversa privada ativada');
  }

  // ── Regenerate ──
  function regenerate() {
    if (isStreaming) return;
    const lastUserIdx = [...displayMessages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const realIdx = displayMessages.length - 1 - lastUserIdx;
    const userMsg = displayMessages[realIdx];
    displayMessages = displayMessages.slice(0, realIdx);
    chatHistory = chatHistory.slice(0, realIdx);
    sendMessage(userMsg.content, userMsg.attachments || [], true);
  }

  // ── Attachments ──
  function readFileAsDataUrl(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  async function addAttachment(file, kind) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      pendingAttachments = [...pendingAttachments, { kind, name:file.name, size:file.size, mime:file.type, dataUrl:kind==='image'?dataUrl:null, rawDataUrl:dataUrl }];
      showToast(kind==='image' ? `Imagem "${file.name}" anexada` : `Ficheiro "${file.name}" anexado`);
    } catch (e) { showToast('Não foi possível ler o ficheiro'); }
  }

  // ── Share / Copy ──
  function copyText(text) {
    navigator.clipboard.writeText(text).then(()=>showToast('Copiado!')).catch(()=>{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Copiado!');});
  }
  function shareText(text) {
    if (navigator.share) navigator.share({text}).catch(()=>{});
    else { copyText(text); showToast('Copiado para partilha!'); }
  }

  // ── Conv actions ──
  async function pinConv(conv) {
    const prev = conv.pinned; conv.pinned = !conv.pinned; conversations = [...conversations];
    try { await AuthApiService.pinConversation(user?.token||'', conv.id, conv.pinned); }
    catch (e) { conv.pinned = prev; conversations = [...conversations]; showToast('Não foi possível atualizar'); }
    showSheet = false;
  }
  async function deleteConv(conv) {
    const prev = conversations.slice();
    conversations = conversations.filter(c => c.id !== conv.id);
    if (currentConvId === conv.id) newChat();
    showSheet = false;
    try { await AuthApiService.deleteConversation(user?.token||'', conv.id); showToast('Conversa eliminada'); }
    catch (e) { conversations = prev; showToast('Não foi possível eliminar'); }
  }
  async function confirmRename() {
    const newTitle = renameValue.trim();
    if (!newTitle) { showToast('O título não pode estar vazio'); return; }
    const conv = sheetConv; const prev = conv.title;
    conv.title = newTitle; if (currentConvId === conv.id) currentConvTitle = newTitle;
    conversations = [...conversations]; showCenterDialog = false;
    try { await AuthApiService.updateConversation(user?.token||'', conv.id, newTitle, conv.messages||chatHistory); showToast('Conversa renomeada'); }
    catch (e) { conv.title = prev; if (currentConvId === conv.id) currentConvTitle = prev; conversations=[...conversations]; showToast('Não foi possível renomear'); }
  }

  // ── User msg edit ──
  function confirmEditMsg() {
    const newText = editMsgValue.trim();
    if (!newText) { showToast('A mensagem não pode estar vazia'); return; }
    showCenterDialog = false;
    if (isStreaming) return;
    const atts = displayMessages[sheetUserIdx]?.attachments || [];
    displayMessages = displayMessages.slice(0, sheetUserIdx);
    chatHistory = chatHistory.slice(0, sheetUserIdx);
    setTimeout(() => sendMessage(newText, atts, true), 150);
  }
  function deleteUserMsg(idx) {
    let end = idx + 1;
    if (displayMessages[end]?.role === 'assistant') end++;
    displayMessages = [...displayMessages.slice(0, idx), ...displayMessages.slice(end)];
    chatHistory = [...chatHistory.slice(0, idx), ...chatHistory.slice(end)];
    showSheet = false; showToast('Mensagem eliminada');
  }

  // ── Model picker ──
  function selectModel(id) { currentModelId = id; localStorage.setItem('nexa_model', id); showSheet = false; showToast(`Modelo: ${getCurrentModelName()}`); }

  // ── Recording ──
  async function startRecording() {
    if (isRecording) return;
    try {
      waveOverlayStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveOverlayCtx = new (window.AudioContext || window.webkitAudioContext)();
      waveOverlayAnalyser = waveOverlayCtx.createAnalyser();
      waveOverlayAnalyser.fftSize = 1024; waveOverlayAnalyser.smoothingTimeConstant = 0.25;
      waveOverlayAnalyser.minDecibels = -110; waveOverlayAnalyser.maxDecibels = -5;
      const gain = waveOverlayCtx.createGain(); gain.gain.value = 6;
      waveOverlaySource = waveOverlayCtx.createMediaStreamSource(waveOverlayStream);
      waveOverlaySource.connect(gain); gain.connect(waveOverlayAnalyser);
      audioChunks = [];
      mediaRecorder = new MediaRecorder(waveOverlayStream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleRecStop;
      mediaRecorder.start(); isRecording = true;
      recSeconds = 0; showRecOverlay = true;
      recInterval = setInterval(() => recSeconds++, 1000);
      startWaveAnim();
    } catch (err) { showToast('Sem acesso ao microfone'); }
  }
  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.stop(); waveOverlayStream?.getTracks().forEach(t=>t.stop());
    stopWaveAnim(); showRecOverlay = false;
  }
  function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false; clearInterval(recInterval);
    mediaRecorder.onstop = null; mediaRecorder.stop();
    waveOverlayStream?.getTracks().forEach(t=>t.stop());
    audioChunks = []; stopWaveAnim(); showRecOverlay = false;
  }
  async function handleRecStop() {
    if (!audioChunks.length) return;
    const blob = new Blob(audioChunks, { type:'audio/webm' }); audioChunks = [];
    showToast('A transcrever…');
    try {
      const token = user?.token || '';
      const form = new FormData(); form.append('file', blob, 'audio.webm'); form.append('language', currentLanguage||'pt');
      const res = await fetch(`https://ipc.alfredopjonas.workers.dev/ai/transcribe`, { method:'POST', headers:{'Authorization':'Bearer '+token}, body:form });
      if (!res.ok) throw new Error('Erro na transcrição');
      const data = await res.json(); const text = (data.text||'').trim();
      if (text) { inputText = (inputText ? inputText + ' ' : '') + text; setTimeout(autoResize, 10); }
      else showToast('Nenhum texto reconhecido');
    } catch (err) { showToast('Erro ao transcrever áudio'); }
  }

  // Wave animation
  let wavePhaseLocal=0, waveSmoothAmpLocal=6, waveSmoothBoostLocal=0, waveSmoothScaleLocal=1;
  function startWaveAnim() {
    let freq = null;
    if (waveOverlayAnalyser) freq = new Uint8Array(waveOverlayAnalyser.frequencyBinCount);
    function frame() {
      if (!showRecOverlay) return;
      waveOverlayAnimFrame = requestAnimationFrame(frame);
      const canvas = recCanvasEl; if (!canvas) return;
      const ctx = canvas.getContext('2d'); const w=canvas.clientWidth, h=canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      let targetAmp=6, targetBoost=0, totalEnergy=0, bass=0;
      if (waveOverlayAnalyser && freq) {
        waveOverlayAnalyser.getByteFrequencyData(freq);
        const len=freq.length, be=Math.floor(len*.12), me=Math.floor(len*.5);
        const br=Math.pow(freq.slice(0,be).reduce((a,b)=>a+b,0)/be/255,.4);
        const mr=Math.pow(freq.slice(be,me).reduce((a,b)=>a+b,0)/(me-be)/255,.4);
        const tr=Math.pow(freq.reduce((a,b)=>a+b,0)/len/255,.4);
        bass=br; totalEnergy=tr; targetAmp=5+br*80+mr*45+tr*30; targetBoost=br*75+mr*35+tr*20;
      } else { targetAmp=6+Math.sin(wavePhaseLocal*1.1)*1.5; targetBoost=1+Math.cos(wavePhaseLocal*.9)*.8; }
      const at=targetAmp>waveSmoothAmpLocal?.7:.06, db=targetBoost>waveSmoothBoostLocal?.7:.06;
      waveSmoothAmpLocal+=(targetAmp-waveSmoothAmpLocal)*at;
      waveSmoothBoostLocal+=(targetBoost-waveSmoothBoostLocal)*db;
      [[.55,.4,.30,.15,0],[.70,.6,.42,.30,1.1],[.85,.8,.54,.55,2.3],[.95,.9,.64,.80,3.7],[1,1,.72,1,5.2]].forEach(([am,bm,base,op,ph])=>{
        drawWaveLayer(ctx,w,h,waveSmoothAmpLocal*am,waveSmoothBoostLocal*bm,base,op,ph);
      });
      const loader=document.getElementById('recLoaderEl');
      if(loader){const ts=1+bass*.45+totalEnergy*.2; const a2=ts>waveSmoothScaleLocal?.7:.06; waveSmoothScaleLocal+=(ts-waveSmoothScaleLocal)*a2; loader.style.transform=`scale(${waveSmoothScaleLocal.toFixed(4)})`;}
      wavePhaseLocal+=.02;
    }
    frame();
  }
  function drawWaveLayer(ctx,w,h,amp,boost,baseYR,opacity,phOff) {
    const baseY=h*baseYR-boost*.5, pts=180, step=w/(pts-1), ys=[];
    for(let i=0;i<pts;i++){const t=i/(pts-1);ys.push(baseY+Math.sin(t*5.8+wavePhaseLocal+phOff)*amp+Math.sin(t*11.5+wavePhaseLocal*1.4+phOff)*(amp*.35)+Math.sin(t*3.2-wavePhaseLocal*.7+phOff)*(amp*.18)+Math.sin(t*22+wavePhaseLocal*2.5+phOff)*(boost*.18));}
    const topY=Math.min(...ys), grad=ctx.createLinearGradient(0,topY,0,h);
    grad.addColorStop(0,'rgba(66,165,245,0)'); grad.addColorStop(.45,`rgba(55,150,235,${.08*opacity})`); grad.addColorStop(.7,`rgba(40,130,220,${.22*opacity})`); grad.addColorStop(.88,`rgba(30,115,210,${.4*opacity})`); grad.addColorStop(1,`rgba(25,100,200,${.56*opacity})`);
    ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0,ys[0]);
    for(let i=1;i<pts;i++){const px=(i-1)*step,x=i*step,cx=(px+x)/2,cy=(ys[i-1]+ys[i])/2;ctx.quadraticCurveTo(px,ys[i-1],cx,cy);}
    ctx.lineTo(w,ys[pts-1]); ctx.lineTo(w,h); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  }
  function stopWaveAnim() {
    if(waveOverlayAnimFrame){cancelAnimationFrame(waveOverlayAnimFrame);waveOverlayAnimFrame=null;}
    if(waveOverlaySource){try{waveOverlaySource.disconnect();}catch(e){}waveOverlaySource=null;}
    if(waveOverlayCtx){try{waveOverlayCtx.close();}catch(e){}waveOverlayCtx=null;}
    waveOverlayAnalyser=null;
  }

  $: recTimerStr = (() => { const m=Math.floor(recSeconds/60),s=recSeconds%60; return `${m}:${s.toString().padStart(2,'0')}`; })();
</script>

<!-- ══════════════════════════════════════════════════════ TEMPLATE ══════ -->

<div class="chat-root" class:dark={isDark}>

  <!-- AppBar gradient -->
  <div class="appbar-gradient" class:dark={isDark}></div>

  <!-- AppBar -->
  <div class="appbar">
    <button class="pulse-tap circ w10" style="color:{c.iconTint}" on:click={handleDrawerOpen}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <button class="model-btn pulse-tap" on:click={() => { sheetMode='modelPicker'; showSheet=true; }}>
      <span class="model-name" style="color:{c.textSecondary}">{getCurrentModelName()}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textSecondary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="flex1"></div>
    {#if isIncognito}
      <div class="incognito-pill" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'};color:{c.textPrimary};margin-right:4px">
        <span class="icon-mask" style="mask-image:url('/icons/svg/incognito.svg');-webkit-mask-image:url('/icons/svg/incognito.svg');width:14px;height:14px;background:{c.textPrimary}"></span>
        <span>Privada</span>
      </div>
    {/if}
    {#if !hasMessages && !isIncognito}
      <button class="pulse-tap circ w10 px2" style="color:{c.iconTint}" on:click={startIncognito}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/incognito.svg');-webkit-mask-image:url('/icons/svg/incognito.svg');width:18px;height:18px;background:{c.iconTint}"></span>
      </button>
    {/if}
    {#if hasMessages}
      <button class="pulse-tap circ w10 px2" style="color:{c.iconTint}" on:click={newChat}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');width:17px;height:17px;background:{c.iconTint}"></span>
      </button>
      <button class="pulse-tap circ w10 px2" style="color:{c.iconTint}" on:click={() => {
        if (!currentConvId) { showToast('Esta conversa ainda não foi guardada'); return; }
        const conv = conversations.find(cv=>cv.id===currentConvId) || { id:currentConvId, title:currentConvTitle, messages:chatHistory, updatedAt:Date.now(), pinned:false };
        sheetConv = conv; sheetMode='convOptions'; showSheet=true;
      }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');width:16px;height:16px;background:{c.iconTint}"></span>
      </button>
    {/if}
  </div>

  <!-- Drawer -->
  <Drawer
    {isDark} {user} open={drawerOpen} {activeApp}
    {conversations} currentConvId={currentConvId}
    on:close={() => drawerOpen=false}
    on:switchApp={handleSwitchApp}
    on:openConv={handleOpenConv}
    on:convOptions={handleConvOptions}
    on:newChat={newChat}
    on:settings={() => { drawerOpen=false; showSettings=true; }}
    on:projects={() => showToast('Projetos em breve')}
    on:extras={() => { drawerOpen=false; sheetMode='extras'; showSheet=true; }}
  />

  <!-- Messages -->
  <div class="messages-wrap" bind:this={messagesEl}>
    {#if !hasMessages}
      <div class="empty-state">
        <img src="/icons/png/logo.png" class="empty-logo" alt="Nexa" />
        <h1 class="greeting" style="color:{c.textPrimary}">{greeting}</h1>
        <p class="greeting-sub" style="color:{c.textSecondary}">Em que estás a pensar?</p>
      </div>
    {:else}
      <div class="messages-list">
        {#each displayMessages as msg, idx}
          {#if msg.role === 'user'}
            <!-- User bubble -->
            <div class="user-row">
              <div
                class="user-bubble pulse-tap"
                style="background:{c.userBubbleBg};color:{c.textPrimary}"
                on:pointerdown={() => {
                  let did=false, t=setTimeout(()=>{did=true; sheetUserMsg=msg; sheetUserIdx=idx; sheetMode='userMsgOptions'; showSheet=true;},480);
                  const up=()=>clearTimeout(t); document.addEventListener('pointerup',up,{once:true}); document.addEventListener('pointercancel',up,{once:true});
                }}
              >
                {#if msg.attachments?.length}
                  <div class="att-wrap">
                    {#each msg.attachments as att}
                      {#if att.kind === 'image' && att.dataUrl}
                        <img src={att.dataUrl} class="att-img" alt="" />
                      {:else}
                        <div class="att-chip" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'}">
                          <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:14px;height:14px;background:{c.textPrimary}"></span>
                          <span style="font-size:12px;color:{c.textPrimary};max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{att.name||'Ficheiro'}</span>
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}
                {#if msg.content}
                  <p class="user-text">{msg.content}</p>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Assistant bubble -->
            <div class="assistant-row" style="color:{c.textPrimary}">
              {#if msg.isStreaming && msg.isThinking && !msg.content && !msg.thinkingContent}
                <div class="thinking-placeholder">
                  <div class="think-dot-wrap">
                    <div class="think-dot" style="background:{c.textSecondary};animation-delay:0s"></div>
                    <div class="think-dot" style="background:{c.textSecondary};animation-delay:.2s"></div>
                    <div class="think-dot" style="background:{c.textSecondary};animation-delay:.4s"></div>
                  </div>
                  <span style="font-size:14px;color:{c.textSecondary}">A processar…</span>
                </div>
              {:else}
                {#if msg.thinkingContent}
                  <div class="thinking-badge" style="border-bottom:1px dashed {c.divider};color:{c.textSecondary}">💭 {msg.thinkingContent}</div>
                {/if}
                <div
                  class="assistant-content"
                  class:cursor-blink={msg.isStreaming && msg.content}
                  style="font-size:15px;line-height:1.65;color:{isDark ? c.textPrimary : '#212730'}"
                >{@html renderMarkdown(msg.content)}</div>
                {#if !msg.isStreaming && msg.content}
                  <div class="action-row">
                    {#each [['copy','Copiar',()=>copyText(msg.content)],['thumbs_up','Gosto',()=>{}],['thumbs_down','Não gosto',()=>{}],['share','Partilhar',()=>shareText(msg.content)],['regenerate','Regenerar',regenerate]] as [icon,title,fn]}
                      <button class="action-btn pulse-tap" title={title} style="color:{c.iconTintSecondary}" on:click={fn}>
                        <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:17px;height:17px;background:{c.iconTintSecondary}"></span>
                      </button>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Bottom bar -->
  <div class="bottom-bar" class:light={!isDark} class:dark={isDark} id="bottomBar">
    {#if pendingAttachments.length}
      <div class="att-preview">
        {#each pendingAttachments as att, i}
          <div class="att-preview-item">
            {#if att.kind === 'image' && att.dataUrl}
              <img src={att.dataUrl} class="att-preview-img" alt="" />
            {:else}
              <div class="att-preview-file" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
                <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:20px;height:20px;background:{c.textPrimary}"></span>
              </div>
            {/if}
            <button class="att-remove pulse-tap" on:click={() => { pendingAttachments.splice(i,1); pendingAttachments=[...pendingAttachments]; }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}
    <textarea
      class="chat-input" class:dark={isDark}
      placeholder="Escreve aqui..."
      rows="1"
      bind:value={inputText}
      bind:this={textInputEl}
      on:input={autoResize}
      on:keydown={handleKeyDown}
    ></textarea>
    <div class="bb-row">
      <button class="add-btn pulse-tap" style="background:{c.addCircleBg};color:{c.iconTint}" on:click={() => { sheetMode='add'; showSheet=true; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:{c.iconTint}"></span>
      </button>
      <div class="flex1"></div>
      <button class="edit-btn pulse-tap" style="background:{c.tabPreviewPillBg};color:{c.textPrimary}" on:click={() => { sheetMode='edit'; showSheet=true; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:20px;height:20px;background:{c.textPrimary}"></span>
        <span class="edit-label">Edit</span>
      </button>
      <div style="width:8px"></div>
      {#if inputText.trim() || pendingAttachments.length}
        <button class="send-btn pulse-tap" style="background:{c.sendBtnColor}" on:click={() => { if(!isStreaming) sendMessage(inputText); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:{c.sendIconColor}"></span>
        </button>
      {:else}
        <button class="send-btn pulse-tap" style="background:{c.sendBtnColor}" on:click={startRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:{c.sendIconColor}"></span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Modal Sheet -->
  <ModalSheet {isDark} open={showSheet} on:close={() => showSheet=false}>
    {#if sheetMode === 'add'}
      <div class="sheet-title" style="color:{c.textPrimary}"></div>
      {#each [['image','Enviar Imagem','image'],['upload','Enviar Ficheiro','file'],['extras','Extras','extras']] as [icon,label,kind]}
        <label class="sheet-row pulse-tap" style="cursor:pointer">
          <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:22px;height:22px;background:{c.iconTint}"></span>
          <span style="margin-left:14px;font-size:15px;font-weight:500;color:{c.textPrimary}">{label}</span>
          {#if kind !== 'extras'}
            <input type="file" accept={kind==='image'?'image/*':'*/*'} style="display:none" on:change={async e=>{const f=e.target.files?.[0];if(f){showSheet=false;await addAttachment(f,kind);}}} />
          {:else}
            <input type="button" style="display:none" on:click={()=>{showSheet=false;setTimeout(()=>{sheetMode='extras';showSheet=true;},180);}} />
          {/if}
        </label>
        <div class="sheet-sep" style="background:{c.divider}"></div>
      {/each}
      <div style="height:16px"></div>

    {:else if sheetMode === 'extras'}
      <div class="sheet-title" style="color:{c.textPrimary}">Extras</div>
      {#each [[flashMode,'Flash','flash','flash_filled',()=>{flashMode=!flashMode;if(flashMode)thinkMoreMode=false;showSheet=false;}],[thinkMoreMode,'Think More','brain','brain_filled',()=>{thinkMoreMode=!thinkMoreMode;if(thinkMoreMode)flashMode=false;showSheet=false;}],[sheetsEnabled,'Sheets','sheets','sheets_filled',()=>{sheetsEnabled=!sheetsEnabled;showSheet=false;}]] as [active,title,iconOff,iconOn,action],i}
        {#if i > 0}<div class="sheet-sep" style="margin-left:60px;background:{c.divider}"></div>{/if}
        <div class="sheet-row pulse-tap" style="background:{active?(isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'):'transparent'}" on:click={action}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');-webkit-mask-image:url('/icons/svg/{active?iconOn:iconOff}.svg');width:17px;height:17px;background:{c.textPrimary}"></span>
          <span style="margin-left:14px;font-size:14px;font-weight:500;flex:1;color:{c.textPrimary}">{title}</span>
          {#if active}<div class="active-dot" style="background:{c.textPrimary}"></div>{/if}
        </div>
      {/each}
      <div style="height:16px"></div>

    {:else if sheetMode === 'modelPicker'}
      <div class="sheet-title" style="color:{c.textPrimary}">Modelo de IA</div>
      {#each AVAILABLE_MODELS as model, i}
        {#if i > 0}<div class="sheet-sep" style="background:{isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}"></div>{/if}
        <div class="sheet-row pulse-tap" on:click={() => selectModel(model.id)}>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;color:{model.id===currentModelId?c.primary:c.textPrimary}">{model.name}</div>
            <div style="font-size:12.5px;color:{c.textSecondary};margin-top:1px">{model.description}</div>
          </div>
          {#if model.id === currentModelId}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.primary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {/if}
        </div>
      {/each}
      <div style="height:12px"></div>

    {:else if sheetMode === 'convOptions' && sheetConv}
      <div class="conv-opts-header">
        <div class="conv-opts-avatar" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');width:16px;height:16px;background:{c.textPrimary}"></span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="conv-opts-title" style="color:{c.textPrimary}">{sheetConv.title}</div>
          <div style="font-size:12px;color:{c.textSecondary};margin-top:2px">{new Date(sheetConv.updatedAt).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      <div class="conv-opts-card" style="background:{isDark?'#1C1C1E':'#F2F2F7'}">
        {#each [['external','Abrir conversa',false,()=>{showSheet=false;setTimeout(()=>{currentConvId=sheetConv.id;currentConvTitle=sheetConv.title;titleGenerated=true;chatHistory=[...sheetConv.messages];displayMessages=sheetConv.messages.map(m=>({role:m.role,content:m.content}));},200);}],[sheetConv.pinned?'pin_filled':'pin',sheetConv.pinned?'Desafixar':'Fixar',false,()=>pinConv(sheetConv)],['customise','Renomear',false,()=>{renameValue=sheetConv.title;showSheet=false;showCenterDialog=true;centerDialogMode='rename';}],['share','Partilhar',false,()=>{showSheet=false;shareText(sheetConv.title);}],['trash','Eliminar',true,()=>deleteConv(sheetConv)]] as [icon,label,danger,action], i}
          {#if i > 0}<div style="height:1px;margin-left:60px;background:{c.divider}"></div>{/if}
          <div class="conv-opts-row pulse-tap" on:click={action}>
            <div class="conv-opts-icon" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:16px;height:16px;background:{danger?'#EF4444':c.textPrimary}"></span>
            </div>
            <span class="conv-opts-label" style="color:{danger?'#EF4444':c.textPrimary}">{label}</span>
          </div>
        {/each}
      </div>
      <div style="height:20px"></div>

    {:else if sheetMode === 'userMsgOptions' && sheetUserMsg}
      <div class="conv-opts-card" style="background:{isDark?'#1C1C1E':'#F2F2F7'};margin:4px 16px 20px">
        {#each [['copy','Copiar',false,()=>{showSheet=false;copyText(sheetUserMsg.content);}],['customise','Editar',false,()=>{editMsgValue=sheetUserMsg.content;showSheet=false;showCenterDialog=true;centerDialogMode='editMsg';}],['trash','Eliminar mensagem',true,()=>deleteUserMsg(sheetUserIdx)]] as [icon,label,danger,action], i}
          {#if i > 0}<div style="height:1px;margin-left:60px;background:{c.divider}"></div>{/if}
          <div class="conv-opts-row pulse-tap" on:click={action}>
            <div class="conv-opts-icon" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');width:16px;height:16px;background:{danger?'#EF4444':c.textPrimary}"></span>
            </div>
            <span class="conv-opts-label" style="color:{danger?'#EF4444':c.textPrimary}">{label}</span>
          </div>
        {/each}
      </div>

    {:else if sheetMode === 'edit'}
      <div class="sheet-title" style="color:{c.textPrimary}">Edit</div>
      <div style="height:60vh"></div>
    {/if}
  </ModalSheet>

  <!-- Center dialog (rename / edit msg) -->
  {#if showCenterDialog}
    <div class="cd-overlay" on:click={() => showCenterDialog=false}></div>
    <div class="cd-box" style="background:{isDark?'#1C1C1E':'#FFFFFF'}">
      <div class="cd-title" style="color:{c.textPrimary}">{centerDialogMode==='rename'?'Renomear conversa':'Editar mensagem'}</div>
      {#if centerDialogMode === 'rename'}
        <input class="cd-input" style="color:{c.textPrimary};background:{isDark?'#2C2C2E':'#F2F2F7'};border-color:{c.divider}" maxlength="80" bind:value={renameValue} on:keydown={e=>{if(e.key==='Enter')confirmRename();if(e.key==='Escape')showCenterDialog=false;}} />
      {:else}
        <textarea class="cd-input cd-textarea" style="color:{c.textPrimary};background:{isDark?'#2C2C2E':'#F2F2F7'};border-color:{c.divider}" rows="4" bind:value={editMsgValue}></textarea>
      {/if}
      <div class="cd-actions">
        <button class="cd-btn cd-cancel" style="color:{c.textPrimary}" on:click={() => showCenterDialog=false}>Cancelar</button>
        <button class="cd-btn cd-confirm" style="background:{c.primary};color:#fff" on:click={centerDialogMode==='rename'?confirmRename:confirmEditMsg}>
          {centerDialogMode==='rename'?'Guardar':'Guardar e reenviar'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Recording overlay -->
  {#if showRecOverlay}
    <div class="rec-overlay" class:dark={isDark}>
      <!-- Loader blob -->
      <div class="rec-loader-wrap">
        <div class="rec-loader" id="recLoaderEl">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <mask id="recClipping">
                <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
                <polygon points="25,25 75,25 50,75" fill="white"></polygon>
                <polygon points="50,25 75,75 25,75" fill="white"></polygon>
                <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              </mask>
            </defs>
          </svg>
          <div class="rec-loader-box"></div>
        </div>
      </div>
      <!-- Wave canvas -->
      <div class="rec-wave-wrap">
        <canvas bind:this={recCanvasEl} class="rec-wave-canvas"></canvas>
      </div>
      <!-- Top bar -->
      <div class="rec-top-bar">
        <button class="rec-top-btn pulse-tap" on:click={cancelRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:20px;height:20px;background:#fff"></span>
        </button>
        <span class="rec-timer">{recTimerStr}</span>
        <button class="rec-top-btn pulse-tap" on:click={stopRecording}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Settings overlay -->
  {#if showSettings}
    <SettingsPage {isDark} {user}
      on:close={() => showSettings=false}
      on:themeChange={(e) => { dispatch('nav', { to:'chat', data:{ isDark: e.detail.isDark } }); }}
      on:logout={() => { dispatch('nav', { to:'login', data:{ logout:true } }); }}
    />
  {/if}
</div>

<style>
  .chat-root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .chat-root.dark { background:#0F0F0F; }

  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }

  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; background:transparent; }
  .model-btn { display:flex; align-items:center; gap:4px; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:14px; margin-left:6px; }
  .model-name { font-size:14px; font-weight:600; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:.01em; }
  .incognito-pill { display:flex; align-items:center; gap:6px; padding:5px 12px 5px 10px; border-radius:16px; font-size:12px; font-weight:600; }
  .flex1 { flex:1; }
  .w10 { width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:none; border:none; }
  .px2 { padding:0 8px; }
  .circ { border-radius:50%; overflow:hidden; }

  .messages-wrap { flex:1; overflow-y:auto; overflow-x:hidden; padding-top:68px; padding-bottom:170px; -webkit-overflow-scrolling:touch; scroll-behavior:smooth; transition:padding-bottom .25s cubic-bezier(0.4,0,.2,1); }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:80px; min-height:100%; }
  .empty-logo { width:72px; height:72px; margin-bottom:16px; }
  .greeting { font-size:48px; font-weight:700; text-align:center; margin:0 0 8px; font-family:'TimesNewRoman',serif; }
  .greeting-sub { font-size:16px; text-align:center; margin:0; }
  .messages-list { padding:0; }

  /* User bubble */
  .user-row { padding:8px 16px; display:flex; justify-content:flex-end; }
  .user-bubble { max-width:82%; border-radius:20px; padding:12px 16px; cursor:pointer; }
  .att-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .att-img { width:84px; height:84px; object-fit:cover; border-radius:12px; }
  .att-chip { display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:10px; }
  .user-text { margin:0; font-size:14px; line-height:1.5; white-space:pre-wrap; -webkit-user-select:text; user-select:text; }

  /* Assistant bubble */
  .assistant-row { padding:12px 16px 4px; }
  .thinking-placeholder { display:flex; align-items:center; gap:10px; padding:4px 0 8px; }
  .think-dot-wrap { display:flex; gap:4px; }
  .think-dot { width:8px; height:8px; border-radius:50%; animation:dotPulse 1.2s ease-in-out infinite; }
  @keyframes dotPulse { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
  .thinking-badge { font-size:12px; font-style:italic; opacity:.6; margin-bottom:8px; padding-bottom:8px; -webkit-user-select:text; user-select:text; }
  .assistant-content { word-break:break-word; overflow-wrap:break-word; -webkit-user-select:text; user-select:text; }
  .assistant-content :global(.md-para) { margin:0 0 12px; line-height:1.7; font-size:15px; }
  .assistant-content :global(.md-para:last-child) { margin-bottom:0; }
  .assistant-content :global(.md-h1) { font-size:20px; font-weight:700; margin:16px 0 8px; line-height:1.3; }
  .assistant-content :global(.md-h2) { font-size:17px; font-weight:700; margin:14px 0 6px; line-height:1.3; }
  .assistant-content :global(.md-h3) { font-size:15px; font-weight:600; margin:12px 0 5px; line-height:1.3; }
  .assistant-content :global(.md-h1:first-child),.assistant-content :global(.md-h2:first-child),.assistant-content :global(.md-h3:first-child) { margin-top:0; }
  .assistant-content :global(.md-list) { margin:4px 0 12px; padding-left:22px; list-style:disc; }
  .assistant-content :global(.md-list li) { margin-bottom:6px; line-height:1.65; font-size:15px; }
  .assistant-content :global(.inline-code) { font-family:'Courier New',Courier,monospace; font-size:13px; padding:2px 6px; border-radius:5px; background:rgba(127,127,127,.15); }
  .assistant-content :global(.code-block-wrapper) { margin:8px 0 12px; border-radius:10px; overflow:hidden; border:1px solid rgba(127,127,127,.2); }
  .assistant-content :global(.code-block-header) { display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(127,127,127,.08); border-bottom:1px solid rgba(127,127,127,.12); }
  .assistant-content :global(.code-lang-label) { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; opacity:.6; }
  .assistant-content :global(.code-copy-btn) { background:none; border:none; cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:background .15s; }
  .assistant-content :global(.code-copy-btn:hover) { background:rgba(127,127,127,.12); }
  .assistant-content :global(.code-block) { margin:0; padding:12px 14px; overflow-x:auto; font-family:'Courier New',Courier,monospace; font-size:13px; line-height:1.6; background:rgba(127,127,127,.06); white-space:pre; }
  .assistant-content :global(a.md-link) { color:#2F7BF6; text-decoration:underline; text-decoration-color:rgba(79,70,229,.4); }
  .assistant-content :global(.md-blockquote) { border-left:3px solid #2F7BF6; margin:8px 0 12px; padding:6px 14px; opacity:.85; font-style:italic; }
  .assistant-content :global(.md-table-wrapper) { overflow-x:auto; margin:8px 0 12px; }
  .assistant-content :global(.md-table) { border-collapse:collapse; min-width:100%; font-size:14px; }
  .assistant-content :global(.md-table th) { padding:8px 12px; font-weight:600; border-bottom:2px solid rgba(127,127,127,.2); text-align:left; }
  .assistant-content :global(.md-table td) { padding:7px 12px; border-bottom:1px solid rgba(127,127,127,.1); }
  .assistant-content :global(.math-frac) { display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; margin:0 2px; }
  .assistant-content :global(.math-frac-num) { border-bottom:1px solid currentColor; padding:0 2px; }
  .assistant-content :global(.math-frac-den) { padding:0 2px; }
  .assistant-content :global(.math-root) { display:inline-flex; align-items:center; }
  .assistant-content :global(.math-radical) { font-size:1.2em; }
  .assistant-content :global(.math-radicand) { border-top:1px solid currentColor; padding:0 2px; }
  .assistant-content :global(.math-display) { display:block; text-align:center; margin:12px 0; font-size:1.1em; }
  .assistant-content :global(.math-inline) { display:inline; }
  .cursor-blink :global(*::after) { content:'|'; animation:blink 1s step-end infinite; color:#2F7BF6; font-weight:300; }
  @keyframes blink { 50%{opacity:0} }

  .action-row { display:flex; align-items:center; gap:2px; margin-top:8px; padding-top:2px; }
  .action-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:transparent; border:none; cursor:pointer; padding:0; opacity:.65; flex-shrink:0; }
  .action-btn:hover { opacity:1; }

  /* Bottom bar */
  .bottom-bar { position:absolute; bottom:0; left:16px; right:16px; z-index:50; margin-bottom:20px; border-radius:22px; display:flex; flex-direction:column; transition:background-color .3s ease,box-shadow .3s ease,bottom .18s ease; }
  .bottom-bar.light { background:#FFFFFF; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .bottom-bar.dark  { background:#1F1F1F; box-shadow:0 4px 24px rgba(0,0,0,.30); }
  .chat-input { resize:none; outline:none; border:none; background:transparent; font-size:15px; line-height:1.5; padding:12px 18px 0; width:100%; font-family:inherit; -webkit-user-select:text; user-select:text; max-height:150px; overflow-y:auto; }
  .chat-input:not(.dark) { color:#1F2937; }
  .chat-input.dark { color:#F3F4F6; }
  .chat-input:not(.dark)::placeholder { color:#9A9A9A; }
  .chat-input.dark::placeholder { color:#B6B6B6; }
  .att-preview { display:flex; gap:8px; padding:10px 14px 0; flex-wrap:wrap; }
  .att-preview-item { position:relative; flex-shrink:0; }
  .att-preview-img { width:56px; height:56px; object-fit:cover; border-radius:10px; }
  .att-preview-file { width:56px; height:56px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .att-remove { position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#000; color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; }
  .bb-row { display:flex; align-items:center; height:52px; padding:0 10px; }
  .add-btn { width:40px; height:40px; margin-left:4px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; }
  .edit-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:20px; border:none; cursor:pointer; }
  .edit-label { font-size:14px; font-weight:700; }
  .send-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; }

  /* Sheet content */
  .sheet-title { padding:4px 20px 12px; font-size:17px; font-weight:700; }
  .sheet-row { display:flex; align-items:center; padding:14px 20px; }
  .sheet-sep { height:1px; margin-left:56px; }
  .active-dot { width:8px; height:8px; border-radius:50%; }

  /* Conv options */
  .conv-opts-header { display:flex; align-items:center; gap:12px; padding:6px 20px 16px; }
  .conv-opts-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .conv-opts-title { font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .conv-opts-card { margin:0 16px; border-radius:16px; overflow:hidden; }
  .conv-opts-row { display:flex; align-items:center; gap:13px; padding:13px 16px; cursor:pointer; }
  .conv-opts-icon { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .conv-opts-label { font-size:14.5px; font-weight:500; }

  /* Center dialog */
  .cd-overlay { position:fixed; inset:0; z-index:209; background:rgba(0,0,0,.08); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
  .cd-box { position:fixed; top:50%; left:50%; width:min(92vw,380px); transform:translate(-50%,-50%); z-index:210; border-radius:18px; padding:20px 20px 16px; box-shadow:0 12px 40px rgba(0,0,0,.28); }
  .cd-title { font-size:16px; font-weight:700; margin-bottom:14px; text-align:center; }
  .cd-input { width:100%; border:1px solid; border-radius:10px; padding:11px 13px; font-size:14.5px; outline:none; font-family:inherit; -webkit-user-select:text; user-select:text; }
  .cd-textarea { resize:vertical; }
  .cd-actions { display:flex; gap:10px; margin-top:18px; }
  .cd-btn { flex:1; border:none; border-radius:10px; padding:11px 0; font-size:14.5px; font-weight:600; cursor:pointer; font-family:inherit; }
  .cd-cancel { background:rgba(127,127,127,.14); }

  /* Recording overlay */
  .rec-overlay { position:fixed; inset:0; z-index:300; background:#ffffff; display:flex; flex-direction:column; overflow:hidden; }
  .rec-overlay.dark { background:#0F0F0F; }
  .rec-top-bar { position:absolute; top:0; left:0; right:0; height:72px; display:flex; align-items:center; justify-content:space-between; padding:0 24px; z-index:10; }
  .rec-top-btn { width:46px; height:46px; border-radius:50%; border:none; background:rgba(0,0,0,.18); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
  .rec-overlay.dark .rec-top-btn { background:rgba(255,255,255,.12); }
  .rec-timer { font-size:15px; font-weight:600; font-variant-numeric:tabular-nums; color:#1F2937; letter-spacing:.04em; }
  .rec-overlay.dark .rec-timer { color:#F3F4F6; }
  .rec-loader-wrap { position:absolute; left:0; right:0; bottom:28vh; display:flex; justify-content:center; pointer-events:none; z-index:1; }
  .rec-loader {
    --color-one:#42a5f5; --color-two:#1565c0; --color-three:#42a5f580; --color-four:#1565c080; --color-five:#42a5f540;
    --time-animation:2s; position:relative; border-radius:50%;
    box-shadow:0 0 25px 0 var(--color-three),0 20px 50px 0 var(--color-four);
    animation:recColorize calc(var(--time-animation)*3) ease-in-out infinite;
    transition:transform .05s ease-out;
  }
  .rec-loader::before { content:""; position:absolute; top:0; left:0; width:100px; height:100px; border-radius:50%; border-top:solid 1px var(--color-one); border-bottom:solid 1px var(--color-two); background:linear-gradient(180deg,var(--color-five),var(--color-four)); box-shadow:inset 0 10px 10px 0 var(--color-three),inset 0 -10px 10px 0 var(--color-four); }
  .rec-loader-box { width:100px; height:100px; background:linear-gradient(180deg,var(--color-one) 30%,var(--color-two) 70%); mask:url(#recClipping); -webkit-mask:url(#recClipping); }
  @keyframes recColorize { 0%{filter:hue-rotate(0deg)} 20%{filter:hue-rotate(-10deg)} 40%{filter:hue-rotate(-20deg)} 60%{filter:hue-rotate(-30deg)} 80%{filter:hue-rotate(-15deg)} 100%{filter:hue-rotate(0deg)} }
  .rec-wave-wrap { position:absolute; left:0; right:0; bottom:0; height:48vh; min-height:240px; pointer-events:none; z-index:0; }
  .rec-wave-canvas { display:block; width:100%; height:100%; }

  /* Responsive */
  @media (min-width:768px) {
    .bottom-bar { left:50%; right:auto; width:600px; transform:translateX(-50%); }
  }

  /* pulse-tap / icon-mask locais */
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>