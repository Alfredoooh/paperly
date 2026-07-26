<script>
  import { createEventDispatcher, onMount, tick, onDestroy } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import { ProfileApiService } from '$shared/api.js';
  import { OCCUPATION_OPTIONS } from '$shared/plans.js';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';
  export let appId = 'profile';
  export let iconPath = '/icons/svg/regular/person.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';
  const ICON = {
    back: `${FLUENT_BASE}/arrow_left_24_regular.svg`,
    settings: `${FLUENT_BASE}/settings_24_regular.svg`,
    add: `${FLUENT_BASE}/add_24_regular.svg`,
    edit: `${FLUENT_BASE}/edit_24_regular.svg`,
    dismiss: `${FLUENT_BASE}/dismiss_24_regular.svg`,
    checkmark: `${FLUENT_BASE}/checkmark_24_regular.svg`,
    chevronRight: `${FLUENT_BASE}/chevron_right_20_regular.svg`,
    download: `${FLUENT_BASE}/arrow_download_24_regular.svg`,
    person: `${FLUENT_BASE}/person_24_regular.svg`,
    briefcase: `${FLUENT_BASE}/briefcase_24_regular.svg`,
    textDesc: `${FLUENT_BASE}/text_description_24_regular.svg`,
  };

  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  let bodyEl, bodyInnerEl;
  let touchStartY = 0, pullOriginY = null, isPulling = false;

  function dampen(delta) {
    const sign = delta < 0 ? -1 : 1;
    const abs = Math.abs(delta);
    return sign * (abs * 0.6) / (1 + abs / 110);
  }
  function resetPull(animate = true) {
    isPulling = false; pullOriginY = null;
    if (bodyInnerEl) {
      bodyInnerEl.style.transition = animate ? 'transform .48s cubic-bezier(0.16,1.35,0.3,1)' : 'none';
      bodyInnerEl.style.transform = 'translateY(0px)';
    }
  }
  function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!bodyEl || !bodyInnerEl) return;
    const y = e.touches[0].clientY;
    const st = bodyEl.scrollTop, maxScroll = bodyEl.scrollHeight - bodyEl.clientHeight;
    const atTop = st <= 0, atBottom = st >= maxScroll - 1;
    const draggingDown = y - touchStartY > 0, draggingUp = y - touchStartY < 0;
    if ((atTop && draggingDown) || (atBottom && draggingUp)) {
      if (!isPulling) { isPulling = true; pullOriginY = y; bodyInnerEl.style.transition = 'none'; }
      const raw = y - pullOriginY;
      const valid = atTop ? Math.max(raw, 0) : Math.min(raw, 0);
      bodyInnerEl.style.transform = `translateY(${dampen(valid)}px)`;
      if (Math.abs(dampen(valid)) > 0.5) e.preventDefault();
    } else if (isPulling) { resetPull(false); }
  }
  function onTouchEnd() { if (isPulling) resetPull(true); }

  let form = {
    name: '', age: '', country: '', state: '', city: '',
    occupation: '', occupationDetail: '', bio: '',
  };
  let loaded = false;
  let loading = true;

  async function loadProfile() {
    if (!user?.token) { loading = false; return; }
    loading = true;
    try {
      const me = await ProfileApiService.getMe(user.token);
      form = {
        name: me.name || '',
        age: me.profile?.age ?? '',
        country: me.profile?.country || '',
        state: me.profile?.state || '',
        city: me.profile?.city || '',
        occupation: me.profile?.occupation || '',
        occupationDetail: me.profile?.occupationDetail || '',
        bio: me.profile?.bio || '',
      };
      dispatch('userUpdate', {
        name: me.name, email: me.email, avatar: me.avatar,
        credits: me.credits, preferences: me.preferences, profile: me.profile,
      });
    } catch (e) {
      showToast(e.message || 'Erro ao carregar perfil');
    } finally {
      loaded = true;
      loading = false;
    }
  }

  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';
  $: occupationLabel = OCCUPATION_OPTIONS.find(o => o.id === form.occupation)?.label || null;

  const INFO_ROWS = [
    { key: 'age', label: 'Idade', get: f => f.age ? `${f.age} anos` : null },
    { key: 'country', label: 'País', get: f => f.country || null },
    { key: 'state', label: 'Estado / Província', get: f => f.state || null },
    { key: 'city', label: 'Cidade', get: f => f.city || null },
  ];
  $: filledRows = INFO_ROWS.map(r => ({ ...r, value: r.get(form) })).filter(r => r.value);

  let avatarImgEl;
  let showAvatarViewer = false;
  let avatarViewerVisible = false;
  let avatarViewerRect = null;
  let suppressAvatarPopstate = false;

  function openAvatarViewer() {
    if (!user?.avatar || !avatarImgEl) return;
    const r = avatarImgEl.getBoundingClientRect();
    avatarViewerRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    showAvatarViewer = true;
    avatarViewerVisible = false;
    history.pushState({ nexaAvatarViewer: true }, '', window.location.pathname + window.location.search + '#avatar');
    requestAnimationFrame(() => requestAnimationFrame(() => { avatarViewerVisible = true; }));
  }
  function closeAvatarViewer() {
    if (!showAvatarViewer) return;
    avatarViewerVisible = false;
    setTimeout(() => { showAvatarViewer = false; avatarViewerRect = null; }, 340);
    if (history.state && history.state.nexaAvatarViewer) {
      suppressAvatarPopstate = true;
      history.back();
      setTimeout(() => { suppressAvatarPopstate = false; }, 60);
    }
  }
  function onAvatarPopState() {
    if (suppressAvatarPopstate) return;
    if (showAvatarViewer) {
      avatarViewerVisible = false;
      setTimeout(() => { showAvatarViewer = false; avatarViewerRect = null; }, 340);
    }
  }

  $: avatarViewerStyle = avatarViewerRect
    ? (avatarViewerVisible
        ? 'top:0; left:0; width:100vw; height:100dvh; border-radius:0;'
        : `top:${avatarViewerRect.top}px; left:${avatarViewerRect.left}px; width:${avatarViewerRect.width}px; height:${avatarViewerRect.height}px; border-radius:50%;`)
    : '';

  // ══════════════════════════════════════════════════════════════════
  //  TELA DE EDIÇÃO — fullscreen, cards com raio uniforme
  // ══════════════════════════════════════════════════════════════════
  const editSlide = createSlideTransition({});
  let editSlideY = 100;
  const unsubscribeEditSlide = editSlide.subscribe((v) => { editSlideY = v; });

  let showEditScreen = false;
  let editForm = { ...form };
  let saving = false;

  let suppressEditPopstate = false;
  function onEditPopState() {
    if (suppressEditPopstate) return;
    const state = history.state;
    if (showEditScreen && (!state || state.nexaEdit === undefined)) {
      closeEditScreenVisual();
    }
  }

  function openEdit() {
    editForm = { ...form };
    const currentPath = window.location.pathname + window.location.search;
    history.pushState({ nexaEdit: true, fromPath: currentPath }, '', currentPath + '#edit');
    showEditScreen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { editSlide.open(); }));
  }
  function closeEditScreenVisual() {
    editSlide.close();
    setTimeout(() => { showEditScreen = false; }, 340);
  }
  function closeEditScreen() {
    if (!showEditScreen) return;
    if (history.state && history.state.nexaEdit) {
      history.back();
    } else {
      closeEditScreenVisual();
    }
  }

  const EDIT_CLOSE_THRESHOLD = 0.28;
  const EDIT_VELOCITY_FLING = 0.5;
  let editDragging = false;
  let editDragStartY = 0;
  let editDragCurrentY = 0;
  let editDragStartTime = 0;
  let editDragLiveActive = false;
  let editScreenH = 600;

  function onEditHeaderTouchStart(e) {
    editDragging = true;
    editDragLiveActive = false;
    editDragStartY = e.touches[0].clientY;
    editDragCurrentY = editDragStartY;
    editDragStartTime = performance.now();
    editScreenH = window.innerHeight || 600;
  }
  function onEditHeaderTouchMove(e) {
    if (!editDragging) return;
    const y = e.touches[0].clientY;
    editDragCurrentY = y;
    const delta = y - editDragStartY;
    if (delta <= 4) return;
    if (!editDragLiveActive) editDragLiveActive = true;
    const progress = Math.min(1, Math.max(0, delta / editScreenH));
    editSlide.setDragValue(progress * 100);
    e.preventDefault();
  }
  function onEditHeaderTouchEnd() {
    if (!editDragging) return;
    editDragging = false;
    if (!editDragLiveActive) { editDragLiveActive = false; return; }
    editDragLiveActive = false;
    const elapsed = Math.max(1, performance.now() - editDragStartTime);
    const delta = editDragCurrentY - editDragStartY;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / editScreenH));
    const shouldClose = draggedFraction > EDIT_CLOSE_THRESHOLD || (delta > 0 && velocity > EDIT_VELOCITY_FLING);
    if (shouldClose) {
      closeEditScreen();
    } else {
      editSlide.releaseDragTo('open');
    }
  }

  async function saveProfile() {
    if (!user?.token) return;
    saving = true;
    try {
      if (editForm.name && editForm.name.trim() !== userName) {
        await ProfileApiService.updateAccount(user.token, { name: editForm.name.trim() });
      }
      await ProfileApiService.updateProfile(user.token, {
        age: editForm.age === '' ? null : Number(editForm.age),
        country: editForm.country || null,
        state: editForm.state || null,
        city: editForm.city || null,
        occupation: editForm.occupation || null,
        occupationDetail: editForm.occupationDetail || null,
        bio: editForm.bio || null,
      });
      showToast('Perfil atualizado');
      closeEditScreen();
      await loadProfile();
    } catch (e) {
      showToast(e.message || 'Erro ao guardar');
    } finally {
      saving = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  MODAL SHEET DE CAMPO — bottom sheet nativo (NÃO dialog central).
  //  Mesmo padrão visual do sheet de ocupação: overlay + folha que
  //  sobe do fundo, grabber, título, um input, botão Guardar.
  // ══════════════════════════════════════════════════════════════════
  const fieldSheetSlide = createSlideTransition({});
  let fieldSheetY = 100;
  const unsubscribeFieldSheetSlide = fieldSheetSlide.subscribe((v) => { fieldSheetY = v; });
  let showFieldSheet = false;
  let fieldSheetOverlayVisible = false;
  let fieldSheetKey = null;
  let fieldSheetLabel = '';
  let fieldSheetType = 'text';
  let fieldSheetValue = '';
  let fieldSheetEl;
  let fieldInputEl;

  function openFieldSheet(key, label, type = 'text') {
    fieldSheetKey = key;
    fieldSheetLabel = label;
    fieldSheetType = type;
    fieldSheetValue = editForm[key] ?? '';
    showFieldSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fieldSheetOverlayVisible = true;
      fieldSheetSlide.open();
      setTimeout(() => { fieldInputEl?.focus(); }, 280);
    }));
  }
  function closeFieldSheet() {
    fieldSheetOverlayVisible = false;
    fieldSheetSlide.close();
    setTimeout(() => { showFieldSheet = false; fieldSheetKey = null; }, 300);
  }
  function saveFieldSheet() {
    if (fieldSheetKey) editForm[fieldSheetKey] = fieldSheetValue;
    closeFieldSheet();
  }

  const fieldSheetDrag = makeSheetDragLocal(fieldSheetSlide, () => fieldSheetEl ? fieldSheetEl.getBoundingClientRect().height : 400, closeFieldSheet);

  // ── Modal sheet de nome — mesmo padrão ─────────────────────────────
  const nameSheetSlide = createSlideTransition({});
  let nameSheetY = 100;
  const unsubscribeNameSheetSlide = nameSheetSlide.subscribe((v) => { nameSheetY = v; });
  let showNameSheet = false;
  let nameSheetOverlayVisible = false;
  let nameSheetValue = '';
  let nameSheetEl;
  let nameInputEl;

  function openNameSheet() {
    nameSheetValue = editForm.name;
    showNameSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      nameSheetOverlayVisible = true;
      nameSheetSlide.open();
      setTimeout(() => { nameInputEl?.focus(); }, 280);
    }));
  }
  function closeNameSheet() {
    nameSheetOverlayVisible = false;
    nameSheetSlide.close();
    setTimeout(() => { showNameSheet = false; }, 300);
  }
  function saveNameSheet() {
    editForm.name = nameSheetValue;
    closeNameSheet();
  }

  const nameSheetDrag = makeSheetDragLocal(nameSheetSlide, () => nameSheetEl ? nameSheetEl.getBoundingClientRect().height : 300, closeNameSheet);

  // ── Helper de arrasto reutilizável para os sheets desta página ──────
  function makeSheetDragLocal(slideCtrl, getHeight, onClose) {
    let dragging = false, liveActive = false;
    let startY = 0, currentY = 0, startTime = 0, sheetH = 400;
    return {
      touchstart(e) {
        dragging = true;
        liveActive = false;
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = performance.now();
        sheetH = getHeight();
      },
      touchmove(e) {
        if (!dragging) return;
        const y = e.touches[0].clientY;
        currentY = y;
        const delta = y - startY;
        if (delta <= 4) return;
        if (!liveActive) liveActive = true;
        const progress = Math.min(1, Math.max(0, delta / sheetH));
        slideCtrl.setDragValue(progress * 100);
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
        const shouldClose = draggedFraction > 0.3 || (delta > 0 && velocity > 0.5);
        if (shouldClose) onClose();
        else slideCtrl.releaseDragTo('open');
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  BOTTOM SHEET — seletor de ocupação
  // ══════════════════════════════════════════════════════════════════
  const occSheetSlide = createSlideTransition({});
  let occSheetY = 100;
  const unsubscribeOccSheetSlide = occSheetSlide.subscribe((v) => { occSheetY = v; });
  let showOccSheet = false;
  let occOverlayVisible = false;

  function openOccSheet() {
    showOccSheet = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      occOverlayVisible = true;
      occSheetSlide.open();
    }));
  }
  function closeOccSheet() {
    occOverlayVisible = false;
    occSheetSlide.close();
    setTimeout(() => { showOccSheet = false; }, 300);
  }
  function pickOcc(id) {
    editForm.occupation = id;
    closeOccSheet();
  }

  let occSheetEl;
  const occSheetDrag = makeSheetDragLocal(occSheetSlide, () => occSheetEl ? occSheetEl.getBoundingClientRect().height : 400, closeOccSheet);

  let avatarUploading = false;
  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarUploading = true;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await ProfileApiService.updateAvatar(user.token, reader.result);
        dispatch('userUpdate', { avatar: reader.result });
        showToast('Foto atualizada');
      } catch (err) {
        showToast(err.message || 'Erro ao atualizar foto');
      } finally {
        avatarUploading = false;
      }
    };
    reader.readAsDataURL(file);
  }
  function onUploadLabelClick(e) {
    e.stopPropagation();
  }

  onMount(() => {
    loadProfile();
    window.addEventListener('popstate', onEditPopState);
    window.addEventListener('popstate', onAvatarPopState);
  });
  onDestroy(() => {
    window.removeEventListener('popstate', onEditPopState);
    window.removeEventListener('popstate', onAvatarPopState);
    unsubscribeEditSlide?.();
    unsubscribeOccSheetSlide?.();
    unsubscribeFieldSheetSlide?.();
    unsubscribeNameSheetSlide?.();
    editSlide.destroy();
    occSheetSlide.destroy();
    fieldSheetSlide.destroy();
    nameSheetSlide.destroy();
  });
</script>

<div class="pf-root" class:pf-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary};">

  <div class="pf-header">
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'home'})}>
      <span class="icon-mask" style="mask-image:url('{ICON.back}');-webkit-mask-image:url('{ICON.back}');background:{c.iconTint};width:24px;height:24px"></span>
    </button>
    <span class="pf-header-title" style="color:{c.textPrimary}">{appTitle}</span>
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'settings'})}>
      <span class="icon-mask" style="mask-image:url('{ICON.settings}');-webkit-mask-image:url('{ICON.settings}');background:{c.iconTint};width:24px;height:24px"></span>
    </button>
  </div>

  <div class="pf-body" bind:this={bodyEl}
    on:touchstart={onTouchStart}
    on:touchmove|nonpassive={onTouchMove}
    on:touchend={onTouchEnd}
    on:touchcancel={onTouchEnd}>
    <div class="pf-body-inner" bind:this={bodyInnerEl}>

      <div class="pf-hero">
        <button class="pf-avatar-wrap" style="background:{c.primary}" on:click={openAvatarViewer}>
          {#if user?.avatar}
            <img bind:this={avatarImgEl} src={user.avatar} alt={userName} />
          {:else}
            <span class="pf-avatar-initial" bind:this={avatarImgEl}>{userInitial}</span>
          {/if}
          {#if avatarUploading}
            <div class="pf-avatar-loading"><div class="pf-spinner"></div></div>
          {/if}
          <label class="pf-avatar-edit-badge" style="background:{c.dialogBackground};border-color:{c.background}" on:click={onUploadLabelClick}>
            <input type="file" accept="image/*" on:change={handleAvatarPick} hidden />
            <span class="icon-mask" style="mask-image:url('{ICON.download}');-webkit-mask-image:url('{ICON.download}');background:{c.iconTint};width:13px;height:13px"></span>
          </label>
        </button>
        <h1>{userName}</h1>
        {#if userEmail}<p style="color:{c.textSecondary}">{userEmail}</p>{/if}
      </div>

      {#if loading}
        <div class="pf-skeleton-wrap">
          {#each [1,2,3] as i}
            <div class="pf-skeleton-row"></div>
          {/each}
        </div>
      {:else}
        <div class="pf-section-title" style="color:{c.textSecondary}">Dados pessoais</div>
        <div class="pf-card">
          {#if filledRows.length === 0 && !occupationLabel && !form.bio}
            <button class="pf-empty-row" style="color:{c.textSecondary}" on:click={openEdit}>
              <span class="icon-mask" style="mask-image:url('{ICON.add}');-webkit-mask-image:url('{ICON.add}');background:{c.primary};width:16px;height:16px"></span>
              <span>Adicionar informações do perfil</span>
            </button>
          {:else}
            {#each filledRows as row, i}
              <div class="pf-info-row">
                <div class="pf-info-left">
                  <span class="pf-info-label" style="color:{c.textSecondary}">{row.label}</span>
                </div>
                <span class="pf-info-value" style="color:{c.textPrimary}">{row.value}</span>
              </div>
            {/each}
            {#if occupationLabel}
              <div class="pf-info-row">
                <div class="pf-info-left">
                  <span class="pf-info-label" style="color:{c.textSecondary}">Ocupação</span>
                </div>
                <span class="pf-info-value" style="color:{c.textPrimary}">{occupationLabel}</span>
              </div>
              {#if form.occupationDetail}
                <div class="pf-info-row">
                  <div class="pf-info-left">
                    <span class="pf-info-label" style="color:{c.textSecondary}">Detalhe</span>
                  </div>
                  <span class="pf-info-value" style="color:{c.textPrimary}">{form.occupationDetail}</span>
                </div>
              {/if}
            {/if}
            {#if form.bio}
              <div class="pf-info-row pf-bio-row">
                <span class="pf-info-label" style="color:{c.textSecondary}">Bio</span>
                <span class="pf-info-value pf-bio-value" style="color:{c.textPrimary}">{form.bio}</span>
              </div>
            {/if}
          {/if}
        </div>

        <button class="pf-edit-btn" on:click={openEdit}>
          <span class="icon-mask" style="mask-image:url('{ICON.edit}');-webkit-mask-image:url('{ICON.edit}');background:#fff;width:15px;height:15px"></span>
          Editar perfil
        </button>
      {/if}

    </div>
  </div>

  {#if showAvatarViewer && user?.avatar}
    <div class="avatar-viewer-overlay" class:avatar-viewer-overlay-in={avatarViewerVisible} on:click={closeAvatarViewer}></div>
    <div class="avatar-viewer" style={avatarViewerStyle}>
      <img class="avatar-viewer-img" src={user.avatar} alt={userName} />
    </div>
    <button class="avatar-viewer-back" class:avatar-viewer-back-in={avatarViewerVisible} on:click={closeAvatarViewer} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('{ICON.back}');-webkit-mask-image:url('{ICON.back}');background:#fff;width:24px;height:24px"></span>
    </button>
  {/if}

  {#if showEditScreen}
    <div class="edit-screen"
      style="background:{c.background};color:{c.textPrimary};transform: translate3d(0, {editSlideY}%, 0);">

      <div class="edit-drag-zone"
        on:touchstart={onEditHeaderTouchStart}
        on:touchmove|nonpassive={onEditHeaderTouchMove}
        on:touchend={onEditHeaderTouchEnd}
        on:touchcancel={onEditHeaderTouchEnd}>
        <div class="edit-grabber" style="background:{c.divider}"></div>
        <div class="edit-header">
          <button class="pf-icon-btn" style="background:{c.appbarBtnBg}" on:click={closeEditScreen} disabled={saving}>
            <span class="icon-mask" style="mask-image:url('{ICON.dismiss}');-webkit-mask-image:url('{ICON.dismiss}');background:{c.iconTint};width:18px;height:18px"></span>
          </button>
          <span class="edit-header-title" style="color:{c.textPrimary}">Editar perfil</span>
          <button class="pf-icon-btn edit-save-icon-btn" style="background:{c.appbarBtnBg}" on:click={saveProfile} disabled={saving}>
            {#if saving}
              <span class="edit-save-spinner" style="border-color:{c.divider};border-top-color:{c.iconTint}"></span>
            {:else}
              <span class="icon-mask" style="mask-image:url('{ICON.checkmark}');-webkit-mask-image:url('{ICON.checkmark}');background:{c.iconTint};width:22px;height:22px"></span>
            {/if}
          </button>
        </div>
      </div>

      <div class="edit-body">

        <div class="edit-section-title" style="color:{c.textSecondary}">Nome</div>
        <div class="edit-card">
          <button class="edit-row edit-row-btn" on:click={openNameSheet}>
            <div class="edit-row-left">
              <span class="icon-mask edit-row-icon" style="mask-image:url('{ICON.person}');-webkit-mask-image:url('{ICON.person}');background:{c.textSecondary}"></span>
              <span class="edit-row-lbl" style="color:{c.textPrimary}">Nome</span>
            </div>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.name || 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Localização</div>
        <div class="edit-card">
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('age', 'Idade', 'number')}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Idade</span>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.age ? `${editForm.age} anos` : 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('country', 'País', 'text')}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">País</span>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.country || 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('state', 'Estado / Província', 'text')}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Estado / Província</span>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.state || 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('city', 'Cidade', 'text')}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Cidade</span>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.city || 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Ocupação</div>
        <div class="edit-card">
          <button class="edit-row edit-row-btn" on:click={openOccSheet}>
            <div class="edit-row-left">
              <span class="icon-mask edit-row-icon" style="mask-image:url('{ICON.briefcase}');-webkit-mask-image:url('{ICON.briefcase}');background:{c.textSecondary}"></span>
              <span class="edit-row-lbl" style="color:{c.textPrimary}">Ocupação</span>
            </div>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">
                {OCCUPATION_OPTIONS.find(o => o.id === editForm.occupation)?.label || 'Selecionar'}
              </span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('occupationDetail', 'Detalhe da ocupação', 'text')}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Detalhe</span>
            <div class="edit-row-right-group">
              <span class="edit-row-val" style="color:{c.textSecondary}">{editForm.occupationDetail || 'Adicionar'}</span>
              <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Bio</div>
        <div class="edit-card">
          <button class="edit-row edit-row-btn" on:click={() => openFieldSheet('bio', 'Bio', 'textarea')}>
            <div class="edit-row-left">
              <span class="icon-mask edit-row-icon" style="mask-image:url('{ICON.textDesc}');-webkit-mask-image:url('{ICON.textDesc}');background:{c.textSecondary}"></span>
              <span class="edit-row-lbl" style="color:{c.textPrimary}">Bio</span>
            </div>
            <span class="icon-mask" style="mask-image:url('{ICON.chevronRight}');-webkit-mask-image:url('{ICON.chevronRight}');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
          </button>
          {#if editForm.bio}
            <div class="edit-bio-preview" style="color:{c.textSecondary};border-top:1px solid {c.divider}">{editForm.bio}</div>
          {/if}
        </div>

      </div>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       MODAL SHEET — Nome (bottom sheet, não dialog central)
  ══════════════════════════════════════════════════════════════ -->
  {#if showNameSheet}
    <button class="overlay" class:overlay-in={nameSheetOverlayVisible} on:click={closeNameSheet}></button>
    <div class="field-sheet" bind:this={nameSheetEl}
      style="background:{c.dialogBackground};transform: translate3d(0, {nameSheetY}%, 0);">
      <div class="sheet-grab-zone"
        on:touchstart={nameSheetDrag.touchstart}
        on:touchmove|nonpassive={nameSheetDrag.touchmove}
        on:touchend={nameSheetDrag.touchend}
        on:touchcancel={nameSheetDrag.touchend}>
        <div class="sheet-handle" style="background:{c.divider}"></div>
        <div class="field-sheet-title" style="color:{c.textPrimary}">Nome</div>
      </div>
      <div class="field-sheet-body">
        <input
          bind:this={nameInputEl}
          class="field-sheet-input"
          style="color:{c.textPrimary};caret-color:{c.primary};background:{c.appbarBtnBg}"
          placeholder="O teu nome"
          bind:value={nameSheetValue} />
        <button class="field-sheet-save-btn" style="background:{c.primary}" on:click={saveNameSheet}>Guardar</button>
      </div>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       MODAL SHEET — Campo genérico (bottom sheet, não dialog central)
  ══════════════════════════════════════════════════════════════ -->
  {#if showFieldSheet}
    <button class="overlay" class:overlay-in={fieldSheetOverlayVisible} on:click={closeFieldSheet}></button>
    <div class="field-sheet" bind:this={fieldSheetEl}
      style="background:{c.dialogBackground};transform: translate3d(0, {fieldSheetY}%, 0);">
      <div class="sheet-grab-zone"
        on:touchstart={fieldSheetDrag.touchstart}
        on:touchmove|nonpassive={fieldSheetDrag.touchmove}
        on:touchend={fieldSheetDrag.touchend}
        on:touchcancel={fieldSheetDrag.touchend}>
        <div class="sheet-handle" style="background:{c.divider}"></div>
        <div class="field-sheet-title" style="color:{c.textPrimary}">{fieldSheetLabel}</div>
      </div>
      <div class="field-sheet-body">
        {#if fieldSheetType === 'textarea'}
          <textarea
            bind:this={fieldInputEl}
            class="field-sheet-textarea"
            style="color:{c.textPrimary};caret-color:{c.primary};background:{c.appbarBtnBg}"
            rows="4"
            placeholder="Escreve aqui…"
            bind:value={fieldSheetValue}></textarea>
        {:else if fieldSheetType === 'number'}
          <input
            bind:this={fieldInputEl}
            type="number" min="0" max="120"
            class="field-sheet-input"
            style="color:{c.textPrimary};caret-color:{c.primary};background:{c.appbarBtnBg}"
            placeholder="—"
            bind:value={fieldSheetValue} />
        {:else}
          <input
            bind:this={fieldInputEl}
            class="field-sheet-input"
            style="color:{c.textPrimary};caret-color:{c.primary};background:{c.appbarBtnBg}"
            placeholder="Adicionar"
            bind:value={fieldSheetValue} />
        {/if}
        <button class="field-sheet-save-btn" style="background:{c.primary}" on:click={saveFieldSheet}>Guardar</button>
      </div>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       BOTTOM SHEET — seletor de ocupação
  ══════════════════════════════════════════════════════════════ -->
  {#if showOccSheet}
    <button class="overlay" class:overlay-in={occOverlayVisible} on:click={closeOccSheet}></button>
    <div class="bottom-sheet" bind:this={occSheetEl}
      style="background:{c.dialogBackground};transform: translate3d(0, {occSheetY}%, 0);">
      <div class="sheet-grab-zone"
        on:touchstart={occSheetDrag.touchstart}
        on:touchmove|nonpassive={occSheetDrag.touchmove}
        on:touchend={occSheetDrag.touchend}
        on:touchcancel={occSheetDrag.touchend}>
        <div class="sheet-handle" style="background:{c.divider}"></div>
        <div class="sheet-title" style="color:{c.textPrimary}">Ocupação</div>
      </div>
      {#each OCCUPATION_OPTIONS as opt}
        <button class="sheet-opt" on:click={() => pickOcc(opt.id)}>
          <span class="sheet-opt-label" style="color:{c.textPrimary}">{opt.label}</span>
          {#if editForm.occupation === opt.id}
            <span class="icon-mask" style="mask-image:url('{ICON.checkmark}');-webkit-mask-image:url('{ICON.checkmark}');background:{c.primary};width:16px;height:16px"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

</div>

<style>
  .pf-root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }
  .pf-root.pf-in { opacity:1; }
  .pf-root * { box-sizing: border-box; }

  .icon-mask {
    display: block; flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .pf-header {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .pf-icon-btn {
    width: 36px; height: 36px; border-radius: 4px; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .16s ease;
  }
  .pf-icon-btn:active { transform: scale(0.86); opacity: .65; }
  .pf-icon-btn:disabled { opacity: .4; }
  .pf-header-title { flex: 1; text-align: center; font-size: 16px; font-weight: 700; }

  .pf-body {
    flex: 1; min-height: 0; overflow-y: auto;
    padding-bottom: calc(env(safe-area-inset-bottom,0px) + 24px);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain; touch-action: pan-y;
  }
  .pf-body-inner { width: 100%; will-change: transform; }

  .pf-hero { padding: 24px 16px 10px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }

  .pf-avatar-wrap {
    position: relative; width: 92px; height: 92px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; overflow: visible;
    border: none; padding: 0; cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pf-avatar-wrap:active { transform: scale(0.96); }
  .pf-avatar-wrap img {
    width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
    display: block;
  }
  .pf-avatar-initial { font-size: 34px; font-weight: 700; color: #fff; }
  .pf-avatar-loading {
    position: absolute; inset: 0; background: rgba(0,0,0,.4); z-index: 2; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .pf-spinner {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,.35); border-top-color: #fff;
    animation: pf-spin .7s linear infinite;
  }
  @keyframes pf-spin { to { transform: rotate(360deg); } }

  .pf-avatar-edit-badge {
    position: absolute; bottom: -2px; right: -2px; z-index: 3;
    width: 30px; height: 30px;
    border-radius: 50%; border: 2.5px solid;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .16s ease;
  }
  .pf-avatar-edit-badge:active { transform: scale(0.88); opacity: .8; }

  .pf-hero h1 { margin: 10px 0 0; font-size: 21px; font-weight: 800; line-height: 1.15; }
  .pf-hero p { margin: 0; font-size: 13.5px; }

  .pf-skeleton-wrap { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 10px; }
  .pf-skeleton-row {
    height: 54px; border-radius: 16px; opacity: .5;
    background: var(--drawer-bg);
    animation: pf-pulse 1.2s ease-in-out infinite;
  }
  :global([data-theme="dark"]) .pf-skeleton-row { background: var(--btn-bg); }
  @keyframes pf-pulse { 0%,100% { opacity: .35; } 50% { opacity: .65; } }

  .pf-section-title { padding: 22px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .pf-card {
    margin: 0 16px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .pf-card { background: var(--btn-bg); }
  .pf-info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid var(--drawer-sep); gap: 12px;
  }
  .pf-info-row:last-child { border-bottom: none; }
  .pf-info-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .pf-info-label { font-size: 13px; white-space: nowrap; }
  .pf-info-value { font-size: 14px; font-weight: 600; text-align: right; }
  .pf-bio-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .pf-bio-value { text-align: left; font-weight: 400; line-height: 1.5; }
  .pf-empty-row {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 18px 16px; background: none; border: none; cursor: pointer;
    font-size: 14px; text-align: left; transition: opacity .14s;
  }
  .pf-empty-row:active { opacity: .6; }

  .pf-edit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: calc(100% - 32px); margin: 20px 16px 0; padding: 15px;
    border: none; border-radius: 16px; background: var(--accent-primary);
    color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s, background .18s ease;
  }
  .pf-edit-btn:active { transform: scale(0.98); opacity: .88; background: var(--accent-primary-active); }

  .avatar-viewer-overlay {
    position: fixed; inset: 0; z-index: 550;
    background: rgba(0,0,0,0);
    transition: background .34s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .avatar-viewer-overlay.avatar-viewer-overlay-in { background: rgba(0,0,0,.92); }
  .avatar-viewer {
    position: fixed; z-index: 551;
    overflow: hidden;
    transition: top .38s cubic-bezier(0.32, 0.72, 0, 1),
                left .38s cubic-bezier(0.32, 0.72, 0, 1),
                width .38s cubic-bezier(0.32, 0.72, 0, 1),
                height .38s cubic-bezier(0.32, 0.72, 0, 1),
                border-radius .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: top, left, width, height, border-radius;
  }
  .avatar-viewer-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .avatar-viewer-back {
    position: fixed; z-index: 552;
    top: calc(env(safe-area-inset-top,0px) + 14px); left: 14px;
    width: 40px; height: 40px; border-radius: 4px;
    border: none; background: rgba(0,0,0,.4);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    opacity: 0; transform: scale(0.85);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.34,1.56,0.64,1);
  }
  .avatar-viewer-back.avatar-viewer-back-in { opacity: 1; transform: scale(1); }
  .avatar-viewer-back:active { transform: scale(0.88); }

  .edit-screen {
    position: fixed; inset: 0; z-index: 500;
    display: flex; flex-direction: column;
    will-change: transform;
  }
  .edit-drag-zone { flex-shrink: 0; touch-action: none; }
  .edit-grabber { width: 36px; height: 4px; border-radius: 2px; margin: 8px auto 2px; opacity: .55; }
  .edit-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: calc(env(safe-area-inset-top,0px) + 6px) 14px 14px;
    gap: 8px;
  }
  .edit-header-title { font-size: 16px; font-weight: 700; flex: 1; text-align: center; }
  .edit-save-icon-btn { position: relative; }
  .edit-save-icon-btn:disabled { opacity: .55; }
  .edit-save-spinner {
    width: 15px; height: 15px; border-radius: 50%;
    border: 2px solid; border-top-color: transparent;
    animation: pf-spin .7s linear infinite;
  }

  .edit-body { flex: 1; overflow-y: auto; padding-bottom: calc(env(safe-area-inset-bottom,0px) + 24px); }
  .edit-section-title { padding: 20px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }

  .edit-card {
    margin: 0 16px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--drawer-bg);
  }
  :global([data-theme="dark"]) .edit-card { background: var(--btn-bg); }

  .edit-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; gap: 12px; width: 100%; background: none; border: none;
    border-bottom: 1px solid var(--drawer-sep);
  }
  .edit-row:last-child { border-bottom: none; }
  .edit-row-btn { cursor: pointer; text-align: left; transition: opacity .14s; }
  .edit-row-btn:active { opacity: .6; }
  .edit-row-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .edit-row-icon { width: 20px; height: 20px; }
  .edit-row-lbl { font-size: 15px; font-weight: 500; }
  .edit-row-right-group { display: flex; align-items: center; gap: 6px; max-width: 60%; }
  .edit-row-val { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .edit-bio-preview {
    padding: 12px 16px 16px; font-size: 13.5px; line-height: 1.5;
  }

  /* ── Modal sheet de campo (bottom sheet) — flutuante, não dialog ── */
  .field-sheet {
    position: fixed; left: 12px; right: 12px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 12px);
    border-radius: 24px; z-index: 900;
    will-change: transform;
    box-shadow: 0 12px 40px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
    overflow: hidden;
  }
  .field-sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 10px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; }
  .field-sheet-body { padding: 4px 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .field-sheet-input {
    width: 100%; padding: 13px 14px; border-radius: 12px; border: none;
    font-size: 16px; outline: none; font-family: inherit;
  }
  .field-sheet-textarea {
    width: 100%; padding: 13px 14px; border-radius: 12px; border: none;
    font-size: 16px; outline: none; font-family: inherit; resize: none; line-height: 1.5;
  }
  .field-sheet-save-btn {
    width: 100%; padding: 14px; border-radius: 12px; border: none;
    color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: opacity .15s ease, transform .15s cubic-bezier(0.34,1.56,0.64,1);
  }
  .field-sheet-save-btn:active { transform: scale(0.98); opacity: .88; }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .34s cubic-bezier(0.32, 0.72, 0, 1);
    -webkit-backdrop-filter: blur(0px);
    backdrop-filter: blur(0px);
  }
  .overlay.overlay-in {
    background: rgba(0,0,0,.42);
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }
  .bottom-sheet {
    position: fixed; left: 12px; right: 12px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 12px);
    border-radius: 24px; z-index: 700;
    padding: 0 0 10px;
    will-change: transform;
    box-shadow: 0 12px 40px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08);
    overflow: hidden;
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; opacity: .8; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; }
  .sheet-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; background: none; border: none; cursor: pointer; text-align: left;
    transition: opacity .16s ease;
  }
  .sheet-opt:active { opacity: .6; }
  .sheet-opt-label { font-size: 15px; font-weight: 500; }

  @media (prefers-reduced-motion: reduce) {
    .pf-root, .pf-icon-btn, .pf-avatar-wrap, .pf-avatar-edit-badge, .pf-edit-btn, .edit-row-btn, .sheet-opt,
    .avatar-viewer-overlay, .avatar-viewer, .avatar-viewer-back, .field-sheet, .field-sheet-save-btn {
      transition: none !important;
    }
  }
</style>