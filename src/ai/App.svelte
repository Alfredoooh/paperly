<!-- src/ai/App.svelte -->
<script>
  export let pushed = false;
  // pushed é controlado pelo shell raiz; esta app não usa slide interno próprio.

  // embedded=true: esta instância está a correr DENTRO de outro app
  // anfitrião (ex: o bottom-sheet modal do home), não como rota de
  // topo própria. Nesse modo:
  //  - o router interno nunca toca em window.history/popstate real
  //    (ver shared/router.js, modo isolated)
  //  - os estilos globais de :global(body)/:global(#app) NÃO são
  //    aplicados, porque #app já pertence à shell raiz de fora — só
  //    o .embedded-root local define o próprio layout, herdando
  //    100% de altura de quem o montar (o modal decide a altura
  //    real; este componente só a preenche).
  export let embedded = false;

  import { onMount, createEventDispatcher } from 'svelte';
  import '$shared/theme.css';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import ChatPage from './pages/ChatPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';
  import WidgetsPage from './pages/WidgetsPage.svelte';

  const BASE = '/ai/';
  const VALID_ROUTES = ['settings', 'widgets'];
  const router = createRouter(BASE, VALID_ROUTES, 'chat', embedded);

  let route = 'chat';
  let resourceId = null;
  let user = null;
  let isDark = false;
  let chatMounted = false;
  let ready = false;

  const dispatch = createEventDispatcher();

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    // Em modo embedded, parseCurrentRoute() lê window.location.pathname
    // do anfitrião (ex: '/home/'), que nunca começa por BASE ('/ai/')
    // — cai sempre no branch normalizedRootRoute ('chat'), que é
    // exatamente o ponto de entrada correto ao abrir o modal.
    const { route: initialRoute, resourceId: initialResourceId, notFound } = router.parseCurrentRoute();
    if (notFound && !embedded) { window.location.replace('/404/'); return; }
    route = embedded ? 'chat' : initialRoute;
    resourceId = embedded ? null : initialResourceId;
    if (!embedded && !resourceId) router.navigate(route, { replace: true });

    chatMounted = true;
    ready = true;

    const unbind = router.bindPopState((r, nf, rid) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
      resourceId = rid;
    });

    if (!embedded) {
      window.addEventListener('beforeunload', () =>
        localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light'));
    }

    return unbind;
  });

  function persistTheme(nextIsDark) {
    isDark = !!nextIsDark;
    localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
    syncTheme(isDark);
  }

  function goChat() {
    route = 'chat';
    resourceId = null;
    router.navigate('chat');
  }

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (data?.isDark !== undefined) persistTheme(data.isDark);
    if (data?.logout) {
      localStorage.removeItem('nexa_user');
      window.location.href = '/auth/';
      return;
    }
    if (to === 'home') { dispatch('nav', { to: 'home' }); return; }
    if (to === 'chat' || to === 'ai') { goChat(); return; }
    if (to === 'settings') { route = 'settings'; resourceId = null; router.navigate('settings'); return; }
    if (to === 'widgets') { route = 'widgets'; resourceId = null; router.navigate('widgets'); return; }
    if (to === 'resource' && data?.id) {
      route = 'chat';
      resourceId = data.id;
      router.navigateToResource(data.id);
      return;
    }
    route = to;
    router.navigate(to);
  }
</script>

<div class="embedded-root" class:embedded>
  {#if ready}
    {#if chatMounted}
      <div style="display:{route === 'chat' ? 'contents' : 'none'}">
        <ChatPage {isDark} {user} {resourceId} on:nav={handleNav} />
      </div>
    {/if}
    {#if route === 'settings'}
      <SettingsPage
        {isDark}
        {user}
        on:close={goChat}
        on:themeChange={(e) => persistTheme(e.detail.isDark)}
        on:logout={() => {
          localStorage.removeItem('nexa_user');
          window.location.href = '/auth/';
        }}
      />
    {:else if route === 'widgets'}
      <WidgetsPage {isDark} {user} on:nav={handleNav} />
    {/if}
  {/if}
</div>

<style>
  @import '../shared/theme.css';
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  /* Estilos globais de documento inteiro (html/body/#app) SÓ fazem
     sentido quando este App.svelte é a app de topo real, montada
     diretamente pelo shell raiz. Quando embedded=true, quem já
     definiu body/#app é a shell de fora — reescrever isso por cima
     causaria layout errado no resto da aplicação (ex: o próprio home
     por trás do modal). Por isso estes globais só se aplicam
     condicionalmente, via a classe local .embedded-root que o
     :global() de baixo verifica no ascendente mais próximo. */
  :global(html:not(:has(.embedded-root.embedded))),
  :global(body:not(:has(.embedded-root.embedded)))  {
    height: 100%;
  }
  :global(body:not(:has(.embedded-root.embedded))) {
    margin: 0; padding: 0; overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  :global(#app:not(:has(.embedded-root.embedded))) {
    width: 100vw; height: 100dvh;
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }

  /* Layout próprio: preenche SEMPRE 100% do contentor que o montar.
     Fora de embedded (app de topo), esse contentor é #app (100dvh
     real do ecrã). Dentro de embedded (modal), esse contentor é o
     corpo do bottom-sheet — a altura real vem de fora, nunca é um
     número mágico fixo aqui dentro. */
  .embedded-root {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
</style>