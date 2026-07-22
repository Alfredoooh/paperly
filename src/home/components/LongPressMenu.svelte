<!-- src/home/components/LongPressMenu.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';

  // ------------------------------------------------------------------
  // Menu contextual estilo Pinterest: aparece ao segurar um card por
  // ~400ms. O dedo continua no ecrã e pode ARRASTAR entre as opções
  // sem soltar — cada botão sob o dedo acende E CRESCE para indicar
  // seleção em tempo real, e soltar sobre um botão dispara essa ação.
  //
  // Escurecimento: todo o fundo escurece um pouco, EXCETO o card que
  // foi pressionado, que continua exatamente tão claro quanto estava
  // (implementado com um "buraco" recortado via box-shadow gigante
  // sobre um retângulo posicionado exatamente sobre o cardRect).
  //
  // Posicionamento adaptativo: os 4 botões nascem em leque à volta do
  // ponto de toque, mas o leque é recalculado com base em QUANTO
  // ESPAÇO existe entre o toque e cada borda da viewport — perto da
  // borda direita o leque abre para a esquerda, perto do topo abre
  // para baixo, etc. Isto evita bolhas cortadas/invisíveis fora da tela.
  // ------------------------------------------------------------------

  export let originX = 0;
  export let originY = 0;
  export let cardRect = null; // DOMRect do card pressionado (ou null)

  const dispatch = createEventDispatcher();

  const OPTION_DEFS = [
    { id: 'share',    icon: '/icons/svg/regular/share.svg',    label: 'Partilhar' },
    { id: 'pin',       icon: '/icons/svg/regular/pin.svg',       label: 'Fixar' },
    { id: 'search',    icon: '/icons/svg/regular/search.svg',    label: 'Pesquisar' },
    { id: 'whatsapp',  icon: '/icons/svg/regular/whatsapp.svg',  label: 'WhatsApp' },
  ];

  const BUBBLE_DIST = 92;   // px do centro do leque até cada bolha
  const BUBBLE_SIZE = 52;
  const MARGIN = 34;        // margem mínima de segurança até a borda da viewport

  let activeId = null;
  let bubbleEls = {};
  let options = [];

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }
  function buzzSelect() {
    try { navigator.vibrate && navigator.vibrate(4); } catch (e) {}
  }

  // Calcula o leque de 4 bolhas centrado no ponto de toque, escolhendo
  // o arco (para cima/baixo, esquerda/direita) que tem mais espaço
  // livre na viewport, e depois clampando cada bolha individualmente
  // para nunca ultrapassar a margem de segurança.
  function computeFan() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceRight = vw - originX;
    const spaceLeft = originX;
    const spaceBelow = vh - originY;
    const spaceAbove = originY;

    // ângulo central do leque: aponta para o quadrante com MAIS espaço
    const preferRight = spaceRight >= spaceLeft;
    const preferBelow = spaceBelow >= spaceAbove;

    // leque de 160° de abertura, centrado na diagonal com mais espaço
    let centerAngle;
    if (preferRight && preferBelow) centerAngle = -45;      // abre para baixo-direita... mas em canvas Y cresce p/ baixo, então usamos ângulos "matemáticos" abaixo
    else if (!preferRight && preferBelow) centerAngle = -135;
    else if (preferRight && !preferBelow) centerAngle = 45;
    else centerAngle = 135;

    // nota: como o eixo Y da tela cresce para baixo, um ângulo positivo
    // aqui corresponde visualmente a "para cima" na trigonometria normal
    // — por isso invertemos o seno ao converter para px mais abaixo.
    const spread = 150; // graus totais do leque
    const step = spread / (OPTION_DEFS.length - 1);
    const startAngle = centerAngle - spread / 2;

    return OPTION_DEFS.map((opt, i) => {
      const angle = startAngle + step * i;
      const rad = (angle * Math.PI) / 180;
      let x = Math.cos(rad) * BUBBLE_DIST;
      let y = -Math.sin(rad) * BUBBLE_DIST; // inverte para o eixo Y da tela

      // clamp final: garante que o CENTRO de cada bolha nunca fica a
      // menos de MARGIN+raio da borda da viewport, ajustando originX/Y
      // como referência absoluta.
      const absX = originX + x;
      const absY = originY + y;
      const half = BUBBLE_SIZE / 2;

      const clampedAbsX = Math.min(vw - MARGIN - half, Math.max(MARGIN + half, absX));
      const clampedAbsY = Math.min(vh - MARGIN - half, Math.max(MARGIN + half, absY));

      return {
        ...opt,
        x: clampedAbsX - originX,
        y: clampedAbsY - originY,
      };
    });
  }

  onMount(() => {
    options = computeFan();
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

<div class="menu-overlay" on:click={() => dispatch('cancel')}>
  {#if cardRect}
    <!-- "Buraco" no escurecimento: um retângulo exatamente sobre o
         card, com box-shadow gigante ao redor que pinta tudo o resto
         de escuro — o card em si fica sem nenhuma camada por cima. -->
    <div
      class="dark-veil-hole"
      style="
        left:{cardRect.left}px;
        top:{cardRect.top}px;
        width:{cardRect.width}px;
        height:{cardRect.height}px;
        border-radius:20px;
      "
    ></div>
  {:else}
    <div class="dark-veil-full"></div>
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
    z-index: 50;
  }

  /* Escurece tudo, exceto o card (via box-shadow gigante ao redor de um
     buraco transparente do tamanho exato do card). */
  .dark-veil-hole {
    position: fixed;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
    pointer-events: none;
    animation: veilIn .22s cubic-bezier(0.16,1,0.3,1);
  }
  .dark-veil-full {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
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
    width: 52px;
    height: 52px;
    margin-left: -26px;
    margin-top: -26px;
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