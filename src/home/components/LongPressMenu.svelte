<!-- src/home/components/LongPressMenu.svelte -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { portal } from '../lib/portal.js';

  // ------------------------------------------------------------------
  // Menu contextual estilo Pinterest: aparece ao segurar um card por
  // ~400ms. O dedo continua no ecrã e pode ARRASTAR entre as opções
  // sem soltar — cada botão sob o dedo acende E CRESCE para indicar
  // seleção em tempo real, e soltar sobre um botão dispara essa ação.
  //
  // Escurecimento: TODO o ecrã escurece um pouco — incluindo appbar e
  // bottombar — EXCETO o card que foi pressionado, que continua
  // exatamente tão claro quanto estava (implementado com um "buraco"
  // recortado via box-shadow gigante sobre um retângulo posicionado
  // exatamente sobre o cardRect). A opacidade é propositadamente leve
  // ("um pouquinho transparente escuro", não um véu opaco) — ver
  // VEIL_OPACITY.
  //
  // PORTAL: este componente inteiro é montado via use:portal direto em
  // document.body. Isto é OBRIGATÓRIO e não é opcional — sem isto, o
  // overlay nasce dentro de TemplatesTab -> .scroll-root -> .root do
  // App.svelte, e .root tem will-change:transform + contain:layout
  // style paint, o que cria um stacking context isolado. Dentro desse
  // stacking context, nenhum z-index interno (nem 200, nem 999999)
  // consegue competir com a BottomTabBar, que é irmã de .root no DOM e
  // vem depois dele — quem vem depois como irmão do stacking context
  // pinta por cima de tudo que está preso lá dentro, sempre, não
  // importa o número. Com o portal, este overlay passa a ser filho
  // direto de <body>, no mesmo nível de tudo o resto, e aí sim o
  // z-index:200 funciona como esperado contra bottombar(20), appbar
  // fixed(15), SearchPage/TemplatePreviewPage(30) e AIChatModal(90/91).
  //
  // Bloqueio de scroll: enquanto este menu está montado, ninguém
  // consegue rolar nada por baixo dele — nem o grid de templates, nem
  // a página em geral — via overflow:hidden + touch-action:none no
  // <body>, repostos ao desmontar.
  //
  // Posicionamento adaptativo: os 4 botões nascem em leque à volta do
  // ponto de toque, com o leque inteiro deslocado como bloco rígido
  // (nunca bolha a bolha) para caber na viewport perto de bordas.
  // ------------------------------------------------------------------

  export let originX = 0;
  export let originY = 0;
  export let cardRect = null; // DOMRect (já expandido pela escala do pressed) do card, ou null

  const dispatch = createEventDispatcher();

  const OPTION_DEFS = [
    { id: 'share',    icon: '/icons/svg/regular/share.svg',    label: 'Partilhar' },
    { id: 'pin',       icon: '/icons/svg/regular/pin.svg',       label: 'Fixar' },
    { id: 'search',    icon: '/icons/svg/regular/search.svg',    label: 'Pesquisar' },
    { id: 'whatsapp',  icon: '/icons/svg/regular/chat_multiple.svg',  label: 'WhatsApp' },
  ];

  const BUBBLE_DIST = 118;  // px do centro do leque até cada bolha
  const BUBBLE_SIZE = 50;
  const SPREAD_DEG = 140;   // graus totais do leque
  const MARGIN = 34;        // margem mínima de segurança até a borda da viewport
  const VEIL_OPACITY = 0.32; // "um pouquinho" escuro

  let activeId = null;
  let bubbleEls = {};
  let options = [];

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function buzzSelect() {
    try { navigator.vibrate && navigator.vibrate(4); } catch (e) {}
  }

  function computeFan() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceRight = vw - originX;
    const spaceLeft = originX;
    const spaceBelow = vh - originY;
    const spaceAbove = originY;

    const preferRight = spaceRight >= spaceLeft;
    const preferBelow = spaceBelow >= spaceAbove;

    let centerAngle;
    if (preferRight && preferBelow) centerAngle = -45;
    else if (!preferRight && preferBelow) centerAngle = -135;
    else if (preferRight && !preferBelow) centerAngle = 45;
    else centerAngle = 135;

    const step = SPREAD_DEG / (OPTION_DEFS.length - 1);
    const startAngle = centerAngle - SPREAD_DEG / 2;
    const half = BUBBLE_SIZE / 2;

    const raw = OPTION_DEFS.map((opt, i) => {
      const angle = startAngle + step * i;
      const rad = (angle * Math.PI) / 180;
      return {
        ...opt,
        x: Math.cos(rad) * BUBBLE_DIST,
        y: -Math.sin(rad) * BUBBLE_DIST,
      };
    });

    let shiftX = 0;
    let shiftY = 0;
    for (const opt of raw) {
      const absX = originX + opt.x;
      const absY = originY + opt.y;

      const minX = MARGIN + half;
      const maxX = vw - MARGIN - half;
      const minY = MARGIN + half;
      const maxY = vh - MARGIN - half;

      if (absX < minX) shiftX = Math.max(shiftX, minX - absX);
      if (absX > maxX) shiftX = Math.min(shiftX, maxX - absX);
      if (absY < minY) shiftY = Math.max(shiftY, minY - absY);
      if (absY > maxY) shiftY = Math.min(shiftY, maxY - absY);
    }

    return raw.map((opt) => ({
      ...opt,
      x: opt.x + shiftX,
      y: opt.y + shiftY,
    }));
  }

  let prevBodyOverflow = '';
  let prevBodyTouchAction = '';

  onMount(() => {
    options = computeFan();

    prevBodyOverflow = document.body.style.overflow;
    prevBodyTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  });

  onDestroy(() => {
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.touchAction = prevBodyTouchAction;
  });

  export function updatePointer(clientX, clientY) {
    let hit = null;
    for (const opt of options) {
      const el = bubbleEls[opt.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist <= r.width / 2 + 14) {
        hit = opt.id;
        break;
      }
    }
    if (hit !== activeId) {
      activeId = hit;
      if (hit) buzzSelect();
    }
  }

  export function resolve() {
    if (activeId) {
      buzz();
      dispatch('select', { id: activeId });
    } else {
      dispatch('cancel');
    }
  }
</script>

<div class="menu-overlay" use:portal on:click={() => dispatch('cancel')}>
  {#if cardRect}
    <!-- "Buraco" no escurecimento: um retângulo exatamente sobre o
         card (já expandido pela escala visual do .pressed, ver
         TemplatesTab.svelte), com box-shadow gigante ao redor que
         pinta tudo o resto de escuro (agora incluindo appbar/bottombar
         de verdade, graças ao portal acima) — o card em si fica sem
         nenhuma camada por cima, como se estivesse a flutuar por cima
         da tela escurecida. -->
    <div
      class="dark-veil-hole"
      style="
        left:{cardRect.left}px;
        top:{cardRect.top}px;
        width:{cardRect.width}px;
        height:{cardRect.height}px;
        border-radius:20px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,{VEIL_OPACITY});
      "
    ></div>
  {:else}
    <div class="dark-veil-full" style="background: rgba(0,0,0,{VEIL_OPACITY});"></div>
  {/if}

  <div class="menu-anchor" style="left:{originX}px; top:{originY}px;">
    <span class="origin-ring"></span>
    {#each options as opt (opt.id)}
      <div
        class="bubble"
        class:active={activeId === opt.id}
        bind:this={bubbleEls[opt.id]}
        style="transform: translate({opt.x}px, {opt.y}px);"
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
    /* Agora que o portal move este nó para document.body, este
       z-index compete no stacking context raiz de verdade, contra
       bottombar(20), appbar fixed(15), SearchPage/TemplatePreviewPage
       (30) e AIChatModal(90/91) — 200 já é suficiente e continua
       sendo. */
    z-index: 200;
  }

  .dark-veil-hole {
    position: fixed;
    pointer-events: none;
    animation: veilIn .22s cubic-bezier(0.16,1,0.3,1);
  }
  .dark-veil-full {
    position: fixed;
    inset: 0;
    pointer-events: none;
    animation: veilIn .22s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes veilIn {
    from { opacity: 0; }
    to { opacity: 1; }
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
    width: 50px;
    height: 50px;
    margin-left: -25px;
    margin-top: -25px;
    border-radius: 50%;
    background: rgba(60,60,60,0.92);
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

  .bubble.active {
    background: var(--accent-primary, #0A84FF);
    transform: scale(1.32);
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
    .bubble, .origin-ring, .dark-veil-hole, .dark-veil-full { animation: none !important; }
  }
</style>