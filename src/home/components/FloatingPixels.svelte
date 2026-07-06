<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx;

  const CELL_SIZE = 6;
  const DOT_RADIUS = 1.8;
  const IMAGE_SRC = '/icons/png/logo_2.png'; // caminho absoluto da imagem

  let imageData = null;
  let imgWidth = 0;
  let imgHeight = 0;
  let imageLoaded = false;

  function loadImage() {
    const img = new Image();
    img.src = IMAGE_SRC;
    img.onload = () => {
      resizeImage(img);
      imageLoaded = true;
      redraw();
    };
    img.onerror = () => {
      console.error('Imagem não encontrada: ' + IMAGE_SRC);
    };
  }

  function resizeImage(img) {
    // 90% da menor dimensão da janela (altura ou largura)
    const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.9;
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
    imgWidth = Math.floor(img.width * scale);
    imgHeight = Math.floor(img.height * scale);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = imgWidth;
    offCanvas.height = imgHeight;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
    imageData = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;
  }

  function redraw() {
    if (!canvasEl || !ctx) return;
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (!imageLoaded) return;

    const offsetX = Math.floor((canvasEl.width - imgWidth) / 2);
    const offsetY = Math.floor((canvasEl.height - imgHeight) / 2);

    for (let y = 0; y < imgHeight; y += CELL_SIZE) {
      for (let x = 0; x < imgWidth; x += CELL_SIZE) {
        const idx = (Math.floor(y) * imgWidth + Math.floor(x)) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        const a = imageData[idx + 3] / 255;

        if (a > 0.02) {
          ctx.beginPath();
          ctx.arc(offsetX + x, offsetY + y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.fill();
        }
      }
    }
  }

  function handleResize() {
    if (imageLoaded) {
      const img = new Image();
      img.src = IMAGE_SRC;
      img.onload = () => {
        resizeImage(img);
        redraw();
      };
    }
  }

  onMount(() => {
    loadImage();
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
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
    z-index: 30; /* garante que fica sobre o texto e os outros elementos */
  }
</style>