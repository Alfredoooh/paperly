// lib/icon-fallback.js
//
// Sistema de ícones — Fluent System Icons direto, sem fallback
// condicional.
//
// A biblioteca Fluent System Icons é a biblioteca OFICIAL de ícones
// da Microsoft (MIT license, usada no Windows 11, Teams, Word, Excel,
// Outlook), servida via jsDelivr a partir do pacote npm
// @fluentui/svg-icons. NÃO são emojis, são ícones vetoriais de
// contorno/preenchidos.
//
// ANTES: tentava-se primeiro um SVG local do projeto (via <img>, não
// mask) e só se esse ficheiro falhasse a carregar em runtime é que se
// trocava para o Fluent correspondente. Agora o Fluent é a fonte
// ÚNICA e direta — nenhuma tentativa local, nenhuma dependência de um
// evento "error" do browser para decidir qual ícone aparece.
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
  settings: 'settings_24_regular',
  // 'sheets' NÃO entra aqui de propósito: o ícone da app Sheets no
  // ecrã inicial (launcher do home) vem sempre dos ficheiros locais
  // /icons/svg/sheets.svg, /icons/svg/sheets_filled.svg e
  // /icons/svg/apps/sheets.svg — geridos por src/shared/plans.js e
  // src/home/lib/constants.js. Esses ficheiros do home ficam FORA
  // deste sistema Fluent, exatamente como pedido.
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
 * Ação Svelte aplicada a um <img>. Define o `src` diretamente para o
 * ícone Fluent oficial correspondente — sem tentar nenhum ficheiro
 * local primeiro e sem depender de um evento "error" para decidir.
 *
 * Mantida com o mesmo nome (`iconWithFallback`) e a mesma assinatura
 * de uso para não obrigar a tocar em todos os componentes que já a
 * chamam — só o comportamento interno mudou (Fluent sempre, direto).
 *
 * Uso:
 *   <img
 *     use:iconWithFallback={'undo'}
 *     class="icon-img"
 *     alt=""
 *   />
 */
export function iconWithFallback(node, semanticName) {
  node.src = fluentIconUrl(semanticName);
  
  return {
    update(newSemanticName) {
      semanticName = newSemanticName;
      node.src = fluentIconUrl(semanticName);
    },
    destroy() {},
  };
}