
const darkPalette = {
  bgPrimary: '#242424',
  bgSecondary: '#2C2C2E',
  bgTertiary: '#333335',
  bgElevated: '#3A3A3D',
  border: '#3D3D40',
  textPrimary: '#F2F2F2',
  textSecondary: '#A8A8AC',
  textTertiary: '#6E6E73',
  accentPrimary: '#4DA8FF',
  accentPrimaryActive: '#2F8FE8',
  textOnAccent: '#1A1A1A',
  danger: '#FF6B6B',
  success: '#3DD68C',
  warning: '#FFC24B',
};

const lightPalette = {
  bgPrimary: '#FAFAFA',
  bgSecondary: '#F0F0F1',
  bgTertiary: '#E8E8EA',
  bgElevated: '#FFFFFF',
  border: '#D8D8DB',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5F',
  textTertiary: '#8E8E93',
  accentPrimary: '#0866D1',
  accentPrimaryActive: '#06529E',
  textOnAccent: '#FFFFFF',
  danger: '#D92D2D',
  success: '#177049',
  warning: '#9C6608',
};

function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '0,0,0';
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function setVar(root, name, value) {
  root.style.setProperty(name, value);
}

function applyPaletteVars(palette, isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  const vars = {
    '--bg-primary': palette.bgPrimary,
    '--bg-secondary': palette.bgSecondary,
    '--bg-tertiary': palette.bgTertiary,
    '--bg-elevated': palette.bgElevated,
    '--border': palette.border,
    '--text-primary': palette.textPrimary,
    '--text-secondary': palette.textSecondary,
    '--text-tertiary': palette.textTertiary,
    '--accent-primary': palette.accentPrimary,
    '--accent-primary-active': palette.accentPrimaryActive,
    '--text-on-accent': palette.textOnAccent,
    '--danger': palette.danger,
    '--success': palette.success,
    '--warning': palette.warning,

    '--app-bg': palette.bgPrimary,
    '--surface': palette.bgElevated,
    '--surface-strong': palette.bgTertiary,
    '--surface-apps-tab': palette.bgSecondary,
    '--border-soft': palette.border,
    '--border-faint': palette.border,
    '--icon-strong': palette.textPrimary,
    '--icon-faint': palette.textSecondary,
    '--text-faint': palette.textTertiary,
    '--row-active': isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    '--btn-bg': isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
    '--btn-bg-active': isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.11)',
    '--drawer-bg': palette.bgSecondary,
    '--drawer-bg-strong': palette.bgTertiary,
    '--drawer-border': palette.border,
    '--drawer-shadow': isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.13)',
    '--drawer-text': palette.textPrimary,
    '--drawer-text-faint': palette.textTertiary,
    '--drawer-sep': palette.border,
    '--drawer-overlay-in': isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.20)',
    '--logout-icon': palette.danger,
    '--btn-solid-bg': isDark ? '#F5F5F5' : '#2A2A2A',
    '--btn-solid-bg-active': isDark ? '#E0E0E0' : '#1E1E1E',
    '--btn-solid-text': isDark ? '#1A1A1A' : '#FFFFFF',
    '--header-glass-rgb': hexToRgb(palette.bgPrimary),
  };

  Object.entries(vars).forEach(([name, value]) => setVar(root, name, value));
  if (body) {
    body.style.background = 'var(--app-bg)';
    body.style.color = 'var(--icon-strong)';
  }
}

export function applyPalette(isDark) {
  applyPaletteVars(isDark ? darkPalette : lightPalette, !!isDark);
}

export { darkPalette, lightPalette, hexToRgb };

