<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio para si mesma.
  import { onMount, createEventDispatcher } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import { createSlideTransition, createBackRecoilTransition } from '../home/lib/nav-transition.js';
  import MainPage from './pages/MainPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  
  const APP_ID = 'sheets';
  const APP_TITLE = 'Nexa Sheets';
  const APP_ICON = '/icons/svg/sheets.svg';
  const BASE = '/sheets/';
  const VALID_ROUTES = ['settings'];
  const router = createRouter(BASE, VALID_ROUTES, 'main');
  
  let route = 'main';
  let resourceId = null;
  let user = null;
  let isDark = false;
  let ready = false;
  
  const dispatch = createEventDispatcher();
  
  // ────────────────────────────────────────────────────────────────
  // FIX (bug de navegação): antes, main <-> settings era um "hard
  // swap" — {#if route === 'main'} ... {:else if route === 'settings'}
  // — a MainPage desmontava-se por completo assim que a rota mudava
  // para 'settings', sem qualquer animação, e reaparecia do zero ao
  // voltar (perdendo a posição de scroll da grelha e recomeçando a
  // troca de documento). Agora segue EXATAMENTE o mesmo padrão que
  // profile/App.svelte já usa: MainPage fica sempre montada por trás
  // (só recua ligeiramente, efeito push estilo iOS, via
  // createBackRecoilTransition) e SettingsPage entra por cima com o
  // seu próprio spring físico (createSlideTransition), em vez de
  // partilharem o mesmo valor bruto de rota.
  // ────────────────────────────────────────────────────────────────
  let mainOpen = false;
  let settingsOpen = false;
  
  const settingsSlide = createSlideTransition({});
  let settingsSlideX = 100;
  const unsubscribeSettingsSlide = settingsSlide.subscribe((v) => { settingsSlideX = v; });
  
  const mainRecoil = createBackRecoilTransition();
  let mainRecoilValue = 0; // 0..1
  const unsubscribeMainRecoil = mainRecoil.subscribe((v) => { mainRecoilValue = v; });
  
  let pageOpenToken = 0;
  
  function openSettingsVisual(immediate = false) {
    pageOpenToken += 1;
    const token = pageOpenToken;
    settingsOpen = true;
    if (immediate) {
      settingsSlideX = 0;
      mainRecoil.recoil();
      settingsSlide.setDragValue ? settingsSlide.setDragValue(0) : null;
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (pageOpenToken !== token) return;
        settingsSlide.open();
        mainRecoil.recoil();
      }));
    }
  }
  
  function closeSettingsVisual() {
    pageOpenToken += 1;
    const token = pageOpenToken;
    settingsSlide.close();
    mainRecoil.reset();
    setTimeout(() => {
      if (pageOpenToken !== token) return;
      settingsOpen = false;
    }, 340);
  }
  
  onMount(() => {
    user = requireAuth();
    if (!user) return;
    
    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);
    
    mainOpen = true;
    
    const { route: initialRoute, resourceId: initialResourceId, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    resourceId = initialResourceId;
    if (!resourceId) router.navigate(route, { replace: true });
    ready = true;
    
    if (route === 'settings') {
      openSettingsVisual(true);
    }
    
    const unbind = router.bindPopState((r, nf, rid) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
      resourceId = rid;
      if (route === 'settings') openSettingsVisual(false);
      else closeSettingsVisual();
    });
    
    return () => {
      unbind?.();
      unsubscribeSettingsSlide?.();
      unsubscribeMainRecoil?.();
      settingsSlide.destroy();
      mainRecoil.destroy();
    };
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
    if (to === 'settings') {
      route = 'settings';
      router.navigate('settings');
      openSettingsVisual(false);
      return;
    }
    if (to === 'main' || to === APP_ID) {
      route = 'main';
      resourceId = null;
      router.navigate('main');
      closeSettingsVisual();
      return;
    }
    if (to === 'resource' && data?.id) {
      route = 'main';
      resourceId = data.id;
      router.navigateToResource(data.id);
      return;
    }
  }
  
  // amplitude do recuo da MainPage por trás da SettingsPage — mesma
  // linguagem visual do .root do home quando um overlay entra por cima
  $: mainRecoilTranslate = -8 * mainRecoilValue; // %
  $: mainRecoilScale = 1 - 0.02 * mainRecoilValue;
  $: mainTransformStyle = `transform: translate3d(${mainRecoilTranslate}%, 0, 0) scale(${mainRecoilScale});`;
</script>

{#if ready}
  {#if mainOpen}
    <div class="sheets-main-layer" style={mainTransformStyle}>
      <MainPage {isDark} {user} {resourceId} appTitle={APP_TITLE} appId={APP_ID} iconPath={APP_ICON} on:nav={handleNav} />
    </div>
  {/if}
  {#if settingsOpen}
    <SettingsPage slideX={settingsSlideX} {isDark} {user} appTitle={APP_TITLE} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) { --primary: #21A366; }
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

  .sheets-main-layer {
    position: fixed; inset: 0; z-index: 1;
    will-change: transform;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
  }
</style>