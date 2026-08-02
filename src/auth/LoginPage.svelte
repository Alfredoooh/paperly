<script>
  import { createEventDispatcher } from 'svelte';
  import { AuthApiService } from '$shared/api.js';
  import { showToast } from '$shared/utils.js';

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
        dispatch('nav', { to: 'home', data: { user } });
      } else { errorMsg = 'Email ou password incorretos.'; loading = false; }
    } catch (e) { errorMsg = 'Erro de rede: ' + e.message; loading = false; }
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
        dispatch('nav', { to: 'home', data: { user } });
      } else { showToast('Erro no servidor.'); }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        showToast('Erro Google: ' + (err.code || err.message));
      }
    }
  }

  const footerLinks = [
    { label: 'Termos de uso', to: 'terms' },
    { label: 'Política de privacidade', to: 'privacy' },
    { label: 'Página de ajuda', to: 'help' },
    { label: 'Planos', to: 'plans' },
    { label: 'Blog', to: 'blog' },
    { label: 'Ads', to: 'ads' }
  ];
</script>

<div class="auth-page" style="background:var(--app-bg)">
  <img src="/icons/png/logo.png" class="auth-logo-corner" alt="Nexa" />

  <div class="auth-inner">
    <div class="auth-header">
      <div class="auth-title" class:dark={isDark}>Iniciar sessão ou registar-se</div>
      <div class="auth-subtitle" class:dark={isDark}>Comece a criar com Manus</div>
    </div>

    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="email" placeholder="Email" autocomplete="email" bind:value={email} />
    </div>
    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="password" placeholder="Password" autocomplete="current-password" bind:value={password} />
    </div>
    {#if errorMsg}<div class="auth-error">{errorMsg}</div>{/if}

    <button
      class="auth-btn-primary"
      class:is-loading={loading}
      disabled={loading}
      on:click={handleLogin}
    >
      <span class="btn-label" class:hide={loading}>Entrar</span>
      {#if loading}<span class="btn-skeleton-shine"></span>{/if}
    </button>

    <div class="auth-divider" class:dark={isDark}>
      <hr /><span>ou continua com</span><hr />
    </div>
    <button class="auth-btn-google" class:dark={isDark} on:click={handleGoogle}>
      <img src="/icons/png/google.png" alt="Google" />
      <span>Google</span>
    </button>
    <div class="auth-switch" class:dark={isDark}>
      Não tens conta? <span class="auth-switch-link" on:click={() => dispatch('nav', { to: 'register' })}>Criar conta</span>
    </div>

    <div class="auth-footer-links" class:dark={isDark}>
      {#each footerLinks as link, i}
        <span class="footer-link" on:click={() => dispatch('nav', { to: link.to })}>{link.label}</span>
        {#if i < footerLinks.length - 1}<span class="footer-dot">•</span>{/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .auth-page {
    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    transition: background 0.3s;
  }

  .auth-logo-corner {
    position: absolute;
    top: 20px;
    left: 24px;
    height: 40px;
    width: auto;
    display: block;
  }

  .auth-inner {
    width: 100%; max-width: 380px; padding: 32px 28px;
    display: flex; flex-direction: column; gap: 14px;
  }

  .auth-header {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 8px; margin-bottom: 8px;
  }
  .auth-title { font-size: 22px; font-weight: 700; color: #10151c; line-height: 1.3; letter-spacing: -0.3px; }
  .auth-title.dark { color: var(--icon-strong); }
  .auth-subtitle { font-size: 14px; color: #888; }
  .auth-subtitle.dark { color: #666; }

  .auth-field { display: flex; flex-direction: column; }

  /* Estilo tipo Instagram/Facebook: fundo quase branco, borda fina, cantos suavemente arredondados */
  .auth-input {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid #DBDBDB;
    outline: none;
    font-size: 15px;
    background: #FAFAFA;
    color: #10151c;
    -webkit-user-select: text; user-select: text;
    transition: border-color 0.15s, background 0.15s;
  }
  .auth-input:focus {
    border-color: #B0B0B0;
    background: var(--surface);
  }
  .auth-input.dark {
    background: #121212;
    border-color: #363636;
    color: var(--icon-strong);
  }
  .auth-input.dark:focus {
    border-color: #555;
    background: #1A1A1A;
  }
  .auth-input::placeholder { color: #8e8e8e; }

  .auth-error { font-size: 13px; color: var(--danger); text-align: center; }

  .auth-btn-primary {
    position: relative;
    overflow: hidden;
    padding: 15px;
    border-radius: 999px;
    border: none;
    background: var(--accent-primary);
    color: var(--icon-strong); font-size: 16px; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s;
    min-height: 50px;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-btn-primary:active { opacity: 0.8; }
  .auth-btn-primary:disabled { cursor: default; }
  .auth-btn-primary.is-loading { background: #dcdcdc; }
  .btn-label { transition: opacity 0.1s; }
  .btn-label.hide { opacity: 0; }

  .btn-skeleton-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      #dcdcdc 0%,
      #dcdcdc 35%,
      #eeeeee 50%,
      #dcdcdc 65%,
      #dcdcdc 100%
    );
    background-size: 200% 100%;
    animation: shine 1.2s ease-in-out infinite;
  }
  @keyframes shine {
    0% { background-position: 150% 0; }
    100% { background-position: -50% 0; }
  }

  .auth-divider { display: flex; align-items: center; gap: 10px; }
  .auth-divider hr { flex: 1; border: none; border-top: 1px solid #E5E5EA; }
  .auth-divider.dark hr { border-top-color: #2A2A2A; }
  .auth-divider span { font-size: 12px; color: #aaa; white-space: nowrap; }

  .auth-btn-google {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 14px;
    border-radius: 999px;
    border: 1px solid #DBDBDB;
    background: var(--surface); color: #10151c; font-size: 15px; font-weight: 500;
    cursor: pointer; transition: background 0.15s;
  }
  .auth-btn-google.dark { background: #121212; border-color: #363636; color: var(--icon-strong); }
  .auth-btn-google img { width: 20px; height: 20px; display: block; }
  .auth-btn-google:active { opacity: 0.7; }

  .auth-switch { font-size: 13.5px; color: #888; text-align: center; }
  .auth-switch.dark { color: #666; }
  .auth-switch-link { color: var(--accent-primary); font-weight: 600; cursor: pointer; }

  .auth-footer-links {
    margin-top: 18px;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 6px; row-gap: 8px;
  }
  .footer-link {
    font-size: 11.5px; color: #999; text-decoration: underline;
    text-underline-offset: 2px; cursor: pointer;
  }
  .auth-footer-links.dark .footer-link { color: #666; }
  .footer-dot { font-size: 11.5px; color: #ccc; }
  .auth-footer-links.dark .footer-dot { color: #444; }
</style>