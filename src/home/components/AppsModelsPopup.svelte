<!-- src/routes/home/components/AppsModelsPopup.svelte -->
<script>
  import { slide } from 'svelte/transition';
  import { MODELS_TABS, DOC_MODELS, IMAGE_MODELS } from '../lib/constants.js';
  
  export let showAppsPopup = false;
  export let appsPopupVisible = false;
  export let appsPopupStyle = '';
  export let modelsTab = 'docs';
  export let platformApps = [];
  
  export let onClose;
  export let onSelectDocModel;
  export let onSelectImageModel;
  export let onOpenApp;
  
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
</script>

{#if showAppsPopup}
  <div class="popup-overlay" on:click={onClose}></div>
  <div class="popup-box apps-popup" class:popup-in={appsPopupVisible} style={appsPopupStyle}>
    <div class="apps-popup-shell">
      <div class="apps-popup-header">
        <span class="apps-popup-title">Apps &amp; Utilitários</span>
        <button class="apps-popup-close pulse-tap" on:click={onClose} aria-label="Fechar">
          <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:16px;height:16px;background:var(--icon-strong)"></span>
        </button>
      </div>

      <div class="models-tabs apps-popup-tabs">
        {#each MODELS_TABS as t}
          <button
            class="models-tab pulse-tap"
            class:models-tab-active={modelsTab === t.id}
            on:click={() => modelsTab = t.id}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <div class="apps-popup-body">
        {#key modelsTab}
          {#if modelsTab === 'docs'}
            <div class="pill-grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
              {#each DOC_MODELS as doc}
                <button class="model-pill pulse-tap" on:click={() => onSelectDocModel(doc)}>
                  <span class="model-pill-icon-wrap">
                    <span class="icon-mask" style="mask-image:url('{doc.icon}');-webkit-mask-image:url('{doc.icon}');width:15px;height:15px;background:var(--icon-strong)"></span>
                  </span>
                  <span class="model-pill-label">{doc.label}</span>
                </button>
              {/each}
            </div>
          {:else if modelsTab === 'images'}
            <div class="pill-grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
              {#each IMAGE_MODELS as img}
                <button class="model-pill model-pill-thumb pulse-tap" on:click={() => onSelectImageModel(img)}>
                  <img src={img.thumb} alt={img.label} class="model-pill-thumb-img" loading="lazy" />
                  <span class="model-pill-label">{img.label}</span>
                </button>
              {/each}
            </div>
          {:else}
            <div class="pill-grid apps-pill-grid" transition:slide={{ duration: 220, easing: easeOutCubic }}>
              {#each platformApps as app}
                <button class="model-pill pulse-tap" on:click={() => onOpenApp(app)}>
                  <img src={app.icon} alt={app.label} class="model-pill-app-icon" />
                  <span class="model-pill-label">{app.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        {/key}
      </div>
    </div>
  </div>
{/if}

<style>
  .popup-overlay { position:fixed; inset:0; z-index:50; }
  .popup-box {
    position:fixed; z-index:51; border-radius:24px; background:var(--surface-strong);
    border:0.5px solid var(--border-soft); box-shadow:0 18px 48px rgba(0,0,0,0.28);
    overflow:hidden; transform-origin:center; opacity:0; transform:scale(0.96) translateY(10px);
    transition:opacity .26s cubic-bezier(0.16,1,0.3,1), transform .26s cubic-bezier(0.16,1,0.3,1);
    pointer-events:none;
  }
  .popup-box.popup-in { opacity:1; transform:scale(1) translateY(0); pointer-events:auto; }

  .apps-popup { display:flex; flex-direction:column; }
  .apps-popup-shell { display:flex; flex-direction:column; height:100%; min-height:0; }
  .apps-popup-header {
    display:flex; align-items:center; justify-content:space-between; padding:14px 14px 10px 16px;
  }
  .apps-popup-title { font-size:16px; font-weight:700; color:var(--icon-strong); }
  .apps-popup-close {
    width:34px; height:34px; border:none; border-radius:50%; background:var(--btn-bg);
    display:flex; align-items:center; justify-content:center;
  }
  .apps-popup-tabs { margin:0 14px 12px; }
  .apps-popup-body { flex:1; min-height:0; overflow-y:auto; padding:0 14px 16px; }

  .models-tabs {
    display:flex; gap:6px; background:var(--btn-bg); padding:4px; border-radius:14px;
  }
  .models-tab {
    flex:1; border:none; background:transparent; padding:9px 6px; border-radius:10px;
    font:inherit; font-size:13px; font-weight:600; color:var(--text-faint); cursor:pointer;
    transition:background .22s cubic-bezier(0.16,1,0.3,1), color .22s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .models-tab:active { transform:scale(0.96); }
  .models-tab-active {
    background:var(--surface-strong); color:var(--icon-strong); box-shadow:0 2px 8px rgba(0,0,0,0.10);
  }

  /* Grelha de pills — fluida, suave, dinâmica: cada pill tem largura própria conforme o texto,
     em vez de linhas cheias como antes. */
  .pill-grid {
    display:flex;
    flex-wrap:wrap;
    gap:9px;
    padding-bottom:20px;
    align-content:flex-start;
  }

  .model-pill {
    display:inline-flex;
    align-items:center;
    gap:8px;
    width:fit-content;
    max-width:100%;
    padding:9px 16px 9px 10px;
    border-radius:999px;
    background:var(--surface);
    border:1px solid var(--border-soft);
    cursor:pointer;
    font:inherit;
    white-space:nowrap;
    transition:
      background .18s cubic-bezier(0.16,1,0.3,1),
      border-color .18s cubic-bezier(0.16,1,0.3,1),
      transform .18s cubic-bezier(0.34,1.56,0.64,1),
      box-shadow .18s cubic-bezier(0.16,1,0.3,1);
  }
  .model-pill:active {
    transform:scale(0.95);
    background:var(--row-active);
  }

  .model-pill-icon-wrap {
    width:26px; height:26px; border-radius:50%; background:var(--btn-bg);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }

  .model-pill-label {
    font-size:13.5px;
    font-weight:600;
    color:var(--icon-strong);
    overflow:hidden;
    text-overflow:ellipsis;
  }

  /* Pills de imagem: miniatura circular à esquerda do nome do modelo */
  .model-pill-thumb {
    padding:5px 16px 5px 5px;
  }
  .model-pill-thumb-img {
    width:30px; height:30px; border-radius:50%; object-fit:cover; flex-shrink:0;
    border:1px solid var(--border-faint);
  }

  /* Pills de apps: ícone quadrado arredondado, tamanho consistente entre todos os apps
     — a largura adapta-se ao nome, mas o ícone nunca muda de tamanho entre pills. */
  .apps-pill-grid { }
  .model-pill-app-icon {
    width:24px; height:24px; border-radius:7px; object-fit:contain; flex-shrink:0;
  }

  .icon-mask {
    display:block;
    mask-size:contain; -webkit-mask-size:contain;
    mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat;
    mask-position:center; -webkit-mask-position:center;
    flex-shrink:0;
  }
  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
</style>