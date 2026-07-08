<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Calendar';
  export let appId = 'calendar';
  export let iconPath = '/icons/svg/calendar.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // ── Vistas ──────────────────────────────────────────────────────
  const VIEWS = ['month', 'week', 'day', 'agenda'];
  let currentView = 'month';

  // ── Data ────────────────────────────────────────────────────────
  const now = new Date();
  let viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let selectedDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Eventos ─────────────────────────────────────────────────────
  const STORAGE_KEY = 'nexa_calendar_events';
  let events = [];

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) events = JSON.parse(raw);
    } catch(e) { events = []; }
  });

  function saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  // ── Modal ────────────────────────────────────────────────────────
  let showModal = false;
  let editingEvent = null;

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

  function blankEvent(dateStr) {
    const h = now.getHours();
    const pad = n => String(n).padStart(2,'0');
    return {
      id: Date.now() + Math.random(),
      title: '',
      date: dateStr || toDateStr(selectedDay),
      startTime: `${pad(h)}:00`,
      endTime: `${pad(h+1 < 24 ? h+1 : h)}:00`,
      allDay: false,
      color: EVENT_COLORS[0].value,
      description: '',
      location: '',
      repeat: 'none',
    };
  }

  let form = blankEvent();

  function openNewEvent(dateStr) {
    form = blankEvent(dateStr);
    editingEvent = null;
    showModal = true;
  }

  function openEditEvent(ev) {
    form = { ...ev };
    editingEvent = ev;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingEvent = null;
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
    detailEvent = null;
    showToast('Evento eliminado');
  }

  // ── Utilitários de data ──────────────────────────────────────────
  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function parseDate(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }

  function isSameDay(a, b) {
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }

  function isToday(d) { return isSameDay(d, now); }

  function eventsOnDate(d) {
    const str = toDateStr(d);
    return events.filter(ev => {
      if (ev.date === str) return true;
      const base = parseDate(ev.date);
      if (base > d) return false;
      if (ev.repeat === 'daily')   return true;
      if (ev.repeat === 'weekly')  return base.getDay() === d.getDay();
      if (ev.repeat === 'monthly') return base.getDate() === d.getDate();
      if (ev.repeat === 'yearly')  return base.getMonth() === d.getMonth() && base.getDate() === d.getDate();
      return false;
    }).sort((a,b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  const PT_DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const PT_DAYS_FULL  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const PT_MONTHS     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // ── Vista Mensal ─────────────────────────────────────────────────
  $: monthDays = (() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    start.setDate(1 - start.getDay());
    return Array.from({length:42}, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  function prevMonth() { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); }
  function nextMonth() { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); }

  function goToday() {
    const t = new Date();
    viewDate = new Date(t.getFullYear(), t.getMonth(), 1);
    selectedDay = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  // ── Vista Semanal ────────────────────────────────────────────────
  $: weekDays = (() => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - d.getDay());
    return Array.from({length:7}, (_, i) => {
      const x = new Date(d); x.setDate(d.getDate()+i); return x;
    });
  })();

  function prevWeek() {
    const d = new Date(selectedDay); d.setDate(d.getDate()-7);
    selectedDay = d; viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function nextWeek() {
    const d = new Date(selectedDay); d.setDate(d.getDate()+7);
    selectedDay = d; viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // ── Vista Diária ─────────────────────────────────────────────────
  const HOURS = Array.from({length:24}, (_, i) => i);

  function prevDay() {
    const d = new Date(selectedDay); d.setDate(d.getDate()-1);
    selectedDay = d; viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function nextDay() {
    const d = new Date(selectedDay); d.setDate(d.getDate()+1);
    selectedDay = d; viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // Eventos do dia selecionado — variável reativa normal, sem {@const} no template
  $: dayEvs = eventsOnDate(selectedDay);
  $: allDayEvs = dayEvs.filter(e => e.allDay);
  $: timedEvs = dayEvs.filter(e => !e.allDay);

  // ── Vista Agenda ─────────────────────────────────────────────────
  $: agendaDays = (() => {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(base); d.setDate(base.getDate()+i);
      const evs = eventsOnDate(d);
      if (evs.length) result.push({ date: d, evs });
    }
    return result;
  })();

  // ── Label de navegação ───────────────────────────────────────────
  $: navLabel = (() => {
    if (currentView === 'month') return `${PT_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    if (currentView === 'week') {
      const f = weekDays[0], l = weekDays[6];
      if (f.getMonth() === l.getMonth())
        return `${f.getDate()}–${l.getDate()} ${PT_MONTHS[f.getMonth()]} ${f.getFullYear()}`;
      return `${f.getDate()} ${PT_MONTHS[f.getMonth()].slice(0,3)} – ${l.getDate()} ${PT_MONTHS[l.getMonth()].slice(0,3)} ${l.getFullYear()}`;
    }
    if (currentView === 'day')
      return `${PT_DAYS_FULL[selectedDay.getDay()]}, ${selectedDay.getDate()} ${PT_MONTHS[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`;
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

  // ── Menu de vista ────────────────────────────────────────────────
  let showViewMenu = false;
  const VIEW_LABELS = { month:'Mês', week:'Semana', day:'Dia', agenda:'Agenda' };

  function setView(v) {
    currentView = v;
    showViewMenu = false;
    if (v === 'month') viewDate = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
  }

  // ── Formatar hora ────────────────────────────────────────────────
  function fmtTime(t) {
    if (!t) return '';
    const [h,m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  // ── Detalhe de evento ────────────────────────────────────────────
  let detailEvent = null;

  function openDetail(ev) {
    detailEvent = ev;
  }

  function closeAll() {
    showViewMenu = false;
    if (!showModal) detailEvent = null;
  }

  // ── Scroll automático hora atual (vista diária) ──────────────────
  let dayScrollEl;
  $: if (currentView === 'day' && dayScrollEl) {
    setTimeout(() => { dayScrollEl.scrollTop = Math.max(0, (now.getHours()-1)*60); }, 50);
  }

  // ── Abrir evento da hora na vista diária ─────────────────────────
  function openNewDayHour(h) {
    const pad = n => String(n).padStart(2,'0');
    form = blankEvent(toDateStr(selectedDay));
    form.startTime = `${pad(h)}:00`;
    form.endTime   = `${pad(h+1<24?h+1:h)}:00`;
    editingEvent = null;
    showModal = true;
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════ -->
<div class="root" style="background:{c.background};color:{c.textPrimary}"
  on:click={closeAll} on:keydown={() => {}}>

  <!-- APPBAR -->
  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="icon-btn" style="background:{c.appbarBtnBg}"
      on:click|stopPropagation={() => dispatch('nav',{to:'home'})}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px"></span>
    </button>

    <div class="appbar-center">
      <button class="nav-btn" style="color:{c.iconTint}" on:click|stopPropagation={prev}>‹</button>
      <span class="nav-label" style="color:{c.textPrimary}">{navLabel}</span>
      <button class="nav-btn" style="color:{c.iconTint}" on:click|stopPropagation={next}>›</button>
    </div>

    <div class="appbar-right">
      <button class="today-btn" style="background:{c.primary};color:#fff"
        on:click|stopPropagation={goToday}>Hoje</button>
      <div class="view-menu-wrap" on:click|stopPropagation={() => {}} on:keydown={() => {}}>
        <button class="icon-btn" style="background:{c.appbarBtnBg}"
          on:click|stopPropagation={() => showViewMenu = !showViewMenu}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:18px;height:18px"></span>
        </button>
        {#if showViewMenu}
          <div class="dropdown" style="background:{c.dialogBackground};border-color:{c.divider}">
            {#each VIEWS as v}
              <button class="dropdown-item"
                style="color:{currentView===v ? c.primary : c.textPrimary};font-weight:{currentView===v?700:400}"
                on:click={() => setView(v)}>{VIEW_LABELS[v]}</button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       VISTA MENSAL
  ═══════════════════════════════════════════════════════════════ -->
  {#if currentView === 'month'}
    <div class="month-root">
      <div class="week-header" style="border-bottom:0.5px solid {c.divider}">
        {#each PT_DAYS_SHORT as d, i}
          <div class="wh-cell" style="color:{i===0||i===6?'#FF3B30':c.textSecondary}">{d}</div>
        {/each}
      </div>
      <div class="month-grid">
        {#each monthDays as day, idx}
          {@const inMonth = day.getMonth() === viewDate.getMonth()}
          {@const todayFlag = isToday(day)}
          {@const dayEvs2 = eventsOnDate(day)}
          <button class="month-cell"
            style="border-right:{((idx+1)%7===0)?'none':'0.5px solid '+c.divider};border-bottom:0.5px solid {c.divider};opacity:{inMonth?1:0.35}"
            on:click={() => { selectedDay = new Date(day); }}
            on:dblclick={() => openNewEvent(toDateStr(day))}>
            <div class="day-num-wrap">
              <span class="day-num"
                style="background:{todayFlag?c.primary:'transparent'};color:{todayFlag?'#fff':(day.getDay()===0||day.getDay()===6?'#FF3B30':c.textPrimary)}">
                {day.getDate()}
              </span>
            </div>
            {#each dayEvs2.slice(0,3) as ev}
              <div class="month-ev" style="background:{ev.color}20;border-left:3px solid {ev.color};color:{ev.color}"
                role="button" tabindex="0"
                on:click|stopPropagation={() => openDetail(ev)}
                on:keydown={e => e.key==='Enter' && openDetail(ev)}>
                <span class="month-ev-title">{ev.allDay?'':fmtTime(ev.startTime)+' '}{ev.title}</span>
              </div>
            {/each}
            {#if dayEvs2.length > 3}
              <div class="more-badge" style="color:{c.textSecondary}">+{dayEvs2.length-3} mais</div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

  <!-- ══════════════════════════════════════════════════════════════
       VISTA SEMANAL
  ═══════════════════════════════════════════════════════════════ -->
  {:else if currentView === 'week'}
    <div class="week-root">
      <div class="week-cols-header" style="border-bottom:0.5px solid {c.divider}">
        <div class="time-gutter-label"></div>
        {#each weekDays as d}
          {@const todayFlag = isToday(d)}
          <button class="wcol-head"
            on:click={() => { selectedDay = new Date(d); setView('day'); }}>
            <div class="wday-name" style="color:{d.getDay()===0||d.getDay()===6?'#FF3B30':c.textSecondary}">{PT_DAYS_SHORT[d.getDay()]}</div>
            <div class="wday-num" style="background:{todayFlag?c.primary:'transparent'};color:{todayFlag?'#fff':(d.getDay()===0||d.getDay()===6?'#FF3B30':c.textPrimary)}">{d.getDate()}</div>
          </button>
        {/each}
      </div>
      <div class="week-scroll">
        {#each HOURS as h}
          <div class="hour-row" style="border-top:0.5px solid {c.divider}">
            <div class="hour-label" style="color:{c.textSecondary}">{h===0?'':String(h).padStart(2,'0')+':00'}</div>
            {#each weekDays as d}
              {@const colEvs = eventsOnDate(d).filter(e => !e.allDay && parseInt(e.startTime)===h)}
              <button class="week-cell" on:dblclick={() => openNewEvent(toDateStr(d))}>
                {#each colEvs as ev}
                  <div class="week-ev" style="background:{ev.color}30;border-left:3px solid {ev.color};color:{ev.color}"
                    role="button" tabindex="0"
                    on:click|stopPropagation={() => openDetail(ev)}
                    on:keydown={e => e.key==='Enter' && openDetail(ev)}>
                    <span class="week-ev-title">{ev.title}</span>
                    <span class="week-ev-time">{fmtTime(ev.startTime)}</span>
                  </div>
                {/each}
                {#if isToday(d) && now.getHours()===h}
                  <div class="time-now-bar" style="background:{c.primary};top:{now.getMinutes()/60*100}%"></div>
                {/if}
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>

  <!-- ══════════════════════════════════════════════════════════════
       VISTA DIÁRIA  — sem {@const} dentro de <div>
  ═══════════════════════════════════════════════════════════════ -->
  {:else if currentView === 'day'}
    <div class="day-root" bind:this={dayScrollEl}>
      {#if allDayEvs.length}
        <div class="allday-strip" style="border-bottom:0.5px solid {c.divider}">
          <div class="hour-label" style="color:{c.textSecondary};font-size:10px">Todo dia</div>
          <div class="allday-evs">
            {#each allDayEvs as ev}
              <button class="allday-ev" style="background:{ev.color}20;border-left:3px solid {ev.color};color:{ev.color}"
                on:click|stopPropagation={() => openDetail(ev)}>{ev.title}</button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="day-scroll-inner">
        {#each HOURS as h}
          {@const hEvs = timedEvs.filter(e => parseInt(e.startTime)===h)}
          <div class="hour-row day-hour-row" style="border-top:0.5px solid {c.divider}">
            <div class="hour-label" style="color:{c.textSecondary}">{h===0?'':String(h).padStart(2,'0')+':00'}</div>
            <button class="day-hour-content" on:dblclick={() => openNewDayHour(h)}>
              {#each hEvs as ev}
                <div class="day-ev" style="background:{ev.color}20;border-left:4px solid {ev.color};color:{ev.color}"
                  role="button" tabindex="0"
                  on:click|stopPropagation={() => openDetail(ev)}
                  on:keydown={e => e.key==='Enter' && openDetail(ev)}>
                  <div class="day-ev-title">{ev.title}</div>
                  <div class="day-ev-time">{fmtTime(ev.startTime)} – {fmtTime(ev.endTime)}</div>
                  {#if ev.location}<div class="day-ev-loc">📍 {ev.location}</div>{/if}
                </div>
              {/each}
              {#if isToday(selectedDay) && now.getHours()===h}
                <div class="time-now-line" style="background:{c.primary};top:{now.getMinutes()/60*100}%">
                  <div class="time-now-dot" style="background:{c.primary}"></div>
                </div>
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>

  <!-- ══════════════════════════════════════════════════════════════
       VISTA AGENDA
  ═══════════════════════════════════════════════════════════════ -->
  {:else if currentView === 'agenda'}
    <div class="agenda-root">
      {#if agendaDays.length === 0}
        <div class="empty-state" style="color:{c.textSecondary}">
          <div class="empty-icon">📅</div>
          <div>Sem eventos nos próximos 60 dias</div>
          <button class="empty-cta" style="background:{c.primary};color:#fff"
            on:click={() => openNewEvent(toDateStr(selectedDay))}>Criar evento</button>
        </div>
      {:else}
        {#each agendaDays as { date, evs }}
          <div class="agenda-day">
            <div class="agenda-day-header" style="background:{c.background}">
              <span class="agenda-day-name" style="color:{isToday(date)?c.primary:c.textSecondary}">{PT_DAYS_SHORT[date.getDay()]}</span>
              <span class="agenda-day-num"
                style="background:{isToday(date)?c.primary:'transparent'};color:{isToday(date)?'#fff':c.textPrimary}">{date.getDate()}</span>
              <span class="agenda-month" style="color:{c.textSecondary}">{PT_MONTHS[date.getMonth()].slice(0,3)} {date.getFullYear()}</span>
            </div>
            {#each evs as ev}
              <button class="agenda-ev" style="border-left:4px solid {ev.color};background:{ev.color}12"
                on:click={() => openDetail(ev)}>
                <div class="agenda-ev-info">
                  <div class="agenda-ev-title" style="color:{c.textPrimary}">{ev.title}</div>
                  <div class="agenda-ev-meta" style="color:{c.textSecondary}">
                    {ev.allDay ? 'Todo o dia' : `${fmtTime(ev.startTime)} – ${fmtTime(ev.endTime)}`}
                    {#if ev.location} · 📍 {ev.location}{/if}
                  </div>
                  {#if ev.description}<div class="agenda-ev-desc" style="color:{c.textSecondary}">{ev.description}</div>{/if}
                </div>
                <div class="agenda-ev-dot" style="background:{ev.color}"></div>
              </button>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- FAB -->
  <button class="fab" style="background:{c.primary}"
    on:click|stopPropagation={() => openNewEvent(toDateStr(selectedDay))}>
    <span style="font-size:28px;line-height:1;color:#fff;display:block;margin-top:-2px">+</span>
  </button>

  <!-- ═══════════════════════════════════════════════════════════════
       DETAIL POPOVER
  ════════════════════════════════════════════════════════════════ -->
  {#if detailEvent && !showModal}
    <button class="overlay" on:click={() => detailEvent=null}></button>
    <div class="detail-card" style="background:{c.dialogBackground};border-color:{c.divider}"
      role="dialog" aria-modal="true"
      on:click|stopPropagation={() => {}} on:keydown={() => {}}>
      <div class="detail-header">
        <div class="detail-color-bar" style="background:{detailEvent.color}"></div>
        <div class="detail-title" style="color:{c.textPrimary}">{detailEvent.title}</div>
        <div class="detail-actions">
          <button class="detail-act-btn" style="color:{c.primary}"
            on:click={() => { openEditEvent(detailEvent); detailEvent=null; }}>
            <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.primary};width:18px;height:18px"></span>
          </button>
          <button class="detail-act-btn" style="color:#FF3B30"
            on:click={() => deleteEvent(detailEvent.id)}>🗑</button>
          <button class="detail-act-btn" style="color:{c.textSecondary}"
            on:click={() => detailEvent=null}>✕</button>
        </div>
      </div>
      <div class="detail-row" style="color:{c.textSecondary}">
        <span>📅</span>
        <span>
          {PT_DAYS_FULL[parseDate(detailEvent.date).getDay()]},
          {parseDate(detailEvent.date).getDate()}
          {PT_MONTHS[parseDate(detailEvent.date).getMonth()]}
          {parseDate(detailEvent.date).getFullYear()}
        </span>
      </div>
      {#if detailEvent.allDay}
        <div class="detail-row" style="color:{c.textSecondary}"><span>🕐</span><span>Todo o dia</span></div>
      {:else}
        <div class="detail-row" style="color:{c.textSecondary}"><span>🕐</span><span>{fmtTime(detailEvent.startTime)} – {fmtTime(detailEvent.endTime)}</span></div>
      {/if}
      {#if detailEvent.location}
        <div class="detail-row" style="color:{c.textSecondary}"><span>📍</span><span>{detailEvent.location}</span></div>
      {/if}
      {#if detailEvent.repeat !== 'none'}
        <div class="detail-row" style="color:{c.textSecondary}">
          <span>🔁</span><span>{REPEAT_OPTIONS.find(r=>r.value===detailEvent.repeat)?.label}</span>
        </div>
      {/if}
      {#if detailEvent.description}
        <div class="detail-row" style="color:{c.textPrimary};align-items:flex-start"><span>📝</span><span>{detailEvent.description}</span></div>
      {/if}
    </div>
  {/if}

  <!-- ═══════════════════════════════════════════════════════════════
       MODAL CRIAR / EDITAR
  ════════════════════════════════════════════════════════════════ -->
  {#if showModal}
    <button class="overlay" on:click={closeModal}></button>
    <div class="modal" style="background:{c.dialogBackground};border-color:{c.divider}"
      role="dialog" aria-modal="true"
      on:click|stopPropagation={() => {}} on:keydown={() => {}}>
      <div class="modal-header" style="border-bottom:0.5px solid {c.divider}">
        <button class="modal-close" style="color:{c.textSecondary}" on:click={closeModal}>✕</button>
        <span class="modal-title" style="color:{c.textPrimary}">{editingEvent?'Editar evento':'Novo evento'}</span>
        <button class="modal-save-btn" style="color:{c.primary}" on:click={saveEvent}>Guardar</button>
      </div>
      <div class="modal-body">
        <!-- Título -->
        <input class="modal-input modal-title-input" placeholder="Título do evento"
          style="color:{c.textPrimary};border-bottom-color:{form.color};background:transparent"
          bind:value={form.title} />

        <!-- Cores -->
        <div class="color-row">
          {#each EVENT_COLORS as clr}
            <button class="color-dot"
              style="background:{clr.value};outline:{form.color===clr.value?'3px solid '+c.textPrimary:'none'};outline-offset:2px"
              aria-label={clr.label}
              on:click={() => form.color = clr.value}></button>
          {/each}
        </div>

        <!-- Todo o dia -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <label class="modal-label" style="color:{c.textSecondary}" for="alldaytoggle">Todo o dia</label>
          <button id="alldaytoggle" class="toggle" role="switch" aria-checked={form.allDay}
            style="background:{form.allDay?c.primary:c.divider}"
            on:click={() => form.allDay = !form.allDay}>
            <div class="toggle-knob" style="transform:{form.allDay?'translateX(20px)':'translateX(2px)'}"></div>
          </button>
        </div>

        <!-- Data -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <label class="modal-label" style="color:{c.textSecondary}" for="evdate">Data</label>
          <input id="evdate" type="date" class="modal-input-right"
            style="color:{c.textPrimary};background:transparent;border:none"
            bind:value={form.date} />
        </div>

        <!-- Horas -->
        {#if !form.allDay}
          <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
            <label class="modal-label" style="color:{c.textSecondary}" for="evstart">Início</label>
            <input id="evstart" type="time" class="modal-input-right"
              style="color:{c.textPrimary};background:transparent;border:none"
              bind:value={form.startTime} />
          </div>
          <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
            <label class="modal-label" style="color:{c.textSecondary}" for="evend">Fim</label>
            <input id="evend" type="time" class="modal-input-right"
              style="color:{c.textPrimary};background:transparent;border:none"
              bind:value={form.endTime} />
          </div>
        {/if}

        <!-- Localização -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <label class="modal-label" style="color:{c.textSecondary}" for="evloc">📍 Local</label>
          <input id="evloc" class="modal-input-right" placeholder="Adicionar local"
            style="color:{c.textPrimary};background:transparent;border:none;text-align:right"
            bind:value={form.location} />
        </div>

        <!-- Repetição -->
        <div class="modal-row" style="border-bottom:0.5px solid {c.divider}">
          <label class="modal-label" style="color:{c.textSecondary}" for="evrepeat">🔁 Repetir</label>
          <select id="evrepeat" class="modal-select"
            style="color:{c.textPrimary};background:{c.dialogBackground};border:none"
            bind:value={form.repeat}>
            {#each REPEAT_OPTIONS as r}
              <option value={r.value}>{r.label}</option>
            {/each}
          </select>
        </div>

        <!-- Descrição -->
        <textarea class="modal-textarea" placeholder="Adicionar descrição..." rows="3"
          style="color:{c.textPrimary};background:{c.background};border:1px solid {c.divider};border-radius:12px"
          bind:value={form.description}></textarea>

        <!-- Eliminar -->
        {#if editingEvent}
          <button class="delete-btn" on:click={() => deleteEvent(editingEvent.id)}>
            🗑 Eliminar evento
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────── */
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }

  /* ── Appbar ───────────────────────────────────────────────────── */
  .appbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:52px 12px 10px; flex-shrink:0; background:inherit; }
  .icon-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
  .icon-btn:active { opacity:.7; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
  .appbar-center { display:flex; align-items:center; gap:4px; flex:1; justify-content:center; min-width:0; }
  .nav-btn { background:none; border:none; font-size:24px; cursor:pointer; padding:0 6px; line-height:1; }
  .nav-btn:active { opacity:.6; }
  .nav-label { font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
  .appbar-right { display:flex; align-items:center; gap:6px; }
  .today-btn { border:none; border-radius:20px; padding:5px 10px; font-size:12px; font-weight:700; cursor:pointer; }
  .today-btn:active { opacity:.8; }
  .view-menu-wrap { position:relative; }
  .dropdown { position:absolute; top:42px; right:0; border:1px solid; border-radius:14px; overflow:hidden; z-index:999; min-width:120px; box-shadow:0 8px 32px #0004; }
  .dropdown-item { display:block; width:100%; background:none; border:none; padding:12px 16px; font-size:14px; cursor:pointer; text-align:left; }
  .dropdown-item:active { opacity:.7; }

  /* ── Vista Mensal ─────────────────────────────────────────────── */
  .month-root { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .week-header { display:grid; grid-template-columns:repeat(7,1fr); flex-shrink:0; }
  .wh-cell { text-align:center; font-size:11px; font-weight:700; padding:6px 0; }
  .month-grid { flex:1; display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); overflow:hidden; }
  .month-cell { display:flex; flex-direction:column; overflow:hidden; padding:2px; cursor:pointer; min-height:0; position:relative; background:none; border:none; text-align:left; }
  .month-cell:active { opacity:.85; }
  .day-num-wrap { display:flex; justify-content:center; margin-bottom:2px; }
  .day-num { width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; border-radius:50%; flex-shrink:0; }
  .month-ev { font-size:10px; border-radius:4px; padding:1px 4px; margin-bottom:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
  .month-ev:active { opacity:.7; }
  .month-ev-title { font-weight:500; }
  .more-badge { font-size:9px; padding:0 4px; }

  /* ── Vista Semanal ────────────────────────────────────────────── */
  .week-root { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .week-cols-header { display:flex; flex-shrink:0; }
  .time-gutter-label { width:44px; flex-shrink:0; }
  .wcol-head { flex:1; display:flex; flex-direction:column; align-items:center; padding:6px 2px; cursor:pointer; gap:2px; background:none; border:none; }
  .wday-name { font-size:10px; font-weight:600; text-transform:uppercase; }
  .wday-num { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
  .week-scroll { flex:1; overflow-y:auto; }
  .hour-row { display:flex; min-height:60px; position:relative; }
  .hour-label { width:44px; flex-shrink:0; font-size:10px; padding:2px 6px 0; text-align:right; }
  .week-cell { flex:1; border-right:0.5px solid rgba(128,128,128,.15); position:relative; cursor:default; background:none; border-top:none; border-bottom:none; border-left:none; padding:0; }
  .week-ev { margin:1px 2px; border-radius:4px; padding:2px 4px; font-size:10px; position:relative; cursor:pointer; }
  .week-ev:active { opacity:.7; }
  .week-ev-title { display:block; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .week-ev-time { font-size:9px; opacity:.8; }
  .time-now-bar { position:absolute; height:2px; left:0; right:0; border-radius:2px; z-index:5; }

  /* ── Vista Diária ─────────────────────────────────────────────── */
  .day-root { flex:1; display:flex; flex-direction:column; overflow-y:auto; }
  .allday-strip { display:flex; align-items:flex-start; padding:6px 0; flex-shrink:0; }
  .allday-evs { flex:1; display:flex; flex-direction:column; gap:2px; padding:0 8px 0 4px; }
  .allday-ev { border-radius:6px; padding:3px 8px; font-size:12px; font-weight:600; cursor:pointer; border:none; text-align:left; }
  .allday-ev:active { opacity:.7; }
  .day-scroll-inner { display:flex; flex-direction:column; }
  .day-hour-row { min-height:60px; }
  .day-hour-content { flex:1; position:relative; padding:0 8px 0 4px; background:none; border:none; width:100%; text-align:left; cursor:default; }
  .day-ev { border-radius:8px; padding:6px 10px; margin:2px 0; cursor:pointer; }
  .day-ev:active { opacity:.7; }
  .day-ev-title { font-size:14px; font-weight:700; }
  .day-ev-time { font-size:12px; margin-top:2px; opacity:.8; }
  .day-ev-loc { font-size:11px; margin-top:2px; opacity:.7; }
  .time-now-line { position:absolute; height:2px; left:0; right:0; border-radius:2px; z-index:5; }
  .time-now-dot { width:10px; height:10px; border-radius:50%; position:absolute; left:-5px; top:-4px; }

  /* ── Vista Agenda ─────────────────────────────────────────────── */
  .agenda-root { flex:1; overflow-y:auto; }
  .agenda-day { margin-bottom:4px; }
  .agenda-day-header { display:flex; align-items:center; gap:8px; padding:10px 16px 8px; position:sticky; top:0; z-index:2; }
  .agenda-day-name { font-size:12px; font-weight:700; text-transform:uppercase; width:24px; }
  .agenda-day-num { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; }
  .agenda-month { font-size:12px; }
  .agenda-ev { width:100%; margin:2px 16px; width:calc(100% - 32px); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer; border:none; text-align:left; }
  .agenda-ev:active { opacity:.7; }
  .agenda-ev-info { flex:1; min-width:0; }
  .agenda-ev-title { font-size:14px; font-weight:700; }
  .agenda-ev-meta { font-size:12px; margin-top:2px; }
  .agenda-ev-desc { font-size:12px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .agenda-ev-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; padding:40px; font-size:15px; text-align:center; }
  .empty-icon { font-size:48px; }
  .empty-cta { border:none; border-radius:20px; padding:10px 22px; font-size:14px; font-weight:700; cursor:pointer; margin-top:8px; }

  /* ── FAB ──────────────────────────────────────────────────────── */
  .fab { position:fixed; bottom:24px; right:20px; width:56px; height:56px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 20px #0003; z-index:100; }
  .fab:active { transform:scale(.93); }

  /* ── Overlay ──────────────────────────────────────────────────── */
  .overlay { position:fixed; inset:0; background:#0006; z-index:200; border:none; cursor:default; width:100%; height:100%; }

  /* ── Detail Card ──────────────────────────────────────────────── */
  .detail-card { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; border:1px solid; z-index:300; padding:20px 16px 40px; }
  .detail-header { display:flex; align-items:flex-start; gap:10px; margin-bottom:14px; }
  .detail-color-bar { width:4px; border-radius:2px; min-height:24px; align-self:stretch; flex-shrink:0; }
  .detail-title { flex:1; font-size:18px; font-weight:700; line-height:1.3; }
  .detail-actions { display:flex; gap:4px; align-items:center; }
  .detail-act-btn { background:none; border:none; font-size:16px; cursor:pointer; padding:4px 6px; display:flex; align-items:center; }
  .detail-act-btn:active { opacity:.6; }
  .detail-row { display:flex; align-items:center; gap:10px; padding:6px 0; font-size:14px; }

  /* ── Modal ────────────────────────────────────────────────────── */
  .modal { position:fixed; bottom:0; left:0; right:0; border-radius:20px 20px 0 0; border:1px solid; z-index:300; max-height:88vh; display:flex; flex-direction:column; }
  .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 12px; flex-shrink:0; }
  .modal-close { background:none; border:none; font-size:18px; cursor:pointer; padding:4px; }
  .modal-close:active { opacity:.6; }
  .modal-title { font-size:16px; font-weight:700; }
  .modal-save-btn { background:none; border:none; font-size:16px; font-weight:700; cursor:pointer; }
  .modal-save-btn:active { opacity:.6; }
  .modal-body { flex:1; overflow-y:auto; padding:8px 16px 40px; display:flex; flex-direction:column; gap:0; }
  .modal-input { width:100%; font-size:20px; font-weight:700; border:none; outline:none; padding:8px 0 12px; margin-bottom:16px; }
  .modal-title-input { border-bottom-width:2px; border-bottom-style:solid; }
  .color-row { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
  .color-dot { width:26px; height:26px; border-radius:50%; border:none; cursor:pointer; flex-shrink:0; }
  .color-dot:active { transform:scale(.9); }
  .modal-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; }
  .modal-label { font-size:14px; }
  .modal-input-right { font-size:14px; outline:none; max-width:160px; }
  .modal-select { font-size:14px; outline:none; cursor:pointer; }
  .toggle { width:44px; height:24px; border-radius:12px; position:relative; cursor:pointer; transition:background .2s; flex-shrink:0; border:none; padding:0; }
  .toggle-knob { width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; top:2px; transition:transform .2s; box-shadow:0 1px 3px #0003; }
  .modal-textarea { width:100%; font-size:14px; outline:none; padding:10px 12px; resize:none; margin-top:16px; font-family:inherit; }
  .delete-btn { margin-top:20px; width:100%; background:none; border:1px solid #FF3B30; color:#FF3B30; border-radius:14px; padding:13px; font-size:15px; cursor:pointer; font-weight:600; }
  .delete-btn:active { opacity:.7; }
</style>