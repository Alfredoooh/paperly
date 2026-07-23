// lib/icon-fallback.js
//
// Mapa de ícones Fluent local, sem CDN.
export const FLUENT_ICON_MAP = {
  back: 'arrow_left',
  more: 'more_vertical',
  undo: 'arrow_undo',
  redo: 'arrow_redo',
  text_color: '/icons/svg/docs/text_color.svg',
  fill_color: 'table_simple_include',
  align_left: 'align_left',
  align_center: 'align_center_horizontal',
  align_right: 'align_right',
  number_format: 'number_symbol',
  insert_row: 'table_bottom_row',
  insert_col: 'column',
  delete_row: 'delete',
  delete_col: 'delete',
  check: 'checkmark',
  duplicate: 'copy',
  export: 'arrow_download',
  delete: 'delete',
  close: 'dismiss',
  settings: 'settings',
  add: 'add',
};

export function fluentIconUrl(semanticName) {
  const icon = FLUENT_ICON_MAP[semanticName] || 'question_circle';
  if (icon.startsWith('/')) return icon;
  return `/icons/svg/regular/${icon}.svg`;
}
