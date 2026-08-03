<!-- src/home/components/ImagesTab.svelte -->
<script>
  import { IMAGE_MODELS } from '../lib/constants.js';

  export let onUsePrompt = () => {};

  let previewImg = null;

  function splitColumns(items) {
    const left = [], right = [];
    items.forEach((item, i) => {
      if (i % 2 === 0) left.push(item); else right.push(item);
    });
    return [left, right];
  }
  $: imageColumns = splitColumns(IMAGE_MODELS);

  function openPreview(img) { previewImg = img; }
  function closePreview() { previewImg = null; }
  function useModel() {
    if (previewImg) onUsePrompt(previewImg.prompt);
    closePreview();
  }
</script>

<div class="images-tab">
  <div class="masonry">
    {#each imageColumns as column}
      <div class="masonry-col">
        {#each column as img}
          <button class="img-card" on:click={() => openPreview(img)}>
            <img src={img.thumb} alt={img.label} class="img-card-photo" loading="lazy" />
            <span class="img-card-overlay"></span>
            <span class="img-card-label">{img.label}</span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
</div>

{#if previewImg}
  <div class="preview-overlay" on:click={closePreview}>
    <div class="preview-content" on:click|stopPropagation>
      <img src={previewImg.thumb} alt={previewImg.label} class="preview-image" />
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closePreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useModel}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .images-tab {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
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
    background: #F0F0F1;
    box-shadow: 0 2px 10px rgba(0,0,0,0.13);
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  :global([data-theme="dark"]) .img-card {
    background: #2C2C2E;
    box-shadow: 0 2px 10px rgba(0,0,0,0.45);
  }
  .masonry-col:first-child .img-card:nth-child(3n+1) { aspect-ratio: 3 / 4; }
  .masonry-col:first-child .img-card:nth-child(3n+2) { aspect-ratio: 1 / 1; }
  .masonry-col:first-child .img-card:nth-child(3n+3) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+1) { aspect-ratio: 1 / 1; }
  .masonry-col:last-child .img-card:nth-child(3n+2) { aspect-ratio: 4 / 5; }
  .masonry-col:last-child .img-card:nth-child(3n+3) { aspect-ratio: 3 / 4; }
  .img-card:active { transform: scale(0.96); }
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
    color: #FFFFFF;
    text-align: left;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global([data-theme="dark"]) .img-card-label {
    color: #1A1A1A;
  }

  .preview-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .preview-content {
    max-width: 340px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    animation: scaleUp .25s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes scaleUp {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .preview-image {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .preview-actions { display: flex; gap: 12px; width: 100%; }
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
    background: rgba(255,255,255,0.2);
    color: #FFFFFF;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  :global([data-theme="dark"]) .preview-btn-cancel {
    background: rgba(0,0,0,0.6);
    color: #1A1A1A;
  }
  .preview-btn-use {
    background: #2a2a2a;
    color: #ffffff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  :global([data-theme="dark"]) .preview-btn-use {
    background: #f5f5f5;
    color: #1a1a1a;
  }
</style>