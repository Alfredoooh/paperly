// shared/router.js
// Router leve baseado em History API.
// Cada app (ai, profilelens e as apps do workspace) tem uma base
// fixa (ex: '/ai/'). As sub-rotas dentro do app (ex: 'settings', 'widgets')
// mapeiam para URLs reais tipo /ai/settings/, /ai/widgets/.
// Também suporta um segmento dinâmico de recurso (ex: um UUID de
// conversa/documento), tipo /chat/508285b4-88a2-4939-9529-cdd0adf4f4d1/.
//
// MODO ISOLADO (isolated=true): usado quando o app é montado como
// componente Svelte "convidado" dentro de outro app anfitrião (ex: a
// Nexa IA aberta dentro do bottom-sheet modal do home), em vez de
// como rota própria de topo. Nesse cenário, o app anfitrião já é o
// dono legítimo de window.history/popstate — se este router também
// lhe mexesse, teríamos dois routers a escrever no mesmo histórico
// global do browser ao mesmo tempo, cada um a tentar interpretar o
// mesmo popstate à sua maneira (a mesma categoria de bug de "dois
// donos a escrever no mesmo estado" que o próprio projeto já evita
// deliberadamente no recoil do rootEl). Em modo isolado, navigate()
// e bindPopState() tornam-se no-ops seguros: a sub-navegação interna
// do app convidado (ex: chat → settings) passa a existir só em
// memória local, sem nunca tocar na URL real do browser.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeBase(base) {
  if (!base.startsWith('/')) base = '/' + base;
  return base.endsWith('/') ? base : base + '/';
}

function normalizeRoute(route) {
  if (!route) return '';
  return String(route).replace(/^\/+|\/+$|^\s+|\s+$/g, '');
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function createRouter(base, validRoutes, rootRoute, isolated = false) {
  const normalizedBase = normalizeBase(base);
  const normalizedValidRoutes = new Set((validRoutes || []).map(normalizeRoute));
  const normalizedRootRoute = normalizeRoute(rootRoute);
  
  function parseCurrentRoute() {
    let path = window.location.pathname || '/';
    if (!path.startsWith(normalizedBase)) return { route: normalizedRootRoute, resourceId: null, notFound: false };
    
    const rest = path.slice(normalizedBase.length).replace(/^\/+|\/+$/g, '');
    if (!rest) return { route: normalizedRootRoute, resourceId: null, notFound: false };
    
    const seg = normalizeRoute(rest.split('/')[0]);
    
    if (normalizedValidRoutes.has(seg)) return { route: seg, resourceId: null, notFound: false };
    
    if (isUuid(seg)) return { route: normalizedRootRoute, resourceId: seg, notFound: false };
    
    return { route: normalizedRootRoute, resourceId: null, notFound: true };
  }
  
  function navigate(route, { replace = false } = {}) {
    // Modo isolado: sub-navegação interna nunca toca em window.history
    // real — quem quiser saber "para onde navegou o convidado" tem de
    // ouvir isso via evento Svelte (on:nav), não via URL.
    if (isolated) return;
    const normalizedRoute = normalizeRoute(route);
    const path = normalizedRoute === normalizedRootRoute ? normalizedBase : `${normalizedBase}${normalizedRoute}/`;
    if (window.location.pathname === path) return;
    if (replace) window.history.replaceState({ route: normalizedRoute }, '', path);
    else window.history.pushState({ route: normalizedRoute }, '', path);
  }
  
  function navigateToResource(resourceId, { replace = false } = {}) {
    if (isolated) return;
    const path = `${normalizedBase}${resourceId}/`;
    if (window.location.pathname === path) return;
    if (replace) window.history.replaceState({ resourceId }, '', path);
    else window.history.pushState({ resourceId }, '', path);
  }
  
  function bindPopState(onRoute) {
    // Modo isolado: nunca se inscreve no popstate global — esse
    // evento pertence ao anfitrião (ex: home/App.svelte), que já o
    // está a usar para fechar o próprio modal. Devolve um unbind
    // no-op para o chamador poder continuar a tratar isto de forma
    // uniforme (sempre recebe uma função de cleanup, chame-a ou não).
    if (isolated) return () => {};
    function handler() {
      const { route, resourceId, notFound } = parseCurrentRoute();
      onRoute(route, notFound, resourceId);
    }
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }
  
  return { parseCurrentRoute, navigate, navigateToResource, bindPopState };
}

// Redireciona a raiz do site ('/') para /home/. Chamar só na página raiz.
export function redirectRootToHome() {
  const p = window.location.pathname;
  if (p === '/' || p === '' || p === '/index.html') {
    window.location.replace('/home/');
  }
}

// Redireciona qualquer caminho desconhecido (fora das apps registadas) para
// a página de erro 404. Chamar em cada app quando a rota não é válida.
export function redirectToNotFound() {
  window.location.replace('/404/');
}