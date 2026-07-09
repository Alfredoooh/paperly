<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import { ProfileApiService } from '$shared/api.js';
  import { OCCUPATION_OPTIONS } from '$shared/plans.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Perfil';
  export let appId = 'profile';
  export let iconPath = '/icons/svg/user.svg';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  let editing = false;
  let saving = false;

  let form = {
    name: '',
    age: '',
    country: '',
    state: '',
    city: '',
    occupation: '',
    occupationDetail: '',
    bio: '',
  };

  let loaded = false;

  async function loadProfile() {
    if (!user?.token) return;
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
    }
  }
  loadProfile();

  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  function startEdit() { editing = true; }
  function cancelEdit() { editing = false; loadProfile(); }

  async function saveAll() {
    if (!user?.token) return;
    saving = true;
    try {
      if (form.name && form.name.trim() !== userName) {
        await ProfileApiService.updateAccount(user.token, { name: form.name.trim() });
      }
      const profilePayload = {
        age: form.age === '' ? null : Number(form.age),
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        occupation: form.occupation || null,
        occupationDetail: form.occupationDetail || null,
        bio: form.bio || null,
      };
      await ProfileApiService.updateProfile(user.token, profilePayload);
      showToast('Perfil atualizado');
      editing = false;
      await loadProfile();
    } catch (e) {
      showToast(e.message || 'Erro ao guardar');
    } finally {
      saving = false;
    }
  }

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await ProfileApiService.updateAvatar(user.token, reader.result);
        dispatch('userUpdate', { avatar: reader.result });
        showToast('Foto atualizada');
      } catch (err) {
        showToast(err.message || 'Erro ao atualizar foto');
      }
    };
    reader.readAsDataURL(file);
  }
</script>

<div class="root" style="background:{c.background};color:{c.textPrimary}">
  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'home' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <span class="appbar-title" style="color:{c.textPrimary}">{appTitle}</span>
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('nav', { to: 'settings' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
  </div>

  <div class="scroll">
    <div class="hero">
      <label class="avatar-wrap" style="background:{c.primary}">
        {#if user?.avatar}
          <img src={user.avatar} alt={userName} />
        {:else}
          <span class="avatar-initial">{userInitial}</span>
        {/if}
        <input type="file" accept="image/*" on:change={handleAvatarPick} hidden />
        <span class="avatar-edit-badge" style="background:{c.dialogBackground}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');background:{c.iconTint};width:14px;height:14px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
        </span>
      </label>
      <h1>{userName}</h1>
      {#if userEmail}<p style="color:{c.textSecondary}">{userEmail}</p>{/if}
    </div>

    {#if !editing}
      <div class="section-title" style="color:{c.textSecondary}">Dados pessoais</div>
      <div class="info-card" style="background:{c.dialogBackground};border-color:{c.divider}">
        <div class="info-row" style="border-color:{c.divider}">
          <span class="info-label" style="color:{c.textSecondary}">Idade</span>
          <span class="info-value">{form.age || '—'}</span>
        </div>
        <div class="info-row" style="border-color:{c.divider}">
          <span class="info-label" style="color:{c.textSecondary}">País</span>
          <span class="info-value">{form.country || '—'}</span>
        </div>
        <div class="info-row" style="border-color:{c.divider}">
          <span class="info-label" style="color:{c.textSecondary}">Estado / Província</span>
          <span class="info-value">{form.state || '—'}</span>
        </div>
        <div class="info-row" style="border-color:{c.divider}">
          <span class="info-label" style="color:{c.textSecondary}">Cidade</span>
          <span class="info-value">{form.city || '—'}</span>
        </div>
        <div class="info-row" style="border-color:{c.divider}">
          <span class="info-label" style="color:{c.textSecondary}">Ocupação</span>
          <span class="info-value">{OCCUPATION_OPTIONS.find(o => o.id === form.occupation)?.label || '—'}</span>
        </div>
        {#if form.occupationDetail}
          <div class="info-row" style="border-color:{c.divider}">
            <span class="info-label" style="color:{c.textSecondary}">Detalhe</span>
            <span class="info-value">{form.occupationDetail}</span>
          </div>
        {/if}
        {#if form.bio}
          <div class="info-row bio-row">
            <span class="info-label" style="color:{c.textSecondary}">Bio</span>
            <span class="info-value">{form.bio}</span>
          </div>
        {/if}
      </div>

      <button class="edit-btn" style="background:{c.primary}" on:click={startEdit}>Editar perfil</button>
    {:else}
      <div class="section-title" style="color:{c.textSecondary}">Editar dados pessoais</div>
      <div class="form-card" style="background:{c.dialogBackground};border-color:{c.divider}">
        <label class="field">
          <span style="color:{c.textSecondary}">Nome</span>
          <input type="text" bind:value={form.name} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Idade</span>
          <input type="number" min="0" max="120" bind:value={form.age} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">País</span>
          <input type="text" bind:value={form.country} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Estado / Província</span>
          <input type="text" bind:value={form.state} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Cidade</span>
          <input type="text" bind:value={form.city} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Ocupação</span>
          <select bind:value={form.occupation} style="background:{c.authInputFill};color:{c.textPrimary}">
            <option value="">Selecionar</option>
            {#each OCCUPATION_OPTIONS as opt}
              <option value={opt.id}>{opt.label}</option>
            {/each}
          </select>
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Detalhe (curso, cargo, etc.)</span>
          <input type="text" bind:value={form.occupationDetail} style="background:{c.authInputFill};color:{c.textPrimary}" />
        </label>
        <label class="field">
          <span style="color:{c.textSecondary}">Bio</span>
          <textarea rows="3" bind:value={form.bio} style="background:{c.authInputFill};color:{c.textPrimary}"></textarea>
        </label>
      </div>

      <div class="edit-actions">
        <button class="cancel-btn" style="border-color:{c.divider};color:{c.textPrimary}" on:click={cancelEdit} disabled={saving}>Cancelar</button>
        <button class="save-btn" style="background:{c.primary}" on:click={saveAll} disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:52px 16px 12px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
  .appbar-btn:active { opacity:.7; }
  .appbar-title { font-size:17px; font-weight:700; text-align:center; flex:1; }
  .scroll { flex:1; overflow-y:auto; padding-bottom:32px; }
  .hero { padding:28px 16px 8px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:6px; }
  .avatar-wrap { position:relative; width:88px; height:88px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; }
  .avatar-wrap img { width:100%; height:100%; object-fit:cover; }
  .avatar-initial { font-size:32px; font-weight:700; color:#fff; }
  .avatar-edit-badge { position:absolute; bottom:-2px; right:-2px; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  h1 { margin:8px 0 0; font-size:22px; line-height:1.1; }
  p { margin:0; font-size:14px; }
  .section-title { padding:18px 16px 10px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
  .info-card, .form-card { margin:0 16px; border:1px solid; border-radius:18px; overflow:hidden; }
  .info-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid; gap:12px; }
  .info-row:last-child { border-bottom:none; }
  .bio-row { flex-direction:column; align-items:flex-start; gap:4px; }
  .info-label { font-size:13px; }
  .info-value { font-size:14px; font-weight:600; text-align:right; }
  .bio-row .info-value { text-align:left; font-weight:400; line-height:1.4; }
  .edit-btn { display:block; width:calc(100% - 32px); margin:20px 16px 0; padding:14px; border:none; border-radius:14px; color:#fff; font-size:15px; font-weight:700; cursor:pointer; }
  .edit-btn:active { opacity:.85; }
  .form-card { padding:14px 16px; display:flex; flex-direction:column; gap:14px; }
  .field { display:flex; flex-direction:column; gap:6px; font-size:13px; }
  .field input, .field select, .field textarea { border:none; border-radius:10px; padding:10px 12px; font-size:14px; font-family:inherit; resize:vertical; }
  .field input:focus, .field select:focus, .field textarea:focus { outline:2px solid var(--primary); }
  .edit-actions { display:flex; gap:10px; padding:16px; }
  .cancel-btn { flex:1; padding:14px; border-radius:14px; border:1px solid; background:transparent; font-size:15px; font-weight:700; cursor:pointer; }
  .save-btn { flex:1; padding:14px; border:none; border-radius:14px; color:#fff; font-size:15px; font-weight:700; cursor:pointer; }
  .save-btn:disabled, .cancel-btn:disabled { opacity:.6; cursor:default; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>