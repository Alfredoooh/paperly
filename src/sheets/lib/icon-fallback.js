// lib/icon-fallback.js
//
// Ícones — Fluent System Icons direto, sem fallback e sem tentativa
// de ficheiro local nenhum. A Fluent System Icons é a biblioteca
// OFICIAL de ícones da Microsoft (MIT license, usada no Windows 11,
// Teams, Word, Excel, Outlook), servida via CDN a partir do pacote
// npm @fluentui/svg-icons. Só isto — nada de ficheiros /icons/svg/
// locais, nada de <img> com evento "error" a decidir o que aparece.
//
// https://www.npmjs.com/package/@fluentui/svg-icons

export const FLUENT_CDN = 'https://unpkg.com/@fluentui/svg-icons/icons/';

// Mapa: nome semântico interno -> nome do ficheiro na Fluent System Icons.
// Mesmos nomes/estilo (_24_regular / _24_filled) já usados em
// src/docs/pages/MainPage.svelte e nos restantes componentes do docs.
export const FLUENT_ICON_MAP = {
  back: 'arrow_left_24_regular',
  more: 'more_vertical_24_regular',
  undo: 'arrow_undo_24_regular',
  redo: 'arrow_redo_24_regular',
  text_color: 'text_color_24_regular',
  fill_color: 'paint_bucket_24_regular',
  align_left: 'text_align_left_24_regular',
  align_center: 'text_align_center_24_regular',
  align_right: 'text_align_right_24_regular',
  number_format: 'number_symbol_24_regular',
  insert_row: 'table_insert_row_24_regular',
  insert_col: 'table_insert_column_24_regular',
  delete_row: 'table_delete_row_24_regular',
  delete_col: 'table_delete_column_24_regular',
  check: 'checkmark_24_filled',
  duplicate: 'copy_24_regular',
  export: 'arrow_download_24_regular',
  delete: 'delete_24_regular',
  close: 'dismiss_24_regular',
  settings: 'settings_24_regular',
  // 'sheets' NÃO entra aqui: o ícone da app Sheets no ecrã inicial
  // (launcher do home) continua a vir dos ficheiros locais
  // /icons/svg/sheets.svg, /icons/svg/sheets_filled.svg e
  // /icons/svg/apps/sheets.svg, geridos por src/shared/plans.js e
  // src/home/lib/constants.js — esses são "os arquivos do home",
  // ficam fora deste sistema Fluent de propósito.
};

export function fluentIconUrl(semanticName) {
  const iconFile = FLUENT_ICON_MAP[semanticName] || 'question_circle_24_regular';
  return `${FLUENT_CDN}${iconFile}.svg`;
}