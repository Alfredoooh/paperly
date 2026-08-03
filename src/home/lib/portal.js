// src/home/lib/portal.js
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