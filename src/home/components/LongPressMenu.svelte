<!-- src/home/components/LongPressMenu.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  // ------------------------------------------------------------------
  // Menu contextual estilo Pinterest: aparece ao segurar um card por
  // ~400ms. O dedo continua no ecrã e pode ARRASTAR entre as opções
  // sem soltar — cada botão sob o dedo acende (muda de cor) para
  // indicar seleção em tempo real, e soltar sobre um botão dispara
  // essa ação. Soltar fora de qualquer botão cancela.
  //
  // Layout: 4 bolhas em leque à volta do ponto de origem do toque,
  // como no screenshot de referência (partilhar/fixar/pesquisar/whatsapp).
  // ------------------------------------------------------------------

  export let originX = 0;   // posição X (px, viewport) onde o dedo tocou
  export let originY = 0;   // posição Y (px, viewport) onde o dedo tocou

  const dispatch = createEventDispatcher();

  const OPTIONS = [
    { id: 'share',  icon: '/icons/svg/share.svg',    label: 'Partilhar',  angle: -125, dist: 92 },
    { id: 'pin',    icon: '/icons/svg/pin.svg',       label: 'Fixar',      angle: -175, dist: 78 },
    { id: 'search', icon: '/icons/svg/search.svg',    label: 'Pesquisar',  angle: -55,  dist: 92 },
    { id: 'whatsapp', icon: '/icons/svg/whatsapp.svg', label: 'WhatsApp', angle: -5,   dist: 78 },
  ];

  let activeId = null;
  let bubbleEls = {};

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function buzzSelect() {
    try { navigator.vibrate && navigator.vibrate(4); } catch (e) {}
  }

  function bubblePos(opt) {
    const rad = (opt.angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * opt.dist,
      y: Math.sin(rad) * opt.dist,
    };
  }

  // Chamado pelo pai a cada touchmove do gesto que já está em curso.
  // Recebe as coordenadas do dedo e decide qual bolha (se alguma) está
  // sob o ponto, atualizando `activeId` para o feedback de cor.
  export function updatePointer(clientX, clientY) {
    let hit = null;
    for (const opt of OPTIONS) {
      const el = bubbleEls[opt.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist <= r.width / 2 + 14) { // pequena margem de tolerância ao toque
        hit = opt.id;
        break;
      }
    }
    if (hit !== activeId) {
      activeId = hit;
      if (hit) buzzSelect();
    }
  }

  // Chamado pelo pai no touchend/pointerup do gesto.
  export function resolve() {
    if (activeId) {
      buzz();
      dispatch('select', { id: activeId });
    } else {
      dispatch('cancel');
    }
  }
</script>

<div class="menu-overlay" on:click={() => dispatch('cancel')}>
  <div class="menu-anchor" style="left:{originX}px; top:{originY}px;">
    <span class="origin-ring"></span>
    {#each OPTIONS as opt (opt.id)}
      {@const pos = bubblePos(opt)}
      <div
        class="bubble"
        class:active={activeId === opt.id}
        bind:this={bubbleEls[opt.id]}
        style="transform: translate({pos.x}px, {pos.y}px);"
      >
        <span class="bubble-icon" style="mask-image:url('{opt.icon}');-webkit-mask-image:url('{opt.icon}')"></span>
      </div>
    {/each}
  </div>
</div>

<style>
  .menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0,0,0,0.001); /* captura o click de cancelar sem escurecer — o card por trás já escurece sozinho via ::after no pai */
  }

  .menu-anchor {
    position: fixed;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .origin-ring {
    position: absolute;
    left: 0; top: 0;
    width: 56px;
    height: 56px;
    margin-left: -28px;
    margin-top: -28px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.5);
    animation: ringIn .28s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes ringIn {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }

  .bubble {
    position: absolute;
    left: 0; top: 0;
    width: 52px;
    height: 52px;
    margin-left: -26px;
    margin-top: -26px;
    border-radius: 50%;
    background: rgba(60,60,60,0.88);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: bubbleIn .3s cubic-bezier(0.34,1.56,0.64,1) backwards;
    transition: background .12s ease, transform .12s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bubble:nth-child(2) { animation-delay: .01s; }
  .bubble:nth-child(3) { animation-delay: .03s; }
  .bubble:nth-child(4) { animation-delay: .05s; }
  .bubble:nth-child(5) { animation-delay: .07s; }

  @keyframes bubbleIn {
    from { transform: translate(0,0) scale(0.3); opacity: 0; }
  }
  /* nota: a keyframe acima sobrepõe-se ao translate() do estilo inline
     apenas durante a entrada (animation-fill-mode backwards fixa o
     estado inicial); assim que a animação termina, o transform inline
     do template volta a ser a única fonte de posição. */

  .bubble.active {
    background: var(--accent-primary, #0A84FF);
    transform: scale(1.18);
  }

  .bubble-icon {
    width: 22px;
    height: 22px;
    background: #fff;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .bubble, .origin-ring { animation: none !important; }
  }
</style>