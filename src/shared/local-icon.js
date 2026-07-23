export function localIconPath(name, filled = false) {
  const raw = String(name || '').replace(/\.svg$/i, '');
  const base = raw
    .replace(/_24_(regular|filled|color)$/i, '')
    .replace(/_(regular|filled|color)$/i, '');
  const folder = filled || /_24_filled$/i.test(raw) || /_filled$/i.test(raw) ? 'filled' : 'regular';
  return `/icons/svg/${folder}/${base}.svg`;
}
