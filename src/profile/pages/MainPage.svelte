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
  export let iconPath = '/icons/svg/regular/user.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // ── Entrada da página ────────────────────────────────────────────
  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  // ── Rubber-band scroll ───────────────────────────────────────────
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

  // ── Dados do perfil ──────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════
  //  VISUALIZADOR DE AVATAR EM TELA CHEIA — container transform
  // ══════════════════════════════════════════════════════════════════
  // O avatar "expande" da posição/tamanho exatos do círculo pequeno na
  // Hero até preencher o ecrã — FLIP technique: mede o rect de origem
  // no clique, monta a camada fullscreen já posicionada/dimensionada
  // EXATAMENTE como o círculo pequeno (via style inline, sem
  // transition), e só no frame seguinte anima para inset:0. O caminho
  // inverso (fechar) faz o mesmo em sentido contrário antes de
  // desmontar — a mesma técnica de "origem visível" usada pelo resto
  // da app para telas que abrem a partir de um elemento concreto.
  let avatarImgEl;
  let showAvatarViewer = false;
  let avatarViewerVisible = false;
  let avatarViewerRect = null; // {top,left,width,height,borderRadius}

  function openAvatarViewer() {
    if (!user?.avatar || !avatarImgEl) return;
    const r = avatarImgEl.getBoundingClientRect();
    avatarViewerRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    showAvatarViewer = true;
    avatarViewerVisible = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { avatarViewerVisible = true; }));
  }
  function closeAvatarViewer() {
    avatarViewerVisible = false;
    setTimeout(() => { showAvatarViewer = false; avatarViewerRect = null; }, 340);
  }

  $: avatarViewerStyle = avatarViewerRect
    ? (avatarViewerVisible
        ? 'top:0; left:0; width:100vw; height:100dvh; border-radius:0;'
        : `top:${avatarViewerRect.top}px; left:${avatarViewerRect.left}px; width:${avatarViewerRect.width}px; height:${avatarViewerRect.height}px; border-radius:50%;`)
    : '';

  // ══════════════════════════════════════════════════════════════════
  //  TELA DE EDIÇÃO (fullscreen slide-up nativo — spring dedicado)
  // ══════════════════════════════════════════════════════════════════
  const editSlide = createSlideTransition({});
  let editSlideY = 100;
  const unsubscribeEditSlide = editSlide.subscribe((v) => { editSlideY = v; });

  let showEditScreen = false;
  let editForm = { ...form };
  let saving = false;

  // ── Voltar físico/gesto fecha a tela de edição ─────────────────────
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

  // ── Gesto de arrastar para fechar (swipe-down nativo) ───────────────
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

  const SHEET_CLOSE_THRESHOLD = 0.3;
  const SHEET_VELOCITY_FLING = 0.5;
  let sheetDragging = false;
  let sheetDragStartY = 0;
  let sheetDragCurrentY = 0;
  let sheetDragStartTime = 0;
  let sheetDragLiveActive = false;
  let sheetDragH = 400;
  let occSheetEl;

  function onSheetGrabTouchStart(e) {
    sheetDragging = true;
    sheetDragLiveActive = false;
    sheetDragStartY = e.touches[0].clientY;
    sheetDragCurrentY = sheetDragStartY;
    sheetDragStartTime = performance.now();
    sheetDragH = occSheetEl ? occSheetEl.getBoundingClientRect().height : 400;
  }
  function onSheetGrabTouchMove(e) {
    if (!sheetDragging) return;
    const y = e.touches[0].clientY;
    sheetDragCurrentY = y;
    const delta = y - sheetDragStartY;
    if (delta <= 4) return;
    if (!sheetDragLiveActive) sheetDragLiveActive = true;
    const progress = Math.min(1, Math.max(0, delta / sheetDragH));
    occSheetSlide.setDragValue(progress * 100);
    e.preventDefault();
  }
  function onSheetGrabTouchEnd() {
    if (!sheetDragging) return;
    sheetDragging = false;
    if (!sheetDragLiveActive) { sheetDragLiveActive = false; return; }
    sheetDragLiveActive = false;
    const elapsed = Math.max(1, performance.now() - sheetDragStartTime);
    const delta = sheetDragCurrentY - sheetDragStartY;
    const velocity = Math.abs(delta) / elapsed;
    const draggedFraction = Math.min(1, Math.max(0, delta / sheetDragH));
    const shouldClose = draggedFraction > SHEET_CLOSE_THRESHOLD || (delta > 0 && velocity > SHEET_VELOCITY_FLING);
    if (shouldClose) {
      closeOccSheet();
    } else {
      occSheetSlide.releaseDragTo('open');
    }
  }

  // ── Avatar ────────────────────────────────────────────────────────
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
  // impede que o clique no badge de upload (que fica por cima do
  // avatar) dispare também a abertura do visualizador em tela cheia
  function onUploadLabelClick(e) {
    e.stopPropagation();
  }

  onMount(() => {
    loadProfile();
    window.addEventListener('popstate', onEditPopState);
  });
  onDestroy(() => {
    window.removeEventListener('popstate', onEditPopState);
    unsubscribeEditSlide?.();
    unsubscribeOccSheetSlide?.();
    editSlide.destroy();
    occSheetSlide.destroy();
  });
</script>

<!-- ═══════════════════════════════════════════════════════════════════
     ROOT — o slide de entrada/saída é gerido pelo wrapper
     .profile-main-layer no App.svelte pai.
════════════════════════════════════════════════════════════════════ -->
<div class="pf-root" class:pf-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary};">

  <!-- ══ APPBAR ══════════════════════════════════════════════════ -->
  <div class="pf-header">
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'home'})}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/back_arrow.svg');-webkit-mask-image:url('/icons/svg/regular/back_arrow.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>
    <span class="pf-header-title" style="color:{c.textPrimary}">{appTitle}</span>
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'settings'})}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/settings.svg');-webkit-mask-image:url('/icons/svg/regular/settings.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>
  </div>

  <!-- ══ CORPO SCROLLÁVEL ════════════════════════════════════════ -->
  <div class="pf-body" bind:this={bodyEl}
    on:touchstart={onTouchStart}
    on:touchmove|nonpassive={onTouchMove}
    on:touchend={onTouchEnd}
    on:touchcancel={onTouchEnd}>
    <div class="pf-body-inner" bind:this={bodyInnerEl}>

      <!-- Hero -->
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
          <!-- Badge de atualizar avatar: pequeno, ancorado no canto
               inferior direito, SEMPRE por cima e sempre visível —
               não cobre o círculo inteiro, não é um overlay ao toque. -->
          <label class="pf-avatar-edit-badge" style="background:{c.dialogBackground};border-color:{c.background}" on:click={onUploadLabelClick}>
            <input type="file" accept="image/*" on:change={handleAvatarPick} hidden />
            <span class="icon-mask" style="mask-image:url('/icons/svg/regular/upload.svg');-webkit-mask-image:url('/icons/svg/regular/upload.svg');background:{c.iconTint};width:13px;height:13px"></span>
          </label>
        </button>
        <h1>{userName}</h1>
        {#if userEmail}<p style="color:{c.textSecondary}">{userEmail}</p>{/if}
      </div>

      {#if loading}
        <div class="pf-skeleton-wrap">
          {#each [1,2,3] as i}
            <div class="pf-skeleton-row" style="background:{c.authInputFill}"></div>
          {/each}
        </div>
      {:else}
        <!-- Dados pessoais -->
        <div class="pf-section-title" style="color:{c.textSecondary}">Dados pessoais</div>
        <div class="pf-card" style="background:{c.authInputFill};border-color:{c.divider}">
          {#if filledRows.length === 0 && !occupationLabel && !form.bio}
            <button class="pf-empty-row" style="color:{c.textSecondary}" on:click={openEdit}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/regular/add.svg');-webkit-mask-image:url('/icons/svg/regular/add.svg');background:{c.primary};width:16px;height:16px"></span>
              <span>Adicionar informações do perfil</span>
            </button>
          {:else}
            {#each filledRows as row, i}
              <div class="pf-info-row" style="border-color:{c.divider}">
                <div class="pf-info-left">
                  <span class="pf-info-label" style="color:{c.textSecondary}">{row.label}</span>
                </div>
                <span class="pf-info-value" style="color:{c.textPrimary}">{row.value}</span>
              </div>
            {/each}
            {#if occupationLabel}
              <div class="pf-info-row" style="border-color:{c.divider}">
                <div class="pf-info-left">
                  <span class="pf-info-label" style="color:{c.textSecondary}">Ocupação</span>
                </div>
                <span class="pf-info-value" style="color:{c.textPrimary}">{occupationLabel}</span>
              </div>
              {#if form.occupationDetail}
                <div class="pf-info-row" style="border-color:{c.divider}">
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

        <button class="pf-edit-btn" style="background:{c.primary}" on:click={openEdit}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/regular/edit.svg');-webkit-mask-image:url('/icons/svg/regular/edit.svg');background:#fff;width:15px;height:15px"></span>
          Editar perfil
        </button>
      {/if}

    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       VISUALIZADOR DE AVATAR EM TELA CHEIA — container transform.
       Abre a partir da posição/tamanho exatos do avatar pequeno na
       Hero (FLIP), expande até inset:0, botão de voltar no canto.
  ══════════════════════════════════════════════════════════════ -->
  {#if showAvatarViewer && user?.avatar}
    <div class="avatar-viewer-overlay" class:avatar-viewer-overlay-in={avatarViewerVisible} on:click={closeAvatarViewer}></div>
    <div class="avatar-viewer" style={avatarViewerStyle}>
      <img class="avatar-viewer-img" src={user.avatar} alt={userName} />
    </div>
    <button class="avatar-viewer-back" class:avatar-viewer-back-in={avatarViewerVisible} on:click={closeAvatarViewer} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/regular/back_arrow.svg');-webkit-mask-image:url('/icons/svg/regular/back_arrow.svg');background:#fff;width:19px;height:19px"></span>
    </button>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       TELA FULLSCREEN DE EDIÇÃO — cards nativos + botão de guardar
       como ícone check no appbar. Botão de fechar (X) e botão de
       guardar (check) neutros, iguais ao resto dos ícones do appbar.
  ══════════════════════════════════════════════════════════════ -->
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
            <span class="icon-mask" style="mask-image:url('/icons/svg/regular/close.svg');-webkit-mask-image:url('/icons/svg/regular/close.svg');background:{c.iconTint};width:16px;height:16px"></span>
          </button>
          <span class="edit-header-title" style="color:{c.textPrimary}">Editar perfil</span>
          <button class="pf-icon-btn edit-save-icon-btn" style="background:{c.appbarBtnBg}" on:click={saveProfile} disabled={saving}>
            {#if saving}
              <span class="edit-save-spinner" style="border-color:{c.divider};border-top-color:{c.iconTint}"></span>
            {:else}
              <span class="icon-mask" style="mask-image:url('/icons/svg/regular/check.svg');-webkit-mask-image:url('/icons/svg/regular/check.svg');background:{c.iconTint};width:17px;height:17px"></span>
            {/if}
          </button>
        </div>
      </div>

      <div class="edit-body">

        <div class="edit-title-section" style="border-bottom:0.5px solid {c.divider}">
          <input
            class="edit-title-input"
            style="color:{c.textPrimary};caret-color:{c.primary};border-bottom-color:{c.primary};background:transparent"
            placeholder="O teu nome"
            bind:value={editForm.name} />
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Localização</div>
        <div class="edit-card" style="background:{c.authInputFill};border-color:{c.divider}">
          <div class="edit-row">
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Idade</span>
            <input type="number" min="0" max="120" class="edit-input-right" placeholder="—"
              style="color:{c.textSecondary};background:transparent;border:none"
              bind:value={editForm.age} />
          </div>
          <div class="edit-row" style="border-top:0.5px solid {c.divider}">
            <span class="edit-row-lbl" style="color:{c.textPrimary}">País</span>
            <input class="edit-input-right" placeholder="Adicionar"
              style="color:{c.textSecondary};background:transparent;border:none;text-align:right;flex:1;min-width:0"
              bind:value={editForm.country} />
          </div>
          <div class="edit-row" style="border-top:0.5px solid {c.divider}">
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Estado / Província</span>
            <input class="edit-input-right" placeholder="Adicionar"
              style="color:{c.textSecondary};background:transparent;border:none;text-align:right;flex:1;min-width:0"
              bind:value={editForm.state} />
          </div>
          <div class="edit-row" style="border-top:0.5px solid {c.divider}">
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Cidade</span>
            <input class="edit-input-right" placeholder="Adicionar"
              style="color:{c.textSecondary};background:transparent;border:none;text-align:right;flex:1;min-width:0"
              bind:value={editForm.city} />
          </div>
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Ocupação</div>
        <div class="edit-card" style="background:{c.authInputFill};border-color:{c.divider}">
          <button class="edit-row edit-row-btn" on:click={openOccSheet}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Ocupação</span>
            <div class="edit-row-right-group">
              <span style="color:{c.textSecondary};font-size:14px">
                {OCCUPATION_OPTIONS.find(o => o.id === editForm.occupation)?.label || 'Selecionar'}
              </span>
              <span class="icon-mask" style="mask-image:url('/icons/svg/regular/chevron_right.svg');-webkit-mask-image:url('/icons/svg/regular/chevron_right.svg');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
            </div>
          </button>
          <div class="edit-row" style="border-top:0.5px solid {c.divider}">
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Detalhe</span>
            <input class="edit-input-right" placeholder="Curso, cargo…"
              style="color:{c.textSecondary};background:transparent;border:none;text-align:right;flex:1;min-width:0"
              bind:value={editForm.occupationDetail} />
          </div>
        </div>

        <div class="edit-section-title" style="color:{c.textSecondary}">Bio</div>
        <div class="edit-card" style="background:{c.authInputFill};border-color:{c.divider}">
          <div class="edit-row edit-notes-row">
            <textarea class="edit-textarea"
              placeholder="Escreve uma pequena bio…"
              style="color:{c.textPrimary};background:transparent;caret-color:{c.primary}"
              rows="4"
              bind:value={editForm.bio}></textarea>
          </div>
        </div>

      </div>
    </div>
  {/if}

  <!-- ══════════════════════════════════════════════════════════════
       BOTTOM SHEET — seletor de ocupação (flutuante, não toca nas bordas)
  ══════════════════════════════════════════════════════════════ -->
  {#if showOccSheet}
    <button class="overlay" class:overlay-in={occOverlayVisible} on:click={closeOccSheet}></button>
    <div class="bottom-sheet" bind:this={occSheetEl}
      style="background:{c.dialogBackground};transform: translate3d(0, {occSheetY}%, 0);">
      <div class="sheet-grab-zone"
        on:touchstart={onSheetGrabTouchStart}
        on:touchmove|nonpassive={onSheetGrabTouchMove}
        on:touchend={onSheetGrabTouchEnd}
        on:touchcancel={onSheetGrabTouchEnd}>
        <div class="sheet-handle" style="background:{c.divider}"></div>
        <div class="sheet-title" style="color:{c.textPrimary}">Ocupação</div>
      </div>
      {#each OCCUPATION_OPTIONS as opt}
        <button class="sheet-opt" on:click={() => pickOcc(opt.id)}>
          <span class="sheet-opt-label" style="color:{c.textPrimary}">{opt.label}</span>
          {#if editForm.occupation === opt.id}
            <span class="icon-mask" style="mask-image:url('/icons/svg/regular/check.svg');-webkit-mask-image:url('/icons/svg/regular/check.svg');background:{c.primary};width:16px;height:16px"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────── */
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

  /* ── Header ───────────────────────────────────────────────────────── */
  .pf-header {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .pf-icon-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .16s ease;
  }
  .pf-icon-btn:active { transform: scale(0.86); opacity: .65; }
  .pf-icon-btn:disabled { opacity: .4; }
  .pf-header-title { flex: 1; text-align: center; font-size: 16px; font-weight: 700; }

  /* ── Corpo ────────────────────────────────────────────────────────── */
  .pf-body {
    flex: 1; min-height: 0; overflow-y: auto;
    padding-bottom: calc(env(safe-area-inset-bottom,0px) + 24px);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain; touch-action: pan-y;
  }
  .pf-body-inner { width: 100%; will-change: transform; }

  /* ── Hero ─────────────────────────────────────────────────────────── */
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

  /* Badge de atualizar avatar: pequeno, ancorado no canto inferior
     direito DO CONTAINER do avatar, sempre por cima e sempre visível
     — exatamente como o preview mostra. Não cobre o círculo, não se
     desloca, não depende de toque para aparecer. */
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

  /* ── Skeleton ─────────────────────────────────────────────────────── */
  .pf-skeleton-wrap { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 10px; }
  .pf-skeleton-row { height: 54px; border-radius: 16px; opacity: .5; animation: pf-pulse 1.2s ease-in-out infinite; }
  @keyframes pf-pulse { 0%,100% { opacity: .35; } 50% { opacity: .65; } }

  /* ── Secção / cartão ──────────────────────────────────────────────── */
  .pf-section-title { padding: 22px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .pf-card { margin: 0 16px; border: 1px solid; border-radius: 20px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .pf-info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid; gap: 12px;
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
    border: none; border-radius: 16px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 14px rgba(47,123,246,0.28);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .pf-edit-btn:active { transform: scale(0.98); opacity: .88; }

  /* ══════════════════════════════════════════════════════════════════
     VISUALIZADOR DE AVATAR EM TELA CHEIA (container transform / FLIP)
     .avatar-viewer usa position:fixed com top/left/width/height/
     border-radius em style INLINE (calculados em JS), com UMA ÚNICA
     transition CSS nessas propriedades — é isto que dá o efeito de o
     círculo pequeno "esticar" até preencher o ecrã, exatamente a
     mesma técnica FLIP usada em transições nativas de galeria.
  ══════════════════════════════════════════════════════════════════ */
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
  .avatar-viewer-img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .avatar-viewer-back {
    position: fixed; z-index: 552;
    top: calc(env(safe-area-inset-top,0px) + 14px); left: 14px;
    width: 40px; height: 40px; border-radius: 50%;
    border: none; background: rgba(0,0,0,.4);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    opacity: 0; transform: scale(0.85);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.34,1.56,0.64,1);
  }
  .avatar-viewer-back.avatar-viewer-back-in { opacity: 1; transform: scale(1); }
  .avatar-viewer-back:active { transform: scale(0.88); }

  /* ══════════════════════════════════════════════════════════════════
     TELA FULLSCREEN DE EDIÇÃO
  ══════════════════════════════════════════════════════════════════ */
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

  /* Botão de guardar (check) e botão de fechar (X) reaproveitam ambos
     .pf-icon-btn puro, com o mesmo fundo neutro appbarBtnBg — nenhum
     dos dois usa cor de destaque, ambos ficam iguais aos outros
     ícones do appbar. */
  .edit-save-icon-btn { position: relative; }
  .edit-save-icon-btn:disabled { opacity: .55; }
  .edit-save-spinner {
    width: 15px; height: 15px; border-radius: 50%;
    border: 2px solid; border-top-color: transparent;
    animation: pf-spin .7s linear infinite;
  }

  .edit-body { flex: 1; overflow-y: auto; padding-bottom: calc(env(safe-area-inset-bottom,0px) + 24px); }

  .edit-title-section { padding: 16px 18px 20px; }
  .edit-title-input {
    width: 100%; font-size: 22px; font-weight: 700;
    border: none; outline: none; border-bottom: 2px solid; padding-bottom: 10px; font-family: inherit;
  }

  .edit-section-title { padding: 20px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .edit-card { margin: 0 16px; border: 1px solid; border-radius: 20px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

  .edit-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; gap: 12px; width: 100%; background: none; border: none;
  }
  .edit-row-btn { cursor: pointer; text-align: left; transition: opacity .14s; }
  .edit-row-btn:active { opacity: .6; }
  .edit-notes-row { align-items: flex-start; }
  .edit-row-lbl { font-size: 15px; font-weight: 500; }
  .edit-row-right-group { display: flex; align-items: center; gap: 6px; }
  .edit-input-right { font-size: 14px; outline: none; text-align: right; }

  .edit-textarea {
    flex: 1; font-size: 15px; outline: none; border: none; resize: none;
    font-family: inherit; line-height: 1.55; min-height: 80px; width: 100%;
  }

  /* ── Overlay + bottom sheet (popup nativo, spring dedicado, flutuante) ── */
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
    border-radius: 26px; z-index: 700;
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
    .avatar-viewer-overlay, .avatar-viewer, .avatar-viewer-back {
      transition: none !important;
    }
  }
</style>