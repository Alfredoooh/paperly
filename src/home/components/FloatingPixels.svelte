<!-- src/routes/home/components/FloatingPixels.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx;
  let raf;
  let W = 0, H = 0;

  const LOGO_SRC = '/icons/png/logo_2.png';
  const CELL_SIZE = 6;
  const DOT_RADIUS = 1.6;
  const BASE_ALPHA = 0.16; // opacidade máxima de cada pixel, bem sutil

  let imageData = null;
  let imgWidth = 0;
  let imgHeight = 0;
  let imageLoaded = false;
  let sourceImg = null;

  let offsetX = 0;
  let offsetY = 0;
  let driftPhase = Math.random() * Math.PI * 2;

  function resizeImageFromSource() {
    if (!sourceImg) return;
    const maxSize = Math.min(W, H) * 0.7;
    const scale = Math.min(maxSize / sourceImg.width, maxSize / sourceImg.height, 1);
    imgWidth = Math.floor(sourceImg.width * scale);
    imgHeight = Math.floor(sourceImg.height * scale);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = imgWidth;
    offCanvas.height = imgHeight;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(sourceImg, 0, 0, imgWidth, imgHeight);
    imageData = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;
  }

  function loadImage() {
    const img = new Image();
    img.src = LOGO_SRC;
    img.onload = function () {
      sourceImg = img;
      resizeImageFromSource();
      imageLoaded = true;
    };
    img.onerror = function () {
      console.error('FloatingPixels: imagem não encontrada em ' + LOGO_SRC);
    };
  }

  function resize() {
    if (!canvasEl) return;
    W = canvasEl.clientWidth;
    H = canvasEl.clientHeight;
    canvasEl.width = W;
    canvasEl.height = H;
    ctx = canvasEl.getContext('2d');
    if (sourceImg) resizeImageFromSource();
  }

  function draw(t) {
    if (!ctx) { raf = requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);

    if (imageLoaded && imageData) {
      // leve flutuação, para não ficar estática — mantém sutileza do design
      const dx = Math.sin(t * 0.00015 + driftPhase) * 6;
      const dy = Math.cos(t * 0.00012 + driftPhase) * 5;
      offsetX = Math.floor((W - imgWidth) / 2 + dx);
      offsetY = Math.floor((H - imgHeight) / 2 + dy);

      for (let y = 0; y < imgHeight; y += CELL_SIZE) {
        for (let x = 0; x < imgWidth; x += CELL_SIZE) {
          const idx = (Math.floor(y) * imgWidth + Math.floor(x)) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = (imageData[idx + 3] / 255) * BASE_ALPHA;

          if (a > 0.005) {
            ctx.beginPath();
            ctx.arc(offsetX + x, offsetY + y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.fill();
          }
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  let resizeObs;

  onMount(() => {
    resize();
    loadImage();
    raf = requestAnimationFrame(draw);
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