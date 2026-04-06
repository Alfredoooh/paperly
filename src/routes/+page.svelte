<script>
  import { onMount, tick } from 'svelte';

  // ── State ──
  let drawerOpen = false;
  let appShifted = false;
  let a4Mode = false;
  let aiMode = false;
  let aiThinking = false;
  let aiInput = '';
  let fontLabel = 'Lora';
  let sizeLabel = '16';
  let curFont = "'Lora',Georgia,serif";
  let curSz = 16;
  let colorBarBg = '#34322d';
  let pageFocused = false;
  let baseScale = 1;

  let boldActive = false;
  let italicActive = false;
  let underlineActive = false;
  let strikeActive = false;
  let alignActive = 'left';

  let activePopup = null;
  let popupStyle = '';
  let popupArrowLeft = '50%';
  let fontSearch = '';
  let hexInput = '#34322d';
  let hexPreview = '#34322d';
  let sizeStepper = 16;

  let selMenuVisible = false;
  let selMenuStyle = '';
  let selMenuArrowX = '50%';

  let imgBarVisible = false;
  let imgBarStyle = '';
  let imgBarArrowX = '50%';
  let imgMoreVisible = false;
  let imgMoreStyle = '';
  let selImg = null;

  let pageContent;
  let canvasScroll;
  let pageWrapper;
  let pageEl;
  let topbarTitle;
  let aiInputEl;

  let savedRange = null;

  const COLORS = ['#000000','#34322d','#5e5e5b','#858481','#d1d5db','#e5e7eb','#f3f4f6','#ffffff','#dc2626','#ea580c','#d97706','#ca8a04','#65a30d','#16a34a','#0891b2','#2563eb','#4f46e5','#7c3aed','#9333ea','#db2777','#fca5a5','#fdba74','#fcd34d','#86efac','#93c5fd','#c4b5fd','#f9a8d4','#fde68a','#6ee7b7','#a5b4fc','#fbcfe8','#e9d5ff'];
  const SZP = [8,10,12,13,14,15,16,18,20,22,24,28,32,36,48,64,72];
  const FONTS = [
    {l:'Lora',v:"'Lora',Georgia,serif",g:'Serif'},{l:'Georgia',v:'Georgia,serif',g:'Serif'},{l:'Times New Roman',v:"'Times New Roman',serif",g:'Serif'},
    {l:'Playfair Display',v:"'Playfair Display',serif",g:'Serif'},{l:'Merriweather',v:"'Merriweather',serif",g:'Serif'},{l:'Source Serif 4',v:"'Source Serif 4',serif",g:'Serif'},
    {l:'PT Serif',v:"'PT Serif',serif",g:'Serif'},{l:'Libre Baskerville',v:"'Libre Baskerville',serif",g:'Serif'},{l:'EB Garamond',v:"'EB Garamond',serif",g:'Serif'},
    {l:'Crimson Text',v:"'Crimson Text',serif",g:'Serif'},{l:'Cormorant Garamond',v:"'Cormorant Garamond',serif",g:'Serif'},{l:'Noto Serif',v:"'Noto Serif',serif",g:'Serif'},
    {l:'Spectral',v:"'Spectral',serif",g:'Serif'},{l:'Zilla Slab',v:"'Zilla Slab',serif",g:'Serif'},{l:'Alegreya',v:"'Alegreya',serif",g:'Serif'},
    {l:'Vollkorn',v:"'Vollkorn',serif",g:'Serif'},{l:'Bitter',v:"'Bitter',serif",g:'Serif'},{l:'Arvo',v:"'Arvo',serif",g:'Serif'},
    {l:'Cardo',v:"'Cardo',serif",g:'Serif'},{l:'IBM Plex Serif',v:"'IBM Plex Serif',serif",g:'Serif'},
    {l:'Inter',v:"'Inter',sans-serif",g:'Sans-serif'},{l:'Open Sans',v:"'Open Sans',sans-serif",g:'Sans-serif'},{l:'Montserrat',v:"'Montserrat',sans-serif",g:'Sans-serif'},
    {l:'DM Sans',v:"'DM Sans',sans-serif",g:'Sans-serif'},{l:'Roboto',v:"'Roboto',sans-serif",g:'Sans-serif'},{l:'Nunito',v:"'Nunito',sans-serif",g:'Sans-serif'},
    {l:'Poppins',v:"'Poppins',sans-serif",g:'Sans-serif'},{l:'Raleway',v:"'Raleway',sans-serif",g:'Sans-serif'},{l:'Josefin Sans',v:"'Josefin Sans',sans-serif",g:'Sans-serif'},
    {l:'Quicksand',v:"'Quicksand',sans-serif",g:'Sans-serif'},{l:'Mulish',v:"'Mulish',sans-serif",g:'Sans-serif'},{l:'Work Sans',v:"'Work Sans',sans-serif",g:'Sans-serif'},
    {l:'Karla',v:"'Karla',sans-serif",g:'Sans-serif'},{l:'Cabin',v:"'Cabin',sans-serif",g:'Sans-serif'},{l:'Barlow',v:"'Barlow',sans-serif",g:'Sans-serif'},
    {l:'Fira Sans',v:"'Fira Sans',sans-serif",g:'Sans-serif'},{l:'Rubik',v:"'Rubik',sans-serif",g:'Sans-serif'},{l:'IBM Plex Sans',v:"'IBM Plex Sans',sans-serif",g:'Sans-serif'},
    {l:'Arial',v:'Arial,sans-serif',g:'Sans-serif'},{l:'Helvetica',v:"'Helvetica Neue',sans-serif",g:'Sans-serif'},{l:'Verdana',v:'Verdana,sans-serif',g:'Sans-serif'},
    {l:'Courier New',v:"'Courier New',monospace",g:'Monospace'},{l:'IBM Plex Mono',v:"'IBM Plex Mono',monospace",g:'Monospace'},{l:'Source Code Pro',v:"'Source Code Pro',monospace",g:'Monospace'},
    {l:'Fira Code',v:"'Fira Code',monospace",g:'Monospace'},{l:'JetBrains Mono',v:"'JetBrains Mono',monospace",g:'Monospace'},{l:'Space Mono',v:"'Space Mono',monospace",g:'Monospace'},
    {l:'Inconsolata',v:"'Inconsolata',monospace",g:'Monospace'},{l:'Ubuntu Mono',v:"'Ubuntu Mono',monospace",g:'Monospace'},
    {l:'Cinzel',v:"'Cinzel',serif",g:'Decorativa'},{l:'Abril Fatface',v:"'Abril Fatface',cursive",g:'Decorativa'},{l:'Pacifico',v:"'Pacifico',cursive",g:'Decorativa'},
    {l:'Dancing Script',v:"'Dancing Script',cursive",g:'Manuscrita'},{l:'Great Vibes',v:"'Great Vibes',cursive",g:'Manuscrita'},{l:'Sacramento',v:"'Sacramento',cursive",g:'Manuscrita'},
    {l:'Caveat',v:"'Caveat',cursive",g:'Manuscrita'},{l:'Kalam',v:"'Kalam',cursive",g:'Manuscrita'},{l:'Patrick Hand',v:"'Patrick Hand',cursive",g:'Manuscrita'},
    {l:'Indie Flower',v:"'Indie Flower',cursive",g:'Manuscrita'},{l:'Permanent Marker',v:"'Permanent Marker',cursive",g:'Manuscrita'}
  ];
  const STLS = [
    {l:'Parágrafo',cmd:'<p>',icon:'¶'},{l:'Título 1',cmd:'<h1>',icon:'H1'},{l:'Título 2',cmd:'<h2>',icon:'H2'},
    {l:'Título 3',cmd:'<h3>',icon:'H3'},{l:'Título 4',cmd:'<h4>',icon:'H4'},{l:'Citação',cmd:'<blockquote>',icon:'"'},{l:'Código',cmd:'<pre>',icon:'</>'}
  ];

  $: filteredFonts = FONTS.filter(f => f.l.toLowerCase().includes(fontSearch.toLowerCase()));

  function getEd() { return pageContent || document.querySelector('.page-content[contenteditable="true"]'); }

  function saveSel() {
    const s = window.getSelection();
    if (s && s.rangeCount > 0) savedRange = s.getRangeAt(0).cloneRange();
  }

  function restoreSel() {
    const ed = getEd();
    if (!savedRange) { if (ed) ed.focus(); return; }
    if (ed) ed.focus();
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(savedRange);
  }

  function exec(cmd, val) {
    restoreSel();
    document.execCommand(cmd, false, val || null);
    saveSel();
  }

  function openDrawer() { drawerOpen = true; appShifted = true; }
  function closeDrawer() { drawerOpen = false; appShifted = false; }
  function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

  function togglePageMode() {
    a4Mode = !a4Mode;
    closeDrawer();
    if (a4Mode) buildA4(); else destroyA4();
  }

  function buildA4() {
    const html = getEd()?.innerHTML || '';
    const wrapper = pageWrapper;
    wrapper.innerHTML = '';
    wrapper.classList.remove('scroll-mode');
    wrapper.classList.add('a4-mode');
    const p1 = mkA4Page(1, true);
    p1.querySelector('.page-content').innerHTML = html;
    wrapper.appendChild(p1);
    requestAnimationFrame(() => requestAnimationFrame(splitA4));
  }

  function mkA4Page(n, editable) {
    const w = document.createElement('div'); w.className = 'a4-page';
    const c = document.createElement('div'); c.className = 'page-content';
    if (editable) {
      c.id = 'pageContent'; c.contentEditable = 'true'; c.spellcheck = true;
      c.setAttribute('data-placeholder', 'Começa a escrever…');
      pageContent = c;
    } else { c.contentEditable = 'false'; }
    w.appendChild(c);
    const num = document.createElement('div'); num.className = 'a4-page-num'; num.textContent = n;
    w.appendChild(num);
    return w;
  }

  function splitA4() {
    [...pageWrapper.querySelectorAll('.a4-page')].forEach((p, i) => { if (i > 0) p.remove(); });
    const MAX = 1123 - 192; let pn = 1;
    let src = pageWrapper.querySelector('.page-content');
    while (src && src.scrollHeight > MAX + 8) {
      const ovf = [];
      while (src.scrollHeight > MAX + 8 && src.childNodes.length) {
        const l = src.lastChild; if (!l) break;
        ovf.unshift(l.cloneNode(true)); src.removeChild(l);
      }
      if (!ovf.length) break;
      pn++;
      const np = mkA4Page(pn, false); pageWrapper.appendChild(np);
      const nc = np.querySelector('.page-content');
      ovf.forEach(n => nc.appendChild(n)); src = nc;
    }
    bindEditorEvents(pageWrapper.querySelector('.page-content[contenteditable="true"]'));
  }

  function destroyA4() {
    let html = ''; pageWrapper.querySelectorAll('.page-content').forEach(c => { html += c.innerHTML; });
    pageWrapper.innerHTML = ''; pageWrapper.classList.remove('a4-mode'); pageWrapper.classList.add('scroll-mode');
    const pg = document.createElement('div'); pg.className = 'page'; pg.id = 'pageEl';
    const c = document.createElement('div'); c.className = 'page-content'; c.id = 'pageContent';
    c.contentEditable = 'true'; c.spellcheck = true; c.setAttribute('data-placeholder', 'Começa a escrever…');
    c.innerHTML = html; pg.appendChild(c); pageWrapper.appendChild(pg);
    pageContent = c; bindEditorEvents(c); bindImgs(c);
  }

  function applyZoom() {
    if (!canvasScroll) return;
    const a = canvasScroll.clientWidth - 32;
    baseScale = a < 794 ? a / 794 : 1;
    applyScale();
  }

  function applyScale() {
    if (!pageWrapper) return;
    const s = Math.min(baseScale * (pageFocused ? 1.15 : 1), 1);
    if (s < 1) {
      pageWrapper.style.transform = `scale(${s})`;
      pageWrapper.style.transformOrigin = 'top center';
      pageWrapper.style.marginBottom = `${(s - 1) * 1123}px`;
    } else {
      pageWrapper.style.transform = 'none';
      pageWrapper.style.marginBottom = '0';
    }
  }

  function onTitleKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); topbarTitle.blur(); } }

  function tbBold() { exec('bold'); boldActive = !boldActive; }
  function tbItalic() { exec('italic'); italicActive = !italicActive; }
  function tbUnderline() { exec('underline'); underlineActive = !underlineActive; }
  function tbStrike() { exec('strikeThrough'); strikeActive = !strikeActive; }
  function tbAlign(dir) { alignActive = dir; const m = {left:'justifyLeft',center:'justifyCenter',right:'justifyRight',justify:'justifyFull'}; exec(m[dir]); }
  function tbList() { exec('insertUnorderedList'); }
  function tbListOrdered() { exec('insertOrderedList'); }
  function tbIndent() { exec('indent'); }
  function tbOutdent() { exec('outdent'); }

  async function enterAI() {
    aiMode = true; closeDrawer();
    await tick();
    if (aiInputEl) aiInputEl.focus();
  }
  function exitAI() { aiMode = false; aiInput = ''; }
  function toggleAI() { aiMode ? exitAI() : enterAI(); }

  async function doAI() {
    const p = aiInput.trim(); if (!p) return;
    aiInput = ''; aiThinking = true;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: 'Responde APENAS com o texto a inserir no editor, sem explicações nem markdown extra. Responde em português.',
          messages: [{ role: 'user', content: p }]
        })
      });
      const d = await r.json();
      const txt = d.content?.map(i => i.text || '').join('') || '(sem resposta)';
      restoreSel(); exec('insertText', txt);
    } catch (_) { restoreSel(); exec('insertText', '[Erro IA]'); }
    aiThinking = false;
    if (aiInputEl) aiInputEl.focus();
  }

  function onAIKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); doAI(); } }
  function onConfirm() { if (aiMode) { doAI(); } else { closePopup(); const ed = getEd(); if (ed) ed.focus(); } }

  function openPopup(name, triggerEl) {
    if (activePopup === name) { closePopup(); return; }
    activePopup = name;
    fontSearch = ''; sizeStepper = curSz; hexInput = '#34322d';
    tick().then(() => positionPopup(triggerEl));
  }

  function positionPopup(triggerEl) {
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    const w = getPopupWidth();
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    const bottom = window.innerHeight - r.top + 12;
    popupStyle = `left:${left}px;bottom:${bottom}px;width:${w}px`;
    popupArrowLeft = Math.max(12, Math.min(w - 24, r.left + r.width / 2 - left - 7)) + 'px';
  }

  function getPopupWidth() {
    const ws = { 'color-text': 254, font: 230, size: 220, styles: 200, insert: 240, format: 240 };
    return ws[activePopup] || 240;
  }

  function closePopup() { activePopup = null; }

  function applyColor(c) { exec('foreColor', c); colorBarBg = c; closePopup(); }
  function applyHex() { if (/^#[0-9a-f]{6}$/i.test(hexInput)) applyColor(hexInput); }
  function onHexInput() { if (/^#[0-9a-f]{6}$/i.test(hexInput)) hexPreview = hexInput; }

  function applyFont(f) { curFont = f.v; fontLabel = f.l; exec('fontName', f.l); closePopup(); }

  function setSize(s) { sizeStepper = s; curSz = s; sizeLabel = String(s); applySize(s); }
  function sizeDown() { sizeStepper = Math.max(6, sizeStepper - 1); setSize(sizeStepper); }
  function sizeUp() { sizeStepper = Math.min(200, sizeStepper + 1); setSize(sizeStepper); }

  function applySize(sz) {
    restoreSel();
    const s = window.getSelection();
    if (!s || !s.rangeCount) return;
    const r = s.getRangeAt(0);
    if (s.isCollapsed) { const b = getBlk(r.startContainer); if (b) b.style.fontSize = sz + 'px'; return; }
    const fr = r.extractContents(); clrFs(fr);
    const sp = document.createElement('span'); sp.style.fontSize = sz + 'px'; sp.appendChild(fr); r.insertNode(sp);
    const nr = document.createRange(); nr.selectNodeContents(sp); s.removeAllRanges(); s.addRange(nr);
    savedRange = nr.cloneRange();
  }

  function getBlk(n) {
    const T = ['P','H1','H2','H3','H4','H5','H6','LI','DIV','BLOCKQUOTE','PRE','TD'];
    let e = n.nodeType === 3 ? n.parentElement : n;
    const ed = getEd();
    while (e && e !== ed) { if (T.includes(e.tagName)) return e; e = e.parentElement; }
    return ed;
  }
  function clrFs(n) { if (n.nodeType === 1) { if (n.style) n.style.fontSize = ''; n.childNodes.forEach(clrFs); } }

  function applyStyle(cmd) { exec('formatBlock', cmd); closePopup(); }

  function insertLink() { closePopup(); const u = prompt('URL:'); if (u) exec('createLink', u); }
  function insertTable() {
    closePopup();
    let h = '<table style="border-collapse:collapse;width:100%;margin:8px 0"><tbody>';
    for (let r = 0; r < 3; r++) { h += '<tr>'; for (let c = 0; c < 3; c++) h += '<td style="border:1.5px solid #ccc;padding:6px 10px;min-width:40px">&nbsp;</td>'; h += '</tr>'; }
    h += '</tbody></table><p></p>';
    exec('insertHTML', h);
  }
  function insertHr() { exec('insertHorizontalRule'); closePopup(); }
  function insertDate() { exec('insertText', new Date().toLocaleString('pt-PT')); closePopup(); }
  function insertCallout(type) {
    const cx = { warn:['#fef3c7','#f59e0b','▲'], info:['#eff6ff','#3b82f6','i'], ok:['#f0fdf4','#22c55e','✓'], err:['#fef2f2','#ef4444','✕'] };
    const [bg, br, ic] = cx[type];
    exec('insertHTML', `<div style="background:${bg};border-left:4px solid ${br};padding:12px 16px;margin:8px 0;font-size:.9em;border-radius:6px">${ic} Escreve aqui.</div><p></p>`);
    closePopup();
  }
  function insertImage() {
    closePopup();
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
    document.body.appendChild(fi);
    fi.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = ev => { exec('insertHTML', `<img src="${ev.target.result}" style="max-width:100%;height:auto"/>`); setTimeout(() => { const ed = getEd(); if (ed) wrapImgs(ed); }, 80); };
      rd.readAsDataURL(f); fi.value = ''; document.body.removeChild(fi);
    });
    fi.click();
  }

  function fmtCase(type) {
    const s = window.getSelection(); const t = s && !s.isCollapsed ? s.toString() : null;
    if (!t) { closePopup(); return; }
    const m = { upper: t.toUpperCase(), lower: t.toLowerCase(), title: t.replace(/\b\w/g, c => c.toUpperCase()) };
    exec('insertText', m[type]); closePopup();
  }
  function fmtSup() { exec('superscript'); closePopup(); }
  function fmtSub() { exec('subscript'); closePopup(); }
  function fmtCode() { exec('insertHTML', '<code style="background:#f0eeeb;padding:1px 5px;font-family:monospace;font-size:.88em;border-radius:4px">código</code>'); closePopup(); }
  function fmtLineHeight(v) { const e = getEd(); if (e) e.style.lineHeight = v; closePopup(); }
  function fmtClear() { exec('removeFormat'); closePopup(); }

  function tryShowSel() {
    const s = window.getSelection();
    if (s && !s.isCollapsed && s.toString().length > 0) {
      const r = s.getRangeAt(0).getBoundingClientRect();
      const cx = r.left + r.width / 2; const cy = r.top - 6;
      const w = 320;
      let left = cx - w / 2; left = Math.max(6, Math.min(window.innerWidth - w - 6, left));
      const top = Math.max(8, cy - 52);
      selMenuStyle = `left:${left}px;top:${top}px`;
      selMenuArrowX = (cx - left) + 'px';
      selMenuVisible = true;
    } else { selMenuVisible = false; }
  }
  function hideSel() { selMenuVisible = false; }

  async function selCut() { const s = window.getSelection(); if (s && !s.isCollapsed) { try { await navigator.clipboard.writeText(s.toString()); } catch(_){} exec('delete'); } hideSel(); }
  async function selCopy() { const s = window.getSelection(); if (s && !s.isCollapsed) { try { await navigator.clipboard.writeText(s.toString()); } catch(_){ document.execCommand('copy'); } } hideSel(); }
  async function selPaste() { hideSel(); try { const t = await navigator.clipboard.readText(); restoreSel(); exec('insertText', t); } catch(_){ const e = getEd(); if (e) e.focus(); } }
  function selAll() { const e = getEd(); if (e) { e.focus(); exec('selectAll'); } hideSel(); setTimeout(tryShowSel, 80); }
  function selBold() { exec('bold'); hideSel(); }
  function selItalic() { exec('italic'); hideSel(); }
  function selUnderline() { exec('underline'); hideSel(); }
  function selUpper() { const s = window.getSelection(); if (s && !s.isCollapsed) exec('insertText', s.toString().toUpperCase()); hideSel(); }
  function selLink() { hideSel(); const u = prompt('URL:'); if (u) exec('createLink', u); }
  function selDelete() { exec('delete'); hideSel(); }

  const HNDS = ['tl','tm','tr','ml','mr','bl','bm','br'];
  let _rd=false,_rdir='',_rw=null,_ri=null,_rx=0,_ry=0,_rW=0,_rH=0;

  function addHandles(w) {
    HNDS.forEach(d => { const h = document.createElement('div'); h.className=`hnd ${d}`; h.dataset.d=d; w.appendChild(h); });
    w.addEventListener('mousedown', e => { const h = e.target.closest('.hnd'); if (!h) return; e.preventDefault(); e.stopPropagation(); startR(h.dataset.d, e.clientX, e.clientY, w); document.addEventListener('mousemove', mvR); document.addEventListener('mouseup', endR); });
    w.addEventListener('touchstart', e => { const h = e.target.closest('.hnd'); if (!h) return; e.preventDefault(); e.stopPropagation(); const t = e.touches[0]; startR(h.dataset.d, t.clientX, t.clientY, w); document.addEventListener('touchmove', mvRT, {passive:false}); document.addEventListener('touchend', endR); }, {passive:false});
  }
  function startR(d, x, y, w) { _rd=true; _rdir=d; _rw=w; _ri=w.querySelector('img'); _rx=x; _ry=y; _rW=_ri.offsetWidth; _rH=_ri.offsetHeight; }
  function mvR(e) { doR(e.clientX, e.clientY); }
  function mvRT(e) { e.preventDefault(); doR(e.touches[0].clientX, e.touches[0].clientY); }
  function doR(cx, cy) {
    if (!_rd) return; const dx=cx-_rx, dy=cy-_ry; let nw=_rW, nh=_rH; const d=_rdir;
    if (d.includes('r')) nw=Math.max(60,_rW+dx); if (d.includes('l')) nw=Math.max(60,_rW-dx);
    if (d.includes('b')) nh=Math.max(40,_rH+dy); if (d.includes('t')) nh=Math.max(40,_rH-dy);
    if (d==='ml'||d==='mr') { _ri.style.width=nw+'px'; _ri.style.height='auto'; }
    else if (d==='tm'||d==='bm') { _ri.style.height=nh+'px'; _ri.style.width='auto'; }
    else { _ri.style.width=nw+'px'; _ri.style.height=nh+'px'; }
    if (selImg) posImgBar(selImg.querySelector('img'));
  }
  function endR() { _rd=false; document.removeEventListener('mousemove',mvR); document.removeEventListener('mouseup',endR); document.removeEventListener('touchmove',mvRT); document.removeEventListener('touchend',endR); }

  function wrapImgs(container) {
    if (!container) return;
    container.querySelectorAll('img:not([data-w])').forEach(img => {
      img.setAttribute('data-w','1'); if (img.closest('.img-w')) return;
      const w = document.createElement('span'); w.className='img-w fl-n';
      img.parentNode.insertBefore(w, img); w.appendChild(img);
      img.style.maxWidth='100%'; img.style.height='auto'; img.style.display='block';
      addHandles(w);
      w.addEventListener('click', e => { if (e.target.classList.contains('hnd')) return; e.stopPropagation(); selImgW(w); });
      w.addEventListener('touchend', e => { if (e.target.classList.contains('hnd')) return; e.stopPropagation(); selImgW(w); });
    });
  }
  function bindImgs(c) {
    if (!c) return; wrapImgs(c);
    const mo = new MutationObserver(() => wrapImgs(c));
    mo.observe(c, {childList:true, subtree:true});
  }

  function selImgW(w) {
    if (selImg && selImg !== w) deselImgW(selImg);
    selImg = w; w.classList.add('sel');
    posImgBar(w.querySelector('img')); hideSel();
    imgBarVisible = true;
  }
  function deselImgW(w) { if (!w) return; w.classList.remove('sel'); selImg=null; imgBarVisible=false; imgMoreVisible=false; }

  function posImgBar(img) {
    tick().then(() => {
      const r = img.getBoundingClientRect();
      const barEl = document.getElementById('imgBarEl');
      const w = barEl ? barEl.offsetWidth : 260;
      const cx = r.left + r.width / 2;
      let left = cx - w / 2; left = Math.max(6, Math.min(window.innerWidth - w - 6, left));
      const top = Math.max(6, r.top - (barEl?.offsetHeight || 44) - 8);
      imgBarStyle = `left:${left}px;top:${top}px`;
      imgBarArrowX = (cx - left) + 'px';
    });
  }

  function ibFloat(cls) { if (!selImg) return; selImg.classList.remove('fl-l','fl-r','fl-n'); selImg.classList.add(cls); selImg.style.display = cls==='fl-n'?'block':'inline-block'; imgBarVisible=false; }
  function ibZFront() { if (!selImg) return; selImg.style.position='relative'; selImg.style.zIndex='10'; imgBarVisible=false; }
  function ibZBack() { if (!selImg) return; selImg.style.position='relative'; selImg.style.zIndex='-1'; imgBarVisible=false; }
  function ibMore() { imgMoreVisible = !imgMoreVisible; }

  function imgMoreAction(type) {
    if (!selImg) return;
    const img = selImg.querySelector('img');
    if (type==='border') img.style.border = img.style.border ? '' : '2px solid #888';
    else if (type==='shadow') img.style.boxShadow = img.style.boxShadow ? '' : '0 4px 20px rgba(0,0,0,.3)';
    else if (type==='radius') img.style.borderRadius = img.style.borderRadius ? '' : '12px';
    else if (type==='opacity') img.style.opacity = img.style.opacity==='0.5' ? '1' : '0.5';
    else if (type==='replace') {
      const fi = document.createElement('input'); fi.type='file'; fi.accept='image/*';
      fi.addEventListener('change', e => { const f=e.target.files[0]; if (!f) return; const rd=new FileReader(); rd.onload=ev=>{img.src=ev.target.result}; rd.readAsDataURL(f); });
      fi.click();
    } else if (type==='delete') { if (selImg) { selImg.remove(); deselImgW(null); } }
    imgMoreVisible = false;
  }

  function bindEditorEvents(ed) {
    if (!ed) return;
    ed.addEventListener('focus', () => { pageFocused=true; const p=ed.closest('.page,.a4-page'); if(p)p.classList.add('focused'); applyScale(); });
    ed.addEventListener('blur', () => { pageFocused=false; const p=ed.closest('.page,.a4-page'); if(p)p.classList.remove('focused'); applyScale(); });
    ed.addEventListener('mouseup', () => setTimeout(()=>{saveSel();tryShowSel();},20));
    ed.addEventListener('touchend', () => setTimeout(()=>{saveSel();tryShowSel();},120));
    ed.addEventListener('keyup', saveSel);
    ed.addEventListener('contextmenu', e => e.preventDefault());
    ed.style.webkitUserSelect='text'; ed.style.userSelect='text'; ed.style.cursor='text';
    bindImgs(ed);
  }

  function onCanvasClick(e) {
    if (!e.target.closest('.img-w') && !e.target.closest('#imgBarEl') && !e.target.closest('.img-more-pop')) deselImgW(selImg);
    if (!e.target.closest('.img-more-pop')) imgMoreVisible=false;
  }

  onMount(() => {
    applyZoom();
    window.addEventListener('resize', applyZoom);
    new ResizeObserver(applyZoom).observe(canvasScroll);
    if (pageContent) bindEditorEvents(pageContent);
    document.addEventListener('mousedown', e => { if (!e.target.closest('.sel-menu') && !e.target.closest('#imgBarEl')) hideSel(); });
    document.addEventListener('touchstart', e => { if (!e.target.closest('.sel-menu') && !e.target.closest('#imgBarEl')) hideSel(); }, {passive:true});
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.querySelector('.floating-toolbar')?.addEventListener('mousedown', e => e.preventDefault());
    return () => window.removeEventListener('resize', applyZoom);
  });
</script>

<!-- ── Drawer ── -->
<div class="drawer" class:open={drawerOpen}>
  <div class="drawer-head">
    <div class="drawer-head-title">Funcionalidades</div>
  </div>
  <div class="drawer-body">
    <div class="drawer-section">
      <button class="drawer-item" class:active={aiMode} on:click={toggleAI}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>{aiMode ? 'IA activa' : 'Toolbar / IA'}</span>
      </button>
      <button class="drawer-item" class:active={a4Mode} on:click={togglePageMode}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Formato: {a4Mode ? 'A4' : 'Scroll'}</span>
      </button>
    </div>
  </div>
</div>

<div class="overlay" class:show={drawerOpen} on:click={closeDrawer} role="presentation"></div>

<div class="app" class:shifted={appShifted}>
  <div class="topbar">
    <div class="topbar-left">
      <button class="icon-btn" on:click={toggleDrawer}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="topbar-title" bind:this={topbarTitle} contenteditable="true" spellcheck="false" data-placeholder="Sem título" on:keydown={onTitleKeydown} on:contextmenu|preventDefault role="textbox" aria-label="Título"></div>
    <div class="topbar-right">
      <button class="icon-btn" on:click={() => exec('undo')}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M3 13C5.33 7.67 9 5 14 5c4 0 7 2 8.5 6"/></svg>
      </button>
      <button class="icon-btn" on:click={() => exec('redo')}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M21 13C18.67 7.67 15 5 10 5c-4 0-7 2-8.5 6"/></svg>
      </button>
    </div>
  </div>

  <div class="canvas-scroll" bind:this={canvasScroll} on:click={onCanvasClick} role="presentation">
    <div class="page-wrapper scroll-mode" bind:this={pageWrapper}>
      <div class="page" bind:this={pageEl}>
        <div class="page-content" bind:this={pageContent} contenteditable="true" spellcheck="true" data-placeholder="Começa a escrever…"></div>
      </div>
    </div>
  </div>
</div>

<nav class="floating-toolbar">
  <div class="toolbar-pill" class:ai-mode={aiMode}>
    {#if aiMode}
      <div class="ai-input-row">
        <input class="ai-input" bind:this={aiInputEl} bind:value={aiInput} placeholder="Pergunta à IA…" autocomplete="off" on:keydown={onAIKeydown} />
        {#if aiThinking}
          <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
        {/if}
      </div>
    {:else}
      <div class="toolbar-track">
        <button class="tb-btn btn-A" on:mousedown|preventDefault on:click={e => openPopup('color-text', e.currentTarget)}>
          <span class="lbl">A</span><div class="bar" style="background:{colorBarBg}"></div>
        </button>
        <div class="tb-div"></div>
        <button class="tb-btn btn-B" class:active={boldActive} on:click={tbBold}><span>B</span></button>
        <button class="tb-btn btn-I" class:active={italicActive} on:click={tbItalic}><span>I</span></button>
        <button class="tb-btn btn-U" class:active={underlineActive} on:click={tbUnderline}><span>U</span></button>
        <button class="tb-btn btn-S" class:active={strikeActive} on:click={tbStrike}><span>S</span></button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='font'} on:mousedown|preventDefault on:click={e => openPopup('font', e.currentTarget)}>
          <span>{fontLabel}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button class="tb-chip" style="margin-left:3px" class:open={activePopup==='size'} on:mousedown|preventDefault on:click={e => openPopup('size', e.currentTarget)}>
          <span>{sizeLabel}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='styles'} on:mousedown|preventDefault on:click={e => openPopup('styles', e.currentTarget)}>
          <span>Estilos</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="tb-div"></div>
        <button class="tb-btn" class:active={alignActive==='left'} on:click={() => tbAlign('left')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
        </button>
        <button class="tb-btn" class:active={alignActive==='center'} on:click={() => tbAlign('center')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>
        </button>
        <button class="tb-btn" class:active={alignActive==='right'} on:click={() => tbAlign('right')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
        </button>
        <button class="tb-btn" class:active={alignActive==='justify'} on:click={() => tbAlign('justify')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
        </button>
        <div class="tb-div"></div>
        <button class="tb-btn" on:click={tbList}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="tb-btn" on:click={tbListOrdered}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </button>
        <button class="tb-btn" on:click={tbIndent}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="9 12 12 14 15 12"/></svg>
        </button>
        <button class="tb-btn" on:click={tbOutdent}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="15 12 12 10 9 12"/></svg>
        </button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='insert'} on:mousedown|preventDefault on:click={e => openPopup('insert', e.currentTarget)}>
          <span>Inserir</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div class="tb-div"></div>
        <button class="tb-chip" class:open={activePopup==='format'} on:mousedown|preventDefault on:click={e => openPopup('format', e.currentTarget)}>
          <span>Formatar</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>
        </button>
      </div>
    {/if}
    <button class="btn-confirm" class:mode-check={!aiMode} class:mode-send={aiMode} on:mousedown|preventDefault on:click={onConfirm}>
      {#if aiThinking}
        <div class="ai-thinking"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
      {:else if aiMode}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"/></svg>
      {/if}
    </button>
  </div>
</nav>

{#if activePopup}
  <div class="popup-mask" on:click={closePopup} role="presentation"></div>
  <div class="popup-card" style={popupStyle}>
    <div class="popup-inner">
      {#if activePopup === 'color-text'}
        <div class="popup-header">Cor do texto</div>
        <div class="color-grid">
          {#each COLORS as c}
            <div class="color-swatch" style="background:{c};{c==='#ffffff'?'border:2px solid rgba(0,0,0,.15)':''}" on:mousedown|preventDefault on:click={() => applyColor(c)} role="button" tabindex="0" on:keydown={e => e.key==='Enter' && applyColor(c)}></div>
          {/each}
        </div>
        <div class="hex-row">
          <div style="width:26px;height:26px;background:{hexPreview};border-radius:6px;border:1.5px solid rgba(0,0,0,.12);flex-shrink:0"></div>
          <input class="hex-input" bind:value={hexInput} maxlength="7" on:input={onHexInput} />
          <button class="hex-apply" on:mousedown|preventDefault on:click={applyHex}>✓</button>
        </div>
      {:else if activePopup === 'font'}
        <div class="popup-header">Tipo de letra</div>
        <div class="font-search"><input placeholder="Pesquisar…" bind:value={fontSearch} /></div>
        <div class="font-list">
          {#each filteredFonts as f}
            <button class="font-item" class:active={f.v === curFont} on:mousedown|preventDefault on:click={() => applyFont(f)}>
              <span style="font-family:{f.v};font-size:14px;flex:1">{f.l}</span>
            </button>
          {/each}
        </div>
      {:else if activePopup === 'size'}
        <div class="popup-header">Tamanho</div>
        <div class="size-stepper">
          <button class="step-btn" on:mousedown|preventDefault on:click={sizeDown}>−</button>
          <div class="step-val">{sizeStepper}</div>
          <button class="step-btn" on:mousedown|preventDefault on:click={sizeUp}>+</button>
        </div>
        <div class="size-presets">
          {#each SZP as s}
            <button class="size-preset" class:active={s === curSz} on:mousedown|preventDefault on:click={() => { setSize(s); closePopup(); }}>{s}</button>
          {/each}
        </div>
      {:else if activePopup === 'styles'}
        <div class="popup-header">Estilo de parágrafo</div>
        {#each STLS as s}
          <button class="style-item" on:mousedown|preventDefault on:click={() => applyStyle(s.cmd)}>
            <span style="font-size:13px;color:var(--text-muted);width:15px">{s.icon}</span>
            <span>{s.l}</span>
          </button>
        {/each}
      {:else if activePopup === 'insert'}
        <div class="popup-header">Inserir</div>
        <div class="popup-section">
          <button class="popup-item" on:mousedown|preventDefault on:click={insertLink}>🔗 Link</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertImage}>🖼 Imagem</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertTable}>⊞ Tabela 3×3</button>
        </div>
        <div class="popup-section">
          <button class="popup-item" on:mousedown|preventDefault on:click={insertHr}>— Linha divisória</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={insertDate}>📅 Data e hora</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Caixas de destaque</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('warn')}>▲ Aviso</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('info')}>i Informação</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('ok')}>✓ Sucesso</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => insertCallout('err')}>✕ Erro</button>
        </div>
      {:else if activePopup === 'format'}
        <div class="popup-header">Formatar</div>
        <div class="popup-section">
          <div class="popup-section-label">Maiúsculas</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('upper')}>MAIÚSCULAS</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('lower')}>minúsculas</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtCase('title')}>Primeira Maiúscula</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Inline</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtSup}>X² Sobrescrito</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtSub}>X₂ Subscrito</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={fmtCode}>&lt;/&gt; Código inline</button>
        </div>
        <div class="popup-section">
          <div class="popup-section-label">Espaçamento de linha</div>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('1')}>1.0 — Compacto</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('1.5')}>1.5 — Normal</button>
          <button class="popup-item" on:mousedown|preventDefault on:click={() => fmtLineHeight('2')}>2.0 — Espaçado</button>
        </div>
        <div class="popup-section">
          <button class="popup-item danger" on:mousedown|preventDefault on:click={fmtClear}>🗑 Limpar formatação</button>
        </div>
      {/if}
    </div>
    <div class="popup-arrow" style="left:{popupArrowLeft}"></div>
  </div>
{/if}

{#if selMenuVisible}
  <div class="sel-menu" class:show={selMenuVisible} style="{selMenuStyle};--ax:{selMenuArrowX}">
    <div class="sel-row">
      <button class="sel-btn" on:mousedown|preventDefault on:click={selCut}>✂ Cortar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selCopy}>⎘ Copiar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selPaste}>📋 Colar</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selAll}>☐ Sel. tudo</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selBold}><strong>B</strong></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selItalic}><em>I</em></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selUnderline}><u>U</u></button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selUpper}>AA</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selLink}>🔗 Link</button>
      <button class="sel-btn" on:mousedown|preventDefault on:click={selDelete}>🗑 Apagar</button>
    </div>
  </div>
{/if}

{#if imgBarVisible}
  <div class="img-bar" id="imgBarEl" style="{imgBarStyle};--ax:{imgBarArrowX}">
    <div class="ib-row">
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-n')}>Inline</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-l')}>Esq.</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={() => ibFloat('fl-r')}>Dir.</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={ibZFront}>Frente</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={ibZBack}>Atrás</button>
      <button class="ib-btn" on:mousedown|preventDefault on:click={ibMore}>···</button>
    </div>
  </div>
{/if}

{#if imgMoreVisible}
  <div class="img-more-pop" style={imgMoreStyle}>
    <div class="popup-header">Imagem</div>
    <div class="popup-section">
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('border')}>□ Borda</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('shadow')}>◫ Sombra</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('radius')}>○ Arredondado</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('opacity')}>◑ Opacidade 50%</button>
      <button class="popup-item" on:mousedown|preventDefault on:click={() => imgMoreAction('replace')}>🖼 Substituir</button>
      <button class="popup-item danger" on:mousedown|preventDefault on:click={() => imgMoreAction('delete')}>🗑 Apagar imagem</button>
    </div>
  </div>
{/if}