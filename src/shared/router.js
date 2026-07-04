// Router leve baseado em History API.
// Cada app (ai, music, games, media, downloader, profilelens) tem uma base
// fixa (ex: '/ai/'). As sub-rotas dentro do app (ex: 'settings', 'widgets')
// mapeiam para URLs reais tipo /ai/settings/, /ai/widgets/.

export function createRouter(base, validRoutes, rootRoute) {
  function parseCurrentRoute() {
    let path = window.location.pathname;
    if (!path.startsWith(base)) return { route: rootRoute, notFound: false };
    let rest = path.slice(base.length).replace(/^\/+|\/+$/g, '');
    if (!rest) return { route: rootRoute, notFound: false };
    const seg = rest.split('/')[0];
    if (validRoutes.includes(seg)) return { route: seg, notFound: false };
    return { route: rootRoute, notFound: true };
  }
  
  function navigate(route, { replace = false } = {}) {
    const path = route === rootRoute ? base : `${base}${route}/`;
    if (window.location.pathname === path) return;
    if (replace) window.history.replaceState({ route }, '', path);
    else window.history.pushState({ route }, '', path);
  }
  
  function bindPopState(onRoute) {
    function handler() {
      const { route, notFound } = parseCurrentRoute();
      onRoute(route, notFound);
    }
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }
  
  return { parseCurrentRoute, navigate, bindPopState };
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