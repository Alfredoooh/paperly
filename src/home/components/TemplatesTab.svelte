<!-- src/home/components/TemplatesTab.svelte -->
<script>
  import { onMount, tick } from 'svelte';
  import { IMAGE_MODELS, DOC_MODELS } from '../lib/constants.js';

  export let view = 'images'; // 'images' | 'documents' — controlado pelo toggle do appbar
  export let onUsePrompt = () => {};

  let previewImg = null;
  let previewDoc = null;
  let loading = true;

  function splitColumns(items) {
    const left = [], right = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item); else right.push(item);
    });
    return [left, right];
  }
  $: imageColumns = splitColumns(IMAGE_MODELS);

  // ------------------------------------------------------------------
  // Container transform (estilo Google Photos): o card clicado é
  // capturado na sua posição/tamanho exatos via getBoundingClientRect()
  // e o preview nasce EXATAMENTE ali, depois anima até um retângulo
  // centrado com margens e cantos arredondados. Sem blur em nenhuma
  // fase — só transform + border-radius a interpolar via FLIP.
  // ------------------------------------------------------------------
  let previewKind = null; // 'image' | 'doc'
  let originRect = null;  // {top,left,width,height} do card de origem
  let originRadius = 20;  // border-radius do card de origem (px)
  let transformPhase = 'idle'; // 'idle' | 'opening' | 'open' | 'closing'
  let previewEl;

  function captureOrigin(cardEl) {
    const r = cardEl.getBoundingClientRect();
    const cs = getComputedStyle(cardEl);
    return {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      radius: parseFloat(cs.borderRadius) || 20,
    };
  }

  async function openImgPreview(img, e) {
    const cardEl = e.currentTarget;
    originRect = captureOrigin(cardEl);
    previewImg = img;
    previewKind = 'image';
    await runOpenTransform();
  }
  async function openDocPreview(doc, e) {
    const cardEl = e.currentTarget;
    originRect = captureOrigin(cardEl);
    previewDoc = doc;
    previewKind = 'doc';
    await runOpenTransform();
  }

  async function runOpenTransform() {
    transformPhase = 'opening';
    await tick();
    // primeiro frame: coloca o preview EXATAMENTE onde o card estava
    // (sem transição), depois no frame seguinte liberta para o estado
    // final — isto é o FLIP (First-Last-Invert-Play).
    applyOriginFrame();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        transformPhase = 'open';
      });
    });
  }

  function applyOriginFrame() {
    if (!previewEl || !originRect) return;
    previewEl.style.transition = 'none';
    previewEl.style.top = originRect.top + 'px';
    previewEl.style.left = originRect.left + 'px';
    previewEl.style.width = originRect.width + 'px';
    previewEl.style.height = originRect.height + 'px';
    previewEl.style.borderRadius = originRect.radius + 'px';
    // força reflow para garantir que o "from" é aplicado antes do "to"
    void previewEl.offsetHeight;
    previewEl.style.transition = '';
  }

  function closeImgPreview() { runCloseTransform(() => { previewImg = null; previewKind = null; }); }
  function closeDocPreview() { runCloseTransform(() => { previewDoc = null; previewKind = null; }); }

  function runCloseTransform(done) {
    if (!previewEl || !originRect) { done(); return; }
    transformPhase = 'closing';
    applyOriginFrame(); // volta a encolher para o rect original do card
    const onEnd = (ev) => {
      if (ev.target !== previewEl) return;
      previewEl.removeEventListener('transitionend', onEnd);
      transformPhase = 'idle';
      originRect = null;
      done();
    };
    previewEl.addEventListener('transitionend', onEnd);
    // segurança: caso transitionend não dispare (ex: reduced-motion)
    setTimeout(() => {
      if (transformPhase === 'closing') {
        previewEl?.removeEventListener('transitionend', onEnd);
        transformPhase = 'idle';
        originRect = null;
        done();
      }
    }, 420);
  }

  function useImgModel() {
    if (previewImg) onUsePrompt(previewImg.prompt);
    closeImgPreview();
  }
  function useDocModel() {
    if (previewDoc) onUsePrompt(previewDoc.prompt);
    closeDocPreview();
  }

  // Elastic / rubber-band scroll nativo dentro do próprio grid
  let scrollEl;
  let dragging = false;
  let startY = 0;
  let startScrollTop = 0;
  let pull = 0; // 0 -> sem esticar, >0 esticado

  function onPointerDown(e) {
    if (!scrollEl) return;
    dragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startScrollTop = scrollEl.scrollTop;
  }
  function onPointerMove(e) {
    if (!dragging || !scrollEl) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - startY;
    const atTop = scrollEl.scrollTop <= 0;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;

    if (atTop && delta > 0) {
      pull = Math.min(64, delta * 0.42);
    } else if (atBottom && delta < 0) {
      pull = Math.max(-64, delta * 0.42);
    } else {
      pull = 0;
    }
  }
  function onPointerUp() {
    dragging = false;
    pull = 0;
  }

  onMount(() => {
    const t = setTimeout(() => { loading = false; }, 700);
    return () => clearTimeout(t);
  });
</script>

<div
  class="templates-tab"
  bind:this={scrollEl}
  style="transform: translateY({pull}px); transition: {dragging ? 'none' : 'transform .5s cubic-bezier(0.22,1.42,0.36,1)'}"
  on:touchstart={onPointerDown}
  on:touchmove={onPointerMove}
  on:touchend={onPointerUp}
  on:touchcancel={onPointerUp}
  on:mousedown={onPointerDown}
  on:mousemove={onPointerMove}
  on:mouseup={onPointerUp}
  on:mouseleave={onPointerUp}
>
  {#if loading}
    {#if view === 'images'}
      <div class="masonry">
        <div class="masonry-col">
          <div class="skeleton-card" style="aspect-ratio:3/4"></div>
          <div class="skeleton-card" style="aspect-ratio:1/1"></div>
          <div class="skeleton-card" style="aspect-ratio:4/5"></div>
        </div>
        <div class="masonry-col">
          <div class="skeleton-card" style="aspect-ratio:1/1"></div>
          <div class="skeleton-card" style="aspect-ratio:4/5"></div>
          <div class="skeleton-card" style="aspect-ratio:3/4"></div>
        </div>
      </div>
    {:else}
      <div class="doc-grid">
        {#each Array(6) as _}
          <div class="skeleton-doc">
            <div class="skeleton-sheet"></div>
            <div class="skeleton-line"></div>
          </div>
        {/each}
      </div>
    {/if}
  {:else if view === 'images'}
    <div class="masonry">
      {#each imageColumns as column}
        <div class="masonry-col">
          {#each column as img}
            <button
              class="img-card"
              class:img-card-hidden={previewKind === 'image' && previewImg === img && transformPhase !== 'idle'}
              on:click={(e) => openImgPreview(img, e)}
            >
              <img src={img.thumb} alt={img.label} class="img-card-photo" loading="lazy" />
              <span class="img-card-overlay"></span>
              <span class="img-card-label">{img.label}</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="doc-grid">
      {#each DOC_MODELS as doc}
        <button
          class="doc-card"
          class:doc-card-hidden={previewKind === 'doc' && previewDoc === doc && transformPhase !== 'idle'}
          on:click={(e) => openDocPreview(doc, e)}
        >
          <div class="doc-sheet">
            <span class="doc-icon-mask" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}')"></span>
            <span class="doc-line doc-line-1"></span>
            <span class="doc-line doc-line-2"></span>
            <span class="doc-line doc-line-3"></span>
            <span class="doc-line doc-line-4"></span>
          </div>
          <span class="doc-label">{doc.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if previewImg || previewDoc}
  <div
    class="transform-scrim"
    class:transform-scrim-in={transformPhase === 'open'}
    on:click={previewImg ? closeImgPreview : closeDocPreview}
  ></div>

  <div class="transform-preview" bind:this={previewEl}>
    {#if previewImg}
      <div class="preview-content">
        <img src={previewImg.thumb} alt={previewImg.label} class="preview-image" />
        <div
          class="preview-actions"
          class:preview-actions-in={transformPhase === 'open'}
        >
          <button class="preview-btn preview-btn-cancel" on:click={closeImgPreview}>Cancelar</button>
          <button class="preview-btn preview-btn-use" on:click={useImgModel}>Usar modelo</button>
        </div>
      </div>
    {:else if previewDoc}
      <div class="preview-content">
        <div class="preview-doc-sheet">
          <span class="preview-doc-icon" style="mask-image:url('{previewDoc.icon}');-webkit-mask-image:url('{previewDoc.icon}')"></span>
          <span class="preview-doc-label">{previewDoc.label}</span>
        </div>
        <div
          class="preview-actions"
          class:preview-actions-in={transformPhase === 'open'}
        >
          <button class="preview-btn preview-btn-cancel" on:click={closeDocPreview}>Cancelar</button>
          <button class="preview-btn preview-btn-use" on:click={useDocModel}>Usar modelo</button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .templates-tab {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
    will-change: transform;
  }
  .masonry {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding-top: 6px;
  }
  .masonry-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .img-card {
    position: relative;
    display: block;
    width: 100%;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 20px;
    overflow: hidden;
    background: var(--surface-apps-tab);
    box-shadow: 0 2px 10px var(--drawer-shadow);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1), opacity .18s ease;
  }
  .masonry-col:first-child .img-card:nth-child(3n+1) { aspect-ratio: 3 / 4; }
  .masonry-col:first-child .img-card:nth-child(3n+2) { aspect-ratio: 1 / 1; }
  .masonry-col:first-child .img-card:nth-child(3n+3) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+1) { aspect-ratio: 1 / 1; }
  .masonry-col:last-child .img-card:nth-child(3n+2) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+3) { aspect-ratio: 3 / 4; }
  .img-card:active { transform: scale(0.96); }
  /* enquanto o container transform está a decorrer, o card de origem
     fica invisível (o preview flutuante ocupa visualmente o mesmo lugar) */
  .img-card-hidden { opacity: 0; }
  .img-card-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .img-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
  }
  .img-card-label {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 9px;
    font-size: 12.5px;
    font-weight: 700;
    color: #fff;
    text-align: left;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px 10px;
    padding-top: 6px;
  }
  .doc-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--drawer-text);
    transition: opacity .18s ease;
  }
  .doc-card-hidden { opacity: 0; }
  .doc-sheet {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    background: var(--surface-apps-tab);
    border: 1px solid var(--border-soft);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14% 12%;
    box-shadow: 0 1px 4px var(--drawer-shadow);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .doc-card:active .doc-sheet {
    transform: scale(0.94);
    background: var(--row-active);
  }
  .doc-icon-mask {
    width: 26%;
    aspect-ratio: 1 / 1;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    margin-bottom: 4%;
    flex-shrink: 0;
  }
  .doc-line {
    display: block;
    width: 74%;
    height: 6%;
    background: var(--border-soft);
    flex-shrink: 0;
  }
  .doc-line-2 { width: 60%; }
  .doc-line-4 { width: 45%; }
  .doc-label {
    font-size: 11.5px;
    font-weight: 600;
    text-align: center;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Skeleton loader */
  .skeleton-card, .skeleton-sheet, .skeleton-line {
    background: linear-gradient(
      100deg,
      var(--border-faint) 30%,
      var(--border-soft) 50%,
      var(--border-faint) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.3s ease-in-out infinite;
  }
  .skeleton-card {
    width: 100%;
    border-radius: 20px;
  }
  .skeleton-doc {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .skeleton-sheet {
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    border-radius: 14px;
  }
  .skeleton-line {
    width: 70%;
    height: 10px;
    border-radius: 6px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ------------------------------------------------------------------
     Container transform — SEM blur em nenhuma fase.
     O scrim (fundo escurecido) faz fade-in/out normal.
     O preview em si anima top/left/width/height/border-radius via
     transition CSS (motor de composição do browser interpola isto
     de forma performática, ainda que não sejam propriedades "só transform").
  ------------------------------------------------------------------- */
  .transform-scrim {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0,0,0,0);
    transition: background .32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .transform-scrim-in {
    background: rgba(0,0,0,0.72);
  }

  .transform-preview {
    position: fixed;
    z-index: 1101;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    transition:
      top .38s cubic-bezier(0.22, 1, 0.36, 1),
      left .38s cubic-bezier(0.22, 1, 0.36, 1),
      width .38s cubic-bezier(0.22, 1, 0.36, 1),
      height .38s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius .38s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: top, left, width, height, border-radius;
    background: var(--surface-apps-tab);
    /* estado "aberto": centrado com margens, cantos arredondados visíveis */
    top: 10vh;
    left: 6vw;
    width: 88vw;
    height: 80vh;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 22px;
  }
  .preview-image {
    width: 100%;
    height: 100%;
    max-height: calc(100% - 76px);
    object-fit: cover;
    border-radius: 20px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  }
  .preview-doc-sheet {
    background: var(--surface-apps-tab);
    width: 100%;
    height: 100%;
    max-height: calc(100% - 76px);
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
  }
  .preview-doc-icon {
    width: 96px;
    height: 96px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .preview-doc-label {
    font-size: 19px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
  }
  .preview-actions {
    display: flex;
    gap: 12px;
    width: 100%;
    flex-shrink: 0;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity .22s ease .12s, transform .22s cubic-bezier(0.22,1,0.36,1) .12s;
  }
  .preview-actions-in {
    opacity: 1;
    transform: translateY(0);
  }
  .preview-btn {
    flex: 1;
    padding: 14px 10px;
    border-radius: 999px;
    border: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s;
  }
  .preview-btn:active { transform: scale(0.96); opacity: 0.8; }
  .preview-btn-cancel {
    background: rgba(0,0,0,0.6);
    color: #fff;
  }
  .preview-btn-use {
    background: var(--btn-solid-bg);
    color: var(--btn-solid-text);
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    .transform-preview, .transform-scrim, .preview-actions {
      transition: none !important;
    }
  }
</style>