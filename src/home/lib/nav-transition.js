// src/home/lib/nav-transition.js

const STIFFNESS = 260;
const DAMPING = 28;
const REST_DELTA = 0.05;
const REST_VELOCITY = 0.02;

export function createSlideTransition(opts = {}) {
  const { onSettleOpen = () => {}, onSettleClosed = () => {} } = opts;

  let value = 100;
  let target = 100;
  let velocity = 0;
  let rafId = null;
  let lastTime = 0;
  let subscribers = new Set();
  let pendingSettleDirection = null;

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

const BACK_STIFFNESS = 220;
const BACK_DAMPING = 26;

export function createBackRecoilTransition() {
  let value = 0;
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
  function setDragValue(v) {
    stopLoop();
    velocity = 0;
    value = Math.max(-1, Math.min(1, v));
    notify();
  }
  function releaseDragTo() { reset(); }
  function destroy() { stopLoop(); subscribers.clear(); }

  return { subscribe, recoil, reset, setDragValue, releaseDragTo, destroy };
}