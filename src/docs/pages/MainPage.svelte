<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
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

  $: hasMessages = displayMessages.length > 0;
  $: greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })();
  $: currentModelName = AVAILABLE_MODELS.find(m => m.id === currentModelId)?.name || 'Gemini 2.5 Flash';
  $: recTimerStr = (() => { const m=Math.floor(recSeconds/60),s=recSeconds%60; return `${m}:${s.toString().padStart(2,'0')}`; })();

  const DRAWER_APPS = ALL_APPS.filter(a => a.id !== 'home');

  onMount(() => {
  chatRootEl = document.querySelector('.chat-root');
  setupKeyboardAvoidance();
  document.addEventListener('focusin', lockViewport, true);
  setupWidgetSettings();
  setupBottomBarTouchLock();

  // Mensagem vinda da HomePage
  try {
    const pending = sessionStorage.getItem('nexa_pending_message');
    if (pending) {
      sessionStorage.removeItem('nexa_pending_message');
      setTimeout(() => sendMessage(pending), 300);
    }
  } catch (e) {}
});

  onDestroy(() => {
    document.removeEventListener('focusin', lockViewport, true);
    if (vvRef) {
      vvRef.removeEventListener('resize', scheduleKbUpdate);
      vvRef.removeEventListener('scroll', scheduleKbUpdate);
    }
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
  });

  // ══════════════════════════════════════════════════════════════════
  //  KEYBOARD AVOIDANCE — mesmo padrão usado em docs/pages/MainPage.
  //  Regras:
  //  1) .chat-root NUNCA muda de altura via JS diretamente (nada de
  //     root.style.height = vv.height). A altura vem SEMPRE de
  //     calc(var(--app-vh)) no CSS, e --app-vh só é escrita aqui,
  //     sempre a partir de window.innerHeight (que não encolhe quando
  //     o teclado abre, ao contrário do visualViewport). Isto dá ao
  //     layout inteiro UMA ÚNICA fonte de verdade para a sua altura,
  //     que não é o teclado.
  //  2) .appbar nunca lê --kb-offset e nunca se move. Fica de fora
  //     deste circuito por completo — por isso nunca salta.
  //  3) Só a .bottom-bar sobe, e via transform (translate3d), nunca
  //     via mudança de layout (top/bottom/height) — transform não
  //     dispara reflow.
  //  4) Todo o cálculo passa por requestAnimationFrame com
  //     cancelamento do RAF anterior, para nunca empilhar trabalho de
  //     layout enquanto o teclado ainda está a animar.
  //  5) overlap > 40 como threshold ignora jitter pequeno do
  //     visualViewport (ex: barra de endereço do Chrome a esconder).
  // ══════════════════════════════════════════════════════════════════
  let kbOffset = 0;
  let kbUpdateRaf = null;
  let vvRef = null;

  function syncViewportVars() {
    document.documentElement.style.setProperty('--kb-offset', `${kbOffset}px`);
  }

  function computeKbOffset() {
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);

    const vv = window.visualViewport;
    if (!vv) {
      kbOffset = 0;
      syncViewportVars();
      return;
    }
    const overlap = window.innerHeight - (vv.height + vv.offsetTop);
    kbOffset = overlap > 40 ? Math.round(overlap) : 0;
    syncViewportVars();
    scrollToBottom();
  }

  function scheduleKbUpdate() {
    if (kbUpdateRaf) cancelAnimationFrame(kbUpdateRaf);
    kbUpdateRaf = requestAnimationFrame(computeKbOffset);
  }

  function setupKeyboardAvoidance() {
    requestAnimationFrame(() => {
      computeKbOffset();
      vvRef = window.visualViewport;
      if (!vvRef) return;
      vvRef.addEventListener('resize', scheduleKbUpdate);
      vvRef.addEventListener('scroll', scheduleKbUpdate);
    });
  }

  function lockViewport() {
    const active = document.activeElement;
    const tag = active?.tagName?.toLowerCase?.() || '';
    const isEditable = !!active && (
      active.isContentEditable ||
      tag === 'input' ||
      tag === 'textarea'
    );
    if (!isEditable) return;
    computeKbOffset();
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
    computeKbOffset();
    scrollToBottom();
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
    s.id = id;
    s.textContent = cssText;
    document.head.appendChild(s);
  }

  function buildNativeWidgetDOM(type, code, container) {
    try {
      const json = JSON.parse(code);
      if (type === 'widget_table') return renderNativeTable(container, json);
      if (type === 'widget_bar') return renderNativeBar(container, json);
      if (type === 'widget_pie') return renderNativePie(container, json);
      if (type === 'widget_sheet') return renderNativeSheet(container, json);
      if (type === 'widget_code') return renderNativeCodeWidget(container, json);
      if (type === 'widget_market') return renderNativeMarket(container, json);
      if (type === 'widget_calendar') return renderNativeCalendar(container, json);
      if (type === 'widget_timer') return renderNativeTimer(container, json);
      if (type === 'widget_mindmap') return renderNativeMindmap(container, json);
      if (type === 'widget_graph') return renderNativeGraph(container, json);
      if (type === 'widget_map') return renderNativeMap(container, json);
    } catch (e) {
      container.innerHTML = `<div style="padding:10px;font-size:12px;opacity:.6;">Widget indisponível</div>`;
    }
  }

  function renderNativeTable(container, json) {
    const dark = _wIsDark();
    const headers = json.headers || [];
    const rows = json.rows || [];
    const wrap = document.createElement('div');
    wrap.className = 'native-widget-table-wrap';
    const table = document.createElement('table');
    table.className = 'native-widget-table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      r.forEach(cell => { const td = document.createElement('td'); td.textContent = cell; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderNativeBar(container, json) {
    const dark = _wIsDark();
    const data = json.data || [];
    const max = Math.max(...data.map(d => d.value), 1);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:flex-end;gap:10px;height:180px;padding:10px 4px;';
    data.forEach(item => {
      const col = document.createElement('div');
      col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;height:100%;justify-content:flex-end;';
      const bar = document.createElement('div');
      const pct = (item.value / max) * 100;
      bar.style.cssText = `width:100%;background:${item.color || '#4DA8FF'};border-radius:6px 6px 0 0;height:0%;transition:height .6s cubic-bezier(0.2,0.8,0.2,1);`;
      const label = document.createElement('span');
      label.style.cssText = `font-size:11px;color:${dark?'#ccc':'#555'};text-align:center;`;
      label.textContent = item.label;
      col.appendChild(bar); col.appendChild(label);
      wrap.appendChild(col);
      requestAnimationFrame(() => { bar.style.height = pct + '%'; });
    });
    container.appendChild(wrap);
  }

  function renderNativePie(container, json) {
    const dark = _wIsDark();
    const legendColor = dark ? '#ccc' : '#444';
    const data = json.data || [];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px;';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','-150 -150 300 300');
    svg.setAttribute('width','200'); svg.setAttribute('height','200');
    const g = document.createElementNS(ns,'g');
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
        t.setAttribute('font-family','Arial,Helvetica,sans-serif');t.setAttribute('font-weight',isT?'700':'400');
        t.setAttribute('fill',textClr);t.setAttribute('dominant-baseline','alphabetic');t.textContent=item.text;
        contentGroup.appendChild(t);
      });
      applyScrollTransform();
    }
    function setExpanded(value){
      isExpanded=value;
      if(isExpanded){wrap.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;box-shadow:none;z-index:1000;background:${surface};overflow:hidden;cursor:default;`;backBtn.style.opacity='1';backBtn.style.pointerEvents='auto';}
      else{wrap.style.cssText=`position:relative;width:min(92vw,640px);height:min(70vh,320px);border:1px solid ${border};background:${surface};box-shadow:0 8px 22px rgba(0,0,0,0.10);overflow:hidden;margin:6px auto;cursor:pointer;transition:width 0.4s cubic-bezier(0.2,0.9,0.3,1),height 0.4s cubic-bezier(0.2,0.9,0.3,1),border-radius 0.4s ease,box-shadow 0.4s ease;`;backBtn.style.opacity='0';backBtn.style.pointerEvents='none';}
      requestAnimationFrame(render);
    }
    wrap.addEventListener('click', (e) => { if (e.target === backBtn || backBtn.contains(e.target)) return; if (!isExpanded) setExpanded(true); });
    backBtn.addEventListener('click', (e) => { e.stopPropagation(); setExpanded(false); });
    let dragging=false,lastY=0;
    svg.addEventListener('pointerdown',(e)=>{ if(!isExpanded)return; dragging=true; lastY=e.clientY; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove',(e)=>{ if(!dragging)return; const dy=e.clientY-lastY; lastY=e.clientY; scrollY-=dy; clampScroll(); applyScrollTransform(); });
    svg.addEventListener('pointerup',(e)=>{ dragging=false; });
    svg.addEventListener('wheel',(e)=>{ if(!isExpanded)return; e.preventDefault(); scrollY+=e.deltaY; clampScroll(); applyScrollTransform(); },{passive:false});
    new ResizeObserver(()=>render()).observe(wrap);
    requestAnimationFrame(render);
  }

  function renderNativeCodeWidget(container, json) {
    const dark = _wIsDark();
    const code = json.code || '';
    const lang = json.language || '';
    const pre = document.createElement('pre');
    pre.className = 'code-block';
    pre.style.margin = '0';
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    container.appendChild(pre);
  }

  function renderNativeMarket(container, json) {
    const dark = _wIsDark();
    const items = json.items || [];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px;';
    items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:10px 8px;border-bottom:1px solid ${dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'};`;
      const up = item.change >= 0;
      row.innerHTML = `<div style="display:flex;flex-direction:column;"><span style="font-size:14px;font-weight:600;color:${dark?'#eee':'#111'};">${item.symbol}</span><span style="font-size:11px;opacity:.6;color:${dark?'#ccc':'#555'};">${item.name||''}</span></div><div style="display:flex;flex-direction:column;align-items:flex-end;"><span style="font-size:14px;font-weight:600;color:${dark?'#eee':'#111'};">${item.price}</span><span style="font-size:12px;font-weight:600;color:${up?'#22C55E':'#EF4444'};">${up?'+':''}${item.change}%</span></div>`;
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderNativeCalendar(container, json) {
    const dark = _wIsDark();
    const events = json.events || [];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:6px 2px;';
    events.forEach(ev => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:${dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.03)'};`;
      row.innerHTML = `<div style="min-width:52px;font-size:12px;font-weight:600;color:${dark?'#9ecbff':'#2563EB'};">${ev.time||''}</div><div style="display:flex;flex-direction:column;"><span style="font-size:13px;font-weight:600;color:${dark?'#eee':'#111'};">${ev.title}</span>${ev.location?`<span style="font-size:11px;opacity:.6;color:${dark?'#ccc':'#555'};">${ev.location}</span>`:''}</div>`;
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderNativeTimer(container, json) {
    const dark = _wIsDark();
    const label = json.label || 'Timer';
    let seconds = Number(json.seconds) || 60;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;';
    const timeEl = document.createElement('div');
    timeEl.style.cssText = `font-size:32px;font-weight:700;font-variant-numeric:tabular-nums;color:${dark?'#eee':'#111'};`;
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-size:13px;opacity:.6;color:${dark?'#ccc':'#555'};`;
    labelEl.textContent = label;
    wrap.appendChild(timeEl); wrap.appendChild(labelEl);
    function fmt(s){const m=Math.floor(s/60),r=s%60;return `${m}:${r.toString().padStart(2,'0')}`;}
    timeEl.textContent = fmt(seconds);
    container.appendChild(wrap);
  }

  function renderNativeMindmap(container, json) {
    const dark = _wIsDark();
    const root = json.root;
    if (!root) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:12px;overflow-x:auto;';
    function buildNode(node, depth) {
      const nodeEl = document.createElement('div');
      nodeEl.style.cssText = `display:flex;flex-direction:column;margin-left:${depth*20}px;padding:6px 0;`;
      const label = document.createElement('div');
      label.style.cssText = `font-size:${depth===0?15:13}px;font-weight:${depth===0?700:500};color:${dark?'#eee':'#111'};padding:4px 8px;border-left:2px solid ${dark?'#4DA8FF':'#0866D1'};`;
      label.textContent = node.text;
      nodeEl.appendChild(label);
      (node.children||[]).forEach(child => nodeEl.appendChild(buildNode(child, depth+1)));
      return nodeEl;
    }
    wrap.appendChild(buildNode(root, 0));
    container.appendChild(wrap);
  }

  function renderNativeGraph(container, json) {
    const dark = _wIsDark();
    const points = json.points || [];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:10px;';
    const ns='http://www.w3.org/2000/svg';
    const w=300,h=160,pad=20;
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.setAttribute('width','100%'); svg.setAttribute('height',h);
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const sx=x=>pad+((x-minX)/((maxX-minX)||1))*(w-2*pad);
    const sy=y=>h-pad-((y-minY)/((maxY-minY)||1))*(h-2*pad);
    const path=document.createElementNS(ns,'path');
    let d='';
    points.forEach((p,i)=>{ d += (i===0?'M':'L') + sx(p.x) + ' ' + sy(p.y) + ' '; });
    path.setAttribute('d',d.trim());
    path.setAttribute('fill','none');
    path.setAttribute('stroke',dark?'#4DA8FF':'#0866D1');
    path.setAttribute('stroke-width','2');
    svg.appendChild(path);
    wrap.appendChild(svg);
    container.appendChild(wrap);
  }

  function renderNativeMap(container, json) {
    const dark = _wIsDark();
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:relative;width:100%;height:220px;border-radius:14px;overflow:hidden;background:${dark?'#1a1a1a':'#eee'};display:flex;align-items:center;justify-content:center;`;
    wrap.innerHTML = `<span style="font-size:13px;opacity:.6;color:${dark?'#ccc':'#555'};">Mapa: ${json.location || ''}</span>`;
    container.appendChild(wrap);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function newChat() {
    displayMessages = [];
    chatHistory = [];
    currentConvId = '';
    currentConvTitle = 'Nova conversa';
    titleGenerated = false;
    pendingAttachments = [];
    inputText = '';
    drawerOpen = false;
  }

  async function sendMessage(overrideText) {
    const text = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!text && pendingAttachments.length === 0) return;
    if (isStreaming) return;

    displayMessages = [...displayMessages, { role: 'user', content: text, attachments: pendingAttachments }];
    chatHistory = [...chatHistory, { role: 'user', content: text }];
    pendingAttachments = [];
    inputText = '';
    isStreaming = true;
    scrollToBottom();

    try {
      const response = await GeminiApiService.sendMessage({
        model: currentModelId,
        messages: chatHistory,
        flashMode,
        thinkMoreMode,
      });
      displayMessages = [...displayMessages, { role: 'assistant', content: response.text }];
      chatHistory = [...chatHistory, { role: 'assistant', content: response.text }];
    } catch (e) {
      showToast('Erro ao enviar mensagem');
    } finally {
      isStreaming = false;
      scrollToBottom();
    }
  }

  function handleTextareaInput(e) {
    inputText = e.target.value;
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      waveOverlayStream = stream;
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.start();
      isRecording = true;
      showRecOverlay = true;
      recSeconds = 0;
      recInterval = setInterval(() => { recSeconds++; }, 1000);
    } catch (e) {
      showToast('Não foi possível aceder ao microfone');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (waveOverlayStream) waveOverlayStream.getTracks().forEach(t => t.stop());
    clearInterval(recInterval);
    isRecording = false;
    showRecOverlay = false;
  }

  function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (waveOverlayStream) waveOverlayStream.getTracks().forEach(t => t.stop());
    clearInterval(recInterval);
    isRecording = false;
    showRecOverlay = false;
    audioChunks = [];
  }
</script>

<div class="chat-root" class:dark={isDark}>
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="w10 px2" on:click={() => drawerOpen = true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/line-horizontal-3.svg');-webkit-mask-image:url('/icons/svg/regular/line-horizontal-3.svg');width:22px;height:22px;background:{c.textPrimary}"></span>
    </button>
    <div class="flex1"></div>
    {#if isIncognito}
      <button class="incognito-pill" style="background:{c.surfaceApps};color:{c.textPrimary}" on:click={() => isIncognito = false}>
        Incógnito
      </button>
    {/if}
    <button class="w10 px2" on:click={newChat}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/chat-add.svg');-webkit-mask-image:url('/icons/svg/regular/chat-add.svg');width:22px;height:22px;background:{c.textPrimary}"></span>
    </button>
  </div>

  <div class="messages-wrap" bind:this={messagesEl}>
    {#if !hasMessages}
      <div class="empty-state">
        <img class="empty-logo" src="/icons/png/logo.png" alt="" />
        <h1 class="greeting" style="color:{c.textPrimary}">{greeting}</h1>
        <p class="greeting-sub" style="color:{c.textSecondary}">Como posso ajudar hoje?</p>
      </div>
    {:else}
      <div class="messages-list">
        {#each displayMessages as msg, i}
          {#if msg.role === 'user'}
            <div class="user-row">
              <div class="user-bubble" style="background:{c.surfaceApps}" on:click={() => { sheetUserMsg = msg; sheetUserIdx = i; sheetMode = 'user-msg'; showSheet = true; }}>
                {#if msg.attachments?.length}
                  <div class="att-wrap">
                    {#each msg.attachments as att}
                      <img class="att-img" src={att.url} alt="" />
                    {/each}
                  </div>
                {/if}
                <p class="user-text" style="color:{c.textPrimary}">{msg.content}</p>
              </div>
            </div>
          {:else}
            <div class="assistant-row">
              <div class="assistant-content" style="color:{c.textPrimary}">
                {@html renderMarkdown(msg.content)}
              </div>
            </div>
          {/if}
        {/each}
        {#if isStreaming}
          <div class="assistant-row">
            <div class="assistant-content cursor-blink" style="color:{c.textPrimary}"></div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="bottom-bar" class:light={!isDark} class:dark={isDark} id="bottomBar">
    {#if pendingAttachments.length}
      <div class="att-preview">
        {#each pendingAttachments as att, i}
          <div class="att-preview-item">
            <img class="att-preview-img" src={att.url} alt="" />
            <button class="att-remove" on:click={() => pendingAttachments = pendingAttachments.filter((_, idx) => idx !== i)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
    <textarea
      class="chat-input"
      class:dark={isDark}
      bind:this={textInputEl}
      bind:value={inputText}
      on:input={handleTextareaInput}
      on:keydown={handleKeydown}
      on:focus={handleInputFocus}
      placeholder="Pergunte alguma coisa..."
      rows="1"
    ></textarea>
    <div class="bb-row">
      <button class="add-btn">
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/add.svg');-webkit-mask-image:url('/icons/svg/regular/add.svg');width:20px;height:20px;background:{c.textPrimary}"></span>
      </button>
      <div class="flex1"></div>
      <button class="send-btn" style="background:{c.accentPrimary}" on:click={() => sendMessage()}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/regular/arrow-up.svg');-webkit-mask-image:url('/icons/svg/regular/arrow-up.svg');width:18px;height:18px;background:#fff"></span>
      </button>
    </div>
  </div>

  {#if drawerOpen}
    <Drawer
      {isDark}
      items={drawerMenuItems}
      apps={DRAWER_APPS}
      {conversations}
      on:close={() => drawerOpen = false}
    />
  {/if}

  {#if showSheet}
    <ModalSheet
      {isDark}
      mode={sheetMode}
      conv={sheetConv}
      userMsg={sheetUserMsg}
      on:close={() => showSheet = false}
    />
  {/if}

  {#if showRecOverlay}
    <div class="rec-overlay">
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
      <div class="rec-wave-wrap">
        <canvas bind:this={recCanvasEl} class="rec-wave-canvas"></canvas>
      </div>
      <div class="rec-top-bar">
        <button class="rec-top-btn pulse-tap" on:click={cancelRecording}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/dismiss.svg');-webkit-mask-image:url('/icons/svg/regular/dismiss.svg');width:24px;height:24px;background:{isDark ? '#F3F4F6' : '#111827'}"></span>
        </button>
        <span class="rec-timer">{recTimerStr}</span>
        <button class="rec-top-btn pulse-tap" on:click={stopRecording}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#F3F4F6' : '#111827'} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
    </div>
  {/if}

</div>

<style>
  .chat-root {
    position:fixed; left:0; right:0; top:0;
    height: calc(var(--app-vh, 100vh));
    display:flex; flex-direction:column; overflow:hidden;
    overflow-anchor:none; overscroll-behavior:none;
    background:var(--app-bg);
  }
  .chat-root.dark { background:var(--app-bg); }

  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:110px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(255,255,255,1) 0%,rgba(255,255,255,.97) 50%,rgba(255,255,255,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }

  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:calc(env(safe-area-inset-top, 0px) + 10px) 8px 0; background:transparent; }
  .incognito-pill { display:flex; align-items:center; gap:6px; padding:5px 12px 5px 10px; border-radius:16px; font-size:12px; font-weight:600; border:none; cursor:pointer; font-family:inherit; }
  .flex1 { flex:1; }
  .w10 { width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:none; border:none; }
  .px2 { padding:0 8px; }
  .circ { border-radius:10px; overflow:hidden; }

  .messages-wrap { flex:1; overflow-y:auto; overflow-x:hidden; padding-top:88px; padding-bottom:170px; -webkit-overflow-scrolling:touch; scroll-behavior:smooth; overscroll-behavior:contain; }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding-top:80px; min-height:100%; }
  .empty-logo { width:72px; height:72px; margin-bottom:16px; }
  .greeting { font-size:48px; font-weight:700; text-align:center; margin:0 0 8px; }
  .greeting-sub { font-size:16px; text-align:center; margin:0; }
  .messages-list { padding:0; }

  .user-row { padding:8px 16px; display:flex; justify-content:flex-end; }
  .user-bubble { max-width:82%; border-radius:20px; padding:12px 16px; cursor:pointer; }
  .att-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .att-img { width:84px; height:84px; object-fit:cover; border-radius:12px; }
  .att-chip { display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:10px; }
  .user-text { margin:0; font-size:14px; line-height:1.5; white-space:pre-wrap; -webkit-user-select:text; user-select:text; }

  .assistant-row { padding:8px 16px; }
  .assistant-content { font-size:14px; line-height:1.6; -webkit-user-select:text; user-select:text; }
  .assistant-content :global(.md-para) { margin:0 0 10px; }
  .assistant-content :global(.md-h1) { font-size:22px; font-weight:700; margin:16px 0 8px; }
  .assistant-content :global(.md-h2) { font-size:19px; font-weight:700; margin:14px 0 8px; }
  .assistant-content :global(.md-h3) { font-size:17px; font-weight:600; margin:12px 0 6px; }
  .assistant-content :global(.md-h4) { font-size:15px; font-weight:600; margin:10px 0 6px; }
  .assistant-content :global(.md-list) { margin:0 0 10px; padding-left:20px; }
  .assistant-content :global(.md-olist) { margin:0 0 10px; padding-left:20px; }
  .assistant-content :global(.md-li) { margin-bottom:4px; }
  .assistant-content :global(.md-blockquote) { border-left:3px solid var(--accent-primary); padding-left:12px; margin:0 0 10px; opacity:.85; }
  .assistant-content :global(.md-hr) { border:none; border-top:1px solid rgba(128,128,128,.25); margin:14px 0; }
  .assistant-content :global(.inline-code) { font-family:monospace; background:rgba(128,128,128,.15); padding:2px 5px; border-radius:4px; font-size:13px; }
  .assistant-content :global(.md-link) { color:var(--accent-primary); text-decoration:underline; }
  .assistant-content :global(.md-mark) { background:rgba(255,220,0,.35); padding:0 2px; }
  .assistant-content :global(.md-table-wrapper) { overflow-x:auto; margin:0 0 10px; }
  .assistant-content :global(.md-table) { border-collapse:collapse; width:100%; font-size:13px; }
  .assistant-content :global(.md-table th), .assistant-content :global(.md-table td) { border:1px solid rgba(128,128,128,.25); padding:6px 10px; text-align:left; }
  .assistant-content :global(.code-block-wrapper) { margin:0 0 10px; border-radius:10px; overflow:hidden; }
  .assistant-content :global(.code-block-header) { display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(128,128,128,.15); font-size:12px; }
  .assistant-content :global(.code-lang-label) { opacity:.7; text-transform:uppercase; font-size:11px; }
  .assistant-content :global(.code-copy-btn) { background:none; border:none; padding:4px; cursor:pointer; opacity:.7; }
  .assistant-content :global(.code-copy-btn:hover) { opacity:1; }
  .assistant-content :global(.code-block) { margin:0; padding:12px; overflow-x:auto; font-family:monospace; font-size:13px; line-height:1.5; background:rgba(128,128,128,.08); }
  .assistant-content :global(.math-display) { display:block; text-align:center; margin:10px 0; font-size:16px; }
  .assistant-content :global(.math-inline) { display:inline; }
  .assistant-content :global(.widget-host) { display:block; min-height:4px; }

  .cursor-blink::after { content:'|'; animation:blink 1s step-end infinite; color:var(--accent-primary); font-weight:300; }
  @keyframes blink { 50%{opacity:0} }

  .action-row { display:flex; align-items:center; gap:2px; margin-top:8px; padding-top:2px; }
  .action-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:transparent; border:none; cursor:pointer; padding:0; opacity:.65; flex-shrink:0; }
  .action-btn:hover { opacity:1; }

  .bottom-bar {
    position:absolute; bottom:0; left:16px; right:16px; z-index:50;
    margin-bottom:20px; border-radius:22px; display:flex; flex-direction:column;
    transition:background-color .3s ease, box-shadow .3s ease;
    user-select:none; overscroll-behavior:none;
    transform: translate3d(0, calc(-1 * var(--kb-offset, 0px)), 0);
    will-change: transform;
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
  .apps-popup {
    position:fixed; z-index:161;
    min-width:200px; border-radius:16px; padding:6px; overflow:hidden;
  }
  .apps-popup-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; cursor:pointer; font-size:14px; }

  .cd-overlay { position:fixed; inset:0; z-index:209; background:rgba(0,0,0,.08); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
  .cd-box { position:fixed; top:50%; left:50%; width:min(92vw,380px); transform:translate(-50%,-50%); z-index:210; border-radius:18px; padding:20px 20px 16px; box-shadow:0 12px 40px rgba(0,0,0,.28); }

  .rec-overlay { position:fixed; inset:0; z-index:300; background:var(--app-bg); display:flex; flex-direction:column; overflow:hidden; }
  .rec-top-bar { position:absolute; top:0; left:0; right:0; height:60px; display:flex; align-items:center; justify-content:space-between; padding:calc(env(safe-area-inset-top, 0px) + 10px) 20px 0; z-index:2; }
  .rec-top-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:none; border:none; }
  .rec-timer { font-size:15px; font-weight:600; font-variant-numeric:tabular-nums; }

  .rec-loader-wrap { position:absolute; left:0; right:0; bottom:28vh; display:flex; justify-content:center; pointer-events:none; z-index:1; }
  .rec-loader { --color-one:#42a5f5;--color-two:#1565c0;--color-three:#42a5f580;--color-four:#1565c080;--color-five:#42a5f540;--time-animation:2s; position:relative; border-radius:50%; box-shadow:0 0 25px 0 var(--color-three),0 20px 50px 0 var(--color-four); animation:recColorize calc(var(--time-animation)*3) ease-in-out infinite; transition:transform .05s ease-out; }
  .rec-loader::before { content:""; position:absolute; top:0; left:0; width:100px; height:100px; border-radius:50%; border-top:solid 1px var(--color-one); border-bottom:solid 1px var(--color-two); background:linear-gradient(180deg,var(--color-five),var(--color-four)); box-shadow:inset 0 10px 10px 0 var(--color-three),inset 0 -10px 10px 0 var(--color-four); }
  .rec-loader-box { width:100px; height:100px; background:linear-gradient(180deg,var(--color-one) 30%,var(--color-two) 70%); mask:url(#recClipping); -webkit-mask:url(#recClipping); }
  @keyframes recColorize { 0%{filter:hue-rotate(0deg)} 20%{filter:hue-rotate(-10deg)} 40%{filter:hue-rotate(-20deg)} 60%{filter:hue-rotate(-30deg)} 80%{filter:hue-rotate(-15deg)} 100%{filter:hue-rotate(0deg)} }
  .rec-wave-wrap { position:absolute; left:0; right:0; bottom:0; height:48vh; min-height:240px; pointer-events:none; z-index:0; }
  .rec-wave-canvas { display:block; width:100%; height:100%; }

  @media (min-width:768px) {
    .bottom-bar { left:50%; right:auto; width:600px; transform: translate3d(-50%, calc(-1 * var(--kb-offset, 0px)), 0); }
  }

  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>