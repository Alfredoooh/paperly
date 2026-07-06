<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx;
  let raf;
  let dpr = 1;
  let W = 0, H = 0;

  // Configuração da pixelização
  const CELL_SIZE = 6;            // quanto menor, mais detalhes (pontos mais finos)
  const DOT_RADIUS = 1.8;        // raio de cada ponto
  const IMAGE_SRC = 'icons/png/logo_2.png';   // caminho da imagem

  let imgData = null;            // pixel data da imagem redimensionada
  let imgWidth = 0;
  let imgHeight = 0;
  let imageLoaded = false;

  // Carrega e redimensiona a imagem
  function loadAndResizeImage() {
    const img = new Image();
    img.src = IMAGE_SRC;
    img.onload = () => {
      // Redimensiona para ocupar 70% da menor dimensão da tela (ajustável)
      const maxSize = Math.min(W, H) * 0.7;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      imgWidth = Math.floor(img.width * scale);
      imgHeight = Math.floor(img.height * scale);

      // Canvas off‑screen para obter os pixels
      const offCanvas = document.createElement('canvas');
      offCanvas.width = imgWidth;
      offCanvas.height = imgHeight;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
      imgData = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;
      imageLoaded = true;
      draw();   // desenha imediatamente após carregar
    };
    img.onerror = () => console.error('Falha ao carregar', IMAGE_SRC);
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

    // Recarrega a imagem para se adaptar ao novo tamanho
    loadAndResizeImage();
  }

  function draw() {
    if (!ctx || !imageLoaded) return;
    ctx.clearRect(0, 0, W, H);

    // Centraliza a imagem pixelizada
    const offsetX = Math.floor((W - imgWidth) / 2);
    const offsetY = Math.floor((H - imgHeight) / 2);

    // Percorre a grade de pontos
    for (let y = 0; y < imgHeight; y += CELL_SIZE) {
      for (let x = 0; x < imgWidth; x += CELL_SIZE) {
        const idx = (Math.floor(y) * imgWidth + Math.floor(x)) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const a = imgData[idx + 3] / 255;

        // Só desenha se houver alguma opacidade (fundo transparente)
        if (a > 0.02) {
          ctx.beginPath();
          ctx.arc(offsetX + x, offsetY + y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.fill();
        }
      }
    }
  }

  // Animação (apenas redesenha se necessário, mas podemos deixar um loop leve)
  function step() {
    // Como a imagem é estática, só desenhamos uma vez, mas mantemos o loop para futuras animações
    draw();
    raf = requestAnimationFrame(step);
  }

  onMount(() => {
    resize();
    raf = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
  });

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
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
    pointer-events: none;   /* permite interagir com o que está por baixo */
    z-index: 15;            /* garante que fique sobre o texto (ajuste conforme necessário) */
  }
</style>