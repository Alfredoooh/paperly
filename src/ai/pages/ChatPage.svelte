<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { GeminiApiService, AuthApiService, CreditsApiService } from '$shared/api.js';
  import { showToast } from '$shared/utils.js';
  import { AVAILABLE_MODELS, AVAILABLE_LANGUAGES, ALL_APPS } from '$shared/plans.js';
  import Drawer       from '../components/Drawer.svelte';
  import ModalSheet   from '../components/ModalSheet.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: effectiveUser = user || (() => {
    try { return JSON.parse(localStorage.getItem('nexa_user') || 'null'); } catch(e) { return null; }
  })();

  $: c = getThemeColors(isDark);

  let currentModelId   = localStorage.getItem('nexa_model') || 'gemini-2.5-flash';
  let currentLanguage  = localStorage.getItem('nexa_language') || 'pt';
  let drawerOpen       = false;
  let activeApp        = localStorage.getItem('nexa_active_app') || 'ai';
  let conversations    = [];
  let loadingConversations = false;

  const drawerMenuItems = [
    { icon: 'chat_add', label: 'Nova conversa', action: () => newChat() },
    { icon: 'folder', label: 'Projetos', action: () => showToast('Projetos em breve'), keepOpen: true },
    { icon: 'apps', label: 'Extras', action: () => { sheetMode = 'extras'; showSheet = true; } },
  ];

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

  let inputText        = '';
  let textInputEl;
  let messagesEl;
  let chatRootEl;
  let showSheet        = false;
  let sheetMode        = '';
  let sheetConv        = null;
  let sheetUserMsg     = null;
  let sheetUserIdx     = -1;
  let renameValue      = '';
  let editMsgValue     = '';
  let showCenterDialog = false;
  let centerDialogMode = '';

  let mediaRecorder = null, audioChunks = [], isRecording = false;
  let waveOverlayCtx = null, waveOverlayAnalyser = null, waveOverlaySource = null;
  let waveOverlayStream = null, waveOverlayAnimFrame = null;
  let showRecOverlay = false;
  let recSeconds = 0;
  let recInterval = null;
  let recCanvasEl;
  let wavePhaseLocal = 0, waveSmoothAmpLocal = 6, waveSmoothBoostLocal = 0, waveSmoothScaleLocal = 1;

  // Apps popup
  let showAppsPopup = false;
  let appsPopupPos  = { top: 0, right: 0 };

  // ══════════════════════════════════════════════════════════════════
  //  APP CONECTADA — liga a IA a docs/sheets/whiteboard só para esta
  //  sessão de chat. Enquanto conectada, cada resposta da IA pode
  //  trazer um bloco widget_*_write que é gravado diretamente no
  //  localStorage do app-alvo (mesmo prefixo/schema que cada app já
  //  usa para se salvar a si próprio) — sem navegar, sem sair do chat.
  //  connectedApp = null (desligado) | { id, label, icon }
  //  connectedDocId = id do documento/pasta/board ativo NESTA ligação —
  //  a 1ª escrita cria-o, escritas seguintes fazem replace nele por
  //  defeito (writeMode='replace'); o pill deixa forçar 'new'.
  // ══════════════════════════════════════════════════════════════════
  const CONNECTABLE_APPS = ALL_APPS.filter(a => ['docs', 'sheets', 'whiteboard'].includes(a.id));
  let connectedApp   = null;
  let connectedDocId = null;
  let writeMode      = 'replace'; // 'replace' | 'new'

  function connectApp(app) {
    connectedApp = app;
    connectedDocId = null;
    writeMode = 'replace';
    showAppsPopup = false;
    showToast(`Conectado a ${app.label}`);
  }
  function disconnectApp() {
    connectedApp = null;
    connectedDocId = null;
    writeMode = 'replace';
  }
  function toggleWriteMode() {
    writeMode = writeMode === 'replace' ? 'new' : 'replace';
    if (writeMode === 'new') connectedDocId = null;
  }

  $: hasMessages = displayMessages.length > 0;
  $: greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();
  $: currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'Gemini 2.5 Flash';
  $: recTimerStr = (() => { const m=Math.floor(recSeconds/60),s=recSeconds%60; return `${m}:${s.toString().padStart(2,'0')}`; })();

  const DRAWER_APPS = ALL_APPS.filter(a => a.id !== 'home');

  onMount(() => {
  chatRootEl = document.querySelector('.chat-root');
  setupVH();
  setupKeyboard();
  setupWidgetSettings();
  setupBottomBarTouchLock();
  window.addEventListener('resize', setupVH);
  window.addEventListener('orientationchange', () => setTimeout(setupVH, 120));
  
  // Mensagem vinda da HomePage
  try {
    const pending = sessionStorage.getItem('nexa_pending_message');
    if (pending) {
      sessionStorage.removeItem('nexa_pending_message');
      setTimeout(() => sendMessage(pending), 300);
    }
  } catch (e) {}
});

  function setupVH() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
  }

  function setupKeyboard() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    function getRoot() {
      if (!chatRootEl) chatRootEl = document.querySelector('.chat-root');
      return chatRootEl;
    }
    function applyViewport() {
      const root = getRoot();
      if (root) {
        root.style.top = '0px';
        root.style.left = '0px';
        root.style.right = '0px';
        root.style.bottom = 'auto';
        root.style.height = vv.height + 'px';
      }
      scrollToBottom();
    }
    vv.addEventListener('resize', applyViewport);
    vv.addEventListener('scroll', applyViewport);
    applyViewport();
  }

  function setupBottomBarTouchLock() {
    const bb = document.getElementById('bottomBar');
    if (!bb) return;
    bb.addEventListener('touchmove', (e) => {
      if (e.target !== textInputEl) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
  }

  function handleInputFocus() {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
    setTimeout(() => { window.scrollTo(0, 0); scrollToBottom(); }, 50);
    setTimeout(() => { window.scrollTo(0, 0); scrollToBottom(); }, 300);
  }

  let widgetSettings = {};
  function setupWidgetSettings() {
    try { widgetSettings = JSON.parse(localStorage.getItem('ipc_widget_settings_v1') || '{}'); } catch (e) {}
  }
  function isWidgetEnabled(type) { return widgetSettings[type] !== false; }

  const ALL_WIDGETS = new Set(['widget_table','widget_code','widget_bar','widget_pie','widget_sheet','widget_market','widget_calendar','widget_timer','widget_mindmap','widget_graph','widget_map','widget_doc_write','widget_sheet_write','widget_whiteboard_write']);

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
    let text = rawText.replace(/```([\w_]*?)[\r\n]+([\s\S]*?)```/g, (_, lang, code) => { const idx = codeBlocks.length; codeBlocks.push({lang: lang.trim(), code: code.replace(/\n$/, '')}); return `\u0000CB${idx}\u0000`; });
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
      if(ALL_WIDGETS.has(blk.lang)&&isWidgetEnabled(blk.lang)) {
        const wid = 'w_' + Math.random().toString(36).slice(2,9);
        setTimeout(() => {
          const el = document.getElementById(wid);
          if (el) buildNativeWidgetDOM(blk.lang, blk.code, el);
        }, 0);
        return `<div id="${wid}" class="widget-host"></div>`;
      }
      const safe=escapeHtml(blk.code);
      const hdr=blk.lang?`<div class="code-block-header"><span class="code-lang-label">${escapeHtml(blk.lang)}</span><button class="code-copy-btn pulse-tap" onclick="window._copyCodeBtn(this)"><span class="icon-mask" style="mask-image:url('/icons/svg/regular/copy.svg');-webkit-mask-image:url('/icons/svg/regular/copy.svg');width:13px;height:13px;background:currentColor;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span></button></div>`:'';
      return `<div class="code-block-wrapper">${hdr}<pre class="code-block"><code>${safe}</code></pre></div>`;
    });
    text = text.replace(/\u0000MB(\d+)\u0000/g,(_,idx)=>{const blk=mathBlocks[Number(idx)];const rendered=renderMathToken(blk.content);return blk.display?`<div class="math-display">${rendered}</div>`:`<span class="math-inline">${rendered}</span>`;});
    return text;
  }

  function _wIsDark() { return isDark; }
  function _ensureStyle(id, cssText) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id; s.textContent = cssText;
    document.head.appendChild(s);
  }
  function _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _copyText(text) {
    return navigator.clipboard?.writeText?.(text).catch(async () => {
      try {
        const ta = document.createElement('textarea'); ta.value = text;
        ta.setAttribute('readonly',''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,ta.value.length);
        const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
      } catch { return false; }
    });
  }
  function _showToast(el, text) {
    el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.pointerEvents = 'none';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(-4px)'; }, 1000);
  }

  function renderNativeTable(container, json) {
    const dark = _wIsDark();
    const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
    const bgColor = dark ? '#1b1b1b' : '#ffffff';
    const headerBg = dark ? '#232323' : '#f4f4f4';
    const textColor = dark ? '#f4f4f4' : '#222';
    const shadowColor = dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)';
    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(100%,560px);border-radius:6px;background:${bgColor};overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;margin:6px auto;box-shadow:0 0 0 1px ${borderColor},0 6px 16px ${shadowColor};`;
    const table = document.createElement('table');
    table.style.cssText = `width:100%;min-width:520px;border-collapse:separate;border-spacing:0;table-layout:auto;background:${bgColor};`;
    const headers = json.headers || [];
    if (headers.length) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      headers.forEach((h, i) => {
        const th = document.createElement('th');
        let style = `border-bottom:1px solid ${dark?'rgba(255,255,255,0.14)':'rgba(0,0,0,0.16)'};border-right:1px solid ${borderColor};padding:10px 12px;text-align:left;font-size:16px;line-height:1.2;color:${textColor};background:${headerBg};font-weight:700;font-family:Georgia,"Times New Roman",serif;white-space:nowrap;`;
        if (i === headers.length-1) style += 'border-right:none;';
        th.style.cssText = style; th.textContent = h; tr.appendChild(th);
      });
      thead.appendChild(tr); table.appendChild(thead);
    }
    const tbody = document.createElement('tbody');
    (json.rows||[]).forEach((row, ri) => {
      const tr = document.createElement('tr');
      row.forEach((cell, i) => {
        const td = document.createElement('td');
        let style = `border-bottom:1px solid ${borderColor};border-right:1px solid ${borderColor};padding:10px 12px;text-align:${i>0?'center':'left'};font-size:16px;line-height:1.2;color:${textColor};background:${bgColor};font-family:Georgia,"Times New Roman",serif;white-space:nowrap;`;
        if (i === row.length-1) style += 'border-right:none;';
        if (ri === (json.rows||[]).length-1) style += 'border-bottom:none;';
        td.style.cssText = style; td.textContent = cell; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); wrap.appendChild(table); container.appendChild(wrap);
  }

  function renderNativeBarChart(container, json) {
    const dark = _wIsDark();
    const defaultColors = ['#6F5AF6','#e74c3c','#27ae60','#f39c12','#3b82f6','#10b981','#ec4899','#8b5cf6','#f59e0b','#2f80ed'];
    const data = (json.data||json.bars||[]).map((d,i) => ({
      label: d.label||'?', value: typeof d.value==='number'?d.value:parseFloat(d.value)||0,
      color: d.color||defaultColors[i%defaultColors.length], unit: d.unit||''
    }));
    const valueColor = dark?'#eee':'#333', labelColor = dark?'#aaa':'#666', legendColor = dark?'#ccc':'#444';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(100%,500px);display:flex;flex-direction:column;align-items:center;gap:14px;margin:6px auto;';
    const chartEl = document.createElement('div');
    chartEl.style.cssText = 'width:100%;display:flex;align-items:flex-end;gap:10px;height:220px;padding:20px 14px;border-radius:14px;background:transparent;';
    const max = data.length ? Math.max(...data.map(d=>d.value)) : 1;
    data.forEach((item,i) => {
      const pct = max>0?(item.value/max)*100:0;
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;';
      itemEl.innerHTML = `<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:${valueColor};">${item.value}${item.unit}</div><div style="width:100%;height:150px;display:flex;align-items:flex-end;justify-content:center;"><div style="width:100%;max-width:48px;height:${pct}%;background:${item.color};border-radius:8px 8px 0 0;transform-origin:bottom;animation:barGrow 700ms ease-out ${i*70}ms both;box-shadow:0 4px 14px rgba(111,90,246,0.25);"></div></div><div style="margin-top:10px;font-size:11px;font-weight:500;color:${labelColor};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${item.label}</div>`;
      chartEl.appendChild(itemEl);
    });
    const legendEl = document.createElement('div');
    legendEl.style.cssText = `display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:13px;font-weight:500;color:${legendColor};`;
    data.forEach(item => {
      const legItem = document.createElement('span');
      legItem.style.cssText = 'display:flex;align-items:center;gap:6px;';
      legItem.innerHTML = `<span style="width:12px;height:12px;border-radius:4px;background:${item.color};display:inline-block;"></span>${item.label} (${item.value})`;
      legendEl.appendChild(legItem);
    });
    _ensureStyle('barGrowStyle','@keyframes barGrow { from { transform:scaleY(0); } to { transform:scaleY(1); } }');
    wrap.appendChild(chartEl); wrap.appendChild(legendEl); container.appendChild(wrap);
  }

  function renderNativePieChart(container, json) {
    const defaultColors = ['#2f80ed','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#c0392b','#2980b9'];
    const dark = _wIsDark();
    const legendColor = dark?'#eee':'#333';
    const rawData = json.data||json.slices||[];
    const data = rawData.map((d,i) => ({
      label: d.label||'?', value: typeof d.value==='number'?d.value:parseFloat(d.value)||0,
      color: d.color||defaultColors[i%defaultColors.length]
    }));
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(100%,480px);display:flex;flex-direction:column;align-items:center;gap:16px;margin:6px auto;';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 400 400');
    svg.style.cssText = 'width:100%;height:auto;background:transparent;';
    const g = document.createElementNS(ns,'g');
    g.setAttribute('transform','translate(200,200)');
    svg.appendChild(g);
    const total = data.reduce((s,d)=>s+d.value,0)||1;
    function describeArc(r,sa,ea) {
      const x1=r*Math.cos(sa),y1=r*Math.sin(sa),x2=r*Math.cos(ea),y2=r*Math.sin(ea);
      const large=ea-sa>Math.PI?1:0;
      return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }
    function animateSlice(path,sa,ea,dur) {
      const t0=performance.now();
      function frame(now) {
        const p=Math.min((now-t0)/dur,1),e=1-Math.pow(1-p,3),cur=sa+(ea-sa)*e;
        path.setAttribute('d',describeArc(140,sa,Math.max(sa+0.01,cur)));
        if(p<1) requestAnimationFrame(frame); else path.setAttribute('d',describeArc(140,sa,ea));
      }
      requestAnimationFrame(frame);
    }
    let sa=-Math.PI/2;
    const legendEl = document.createElement('div');
    legendEl.style.cssText = `display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:14px;font-weight:500;color:${legendColor};`;
    data.forEach(item => {
      const sliceAngle=(item.value/total)*2*Math.PI,ea=sa+sliceAngle;
      const path=document.createElementNS(ns,'path');
      path.setAttribute('fill',item.color); path.setAttribute('stroke','transparent');
      path.style.cssText='transition:transform 0.3s ease,opacity 0.3s ease;cursor:pointer;transform-origin:50% 50%;';
      path.onmouseenter=()=>{path.style.opacity='0.85';path.style.transform='scale(1.04)';};
      path.onmouseleave=()=>{path.style.opacity='1';path.style.transform='scale(1)';};
      g.appendChild(path);
      animateSlice(path,sa,ea,600+Math.random()*400);
      const mid=(sa+ea)/2,tr=85;
      const txt=document.createElementNS(ns,'text');
      txt.setAttribute('x',tr*Math.cos(mid)); txt.setAttribute('y',tr*Math.sin(mid));
      txt.setAttribute('text-anchor','middle'); txt.setAttribute('dominant-baseline','middle');
      txt.style.cssText='font-size:12px;font-weight:bold;fill:#fff;pointer-events:none;';
      txt.textContent=((item.value/total)*100).toFixed(1)+'%';
      g.appendChild(txt);
      const legItem=document.createElement('span');
      legItem.style.cssText='display:flex;align-items:center;gap:6px;';
      legItem.innerHTML=`<span style="width:12px;height:12px;border-radius:4px;background:${item.color};display:inline-block;"></span>${item.label} (${item.value})`;
      legendEl.appendChild(legItem);
      sa=ea;
    });
    wrap.appendChild(svg); wrap.appendChild(legendEl); container.appendChild(wrap);
  }

  function renderNativeSheet(container, json) {
    const dark = _wIsDark();
    const surface=dark?'#1a1a1a':'#fffef8', border=dark?'#333':'#d6d6d6', textClr=dark?'#e8e8e8':'#222';
    const lines=json.lines||[];
    const wrap=document.createElement('div');
    wrap.style.cssText=`position:relative;width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${border};background:${surface};box-shadow:0 8px 22px rgba(0,0,0,0.10);overflow:hidden;margin:6px auto;cursor:pointer;transition:width 0.4s cubic-bezier(0.2,0.9,0.3,1),height 0.4s cubic-bezier(0.2,0.9,0.3,1),border-radius 0.4s ease,box-shadow 0.4s ease;`;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.style.cssText='display:block;width:100%;height:100%;touch-action:none;';
    const backBtn=document.createElement('button');
    backBtn.style.cssText=`position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,0.45);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s ease;`;
    backBtn.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    wrap.appendChild(svg); wrap.appendChild(backBtn); container.appendChild(wrap);
    const cfg={leftPad:72,rightPad:20,topPad:34,gap:32,textLift:10,minFont:10,maxFont:18,titleMaxFont:20};
    const mc=document.createElement('canvas'); const ctx=mc.getContext('2d');
    let isExpanded=false,scrollY=0,maxScroll=0,contentGroup=null;
    function fitFont(text,maxW,minF,maxF,bold) {
      let lo=minF,hi=maxF,best=lo;
      while(lo<=hi){const mid=Math.floor((lo+hi)/2);ctx.font=(bold?'700 ':'')+mid+'px Arial';if(ctx.measureText(text).width<=maxW){best=mid;lo=mid+1;}else hi=mid-1;}
      return best;
    }
    function clampScroll(){if(scrollY<0)scrollY=0;if(scrollY>maxScroll)scrollY=maxScroll;}
    function applyScrollTransform(){if(contentGroup)contentGroup.setAttribute('transform',`translate(0,${-scrollY})`);}
    function render(){
      const w=wrap.clientWidth||640,h=wrap.clientHeight||320,maxTW=w-cfg.leftPad-cfg.rightPad;
      svg.innerHTML='';
      const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
      bg.setAttribute('width',w);bg.setAttribute('height',h);bg.setAttribute('fill',surface);svg.appendChild(bg);
      const n=lines.length,contentHeight=Math.max(h,cfg.topPad+n*cfg.gap+cfg.gap);
      maxScroll=Math.max(0,contentHeight-h);clampScroll();
      contentGroup=document.createElementNS('http://www.w3.org/2000/svg','g');svg.appendChild(contentGroup);
      for(let i=0;i<=Math.ceil(contentHeight/cfg.gap)+1;i++){
        const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
        const y=i*cfg.gap;
        ln.setAttribute('x1',0);ln.setAttribute('y1',y);ln.setAttribute('x2',w);ln.setAttribute('y2',y);
        ln.setAttribute('stroke','rgba(95,145,255,0.16)');ln.setAttribute('stroke-width','1');
        ln.setAttribute('shape-rendering','crispEdges');contentGroup.appendChild(ln);
      }
      const marginX=cfg.leftPad-16;
      const mg=document.createElementNS('http://www.w3.org/2000/svg','line');
      mg.setAttribute('x1',marginX);mg.setAttribute('y1',0);mg.setAttribute('x2',marginX);mg.setAttribute('y2',contentHeight);
      mg.setAttribute('stroke','rgba(255,90,90,0.20)');mg.setAttribute('stroke-width','1');
      mg.setAttribute('shape-rendering','crispEdges');contentGroup.appendChild(mg);
      lines.forEach((item,i)=>{
        const y=cfg.topPad+i*cfg.gap-cfg.textLift,isT=!!item.title;
        const sz=fitFont(item.text,maxTW,isT?12:cfg.minFont,isT?cfg.titleMaxFont:cfg.maxFont,isT);
        const t=document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('x',cfg.leftPad);t.setAttribute('y',y);t.setAttribute('font-size',sz);
        t.setAttribute('font-family','Arial');t.setAttribute('font-weight',isT?'700':'400');
        t.setAttribute('fill',textClr);t.textContent=item.text;contentGroup.appendChild(t);
      });
      applyScrollTransform();
    }
    function onPointerDown(e){
      const startY=e.clientY,startScroll=scrollY;
      function onMove(ev){scrollY=startScroll-(ev.clientY-startY);clampScroll();applyScrollTransform();}
      function onUp(){window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);}
      window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);
    }
    wrap.addEventListener('click',(e)=>{ if(!isExpanded){ isExpanded=true; wrap.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;background:${surface};z-index:1000;overflow:hidden;cursor:default;box-shadow:none;border-radius:0;`; backBtn.style.opacity='1'; backBtn.style.pointerEvents='auto'; render(); } });
    backBtn.addEventListener('click',(e)=>{ e.stopPropagation(); isExpanded=false; wrap.style.cssText=`position:relative;width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${border};background:${surface};box-shadow:0 8px 22px rgba(0,0,0,0.10);overflow:hidden;margin:6px auto;cursor:pointer;transition:width 0.4s cubic-bezier(0.2,0.9,0.3,1),height 0.4s cubic-bezier(0.2,0.9,0.3,1),border-radius 0.4s ease,box-shadow 0.4s ease;`; backBtn.style.opacity='0'; backBtn.style.pointerEvents='none'; render(); });
    svg.addEventListener('pointerdown',onPointerDown);
    render();
    window.addEventListener('resize',render);
  }

  function renderNativeMarket(container, json) {
    const symbol=(json.symbol||'BTC').toUpperCase();
    const type=json.type||'crypto';
    const name=json.name||symbol;
    const wrap=document.createElement('div');
    const uid='mk_'+Math.random().toString(36).slice(2,9);
    const wrap2=wrap;
    wrap.style.cssText='width:min(100%,420px);border-radius:16px;padding:16px;margin:6px auto;background:rgba(127,127,127,0.06);';
    wrap.className='market-card-'+uid;
    wrap.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;"><div><div style="font-size:15px;font-weight:700;">${escapeHtml(name)}</div><div style="font-size:12px;opacity:.6;">${escapeHtml(symbol)} · ${type==='crypto'?'Cripto':'Ação'}</div></div><div style="font-size:20px;">📈</div></div><div style="margin-top:10px;font-size:13px;opacity:.7;">A obter cotação em tempo real…</div>`;
    container.appendChild(wrap);
  }

  function renderNativeCalendar(container, json) {
    const events=json.events||[];
    const wrap=document.createElement('div');
    wrap.style.cssText='width:min(100%,480px);border-radius:16px;padding:14px;margin:6px auto;background:rgba(127,127,127,0.06);display:flex;flex-direction:column;gap:8px;';
    events.forEach(ev=>{
      const row=document.createElement('div');
      row.style.cssText=`display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(127,127,127,0.06);border-left:3px solid ${ev.color||'#6F5AF6'};`;
      row.innerHTML=`<div style="flex:1;"><div style="font-size:13px;font-weight:600;">${escapeHtml(ev.name||'Evento')}</div><div style="font-size:11px;opacity:.6;">${escapeHtml(ev.date||'')}${ev.time?' · '+escapeHtml(ev.time):''}</div></div>`;
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderNativeTimer(container, json) {
    const seconds=json.seconds||60, label=json.label||'Temporizador';
    const wrap=document.createElement('div');
    wrap.style.cssText='width:min(100%,300px);border-radius:20px;padding:20px;margin:6px auto;background:rgba(127,127,127,0.06);display:flex;flex-direction:column;align-items:center;gap:8px;';
    const m=Math.floor(seconds/60), s=seconds%60;
    wrap.innerHTML=`<div style="font-size:13px;font-weight:600;opacity:.7;">${escapeHtml(label)}</div><div style="font-size:36px;font-weight:800;font-variant-numeric:tabular-nums;">${m}:${s.toString().padStart(2,'0')}</div>`;
    container.appendChild(wrap);
  }

  function renderNativeMindMap(container, json) {
    const wrap=document.createElement('div');
    wrap.style.cssText='width:min(100%,560px);border-radius:16px;padding:16px;margin:6px auto;background:rgba(127,127,127,0.06);overflow-x:auto;';
    function renderNode(node, depth) {
      const el=document.createElement('div');
      el.style.cssText=`margin-left:${depth*20}px;padding:6px 0;`;
      el.innerHTML=`<span style="display:inline-block;padding:4px 10px;border-radius:8px;background:${node.color||'#6F5AF6'};color:#fff;font-size:12px;font-weight:600;">${escapeHtml(node.label||'')}</span>`;
      wrap.appendChild(el);
      (node.children||[]).forEach(c=>renderNode(c, depth+1));
    }
    if (json.tree) renderNode(json.tree, 0);
    container.appendChild(wrap);
  }

  function renderNativeMathGraph(container, json) {
    const expr=json.expression||'x', xMin=json.xMin??-10, xMax=json.xMax??10;
    const wrap=document.createElement('div');
    const uid='gr_'+Math.random().toString(36).slice(2,9);
    wrap.style.cssText='width:min(100%,500px);border-radius:16px;padding:14px;margin:6px auto;background:rgba(127,127,127,0.06);';
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 400 240'); svg.style.cssText='width:100%;height:auto;';
    const axisColor=_wIsDark()?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.3)';
    const xAxis=document.createElementNS(svgNS,'line');
    xAxis.setAttribute('x1',0);xAxis.setAttribute('y1',120);xAxis.setAttribute('x2',400);xAxis.setAttribute('y2',120);
    xAxis.setAttribute('stroke',axisColor);xAxis.setAttribute('stroke-width','1');svg.appendChild(xAxis);
    const yAxis=document.createElementNS(svgNS,'line');
    yAxis.setAttribute('x1',200);yAxis.setAttribute('y1',0);yAxis.setAttribute('x2',200);yAxis.setAttribute('y2',240);
    yAxis.setAttribute('stroke',axisColor);yAxis.setAttribute('stroke-width','1');svg.appendChild(yAxis);
    const path=document.createElementNS(svgNS,'path');
    let d='', maxY=1;
    const pts=[];
    for (let px=0; px<=400; px+=2) {
      const xVal = xMin + (px/400)*(xMax-xMin);
      let yVal;
      try {
        const s = String(expr).replace(/\^/g,'**').replace(/sin/gi,'Math.sin').replace(/cos/gi,'Math.cos').replace(/tan/gi,'Math.tan').replace(/sqrt/gi,'Math.sqrt').replace(/abs/gi,'Math.abs').replace(/pi/gi,'Math.PI');
        yVal = new Function('x', `return ${s};`)(xVal);
      } catch(e) { yVal = 0; }
      if (isFinite(yVal)) { maxY = Math.max(maxY, Math.abs(yVal)); pts.push([px, yVal]); } else pts.push([px, null]);
    }
    pts.forEach(([px,yVal],i)=>{ if(yVal===null) return; const py=120-(yVal/maxY)*100; d += (i===0||pts[i-1][1]===null?'M':'L')+px+' '+py+' '; });
    path.setAttribute('d',d.trim()); path.setAttribute('fill','none'); path.setAttribute('stroke','#6F5AF6'); path.setAttribute('stroke-width','2.5');
    svg.appendChild(path); wrap.appendChild(svg); container.appendChild(wrap);
  }

  function renderNativeCodeBlock(container, json) {
    const lang=json.language||'text', code=json.code||'';
    const safe=escapeHtml(code);
    const wrap=document.createElement('div');
    wrap.className='code-block-wrapper';
    wrap.innerHTML=`<div class="code-block-header"><span class="code-lang-label">${escapeHtml(lang)}</span><button class="code-copy-btn pulse-tap" onclick="window._copyCodeBtn(this)"><span class="icon-mask" style="mask-image:url('/icons/svg/regular/copy.svg');-webkit-mask-image:url('/icons/svg/regular/copy.svg');width:13px;height:13px;background:currentColor;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span></button></div><pre class="code-block"><code>${safe}</code></pre>`;
    container.appendChild(wrap);
  }

  function renderNativeMapPlaceholder(container, json) {
    const cardBg=_wIsDark()?'#1b1b1b':'#fff';
    const wrap=document.createElement('div');
    const uid='map_'+Math.random().toString(36).slice(2,9);
    wrap.id=uid;
    let isExpanded=false, mapInstance=null;
    wrap.style.cssText=`position:relative;width:min(90vw,420px);height:min(90vw,420px);background:${cardBg};border-radius:30px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.4s cubic-bezier(0.2,0.9,0.4,1);`;
    const overlay=document.createElement('div');
    overlay.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15);pointer-events:none;';
    overlay.innerHTML='<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:22px;">🗺️</div>';
    wrap.appendChild(overlay); container.appendChild(wrap);
    const backBtn=document.createElement('button');
    backBtn.style.cssText='position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,0.45);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.25s ease;';
    backBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    wrap.appendChild(backBtn);
    const lng=json.lng??json.longitude??json.lon??0,lat=json.lat??json.latitude??0,zoom=json.zoom??12;
    function initMap(){
      if(mapInstance||!window.maplibregl)return;
      mapInstance=new maplibregl.Map({container:uid,style:'https://tiles.openfreemap.org/styles/liberty',center:[lng,lat],zoom,pitch:50,bearing:0,attributionControl:false,antialias:true});
      mapInstance.on('load',()=>{mapInstance.flyTo({center:[lng,lat],zoom:zoom+0.5,pitch:55,speed:0.6});if(json.marker!==false)new maplibregl.Marker({color:'var(--accent-primary)'}).setLngLat([lng,lat]).addTo(mapInstance);});
      if(!window._mapInstances)window._mapInstances={};window._mapInstances[uid]=mapInstance;
      _ensureStyle('mapLibreHideAttrib','.maplibregl-ctrl-logo,.maplibregl-ctrl-attrib,.maplibregl-ctrl-group{display:none!important;}');
    }
    function setExpanded(value){
      isExpanded=value;
      if(isExpanded){wrap.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;background:${cardBg};border-radius:0;z-index:1000;overflow:hidden;cursor:default;`;backBtn.style.opacity='1';backBtn.style.pointerEvents='auto';overlay.style.display='none';if(mapInstance)mapInstance.resize();}
      else{wrap.style.cssText=`position:relative;width:min(90vw,420px);height:min(90vw,420px);background:${cardBg};border-radius:30px;box-shadow:0 20px 40px rgba(0,0,0,0.1);overflow:hidden;margin:6px auto;cursor:pointer;transition:all 0.4s cubic-bezier(0.2,0.9,0.4,1);`;backBtn.style.opacity='0';backBtn.style.pointerEvents='none';overlay.style.display='block';if(mapInstance)mapInstance.resize();}
      setTimeout(()=>{if(mapInstance)mapInstance.resize();},50);
    }
    wrap.addEventListener('click',()=>{if(!isExpanded)setExpanded(true);});
    backBtn.addEventListener('click',e=>{e.stopPropagation();setExpanded(false);});
    if(window.maplibregl){initMap();}
    else{
      const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.css';document.head.appendChild(link);
      const script=document.createElement('script');script.src='https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.js';script.onload=()=>initMap();document.head.appendChild(script);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  WIDGETS DE ESCRITA — gravam diretamente no localStorage do app
  //  alvo, usando o MESMO prefixo/schema que docs/sheets/whiteboard já
  //  usam para se persistirem a si próprios. Só correm quando há uma
  //  connectedApp ativa e o bloco widget_*_write bate com esse app
  //  (protege contra a IA escrever nalgum app que o utilizador não
  //  ligou). Cada um devolve um cartão de confirmação simples.
  // ══════════════════════════════════════════════════════════════════

  function renderWriteResultCard(container, opts) {
    const dark = _wIsDark();
    const bg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)';
    const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const textClr = dark ? '#f4f4f4' : '#1a1a1a';
    const subClr = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
    const wrap = document.createElement('div');
    wrap.style.cssText = `width:min(100%,420px);display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;margin:6px auto;background:${bg};border:1px solid ${border};`;
    wrap.innerHTML = `
      <div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'};overflow:hidden;">
        <img src="${escapeAttr(opts.icon)}" style="width:22px;height:22px;object-fit:cover;border-radius:6px;" alt="" />
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:${textClr};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(opts.title)}</div>
        <div style="font-size:11.5px;color:${subClr};margin-top:1px;">${escapeHtml(opts.subtitle)}</div>
      </div>
      <div style="width:26px;height:26px;border-radius:50%;background:#34C759;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>`;
    container.appendChild(wrap);
  }

  function readIndex(prefix) {
    try { const raw = localStorage.getItem(prefix + 'index'); return raw ? JSON.parse(raw) : []; } catch(e) { return []; }
  }
  function writeIndex(prefix, index) {
    localStorage.setItem(prefix + 'index', JSON.stringify(index));
  }
  function touchIndex(prefix, id, name) {
    const index = readIndex(prefix);
    const existing = index.find(d => d.id === id);
    const updatedAt = Date.now();
    if (existing) { existing.name = name; existing.updatedAt = updatedAt; }
    else index.push({ id, name, updatedAt });
    writeIndex(prefix, index);
  }

  function renderWriteDoc(container, json) {
    if (!connectedApp || connectedApp.id !== 'docs') { container.textContent = 'Liga a app Documentos para usar este widget.'; return; }
    const PREFIX = 'docs_';
    const name = json.name || json.title || 'Documento sem título';
    const contentHtml = json.content || json.html || '';
    const wasUpdate = writeMode === 'replace' && !!connectedDocId;
    let id = wasUpdate ? connectedDocId : ('doc_' + Date.now().toString(36));
    const payload = { name, content: contentHtml, updatedAt: Date.now() };
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(payload));
      touchIndex(PREFIX, id, name);
      connectedDocId = id;
    } catch(e) { container.textContent = 'Erro ao gravar o documento.'; return; }
    renderWriteResultCard(container, {
      icon: connectedApp.icon,
      title: name,
      subtitle: wasUpdate ? 'Documento atualizado' : 'Documento criado',
    });
  }

  function renderWriteSheet(container, json) {
    if (!connectedApp || connectedApp.id !== 'sheets') { container.textContent = 'Liga a app Folha de Cálculo para usar este widget.'; return; }
    const PREFIX = 'sheets_';
    const name = json.name || json.title || 'Nova pasta de cálculo';
    const rows = json.rows || [];
    const cells = {};
    rows.forEach((row, r) => {
      (row || []).forEach((val, c) => {
        if (val === undefined || val === null || val === '') return;
        const colLetter = (n => { let s=''; n++; while(n>0){ n--; s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26);} return s; })(c);
        const addr = colLetter + (r+1);
        const raw = String(val);
        cells[addr] = { raw, bold: r === 0 && json.headerRow !== false };
      });
    });
    const wasUpdate = writeMode === 'replace' && !!connectedDocId;
    let id = wasUpdate ? connectedDocId : ('sheet_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6));
    let existingSheetId = null;
    if (wasUpdate) {
      try { const raw = localStorage.getItem(PREFIX + id); const parsed = raw ? JSON.parse(raw) : null; existingSheetId = parsed?.sheets?.[0]?.id || null; } catch(e) {}
    }
    const sheetId = existingSheetId || ('tab_' + Date.now().toString(36));
    const sheet = { id: sheetId, name: 'Folha1', rows: Math.max(60, rows.length + 10), cols: 1000, cells, colWidths: {}, charts: [], images: [] };
    const payload = { name, activeSheetId: sheetId, sheets: [sheet], updatedAt: Date.now() };
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(payload));
      touchIndex(PREFIX, id, name);
      connectedDocId = id;
    } catch(e) { container.textContent = 'Erro ao gravar a folha de cálculo.'; return; }
    renderWriteResultCard(container, {
      icon: connectedApp.icon,
      title: name,
      subtitle: (wasUpdate ? 'Folha de cálculo atualizada' : 'Folha de cálculo criada') + ` · ${rows.length} linha(s)`,
    });
  }

  function renderWriteWhiteboard(container, json) {
    if (!connectedApp || connectedApp.id !== 'whiteboard') { container.textContent = 'Liga a app Quadro Branco para usar este widget.'; return; }
    const PREFIX = 'whiteboard_';
    const name = json.name || json.title || 'Design sem título';
    const boardW = json.w || 512, boardH = json.h || 512;
    const background = json.background || { type: 'color', color: '#FFFFFF', image: null, opacity: 1 };
    const elements = (json.elements || []).map((el, i) => ({ id: i + 1, ...el }));
    const wasUpdate = writeMode === 'replace' && !!connectedDocId;
    let id = wasUpdate ? connectedDocId : ('wb_' + Date.now().toString(36));
    const payload = { name, w: boardW, h: boardH, background, elements, updatedAt: Date.now() };
    try {
      localStorage.setItem(PREFIX + id, JSON.stringify(payload));
      touchIndex(PREFIX, id, name);
      connectedDocId = id;
    } catch(e) { container.textContent = 'Erro ao gravar o design.'; return; }
    renderWriteResultCard(container, {
      icon: connectedApp.icon,
      title: name,
      subtitle: (wasUpdate ? 'Design atualizado' : 'Design criado') + ` · ${elements.length} elemento(s)`,
    });
  }

  function buildNativeWidgetDOM(widgetType, rawJson, container) {
    try {
      const json = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      switch(widgetType) {
        case 'widget_table':    renderNativeTable(container, json); break;
        case 'widget_bar':      renderNativeBarChart(container, json); break;
        case 'widget_pie':      renderNativePieChart(container, json); break;
        case 'widget_sheet':    renderNativeSheet(container, json); break;
        case 'widget_code':     renderNativeCodeBlock(container, json); break;
        case 'widget_market':   renderNativeMarket(container, json); break;
        case 'widget_calendar': renderNativeCalendar(container, json); break;
        case 'widget_timer':    renderNativeTimer(container, json); break;
        case 'widget_mindmap':  renderNativeMindMap(container, json); break;
        case 'widget_graph':    renderNativeMathGraph(container, json); break;
        case 'widget_map':      renderNativeMapPlaceholder(container, json); break;
        case 'widget_doc_write':        renderWriteDoc(container, json); break;
        case 'widget_sheet_write':      renderWriteSheet(container, json); break;
        case 'widget_whiteboard_write': renderWriteWhiteboard(container, json); break;
        default: container.textContent = 'Widget desconhecido';
      }
    } catch(e) { container.textContent = 'Erro ao carregar widget'; console.error('Widget error:', e); }
  }

  if (typeof window !== 'undefined') {
    window._copyCodeBtn = (btn) => {
      const code = btn.closest('.code-block-wrapper')?.querySelector('code');
      if (code) navigator.clipboard.writeText(code.textContent).then(()=>{}).catch(()=>{});
    };
  }

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
    const systemPrompt = GeminiApiService.buildSystemPrompt(currentLanguage, sheetsEnabled, connectedApp ? connectedApp.id : null);
    const token = effectiveUser?.token || '';
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
      if (effectiveUser) {
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

  function handleDrawerOpen() {
    drawerOpen = true;
    if (effectiveUser && activeApp === 'ai') {
      loadingConversations = true;
      AuthApiService.listConversations(effectiveUser.token).then(list => {
        conversations = list.map(cv => ({ id:cv.id, title:cv.title, messages:cv.messages||[], updatedAt:cv.updatedAt||Date.now(), pinned:cv.pinned||false }));
        loadingConversations = false;
      }).catch(() => { loadingConversations = false; });
    }
  }

  function openApp(id) {
    activeApp = id; localStorage.setItem('nexa_active_app', id);
    showAppsPopup = false;
    if (id !== 'ai') { dispatch('nav', { to: id, data: { user: effectiveUser } }); }
  }

  function openAppsPopup(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    appsPopupPos = {
      bottom: window.innerHeight - rect.top + 8,
      right:  window.innerWidth - rect.right + 10,
    };
    showAppsPopup = !showAppsPopup;
  }

  function handleOpenConv(e) {
    if (isStreaming) return;
    const conv = e.detail.conv;
    isIncognito = false;
    currentConvId = conv.id; currentConvTitle = conv.title; titleGenerated = true;
    chatHistory = [...conv.messages];
    displayMessages = conv.messages.map(m => ({ role:m.role, content:m.content }));
  }

  function handleConvOptions(e) { sheetConv = e.detail.conv; sheetMode = 'convOptions'; showSheet = true; }

  function newChat() {
    displayMessages = []; chatHistory = []; currentConvId = ''; currentConvTitle = 'Nova conversa'; titleGenerated = false; pendingAttachments = []; isIncognito = false;
    disconnectApp();
  }

  function toggleIncognito() {
    if (isIncognito) {
      isIncognito = false;
      displayMessages = []; chatHistory = []; currentConvId = ''; currentConvTitle = 'Nova conversa'; titleGenerated = false; pendingAttachments = [];
    } else {
      displayMessages = []; chatHistory = []; currentConvId = ''; currentConvTitle = 'Conversa privada';
      titleGenerated = true; pendingAttachments = []; isIncognito = true;
    }
  }

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

  function readFileAsDataUrl(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  async function addAttachment(file, kind) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      pendingAttachments = [...pendingAttachments, { kind, name:file.name, size:file.size, mime:file.type, dataUrl:kind==='image'?dataUrl:null, rawDataUrl:dataUrl }];
    } catch (e) {}
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(()=>{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);});
  }
  function shareText(text) {
    if (navigator.share) navigator.share({text}).catch(()=>{});
    else { copyText(text); }
  }

  async function pinConv(conv) {
    const prev = conv.pinned; conv.pinned = !conv.pinned; conversations = [...conversations];
    try { await AuthApiService.pinConversation(effectiveUser?.token||'', conv.id, conv.pinned); }
    catch (e) { conv.pinned = prev; conversations = [...conversations]; }
    showSheet = false;
  }
  async function deleteConv(conv) {
    const prev = conversations.slice();
    conversations = conversations.filter(c => c.id !== conv.id);
    if (currentConvId === conv.id) newChat();
    showSheet = false;
    try { await AuthApiService.deleteConversation(effectiveUser?.token||'', conv.id); }
    catch (e) { conversations = prev; }
  }
  async function confirmRename() {
    const newTitle = renameValue.trim();
    if (!newTitle) { showCenterDialog = false; return; }
    const conv = sheetConv; const prev = conv.title;
    conv.title = newTitle; if (currentConvId === conv.id) currentConvTitle = newTitle;
    conversations = [...conversations]; showCenterDialog = false;
    try { await AuthApiService.updateConversation(effectiveUser?.token||'', conv.id, newTitle, conv.messages||chatHistory); }
    catch (e) { conv.title = prev; if (currentConvId === conv.id) currentConvTitle = prev; conversations=[...conversations]; }
  }
  function confirmEditMsg() {
    const newText = editMsgValue.trim();
    if (!newText) { showCenterDialog = false; return; }
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
    showSheet = false;
  }

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
    } catch (err) {}
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
    try {
      const token = effectiveUser?.token || '';
      const form = new FormData(); form.append('file', blob, 'audio.webm'); form.append('language', currentLanguage||'pt');
      const res = await fetch(`https://ipc.alfredoooh.workers.dev/ai/transcribe`, { method:'POST', headers:{'Authorization':'Bearer '+token}, body:form });
      if (!res.ok) throw new Error('Erro na transcrição');
      const data = await res.json(); const text = (data.text||'').trim();
      if (text) { inputText = (inputText ? inputText + ' ' : '') + text; setTimeout(autoResize, 10); }
    } catch (err) {}
  }

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
        const br=Math.pow([...freq].slice(0,be).reduce((a,b)=>a+b,0)/be/255,.4);
        const mr=Math.pow([...freq].slice(be,me).reduce((a,b)=>a+b,0)/(me-be)/255,.4);
        const tr=Math.pow([...freq].reduce((a,b)=>a+b,0)/len/255,.4);
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
</script>

<div class="chat-root" class:dark={isDark} style="background:{c.background};color:{c.textPrimary}">

  <div class="appbar-gradient" class:dark={isDark}></div>

  <div class="appbar">
    <button class="pulse-tap w10" style="color:{c.iconTint}" on:click={handleDrawerOpen}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/line_horizontal_3.svg');-webkit-mask-image:url('/icons/svg/regular/line_horizontal_3.svg');width:24px;height:24px;background:{c.iconTint}"></span>
    </button>
    <div class="flex1"></div>
    {#if isIncognito}
      <button class="incognito-pill pulse-tap" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'};color:{c.textPrimary};margin-right:4px" on:click={toggleIncognito}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/incognito.svg');-webkit-mask-image:url('/icons/svg/regular/incognito.svg');width:14px;height:14px;background:{c.textPrimary}"></span>
        <span>Privada</span>
      </button>
    {/if}
    {#if !hasMessages && !isIncognito}
      <button class="pulse-tap w10 px2" style="color:{c.iconTint}" on:click={toggleIncognito}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/incognito.svg');-webkit-mask-image:url('/icons/svg/regular/incognito.svg');width:24px;height:24px;background:{c.iconTint}"></span>
      </button>
    {/if}
    {#if hasMessages}
      <button class="pulse-tap w10 px2" style="color:{c.iconTint}" on:click={newChat}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/chat_add.svg');-webkit-mask-image:url('/icons/svg/regular/chat_add.svg');width:17px;height:17px;background:{c.iconTint}"></span>
      </button>
      <button class="pulse-tap w10 px2" style="color:{c.iconTint}" on:click={() => {
        if (!currentConvId) return;
        const conv = conversations.find(cv=>cv.id===currentConvId) || { id:currentConvId, title:currentConvTitle, messages:chatHistory, updatedAt:Date.now(), pinned:false };
        sheetConv = conv; sheetMode='convOptions'; showSheet=true;
      }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/more_vertical.svg');-webkit-mask-image:url('/icons/svg/regular/more_vertical.svg');width:16px;height:16px;background:{c.iconTint}"></span>
      </button>
    {/if}
  </div>

  <Drawer
    {isDark} user={effectiveUser} open={drawerOpen}
    title="AI" subtitle="Conversas e ferramentas"
    menuItems={drawerMenuItems}
    {conversations} currentConvId={currentConvId}
    {loadingConversations}
    on:close={() => drawerOpen=false}
    on:openConv={handleOpenConv}
    on:convOptions={handleConvOptions}
    on:openSettings={() => dispatch('nav', { to: 'settings' })}
  />

  <div class="messages-wrap" bind:this={messagesEl}>
    {#if !hasMessages}
      <div class="empty-state">
        <img src="/icons/png/logo_1.png" class="empty-logo" alt="Nexa" />
        <h1 class="greeting" style="color:{c.textPrimary};font-family:'TimesNewRoman',serif">{greeting}</h1>
        <p class="greeting-sub" style="color:{c.textSecondary}">Em que estás a pensar?</p>
      </div>
    {:else}
      <div class="messages-list">
        {#each displayMessages as msg, idx}
          {#if msg.role === 'user'}
            <div class="user-row">
              <div
                class="user-bubble pulse-tap"
                style="background:{c.userBubbleBg};color:{c.textPrimary}"
                on:pointerdown={() => {
                  let did=false;
                  const t=setTimeout(()=>{did=true; sheetUserMsg=msg; sheetUserIdx=idx; sheetMode='userMsgOptions'; showSheet=true;},480);
                  const up=()=>clearTimeout(t);
                  document.addEventListener('pointerup',up,{once:true});
                  document.addEventListener('pointercancel',up,{once:true});
                }}
              >
                {#if msg.attachments?.length}
                  <div class="att-wrap">
                    {#each msg.attachments as att}
                      {#if att.kind === 'image' && att.dataUrl}
                        <img src={att.dataUrl} class="att-img" alt="" />
                      {:else}
                        <div class="att-chip" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'}">
                          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_download.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_download.svg');width:14px;height:14px;background:{c.textPrimary}"></span>
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
                >
                  {@html renderMarkdown(msg.content)}
                </div>
                {#if !msg.isStreaming && msg.content}
                  <div class="action-row">
                    {#each [['copy','Copiar',()=>copyText(msg.content)],['thumbs_up','Gosto',()=>{}],['thumbs_down','Não gosto',()=>{}],['share','Partilhar',()=>shareText(msg.content)],['regenerate','Regenerar',regenerate]] as [icon,title,fn]}
                      <button class="action-btn pulse-tap" title={title} style="color:{c.iconTintSecondary}" on:click={fn}>
                        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/{icon}.svg');-webkit-mask-image:url('/icons/svg/regular/{icon}.svg');width:17px;height:17px;background:{c.iconTintSecondary}"></span>
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

  {#if connectedApp}
    <div class="connected-pill" class:dark={isDark} style="background:{c.dialogBackground};border-color:{c.divider}">
      <div class="connected-icon-wrap" style="background:{isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}">
        <img src={connectedApp.icon} class="connected-icon-img" alt={connectedApp.label} />
        <span class="connected-dot"></span>
      </div>
      <div class="connected-text">
        <span class="connected-label" style="color:{c.textPrimary}">Conectado a {connectedApp.label}</span>
        <button class="connected-mode-btn pulse-tap" on:click={toggleWriteMode}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/{writeMode==='replace' ? 'checkmark' : 'chat_add'}.svg');-webkit-mask-image:url('/icons/svg/regular/{writeMode==='replace' ? 'checkmark' : 'chat_add'}.svg');width:11px;height:11px;background:{c.textSecondary}"></span>
          <span style="color:{c.textSecondary}">{writeMode === 'replace' ? (connectedDocId ? 'A substituir' : 'Criar e substituir') : 'Sempre novo'}</span>
        </button>
      </div>
      <button class="connected-close pulse-tap" style="background:{isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}" on:click={disconnectApp} aria-label="Desconectar">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.textSecondary} stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  {/if}

  <div class="bottom-bar" class:light={!isDark} class:dark={isDark} id="bottomBar">
    {#if pendingAttachments.length}
      <div class="att-preview">
        {#each pendingAttachments as att, i}
          <div class="att-preview-item">
            {#if att.kind === 'image' && att.dataUrl}
              <img src={att.dataUrl} class="att-preview-img" alt="" />
            {:else}
              <div class="att-preview-file" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
                <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow_download.svg');-webkit-mask-image:url('/icons/svg/regular/arrow_download.svg');width:24px;height:24px;background:{c.textPrimary}"></span>
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
      on:focus={handleInputFocus}
    ></textarea>
    <div class="bb-row">
      <button class="add-btn pulse-tap" style="background:{c.addCircleBg};color:{c.iconTint}" on:click={() => { sheetMode='add'; showSheet=true; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/add.svg');-webkit-mask-image:url('/icons/svg/regular/add.svg');width:24px;height:24px;background:{c.iconTint}"></span>
      </button>
      <div class="flex1"></div>
      <button class="edit-btn pulse-tap" style="background:{connectedApp ? (isDark?'rgba(52,199,89,0.16)':'rgba(52,199,89,0.12)') : c.tabPreviewPillBg};color:{connectedApp ? '#34C759' : c.textPrimary}" on:click={openAppsPopup}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/filled/eye.svg');-webkit-mask-image:url('/icons/svg/filled/eye.svg');width:24px;height:24px;background:{connectedApp ? '#34C759' : c.textPrimary}"></span>
        <span class="edit-label">{connectedApp ? connectedApp.label : 'Apps'}</span>
      </button>
      <div style="width:8px"></div>
      {#if inputText.trim() || pendingAttachments.length}
        <button class="send-btn pulse-tap" style="background:{c.sendBtnColor}" on:click={() => { if(!isStreaming) sendMessage(inputText); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/send.svg');-webkit-mask-image:url('/icons/svg/regular/send.svg');width:15px;height:15px;background:{c.sendIconColor}"></span>
        </button>
      {:else}
        <button class="send-btn pulse-tap" style="background:{c.sendBtnColor}" on:click={startRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/record.svg');-webkit-mask-image:url('/icons/svg/regular/record.svg');width:24px;height:24px;background:{c.sendIconColor}"></span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Apps popup — grupo "Conectar à IA" (docs/sheets/whiteboard) primeiro, depois "Ir para" (navegação normal) -->
  {#if showAppsPopup}
    <div class="apps-popup-overlay" on:click={() => showAppsPopup=false}></div>
    <div
      class="apps-popup-box"
      class:dark={isDark}
      style="bottom:{appsPopupPos.bottom}px;right:{appsPopupPos.right}px;"
    >
      <div class="apps-popup-section-label" class:dark={isDark}>Conectar à IA</div>
      {#each CONNECTABLE_APPS as app, i}
        <button
          type="button"
          class="apps-popup-row pulse-tap"
          class:dark={isDark}
          style="animation-delay:{i*35}ms"
          on:click={() => connectedApp?.id === app.id ? disconnectApp() : connectApp(app)}
        >
          <img src={app.icon} alt={app.label} class="apps-popup-icon" />
          <span class="apps-popup-label" class:dark={isDark}>{app.label}</span>
          {#if connectedApp?.id === app.id}
            <span class="icon-mask" style="mask-image:url('/icons/svg/regular/checkmark.svg');-webkit-mask-image:url('/icons/svg/regular/checkmark.svg');width:16px;height:16px;background:#34C759;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0;"></span>
          {/if}
        </button>
      {/each}
      <div class="apps-popup-sep" class:dark={isDark}></div>
      <div class="apps-popup-section-label" class:dark={isDark}>Ir para</div>
      {#each DRAWER_APPS.filter(a => a.id !== 'ai') as app, i}
        <button type="button" class="apps-popup-row pulse-tap" class:dark={isDark} style="animation-delay:{i*35}ms" on:click={() => openApp(app.id)}>
          <img src={app.icon} alt={app.label} class="apps-popup-icon" />
          <span class="apps-popup-label" class:dark={isDark}>{app.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <ModalSheet {isDark} open={showSheet} on:close={() => showSheet=false}>
    {#if sheetMode === 'add'}
      {#each [['image','Enviar Imagem','image'],['upload','Enviar Ficheiro','file']] as [icon,label,kind], i}
        {#if i > 0}<div class="sheet-sep" style="background:{c.divider}"></div>{/if}
        <label class="sheet-row pulse-tap" style="cursor:pointer">
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/{icon}.svg');-webkit-mask-image:url('/icons/svg/regular/{icon}.svg');width:17px;height:17px;background:{c.iconTint}"></span>
          <span style="margin-left:14px;font-size:15px;font-weight:500;color:{c.textPrimary}">{label}</span>
          <input type="file" accept={kind==='image'?'image/*':'*/*'} style="display:none" on:change={async e=>{const f=e.target.files?.[0];if(f){showSheet=false;await addAttachment(f,kind);}}} />
        </label>
      {/each}
      <div class="sheet-sep" style="background:{c.divider}"></div>
      <div class="sheet-row pulse-tap" on:click={() => { showSheet=false; setTimeout(()=>{ sheetMode='extras'; showSheet=true; },180); }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/apps.svg');-webkit-mask-image:url('/icons/svg/regular/apps.svg');width:17px;height:17px;background:{c.iconTint}"></span>
        <span style="margin-left:14px;font-size:15px;font-weight:500;color:{c.textPrimary}">Extras</span>
      </div>
      <div style="height:16px"></div>

    {:else if sheetMode === 'extras'}
      <div class="sheet-title" style="color:{c.textPrimary}">Extras</div>
      {#each [[flashMode,'Flash','flash',()=>{flashMode=!flashMode;if(flashMode)thinkMoreMode=false;showSheet=false;}],[thinkMoreMode,'Think More','brain',()=>{thinkMoreMode=!thinkMoreMode;if(thinkMoreMode)flashMode=false;showSheet=false;}],[sheetsEnabled,'Sheets','sheets',()=>{sheetsEnabled=!sheetsEnabled;showSheet=false;}]] as [active,title,iconName,action],i}
        {#if i > 0}<div class="sheet-sep" style="margin-left:60px;background:{c.divider}"></div>{/if}
        <div class="sheet-row pulse-tap" style="background:{active?(isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'):'transparent'}" on:click={action}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/{active ? 'filled' : 'regular'}/{iconName}.svg');-webkit-mask-image:url('/icons/svg/{active ? 'filled' : 'regular'}/{iconName}.svg');width:17px;height:17px;background:{c.textPrimary}"></span>
          <span style="margin-left:14px;font-size:14px;font-weight:500;flex:1;color:{c.textPrimary}">{title}</span>
          {#if active}<div style="width:8px;height:8px;border-radius:50%;background:{c.textPrimary}"></div>{/if}
        </div>
      {/each}
      <div style="height:16px"></div>

    {:else if sheetMode === 'convOptions' && sheetConv}
      <div class="conv-opts-header">
        <div class="conv-opts-avatar" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/chat_add.svg');-webkit-mask-image:url('/icons/svg/regular/chat_add.svg');width:16px;height:16px;background:{c.textPrimary}"></span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="conv-opts-title" style="color:{c.textPrimary}">{sheetConv.title}</div>
          <div style="font-size:12px;color:{c.textSecondary};margin-top:2px">{new Date(sheetConv.updatedAt).toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      <div class="conv-opts-card" style="background:{isDark?'#1C1C1E':'#F2F2F7'}">
        {#each [
          ['external','Abrir conversa',false,()=>{showSheet=false;setTimeout(()=>{isIncognito=false;currentConvId=sheetConv.id;currentConvTitle=sheetConv.title;titleGenerated=true;chatHistory=[...sheetConv.messages];displayMessages=sheetConv.messages.map(m=>({role:m.role,content:m.content}));},200);}],
          [sheetConv.pinned?'pin':'pin',sheetConv.pinned?'Desafixar':'Fixar',false,()=>pinConv(sheetConv)],
          ['customise','Renomear',false,()=>{renameValue=sheetConv.title;showSheet=false;showCenterDialog=true;centerDialogMode='rename';}],
          ['share','Partilhar',false,()=>{showSheet=false;shareText(sheetConv.title);}],
          ['trash','Eliminar',true,()=>deleteConv(sheetConv)]
        ] as [icon,label,danger,action], i}
          {#if i > 0}<div style="height:1px;margin-left:60px;background:{c.divider}"></div>{/if}
          <div class="conv-opts-row pulse-tap" on:click={action}>
            <div class="conv-opts-icon" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/regular/{icon}.svg');-webkit-mask-image:url('/icons/svg/regular/{icon}.svg');width:16px;height:16px;background:{danger?'#EF4444':c.textPrimary}"></span>
            </div>
            <span class="conv-opts-label" style="color:{danger?'#EF4444':c.textPrimary}">{label}</span>
          </div>
        {/each}
      </div>
      <div style="height:20px"></div>

    {:else if sheetMode === 'userMsgOptions' && sheetUserMsg}
      <div class="conv-opts-card" style="background:{isDark?'#1C1C1E':'#F2F2F7'};margin:4px 16px 20px">
        {#each [
          ['copy','Copiar',false,()=>{showSheet=false;copyText(sheetUserMsg.content);}],
          ['customise','Editar',false,()=>{editMsgValue=sheetUserMsg.content;showSheet=false;showCenterDialog=true;centerDialogMode='editMsg';}],
          ['trash','Eliminar mensagem',true,()=>deleteUserMsg(sheetUserIdx)]
        ] as [icon,label,danger,action], i}
          {#if i > 0}<div style="height:1px;margin-left:60px;background:{c.divider}"></div>{/if}
          <div class="conv-opts-row pulse-tap" on:click={action}>
            <div class="conv-opts-icon" style="background:{isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/regular/{icon}.svg');-webkit-mask-image:url('/icons/svg/regular/{icon}.svg');width:16px;height:16px;background:{danger?'#EF4444':c.textPrimary}"></span>
            </div>
            <span class="conv-opts-label" style="color:{danger?'#EF4444':c.textPrimary}">{label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </ModalSheet>

  {#if showCenterDialog}
    <div class="cd-overlay" on:click={() => showCenterDialog=false}></div>
    <div class="cd-box" style="background:{c.dialogBackground}">
      {#if centerDialogMode === 'rename'}
        <div class="cd-title" style="color:{c.textPrimary}">Renomear conversa</div>
        <input class="cd-input" style="border-color:{c.divider};background:{isDark?'rgba(255,255,255,0.05)':'#fff'};color:{c.textPrimary}" bind:value={renameValue} placeholder="Nome da conversa" />
        <div class="cd-actions">
          <button class="cd-btn cd-cancel" style="color:{c.textPrimary}" on:click={() => showCenterDialog=false}>Cancelar</button>
          <button class="cd-btn" style="background:{c.sendBtnColor};color:{c.sendIconColor}" on:click={confirmRename}>Guardar</button>
        </div>
      {:else if centerDialogMode === 'editMsg'}
        <div class="cd-title" style="color:{c.textPrimary}">Editar mensagem</div>
        <textarea class="cd-input cd-textarea" rows="4" style="border-color:{c.divider};background:{isDark?'rgba(255,255,255,0.05)':'#fff'};color:{c.textPrimary}" bind:value={editMsgValue} placeholder="Mensagem"></textarea>
        <div class="cd-actions">
          <button class="cd-btn cd-cancel" style="color:{c.textPrimary}" on:click={() => showCenterDialog=false}>Cancelar</button>
          <button class="cd-btn" style="background:{c.sendBtnColor};color:{c.sendIconColor}" on:click={confirmEditMsg}>Guardar</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if showRecOverlay}
    <div class="rec-overlay" class:dark={isDark}>
      <div class="rec-top-bar">
        <button class="rec-top-btn pulse-tap" on:click={cancelRecording}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark?'#fff':'#1F2937'} stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <span class="rec-timer">{recTimerStr}</span>
        <button class="rec-top-btn pulse-tap" on:click={stopRecording}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark?'#fff':'#1F2937'} stroke-width="2.4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
      <div class="rec-loader-wrap">
        <div id="recLoaderEl" class="rec-loader">
          <div class="rec-loader-box"></div>
        </div>
      </div>
      <div class="rec-wave-wrap">
        <canvas bind:this={recCanvasEl} class="rec-wave-canvas" width="800" height="400"></canvas>
      </div>
      <svg width="0" height="0"><defs><clipPath id="recClipping"><path d="M0,0 h100 v100 h-100 z"/></clipPath></defs></svg>
    </div>
  {/if}
</div>

<style>
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:120px; z-index:5; pointer-events:none; background:linear-gradient(to bottom, var(--app-bg) 0%, transparent 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom, var(--app-bg) 0%, transparent 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; height:64px; padding:0 12px; padding-top:env(safe-area-inset-top); display:flex; align-items:center; z-index:10; }
  .w10 { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; background:transparent; }
  .px2 { padding:0 2px; }
  .flex1 { flex:1; }
  .incognito-pill { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:20px; border:none; font-size:13px; font-weight:600; }
  .messages-wrap { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:64px 16px 160px; }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; text-align:center; gap:6px; }
  .empty-logo { width:56px; height:56px; margin-bottom:10px; opacity:.9; }
  .greeting { font-size:26px; font-weight:400; margin:0; }
  .greeting-sub { font-size:14px; margin:0; }
  .messages-list { display:flex; flex-direction:column; gap:18px; }
  .user-row { display:flex; justify-content:flex-end; }
  .user-bubble { max-width:82%; border-radius:20px 20px 4px 20px; padding:10px 15px; }
  .user-text { margin:0; font-size:15px; line-height:1.5; white-space:pre-wrap; word-break:break-word; }
  .att-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
  .att-img { width:120px; height:120px; object-fit:cover; border-radius:12px; }
  .att-chip { display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:10px; }
  .assistant-row { padding:2px 0; }
  .thinking-placeholder { display:flex; align-items:center; gap:8px; padding:4px 0; }
  .think-dot-wrap { display:flex; gap:3px; }
  .think-dot { width:6px; height:6px; border-radius:50%; animation:thinkPulse 1.2s ease-in-out infinite; }
  @keyframes thinkPulse { 0%,80%,100%{opacity:.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
  .thinking-badge { font-size:12.5px; padding:0 0 8px; margin-bottom:8px; font-style:italic; }
  .assistant-content :global(.md-para) { margin:0 0 12px; }
  .assistant-content :global(.md-h1) { font-size:1.5em; font-weight:700; margin:18px 0 10px; }
  .assistant-content :global(.md-h2) { font-size:1.3em; font-weight:700; margin:16px 0 8px; }
  .assistant-content :global(.md-h3) { font-size:1.15em; font-weight:700; margin:14px 0 8px; }
  .assistant-content :global(.md-h4) { font-size:1.05em; font-weight:700; margin:12px 0 6px; }
  .assistant-content :global(.md-list) { margin:0 0 12px; padding-left:22px; }
  .assistant-content :global(.md-olist) { margin:0 0 12px; padding-left:22px; }
  .assistant-content :global(.md-li) { margin-bottom:4px; }
  .assistant-content :global(.md-hr) { border:none; border-top:1px solid rgba(127,127,127,.2); margin:16px 0; }
  .assistant-content :global(.md-mark) { background:rgba(255,224,102,.5); padding:0 2px; border-radius:3px; }
  .assistant-content :global(.inline-code) { font-family:'Courier New',Courier,monospace; font-size:.9em; background:rgba(127,127,127,.14); padding:1px 5px; border-radius:4px; }
  .assistant-content :global(.code-block-wrapper) { margin:10px 0; border-radius:10px; overflow:hidden; background:rgba(127,127,127,.05); border:1px solid rgba(127,127,127,.12); }
  .assistant-content :global(.code-block-header) { display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(127,127,127,.08); border-bottom:1px solid rgba(127,127,127,.12); }
  .assistant-content :global(.code-lang-label) { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; opacity:.6; }
  .assistant-content :global(.code-copy-btn) { background:none; border:none; cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:background .15s; }
  .assistant-content :global(.code-copy-btn:hover) { background:rgba(127,127,127,.12); }
  .assistant-content :global(.code-block) { margin:0; padding:12px 14px; overflow-x:auto; font-family:'Courier New',Courier,monospace; font-size:13px; line-height:1.6; background:rgba(127,127,127,.06); white-space:pre; }
  .assistant-content :global(a.md-link) { color:var(--accent-primary); text-decoration:underline; text-decoration-color:rgba(79,70,229,.4); }
  .assistant-content :global(.md-blockquote) { border-left:3px solid var(--accent-primary); margin:8px 0 12px; padding:6px 14px; opacity:.85; font-style:italic; }
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
  .assistant-content :global(.math-display) { display:block; text-align:center; margin:12px 0; font-size:1.1em; overflow-x:auto; }
  .assistant-content :global(.math-inline) { display:inline; }
  .assistant-content :global(.widget-host) { display:block; min-height:4px; }

  .cursor-blink::after { content:'|'; animation:blink 1s step-end infinite; color:var(--accent-primary); font-weight:300; }
  @keyframes blink { 50%{opacity:0} }

  .action-row { display:flex; align-items:center; gap:2px; margin-top:8px; padding-top:2px; }
  .action-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:transparent; border:none; cursor:pointer; padding:0; opacity:.65; flex-shrink:0; }
  .action-btn:hover { opacity:1; }

  .connected-pill {
    position:absolute; left:16px; right:16px; z-index:49;
    bottom:calc(20px + 84px);
    display:flex; align-items:center; gap:10px;
    padding:8px 10px; border-radius:18px; border:1px solid;
    animation:connectedPillIn .32s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes connectedPillIn {
    from { opacity:0; transform:translateY(8px) scale(0.96); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .connected-icon-wrap { position:relative; width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .connected-icon-img { width:19px; height:19px; border-radius:5px; object-fit:cover; }
  .connected-dot { position:absolute; bottom:-2px; right:-2px; width:11px; height:11px; border-radius:50%; background:#34C759; border:2px solid var(--app-bg); }
  .connected-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .connected-label { font-size:12.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .connected-mode-btn { display:flex; align-items:center; gap:4px; border:none; background:transparent; padding:0; cursor:pointer; }
  .connected-mode-btn span:last-child { font-size:11px; font-weight:600; }
  .connected-close { width:24px; height:24px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }

  .bottom-bar {
    position:absolute; bottom:0; left:16px; right:16px; z-index:50;
    margin-bottom:20px; border-radius:22px; display:flex; flex-direction:column;
    transition:background-color .3s ease, box-shadow .3s ease;
    user-select:none; overscroll-behavior:none;
  }
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
  .att-remove { position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#000; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; }
  .bb-row { display:flex; align-items:center; height:52px; padding:0 10px; }
  .add-btn { width:40px; height:40px; margin-left:4px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; }
  .edit-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:20px; border:none; cursor:pointer; }
  .edit-label { font-size:14px; font-weight:700; }
  .send-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; }

  /* Apps popup — mesmo estilo do popup de tema do SettingsPage, com animação mais expressiva */
  .apps-popup-overlay { position:fixed; inset:0; z-index:160; }
  .apps-popup-box {
    position:fixed; z-index:161;
    width:230px;
    border-radius:14px; overflow:hidden;
    background:#fff;
    box-shadow:0 8px 30px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
    transform-origin:bottom right;
    animation:appsPopupIn .26s cubic-bezier(0.34,1.56,0.64,1) both;
    max-height:70vh; overflow-y:auto;
  }
  @keyframes appsPopupIn {
    from { opacity:0; transform:scale(0.82) translateY(14px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  .apps-popup-box.dark { background:#2c2c2e; }
  .apps-popup-section-label { padding:11px 16px 5px; font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.5; color:#000; }
  .apps-popup-section-label.dark { color:#fff; }
  .apps-popup-sep { height:.5px; background:rgba(0,0,0,.08); margin:4px 14px; }
  .apps-popup-sep.dark { background:rgba(255,255,255,.08); }
  .apps-popup-row {
    width:100%; display:flex; align-items:center; gap:12px;
    padding:11px 16px; background:none; border:none;
    cursor:pointer; font-family:inherit;
    transition:background .1s;
    opacity:0; transform:translateY(6px) scale(0.98);
    animation:appsRowIn .28s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes appsRowIn {
    from { opacity:0; transform:translateY(6px) scale(0.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .apps-popup-row:active { background:rgba(0,0,0,.04); transform:scale(0.97); }
  .apps-popup-row.dark:active { background:rgba(255,255,255,.05); }
  .apps-popup-icon { width:22px; height:22px; border-radius:6px; object-fit:cover; flex-shrink:0; }
  .apps-popup-label { flex:1; font-size:14.5px; font-weight:400; color:#000; text-align:left; }
  .apps-popup-label.dark { color:#fff; }

  