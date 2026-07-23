<!-- 404 App.svelte -->
<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.
  import { onMount, createEventDispatcher } from 'svelte';
  import '$shared/theme.css';

  function goHome() {
    dispatch('nav', { to: 'home' });
  }

  let themeValue = 'system';
  let mediaQuery;

  const dispatch = createEventDispatcher();

  function resolveIsDark(v) {
    return v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function applyThemeValue(v) {
    themeValue = v;
    const isDark = resolveIsDark(v);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  function handleSystemChange() {
    if (themeValue === 'system') applyThemeValue('system');
  }

  function onStorage(e) {
    if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue);
  }

  onMount(() => {
    applyThemeValue(localStorage.getItem('nexa_theme') || 'system');

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', onStorage);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  });
</script>

<div class="root">
  <div class="code">404</div>
  <h1>Página não encontrada</h1>
  <p>O link que tentaste aceder não existe ou foi movido.</p>
  <button class="btn pulse-tap" on:click={goHome}>Voltar à página inicial</button>
</div>

<style>
  @import '../shared/theme.css';
  :global(html), :global(body) { height:100%; margin:0; padding:0; }

  :global([data-theme="dark"]) {
    --nf-bg: #0b0b0d;
    --nf-text: #ffffff;
    --nf-text-secondary: rgba(255,255,255,0.55);
    --nf-code-a: #6ea8ff;
    --nf-code-b: #2F7BF6;
    --nf-btn-bg: #2F7BF6;
    --nf-btn-text: #ffffff;
  }
  :global([data-theme="light"]) {
    --nf-bg: #ffffff;
    --nf-text: #111111;
    --nf-text-secondary: rgba(20,20,20,0.55);
    --nf-code-a: #4a8dff;
    --nf-code-b: #1f63d6;
    --nf-btn-bg: #2F7BF6;
    --nf-btn-text: #ffffff;
  }

  .root {
    min-height:100dvh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    text-align:center;
    padding:24px;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    color:var(--nf-text);
    background:var(--nf-bg);
  }
  .code {
    font-size:88px;
    font-weight:800;
    line-height:1;
    background:linear-gradient(135deg,var(--nf-code-a),var(--nf-code-b));
    -webkit-background-clip:text;
    background-clip:text;
    color:transparent;
    margin-bottom:12px;
  }
  h1 { font-size:20px; font-weight:700; margin:0 0 8px; }
  p { font-size:14.5px; color:var(--nf-text-secondary); margin:0 0 28px; max-width:320px; }
  .btn {
    padding:14px 28px;
    border-radius:999px;
    border:none;
    background:var(--nf-btn-bg);
    color:var(--nf-btn-text);
    font-size:15px;
    font-weight:700;
    cursor:pointer;
    font-family:inherit;
  }
  .pulse-tap { transition:transform .14s cubic-bezier(0.25,0.46,0.45,0.94), opacity .14s ease; }
  .pulse-tap:active { transform:scale(0.96); opacity:.85; }
</style>