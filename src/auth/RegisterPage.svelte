<script>
  import { createEventDispatcher } from 'svelte';
  import { AuthApiService } from '$shared/api.js';

  export let isDark = false;
  const dispatch = createEventDispatcher();

  let name = '', email = '', password = '', errorMsg = '', loading = false;

  async function handleRegister() {
    errorMsg = '';
    if (!name || !email || !password) { errorMsg = 'Preenche todos os campos.'; return; }
    if (password.length < 6) { errorMsg = 'Password deve ter pelo menos 6 caracteres.'; return; }
    loading = true;
    try {
      const user = await AuthApiService.register(name, email, password);
      if (user?.token) {
        localStorage.setItem('nexa_user', JSON.stringify(user));
        try { sessionStorage.setItem('nexa_just_registered', '1'); } catch(e) {}
        dispatch('nav', { to: 'home', data: { user } });
      } else { errorMsg = 'Erro ao criar conta.'; loading = false; }
    } catch (e) { errorMsg = e.message; loading = false; }
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

<div class="auth-page" style="background: var(--bg-primary)">
  <img src="/icons/png/logo.png" class="auth-logo-corner" alt="Nexa" />

  <div class="auth-inner">
    <div class="auth-header">
      <div class="auth-title" class:dark={isDark}>Criar conta nova</div>
      <div class="auth-subtitle" class:dark={isDark}>Junta-te à Nexa hoje</div>
    </div>

    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="text" placeholder="Nome" autocomplete="name" bind:value={name} />
    </div>
    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="email" placeholder="Email" autocomplete="email" bind:value={email} />
    </div>
    <div class="auth-field">
      <input class="auth-input" class:dark={isDark} type="password" placeholder="Password" autocomplete="new-password" bind:value={password} />
    </div>
    {#if errorMsg}<div class="auth-error">{errorMsg}</div>{/if}

    <button
      class="auth-btn-primary"
      class:is-loading={loading}
      disabled={loading}
      on:click={handleRegister}
    >
      <span class="btn-label" class:hide={loading}>Criar conta</span>
      {#if loading}<span class="btn-skeleton-shine"></span>{/if}
    </button>

    <div class="auth-switch" class:dark={isDark}>
      Já tens conta? <span class="auth-switch-link" on:click={() => dispatch('nav', { to: 'login' })}>Entrar</span>
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
  .auth-title { font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.3; letter-spacing: -0.3px; }
  .auth-title.dark { color: var(--text-primary); }
  .auth-subtitle { font-size: 14px; color: var(--text-secondary); }
  .auth-subtitle.dark { color: var(--text-secondary); }

  .auth-field { display: flex; flex-direction: column; }

  /* Estilo tipo Instagram/Facebook: fundo quase branco, borda fina, cantos suavemente arredondados */
  .auth-input {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    outline: none;
    font-size: 15px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    -webkit-user-select: text; user-select: text;
    transition: border-color 0.15s, background 0.15s;
  }
  .auth-input:focus {
    border-color: var(--border);
    background: var(--bg-elevated);
  }
  .auth-input.dark {
    background: var(--bg-elevated);
    border-color: var(--border);
    color: var(--text-primary);
  }
  .auth-input.dark:focus {
    border-color: var(--text-primary);
    background: var(--bg-elevated);
  }
  .auth-input::placeholder { color: var(--text-tertiary); }

  .auth-error { font-size: 13px; color: var(--danger); text-align: center; }

  .auth-btn-primary {
    position: relative;
    overflow: hidden;
    padding: 15px;
    border-radius: 999px;
    border: none;
    background: var(--accent-primary);
    color: var(--text-on-accent); font-size: 16px; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s;
    min-height: 50px;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-btn-primary:active { opacity: 0.8; }
  .auth-btn-primary:disabled { cursor: default; }
  .auth-btn-primary.is-loading { background: var(--bg-tertiary); }
  .btn-label { transition: opacity 0.1s; }
  .btn-label.hide { opacity: 0; }

  .btn-skeleton-shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      var(--bg-tertiary) 0%,
      var(--bg-tertiary) 35%,
      var(--bg-elevated) 50%,
      var(--bg-tertiary) 65%,
      var(--bg-tertiary) 100%
    );
    background-size: 200% 100%;
    animation: shine 1.2s ease-in-out infinite;
  }
  @keyframes shine {
    0% { background-position: 150% 0; }
    100% { background-position: -50% 0; }
  }

  .auth-switch { font-size: 13.5px; color: var(--text-primary); text-align: center; }
  .auth-switch.dark { color: var(--text-primary); }
  .auth-switch-link { color: var(--accent-primary); font-weight: 600; cursor: pointer; }

  .auth-footer-links {
    margin-top: 18px;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 6px; row-gap: 8px;
  }
  .footer-link {
    font-size: 11.5px; color: var(--text-primary); text-decoration: underline;
    text-underline-offset: 2px; cursor: pointer;
  }
  .auth-footer-links.dark .footer-link { color: var(--text-primary); }
  .footer-dot { font-size: 11.5px; color: var(--text-tertiary); }
  .auth-footer-links.dark .footer-dot { color: var(--text-primary); }
</style>