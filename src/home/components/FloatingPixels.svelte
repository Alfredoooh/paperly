<!-- src/routes/home/components/FloatingPixels.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx;
  let raf;
  let dpr = 1;
  let W = 0, H = 0;
  let particles = [];
  let resizeObs;

  const COLORS = [
    'rgba(120,170,255,',
    'rgba(255,140,170,',
    'rgba(150,230,180,',
    'rgba(255,200,120,',
    'rgba(200,160,255,',
  ];

  const PIXEL_R = 1.4;
  const PIXEL_GAP = 5.5;
  const BASE_ALPHA = 0.16;

  function squareTemplate() {
    const pts = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) pts.push([x, y]);
    return pts;
  }
  function triangleTemplate() {
    const pts = [];
    const rows = 4;
    for (let y = 0; y < rows; y++) {
      const count = y + 1;
      const offset = (rows - 1 - y) / 2;
      for (let x = 0; x < count; x++) pts.push([offset + x, y]);
    }
    return pts;
  }
  function crossTemplate() {
    const pts = [];
    for (let i = 0; i < 5; i++) { pts.push([2, i]); pts.push([i, 2]); }
    return pts;
  }
  function diamondTemplate() {
    const pts = [];
    const rows = [1, 3, 5, 3, 1];
    rows.forEach((count, y) => {
      const offset = (5 - count) / 2;
      for (let x = 0; x < count; x++) pts.push([offset + x, y]);
    });
    return pts;
  }

  const TEMPLATES = [squareTemplate, triangleTemplate, crossTemplate, diamondTemplate];

  function makeShape(seedX, seedY) {
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const scale = 0.7 + Math.random() * 0.6;
    return {
      x: seedX,
      y: seedY,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.0006 + Math.random() * 0.0006,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.0004,
      scale,
      color,
      alpha: BASE_ALPHA * (0.6 + Math.random() * 0.5),
      pixels: template,
    };
  }

  function initParticles() {
    particles = [];
    const area = W * H;
    const count = Math.max(6, Math.min(16, Math.round(area / 90000)));
    for (let i = 0; i < count; i++) {
      particles.push(makeShape(Math.random() * W, Math.random() * H));
    }
  }

  function resize() {
    if (!canvasEl) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvasEl.clientWidth;
    H = canvasEl.clientHeight;
    canvasEl.width = W * dpr;
    canvasEl.height = H * dpr;
    ctx = canvasEl.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function drawShape(s, t) {
    const drift = Math.sin(s.driftPhase + t * s.driftSpeed) * 10;
    const driftY = Math.cos(s.driftPhase + t * s.driftSpeed * 0.8) * 8;
    const cos = Math.cos(s.rotation);
    const sin = Math.sin(s.rotation);

    for (const [px, py] of s.pixels) {
      const lx = (px - 1.5) * PIXEL_GAP * s.scale;
      const ly = (py - 1.5) * PIXEL_GAP * s.scale;
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;
      const finalX = s.x + rx + drift;
      const finalY = s.y + ry + driftY;

      ctx.beginPath();
      ctx.arc(finalX, finalY, PIXEL_R * s.scale, 0, Math.PI * 2);
      ctx.fillStyle = s.color + s.alpha + ')';
      ctx.fill();
    }
  }

  function step(t) {
    if (!ctx) { raf = requestAnimationFrame(step); return; }
    ctx.clearRect(0, 0, W, H);

    for (const s of particles) {
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.rotationSpeed;

      if (s.x < -20) s.x = W + 20;
      if (s.x > W + 20) s.x = -20;
      if (s.y < -20) s.y = H + 20;
      if (s.y > H + 20) s.y = -20;

      drawShape(s, t);
    }
    raf = requestAnimationFrame(step);
  }

  onMount(() => {
    resize();
    raf = requestAnimationFrame(step);
    resizeObs = new ResizeObserver(() => resize());
    if (canvasEl?.parentElement) resizeObs.observe(canvasEl.parentElement);
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
    resizeObs?.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', resize);
  });
</script>

<canvas bind:this={canvasEl} class="floating-pixels-canvas"></canvas>

<style>
  .floating-pixels-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }
</style>