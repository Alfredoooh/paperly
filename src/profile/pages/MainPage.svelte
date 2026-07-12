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
  export let iconPath = '/icons/svg/user.svg';

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
     ROOT — já não controla o próprio slide de entrada; quem posiciona
     esta tela agora é o wrapper .profile-main-layer no App.svelte pai
     (recuo suave quando a Settings entra por cima, como o .root do home)
════════════════════════════════════════════════════════════════════ -->
<div class="pf-root" class:pf-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary};">

  <!-- ══ APPBAR ══════════════════════════════════════════════════ -->
  <div class="pf-header">
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'home'})}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:19px;height:19px"></span>
    </button>
    <span class="pf-header-title" style="color:{c.textPrimary}">{appTitle}</span>
    <button class="pf-icon-btn" style="background:{c.appbarBtnBg}"
      on:click={() => dispatch('nav',{to:'settings'})}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:19px;height:19px"></span>
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
        <div class="pf-avatar-wrap" style="background:{c.primary}">
          {#if user?.avatar}
            <img src={user.avatar} alt={userName} />
          {:else}
            <span class="pf-avatar-initial">{userInitial}</span>
          {/if}
          {#if avatarUploading}
            <div class="pf-avatar-loading"><div class="pf-spinner"></div></div>
          {/if}
          <!-- Badge de upload SEMPRE em frente, centrado sobre o avatar,
               nunca deslocado para um canto/atrás — cobre o círculo
               inteiro como uma camada por cima, clicável em qualquer
               ponto do avatar. -->
          <label class="pf-avatar-upload-front">
            <input type="file" accept="image/*" on:change={handleAvatarPick} hidden />
            <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');background:#fff;width:20px;height:20px"></span>
          </label>
        </div>
        <h1>{userName}</h1>
        {#if userEmail}<p style="color:{c.textSecondary}">{userEmail}</p>{/if}
      </div>

      {#if loading}
        <div class="pf-skeleton-wrap">
          {#each [1,2,3] as i}
            <div class="pf-skeleton-row" style="background:{c.dialogBackground}"></div>
          {/each}
        </div>
      {:else}
        <!-- Dados pessoais -->
        <div class="pf-section-title" style="color:{c.textSecondary}">Dados pessoais</div>
        <div class="pf-card" style="background:{c.dialogBackground};border-color:{c.divider}">
          {#if filledRows.length === 0 && !occupationLabel && !form.bio}
            <button class="pf-empty-row" style="color:{c.textSecondary}" on:click={openEdit}>
              <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:{c.primary};width:16px;height:16px"></span>
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
          <span class="icon-mask" style="mask-image:url('/icons/svg/edit.svg');-webkit-mask-image:url('/icons/svg/edit.svg');background:#fff;width:15px;height:15px"></span>
          Editar perfil
        </button>
      {/if}

    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       TELA FULLSCREEN DE EDIÇÃO — cards nativos (mesma linguagem
       visual do pf-card da tela principal, em vez de linhas soltas
       sem agrupamento) + botão de guardar como ícone check no appbar.
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
            <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{c.iconTint};width:16px;height:16px"></span>
          </button>
          <span class="edit-header-title" style="color:{c.textPrimary}">Editar perfil</span>
          <button class="pf-icon-btn edit-save-icon-btn" style="background:{c.primary}" on:click={saveProfile} disabled={saving}>
            {#if saving}
              <span class="edit-save-spinner"></span>
            {:else}
              <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:#fff;width:17px;height:17px"></span>
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

        <!-- Cards nativos: mesma linguagem visual do pf-card (fundo
             elevado, cantos arredondados, borda subtil, linhas
             separadas por divisor interno) em vez de linhas soltas
             sem contentor. -->
        <div class="edit-section-title" style="color:{c.textSecondary}">Localização</div>
        <div class="edit-card" style="background:{c.dialogBackground};border-color:{c.divider}">
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
        <div class="edit-card" style="background:{c.dialogBackground};border-color:{c.divider}">
          <button class="edit-row edit-row-btn" on:click={openOccSheet}>
            <span class="edit-row-lbl" style="color:{c.textPrimary}">Ocupação</span>
            <div class="edit-row-right-group">
              <span style="color:{c.textSecondary};font-size:14px">
                {OCCUPATION_OPTIONS.find(o => o.id === editForm.occupation)?.label || 'Selecionar'}
              </span>
              <span class="icon-mask" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{c.textSecondary};width:13px;height:13px;opacity:.5"></span>
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
        <div class="edit-card" style="background:{c.dialogBackground};border-color:{c.divider}">
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
       BOTTOM SHEET — seletor de ocupação
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
            <span class="icon-mask" style="mask-image:url('/icons/svg/check.svg');-webkit-mask-image:url('/icons/svg/check.svg');background:{c.primary};width:16px;height:16px"></span>
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
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
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
  .pf-hero { padding: 20px 16px 8px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }
  .pf-avatar-wrap {
    position: relative; width: 88px; height: 88px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .pf-avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .pf-avatar-initial { font-size: 32px; font-weight: 700; color: #fff; }
  .pf-avatar-loading {
    position: absolute; inset: 0; background: rgba(0,0,0,.4); z-index: 2;
    display: flex; align-items: center; justify-content: center;
  }
  .pf-spinner {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,.35); border-top-color: #fff;
    animation: pf-spin .7s linear infinite;
  }
  @keyframes pf-spin { to { transform: rotate(360deg); } }

  /* Badge/label de upload — SEMPRE EM FRENTE do avatar, cobrindo o
     círculo inteiro como uma camada por cima (nunca num canto, nunca
     atrás). Fica transparente em repouso e escurece ligeiramente ao
     toque, exatamente como um overlay de "editar foto" nativo. */
  .pf-avatar-upload-front {
    position: absolute; inset: 0; z-index: 3;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0);
    cursor: pointer;
    transition: background .18s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .pf-avatar-upload-front:active { background: rgba(0,0,0,.32); }
  .pf-avatar-upload-front .icon-mask { opacity: 0; transition: opacity .18s; }
  .pf-avatar-upload-front:active .icon-mask { opacity: 1; }

  .pf-hero h1 { margin: 8px 0 0; font-size: 21px; font-weight: 800; line-height: 1.15; }
  .pf-hero p { margin: 0; font-size: 13.5px; }

  /* ── Skeleton ─────────────────────────────────────────────────────── */
  .pf-skeleton-wrap { padding: 24px 16px 0; display: flex; flex-direction: column; gap: 10px; }
  .pf-skeleton-row { height: 54px; border-radius: 14px; opacity: .5; animation: pf-pulse 1.2s ease-in-out infinite; }
  @keyframes pf-pulse { 0%,100% { opacity: .35; } 50% { opacity: .65; } }

  /* ── Secção / cartão ──────────────────────────────────────────────── */
  .pf-section-title { padding: 20px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .pf-card { margin: 0 16px; border: 1px solid; border-radius: 18px; overflow: hidden; }
  .pf-info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px; border-bottom: 1px solid; gap: 12px;
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
    width: calc(100% - 32px); margin: 18px 16px 0; padding: 14px;
    border: none; border-radius: 14px; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .pf-edit-btn:active { transform: scale(0.98); opacity: .88; }

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

  /* Botão de guardar como ÍCONE (check.svg) no appbar, mesma forma
     circular dos outros pf-icon-btn, com fundo sólido na cor primária
     em vez de texto "Guardar". */
  .edit-save-icon-btn { position: relative; }
  .edit-save-icon-btn:disabled { opacity: .55; }
  .edit-save-spinner {
    width: 15px; height: 15px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
    animation: pf-spin .7s linear infinite;
  }

  .edit-body { flex: 1; overflow-y: auto; padding-bottom: calc(env(safe-area-inset-bottom,0px) + 24px); }

  .edit-title-section { padding: 16px 18px 20px; }
  .edit-title-input {
    width: 100%; font-size: 22px; font-weight: 700;
    border: none; outline: none; border-bottom: 2px solid; padding-bottom: 10px; font-family: inherit;
  }

  /* Cards nativos: mesma linguagem visual do pf-card (fundo elevado,
     cantos arredondados, borda subtil) — cada grupo de campos vive
     dentro do seu próprio cartão, com título de secção acima, tal como
     "Dados pessoais" na tela principal. */
  .edit-section-title { padding: 20px 16px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .edit-card { margin: 0 16px; border: 1px solid; border-radius: 18px; overflow: hidden; }

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

  /* ── Overlay + bottom sheet (popup nativo, spring dedicado) ─────────── */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0);
    z-index: 600; border: none; cursor: default; width: 100%; height: 100%;
    transition: background .32s ease;
  }
  .overlay.overlay-in { background: rgba(0,0,0,.45); }
  .bottom-sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-radius: 20px 20px 0 0; z-index: 700;
    padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 24px);
    will-change: transform;
    box-shadow: 0 -4px 40px rgba(0,0,0,.16);
  }
  .sheet-grab-zone { touch-action: none; }
  .sheet-handle { width: 36px; height: 4px; border-radius: 2px; margin: 10px auto 8px; }
  .sheet-title { font-size: 13px; font-weight: 700; padding: 4px 18px 8px; opacity: .6; text-transform: uppercase; letter-spacing: .05em; }
  .sheet-opt {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; background: none; border: none; cursor: pointer; text-align: left;
    transition: opacity .14s;
  }
  .sheet-opt:active { opacity: .6; }
  .sheet-opt-label { font-size: 15px; font-weight: 500; }

  @media (prefers-reduced-motion: reduce) {
    .pf-root, .pf-icon-btn, .pf-edit-btn, .edit-row-btn, .sheet-opt, .pf-avatar-upload-front {
      transition: none !important;
    }
  }
</style>