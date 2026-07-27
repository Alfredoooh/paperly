// Fluent UI System Icons (official Microsoft package, served online)
//
// The icon names use the package convention: [name]_[size]_[style]
// Example: pen_24_regular
const FLUENT_ICON_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.334/icons';

function normalizeIconName(name) {
  if (!name) return 'question_circle_24_regular';
  if (/_(?:12|16|20|24|28|32|48)_(?:regular|filled|color)$/.test(name)) return name;
  if (/_(?:regular|filled|color)$/.test(name)) return name;
  return `${name}_24_regular`;
}

export function localIconPath(name) {
  return `${FLUENT_ICON_BASE}/${normalizeIconName(name)}.svg`;
}
