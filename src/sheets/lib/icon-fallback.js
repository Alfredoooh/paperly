// lib/icon-fallback.js
//
// Mapa de ícones Fluent local, sem CDN.
export const FLUENT_ICON_MAP = {
  back: 'arrow_left',
  more: 'more_vertical',
  undo: 'arrow_undo',
  redo: 'arrow_redo',
  text_color: 'text_color',
  fill_color: 'paint_bucket',
  align_left: 'text_align_left',
  align_center: 'text_align_center',
  align_right: 'text_align_right',
  number_format: 'number_symbol',
  insert_row: 'table_insert_row',
  insert_col: 'table_insert_column',
  delete_row: 'table_delete_row',
  delete_col: 'table_delete_column',
  check: 'checkmark',
  duplicate: 'copy',
  export: 'arrow_download',
  delete: 'delete',
  close: 'dismiss',
  settings: 'settings',
  add: 'add',
  bold: 'text_bold',
  italic: 'text_italic',
  underline: 'text_underline',
  chart: 'chart_multiple',
  chart_bar: 'data_bar_vertical',
  chart_line: 'chart_multiple',
  chart_pie: 'data_pie',
  chart_donut: 'data_pie',
  resize: 'resize',
};

export function fluentIconUrl(semanticName) {
  const name = FLUENT_ICON_MAP[semanticName] || 'question_circle';
  return `/icons/svg/regular/${name}.svg`;
}