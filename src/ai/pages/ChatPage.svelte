<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { GeminiApiService, AuthApiService, CreditsApiService } from '$shared/api.js';
  import { showToast } from '$shared/utils.js';
  import { AVAILABLE_MODELS, AVAILABLE_LANGUAGES } from '$shared/plans.js';
  import { evaluateExpression } from '$shared/utils.js';
  import Drawer     from '../components/Drawer.svelte';
  import ModalSheet from '../components/ModalSheet.svelte';
  import PlansModal from '../components/PlansModal.svelte';
  import SettingsPage from './SettingsPage.svelte';

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

  const drawerMenuItems = [
    { icon: 'new_chat', label: 'Nova conversa', action: () => newChat() },
    { icon: 'folder',   label: 'Projetos',      action: () => showToast('Projetos em breve'), keepOpen: true },
    { icon: 'extras',   label: 'Extras',         action: () => { sheetMode = 'extras'; showSheet = true; } },
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
  let conversations    = [];

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
  let showPlans        = false;

  let mediaRecorder = null, audioChunks = [], isRecording = false;
  let waveOverlayCtx = null, waveOverlayAnalyser = null, waveOverlaySource = null;
  let waveOverlayStream = null, waveOverlayAnimFrame = null;
  let showRecOverlay = false;
  let recSeconds = 0;
  let recInterval = null;
  let recCanvasEl;
  let wavePhaseLocal = 0, waveSmoothAmpLocal = 6, waveSmoothBoostLocal = 0, waveSmoothScaleLocal = 1;

  $: hasMessages = displayMessages.length > 0;
  $: greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();
  $: currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'Gemini 2.5 Flash';
  $: recTimerStr = (() => { const m=Math.floor(recSeconds/60),s=recSeconds%60; return `${m}:${s.toString().padStart(2,'0')}`; })();

  onMount(() => {
    chatRootEl = document.querySelector('.chat-root');
    setupVH();
    setupKeyboard();
    setupWidgetSettings();
    setupBottomBarTouchLock();
    loadConversations();
    window.addEventListener('resize', setupVH);
    window.addEventListener('orientationchange', () => setTimeout(setupVH, 120));
    window._copyCodeBtn = function(btn) {
      const code = btn.closest('.code-block-wrapper')?.querySelector('code')?.textContent || '';
      navigator.clipboard?.writeText(code).catch(() => {});
      showToast('Copiado');
    };
  });

  function setupVH() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
  }

  function setupKeyboard() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    function getRoot() { if (!chatRootEl) chatRootEl = document.querySelector('.chat-root'); return chatRootEl; }
    function applyViewport() {
      const root = getRoot();
      if (root) { root.style.top='0px'; root.style.left='0px'; root.style.right='0px'; root.style.bottom='auto'; root.style.height=vv.height+'px'; }
      scrollToBottom();
    }
    vv.addEventListener('resize', applyViewport);
    vv.addEventListener('scroll', applyViewport);
    applyViewport();
  }

  function setupBottomBarTouchLock() {
    const bb = document.getElementById('bottomBar');
    if (!bb) return;
    bb.addEventListener('touchmove', (e) => { if (e.target !== textInputEl) { e.preventDefault(); e.stopPropagation(); } }, { passive: false });
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
        setTimeout(() => { const el = document.getElementById(wid); if (el) buildNativeWidgetDOM(blk.lang, blk.code, el); }, 0);
        return `<div id="${wid}" class="widget-host"></div>`;
      }
      const safe=escapeHtml(blk.code);
      const hdr=blk.lang?`<div class="code-block-header"><span class="code-lang-label">${escapeHtml(blk.lang)}</span><button class="code-copy-btn pulse-tap" onclick="window._copyCodeBtn(this)"><span class="icon-mask" style="mask-image:url('/icons/svg/copy.svg');-webkit-mask-image:url('/icons/svg/copy.svg');width:13px;height:13px;background:currentColor;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span></button></div>`:'';
      return `<div class="code-block-wrapper">${hdr}<pre class="code-block"><code>${safe}</code></pre></div>`;
    });
    text = text.replace(/\u0000MB(\d+)\u0000/g,(_,idx)=>{const blk=mathBlocks[Number(idx)];const rendered=renderMathToken(blk.content);return blk.display?`<div class="math-display">${rendered}</div>`:`<span class="math-inline">${rendered}</span>`;});
    return text;
  }

  function _wIsDark() { return isDark; }
  function _ensureStyle(id, cssText) { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = cssText; document.head.appendChild(s); }
  function _escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function _copyText(text) { return navigator.clipboard?.writeText?.(text).catch(async () => { try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly',''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,ta.value.length); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok; } catch { return false; } }); }
  function _showToast(el, text) { el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.pointerEvents = 'none'; clearTimeout(el._hideTimer); el._hideTimer = setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(-4px)'; }, 1000); }

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
      const thead = document.createElement('thead'); const tr = document.createElement('tr');
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

  function renderNativeCode(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1a1a1a' : '#f6f8fa';
    const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const text = dark ? '#e6edf3' : '#24292f';
    const headerBg = dark ? '#222' : '#f0f0f0';
    const wrap = document.createElement('div');
    wrap.style.cssText = `border-radius:10px;overflow:hidden;margin:6px 0;border:1px solid ${border};`;
    const header = document.createElement('div');
    header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:${headerBg};border-bottom:1px solid ${border};`;
    const lang = document.createElement('span');
    lang.style.cssText = `font-size:12px;font-weight:600;color:${dark?'#8b949e':'#57606a'};font-family:monospace;`;
    lang.textContent = json.language || 'code';
    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = `border:none;background:transparent;cursor:pointer;padding:2px 6px;border-radius:6px;font-size:12px;color:${dark?'#8b949e':'#57606a'};`;
    copyBtn.textContent = 'Copiar';
    const toast = document.createElement('span');
    toast.style.cssText = `font-size:11px;color:#34C759;opacity:0;transition:opacity 0.2s,transform 0.2s;transform:translateY(-4px);margin-right:6px;`;
    copyBtn.addEventListener('click', () => { _copyText(json.code || ''); _showToast(toast, 'Copiado!'); });
    header.appendChild(lang); header.appendChild(toast); header.appendChild(copyBtn);
    const pre = document.createElement('pre');
    pre.style.cssText = `margin:0;padding:14px;overflow-x:auto;background:${bg};font-size:13.5px;line-height:1.6;color:${text};font-family:'SF Mono','Fira Code',monospace;-webkit-overflow-scrolling:touch;`;
    const code = document.createElement('code');
    code.textContent = json.code || '';
    pre.appendChild(code); wrap.appendChild(header); wrap.appendChild(pre); container.appendChild(wrap);
  }

  function renderNativeBar(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#222';
    const accent = '#2F7BF6';
    const data = json.data || [];
    if (!data.length) return;
    const max = Math.max(...data.map(d => d.value || 0)) || 1;
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;`;
    if (json.title) { const t = document.createElement('div'); t.style.cssText = `font-size:14px;font-weight:600;color:${text};margin-bottom:12px;`; t.textContent = json.title; wrap.appendChild(t); }
    const chart = document.createElement('div');
    chart.style.cssText = `display:flex;align-items:flex-end;gap:8px;height:140px;`;
    data.forEach(d => {
      const col = document.createElement('div');
      col.style.cssText = `flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;`;
      const barWrap = document.createElement('div');
      barWrap.style.cssText = `width:100%;flex:1;display:flex;align-items:flex-end;`;
      const bar = document.createElement('div');
      const pct = Math.round(((d.value||0)/max)*100);
      bar.style.cssText = `width:100%;height:${pct}%;min-height:4px;border-radius:6px 6px 0 0;background:${d.color||accent};transition:height 0.5s ease;`;
      barWrap.appendChild(bar);
      const val = document.createElement('div');
      val.style.cssText = `font-size:11px;font-weight:600;color:${text};`;
      val.textContent = d.value;
      const lbl = document.createElement('div');
      lbl.style.cssText = `font-size:10px;color:${dark?'#888':'#aaa'};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;`;
      lbl.textContent = d.label || '';
      col.appendChild(barWrap); col.appendChild(val); col.appendChild(lbl);
      chart.appendChild(col);
    });
    wrap.appendChild(chart); container.appendChild(wrap);
  }

  function renderNativePie(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#222';
    const COLORS = ['#2F7BF6','#34C759','#FF9500','#FF3B30','#AF52DE','#00C7BE','#FF2D55','#FFCC00'];
    const data = json.data || [];
    if (!data.length) return;
    const total = data.reduce((s,d) => s+(d.value||0),0) || 1;
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;display:flex;gap:16px;align-items:center;`;
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 120;
    canvas.style.cssText = `flex-shrink:0;`;
    const ctx = canvas.getContext('2d');
    let startAngle = -Math.PI/2;
    data.forEach((d, i) => {
      const slice = (d.value/total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(60,60); ctx.arc(60,60,54,startAngle,startAngle+slice); ctx.closePath();
      ctx.fillStyle = d.color || COLORS[i % COLORS.length]; ctx.fill();
      startAngle += slice;
    });
    const legend = document.createElement('div');
    legend.style.cssText = `display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;`;
    data.forEach((d, i) => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:8px;`;
      const dot = document.createElement('div');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${d.color||COLORS[i%COLORS.length]};`;
      const lbl = document.createElement('span');
      lbl.style.cssText = `font-size:12px;color:${text};flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      lbl.textContent = `${d.label} (${Math.round((d.value/total)*100)}%)`;
      row.appendChild(dot); row.appendChild(lbl); legend.appendChild(row);
    });
    wrap.appendChild(canvas); wrap.appendChild(legend); container.appendChild(wrap);
  }

  function renderNativeSheet(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#1a1a1a';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:20px 18px;margin:6px 0;font-family:Georgia,"Times New Roman",serif;`;
    (json.lines||[]).forEach(line => {
      const el = document.createElement(line.title ? 'h3' : line.subtitle ? 'h4' : 'p');
      el.textContent = line.text || '';
      let style = `color:${text};margin:0 0 8px;`;
      if (line.title)    style += 'font-size:20px;font-weight:700;';
      else if (line.subtitle) style += 'font-size:16px;font-weight:600;';
      else style += 'font-size:15px;font-weight:400;line-height:1.7;';
      if (line.center) style += 'text-align:center;';
      el.style.cssText = style; wrap.appendChild(el);
    });
    container.appendChild(wrap);
  }

  function renderNativeMarket(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#1a1a1a';
    const sub = dark ? '#888' : '#aaa';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;`;
    const header = document.createElement('div');
    header.style.cssText = `display:flex;align-items:center;gap:12px;margin-bottom:12px;`;
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `width:40px;height:40px;border-radius:50%;background:${dark?'#2C2C2E':'#f0f0f5'};display:flex;align-items:center;justify-content:center;font-size:18px;`;
    iconWrap.textContent = json.type === 'crypto' ? '₿' : '📈';
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.style.cssText = `font-size:16px;font-weight:700;color:${text};`;
    name.textContent = json.name || json.symbol || '';
    const sym = document.createElement('div');
    sym.style.cssText = `font-size:12px;color:${sub};`;
    sym.textContent = json.symbol || '';
    info.appendChild(name); info.appendChild(sym);
    header.appendChild(iconWrap); header.appendChild(info);
    const note = document.createElement('div');
    note.style.cssText = `font-size:13px;color:${sub};`;
    note.textContent = 'Dados em tempo real requerem integração de API de mercado.';
    wrap.appendChild(header); wrap.appendChild(note); container.appendChild(wrap);
  }

  function renderNativeCalendar(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#1a1a1a';
    const sub = dark ? '#888' : '#aaa';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;`;
    const title = document.createElement('div');
    title.style.cssText = `font-size:14px;font-weight:600;color:${text};margin-bottom:12px;`;
    title.textContent = 'Eventos';
    wrap.appendChild(title);
    (json.events||[]).forEach(ev => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid ${dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'};`;
      const dot = document.createElement('div');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${ev.color||'#2F7BF6'};`;
      const info = document.createElement('div');
      info.style.cssText = `flex:1;min-width:0;`;
      const ename = document.createElement('div');
      ename.style.cssText = `font-size:14px;font-weight:500;color:${text};`;
      ename.textContent = ev.name || '';
      const edate = document.createElement('div');
      edate.style.cssText = `font-size:12px;color:${sub};`;
      edate.textContent = `${ev.date||''}${ev.time?' · '+ev.time:''}`;
      info.appendChild(ename); info.appendChild(edate);
      row.appendChild(dot); row.appendChild(info); wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderNativeTimer(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#1a1a1a';
    const sub = dark ? '#888' : '#aaa';
    let remaining = json.seconds || 0;
    let running = false; let interval = null;
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:20px;margin:6px 0;display:flex;flex-direction:column;align-items:center;gap:12px;`;
    if (json.label) { const lbl = document.createElement('div'); lbl.style.cssText = `font-size:14px;color:${sub};`; lbl.textContent = json.label; wrap.appendChild(lbl); }
    const display = document.createElement('div');
    display.style.cssText = `font-size:42px;font-weight:700;color:${text};font-variant-numeric:tabular-nums;letter-spacing:-1px;`;
    function fmt(s) { const m=Math.floor(s/60),sec=s%60; return `${m}:${sec.toString().padStart(2,'0')}`; }
    display.textContent = fmt(remaining);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display:flex;gap:12px;`;
    const startBtn = document.createElement('button');
    startBtn.style.cssText = `padding:10px 24px;border-radius:10px;border:none;background:#2F7BF6;color:#fff;font-size:15px;font-weight:600;cursor:pointer;`;
    startBtn.textContent = 'Iniciar';
    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = `padding:10px 18px;border-radius:10px;border:none;background:${dark?'#2C2C2E':'#f0f0f5'};color:${text};font-size:15px;cursor:pointer;`;
    resetBtn.textContent = 'Reset';
    startBtn.addEventListener('click', () => {
      if (running) { clearInterval(interval); running = false; startBtn.textContent = 'Retomar'; }
      else if (remaining > 0) {
        running = true; startBtn.textContent = 'Pausar';
        interval = setInterval(() => { remaining--; display.textContent = fmt(remaining); if (remaining <= 0) { clearInterval(interval); running = false; startBtn.textContent = 'Iniciar'; display.style.color = '#FF3B30'; } }, 1000);
      }
    });
    resetBtn.addEventListener('click', () => { clearInterval(interval); running = false; remaining = json.seconds||0; display.textContent = fmt(remaining); display.style.color = text; startBtn.textContent = 'Iniciar'; });
    btnRow.appendChild(startBtn); btnRow.appendChild(resetBtn);
    wrap.appendChild(display); wrap.appendChild(btnRow); container.appendChild(wrap);
  }

  function renderNativeMindmap(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const text = dark ? '#f4f4f4' : '#1a1a1a';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;overflow-x:auto;`;
    function buildNode(node, level) {
      const el = document.createElement('div');
      el.style.cssText = `display:flex;flex-direction:column;align-items:flex-start;padding-left:${level*20}px;margin:4px 0;`;
      const label = document.createElement('div');
      label.style.cssText = `display:inline-block;padding:6px 14px;border-radius:20px;font-size:${level===0?'15':'13'}px;font-weight:${level===0?'700':'500'};color:#fff;background:${node.color||'#2F7BF6'};margin-bottom:2px;`;
      label.textContent = node.label || '';
      el.appendChild(label);
      if (node.children?.length) {
        const children = document.createElement('div');
        children.style.cssText = `border-left:2px solid ${node.color||'#2F7BF6'};margin-left:12px;padding-left:4px;`;
        node.children.forEach(child => children.appendChild(buildNode(child, level+1)));
        el.appendChild(children);
      }
      return el;
    }
    if (json.title) { const t = document.createElement('div'); t.style.cssText=`font-size:14px;font-weight:600;color:${text};margin-bottom:10px;`; t.textContent=json.title; wrap.appendChild(t); }
    if (json.tree) wrap.appendChild(buildNode(json.tree, 0));
    container.appendChild(wrap);
  }

  function renderNativeGraph(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const axisColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const lineColor = '#2F7BF6';
    const textColor = dark ? '#888' : '#aaa';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;padding:16px;margin:6px 0;`;
    const canvas = document.createElement('canvas');
    const W=300, H=160; canvas.width=W; canvas.height=H;
    canvas.style.cssText = `width:100%;max-width:${W}px;display:block;margin:0 auto;`;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const xMin=json.xMin??-10, xMax=json.xMax??10;
    const pts=[]; let yMin=Infinity,yMax=-Infinity;
    for(let px=0;px<W;px++){const x=xMin+(px/W)*(xMax-xMin);const y=evaluateExpression(json.expression||'x',x);if(isFinite(y)){pts.push({px,y});yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}}
    if(yMin===yMax){yMin-=1;yMax+=1;}
    const toY=y=>H-(((y-yMin)/(yMax-yMin))*H*0.8+H*0.1);
    const x0px=(-xMin/(xMax-xMin))*W; const y0py=toY(0);
    ctx.strokeStyle=axisColor; ctx.lineWidth=1;
    if(x0px>=0&&x0px<=W){ctx.beginPath();ctx.moveTo(x0px,0);ctx.lineTo(x0px,H);ctx.stroke();}
    if(y0py>=0&&y0py<=H){ctx.beginPath();ctx.moveTo(0,y0py);ctx.lineTo(W,y0py);ctx.stroke();}
    ctx.strokeStyle=lineColor; ctx.lineWidth=2; ctx.beginPath(); let first=true;
    pts.forEach(({px,y})=>{const py=toY(y);if(first){ctx.moveTo(px,py);first=false;}else ctx.lineTo(px,py);});
    ctx.stroke();
    const lbl=document.createElement('div'); lbl.style.cssText=`text-align:center;font-size:12px;color:${textColor};margin-top:6px;font-family:monospace;`; lbl.textContent=json.expression||'';
    wrap.appendChild(canvas); wrap.appendChild(lbl); container.appendChild(wrap);
  }

  function renderNativeMap(container, json) {
    const dark = _wIsDark();
    const bg = dark ? '#1b1b1b' : '#fff';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:${bg};border-radius:14px;overflow:hidden;margin:6px 0;`;
    const iframe = document.createElement('iframe');
    const lat=json.lat??38.7169, lng=json.lng??-9.1399, zoom=json.zoom??13;
    iframe.src=`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.05},${lat-0.05},${lng+0.05},${lat+0.05}&layer=mapnik&marker=${lat},${lng}`;
    iframe.style.cssText=`width:100%;height:200px;border:none;display:block;`;
    iframe.loading='lazy'; iframe.allowFullscreen=true;
    wrap.appendChild(iframe); container.appendChild(wrap);
  }

  function buildNativeWidgetDOM(type, rawJson, container) {
    let json;
    try { json = JSON.parse(rawJson); } catch(e) { container.textContent = 'Widget inválido'; return; }
    container.style.cssText = 'width:100%;margin:4px 0;';
    if      (type==='widget_table')    renderNativeTable(container,json);
    else if (type==='widget_code')     renderNativeCode(container,json);
    else if (type==='widget_bar')      renderNativeBar(container,json);
    else if (type==='widget_pie')      renderNativePie(container,json);
    else if (type==='widget_sheet')    renderNativeSheet(container,json);
    else if (type==='widget_market')   renderNativeMarket(container,json);
    else if (type==='widget_calendar') renderNativeCalendar(container,json);
    else if (type==='widget_timer')    renderNativeTimer(container,json);
    else if (type==='widget_mindmap')  renderNativeMindmap(container,json);
    else if (type==='widget_graph')    renderNativeGraph(container,json);
    else if (type==='widget_map')      renderNativeMap(container,json);
  }

  function scrollToBottom(smooth=false) {
    if (!messagesEl) return;
    requestAnimationFrame(() => { messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); });
  }

  async function loadConversations() {
    if (!effectiveUser?.token) return;
    conversations = await AuthApiService.listConversations(effectiveUser.token);
    conversations.sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return (b.updated_at||0)-(a.updated_at||0); });
  }

  function newChat() {
    displayMessages = []; chatHistory = [];
    currentConvId = ''; currentConvTitle = 'Nova conversa'; titleGenerated = false;
    isStreaming = false; pendingAttachments = [];
  }

  async function sendMessage(overrideText) {
    const text = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!text && !pendingAttachments.length) return;
    if (isStreaming) return;
    inputText = '';
    if (textInputEl) { textInputEl.style.height = 'auto'; }

    const attachments = [...pendingAttachments]; pendingAttachments = [];
    const userContent = text;
    displayMessages = [...displayMessages, { role: 'user', content: userContent, attachments }];
    scrollToBottom();

    const historyMsg = { role: 'user', parts: [{ text: userContent }] };
    chatHistory = [...chatHistory, historyMsg];

    isStreaming = true;
    const assistantIdx = displayMessages.length;
    displayMessages = [...displayMessages, { role: 'assistant', content: '', streaming: true }];
    scrollToBottom();

    const systemPrompt = GeminiApiService.buildSystemPrompt(currentLanguage, sheetsEnabled);
    const modelToUse = flashMode ? 'gemini-2.5-flash' : currentModelId;
    const stream = GeminiApiService.streamChat({ messages: chatHistory, systemPrompt, token: effectiveUser?.token, think: thinkMoreMode, language: currentLanguage });

    let fullText = '';
    let thinkText = '';
    let hasThink = false;

    for await (const chunk of stream) {
      if (chunk.type === 'token') {
        fullText += chunk.text;
        displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content: fullText, thinkText: hasThink ? thinkText : undefined };
        displayMessages = [...displayMessages];
        scrollToBottom();
      } else if (chunk.type === 'think') {
        thinkText += chunk.text; hasThink = true;
        displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], thinkText };
        displayMessages = [...displayMessages];
      } else if (chunk.type === 'done') {
        fullText = chunk.fullText || fullText;
        break;
      } else if (chunk.type === 'credits_exhausted') {
        displayMessages = displayMessages.slice(0, assistantIdx);
        isStreaming = false;
        showPlans = true;
        return;
      } else if (chunk.type === 'error') {
        displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content: '❌ ' + chunk.message, streaming: false };
        displayMessages = [...displayMessages];
        isStreaming = false;
        return;
      }
    }

    displayMessages[assistantIdx] = { ...displayMessages[assistantIdx], content: fullText, streaming: false };
    displayMessages = [...displayMessages];
    isStreaming = false;

    const assistantHistoryMsg = { role: 'model', parts: [{ text: fullText }] };
    chatHistory = [...chatHistory, assistantHistoryMsg];

    scrollToBottom(true);

    if (!isIncognito && effectiveUser?.token) {
      if (!titleGenerated && !currentConvId) {
        const title = await GeminiApiService.generateTitle(userContent, effectiveUser.token, currentLanguage);
        currentConvTitle = title; titleGenerated = true;
        const msgs = chatHistory.map(m => ({ role: m.role==='model'?'assistant':m.role, content: m.parts[0]?.text||'' }));
        currentConvId = await AuthApiService.createConversation(effectiveUser.token, title, msgs) || '';
      } else if (currentConvId) {
        const msgs = chatHistory.map(m => ({ role: m.role==='model'?'assistant':m.role, content: m.parts[0]?.text||'' }));
        await AuthApiService.updateConversation(effectiveUser.token, currentConvId, currentConvTitle, msgs);
      }
      await loadConversations();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function autoResize() {
    if (!textInputEl) return;
    textInputEl.style.height = 'auto';
    const max = 140;
    textInputEl.style.height = Math.min(textInputEl.scrollHeight, max) + 'px';
    textInputEl.style.overflowY = textInputEl.scrollHeight > max ? 'auto' : 'hidden';
  }

  async function addAttachment(file, kind) {
    if (!file) return;
    const maxMB = kind === 'image' ? 10 : 20;
    if (file.size > maxMB*1024*1024) { showToast(`Ficheiro muito grande (máx ${maxMB}MB)`); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      pendingAttachments = [...pendingAttachments, { kind, name: file.name, base64, mimeType: file.type, size: file.size }];
    };
    reader.readAsDataURL(file);
  }

  async function startRecording() {
    try {
      waveOverlayStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(waveOverlayStream);
      audioChunks = []; isRecording = true; showRecOverlay = true; recSeconds = 0;
      recInterval = setInterval(() => recSeconds++, 1000);
      const actx = new AudioContext();
      waveOverlayAnalyser = actx.createAnalyser(); waveOverlayAnalyser.fftSize = 256;
      waveOverlaySource = actx.createMediaStreamSource(waveOverlayStream);
      waveOverlaySource.connect(waveOverlayAnalyser);
      waveOverlayCtx = actx;
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        clearInterval(recInterval); recSeconds = 0;
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        showToast('Áudio gravado (transcrição em breve)');
        isRecording = false; showRecOverlay = false;
        if (waveOverlayStream) { waveOverlayStream.getTracks().forEach(t => t.stop()); }
        cancelAnimationFrame(waveOverlayAnimFrame);
      };
      mediaRecorder.start();
      drawWave();
    } catch (e) { showToast('Microfone não disponível'); isRecording = false; showRecOverlay = false; }
  }

  function drawWave() {
    if (!recCanvasEl || !waveOverlayAnalyser) return;
    const data = new Uint8Array(waveOverlayAnalyser.frequencyBinCount);
    function frame() {
      waveOverlayAnimFrame = requestAnimationFrame(frame);
      waveOverlayAnalyser.getByteTimeDomainData(data);
      const W=recCanvasEl.width, H=recCanvasEl.height;
      const ctx2 = recCanvasEl.getContext('2d');
      ctx2.clearRect(0,0,W,H);
      let amp=0; data.forEach(v=>{amp+=Math.abs(v-128);}); amp/=data.length;
      waveSmoothAmpLocal += (amp - waveSmoothAmpLocal)*0.25;
      waveSmoothBoostLocal += (Math.min(amp/20,1)*14 - waveSmoothBoostLocal)*0.2;
      waveSmoothScaleLocal += (Math.min(amp/20,1)*0.3 - (waveSmoothScaleLocal-1))*0.15; waveSmoothScaleLocal=Math.max(1,waveSmoothScaleLocal);
      wavePhaseLocal += 0.08;
      const numWaves=3, colors=['rgba(79,140,255,0.55)','rgba(120,80,255,0.38)','rgba(60,200,180,0.32)'];
      for(let w=0;w<numWaves;w++){
        ctx2.beginPath();
        for(let x=0;x<=W;x++){
          const t=x/W;
          const phaseOffset=w*(Math.PI*2/numWaves);
          const freq=2.5+w*0.7; const boost=waveSmoothBoostLocal*(1-w*0.2);
          const y=H/2+Math.sin(t*Math.PI*2*freq+wavePhaseLocal+phaseOffset)*(waveSmoothAmpLocal*waveSmoothScaleLocal+boost)*0.7*(1-w*0.12)*Math.sin(Math.PI*t);
          if(x===0)ctx2.moveTo(x,y); else ctx2.lineTo(x,y);
        }
        ctx2.strokeStyle=colors[w]; ctx2.lineWidth=2.5-w*0.4; ctx2.stroke();
      }
    }
    frame();
  }

  function stopRecording() { if (mediaRecorder && isRecording) mediaRecorder.stop(); }
  function cancelRecording() {
    if (mediaRecorder && isRecording) { mediaRecorder.ondataavailable=null; mediaRecorder.onstop=null; mediaRecorder.stop(); }
    clearInterval(recInterval); isRecording = false; showRecOverlay = false; recSeconds = 0;
    if (waveOverlayStream) waveOverlayStream.getTracks().forEach(t=>t.stop());
    cancelAnimationFrame(waveOverlayAnimFrame);
  }

  function copyText(text) { navigator.clipboard?.writeText(text); showToast('Copiado'); }
  function shareText(text) { if(navigator.share) navigator.share({text}); else copyText(text); }

  function handleConvOptions(e) { sheetConv = e.detail.conv; sheetMode = 'convOptions'; showSheet = true; }

  async function pinConv(conv) {
    if (!effectiveUser?.token) return;
    await AuthApiService.pinConversation(effectiveUser.token, conv.id, !conv.pinned);
    showSheet = false; await loadConversations();
  }

  async function deleteConv(conv) {
    if (!effectiveUser?.token) return;
    await AuthApiService.deleteConversation(effectiveUser.token, conv.id);
    if (currentConvId === conv.id) newChat();
    showSheet = false; await loadConversations();
  }

  async function renameConv() {
    if (!effectiveUser?.token || !sheetConv) return;
    await AuthApiService.updateConversation(effectiveUser.token, sheetConv.id, renameValue, sheetConv.messages || []);
    showCenterDialog = false; showSheet = false; await loadConversations();
  }

  async function confirmEditMsg() {
    if (sheetUserIdx < 0) return;
    const oldMsg = displayMessages[sheetUserIdx];
    displayMessages[sheetUserIdx] = { ...oldMsg, content: editMsgValue };
    displayMessages = displayMessages.slice(0, sheetUserIdx+1);
    chatHistory = chatHistory.slice(0, sheetUserIdx);
    showCenterDialog = false;
    await sendMessage(editMsgValue);
  }

  function selectModel(id) { currentModelId = id; localStorage.setItem('nexa_model', id); showSheet = false; showToast(`Modelo: ${currentModelName}`); }
  function openConvFromDrawer(e) {
    const conv = e.detail.conv;
    currentConvId = conv.id; currentConvTitle = conv.title; titleGenerated = true;
    chatHistory = (conv.messages||[]).map(m => ({ role: m.role==='assistant'?'model':m.role, parts: [{text: m.content}] }));
    displayMessages = (conv.messages||[]).map(m => ({ role: m.role, content: m.content }));
    setTimeout(() => scrollToBottom(), 100);
  }
</script>

<div class="chat-root" style="background:{c.background};color:{c.textPrimary};position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;">

  <Drawer
    {isDark} {user} open={drawerOpen}
    menuItems={drawerMenuItems}
    {conversations}
    {currentConvId}
    on:close={() => drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to: 'settings' })}
    on:openConv={openConvFromDrawer}
    on:convOptions={handleConvOptions}
  />

  <!-- Appbar -->
  <div class="appbar" style="background:{c.background};border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn pulse-tap" style="background:{c.appbarBtnBg}" on:click={() => drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <button class="model-btn pulse-tap" on:click={() => { sheetMode='modelPicker'; showSheet=true; }}>
      <img src="/icons/png/logo.png" class="model-logo" alt="Nexa" />
      <span class="model-name" style="color:{c.textPrimary}">{currentModelName}</span>
      <span class="icon-mask chevron-down" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{c.textSecondary};width:12px;height:12px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;transform:rotate(90deg);"></span>
    </button>
    <div class="appbar-right">
      {#if isIncognito}
        <button class="appbar-btn pulse-tap incognito-active" style="background:rgba(88,86,214,0.15)" on:click={() => { isIncognito=false; showToast('Modo normal ativo'); }}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/incognito.svg');-webkit-mask-image:url('/icons/svg/incognito.svg');background:#5856D6;width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        </button>
      {/if}
      <button class="appbar-btn pulse-tap" style="background:{c.appbarBtnBg}" on:click={newChat}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/new_chat.svg');-webkit-mask-image:url('/icons/svg/new_chat.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
    </div>
  </div>

  <!-- Messages -->
  <div class="messages-area" bind:this={messagesEl} style="background:{c.background}">
    {#if !hasMessages}
      <div class="empty-state">
        <img src="/icons/png/logo.png" class="empty-logo" alt="Nexa" />
        <div class="empty-greeting" style="color:{c.textPrimary}">{greeting}</div>
        <div class="empty-sub" style="color:{c.textSecondary}">Como posso ajudar?</div>
      </div>
    {:else}
      {#each displayMessages as msg, idx}
        {#if msg.role === 'user'}
          <div class="msg-row user">
            {#if msg.attachments?.length}
              <div class="attachments-row">
                {#each msg.attachments as att}
                  {#if att.kind === 'image'}
                    <img src="data:{att.mimeType};base64,{att.base64}" class="att-img" alt={att.name} />
                  {:else}
                    <div class="att-file" style="background:{c.appbarBtnBg};color:{c.textSecondary}">📎 {att.name}</div>
                  {/if}
                {/each}
              </div>
            {/if}
            {#if msg.content}
              <div class="bubble user-bubble" style="background:{c.userBubbleBg};color:{c.textPrimary}"
                on:pointerdown={() => { let t=setTimeout(()=>{ sheetUserMsg=msg; sheetUserIdx=idx; sheetMode='userMsgOptions'; showSheet=true; },480); document.addEventListener('pointerup',()=>clearTimeout(t),{once:true}); }}>
                {msg.content}
              </div>
            {/if}
          </div>
        {:else}
          <div class="msg-row assistant">
            {#if msg.thinkText}
              <details class="think-block" style="background:{isDark?'#1a1a2e':'#f0f0ff'};border-color:{isDark?'rgba(111,90,246,0.3)':'rgba(111,90,246,0.2)'}">
                <summary style="color:#6F5AF6;font-size:13px;font-weight:600;">💭 Raciocínio</summary>
                <div class="think-content" style="color:{c.textSecondary}">{msg.thinkText}</div>
              </details>
            {/if}
            <div class="bubble assistant-bubble" style="background:{c.assistantBubbleBg};color:{c.textPrimary}">
              {#if msg.streaming && !msg.content}
                <div class="typing-dots"><span></span><span></span><span></span></div>
              {:else}
                <div class="md-body">{@html renderMarkdown(msg.content)}</div>
              {/if}
            </div>
            {#if !msg.streaming && msg.content}
              <div class="msg-actions">
                <button class="msg-action-btn pulse-tap" on:click={() => copyText(msg.content)}>
                  <span class="icon-mask" style="mask-image:url('/icons/svg/copy.svg');-webkit-mask-image:url('/icons/svg/copy.svg');background:{c.iconTint};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
                </button>
                <button class="msg-action-btn pulse-tap" on:click={() => shareText(msg.content)}>
                  <span class="icon-mask" style="mask-image:url('/icons/svg/share.svg');-webkit-mask-image:url('/icons/svg/share.svg');background:{c.iconTint};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
                </button>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
    <div style="height:16px"></div>
  </div>

  <!-- Bottom bar -->
  <div class="bottom-bar" id="bottomBar" style="background:{c.bottomBarSolid};border-top:0.5px solid {c.divider}">
    {#if pendingAttachments.length}
      <div class="attachments-preview">
        {#each pendingAttachments as att, i}
          <div class="att-chip" style="background:{c.appbarBtnBg}">
            <span style="color:{c.textPrimary};font-size:12px">📎 {att.name.substring(0,12)}{att.name.length>12?'…':''}</span>
            <button class="att-remove" on:click={() => pendingAttachments=pendingAttachments.filter((_,j)=>j!==i)}>✕</button>
          </div>
        {/each}
      </div>
    {/if}
    <div class="input-row">
      <button class="add-btn pulse-tap" style="background:{c.addCircleBg};color:{c.iconTint}" on:click={() => { sheetMode='add'; showSheet=true; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:{c.iconTint};width:18px;height:18px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
      </button>
      <textarea
        bind:this={textInputEl}
        class="chat-input"
        style="background:{isDark?'#1C1C1E':'#F2F2F7'};color:{c.textPrimary};"
        placeholder="Mensagem…"
        rows="1"
        bind:value={inputText}
        on:keydown={handleKeydown}
        on:input={autoResize}
        on:focus={handleInputFocus}
      ></textarea>
      {#if isStreaming}
        <button class="send-btn pulse-tap" style="background:#FF3B30" on:click={() => isStreaming=false}>
          <span style="display:block;width:10px;height:10px;background:#fff;border-radius:2px;"></span>
        </button>
      {:else}
        <button class="send-btn pulse-tap" style="background:{inputText.trim()||pendingAttachments.length?c.sendBtnColor:'#ccc'}" on:click={() => sendMessage()}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');background:{c.sendIconColor};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        </button>
      {/if}
    </div>
    <div class="extras-row">
      <button class="extras-pill pulse-tap" class:active={flashMode} style="background:{flashMode?c.extrasCardActive:'transparent'};color:{flashMode?c.extrasCardActiveText:c.textSecondary}" on:click={() => { flashMode=!flashMode; if(flashMode)thinkMoreMode=false; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/{flashMode?'flash_filled':'flash'}.svg');-webkit-mask-image:url('/icons/svg/{flashMode?'flash_filled':'flash'}.svg');background:{flashMode?c.extrasCardActiveText:c.textSecondary};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Flash
      </button>
      <button class="extras-pill pulse-tap" class:active={thinkMoreMode} style="background:{thinkMoreMode?c.extrasCardActive:'transparent'};color:{thinkMoreMode?c.extrasCardActiveText:c.textSecondary}" on:click={() => { thinkMoreMode=!thinkMoreMode; if(thinkMoreMode)flashMode=false; }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/{thinkMoreMode?'brain_filled':'brain'}.svg');-webkit-mask-image:url('/icons/svg/{thinkMoreMode?'brain_filled':'brain'}.svg');background:{thinkMoreMode?c.extrasCardActiveText:c.textSecondary};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Think
      </button>
      <button class="extras-pill pulse-tap" class:active={sheetsEnabled} style="background:{sheetsEnabled?c.extrasCardActive:'transparent'};color:{sheetsEnabled?c.extrasCardActiveText:c.textSecondary}" on:click={() => sheetsEnabled=!sheetsEnabled}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/{sheetsEnabled?'sheets_filled':'sheets'}.svg');-webkit-mask-image:url('/icons/svg/{sheetsEnabled?'sheets_filled':'sheets'}.svg');background:{sheetsEnabled?c.extrasCardActiveText:c.textSecondary};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Sheets
      </button>
      <button class="extras-pill pulse-tap" class:active={isIncognito} style="background:{isIncognito?'rgba(88,86,214,0.12)':'transparent'};color:{isIncognito?'#5856D6':c.textSecondary}" on:click={() => { isIncognito=!isIncognito; showToast(isIncognito?'Modo incógnito ativo':'Modo normal ativo'); }}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/incognito.svg');-webkit-mask-image:url('/icons/svg/incognito.svg');background:{isIncognito?'#5856D6':c.textSecondary};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        Incógnito
      </button>
      <button class="extras-pill pulse-tap" style="background:transparent;color:{c.textSecondary}" on:click={() => isRecording ? stopRecording() : startRecording()}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/{isRecording?'record':'record'}.svg');-webkit-mask-image:url('/icons/svg/{isRecording?'record':'record'}.svg');background:{isRecording?'#FF3B30':c.textSecondary};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        {isRecording ? 'Parar' : 'Áudio'}
      </button>
    </div>
  </div>

  <!-- Recording overlay -->
  {#if showRecOverlay}
    <div class="rec-overlay" style="background:{isDark?'rgba(0,0,0,0.92)':'rgba(255,255,255,0.95)'}">
      <canvas bind:this={recCanvasEl} class="rec-canvas" width="300" height="80"></canvas>
      <div class="rec-timer" style="color:{c.textPrimary}">{recTimerStr}</div>
      <div class="rec-actions">
        <button class="rec-btn cancel" on:click={cancelRecording}>Cancelar</button>
        <button class="rec-btn stop" on:click={stopRecording}>Enviar</button>
      </div>
    </div>
  {/if}

  <!-- ModalSheet -->
  <ModalSheet {isDark} open={showSheet} on:close={() => showSheet=false}>
    {#if sheetMode === 'add'}
      <div class="sheet-title" style="color:{c.textPrimary}">Adicionar</div>
      {#each [['image','Imagem','camera'],['file','Ficheiro','folder']] as [kind, label, icon]}
        <label class="sheet-row pulse-tap" style="color:{c.textPrimary}">
          <span class="icon-mask sheet-row-icon" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{c.iconTint};"></span>
          {label}
          <input type="file" accept={kind==='image'?'image/*':'*/*'} style="display:none" on:change={async e=>{const f=e.target.files?.[0];if(f){showSheet=false;await addAttachment(f,kind);}}} />
        </label>
      {/each}
    {:else if sheetMode === 'modelPicker'}
      <div class="sheet-title" style="color:{c.textPrimary}">Modelo</div>
      {#each AVAILABLE_MODELS as model}
        <button class="sheet-row pulse-tap" style="color:{currentModelId===model.id?'#2F7BF6':c.textPrimary}" on:click={() => selectModel(model.id)}>
          <span class="icon-mask sheet-row-icon" style="mask-image:url('/icons/svg/brain.svg');-webkit-mask-image:url('/icons/svg/brain.svg');background:{currentModelId===model.id?'#2F7BF6':c.iconTint};"></span>
          <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
            <span style="font-size:15px">{model.name}</span>
            <span style="font-size:12px;color:{c.textSecondary}">{model.description}</span>
          </div>
          {#if currentModelId === model.id}<span style="color:#2F7BF6">✓</span>{/if}
        </button>
      {/each}
    {:else if sheetMode === 'convOptions' && sheetConv}
      <div class="sheet-title" style="color:{c.textPrimary}">{sheetConv.title}</div>
      {#each [
        ['external','Abrir',false,()=>{showSheet=false;setTimeout(()=>{currentConvId=sheetConv.id;currentConvTitle=sheetConv.title;titleGenerated=true;chatHistory=(sheetConv.messages||[]).map(m=>({role:m.role==='assistant'?'model':m.role,parts:[{text:m.content}]}));displayMessages=(sheetConv.messages||[]).map(m=>({role:m.role,content:m.content}));},200);}],
        [sheetConv.pinned?'pin':'pin_filled',sheetConv.pinned?'Desafixar':'Fixar',false,()=>pinConv(sheetConv)],
        ['customise','Renomear',false,()=>{renameValue=sheetConv.title;showSheet=false;showCenterDialog=true;centerDialogMode='rename';}],
        ['share','Partilhar',false,()=>{showSheet=false;shareText(sheetConv.title);}],
        ['trash','Eliminar',true,()=>deleteConv(sheetConv)],
      ] as [icon,label,danger,action]}
        <button class="sheet-row pulse-tap" style="color:{danger?'#FF3B30':c.textPrimary}" on:click={action}>
          <span class="icon-mask sheet-row-icon" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{danger?'#FF3B30':c.iconTint};"></span>
          {label}
        </button>
      {/each}
    {:else if sheetMode === 'userMsgOptions' && sheetUserMsg}
      <div class="sheet-title" style="color:{c.textPrimary}">Mensagem</div>
      {#each [
        ['copy','Copiar',false,()=>{showSheet=false;copyText(sheetUserMsg.content);}],
        ['customise','Editar',false,()=>{editMsgValue=sheetUserMsg.content;showSheet=false;showCenterDialog=true;centerDialogMode='editMsg';}],
        ['trash','Eliminar',true,()=>{displayMessages=displayMessages.filter((_,i)=>i!==sheetUserIdx);chatHistory=chatHistory.filter((_,i)=>i!==sheetUserIdx);showSheet=false;showToast('Mensagem eliminada');}],
      ] as [icon,label,danger,action]}
        <button class="sheet-row pulse-tap" style="color:{danger?'#FF3B30':c.textPrimary}" on:click={action}>
          <span class="icon-mask sheet-row-icon" style="mask-image:url('/icons/svg/{icon}.svg');-webkit-mask-image:url('/icons/svg/{icon}.svg');background:{danger?'#FF3B30':c.iconTint};"></span>
          {label}
        </button>
      {/each}
    {/if}
  </ModalSheet>

  <!-- Center dialog -->
  {#if showCenterDialog}
    <div class="dialog-overlay" on:click={() => showCenterDialog=false}></div>
    <div class="center-dialog" style="background:{c.dialogBackground}">
      {#if centerDialogMode === 'rename'}
        <div class="dialog-title" style="color:{c.textPrimary}">Renomear</div>
        <input class="dialog-input" style="background:{isDark?'#2C2C2E':'#F2F2F7'};color:{c.textPrimary}" bind:value={renameValue} />
        <div class="dialog-actions">
          <button class="dialog-btn cancel" style="color:{c.textSecondary}" on:click={() => showCenterDialog=false}>Cancelar</button>
          <button class="dialog-btn confirm" on:click={renameConv}>Guardar</button>
        </div>
      {:else if centerDialogMode === 'editMsg'}
        <div class="dialog-title" style="color:{c.textPrimary}">Editar mensagem</div>
        <textarea class="dialog-input" style="background:{isDark?'#2C2C2E':'#F2F2F7'};color:{c.textPrimary};height:100px;resize:none;" bind:value={editMsgValue}></textarea>
        <div class="dialog-actions">
          <button class="dialog-btn cancel" style="color:{c.textSecondary}" on:click={() => showCenterDialog=false}>Cancelar</button>
          <button class="dialog-btn confirm" on:click={confirmEditMsg}>Reenviar</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Plans modal -->
  <PlansModal {isDark} open={showPlans} {user} on:close={() => showPlans=false} />

</div>

<style>
  .chat-root { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }

  .appbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 48px 12px 10px; flex-shrink: 0; gap: 8px;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 10px; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity 0.15s; flex-shrink: 0;
  }
  .appbar-btn:active { opacity: 0.6; }
  .model-btn {
    flex: 1; display: flex; align-items: center; gap: 7px;
    padding: 7px 12px; border-radius: 20px; border: none; background: transparent;
    cursor: pointer; min-width: 0;
  }
  .model-logo { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; }
  .model-name { font-size: 15px; font-weight: 600; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .appbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .messages-area {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 8px 14px 0;
    display: flex; flex-direction: column;
  }
  .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; }
  .empty-logo { width: 64px; height: 64px; border-radius: 18px; }
  .empty-greeting { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; }
  .empty-sub { font-size: 15px; }

  .msg-row { display: flex; flex-direction: column; margin: 6px 0; }
  .msg-row.user { align-items: flex-end; }
  .msg-row.assistant { align-items: flex-start; }

  .bubble { padding: 11px 14px; border-radius: 18px; max-width: 88%; font-size: 15px; line-height: 1.55; word-break: break-word; }
  .user-bubble { border-bottom-right-radius: 4px; -webkit-user-select: text; user-select: text; }
  .assistant-bubble { border-bottom-left-radius: 4px; -webkit-user-select: text; user-select: text; }

  .attachments-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; justify-content: flex-end; }
  .att-img { max-width: 180px; max-height: 180px; border-radius: 12px; object-fit: cover; }
  .att-file { padding: 6px 12px; border-radius: 10px; font-size: 13px; }

  .msg-actions { display: flex; gap: 4px; margin-top: 4px; padding-left: 4px; }
  .msg-action-btn { width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s; }
  .msg-action-btn:active { opacity: 0.5; }

  .think-block { border-radius: 12px; border: 1px solid; padding: 8px 12px; margin-bottom: 6px; max-width: 88%; }
  .think-block summary { cursor: pointer; }
  .think-content { font-size: 13px; line-height: 1.5; margin-top: 6px; white-space: pre-wrap; }

  .typing-dots { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
  .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: #888; animation: dot-bounce 1.2s infinite; }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }

  .bottom-bar {
    flex-shrink: 0; padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 6px;
  }
  .attachments-preview { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 4px; }
  .att-chip { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 20px; }
  .att-remove { border: none; background: transparent; cursor: pointer; font-size: 12px; color: #888; padding: 0; }

  .input-row { display: flex; align-items: flex-end; gap: 8px; }
  .add-btn { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .add-btn:active { opacity: 0.6; }
  .chat-input {
    flex: 1; padding: 10px 14px; border-radius: 20px; border: none; outline: none;
    font-size: 15px; font-family: inherit; resize: none; line-height: 1.45;
    max-height: 140px; overflow-y: hidden; -webkit-user-select: text; user-select: text;
  }
  .send-btn { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
  .send-btn:active { opacity: 0.7; }

  .extras-row { display: flex; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
  .extras-row::-webkit-scrollbar { display: none; }
  .extras-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 20px; border: none;
    font-size: 12.5px; font-weight: 500; cursor: pointer;
    white-space: nowrap; transition: background 0.15s;
    font-family: inherit;
  }
  .extras-pill:active { opacity: 0.7; }

  .rec-overlay {
    position: fixed; inset: 0; z-index: 500;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  }
  .rec-canvas { width: 100%; max-width: 300px; }
  .rec-timer { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rec-actions { display: flex; gap: 16px; }
  .rec-btn { padding: 12px 28px; border-radius: 14px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; }
  .rec-btn.cancel { background: rgba(120,120,128,0.15); color: #888; }
  .rec-btn.stop { background: #FF3B30; color: #fff; }

  .sheet-title { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 20px 8px; }
  .sheet-row {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 20px; border: none; background: transparent;
    cursor: pointer; width: 100%; text-align: left;
    font-size: 15px; font-family: inherit;
    transition: opacity 0.12s;
  }
  .sheet-row:active { opacity: 0.6; }
  .sheet-row-icon { width: 20px; height: 20px; flex-shrink: 0; mask-size: contain; -webkit-mask-size: contain; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; mask-position: center; -webkit-mask-position: center; }

  .dialog-overlay { position: fixed; inset: 0; z-index: 600; background: rgba(0,0,0,0.4); }
  .center-dialog {
    position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%);
    z-index: 601; border-radius: 20px; padding: 24px 20px;
    width: calc(100% - 48px); max-width: 340px;
    display: flex; flex-direction: column; gap: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .dialog-title { font-size: 17px; font-weight: 700; }
  .dialog-input { padding: 12px 14px; border-radius: 12px; border: none; outline: none; font-size: 15px; font-family: inherit; -webkit-user-select: text; user-select: text; }
  .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; }
  .dialog-btn { padding: 8px 18px; border-radius: 10px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; }
  .dialog-btn.confirm { background: #2F7BF6; color: #fff; }
  .dialog-btn.cancel { background: transparent; }

  :global(.md-body) { font-size: 15px; line-height: 1.6; }
  :global(.md-h1) { font-size: 22px; font-weight: 700; margin: 12px 0 6px; }
  :global(.md-h2) { font-size: 19px; font-weight: 700; margin: 10px 0 5px; }
  :global(.md-h3) { font-size: 17px; font-weight: 600; margin: 8px 0 4px; }
  :global(.md-h4) { font-size: 15px; font-weight: 600; margin: 6px 0 3px; }
  :global(.md-para) { margin: 4px 0; }
  :global(.md-list), :global(.md-olist) { margin: 4px 0; padding-left: 20px; }
  :global(.md-li) { margin: 2px 0; }
  :global(.md-blockquote) { border-left: 3px solid #2F7BF6; padding: 6px 12px; margin: 6px 0; opacity: 0.8; }
  :global(.md-hr) { border: none; border-top: 1px solid rgba(128,128,128,0.3); margin: 10px 0; }
  :global(.md-link) { color: #2F7BF6; text-decoration: none; }
  :global(.md-mark) { background: rgba(255,214,0,0.3); padding: 1px 3px; border-radius: 3px; }
  :global(.inline-code) { background: rgba(128,128,128,0.15); padding: 2px 6px; border-radius: 5px; font-family: monospace; font-size: 13px; }
  :global(.code-block-wrapper) { border-radius: 10px; overflow: hidden; margin: 6px 0; border: 1px solid rgba(128,128,128,0.2); }
  :global(.code-block-header) { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(128,128,128,0.1); border-bottom: 1px solid rgba(128,128,128,0.15); }
  :global(.code-lang-label) { font-size: 11px; font-weight: 600; color: #888; font-family: monospace; }
  :global(.code-copy-btn) { background: transparent; border: none; cursor: pointer; padding: 2px 6px; border-radius: 6px; color: #888; display: flex; align-items: center; }
  :global(.code-block) { margin: 0; padding: 12px 14px; overflow-x: auto; font-size: 13.5px; line-height: 1.6; font-family: 'SF Mono','Fira Code',monospace; background: rgba(0,0,0,0.04); }
  :global(.dark .code-block) { background: rgba(0,0,0,0.3); }
  :global(.widget-host) { width: 100%; }
  :global(.math-display) { text-align: center; padding: 8px; overflow-x: auto; }
  :global(.math-frac) { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 2px; }
  :global(.math-frac-num) { border-bottom: 1px solid currentColor; padding: 0 3px; }
  :global(.math-frac-den) { padding: 0 3px; }
  :global(.math-root) { display: inline-flex; align-items: center; }
  :global(.math-radical) { font-size: 1.2em; }
  :global(.math-radicand) { border-top: 1px solid currentColor; padding: 0 2px; }
  :global(.pulse-tap) { -webkit-tap-highlight-color: transparent; }
  :global(.pulse-tap:active) { opacity: 0.65; }
</style>