// src/home/lib/portal.js
//
// Action Svelte para mover um nó DOM para fora da árvore em que
// nasceu, movendo-o fisicamente para document.body (ou outro alvo) na
// montagem, e devolvendo-o à posição original quando o componente é
// desmontado (se essa posição ainda existir).
//
// Por que isso é necessário e não dá pra resolver só subindo o z-index:
//
// Qualquer ancestral com transform (mesmo identidade), will-change:
// transform, filter ou contain: paint/layout cria um novo stacking
// context E um novo containing block. Um elemento position:fixed
// dentro desse ancestral deixa de se posicionar relativo à viewport e
// passa a se posicionar relativo a esse ancestral — e o z-index dele
// deixa de competir globalmente, passa a competir só DENTRO do
// stacking context local desse ancestral. Se outro elemento (tipo uma
// bottombar) for irmão desse ancestral no DOM e vier depois dele, esse
// irmão pinta por cima de TUDO que tá preso lá dentro, não importa o
// z-index interno.
//
// Não existe valor de z-index que resolva isso de dentro. A única
// correção estrutural é mover o nó pra fora da árvore presa — é
// exatamente isso que essa action faz.
//
// Uso:
//
//   <div class="menu-overlay" use:portal>
//     ...
//   </div>
//
// Ou com alvo customizado (por padrão é document.body):
//
//   <div use:portal={someOtherNode}>
//
export function portal(node, target = document.body) {
  const resolvedTarget =
    typeof target === 'string' ? document.querySelector(target) : target;
  
  const originalParent = node.parentNode;
  const originalNextSibling = node.nextSibling;
  
  (resolvedTarget || document.body).appendChild(node);
  
  return {
    destroy() {
      if (originalParent && originalParent.isConnected) {
        originalParent.insertBefore(node, originalNextSibling || null);
      } else if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    },
  };
}