// src/home/lib/nav-transition.js
//
// Motor único de transição para telas full-screen "empurradas" (search,
// preview, e qualquer outra tela que precise do padrão nativo de
// slide-in/slide-out). Usa spring físico via requestAnimationFrame em vez
// de CSS transitions declarativas — isto é o que elimina o congelamento:
// uma transição CSS não pode ser "interrompida e redirecionada" a meio do
// caminho sem re-flow, mas um valor JS atualizado por frame pode.
//
// Uso típico dentro de um componente Svelte:
//
//   import { createSlideTransition } from '../lib/nav-transition.js';
//   const slide = createSlideTransition({ onSettleClosed: () => open = false });
//   slide.open();   // dispara entrada
//   slide.close();  // dispara saída
//   // no template: style="transform: translate3d({$slide}%,0,0)"
//
// O valor exposto é sempre uma percentagem (100 = fora do ecrã à direita,
// 0 = posição final). Isto casa com o translate3d(100%,0,0) que já é usado
// em todas as telas full-screen do projeto.

const STIFFNESS = 260;
const DAMPING = 28;
const REST_DELTA = 0.15;
const REST_VELOCITY = 0.05;

export function createSlideTransition(opts = {}) {
  const { onSettleOpen = () => {}, onSettleClosed = () => {} } = opts;

  let value = 100;      // posição atual (%), 100 = escondida à direita
  let target = 100;      // alvo do spring
  let velocity = 0;      // %/s
  let rafId = null;
  let lastTime = 0;
  let subscribers = new Set();
  let pendingSettleDirection = null; // 'open' | 'closed' | null

  function notify() {
    subscribers.forEach((fn) => fn(value));
  }

  // API compatível com store Svelte ($slide no template)
  function subscribe(fn) {
    subscribers.add(fn);
    fn(value);
    return () => subscribers.delete(fn);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function startLoop() {
    if (rafId) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    const dx = target - value;
    const accel = STIFFNESS * dx - DAMPING * velocity;
    velocity += accel * dt;
    value += velocity * dt;
    notify();

    const settled = Math.abs(dx) < REST_DELTA && Math.abs(velocity) < REST_VELOCITY;
    if (settled) {
      value = target;
      velocity = 0;
      notify();
      rafId = null;
      if (pendingSettleDirection === 'open') onSettleOpen();
      else if (pendingSettleDirection === 'closed') onSettleClosed();
      pendingSettleDirection = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function open() {
    pendingSettleDirection = 'open';
    target = 0;
    startLoop();
  }

  function close() {
    pendingSettleDirection = 'closed';
    target = 100;
    startLoop();
  }

  // Para gestos de arrasto (swipe-to-close): o dedo controla `value`
  // diretamente, sem spring, até ao release.
  function setDragValue(percent) {
    stopLoop();
    velocity = 0;
    value = Math.max(0, Math.min(100, percent));
    notify();
  }

  function releaseDragTo(direction) {
    if (direction === 'open') open();
    else close();
  }

  function destroy() {
    stopLoop();
    subscribers.clear();
  }

  return { subscribe, open, close, setDragValue, releaseDragTo, destroy };
}

// Companheiro do slide: mesma técnica de spring aplicada ao "recuo" do
// ecrã de trás (o efeito .pushed-back do App.svelte). Mantido como spring
// separado porque tem stiffness/damping diferentes (mais suave, menos
// "elástico" que a tela que entra por cima).
const BACK_STIFFNESS = 220;
const BACK_DAMPING = 26;

export function createBackRecoilTransition() {
  let value = 0;       // 0 = posição normal, 1 = totalmente recuado
  let target = 0;
  let velocity = 0;
  let rafId = null;
  let lastTime = 0;
  let subscribers = new Set();

  function notify() {
    subscribers.forEach((fn) => fn(value));
  }
  function subscribe(fn) {
    subscribers.add(fn);
    fn(value);
    return () => subscribers.delete(fn);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function startLoop() {
    if (rafId) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }
  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    const dx = target - value;
    const accel = BACK_STIFFNESS * dx - BACK_DAMPING * velocity;
    velocity += accel * dt;
    value += velocity * dt;
    notify();
    const settled = Math.abs(dx) < 0.002 && Math.abs(velocity) < 0.002;
    if (settled) {
      value = target;
      velocity = 0;
      notify();
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }
  function recoil() { target = 1; startLoop(); }
  function reset() { target = 0; startLoop(); }
  function destroy() { stopLoop(); subscribers.clear(); }

  return { subscribe, recoil, reset, destroy };
}