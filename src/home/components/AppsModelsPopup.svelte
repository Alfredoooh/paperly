<!-- Route page: Apps & Modelos -->
<script>
  import { slide, fade } from 'svelte/transition';
  import { MODELS_TABS, DOC_MODELS, IMAGE_MODELS } from '../lib/constants.js';

  export let modelsTab = 'docs';
  export let platformApps = [];

  export let onClose;
  export let onSelectDocModel;
  export let onSelectImageModel;
  export let onOpenApp;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
</script>

<svelte:head>
  <title>Modelos & Apps</title>
</svelte:head>

<div class="page-shell" transition:fade={{ duration: 120 }}>
  <div class="page-bg" aria-hidden="true"></div>

  <header class="topbar">
    <button class="icon-btn" type="button" aria-label="Voltar" on:click={onClose}>
      <span class="arrow">←</span>
    </button>

    <div class="title-wrap">
      <p class="eyebrow">Área de navegação</p>
      <h1>Modelos & Apps</h1>
      <p class="subtitle">Escolhe documentos, estilos de imagem ou apps.</p>
    </div>
  </header>

  <div class="tabs-wrap">
    <div class="tabs" role="tablist" aria-label="Secções">
      {#each MODELS_TABS as t}
        <button
          class="tab"
          class:tab-active={modelsTab === t.id}
          type="button"
          on:click={() => modelsTab = t.id}
        >
          {t.label}
        </button>
      {/each}
    </div>
  </div>

  <section class="content">
    {#key modelsTab}
      {#if modelsTab === 'docs'}
        <div class="grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
          {#each DOC_MODELS as doc}
            <button class="card" type="button" on:click={() => onSelectDocModel(doc)}>
              <span class="card-icon">
                <span class="icon-mask" style={`mask-image:url('${doc.icon}');-webkit-mask-image:url('${doc.icon}');`}></span>
              </span>
              <span class="card-text">
                <span class="card-title">{doc.label}</span>
                <span class="card-desc">Documento pronto a começar.</span>
              </span>
            </button>
          {/each}
        </div>
      {:else if modelsTab === 'images'}
        <div class="grid image-grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
          {#each IMAGE_MODELS as img}
            <button class="card image-card" type="button" on:click={() => onSelectImageModel(img)}>
              <img src={img.thumb} alt={img.label} class="thumb" loading="lazy" />
              <span class="card-text">
                <span class="card-title">{img.label}</span>
                <span class="card-desc">Abre com este estilo.</span>
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="grid app-grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
          {#each platformApps as app}
            <button class="card app-card" type="button" on:click={() => onOpenApp(app)}>
              <img src={app.icon} alt={app.label} class="app-icon" />
              <span class="card-text">
                <span class="card-title">{app.label}</span>
                <span class="card-desc">Abrir aplicação.</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    {/key}
  </section>
</div>

<style>
  :global(html), :global(body) {
    width: 100%;
    height: 100%;
  }

  .page-shell {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow: auto;
    background:
      radial-gradient(circle at top left, rgba(124, 92, 255, 0.12), transparent 38%),
      radial-gradient(circle at top right, rgba(52, 211, 153, 0.10), transparent 30%),
      linear-gradient(180deg, #11131a 0%, #090b10 100%);
    color: rgba(255,255,255,0.92);
    -webkit-overflow-scrolling: touch;
  }

  .page-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 28px 28px;
    opacity: 0.55;
    mix-blend-mode: screen;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: max(16px, env(safe-area-inset-top)) 16px 14px;
    backdrop-filter: blur(18px);
    background: linear-gradient(180deg, rgba(9,11,16,0.84), rgba(9,11,16,0.42));
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 14px;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.92);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .arrow {
    font-size: 18px;
    line-height: 1;
    transform: translateX(-1px);
  }

  .title-wrap {
    min-width: 0;
    flex: 1;
  }

  .eyebrow {
    margin: 2px 0 6px;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.48);
  }

  h1 {
    margin: 0;
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .subtitle {
    margin: 8px 0 0;
    max-width: 38ch;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255,255,255,0.58);
  }

  .tabs-wrap {
    position: sticky;
    top: 74px;
    z-index: 2;
    padding: 12px 16px 14px;
    background: linear-gradient(180deg, rgba(9,11,16,0.90), rgba(9,11,16,0.55));
    backdrop-filter: blur(16px);
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 6px;
    border-radius: 18px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .tab {
    border: 0;
    border-radius: 13px;
    padding: 11px 10px;
    background: transparent;
    color: rgba(255,255,255,0.58);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
  }

  .tab-active {
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.95);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .content {
    padding: 0 16px calc(28px + env(safe-area-inset-bottom));
  }

  .grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr;
    padding-top: 4px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 14px;
    background: rgba(255,255,255,0.055);
    color: inherit;
    text-align: left;
    box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  }

  .card:active {
    transform: scale(0.99);
  }

  .card-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    background: rgba(255,255,255,0.08);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .icon-mask {
    width: 18px;
    height: 18px;
    background: rgba(255,255,255,0.88);
    display: inline-block;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
  }

  .card-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .card-desc {
    font-size: 12px;
    line-height: 1.35;
    color: rgba(255,255,255,0.58);
  }

  .image-card {
    align-items: stretch;
  }

  .thumb {
    width: 66px;
    height: 66px;
    border-radius: 16px;
    object-fit: cover;
    flex: 0 0 auto;
  }

  .app-card {
    align-items: center;
  }

  .app-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    object-fit: cover;
    flex: 0 0 auto;
    background: rgba(255,255,255,0.08);
  }

  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .image-grid,
    .app-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 980px) {
    .content {
      max-width: 1080px;
      margin: 0 auto;
      padding-inline: 20px;
    }

    .tabs-wrap,
    .topbar {
      padding-inline: max(20px, calc((100vw - 1080px) / 2));
    }

    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
