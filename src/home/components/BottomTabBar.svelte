<!-- src/home/components/BottomTabBar.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { TABS } from '../lib/constants.js';

  export let activeTab = 'create';
  export let onSelect = () => {};

  let bouncingId = null;
  let barEl;
  let trackWidth = 0;
  let slotWidth = 0;

  // ---- posição do indicador (em px, relativa ao início da track) ----
  let indicatorX = 0;      // posição atual renderizada
  let targetX = 0;         // posição alvo (spring converge para cá)
  let velocity = 0;        // px/s, usada pelo spring e pelo arrasto
  let rafId = null;
  let lastFrameTime = 0;

  // ---- estado do gesto ----
  let dragging = false;
  let dragStartX = 0;
  let dragOriginIndicatorX = 0;
  let pointerId = null;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(6); } catch (e) {}
  }

  $: activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  function indexToX(index) {
    return index * slotWidth;
  }
  function xToIndex(x) {
    const raw = x / slotWidth;
    return Math.min(TABS.length - 1, Math.max(0, Math.round(raw)));
  }
  function clampX(x) {
    const max = (TABS.length - 1) * slotWidth;
    return Math.min(max, Math.max(0, x));
  }

  function measure() {
    if (!barEl) return;
    trackWidth = barEl.clientWidth - 12; // 6px padding de cada lado
    slotWidth = trackWidth / TABS.length;
  }

  // ---- loop de física (spring crítico-amortecido, roda só quando precisa) ----
  const STIFFNESS = 320;
  const DAMPING = 30;

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function startLoop() {
    if (rafId) return;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30); // clamp p/ evitar saltos ao voltar de background
    lastFrameTime = now;

    if (dragging) {
      // durante o arrasto o indicador é 1:1 com o dedo; não usamos spring aqui
      rafId = requestAnimationFrame(tick);
      return;
    }

    const dx = targetX - indicatorX;
    const accel = STIFFNESS * dx - DAMPING * velocity;
    velocity += accel * dt;
    indicatorX += velocity * dt;

    const closeEnough = Math.abs(dx) < 0.15 && Math.abs(velocity) < 6;
    if (closeEnough) {
      indicatorX = targetX;
      velocity = 0;
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function settleTo(index, withSpring = true) {
    targetX = indexToX(index);
    if (withSpring) {
      startLoop();
    } else {
      indicatorX = targetX;
      velocity = 0;
    }
  }

  // ---- seleção via tap direto no botão ----
  function select(tab) {
    buzz();
    bouncingId = tab.id;
    const idx = TABS.findIndex((t) => t.id === tab.id);
    settleTo(idx);
    if (tab.id === activeTab) return;
    onSelect(tab.id);
  }

  function endBounce(id) {
    if (bouncingId === id) bouncingId = null;
  }

  // ---- gesto de arrasto (estilo iOS: dedo controla o pill em tempo real) ----
  function onPointerDown(e) {
    if (!slotWidth) measure();
    dragging = true;
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragOriginIndicatorX = indicatorX;
    velocity = 0;
    barEl.setPointerCapture?.(pointerId);
    startLoop();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const deltaX = e.clientX - dragStartX;
    const raw = dragOriginIndicatorX + deltaX;

    // resistência elástica leve nos extremos (rubber-band), como iOS
    const max = (TABS.length - 1) * slotWidth;
    let next;
    if (raw < 0) {
      next = raw * 0.35;
    } else if (raw > max) {
      next = max + (raw - max) * 0.35;
    } else {
      next = raw;
    }

    const prevX = indicatorX;
    indicatorX = next;
    velocity = (next - prevX) / (1 / 60); // estimativa simples de velocidade p/ o release

    const hoverIndex = xToIndex(clampX(next));
    if (TABS[hoverIndex] && TABS[hoverIndex].id !== bouncingId) {
      bouncingId = TABS[hoverIndex].id;
    }
  }

  function onPointerUp(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    barEl.releasePointerCapture?.(pointerId);

    const finalIndex = xToIndex(clampX(indicatorX));
    const tab = TABS[finalIndex];
    settleTo(finalIndex);

    if (tab && tab.id !== activeTab) {
      buzz();
      onSelect(tab.id);
    }
    pointerId = null;
  }

  function onPointerCancel(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    barEl.releasePointerCapture?.(pointerId);
    settleTo(activeIndex);
    pointerId = null;
  }

  // ---- reage a mudanças externas de activeTab (ex: navegação programática) ----
  let lastKnownActive = activeTab;
  $: if (activeTab !== lastKnownActive) {
    lastKnownActive = activeTab;
    if (!dragging) settleTo(activeIndex);
  }

  function onResize() {
    measure();
    settleTo(activeIndex, false);
  }

  onMount(() => {
    measure();
    settleTo(activeIndex, false);
    window.addEventListener('resize', onResize);
  });
  onDestroy(() => {
    stopLoop();
    window.removeEventListener('resize', onResize);
  });
</script>

<nav
  class="tab-bar"
  bind:this={barEl}
  style="--count:{TABS.length}"
  on:pointerdown={onPointerDown}
  on:pointermove={onPointerMove}
  on:pointerup={onPointerUp}
  on:pointercancel={onPointerCancel}
>
  <div
    class="tab-indicator"
    class:dragging
    style="width:{slotWidth}px; transform: translate3d({indicatorX}px, 0, 0);"
  ></div>

  {#each TABS as tab, i}
    <button
      class="tab-btn"
      class:active={activeTab === tab.id}
      class:bounce={bouncingId === tab.id}
      on:click={() => select(tab)}
      on:animationend={() => endBounce(tab.id)}
      aria-label={tab.label}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span class="tab-icon">
        <span
          class="icon-mask icon-outline"
          style="mask-image:url('{tab.icon}');-webkit-mask-image:url('{tab.icon}')"
        ></span>
        <span
          class="icon-mask icon-filled"
          style="mask-image:url('{tab.iconFilled}');-webkit-mask-image:url('{tab.iconFilled}')"
        ></span>
      </span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 20;
    display: flex;
    align-items: stretch;
    justify-content: space-around;

    /* SÓLIDO: sem transparência, sem blur. Cor opaca real, não RGBA. */
    background: var(--surface-elevated, #17181c);
    background-clip: padding-box;

    /* Separação do conteúdo por sombra, não por blur/transparência. */
    box-shadow:
      0 -1px 0 0 var(--border-soft),
      0 -8px 24px -12px rgba(0, 0, 0, 0.35);

    border-top: none;
    padding: 8px 6px calc(env(safe-area-inset-bottom, 0px) + 8px);
    contain: layout paint style;
    touch-action: pan-y;

    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* Camada extra opaca atrás da nav, cobrindo qualquer área de
     overscroll/rubber-band do WebView para nunca revelar o conteúdo
     por trás da barra (comum em Android quando o usuário arrasta
     a página além do limite). */
  .tab-bar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -40px;
    height: 40px;
    background: var(--surface-elevated, #17181c);
    z-index: -1;
  }

  .tab-indicator {
    position: absolute;
    top: 6px;
    left: 6px;
    height: calc(100% - 14px - env(safe-area-inset-bottom, 0px));
    border-radius: 999px;
    background: var(--row-active);
    background-image: linear-gradient(
      180deg,
      color-mix(in srgb, var(--row-active) 100%, white 6%) 0%,
      var(--row-active) 100%
    );
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    pointer-events: none;
    will-change: transform;
  }
  /* sem transition aqui de propósito: a posição é 100% controlada pelo
     loop de rAF (spring), então CSS transition entraria em conflito e
     causaria o "engasgo" que gera sensação de travamento. */

  .tab-indicator.dragging {
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .tab-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 50px;
    border: none;
    background: transparent;
    color: var(--icon-faint);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
    -webkit-user-select: none;
    user-select: none;
  }

  .tab-btn.bounce {
    animation: tabBounce .46s cubic-bezier(0.22, 1.42, 0.36, 1);
  }
  @keyframes tabBounce {
    0%   { transform: scale(1); }
    28%  { transform: scale(0.80); }
    52%  { transform: scale(1.14); }
    72%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }

  .tab-btn.active { color: var(--icon-strong); }

  .tab-icon {
    position: relative;
    width: 19px;
    height: 19px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-mask {
    position: absolute;
    inset: 0;
    display: block;
    background: currentColor;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: opacity .26s cubic-bezier(0.22, 1.42, 0.36, 1), transform .38s cubic-bezier(0.22, 1.42, 0.36, 1);
  }

  .icon-outline {
    opacity: 1;
    transform: scale(1);
  }
  .icon-filled {
    opacity: 0;
    transform: scale(0.6);
  }
  .tab-btn.active .icon-outline {
    opacity: 0;
    transform: scale(1.25);
  }
  .tab-btn.active .icon-filled {
    opacity: 1;
    transform: scale(1);
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.1px;
    opacity: 0.7;
    transition: opacity .22s ease, font-weight .22s ease;
  }
  .tab-btn.active .tab-label {
    opacity: 1;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-mask, .tab-label { transition: none !important; }
    .tab-btn.bounce { animation: none !important; }
    .tab-indicator { transition: none !important; }
  }
</style>