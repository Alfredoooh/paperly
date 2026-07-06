<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx;
  let W = 0, H = 0;

  const CELL_SIZE = 5;               // mais pontos, efeito mais suave
  const DOT_RADIUS = 1.2;           // pontos mais pequenos
  const IMAGE_SRC = '/icons/png/logo_2.png'; // caminho absoluto

  let imgData = null;
  let imgWidth = 0;
  let imgHeight = 0;
  let imageLoaded = false;

  function loadAndDrawImage() {
    const img = new Image();
    img.src = IMAGE_SRC;
    img.onload = () => {
      // escala para 80% do menor lado da janela
      const maxSize = Math.min(W, H) * 0.8;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      imgWidth = Math.floor(img.width * scale);
      imgHeight = Math.floor(img.height * scale);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = imgWidth;
      offCanvas.height = imgHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
      imgData = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;
      imageLoaded = true;
      draw();
    };
    img.onerror = () => {
      console.error('Erro ao carregar ' + IMAGE_SRC);
      imageLoaded = false;
      draw(); // desenha fallback
    };
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (!imageLoaded) {
      // fallback: um pequeno quadrado cinza para confirmar que o canvas funciona
      const s = 40;
      ctx.fillStyle = 'rgba(180,180,180,0.6)';
      ctx.fillRect((W - s) / 2, (H - s) / 2, s, s);
      return;
    }

    const offsetX = Math.floor((W - imgWidth) / 2);
    const offsetY = Math.floor((H - imgHeight) / 2);

    for (let y = 0; y < imgHeight; y += CELL_SIZE) {
      for (let x = 0; x < imgWidth; x += CELL_SIZE) {
        const idx = (Math.floor(y) * imgWidth + Math.floor(x)) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3] / 255;

        if (a > 0.02) {
          ctx.beginPath();
          ctx.arc(offsetX + x, offsetY + y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.fill();
        }
      }
    }
  }

  function resize() {
    if (!canvasEl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvasEl.width = W * dpr;
    canvasEl.height = H * dpr;
    ctx = canvasEl.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    loadAndDrawImage();
  }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', resize);
  });
</script>

<canvas bind:this={canvasEl} class="pixel-logo-canvas"></canvas>

<style>
  .pixel-logo-canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
    z-index: 30;               /* fica acima de tudo (incluindo o input) */
  }
</style>