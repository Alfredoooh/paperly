<script>
  import { createEventDispatcher } from 'svelte';
  import { AuthApiService } from '../../core/api.js';
  import { showToast } from '../../core/utils.js';

  export let isDark = false;

  const dispatch = createEventDispatcher();

  let email = '', password = '', errorMsg = '', loading = false;

  async function handleLogin() {
    errorMsg = '';
    if (!email || !password) { errorMsg = 'Preenche todos os campos.'; return; }
    loading = true;
    try {
      const user = await AuthApiService.login(email, password);
      if (user?.token) {
        localStorage.setItem('nexa_user', JSON.stringify(user));
        dispatch('nav', { to: 'chat', data: { user } });
      } else { errorMsg = 'Email ou password incorretos.'; }
    } catch (e) { errorMsg = 'Erro de rede: ' + e.message; }
    loading = false;
  }

  async function handleGoogle() {
    if (!window._firebaseAuth || !window._googleProvider) { showToast('Firebase não carregou.'); return; }
    window._googleProvider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await window._signInWithPopup(window._firebaseAuth, window._googleProvider);
      if (!result?.user) return;
      const idToken = await result.user.getIdToken(true);
      showToast('A verificar conta…');
      const user = await AuthApiService.loginWithGoogle(idToken);
      if (user?.token) {
        localStorage.setItem('nexa_user', JSON.stringify(user));
        dispatch('nav', { to: 'chat', data: { user } });
      } else { showToast('Erro no servidor.'); }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showToast('Erro Google: ' + (err.code || err.message));
      }
    }
  }
</script>

<div class="auth-page" style="background:{isDark ? '#0C0C0F' : '#FFFFFF'}">
  <div class="auth-bg-top"></div>
  <div class="auth-bg-bottom"></div>
  <div class="auth-inner">
    <div class="auth-logo-wrap">
      <img src="/icons/png/logo.png" class="auth-logo" alt="Nexa" />
      <div class="auth-title" class:dark={isDark}>Olá,<br><span>bem-vindo</span> de volta.</div>
      <div class="auth-subtitle" class:dark={isDark}>Entra para aceder a todo o conteúdo</div>
    </div>
    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="email" placeholder="Email" autocomplete="email" bind:value={email} />
    </div>
    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="password" placeholder="Password" autocomplete="current-password" bind:value={password} />
    </div>
    {#if errorMsg}<div class="auth-error">{errorMsg}</div>{/if}
    <button class="auth-btn-primary" disabled={loading} on:click={handleLogin}>
      {loading ? '…' : 'Entrar'}
    </button>
    <div class="auth-divider" class:dark={isDark}>
      <hr /><span>ou continua com</span><hr />
    </div>
    <button class="auth-btn-google" class:dark={isDark} on:click={handleGoogle}>
      <img src="/icons/png/google.png" alt="Google" />
      Google
    </button>
    <div class="auth-switch" class:dark={isDark}>
      Não tens conta? <span class="auth-switch-link" on:click={() => dispatch('nav', { to: 'register' })}>Criar conta</span>
    </div>
  </div>
</div>

<style>
  .auth-page { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .auth-bg-top { position:absolute; top:-80px; right:-80px; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,#2F7BF633 0%,transparent 70%); pointer-events:none; }
  .auth-bg-bottom { position:absolute; bottom:-60px; left:-60px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle,#2F7BF61A 0%,transparent 70%); pointer-events:none; }
  .auth-inner { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:48px 28px 32px; min-height:100dvh; }
  .auth-logo-wrap { display:flex; flex-direction:column; align-items:center; margin-bottom:36px; }
  .auth-logo { width:72px; height:72px; border-radius:18px; object-fit:cover; margin-bottom:20px; }
  .auth-title { font-size:32px; font-weight:800; letter-spacing:-0.8px; line-height:1.1; text-align:center; color:#1F2937; }
  .auth-title.dark { color:#F3F4F6; }
  .auth-title :global(span) { color:#2F7BF6; }
  .auth-subtitle { font-size:14px; color:#6B7280; margin-top:6px; text-align:center; }
  .auth-subtitle.dark { color:#9CA3AF; }
  .auth-field { position:relative; margin-bottom:14px; width:100%; max-width:380px; }
  .auth-input { width:100%; height:54px; border-radius:14px; padding:0 18px; font-size:15px; font-family:inherit; border:1.5px solid #E5E7EB; outline:none; background:#FFFFFF; color:#1F2937; transition:border-color .2s; -webkit-user-select:text; user-select:text; }
  .auth-input.dark { border-color:#2C2C2E; background:#1C1C1E; color:#F3F4F6; }
  .auth-input:focus { border-color:#2F7BF6; }
  .auth-input::placeholder { color:#B0B0B0; }
  .auth-input.dark::placeholder { color:#6B6B6B; }
  .auth-error { font-size:12px; color:#EF4444; margin-bottom:8px; font-weight:500; text-align:center; width:100%; max-width:380px; }
  .auth-btn-primary { width:100%; max-width:380px; height:54px; border-radius:14px; background:#2F7BF6; color:#fff; font-size:15px; font-weight:700; font-family:inherit; border:none; cursor:pointer; margin-top:4px; transition:transform .12s,opacity .12s; display:flex; align-items:center; justify-content:center; }
  .auth-btn-primary:active { transform:scale(0.97); opacity:.9; }
  .auth-btn-primary:disabled { opacity:.6; }
  .auth-divider { display:flex; align-items:center; gap:12px; margin:16px 0; width:100%; max-width:380px; }
  .auth-divider hr { flex:1; border:none; border-top:1px solid #E5E7EB; }
  .auth-divider.dark hr { border-color:#2C2C2E; }
  .auth-divider span { font-size:12px; color:#B0B0B0; font-weight:500; }
  .auth-divider.dark span { color:#6B6B6B; }
  .auth-btn-google { width:100%; max-width:380px; height:54px; border-radius:14px; background:#FFFFFF; border:1.5px solid #E5E7EB; display:flex; align-items:center; justify-content:center; gap:10px; font-size:14px; font-weight:600; color:#1F2937; cursor:pointer; font-family:inherit; transition:border-color .15s,transform .12s; }
  .auth-btn-google.dark { background:#1C1C1E; border-color:#2C2C2E; color:#F3F4F6; }
  .auth-btn-google:active { transform:scale(0.97); border-color:#2F7BF6; }
  .auth-btn-google img { width:20px; height:20px; }
  .auth-switch { text-align:center; margin-top:22px; font-size:13px; color:#6B7280; }
  .auth-switch.dark { color:#9CA3AF; }
  .auth-switch-link { color:#2F7BF6; font-weight:700; cursor:pointer; }
</style>