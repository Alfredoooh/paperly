const lightVar = (name) => `var(${name})`;

export const lightColors = {
  background: lightVar('--app-bg'),
  textPrimary: lightVar('--icon-strong'),
  textSecondary: lightVar('--text-faint'),
  textHint: lightVar('--text-faint'),
  iconTint: lightVar('--icon-strong'),
  iconTintSecondary: lightVar('--icon-faint'),
  divider: lightVar('--border-soft'),
  drawerBackground: lightVar('--drawer-bg'),
  drawerText: lightVar('--drawer-text'),
  bottomBarSolid: lightVar('--surface'),
  dialogBackground: lightVar('--surface'),
  sendBtnColor: lightVar('--accent-primary'),
  sendIconColor: lightVar('--btn-solid-text'),
  addCircleBg: lightVar('--btn-bg'),
  tabPreviewPillBg: lightVar('--row-active'),
  extrasCardActive: lightVar('--row-active'),
  extrasCardActiveText: lightVar('--accent-primary'),
  settings_section_label: lightVar('--text-faint'),
  userBubbleBg: lightVar('--row-active'),
  assistantBubbleBg: lightVar('--surface'),
  authBtnBg: lightVar('--accent-primary'),
  authBtnText: lightVar('--btn-solid-text'),
  authInputFill: lightVar('--surface'),
  appbarBtnBg: lightVar('--btn-bg'),
  primary: lightVar('--accent-primary'),
  appbarSurface: lightVar('--surface'),
  docCanvasBg: lightVar('--app-bg'),
  creationBarBg: lightVar('--surface'),
  toolbarSolidBg: lightVar('--surface'),
};

export const darkColors = {
  background: lightVar('--app-bg'),
  textPrimary: lightVar('--icon-strong'),
  textSecondary: lightVar('--text-faint'),
  textHint: lightVar('--text-faint'),
  iconTint: lightVar('--icon-strong'),
  iconTintSecondary: lightVar('--icon-faint'),
  divider: lightVar('--border-soft'),
  drawerBackground: lightVar('--drawer-bg'),
  drawerText: lightVar('--drawer-text'),
  bottomBarSolid: lightVar('--surface'),
  dialogBackground: lightVar('--surface'),
  sendBtnColor: lightVar('--accent-primary'),
  sendIconColor: lightVar('--btn-solid-text'),
  addCircleBg: lightVar('--btn-bg'),
  tabPreviewPillBg: lightVar('--row-active'),
  extrasCardActive: lightVar('--row-active'),
  extrasCardActiveText: lightVar('--accent-primary'),
  settings_section_label: lightVar('--text-faint'),
  userBubbleBg: lightVar('--row-active'),
  assistantBubbleBg: lightVar('--surface'),
  authBtnBg: lightVar('--accent-primary'),
  authBtnText: lightVar('--btn-solid-text'),
  authInputFill: lightVar('--surface-strong'),
  appbarBtnBg: lightVar('--btn-bg'),
  primary: lightVar('--accent-primary'),
  appbarSurface: lightVar('--surface'),
  docCanvasBg: lightVar('--app-bg'),
  creationBarBg: lightVar('--surface'),
  toolbarSolidBg: lightVar('--surface'),
};

export function getThemeColors(isDark) {
  return isDark ? darkColors : lightColors;
}

export function getTheme() {
  const saved = localStorage.getItem('nexa_theme');
  if (saved === 'dark') return 'dark';
  if (saved === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(value) {
  localStorage.setItem('nexa_theme', value);
  syncTheme(value === 'dark');
}

export function syncTheme(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  body.classList.toggle('dark', isDark);
  body.classList.toggle('light', !isDark);
  body.dataset.theme = isDark ? 'dark' : 'light';
  body.style.background = 'var(--app-bg)';
  body.style.color = 'var(--icon-strong)';

  const bgColor = getComputedStyle(root).getPropertyValue('--app-bg').trim() || (isDark ? '#0F0F0F' : '#FFFFFF');
  syncStatusBar(isDark, bgColor);

  if (window.AndroidTheme && typeof window.AndroidTheme.onThemeChanged === 'function') {
    window.AndroidTheme.onThemeChanged(isDark);
  }
}

function syncStatusBar(isDark, bgColor) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bgColor);

  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleMeta);
  }
  appleMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
}

if (typeof window !== 'undefined') {
  window.__nexaSetTheme = function (value) {
    if (value === 'system') {
      localStorage.removeItem('nexa_theme');
      syncTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      setTheme(value);
    }
  };
}
