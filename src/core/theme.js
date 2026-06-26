export function syncTheme(isDark) {
  if (typeof document === 'undefined') return;

  const dark = !!isDark;
  const root = document.documentElement;
  const body = document.body;
  const app = document.getElementById('app');

  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);

  if (body) {
    body.classList.toggle('dark', dark);
    body.classList.toggle('light', !dark);
    body.dataset.theme = dark ? 'dark' : 'light';
    body.style.colorScheme = dark ? 'dark' : 'light';
  }

  if (app) {
    app.classList.toggle('dark', dark);
    app.classList.toggle('light', !dark);
  }
}
