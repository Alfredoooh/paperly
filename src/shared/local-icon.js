// src/shared/local-icon.js
// Fluent UI System Icons (official Microsoft package, served online)
//
// The icon names use the package convention: [name]_[size]_[style]
// Example: pen_24_regular
const FLUENT_ICON_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.334/icons';

function stripStyleSuffix(raw) {
  return raw
    .replace(/_(?:12|16|20|24|28|32|48)_(?:regular|filled|color)$/i, '')
    .replace(/_(?:regular|filled|color)$/i, '');
}

export function localIconPath(name, filled = false) {
  const raw = String(name || '').replace(/\.svg$/i, '');
  if (!raw) return `${FLUENT_ICON_BASE}/question_circle_24_regular.svg`;
  const base = stripStyleSuffix(raw);
  const style = filled || /_24_filled$/i.test(raw) || /_filled$/i.test(raw) ? 'filled' : 'regular';
  return `${FLUENT_ICON_BASE}/${base}_24_${style}.svg`;
}

// Variante "color" (ícones multicoloridos, tipo Office/Word) — usada
// apenas para os ícones de INSERÇÃO DE CONTEÚDO (imagem, tabela/
// formulário). Os ícones de formatação de texto (bold/italic/etc)
// ficam SEMPRE em '_regular' ou '_filled' (mono, tintados via
// mask-image), porque o pacote Fluent não tem variante colorida para
// esses.
export function localColorIconPath(name) {
  const raw = String(name || '').replace(/\.svg$/i, '');
  if (!raw) return `${FLUENT_ICON_BASE}/question_circle_24_color.svg`;
  const base = stripStyleSuffix(raw);
  return `${FLUENT_ICON_BASE}/${base}_24_color.svg`;
}