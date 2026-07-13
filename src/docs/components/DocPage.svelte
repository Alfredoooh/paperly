<script>
  import PinchZoom from '../widgets/PinchZoom.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let editorEl; // bindable, o pai precisa da referência ao contenteditable
  export let footnotes = [];

  const dispatch = createEventDispatcher();

  // A4 real: 210×297mm. Guardamos a largura "física" de referência e
  // calculamos a escala-base para que a folha caiba inteira na largura
  // visível do ecrã — isto É o "ajuste à tela", o pinch trabalha a
  // partir desta base (base=1 no PinchZoom).
  const PAGE_PHYSICAL_WIDTH = 595; // px, equivalente a A4 a 72dpi
  const PAGE_ASPECT = 297 / 210;

  let containerEl;
  let fitScale = 1;
  let pinchScale = 1;

  function computeFitScale() {
    if (!containerEl) return;
    const availableWidth = containerEl.clientWidth - 32; // pequena margem lateral
    fitScale = Math.min(1, availableWidth / PAGE_PHYSICAL_WIDTH);
    if (fitScale <= 0 || !isFinite(fitScale)) fitScale = 1;
  }

  let resizeObserver;
  onMount(() => {
    computeFitScale();
    resizeObserver = new ResizeObserver(() => computeFitScale());
    if (containerEl) resizeObserver.observe(containerEl);
    window.addEventListener('orientationchange', computeFitScale);
  });
  onDestroy(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('orientationchange', computeFitScale);
  });

  function handleInput() {
    dispatch('input');
  }
  function handleKeydown(e) {
    dispatch('keydown', e);
  }

  $: effectiveScale = fitScale * pinchScale;
</script>

<div class="canvas-scroll" bind:this={containerEl}>
  <PinchZoom bind:scale={pinchScale} minScale={1} maxScale={4} on:zoomchange>
    <div class="page-a4" style="width:{PAGE_PHYSICAL_WIDTH}px; aspect-ratio: 210 / 297; transform: scale({fitScale}); transform-origin: top center;">
      <div
        class="editor"
        contenteditable="true"
        bind:this={editorEl}
        on:input={handleInput}
        on:keydown={handleKeydown}
        spellcheck="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Conteúdo do documento"
      ></div>

      {#if footnotes.length > 0}
        <div class="footnotes-block">
          <div class="footnotes-divider"></div>
          {#each footnotes as fn (fn.id)}
            <div class="footnote-line">
              <span class="footnote-num">{fn.num}.</span>
              <span class="footnote-text">{fn.text}</span>
              <button class="footnote-remove" on:click={() => dispatch('removefootnote', fn.id)} aria-label="Remover nota">×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </PinchZoom>
</div>

<style>
  .canvas-scroll {
    flex: 1;
    width: 100%;
    overflow: hidden;
    padding: 24px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
  }
  .page-a4 {
    background: #FFFFFF;
    border-radius: 0;
    padding: 64px 56px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.16);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .editor {
    width: 100%; flex: 1; outline: none;
    font-size: 15px; line-height: 1.6; color: #1a1a1a;
    overflow-wrap: break-word;
  }
  .editor :global(table.doc-table) {
    border-collapse: collapse; width: 100%; margin: 12px 0;
  }
  .editor :global(table.doc-table td) {
    border: 1px solid #d0d0d0; padding: 8px; min-width: 40px; height: 28px;
  }
  .editor :global(img) { max-width: 100%; height: auto; border-radius: 4px; }
  .editor :global(a) { color: #2F7BF6; text-decoration: underline; }
  .editor :global(.footnote-ref) { color: #2F7BF6; cursor: default; }

  .footnotes-block { margin-top: 24px; flex-shrink: 0; }
  .footnotes-divider { width: 120px; height: 1px; background: #d0d0d0; margin-bottom: 10px; }
  .footnote-line { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #555; margin-bottom: 4px; }
  .footnote-num { font-weight: 700; flex-shrink: 0; }
  .footnote-text { flex: 1; line-height: 1.5; }
  .footnote-remove {
    border: none; background: transparent; color: #999; font-size: 14px; line-height: 1; cursor: pointer;
    padding: 0 2px; flex-shrink: 0; -webkit-tap-highlight-color: transparent;
  }
  .footnote-remove:active { color: #F0384A; }
</style>