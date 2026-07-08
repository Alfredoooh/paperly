<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Calendar';
  export let appId = 'calendar';
  export let iconPath = '/icons/svg/calendar.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // ── Entrada da página ────────────────────────────────────────────
  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  // ── Rubber-band scroll (idêntico ao AppsModelos) ─────────────────
  let bodyEl;
  let bodyInnerEl;
  let touchStartY = 0;
  let pullOriginY = null;
  let isPulling = false;

  function dampen(delta) {
    const sign = delta < 0 ? -1 : 1;
    const abs = Math.abs(delta);
    return sign * (abs * 0.6) / (1 + abs / 110);
  }

  function resetPull(animate = true) {
    isPulling = false;
    pullOriginY = null;
    if (bodyInnerEl) {
      bodyInnerEl.style.transition = animate
        ? 'transform .48s cubic-bezier(0.16,1.35,0.3,1)'
        : 'none';
      bodyInnerEl.style.transform = 'translateY(0px)';
    }
  }

  function onTouchStart(e) { touchStartY = e.touches[0].clientY; }

  function onTouchMove(e) {
    if (!bodyEl || !bodyInnerEl) return;
    const y = e.touches[0].clientY;
    const st = bodyEl.scrollTop;
    const maxScroll = bodyEl.scrollHeight - bodyEl.clientHeight;
    const atTop = st <= 0;
    const atBottom = st >= maxScroll - 1;
    const draggingDown = y - touchStartY > 0;
    const draggingUp   = y - touchStartY < 0;
    if ((atTop && draggingDown) || (atBottom && draggingUp)) {
      if (!isPulling) {
        isPulling = true;
        pullOriginY = y;
        bodyInnerEl.style.transition = 'none';
      }
      const raw = y - pullOriginY;
      const valid = atTop ? Math.max(raw, 0) : Math.min(raw, 0);
      bodyInnerEl.style.transform = `translateY(${dampen(valid)}px)`;
      if (Math.abs(dampen(valid)) > 0.5) e.preventDefault();
    } else if (isPulling) {
      resetPull(false);
    }
  }

  function onTouchEnd() { if (isPulling) resetPull(true); }

  // ── Tab bar com indicador animado (idêntico ao AppsModelos) ──────
  const VIEWS = [
    { id: 'month',  label: 'Mês' },
    { id: 'week',   label: 'Semana' },
    { id: 'day',    label: 'Dia' },
    { id: 'agenda', label: 'Agenda' },
  ];

  let currentView = 'month';
  let tabsWrapEl;
  let tabRefs = {};
  let indicatorX = 0;
  let indicatorWidth = 0;
  let indicatorReady = false;

  function updateIndicator() {
    const btn = tabRefs[currentView];
    if (!btn || !tabsWrapEl) return;
    const wrapRect = tabsWrapEl.getBoundingClientRect();
    const btnRect  = btn.getBoundingClientRect();
    indicatorX = btnRect.left - wrapRect.left;
    indicatorWidth = btnRect.width;
    indicatorReady = true;
  }

  function setView(v) {
    currentView = v;
    if (v === 'month') viewDate = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
    resetPull(false);
  }

  $: if (currentView && tabsWrapEl) tick().then(updateIndicator);

  onMount(() => {
    tick().then(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  });

  // ── Datas ────────────────────────────────────────────────────────
  const now = new Date();
  let viewDate   = new Date(now.getFullYear(), now.getMonth(), 1);
  let selectedDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Eventos ─────────────────────────────────────────────────────
  const STORAGE_KEY = 'nexa_calendar_events';
  let events = [];

  onMount(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) events = JSON.parse(r); } catch(e) {}
  });

  function saveEvents() { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }

  // ── Cores de evento ──────────────────────────────────────────────
  const EVENT_COLORS = [
    { value: '#4285F4', label: 'Azul' },
    { value: '#0F9D58', label: 'Verde' },
    { value: '#DB4437', label: 'Vermelho' },
    { value: '#F4B400', label: 'Amarelo' },
    { value: '#9C27B0', label: 'Roxo' },
    { value: '#FF6D00', label: 'Laranja' },
    { value: '#00ACC1', label: 'Ciano' },
    { value: '#E91E63', label: 'Rosa' },
  ];

  const REPEAT_OPTIONS = [
    { value: 'none',    label: 'Não repetir' },
    { value: 'daily',   label: 'Todos os dias' },
    { value: 'weekly',  label: 'Todas as semanas' },
    { value: 'monthly', label: 'Todos os meses' },
    { value: 'yearly',  label: 'Todos os anos' },
  ];

  // ── Modal ────────────────────────────────────────────────────────
  let showModal = false;
  let editingEvent = null;
  let modalVisible = false;

  function blankEvent(dateStr) {
    const h = now.getHours();
    const pad = n => String(n).padStart(2,'0');
    return {
      id: Date.now() + Math.random(),
      title: '', date: dateStr || toDateStr(selectedDay),
      startTime: `${pad(h)}:00`, endTime: `${pad(h+1<24?h+1:h)}:00`,
      allDay: false, color: EVENT_COLORS[0].value,
      description: '', location: '', repeat: 'none',
    };
  }

  let form = blankEvent();

  function openNewEvent(dateStr) {
    form = blankEvent(dateStr);
    editingEvent = null;
    showModal = true;
    requestAnimationFrame(() => { modalVisible = true; });
  }

  function openEditEvent(ev) {
    form = { ...ev };
    editingEvent = ev;
    showModal = true;
    requestAnimationFrame(() => { modalVisible = true; });
  }

  function closeModal() {
    modalVisible = false;
    setTimeout(() => { showModal = false; editingEvent = null; }, 320);
  }

  function saveEvent() {
    if (!form.title.trim()) { showToast('Insere um título'); return; }
    if (editingEvent) {
      events = events.map(e => e.id === editingEvent.id ? { ...form } : e);
      showToast('Evento atualizado');
    } else {
      events = [...events, { ...form }];
      showToast('Evento criado');
    }
    saveEvents();
    closeModal();
  }

  function deleteEvent(id) {
    events = events.filter(e => e.id !== id);
    saveEvents();
    closeModal();
    closeDetail();
    showToast('Evento eliminado');
  }

  // ── Detalhe ──────────────────────────────────────────────────────
  let detailEvent  = null;
  let detailVisible = false;

  function openDetail(ev) {
    detailEvent = ev;
    requestAnimationFrame(() => { detailVisible = true; });
  }

  function closeDetail() {
    detailVisible = false;
    setTimeout(() => { detailEvent = null; }, 320);
  }

  // ── Utilitários ─────────────────────────────────────────────────
  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function parseDate(s) { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
  function isSameDay(a,b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
  function isToday(d) { return isSameDay(d,now); }

  function eventsOnDate(d) {
    const str = toDateStr(d);
    return events.filter(ev => {
      if (ev.date === str) return true;
      const base = parseDate(ev.date);
      if (base > d) return false;
      if (ev.repeat==='daily')   return true;
      if (ev.repeat==='weekly')  return base.getDay()===d.getDay();
      if (ev.repeat==='monthly') return base.getDate()===d.getDate();
      if (ev.repeat==='yearly')  return base.getMonth()===d.getMonth()&&base.getDate()===d.getDate();
      return false;
    }).sort((a,b) => {
      if (a.allDay&&!b.allDay) return -1;
      if (!a.allDay&&b.allDay) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  function fmtTime(t) {
    if (!t) return '';
    const [h,m] = t.split(':').map(Number);
    return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
  }

  const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const PT_DAYS_FULL  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const PT_MONTHS     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // ── Vista Mensal ─────────────────────────────────────────────────
  $: monthDays = (() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    start.setDate(1 - start.getDay());
    return Array.from({length:42}, (_, i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
  })();

  function prevMonth() { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); }
  function nextMonth() { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); }

  // ── Vista Semanal ────────────────────────────────────────────────
  $: weekDays = (() => {
    const d = new Date(selectedDay); d.setDate(d.getDate()-d.getDay());
    return Array.from({length:7}, (_,i) => { const x=new Date(d); x.setDate(d.getDate()+i); return x; });
  })();

  function prevWeek() { const d=new Date(selectedDay); d.setDate(d.getDate()-7); selectedDay=d; viewDate=new Date(d.getFullYear(),d.getMonth(),1); }
  function nextWeek() { const d=new Date(selectedDay); d.setDate(d.getDate()+7); selectedDay=d; viewDate=new Date(d.getFullYear(),d.getMonth(),1); }

  // ── Vista Diária ─────────────────────────────────────────────────
  const HOURS = Array.from({length:24}, (_,i)=>i);
  $: dayEvs    = eventsOnDate(selectedDay);
  $: allDayEvs = dayEvs.filter(e=>e.allDay);
  $: timedEvs  = dayEvs.filter(e=>!e.allDay);

  function prevDay() { const d=new Date(selectedDay); d.setDate(d.getDate()-1); selectedDay=d; viewDate=new Date(d.getFullYear(),d.getMonth(),1); }
  function nextDay() { const d=new Date(selectedDay); d.setDate(d.getDate()+1); selectedDay=d; viewDate=new Date(d.getFullYear(),d.getMonth(),1); }

  let dayScrollEl;
  $: if (currentView==='day'&&dayScrollEl) setTimeout(()=>{ dayScrollEl.scrollTop=Math.max(0,(now.getHours()-1)*60); },60);

  function openNewDayHour(h) {
    const pad=n=>String(n).padStart(2,'0');
    form=blankEvent(toDateStr(selectedDay));
    form.startTime=`${pad(h)}:00`; form.endTime=`${pad(h+1<24?h+1:h)}:00`;
    editingEvent=null; showModal=true;
    requestAnimationFrame(()=>{ modalVisible=true; });
  }

  // ── Vista Agenda ─────────────────────────────────────────────────
  $: agendaDays = (() => {
    const base=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const result=[];
    for(let i=0;i<60;i++){
      const d=new Date(base); d.setDate(base.getDate()+i);
      const evs=eventsOnDate(d);
      if(evs.length) result.push({date:d,evs});
    }
    return result;
  })();

  // ── Navegação ────────────────────────────────────────────────────
  $: navLabel = (() => {
    if (currentView==='month') return `${PT_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    if (currentView==='week') {
      const f=weekDays[0],l=weekDays[6];
      if (f.getMonth()===l.getMonth()) return `${f.getDate()}–${l.getDate()} ${PT_MONTHS[f.getMonth()]} ${f.getFullYear()}`;
      return `${f.getDate()} ${PT_MONTHS[f.getMonth()].slice(0,3)} – ${l.getDate()} ${PT_MONTHS[l.getMonth()].slice(0,3)} ${l.getFullYear()}`;
    }
    if (currentView==='day') return `${PT_DAYS_FULL[selectedDay.getDay()]}, ${selectedDay.getDate()} ${PT_MONTHS[selectedDay.getMonth()]}`;
    return 'Agenda';
  })();

  function prev() {
    if (currentView==='month') prevMonth();
    else if (currentView==='week') prevWeek();
    else if (currentView==='day') prevDay();
  }
  function next() {
    if (currentView==='month') nextMonth();
    else if (currentView==='week') nextWeek();
    else if (currentView==='day') nextDay();
  }

  function goToday() {
    const t=new Date();
    viewDate=new Date(t.getFullYear(),t.getMonth(),1);
    selectedDay=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  }
</script>

<!-- ══════════════════════════════════════════════════════════════════
     ROOT — mesma animação de entrada do AppsModelos
═══════════════════════════════════════════════════════════════════ -->
<div class="cal-root" class:cal-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary}">

  <!-- ── HEADER ────────────────────────────────────────────────── -->
  <div class="cal-header">
    <button class="cal-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'home'})}>
      <span class="icon-mask"
        style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>

    <div class="cal-nav">
      <button class="cal-nav-arrow" on:click={prev}>
        <span class="icon-mask"
          style="mask-image:url('/icons/svg/chevron_left.svg');-webkit-mask-image:url('/icons/svg/chevron_left.svg');background:{c.iconTint};width:18px;height:18px"></span>
      </button>
      <button class="cal-nav-label-btn" on:click={goToday}>
        <span class="cal-nav-label" style="color:{c.textPrimary}">{navLabel}</span>
      </button>
      <button class="cal-nav-arrow" on:click={next}>
        <span class="icon-mask"
          style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{c.iconTint};width:18px;height:18px"></span>
      </button>
    </div>

    <button class="cal-today-pill" style="background:{c.primary}" on:click={goToday}>
      <span class="cal-today-pill-num">{now.getDate()}</span>
    </button>
  </div>

  <!-- ── CORPO SCROLLÁVEL com rubber-band ──────────────────────── -->
  <div class="cal-body" bind:this={bodyEl}
    on:touchstart={onTouchStart}
    on:touchmove|nonpassive={onTouchMove}
    on:touchend={onTouchEnd}
    on:touchcancel={onTouchEnd}>
    <div class="cal-body-inner" bind:this={bodyInnerEl}>

      <!-- ════════════════════════════════════════════════════════
           VISTA MENSAL
      ═════════════════════════════════════════════════════════ -->
      {#if currentView === 'month'}
        <div class="month-wrap">
          <!-- Cabeçalho dias da semana -->
          <div class="week-header-row">
            {#each PT_DAYS_SHORT as d, i}
              <div class="wh-cell" style="color:{i===0||i===6?'#FF3B30':c.textSecondary}">{d}</div>
            {/each}
          </div>
          <!-- Grelha 6×7 -->
          <div class="month-grid">
            {#each monthDays as day, idx}
              {@const inMonth = day.getMonth()===viewDate.getMonth()}
              {@const todayFlag = isToday(day)}
              {@const dayEvs2 = eventsOnDate(day)}
              <button class="month-cell"
                style="border-right:{((idx+1)%7===0)?'none':'0.5px solid '+c.divider};border-bottom:0.5px solid {c.divider}"
                on:click={() => { selectedDay=new Date(day); if(!inMonth) viewDate=new Date(day.getFullYear(),day.getMonth(),1); }}
                on:dblclick={() => openNewEvent(toDateStr(day))}>
                <div class="month-cell-inner" style="opacity:{inMonth?1:0.28}">
                  <div class="day-num-wrap">
                    <span class="day-num"
                      style="background:{todayFlag?c.primary:'transparent'};color:{todayFlag?'#fff':(day.getDay()===0||day.getDay()===6?'#FF3B30':c.textPrimary)}">
                      {day.getDate()}
                    </span>
                  </div>
                  {#each dayEvs2.slice(0,3) as ev}
                    <div class="month-ev"
                      style="background:{ev.color}22;border-left:2.5px solid {ev.color};color:{ev.color}"
                      role="button" tabindex="0"
                      on:click|stopPropagation={() => openDetail(ev)}
                      on:keydown={e=>e.key==='Enter'&&openDetail(ev)}>
                      <span class="month-ev-txt">{ev.allDay?'':fmtTime(ev.startTime)+' '}{ev.title}</span>
                    </div>
                  {/each}
                  {#if dayEvs2.length>3}
                    <div class="more-badge" style="color:{c.textSecondary}">+{dayEvs2.length-3}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>

      <!-- ════════════════════════════════════════════════════════
           VISTA SEMANAL
      ═════════════════════════════════════════════════════════ -->
      {:else if currentView === 'week'}
        <div class="week-wrap">
          <div class="week-cols-header" style="border-bottom:0.5px solid {c.divider}">
            <div class="time-gutter"></div>
            {#each weekDays as d}
              {@const todayFlag = isToday(d)}
              <button class="wcol-head"
                on:click={() => { selectedDay=new Date(d); setView('day'); }}>
                <div class="wday-name" style="color:{d.getDay()===0||d.getDay()===6?'#FF3B30':c.textSecondary}">{PT_DAYS_SHORT[d.getDay()]}</div>
                <div class="wday-num"
                  style="background:{todayFlag?c.primary:'transparent'};color:{todayFlag?'#fff':(d.getDay()===0||d.getDay()===6?'#FF3B30':c.textPrimary)}">
                  {d.getDate()}
                </div>
              </button>
            {/each}
          </div>
          <div class="week-scroll-area">
            {#each HOURS as h}
              <div class="hour-row" style="border-top:0.5px solid {c.divider}">
                <div class="hour-label" style="color:{c.textSecondary}">{h===0?'':String(h).padStart(2,'0')+':00'}</div>
                {#each weekDays as d}
                  {@const colEvs=eventsOnDate(d).filter(e=>!e.allDay&&parseInt(e.startTime)===h)}
                  <button class="week-cell" on:dblclick={() => openNewEvent(toDateStr(d))}>
                    {#each colEvs as ev}
                      <div class="week-ev"
                        style="background:{ev.color}28;border-left:3px solid {ev.color};color:{ev.color}"
                        role="button" tabindex="0"
                        on:click|stopPropagation={() => openDetail(ev)}
                        on:keydown={e=>e.key==='Enter'&&openDetail(ev)}>
                        <span class="week-ev-title">{ev.title}</span>
                        <span class="week-ev-time">{fmtTime(ev.startTime)}</span>
                      </div>
                    {/each}
                    {#if isToday(d)&&now.getHours()===h}
                      <div class="now-bar" style="background:{c.primary};top:{now.getMinutes()/60*100}%">
                        <div class="now-dot" style="background:{c.primary}"></div>
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/each}
          </div>
        </div>

      <!-- ════════════════════════════════════════════════════════
           VISTA DIÁRIA
      ═════════════════════════════════════════════════════════ -->
      {:else if currentView === 'day'}
        <div class="day-wrap" bind:this={dayScrollEl}>
          {#if allDayEvs.length}
            <div class="allday-strip" style="border-bottom:0.5px solid {c.divider}">
              <div class="hour-label" style="color:{c.textSecondary};font-size:9px">Dia<br>todo</div>
              <div class="allday-evs">
                {#each allDayEvs as ev}
                  <button class="allday-ev"
                    style="background:{ev.color}22;border-left:3px solid {ev.color};color:{ev.color}"
                    on:click|stopPropagation={() => openDetail(ev)}>{ev.title}</button>
                {/each}
              </div>
            </div>
          {/if}
          {#each HOURS as h}
            {@const hEvs = timedEvs.filter(e=>parseInt(e.startTime)===h)}
            <div class="hour-row day-hour-row" style="border-top:0.5px solid {c.divider}">
              <div class="hour-label" style="color:{c.textSecondary}">{h===0?'':String(h).padStart(2,'0')+':00'}</div>
              <button class="day-hour-cell" on:dblclick={() => openNewDayHour(h)}>
                {#each hEvs as ev}
                  <div class="day-ev"
                    style="background:{ev.color}1A;border-left:4px solid {ev.color};color:{ev.color}"
                    role="button" tabindex="0"
                    on:click|stopPropagation={() => openDetail(ev)}
                    on:keydown={e=>e.key==='Enter'&&openDetail(ev)}>
                    <div class="day-ev-title">{ev.title}</div>
                    <div class="day-ev-time">{fmtTime(ev.startTime)} – {fmtTime(ev.endTime)}</div>
                    {#if ev.location}<div class="day-ev-loc">📍 {ev.location}</div>{/if}
                  </div>
                {/each}
                {#if isToday(selectedDay)&&now.getHours()===h}
                  <div class="now-bar" style="background:{c.primary};top:{now.getMinutes()/60*100}%">
                    <div class="now-dot" style="background:{c.primary}"></div>
                  </div>
                {/if}
              </button>
            </div>
          {/each}
        </div>

      <!-- ════════════════════════════════════════════════════════
           VISTA AGENDA
      ═════════════════════════════════════════════════════════ -->
      {:else if currentView === 'agenda'}
        {#if agendaDays.length === 0}
          <div class="empty-state" style="color:{c.textSecondary}">
            <span class="icon-mask empty-icon"
              style="mask-image:url('/icons/svg/calendar.svg');-webkit-mask-image:url('/icons/svg/calendar.svg');background:{c.textSecondary}"></span>
            <p>Sem eventos nos próximos 60 dias</p>
            <button class="empty-cta" style="background:{c.primary};color:#fff"
              on:click={() => openNewEvent(toDateStr(selectedDay))}>
              <span class="icon-mask"
                style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:#fff;width:14px;height:14px"></span>
              Criar evento
            </button>
          </div>
        {:else}
          {#each agendaDays as { date, evs }}
            <div class="agenda-day">
              <div class="agenda-day-hdr" style="background:{c.background}">
                <span class="agenda-day-name" style="color:{isToday(date)?c.primary:c.textSecondary}">{PT_DAYS_SHORT[date.getDay()]}</span>
                <span class="agenda-day-num"
                  style="background:{isToday(date)?c.primary:'transparent'};color:{isToday(date)?'#fff':c.textPrimary}">{date.getDate()}</span>
                <span class="agenda-month-label" style="color:{c.textSecondary}">{PT_MONTHS[date.getMonth()].slice(0,3)}</span>
                {#if isToday(date)}<span class="today-badge" style="background:{c.primary};color:#fff">Hoje</span>{/if}
              </div>
              {#each evs as ev}
                <button class="agenda-ev"
                  style="border-left:4px solid {ev.color};background:{ev.color}0F"
                  on:click={() => openDetail(ev)}>
                  <div class="agenda-ev-dot" style="background:{ev.color}"></div>
                  <div class="agenda-ev-body">
                    <div class="agenda-ev-title" style="color:{c.textPrimary}">{ev.title}</div>
                    <div class="agenda-ev-meta" style="color:{c.textSecondary}">
                      {ev.allDay?'Todo o dia':`${fmtTime(ev.startTime)} – ${fmtTime(ev.endTime)}`}
                      {#if ev.location} · 📍 {ev.location}{/if}
                    </div>
                    {#if ev.description}<div class="agenda-ev-desc" style="color:{c.textSecondary}">{ev.description}</div>{/if}
                  </div>
                  <span class="icon-mask agenda-ev-arrow"
                    style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{c.textSecondary}"></span>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      {/if}

    </div><!-- /cal-body-inner -->
  </div><!-- /cal-body -->

  <!-- ── FAB (idêntico ao estilo Modelos) ──────────────────────── -->
  <button class="fab" style="background:{c.primary}"
    on:click={() => openNewEvent(toDateStr(selectedDay))}>
    <span class="icon-mask"
      style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:#fff;width:24px;height:24px"></span>
  </button>

  <!-- ── TAB BAR com indicador animado ─────────────────────────── -->
  <div class="cal-tabs" bind:this={tabsWrapEl}
    style="background:{isDark?'rgba(30,30,30,0.85)':'rgba(255,255,255,0.85)'}; border-color:{c.divider}">
    <div class="cal-tab-indicator"
      style="transform:translateX({indicatorX}px);width:{indicatorWidth}px;opacity:{indicatorReady?1:0};background:{c.dialogBackground};border-color:{c.divider}">
    </div>
    {#each VIEWS as v}
      <button
        bind:this={tabRefs[v.id]}
        class="cal-tab"
        class:cal-tab-active={currentView===v.id}
        style="color:{currentView===v.id?c.textPrimary:c.textSecondary}"
        on:click={() => setView(v.id)}>
        {v.label}
      </button>
    {/each}
  </div>

  <!-- ════════════════════════════════════════════════════════════════
       DETAIL SHEET — bottom sheet animado
  ═══════════════════════════════════════════════════════════════ -->
  {#if detailEvent}
    <button class="overlay" class:overlay-in={detailVisible}
      on:click={closeDetail}></button>
    <div class="bottom-sheet" class:sheet-in={detailVisible}
      style="background:{c.dialogBackground}"
      role="dialog" aria-modal="true"
      on:click|stopPropagation={() => {}} on:keydown={() => {}}>
      <!-- Handle bar -->
      <div class="sheet-handle" style="background:{c.divider}"></div>

      <div class="detail-header">
        <div class="detail-color-strip" style="background:{detailEvent.color}"></div>
        <div class="detail-title" style="color:{c.textPrimary}">{detailEvent.title}</div>
        <div class="detail-acts">
          <button class="detail-act-btn" on:click={() => { openEditEvent(detailEvent); closeDetail(); }}>
            <span class="icon-mask"
              style="mask-image:url('/icons/svg/edit.svg');-webkit-mask-image:url('/icons/svg/edit.svg');background:{c.primary};width:18px;height:18px"></span>
          </button>
          <button class="detail-act-btn" on:click={() => deleteEvent(detailEvent.id)}>
            <span class="icon-mask"
              style="mask-image:url('/icons/svg/trash.svg');-webkit-mask-image:url('/icons/svg/trash.svg');background:#FF3B30;width:18px;height:18px"></span>
          </button>
          <button class="detail-act-btn" on:click={closeDetail}>
            <span class="icon-mask"
              style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{c.textSecondary};width:16px;height:16px"></span>
          </button>
        </div>
      </div>

      <!-- Linhas de detalhe -->
      <div class="detail-row" style="color:{c.textSecondary}">
        <span class="icon-mask detail-row-icon"
          style="mask-image:url('/icons/svg/calendar.svg');-webkit-mask-image:url('/icons/svg/calendar.svg');background:{c.textSecondary}"></span>
        <span>{PT_DAYS_FULL[parseDate(detailEvent.date).getDay()]}, {parseDate(detailEvent.date).getDate()} {PT_MONTHS[parseDate(detailEvent.date).getMonth()]} {parseDate(detailEvent.date).getFullYear()}</span>
      </div>

      {#if detailEvent.allDay}
        <div class="detail-row" style="color:{c.textSecondary}">
          <span class="icon-mask detail-row-icon"
            style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{c.textSecondary}"></span>
          <span>Todo o dia</span>
        </div>
      {:else}
        <div class="detail-row" style="color:{c.textSecondary}">
          <span class="icon-mask detail-row-icon"
            style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{c.textSecondary}"></span>
          <span>{fmtTime(detailEvent.startTime)} – {fmtTime(detailEvent.endTime)}</span>
        </div>
      {/if}

      {#if detailEvent.location}
        <div class="detail-row" style="color:{c.textSecondary}">
          <span class="icon-mask detail-row-icon"
            style="mask-image:url('/icons/svg/location.svg');-webkit-mask-image:url('/icons/svg/location.svg');background:{c.textSecondary}"></span>
          <span>{detailEvent.location}</span>
        </div>
      {/if}

      {#if detailEvent.repeat!=='none'}
        <div class="detail-row" style="color:{c.textSecondary}">
          <span class="icon-mask detail-row-icon"
            style="mask-image:url('/icons/svg/repeat.svg');-webkit-mask-image:url('/icons/svg/repeat.svg');background:{c.textSecondary}"></span>
          <span>{REPEAT_OPTIONS.find(r=>r.value===detailEvent.repeat)?.label}</span>
        </div>
      {/if}

      {#if detailEvent.description}
        <div class="detail-row" style="color:{c.textPrimary};align-items:flex-start">
          <span class="icon-mask detail-row-icon"
            style="mask-image:url('/icons/svg/note.svg');-webkit-mask-image:url('/icons/svg/note.svg');background:{c.textSecondary};margin-top:2px"></span>
          <span>{detailEvent.description}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ════════════════════════════════════════════════════════════════
       MODAL CRIAR / EDITAR — bottom sheet animado
  ═══════════════════════════════════════════════════════════════ -->
  {#if showModal}
    <button class="overlay" class:overlay-in={modalVisible}
      on:click={closeModal}></button>
    <div class="bottom-sheet modal-sheet" class:sheet-in={modalVisible}
      style="background:{c.dialogBackground}"
      role="dialog" aria-modal="true"
      on:click|stopPropagation={() => {}} on:keydown={() => {}}>

      <div class="sheet-handle" style="background:{c.divider}"></div>

      <div class="modal-header" style="border-bottom:0.5px solid {c.divider}">
        <button class="modal-close-btn" on:click={closeModal}>
          <span class="icon-mask"
            style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{c.textSecondary};width:16px;height:16px"></span>
        </button>
        <span class="modal-title" style="color:{c.textPrimary}">{editingEvent?'Editar evento':'Novo evento'}</span>
        <button class="modal-save" style="color:{c.primary}" on:click={saveEvent}>Guardar</button>
      </div>

      <div class="modal-body">
        <!-- Título -->
        <input class="modal-input-title" placeholder="Título do evento"
          style="color:{c.textPrimary};border-bottom:2px solid {form.color};caret-color:{form.color};background:transparent"
          bind:value={form.title} />

        <!-- Seletor de cor com bolinhas -->
        <div class="color-picker">
          {#each EVENT_COLORS as clr}
            <button class="color-swatch"
              style="background:{clr.value};box-shadow:{form.color===clr.value?'0 0 0 3px '+c.background+', 0 0 0 5px '+clr.value:'none'}"
              aria-label={clr.label}
              on:click={() => form.color=clr.value}></button>
          {/each}
        </div>

        <!-- Linhas de configuração -->
        <!-- Todo o dia -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <div class="modal-row-left">
            <span class="icon-mask modal-row-icon"
              style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{c.textSecondary}"></span>
            <span class="modal-row-label" style="color:{c.textSecondary}">Todo o dia</span>
          </div>
          <button class="toggle" role="switch" aria-checked={form.allDay}
            style="background:{form.allDay?c.primary:c.divider}"
            on:click={() => form.allDay=!form.allDay}>
            <div class="toggle-knob" style="transform:{form.allDay?'translateX(20px)':'translateX(2px)'}"></div>
          </button>
        </div>

        <!-- Data -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <div class="modal-row-left">
            <span class="icon-mask modal-row-icon"
              style="mask-image:url('/icons/svg/calendar.svg');-webkit-mask-image:url('/icons/svg/calendar.svg');background:{c.textSecondary}"></span>
            <span class="modal-row-label" style="color:{c.textSecondary}">Data</span>
          </div>
          <input type="date" class="modal-row-input" style="color:{c.textPrimary};background:transparent;border:none"
            bind:value={form.date} />
        </div>

        <!-- Horas -->
        {#if !form.allDay}
          <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
            <div class="modal-row-left">
              <span class="icon-mask modal-row-icon"
                style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{c.textSecondary}"></span>
              <span class="modal-row-label" style="color:{c.textSecondary}">Início</span>
            </div>
            <input type="time" class="modal-row-input" style="color:{c.textPrimary};background:transparent;border:none"
              bind:value={form.startTime} />
          </div>
          <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
            <div class="modal-row-left">
              <span class="icon-mask modal-row-icon"
                style="mask-image:url('/icons/svg/clock.svg');-webkit-mask-image:url('/icons/svg/clock.svg');background:{c.textSecondary}"></span>
              <span class="modal-row-label" style="color:{c.textSecondary}">Fim</span>
            </div>
            <input type="time" class="modal-row-input" style="color:{c.textPrimary};background:transparent;border:none"
              bind:value={form.endTime} />
          </div>
        {/if}

        <!-- Local -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <div class="modal-row-left">
            <span class="icon-mask modal-row-icon"
              style="mask-image:url('/icons/svg/location.svg');-webkit-mask-image:url('/icons/svg/location.svg');background:{c.textSecondary}"></span>
            <span class="modal-row-label" style="color:{c.textSecondary}">Local</span>
          </div>
          <input class="modal-row-input" placeholder="Adicionar local"
            style="color:{c.textPrimary};background:transparent;border:none;text-align:right"
            bind:value={form.location} />
        </div>

        <!-- Repetição -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <div class="modal-row-left">
            <span class="icon-mask modal-row-icon"
              style="mask-image:url('/icons/svg/repeat.svg');-webkit-mask-image:url('/icons/svg/repeat.svg');background:{c.textSecondary}"></span>
            <span class="modal-row-label" style="color:{c.textSecondary}">Repetir</span>
          </div>
          <select class="modal-row-input modal-select"
            style="color:{c.textPrimary};background:{c.dialogBackground};border:none"
            bind:value={form.repeat}>
            {#each REPEAT_OPTIONS as r}
              <option value={r.value}>{r.label}</option>
            {/each}
          </select>
        </div>

        <!-- Notas -->
        <div class="modal-notes-wrap">
          <span class="icon-mask modal-row-icon"
            style="mask-image:url('/icons/svg/note.svg');-webkit-mask-image:url('/icons/svg/note.svg');background:{c.textSecondary};flex-shrink:0"></span>
          <textarea class="modal-notes" rows="3" placeholder="Adicionar notas..."
            style="color:{c.textPrimary};background:transparent;caret-color:{c.primary}"
            bind:value={form.description}></textarea>
        </div>

        {#if editingEvent}
          <button class="delete-btn" on:click={() => deleteEvent(editingEvent.id)}>
            <span class="icon-mask"
              style="mask-image:url('/icons/svg/trash.svg');-webkit-mask-image:url('/icons/svg/trash.svg');background:#FF3B30;width:16px;height:16px"></span>
            Eliminar evento
          </button>
        {/if}
      </div>
    </div>
  {/if}

</div>

<style>
  /* ── Root — animação de entrada idêntica ao AppsModelos ────────── */
  .cal-root {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }
  .cal-root.cal-in { opacity:1; transform:translateY(0); }
  .cal-root * { box-sizing: border-box; }

  /* ── Header ─────────────────────────────────────────────────────── */
  .cal-header {
    display: flex;
    align-items: center;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 14px 12px;
    flex-shrink: 0;
    gap: 8px;
  }
  .cal-icon-btn {
    width: 36px; height: 36px;
    border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s;
  }
  .cal-icon-btn:active { transform: scale(0.88); opacity: .7; }

  .cal-nav {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  .cal-nav-arrow {
    width: 32px; height: 32px;
    border: none; background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border-radius: 50%;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .cal-nav-arrow:active { transform: scale(0.84); }
  .cal-nav-label-btn {
    border: none; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 8px;
    transition: opacity .16s;
  }
  .cal-nav-label-btn:active { opacity: .6; }
  .cal-nav-label {
    font-size: 15px; font-weight: 700; white-space: nowrap;
  }
  .cal-today-pill {
    width: 36px; height: 36px;
    border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .cal-today-pill:active { transform: scale(0.88); }
  .cal-today-pill-num {
    font-size: 14px; font-weight: 800; color: #fff;
  }

  /* ── Corpo ──────────────────────────────────────────────────────── */
  .cal-body {
    flex: 1; min-height: 0;
    overflow-y: auto;
    padding-bottom: calc(env(safe-area-inset-bottom,0px) + 88px);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
  }
  .cal-body-inner { width: 100%; will-change: transform; }

  /* ── icon-mask helper ──────────────────────────────────────────── */
  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }

  /* ── Vista Mensal ──────────────────────────────────────────────── */
  .month-wrap { display: flex; flex-direction: column; }
  .week-header-row {
    display: grid; grid-template-columns: repeat(7,1fr);
  }
  .wh-cell {
    text-align: center; font-size: 11px; font-weight: 700;
    padding: 6px 0 5px;
  }
  .month-grid {
    display: grid;
    grid-template-columns: repeat(7,1fr);
    grid-template-rows: repeat(6,1fr);
    height: calc(100dvh - calc(env(safe-area-inset-top,0px) + 14px) - 52px - 24px - 88px);
  }
  .month-cell {
    display: flex; flex-direction: column; overflow: hidden;
    padding: 2px; cursor: pointer;
    background: none; border: none; text-align: left;
    transition: background .12s;
    min-height: 0;
  }
  .month-cell:active { opacity: .75; }
  .month-cell-inner { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .day-num-wrap { display: flex; justify-content: center; margin-bottom: 1px; }
  .day-num {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 600; border-radius: 50%;
    transition: background .2s;
  }
  .month-ev {
    font-size: 9.5px; border-radius: 3px;
    padding: 1px 3px; margin-bottom: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    cursor: pointer;
    transition: opacity .12s;
  }
  .month-ev:active { opacity: .65; }
  .month-ev-txt { font-weight: 500; }
  .more-badge { font-size: 8.5px; padding: 0 3px; }

  /* ── Vista Semanal ─────────────────────────────────────────────── */
  .week-wrap { display: flex; flex-direction: column; height: 100%; }
  .week-cols-header { display: flex; flex-shrink: 0; }
  .time-gutter { width: 44px; flex-shrink: 0; }
  .wcol-head {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 6px 2px; cursor: pointer; gap: 2px;
    background: none; border: none;
    transition: opacity .14s;
  }
  .wcol-head:active { opacity: .6; }
  .wday-name { font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .wday-num {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
    transition: background .2s;
  }
  .week-scroll-area { flex: 1; overflow-y: auto; }
  .hour-row { display: flex; min-height: 56px; position: relative; }
  .hour-label {
    width: 44px; flex-shrink: 0;
    font-size: 9.5px; padding: 2px 6px 0; text-align: right;
  }
  .week-cell {
    flex: 1; border-right: 0.5px solid rgba(128,128,128,.12);
    position: relative;
    background: none; border-top: none; border-bottom: none; border-left: none;
    padding: 0; cursor: default;
  }
  .week-ev {
    margin: 1px 2px; border-radius: 4px;
    padding: 2px 4px; font-size: 10px;
    cursor: pointer;
    transition: opacity .12s, transform .12s;
  }
  .week-ev:active { opacity: .7; transform: scale(.97); }
  .week-ev-title { display: block; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-ev-time { font-size: 9px; opacity: .8; }

  /* ── Linha da hora atual ────────────────────────────────────────── */
  .now-bar {
    position: absolute; height: 2px; left: 0; right: 0;
    border-radius: 2px; z-index: 5;
    pointer-events: none;
  }
  .now-dot {
    width: 9px; height: 9px; border-radius: 50%;
    position: absolute; left: -4px; top: -3.5px;
  }

  /* ── Vista Diária ───────────────────────────────────────────────── */
  .day-wrap { flex: 1; overflow-y: auto; }
  .allday-strip {
    display: flex; align-items: flex-start;
    padding: 6px 0; flex-shrink: 0;
  }
  .allday-evs {
    flex: 1; display: flex; flex-direction: column;
    gap: 2px; padding: 0 8px 0 4px;
  }
  .allday-ev {
    border-radius: 6px; padding: 3px 8px;
    font-size: 12px; font-weight: 600;
    border: none; text-align: left; cursor: pointer;
    transition: opacity .12s, transform .14s;
  }
  .allday-ev:active { opacity: .7; transform: scale(.97); }
  .day-hour-row { min-height: 56px; }
  .day-hour-cell {
    flex: 1; position: relative; padding: 0 8px 0 4px;
    background: none; border: none; width: 100%; text-align: left; cursor: default;
  }
  .day-ev {
    border-radius: 10px; padding: 7px 10px; margin: 2px 0;
    cursor: pointer;
    transition: opacity .12s, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .day-ev:active { opacity: .7; transform: scale(.98); }
  .day-ev-title { font-size: 14px; font-weight: 700; }
  .day-ev-time { font-size: 12px; margin-top: 2px; opacity: .8; }
  .day-ev-loc  { font-size: 11px; margin-top: 2px; opacity: .7; }

  /* ── Vista Agenda ────────────────────────────────────────────────── */
  .agenda-day { margin-bottom: 2px; }
  .agenda-day-hdr {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px 8px; position: sticky; top: 0; z-index: 2;
  }
  .agenda-day-name { font-size: 11px; font-weight: 800; text-transform: uppercase; width: 22px; }
  .agenda-day-num {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
  }
  .agenda-month-label { font-size: 12px; }
  .today-badge {
    font-size: 10px; font-weight: 800;
    padding: 2px 8px; border-radius: 999px;
    letter-spacing: .03em;
  }
  .agenda-ev {
    width: calc(100% - 32px); margin: 2px 16px;
    border-radius: 12px; padding: 10px 12px;
    display: flex; align-items: center; gap: 10px;
    cursor: pointer; border: none; text-align: left;
    transition: opacity .12s, transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .agenda-ev:active { opacity: .7; transform: scale(.98); }
  .agenda-ev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .agenda-ev-body { flex: 1; min-width: 0; }
  .agenda-ev-title { font-size: 14px; font-weight: 700; }
  .agenda-ev-meta  { font-size: 12px; margin-top: 2px; }
  .agenda-ev-desc  { font-size: 12px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .75; }
  .agenda-ev-arrow { width: 14px; height: 14px; opacity: .4; }
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 50vh; gap: 12px; padding: 40px; font-size: 15px; text-align: center;
  }
  .empty-icon { width: 52px; height: 52px; opacity: .35; }
  .empty-cta {
    display: flex; align-items: center; gap: 6px;
    border: none; border-radius: 999px;
    padding: 10px 22px; font-size: 14px; font-weight: 700;
    cursor: pointer; margin-top: 8px;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .empty-cta:active { transform: scale(0.92); }

  /* ── FAB ─────────────────────────────────────────────────────────── */
  .fab {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom,0px) + 80px);
    right: 18px;
    width: 52px; height: 52px;
    border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,.22);
    z-index: 100;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .fab:active { transform: scale(0.88); }

  /* ── Tab bar — idêntica ao AppsModelos ───────────────────────────── */
  .cal-tabs {
    position: fixed;
    left: 14px; right: 14px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 18px);
    z-index: 200;
    display: flex; gap: 4px;
    border: 1px solid;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: 4px;
    border-radius: 999px;
    box-shadow: 0 8px 28px rgba(0,0,0,.14);
  }
  .cal-tab-indicator {
    position: absolute;
    top: 4px; bottom: 4px; left: 0;
    border-radius: 999px;
    border: 1px solid;
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
    transition: transform .32s cubic-bezier(0.34,1.2,0.4,1), width .32s cubic-bezier(0.34,1.2,0.4,1), opacity .2s ease;
    will-change: transform, width;
    pointer-events: none;
  }
  .cal-tab {
    position: relative; z-index: 1;
    flex: 1; border: none; background: transparent;
    padding: 11px 4px; border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 600;
    cursor: pointer;
    transition: color .22s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .cal-tab:active { transform: scale(0.94); }

  /* ── Overlay ─────────────────────────────────────────────────────── */
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0);
    z-index: 300;
    border: none; cursor: default; width: 100%; height: 100%;
    transition: background .32s ease;
  }
  .overlay.overlay-in { background: rgba(0,0,0,.45); }

  /* ── Bottom Sheet (Detail + Modal) ──────────────────────────────── */
  .bottom-sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-radius: 20px 20px 0 0;
    z-index: 400;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    transform: translateY(100%);
    transition: transform .36s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 -4px 40px rgba(0,0,0,.18);
  }
  .bottom-sheet.sheet-in { transform: translateY(0); }
  .modal-sheet { max-height: 88dvh; display: flex; flex-direction: column; }

  .sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    margin: 10px auto 8px;
  }

  /* ── Detail ──────────────────────────────────────────────────────── */
  .detail-header {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 6px 16px 14px;
  }
  .detail-color-strip { width: 4px; min-height: 28px; border-radius: 2px; align-self: stretch; flex-shrink: 0; }
  .detail-title { flex: 1; font-size: 18px; font-weight: 800; line-height: 1.25; }
  .detail-acts { display: flex; gap: 2px; align-items: center; }
  .detail-act-btn {
    width: 34px; height: 34px;
    border: none; background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border-radius: 50%;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .detail-act-btn:active { transform: scale(0.84); opacity: .6; }
  .detail-row {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 16px; font-size: 14px;
  }
  .detail-row-icon { width: 18px; height: 18px; opacity: .7; }

  /* ── Modal ───────────────────────────────────────────────────────── */
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 12px 12px; flex-shrink: 0;
  }
  .modal-close-btn {
    width: 32px; height: 32px;
    border: none; background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border-radius: 50%;
    transition: opacity .14s;
  }
  .modal-close-btn:active { opacity: .6; }
  .modal-title { font-size: 16px; font-weight: 700; }
  .modal-save {
    background: none; border: none;
    font-size: 16px; font-weight: 700; cursor: pointer;
    transition: opacity .14s;
  }
  .modal-save:active { opacity: .6; }
  .modal-body {
    flex: 1; overflow-y: auto;
    padding: 8px 16px 16px;
    display: flex; flex-direction: column; gap: 0;
  }
  .modal-input-title {
    width: 100%; font-size: 21px; font-weight: 700;
    border: none; outline: none;
    padding: 8px 0 14px; margin-bottom: 16px;
    border-bottom-width: 2px; border-bottom-style: solid;
  }
  .color-picker {
    display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .color-swatch {
    width: 26px; height: 26px; border-radius: 50%;
    border: none; cursor: pointer; flex-shrink: 0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), box-shadow .2s;
  }
  .color-swatch:active { transform: scale(0.84); }
  .modal-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 0;
  }
  .modal-row-left { display: flex; align-items: center; gap: 12px; }
  .modal-row-icon { width: 18px; height: 18px; opacity: .65; }
  .modal-row-label { font-size: 14px; }
  .modal-row-input { font-size: 14px; outline: none; max-width: 160px; }
  .modal-select { cursor: pointer; }
  .toggle {
    width: 44px; height: 24px; border-radius: 12px;
    position: relative; cursor: pointer;
    transition: background .22s cubic-bezier(0.16,1,0.3,1);
    flex-shrink: 0; border: none; padding: 0;
  }
  .toggle-knob {
    width: 20px; height: 20px; background: #fff; border-radius: 50%;
    position: absolute; top: 2px;
    transition: transform .22s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 1px 4px rgba(0,0,0,.22);
  }
  .modal-notes-wrap {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 13px 0;
  }
  .modal-notes {
    flex: 1; font-size: 14px; outline: none;
    border: none; resize: none;
    font-family: inherit; line-height: 1.5;
  }
  .delete-btn {
    display: flex; align-items: center; gap: 8px; justify-content: center;
    margin-top: 16px; width: 100%;
    background: none; border: 1px solid #FF3B30; color: #FF3B30;
    border-radius: 14px; padding: 13px;
    font-size: 15px; font-weight: 600; cursor: pointer;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .delete-btn:active { transform: scale(0.97); opacity: .7; }
</style>