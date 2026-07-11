<!-- src/home/components/TemplatePreviewPage.svelte -->
<script>
  export let pushed = false; // true = tela empurrada para dentro (visível)
  export let kind = 'image'; // 'image' | 'doc'
  export let item = null;
  export let onClose = () => {};
  export let onUse = () => {};

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function handleClose() {
    buzz();
    onClose();
  }
  function handleUse() {
    buzz();
    onUse();
  }
</script>

<div class="preview-page" class:pushed>
  <header class="preview-header">
    <button class="back-btn pulse-tap" on:click={handleClose} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg')"></span>
    </button>
    <span class="preview-header-title">{item?.label || ''}</span>
    <span class="preview-header-spacer"></span>
  </header>

  <div class="preview-body">
    {#if kind === 'image' && item}
      <img src={item.thumb} alt={item.label} class="preview-image" />
    {:else if kind === 'doc' && item}
      <div class="preview-doc-sheet">
        <span class="preview-doc-icon" style="mask-image:url('{item.icon}');-webkit-mask-image:url('{item.icon}')"></span>
        <span class="preview-doc-label">{item.label}</span>
      </div>
    {/if}
  </div>

  <div class="preview-actions">
    <button class="preview-btn preview-btn-cancel pulse-tap" on:click={handleClose}>Cancelar</button>
    <button class="preview-btn preview-btn-use pulse-tap" on:click={handleUse}>Usar modelo</button>
  </div>
</div>

<style>
  /* ------------------------------------------------------------------
     Tela cheia com navegação nativa idêntica à SearchPage: mesmo
     translate3d(100%,0,0) -> translate3d(0,0,0), mesma curva, mesmo
     back-btn circular com arrow_left.svg no appbar.
     Cantos LEVEMENTE arredondados (não é um modal centrado) — dá a
     sensação de painel nativo tipo "sheet" full screen do Android/iOS.
  ------------------------------------------------------------------- */
  .preview-page {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--app-bg);
    border-radius: 18px;
    overflow: hidden;
    transform: translate3d(100%, 0, 0);
    transition: transform .38s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
    box-shadow: -6px 0 24px rgba(0,0,0,0.18);
  }
  .preview-page.pushed {
    transform: translate3d(0, 0, 0);
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--btn-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .back-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.88);
  }
  .back-btn .icon-mask {
    width: 18px;
    height: 18px;
  }

  .preview-header-title {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--drawer-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-header-spacer {
    width: 36px;
    flex-shrink: 0;
  }

  .icon-mask {
    display: block;
    background: var(--icon-strong);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .preview-body {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    overflow: hidden;
  }
  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.3);
  }
  .preview-doc-sheet {
    background: var(--surface-apps-tab);
    width: 100%;
    height: 100%;
    max-width: 420px;
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
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
    padding: 12px 18px calc(env(safe-area-inset-bottom, 0px) + 18px);
    flex-shrink: 0;
  }
  .preview-btn {
    flex: 1;
    padding: 15px 10px;
    border-radius: 999px;
    border: none;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s, background .16s;
  }
  /* Cancelar: vermelho de perigo, igual ao botão de logout do drawer */
  .preview-btn-cancel {
    background: var(--danger);
    color: #fff;
  }
  .preview-btn-cancel:active {
    background: var(--danger-active);
  }
  /* Usar modelo: azul primário nativo (accent do sistema) */
  .preview-btn-use {
    background: var(--accent-primary);
    color: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  .preview-btn-use:active {
    background: var(--accent-primary-active);
  }

  .pulse-tap {
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform: scale(0.96); opacity: .80; }

  @media (prefers-reduced-motion: reduce) {
    .preview-page { transition: none !important; }
  }
</style>