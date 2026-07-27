const FLUENT_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@latest/icons';

export function fluentIconUrl(name, style = 'regular', size = 24) {
  const safeName = String(name || '').trim();
  const safeStyle = String(style || 'regular').trim();
  const safeSize = Number.isFinite(size) ? size : 24;
  return `${FLUENT_BASE}/${safeName}_${safeSize}_${safeStyle}.svg`;
}
