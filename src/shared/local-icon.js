// src/shared/local-icon.js
// Fluent UI System Icons (official Microsoft package, served online)
//
// The icon names use the package convention: [name]_[size]_[style]
// Example: pen_24_regular
const FLUENT_ICON_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.334/icons';

export function localIconPath(name, filled = false) {
  const raw = String(name || '').replace(/\.svg$/i, '');
  const base = raw
    .replace(/_24_(regular|filled|color)$/i, '')
    .replace(/_(regular|filled|color)$/i, '');
  const folder = filled || /_24_filled$/i.test(raw) || /_filled$/i.test(raw) ? 'filled' : 'regular';
  return `/icons/svg/${folder}/${base}.svg`;
}

// Variante "color" (ícones multicoloridos, tipo Office/Word) — usada
// apenas para os ícones de INSERÇÃO DE CONTEÚDO (imagem, tabela/
// formulário). Continua a vir do CDN Fluent online, porque o pacote
// não tem variante colorida para ícones de formatação de texto
// (bold/italic/etc) e não há cópia local destes.
function normalizeColorIconName(name) {
  if (!name) return 'question_circle_24_color';
  const base = String(name)
    .replace(/\.svg$/i, '')
    .replace(/_(?:12|16|20|24|28|32|48)_(?:regular|filled|color)$/i, '')
    .replace(/_(?:regular|filled|color)$/i, '');
  return `${base}_24_color`;
}

export function localColorIconPath(name) {
  return `${FLUENT_ICON_BASE}/${normalizeColorIconName(name)}.svg`;
}