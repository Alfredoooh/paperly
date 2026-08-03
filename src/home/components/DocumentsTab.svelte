<!-- src/home/components/DocumentsTab.svelte -->
<script>
  import { DOC_MODELS } from '../lib/constants.js';

  export let onUsePrompt = () => {};

  let previewDoc = null;

  function openPreview(doc) { previewDoc = doc; }
  function closePreview() { previewDoc = null; }
  function useModel() {
    if (previewDoc) onUsePrompt(previewDoc.prompt);
    closePreview();
  }
</script>

<div class="docs-tab">
  <div class="doc-grid">
    {#each DOC_MODELS as doc}
      <button class="doc-card" on:click={() => openPreview(doc)}>
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
</div>

{#if previewDoc}
  <div class="preview-overlay" on:click={closePreview}>
    <div class="preview-content" on:click|stopPropagation>
      <div class="preview-doc-sheet">
        <span class="preview-doc-icon" style="mask-image:url('{previewDoc.icon}');-webkit-mask-image:url('{previewDoc.icon}')"></span>
        <span class="preview-doc-label">{previewDoc.label}</span>
      </div>
      <div class="preview-actions">
        <button class="preview-btn preview-btn-cancel" on:click={closePreview}>Cancelar</button>
        <button class="preview-btn preview-btn-use" on:click={useModel}>Usar modelo</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .docs-tab {
    width: 100%;
    padding: 4px 14px calc(env(safe-area-inset-bottom, 0px) + 96px);
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
    color: rgba(26,26,26,0.94);
  }
  :global([data-theme="dark"]) .doc-card {
    color: rgba(242,242,242,0.86);
  }
  .doc-sheet {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    background: #F0F0F1;
    border: 1px solid rgba(26,26,26,0.09);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14% 12%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.13);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  :global([data-theme="dark"]) .doc-sheet {
    background: #2C2C2E;
    border-color: rgba(242,242,242,0.12);
    box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  }
  .doc-card:active .doc-sheet {
    transform: scale(0.94);
    background: rgba(26,26,26,0.05);
  }
  :global([data-theme="dark"]) .doc-card:active .doc-sheet {
    background: rgba(242,242,242,0.07);
  }
  .doc-icon-mask {
    width: 26%;
    aspect-ratio: 1 / 1;
    background: rgba(26,26,26,0.85);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    margin-bottom: 4%;
    flex-shrink: 0;
  }
  :global([data-theme="dark"]) .doc-icon-mask {
    background: rgba(242,242,242,0.88);
  }
  .doc-line {
    display: block;
    width: 74%;
    height: 6%;
    background: rgba(26,26,26,0.09);
    flex-shrink: 0;
  }
  :global([data-theme="dark"]) .doc-line {
    background: rgba(242,242,242,0.12);
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
  .preview-doc-sheet {
    background: #F0F0F1;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    border: 1px solid rgba(26,26,26,0.09);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  :global([data-theme="dark"]) .preview-doc-sheet {
    background: #2C2C2E;
    border-color: rgba(242,242,242,0.12);
  }
  .preview-doc-icon {
    width: 80px;
    height: 80px;
    background: rgba(26,26,26,0.85);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  :global([data-theme="dark"]) .preview-doc-icon {
    background: rgba(242,242,242,0.88);
  }
  .preview-doc-label {
    font-size: 18px;
    font-weight: 700;
    color: rgba(26,26,26,0.94);
    text-align: center;
  }
  :global([data-theme="dark"]) .preview-doc-label {
    color: rgba(242,242,242,0.86);
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