const DARK = Object.freeze({
  bgPrimary: '#242424',
  bgSecondary: '#2C2C2E',
  bgTertiary: '#333335',
  bgElevated: '#3A3A3D',
  border: 'var(--border)',
  textPrimary: '#F2F2F2',
  textSecondary: '#A8A8AC',
  textTertiary: '#6E6E73',
  accentPrimary: '#4DA8FF',
  accentPrimaryActive: '#2F8FE8',
  textOnAccent: '#1A1A1A',
  danger: '#FF6B6B',
  success: '#3DD68C',
  warning: '#FFC24B',
});

const LIGHT = Object.freeze({
  bgPrimary: '#FAFAFA',
  bgSecondary: '#F0F0F1',
  bgTertiary: '#E8E8EA',
  bgElevated: '#FFFFFF',
  border: 'var(--border)',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5F',
  textTertiary: '#8E8E93',
  accentPrimary: '#0866D1',
  accentPrimaryActive: '#06529E',
  textOnAccent: '#FFFFFF',
  danger: '#D92D2D',
  success: '#177049',
  warning: '#9C6608',
});

function hexToRgb(hex) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function alpha(hex, value) {
  return `rgba(${hexToRgb(hex)},${value})`;
}

function buildLegacyVars(palette, isDark) {
  const text = palette.textPrimary;
  const bg = palette.bgPrimary;
  const surface = palette.bgElevated;
  const secondary = palette.textSecondary;
  const tertiary = palette.textTertiary;
  const border = palette.border;

  return {
    '--app-bg': bg,
    '--header-glass-rgb': hexToRgb(bg),
    '--surface': surface,
    '--surface-strong': palette.bgSecondary,
    '--surface-apps-tab': palette.bgSecondary,
    '--border-soft': alpha(text, isDark ? 0.12 : 0.09),
    '--border-faint': alpha(text, isDark ? 0.09 : 0.07),
    '--icon-strong': alpha(text, isDark ? 0.88 : 0.85),
    '--icon-faint': alpha(text, isDark ? 0.30 : 0.28),
    '--text-faint': alpha(text, isDark ? 0.38 : 0.40),
    '--row-active': alpha(text, isDark ? 0.07 : 0.05),
    '--btn-bg': alpha(text, isDark ? 0.10 : 0.06),
    '--btn-bg-active': alpha(text, isDark ? 0.18 : 0.11),
    '--drawer-bg': palette.bgSecondary,
    '--drawer-bg-strong': palette.bgTertiary,
    '--drawer-border': alpha(text, isDark ? 0.09 : 0.07),
    '--drawer-shadow': alpha('#000000', isDark ? 0.45 : 0.13),
    '--drawer-text': alpha(text, isDark ? 0.86 : 0.94),
    '--drawer-text-faint': alpha(text, isDark ? 0.38 : 0.34),
    '--drawer-sep': alpha(text, isDark ? 0.11 : 0.09),
    '--drawer-overlay-in': alpha('#000000', isDark ? 0.35 : 0.20),
    '--logout-icon': palette.danger,
    '--btn-solid-bg': isDark ? '#f5f5f5' : '#2a2a2a',
    '--btn-solid-bg-active': isDark ? '#e0e0e0' : '#1e1e1e',
    '--btn-solid-text': isDark ? '#1a1a1a' : '#ffffff',
    '--danger': palette.danger,
    '--danger-active': isDark ? '#E0342A' : '#E0342A',
    '--accent-primary': palette.accentPrimary,
    '--accent-primary-active': palette.accentPrimaryActive,
    '--nf-bg': isDark ? '#0b0b0d' : '#ffffff',
    '--nf-text': isDark ? '#ffffff' : '#111111',
    '--nf-text-secondary': isDark ? 'rgba(255,255,255,0.55)' : 'rgba(20,20,20,0.55)',
    '--nf-code-a': isDark ? '#6ea8ff' : '#4a8dff',
    '--nf-code-b': isDark ? '#2F7BF6' : '#1f63d6',
    '--nf-btn-bg': '#2F7BF6',
    '--nf-btn-text': '#ffffff',
  };
}

export const darkPalette = Object.freeze({
  ...DARK,
  background: DARK.bgPrimary,
  textHint: DARK.textTertiary,
  iconTint: DARK.textPrimary,
  iconTintSecondary: DARK.textSecondary,
  divider: DARK.border,
  drawerBackground: DARK.bgSecondary,
  drawerText: DARK.textPrimary,
  bottomBarSolid: DARK.bgElevated,
  dialogBackground: DARK.bgElevated,
  sendBtnColor: DARK.accentPrimary,
  sendIconColor: DARK.textOnAccent,
  addCircleBg: DARK.bgSecondary,
  tabPreviewPillBg: DARK.bgTertiary,
  extrasCardActive: DARK.bgTertiary,
  extrasCardActiveText: DARK.accentPrimary,
  settings_section_label: DARK.textSecondary,
  userBubbleBg: DARK.bgSecondary,
  assistantBubbleBg: DARK.bgElevated,
  authBtnBg: DARK.accentPrimary,
  authBtnText: DARK.textOnAccent,
  authInputFill: DARK.bgElevated,
  appbarBtnBg: DARK.bgSecondary,
  primary: DARK.accentPrimary,
  appbarSurface: DARK.bgElevated,
  docCanvasBg: DARK.bgPrimary,
  creationBarBg: DARK.bgElevated,
  toolbarSolidBg: DARK.bgElevated,
  // legacy helpers used by existing components
  borderSoft: alpha(DARK.textPrimary, 0.12),
  borderFaint: alpha(DARK.textPrimary, 0.09),
  rowActive: alpha(DARK.textPrimary, 0.07),
  btnBg: alpha(DARK.textPrimary, 0.10),
  btnBgActive: alpha(DARK.textPrimary, 0.18),
  drawerBg: DARK.bgSecondary,
  drawerBgStrong: DARK.bgTertiary,
  drawerShadow: alpha('#000000', 0.45),
  drawerSep: alpha(DARK.textPrimary, 0.11),
  drawerOverlayIn: alpha('#000000', 0.35),
  btnSolidBg: '#f5f5f5',
  btnSolidBgActive: '#e0e0e0',
  btnSolidText: '#1a1a1a',
  dangerActive: '#E0342A',
  nfBg: '#0b0b0d',
  nfText: '#ffffff',
  nfTextSecondary: 'rgba(255,255,255,0.55)',
  nfCodeA: '#6ea8ff',
  nfCodeB: '#2F7BF6',
  nfBtnBg: '#2F7BF6',
  nfBtnText: '#ffffff',
});

export const lightPalette = Object.freeze({
  ...LIGHT,
  background: LIGHT.bgPrimary,
  textHint: LIGHT.textTertiary,
  iconTint: LIGHT.textPrimary,
  iconTintSecondary: LIGHT.textSecondary,
  divider: LIGHT.border,
  drawerBackground: LIGHT.bgSecondary,
  drawerText: LIGHT.textPrimary,
  bottomBarSolid: LIGHT.bgElevated,
  dialogBackground: LIGHT.bgElevated,
  sendBtnColor: LIGHT.accentPrimary,
  sendIconColor: LIGHT.textOnAccent,
  addCircleBg: LIGHT.bgSecondary,
  tabPreviewPillBg: LIGHT.bgTertiary,
  extrasCardActive: LIGHT.bgTertiary,
  extrasCardActiveText: LIGHT.accentPrimary,
  settings_section_label: LIGHT.textSecondary,
  userBubbleBg: LIGHT.bgSecondary,
  assistantBubbleBg: LIGHT.bgElevated,
  authBtnBg: LIGHT.accentPrimary,
  authBtnText: LIGHT.textOnAccent,
  authInputFill: LIGHT.bgElevated,
  appbarBtnBg: LIGHT.bgSecondary,
  primary: LIGHT.accentPrimary,
  appbarSurface: LIGHT.bgElevated,
  docCanvasBg: LIGHT.bgPrimary,
  creationBarBg: LIGHT.bgElevated,
  toolbarSolidBg: LIGHT.bgElevated,
  // legacy helpers used by existing components
  borderSoft: alpha(LIGHT.textPrimary, 0.09),
  borderFaint: alpha(LIGHT.textPrimary, 0.07),
  rowActive: alpha(LIGHT.textPrimary, 0.05),
  btnBg: alpha(LIGHT.textPrimary, 0.06),
  btnBgActive: alpha(LIGHT.textPrimary, 0.11),
  drawerBg: LIGHT.bgSecondary,
  drawerBgStrong: LIGHT.bgTertiary,
  drawerShadow: alpha('#000000', 0.13),
  drawerSep: alpha(LIGHT.textPrimary, 0.09),
  drawerOverlayIn: alpha('#000000', 0.20),
  btnSolidBg: '#2a2a2a',
  btnSolidBgActive: '#1e1e1e',
  btnSolidText: '#ffffff',
  dangerActive: '#E0342A',
  nfBg: '#ffffff',
  nfText: '#111111',
  nfTextSecondary: 'rgba(20,20,20,0.55)',
  nfCodeA: '#4a8dff',
  nfCodeB: '#1f63d6',
  nfBtnBg: '#2F7BF6',
  nfBtnText: '#ffffff',
});

export const palettes = {
  dark: darkPalette,
  light: lightPalette,
};

export function getPalette(isDark) {
  return isDark ? darkPalette : lightPalette;
}

export function getCssVars(isDark) {
  const palette = getPalette(isDark);
  const legacy = buildLegacyVars(palette, isDark);
  const result = {};
  for (const [k, v] of Object.entries(palette)) {
    if (typeof v === 'string') result[`--${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`] = v;
  }
  for (const [k, v] of Object.entries(legacy)) result[k] = v;
  return result;
}

export function applyPaletteToRoot(isDark) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = getCssVars(isDark);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}