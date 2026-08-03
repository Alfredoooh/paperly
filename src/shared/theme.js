import { darkPalette, lightPalette, getPalette, applyPaletteToRoot } from './colors.js';

export const lightColors = lightPalette;
export const darkColors = darkPalette;

export function getThemeColors(isDark) {
  return getPalette(isDark);
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
  
  applyPaletteToRoot(isDark);
  
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  body.classList.toggle('dark', isDark);
  body.classList.toggle('light', !isDark);
  body.dataset.theme = isDark ? 'dark' : 'light';
  body.style.background = 'var(--app-bg)';
  body.style.color = 'var(--icon-strong)';
  
  const bgColor = getComputedStyle(root).getPropertyValue('--app-bg').trim() || (isDark ? '#242424' : '#FAFAFA');
  syncStatusBar(isDark, bgColor);
  
  applySurfaceTone(getSurfaceTone(isDark), isDark);
  
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
  window.__nexaSetTheme = function(value) {
    if (value === 'system') {
      localStorage.removeItem('nexa_theme');
      syncTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      setTheme(value);
    }
  };
}

const TONE_KEY_LIGHT = 'nexa_surface_tone_light';
const TONE_KEY_DARK = 'nexa_surface_tone_dark';

export const SURFACE_TONES_DARK = [
  { id: 'default', label: 'Padrão', swatch: '#0F0F0F', appBg: '#0F0F0F', surface: '#0F0F0F', drawerBg: '#1C1C1E', btnBg: 'rgba(255,255,255,0.10)' },
  { id: 'charcoal', label: 'Carvão', swatch: '#161616', appBg: '#161616', surface: '#161616', drawerBg: '#212123', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'slate', label: 'Ardósia', swatch: '#14161A', appBg: '#14161A', surface: '#14161A', drawerBg: '#1F2227', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'midnight', label: 'Meia-noite', swatch: '#0B0F1A', appBg: '#0B0F1A', surface: '#0B0F1A', drawerBg: '#161B2C', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'forest', label: 'Floresta', swatch: '#0E1512', appBg: '#0E1512', surface: '#0E1512', drawerBg: '#182019', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'plum', label: 'Ameixa', swatch: '#150F17', appBg: '#150F17', surface: '#150F17', drawerBg: '#211A24', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'espresso', label: 'Café', swatch: '#161210', appBg: '#161210', surface: '#161210', drawerBg: '#221C19', btnBg: 'rgba(255,255,255,0.09)' },
  { id: 'pure', label: 'Preto puro', swatch: '#000000', appBg: '#000000', surface: '#000000', drawerBg: '#111111', btnBg: 'rgba(255,255,255,0.10)' },
];

export const SURFACE_TONES_LIGHT = [
  { id: 'default', label: 'Padrão', swatch: '#FFFFFF', appBg: '#FFFFFF', surface: '#FFFFFF', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.06)' },
  { id: 'mist', label: 'Névoa', swatch: '#F5F6F8', appBg: '#F5F6F8', surface: '#F5F6F8', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'sand', label: 'Areia', swatch: '#F7F4EE', appBg: '#F7F4EE', surface: '#F7F4EE', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'sky', label: 'Céu', swatch: '#F2F6FB', appBg: '#F2F6FB', surface: '#F2F6FB', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'sage', label: 'Sálvia', swatch: '#F3F6F2', appBg: '#F3F6F2', surface: '#F3F6F2', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'blush', label: 'Rosado', swatch: '#FAF3F3', appBg: '#FAF3F3', surface: '#FAF3F3', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'linen', label: 'Linho', swatch: '#F8F5F0', appBg: '#F8F5F0', surface: '#F8F5F0', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
  { id: 'pearl', label: 'Pérola', swatch: '#F0F0F2', appBg: '#F0F0F2', surface: '#F0F0F2', drawerBg: '#FFFFFF', btnBg: 'rgba(0,0,0,0.05)' },
];

export function getSurfaceTones(isDark) {
  return isDark ? SURFACE_TONES_DARK : SURFACE_TONES_LIGHT;
}

export function getSurfaceTone(isDark) {
  const key = isDark ? TONE_KEY_DARK : TONE_KEY_LIGHT;
  return localStorage.getItem(key) || 'default';
}

export function setSurfaceTone(toneId, isDark) {
  const key = isDark ? TONE_KEY_DARK : TONE_KEY_LIGHT;
  localStorage.setItem(key, toneId);
  syncTheme(isDark);
}

export function resetSurfaceTone() {
  localStorage.removeItem(TONE_KEY_LIGHT);
  localStorage.removeItem(TONE_KEY_DARK);
  const root = document.documentElement;
  ['--app-bg', '--surface', '--surface-strong', '--drawer-bg', '--btn-bg'].forEach(v => {
    root.style.removeProperty(v);
  });
}

function applySurfaceTone(toneId, isDark) {
  const tones = getSurfaceTones(isDark);
  const tone = tones.find(t => t.id === toneId) || tones[0];
  if (tone.id === 'default') {
    ['--app-bg', '--surface', '--surface-strong', '--drawer-bg', '--btn-bg'].forEach(v => {
      document.documentElement.style.removeProperty(v);
    });
    return;
  }
  const root = document.documentElement;
  root.style.setProperty('--app-bg', tone.appBg);
  root.style.setProperty('--surface', tone.surface);
  root.style.setProperty('--surface-strong', tone.surface);
  root.style.setProperty('--drawer-bg', tone.drawerBg);
  root.style.setProperty('--btn-bg', tone.btnBg);
}