<script>
  import { onMount } from 'svelte';
  import { MODELS_TABS, DOC_MODELS, IMAGE_MODELS } from './lib/constants.js';

  export let onBack = () => {};
  export let platformApps = [];

  let modelsTab = 'docs';
  let pageVisible = false;

  function goBack() {
    pageVisible = false;
    setTimeout(() => { onBack(); }, 200);
  }

  function goToAIWithPrompt(promptText) {
    try {
      sessionStorage.setItem('nexa_pending_message', promptText);
      sessionStorage.removeItem('nexa_pending_attachments');
    } catch (e) {}
    const ai = platformApps.find(x => x.id === 'ai');
    window.location.href = ai ? ai.path : '/ai';
  }

  function selectDocModel(doc) {
    goToAIWithPrompt(doc.prompt);
  }
  function selectImageModel(img) {
    goToAIWithPrompt(img.prompt);
  }
  function openApp(app) {
    if (app.id === 'ai') {
      try { sessionStorage.removeItem('nexa_pending_message'); } catch (e) {}
    }
    window.location.href = app.path;
  }

  onMount(() => {
    requestAnimationFrame(() => { pageVisible = true; });
  });
</script>

<div class="am-root" class:am-in={pageVisible}>
  <div class="am-header">
    <button class="am-back" on:click={goBack} aria-label="Voltar">
      <span class="am-back-icon"></span>
    </button>
    <span class="am-title">Modelos &amp; Apps</span>
    <span class="am-header-spacer"></span>
  </div>

  <div class="am-tabs">
    {#each MODELS_TABS as t}
      <button
        class="am-tab"
        class:am-tab-active={modelsTab === t.id}
        on:click={() => modelsTab = t.id}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <div class="am-body">
    {#if modelsTab === 'docs'}
      <div class="am-grid">
        {#each DOC_MODELS as doc}
          <button class="am-pill" on:click={() => selectDocModel(doc)}>
            <span class="am-pill-icon-wrap">
              <span class="am-icon-mask" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}')"></span>
            </span>
            <span class="am-pill-label">{doc.label}</span>
          </button>
        {/each}
      </div>
    {:else if modelsTab === 'images'}
      <div class="am-grid">
        {#each IMAGE_MODELS as img}
          <button class="am-pill am-pill-thumb" on:click={() => selectImageModel(img)}>
            <img src={img.thumb} alt={img.label} class="am-pill-thumb-img" loading="lazy" />
            <span class="am-pill-label">{img.label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="am-grid">
        {#each platformApps as app}
          <button class="am-pill" on:click={() => openApp(app)}>
            <img src={app.icon} alt={app.label} class="am-pill-app-icon" />
            <span class="am-pill-label">{app.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .am-root {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: #0F0F0F;
    color: rgba(255,255,255,0.92);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
    overflow: hidden;
  }
  .am-root.am-in {
    opacity: 1;
    transform: translateY(0);
  }
  .am-root * {
    box-sizing: border-box;
  }

  .am-header {
    display: flex;
    align-items: center;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .am-back {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), background .16s ease;
  }
  .am-back:active {
    transform: scale(0.92);
    background: rgba(255,255,255,0.14);
  }
  .am-back-icon {
    width: 11px;
    height: 11px;
    border-left: 2px solid rgba(255,255,255,0.85);
    border-bottom: 2px solid rgba(255,255,255,0.85);
    transform: rotate(45deg);
    margin-left: 2px;
  }
  .am-title {
    flex: 1;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
  }
  .am-header-spacer {
    width: 36px;
  }

  .am-tabs {
    display: flex;
    gap: 6px;
    background: rgba(255,255,255,0.08);
    padding: 4px;
    border-radius: 14px;
    margin: 4px 14px 14px;
    flex-shrink: 0;
  }
  .am-tab {
    flex: 1;
    border: none;
    background: transparent;
    padding: 10px 6px;
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.38);
    cursor: pointer;
    transition: background .22s cubic-bezier(0.16,1,0.3,1), color .22s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .am-tab:active {
    transform: scale(0.96);
  }
  .am-tab-active {
    background: #0F0F0F;
    color: rgba(255,255,255,0.92);
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }

  .am-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 14px calc(env(safe-area-inset-bottom, 0px) + 24px);
    -webkit-overflow-scrolling: touch;
  }

  .am-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-content: flex-start;
  }

  .am-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    padding: 9px 16px 9px 10px;
    border-radius: 999px;
    background: #171717;
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer;
    font: inherit;
    color: rgba(255,255,255,0.92);
    white-space: nowrap;
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .am-pill:active {
    transform: scale(0.95);
    background: rgba(255,255,255,0.07);
  }

  .am-pill-icon-wrap {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255,255,255,0.10);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .am-icon-mask {
    width: 15px;
    height: 15px;
    display: block;
    background: rgba(255,255,255,0.88);
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .am-pill-label {
    font-size: 13.5px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .am-pill-thumb {
    padding: 5px 16px 5px 5px;
  }
  .am-pill-thumb-img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.09);
  }

  .am-pill-app-icon {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    object-fit: contain;
    flex-shrink: 0;
  }
</style>