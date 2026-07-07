const path = window.location.pathname.replace(/\/+$/, '');

async function mount() {
  if (path === '/home/apps-modelos') {
    const { default: AppsModelos } = await import('./apps-modelos/AppsModelos.svelte');
    return new AppsModelos({ target: document.getElementById('app') });
  }
  const { default: App } = await import('./App.svelte');
  return new App({ target: document.getElementById('app') });
}

const app = await mount();
export default app;