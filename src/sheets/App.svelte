<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.
  import { onMount, createEventDispatcher } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import MainPage from './pages/MainPage.svelte';

  const APP_ID = 'sheets';
  const APP_TITLE = 'Nexa Sheets';
  const APP_ICON = '/icons/svg/regular/sheets.svg';
  const BASE = '/sheets/';
  const VALID_ROUTES = [];
  const router = createRouter(BASE, VALID_ROUTES, 'main');

  let route = 'main';
  let user = null;
  let isDark = false;
  let ready = false;

  const dispatch = createEventDispatcher();

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    // FIX (link sempre a mostrar um ID e navegação atrasada/a falhar
    // ao voltar): esta app deixou de suportar um resourceId dinâmico
    // na URL. Ao contrário do 'ai' ou 'docs' antes desta correção,
    // aqui tínhamos router.navigateToResource(id) a escrever no
    // histórico DEPOIS do primeiro paint (dando o salto/atraso visto
    // na barra de endereço) e a criar uma entrada extra no histórico
    // do browser — por isso o botão físico "voltar" do Android
    // primeiro tinha de sair de /sheets/{id}/ para /sheets/ antes de
    // sair da app, exigindo dois toques. Agora, tal como no 'docs',
    // a rota fica sempre presa a 'main' (sem segmento de recurso) e
    // o documento correto é resolvido inteiramente dentro do
    // MainPage a partir do localStorage — ver docId em
    // pages/MainPage.svelte.
    const { notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = 'main';
    router.navigate('main', { replace: true });
    ready = true;

    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
    });

    return unbind;
  });

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (data?.isDark !== undefined) {
      isDark = !!data.isDark;
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
      syncTheme(isDark);
    }
    if (data?.logout) {
      localStorage.removeItem('nexa_user');
      window.location.href = '/auth/';
      return;
    }
    if (to === 'home') { dispatch('nav', { to: 'home' }); return; }
    if (to === 'main' || to === APP_ID) { route = 'main'; router.navigate('main'); return; }
  }
</script>

{#if ready}
  {#if route === 'main'}
    <MainPage {isDark} {user} appTitle={APP_TITLE} appId={APP_ID} iconPath={APP_ICON} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) { --primary: #2F7BF6; }
  :global(*, *::before, *::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :global(html, body) { width:100%; height:100%; overscroll-behavior:none; }
  :global(body) {
    margin:0;
    padding:0;
    overflow:hidden;
    position:relative;
    min-height:100dvh;
    width:100%;
    font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transition:background-color .3s ease, color .3s ease;
  }
  :global(#app) {
    width:100%;
    height:calc(var(--app-vh, 100vh));
    display:flex;
    flex-direction:column;
    position:fixed;
    inset:0;
    overflow:hidden;
  }
</style>