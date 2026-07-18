export const lightColors = {
  background: '#FFFFFF', textPrimary: '#10151c', textSecondary: '#6E6E6E',
  textHint: '#10151c', iconTint: '#000000', iconTintSecondary: '#6E6E6E',
  divider: '#DDDDDD', drawerBackground: '#FFFFFF', drawerText: '#10151c',
  bottomBarSolid: '#FFFFFF', dialogBackground: '#F2F2F7',
  sendBtnColor: '#2F7BF6', sendIconColor: '#FFFFFF', addCircleBg: '#E8E8E8',
  tabPreviewPillBg: '#E0EBFE', extrasCardActive: '#EEF2FF',
  extrasCardActiveText: '#2F7BF6', settings_section_label: '#6E6E6E',
  userBubbleBg: '#E0EBFE', assistantBubbleBg: '#F2F2F7',
  authBtnBg: '#2F7BF6', authBtnText: '#FFFFFF', authInputFill: '#F0F0F0',
  appbarBtnBg: '#E8E8E8', primary: '#2F7BF6',
  appbarSurface: 'rgba(255,255,255,0.72)',
  docCanvasBg: '#F2F2F5', // branco mais fraco atrás do papel — papel branco se destaca
  creationBarBg: '#FFFFFF', // branco puro — bottom bar de modelos/formas
  toolbarSolidBg: '#FFFFFF', // branco puro — toolbar de formatação
};

export const darkColors = {
  background: '#0E0E0E', textPrimary: '#F2F2F2', textSecondary: '#8A8A8A',
  textHint: '#6E6E6E', iconTint: '#F2F2F2', iconTintSecondary: '#8A8A8A',
  divider: '#3A3A3A', drawerBackground: '#0E0E0E', drawerText: '#F2F2F2',
  bottomBarSolid: '#1F1F1F', dialogBackground: '#1F1F1F',
  sendBtnColor: '#2F7BF6', sendIconColor: '#FFFFFF', addCircleBg: '#2C2C2E',
  tabPreviewPillBg: '#1F2D4A', extrasCardActive: '#1E2D4F',
  extrasCardActiveText: '#A8C8FA', settings_section_label: '#8A8A8A',
  userBubbleBg: '#1F2D4A', assistantBubbleBg: '#1F1F1F',
  authBtnBg: '#2F7BF6', authBtnText: '#FFFFFF', authInputFill: '#242424',
  appbarBtnBg: '#2C2C2E', primary: '#2F7BF6',
  appbarSurface: 'rgba(15,15,15,0.72)',
  docCanvasBg: '#0E0E0E',// ou a superfície de fundo padrão que já usas
  creationBarBg: '#1F1F1F',
  toolbarSolidBg: '#1F1F1F',
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
  const colors = getThemeColors(isDark);
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  body.classList.toggle('dark', isDark);
  body.classList.toggle('light', !isDark);
  body.dataset.theme = isDark ? 'dark' : 'light';
  root.style.setProperty('--app-bg', colors.background);
  root.style.setProperty('--app-text', colors.textPrimary);
  root.style.setProperty('--app-surface', isDark ? '#1C1C1E' : '#FFFFFF');
  root.style.setProperty('--app-divider', colors.divider);
  root.style.setProperty('--primary', colors.primary);
  body.style.background = colors.background;
  body.style.color = colors.textPrimary;
  syncStatusBar(isDark, colors.background);

  // Ponte para o shell nativo Android (HomeActivity). Sem isto, o drawer
  // nativo e a status bar não acompanham a troca de tema feita aqui na Web.
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

// Ponte inversa: Kotlin -> JS. Chamada pelo AccountDrawerSheet nativo quando
// o utilizador escolhe um tema no drawer nativo, para aplicar exatamente
// a mesma lógica que o AppDrawer.svelte usaria (applyThemeFromDrawer).
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