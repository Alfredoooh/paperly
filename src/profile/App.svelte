<script>
  export let pushed = false;
  import { onMount, createEventDispatcher } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import { createSlideTransition, createBackRecoilTransition } from '../home/lib/nav-transition.js';
  import MainPage from './pages/MainPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  
  const APP_ID = 'profile';
  const APP_TITLE = 'Perfil';
  const APP_ICON = '/icons/svg/user.svg';
  const BASE = '/profile/';
  const VALID_ROUTES = ['settings'];
  const router = createRouter(BASE, VALID_ROUTES, 'main');
  
  let route = 'main';
  let user = null;
  let isDark = false;
  let ready = false;
  
  // ────────────────────────────────────────────────────────────────
  // Navegação main <-> settings: EXATAMENTE o mesmo padrão do home
  // (search/preview entrando por cima do .root, que recua/"pushed
  // back"). ANTES: as duas telas partilhavam o MESMO spring
  // (pageSlide), movendo-se juntas com o mesmo valor — o que produzia
  // uma animação estranha (a MainPage literalmente saía do ecrã junto
  // com a SettingsPage a entrar, em vez de ficar parada por trás).
  // AGORA: cada tela tem o SEU PRÓPRIO spring (settingsSlide entra
  // 100 -> 0 por cima, exatamente como SearchPage/TemplatePreviewPage
  // no home) e a MainPage usa o spring de recuo (backRecoil, o mesmo
  // usado pelo .root do home) para se afastar ligeiramente por trás —
  // nunca desaparece do ecrã, só recua.
  // ────────────────────────────────────────────────────────────────
  let mainOpen = false;
  let settingsOpen = false;
  let settingsVisible = false; // controla o {#if} de desmontagem da SettingsPage
  
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
      settingsSlide.releaseDragTo ? null : null; // no-op guard, valor já assentado abaixo
      mainRecoil.recoil();
      // força o spring já no valor final sem reanimar do zero
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
  
  const dispatch = createEventDispatcher();
  
  onMount(() => {
    user = requireAuth();
    if (!user) return;
    
    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);
    
    mainOpen = true;
    
    const { route: initialRoute, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    router.navigate(route, { replace: true });
    ready = true;
    
    if (route === 'settings') {
      openSettingsVisual(true);
    }
    
    const unbind = router.bindPopState((r, nf) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
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
      router.navigate('main');
      closeSettingsVisual();
      return;
    }
  }
  
  function handleUserUpdate(e) {
    const updated = e.detail || {};
    const stored = JSON.parse(localStorage.getItem('nexa_user') || 'null') || {};
    const merged = Object.assign({}, stored, updated);
    localStorage.setItem('nexa_user', JSON.stringify(merged));
    user = merged;
  }
  
  // amplitude do recuo da MainPage por trás da SettingsPage — mesma
  // linguagem visual do .root do home quando um overlay entra por cima
  $: mainRecoilTranslate = -8 * mainRecoilValue; // %
  $: mainRecoilScale = 1 - 0.02 * mainRecoilValue;
  $: mainTransformStyle = `transform: translate3d(${mainRecoilTranslate}%, 0, 0) scale(${mainRecoilScale});`;
</script>

{#if ready}
  {#if mainOpen}
    <div class="profile-main-layer" style={mainTransformStyle}>
      <MainPage {isDark} {user} appTitle={APP_TITLE} appId={APP_ID} iconPath={APP_ICON} on:nav={handleNav} on:userUpdate={handleUserUpdate} />
    </div>
  {/if}
  {#if settingsOpen}
    <SettingsPage slideX={settingsSlideX} {isDark} {user} appTitle={APP_TITLE} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) { --primary: #2F7BF6; }
  :global(*, *::before, *::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :global(html, body) { height:100%; }
  :global(body) { margin:0; padding:0; overflow:hidden; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; transition:background-color .3s ease, color .3s ease; }
  :global(#app) { width:100vw; height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; }

  .profile-main-layer {
    position: fixed; inset: 0; z-index: 1;
    will-change: transform;
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
  }
</style>