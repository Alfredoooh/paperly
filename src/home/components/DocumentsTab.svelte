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
    color: var(--drawer-text);
  }
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
    background: var(--surface-apps-tab);
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .preview-doc-icon {
    width: 80px;
    height: 80px;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  .preview-doc-label {
    font-size: 18px;
    font-weight: 700;
    color: var(--drawer-text);
    text-align: center;
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
  /* Antes: light-dark(rgba(255,255,255,0.2), rgba(0,0,0,0.6)) e
     light-dark(#2a2a2a, #f5f5f5) — uma fonte de cor à parte, que só
     segue prefers-color-scheme do SO e ignora completamente o
     data-theme/os tons de superfície custom que o resto da app usa
     (o mesmo bug que já foi corrigido na app de IA). Trocado por
     var(--btn-bg-active)/var(--btn-solid-bg)/var(--btn-solid-text),
     que já são as variáveis que TemplatesSearchPage e
     TemplatePreviewPage usam para este mesmo par de botões. */
  .preview-btn-cancel {
    background: var(--btn-bg-active);
    color: var(--drawer-text);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .preview-btn-use {
    background: var(--btn-solid-bg);
    color: var(--btn-solid-text);
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
</style>