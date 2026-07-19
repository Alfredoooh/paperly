// lib/icon-fallback.js
//
// Sistema de ícones com fallback online.
//
// Cada ícone tenta primeiro o SVG local do projeto (ficheiro em
// /icons/svg/...), usado como <img> normal (não mask — mask falha
// silenciosamente e fica invisível; <img> dispara um evento "error"
// detetável). Se esse ficheiro local não existir/não carregar em
// runtime (asset em falta, path errado, build Android sem o ficheiro
// empacotado), a ação `use:iconWithFallback` deteta a falha e troca
// automaticamente o src para o ícone vetorial equivalente da Fluent
// System Icons — a biblioteca OFICIAL de ícones da Microsoft (MIT
// license, usada no Windows 11, Teams, Word, Excel, Outlook),
// servida via jsDelivr a partir do pacote npm @fluentui/svg-icons.
// NÃO são emojis, são ícones vetoriais de contorno/preenchidos.
//
// https://www.npmjs.com/package/@fluentui/svg-icons

const FLUENT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.177/icons';

// Mapa: nome semântico interno -> nome do ficheiro na Fluent System Icons.
export const FLUENT_ICON_MAP = {
  back: 'arrow_left_24_regular',
  more: 'more_horizontal_24_regular',
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
  sheets: 'table_24_filled',
};

/**
 * Devolve a URL da Fluent System Icon correspondente ao nome
 * semântico interno. Se não houver mapeamento, cai num ícone
 * genérico neutro em vez de ficar vazio.
 */
export function fluentIconUrl(semanticName) {
  const iconFile = FLUENT_ICON_MAP[semanticName] || 'question_circle_24_regular';
  return `${FLUENT_CDN_BASE}/${iconFile}.svg`;
}

/**
 * Ação Svelte aplicada a um <img>. Se o `src` local falhar a
 * carregar (evento "error" nativo do browser), troca o `src` para o
 * ícone Fluent oficial correspondente.
 *
 * Uso:
 *   <img
 *     src="/icons/svg/docs/undo.svg"
 *     use:iconWithFallback={'undo'}
 *     class="icon-img"
 *     alt=""
 *   />
 */
export function iconWithFallback(node, semanticName) {
  let usedFallback = false;
  
  function handleError() {
    if (usedFallback) return; // já está no fallback — evita loop se o CDN também falhar
    usedFallback = true;
    node.src = fluentIconUrl(semanticName);
  }
  
  node.addEventListener('error', handleError);
  
  return {
    update(newSemanticName) {
      semanticName = newSemanticName;
      usedFallback = false;
    },
    destroy() {
      node.removeEventListener('error', handleError);
    },
  };
}