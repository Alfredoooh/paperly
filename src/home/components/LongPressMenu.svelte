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
  // AUTONOMIA DE FECHO (correção crítica): este componente agora
  // escuta pointerup/touchend/mouseup GLOBALMENTE em `window`, assim
  // que monta — e não depende em nada de o TemplatesTab.svelte lhe
  // "avisar" que o dedo soltou. Isto é obrigatório por causa do
  // portal (ver portal.js): assim que este overlay é movido para
  // document.body com position:fixed;inset:0, ele passa a ser o
  // elemento que recebe o hit-test do rato/toque nessa área do ecrã —
  // mesmo que o card pressionado tenha z-index visual mais alto e
  // continue visível por cima. Isto significa que quando o utilizador
  // solta o dedo, o evento touchend/mouseup dispara sobre ESTE overlay
  // (ou um filho dele), nunca sobre o card original — se o fecho do
  // menu dependesse de um listener no card (como dependia antes), o
  // menu simplesmente nunca fechava, porque esse listener nunca era
  // atingido. Ao escutar em `window`, este componente recebe o sinal
  // de "soltou" independentemente de qual elemento está fisicamente
  // por baixo do cursor nesse instante — window está acima de tudo na
  // árvore, todo evento sobe até lá por bubbling (touchend/mouseup
  // fazem bubbling normalmente; não usamos capture).
  //
  // Escurecimento: TODO o ecrã escurece um pouco — incluindo appbar e
  // bottombar — SEM buraco recortado. O card pressionado (.pressed no
  // TemplatesTab.svelte) fica visível porque tem z-index MAIOR que
  // este overlay — cresce (scale) e flutua por cima do véu escuro
  // inteiro.
  //
  // PORTAL: este componente inteiro é montado via use:portal direto em
  // document.body — ver portal.js para o porquê (stacking context
  // preso em .root no App.svelte).
  //
  // Bloqueio de scroll: enquanto este menu está montado, ninguém
  // consegue rolar nada por baixo dele — via overflow:hidden +
  // touch-action:none no <body>, repostos ao desmontar.
  // ------------------------------------------------------------------

  export let originX = 0;
  export let originY = 0;

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

  // Guarda para nunca resolver duas vezes (ex: touchend E mouseup
  // sintético a disparar quase ao mesmo tempo no mesmo gesto — comum
  // em alguns browsers/webviews). Sem isto, o segundo disparo tentaria
  // dispatch('select'/'cancel') outra vez sobre um componente que já
  // devia estar a desmontar, o que é exatamente o tipo de coisa que dá
  // "aparece duas vezes" do lado do TemplatesTab (dois eventos
  // select/cancel a chegar, cada um a tentar reabrir/refechar o {#if}).
  let resolved = false;

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

  function hitTestBubble(clientX, clientY) {
    for (const opt of options) {
      const el = bubbleEls[opt.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist <= r.width / 2 + 14) return opt.id;
    }
    return null;
  }

  function handlePointerMoveGlobal(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    const hit = hitTestBubble(t.clientX, t.clientY);
    if (hit !== activeId) {
      activeId = hit;
      if (hit) buzzSelect();
    }
  }

  // Único ponto de fecho do menu, disparado pelos listeners globais
  // abaixo. Idempotente (guarda `resolved`) para nunca disparar
  // select/cancel mais que uma vez para o mesmo gesto.
  function resolveOnce() {
    if (resolved) return;
    resolved = true;
    if (activeId) {
      buzz();
      dispatch('select', { id: activeId });
    } else {
      dispatch('cancel');
    }
  }

  function handlePointerUpGlobal() {
    resolveOnce();
  }

  let prevBodyOverflow = '';
  let prevBodyTouchAction = '';

  onMount(() => {
    options = computeFan();

    prevBodyOverflow = document.body.style.overflow;
    prevBodyTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Listeners GLOBAIS em window — não em document, não em nenhum nó
    // local — para garantir que o fecho do menu nunca depende de qual
    // elemento está fisicamente por baixo do dedo/rato no instante do
    // release. passive:true onde não fazemos preventDefault (up/move
    // aqui só leem coordenadas, não bloqueiam scroll — o bloqueio de
    // scroll já está garantido pelo overflow:hidden/touch-action:none
    // do body acima).
    window.addEventListener('touchmove', handlePointerMoveGlobal, { passive: true });
    window.addEventListener('mousemove', handlePointerMoveGlobal, { passive: true });
    window.addEventListener('touchend', handlePointerUpGlobal, { passive: true });
    window.addEventListener('touchcancel', handlePointerUpGlobal, { passive: true });
    window.addEventListener('mouseup', handlePointerUpGlobal, { passive: true });
  });

  onDestroy(() => {
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.touchAction = prevBodyTouchAction;
    window.removeEventListener('touchmove', handlePointerMoveGlobal);
    window.removeEventListener('mousemove', handlePointerMoveGlobal);
    window.removeEventListener('touchend', handlePointerUpGlobal);
    window.removeEventListener('touchcancel', handlePointerUpGlobal);
    window.removeEventListener('mouseup', handlePointerUpGlobal);
  });
</script>

<div class="menu-overlay" use:portal on:click={() => resolveOnce()}>
  <div class="dark-veil-full" style="background: rgba(0,0,0,{VEIL_OPACITY});"></div>

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
    z-index: 200;
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
    .bubble, .origin-ring, .dark-veil-full { animation: none !important; }
  }
</style>