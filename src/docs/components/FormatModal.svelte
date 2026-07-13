<!-- src/home/components/FormatModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  // Modal centrado (padrão logout-dialog) para todos os painéis que
  // não são cor: font, size, align, list, insert, table, link, footnote.
  export let activePanel = null; // null | 'font' | 'size' | 'align' | 'list' | 'insert' | 'table' | 'link' | 'footnote'
  export let c;
  export let linkUrlDraft = '';
  export let footnoteDraft = '';
  
  const dispatch = createEventDispatcher();
  
  const FONTS = [
    { label: 'Padrão', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: "'SF Mono', Menlo, monospace" },
    { label: 'Arredondada', value: "'SF Pro Rounded', sans-serif" },
  ];
  const SIZES = ['12', '14', '16', '18', '24', '32', '48'];
  
  function close() { dispatch('close'); }
</script>

{#if activePanel}
  <div class="modal-overlay" on:click={close}></div>
  <div class="modal-card" style="background:{c.dialogBackground}">
    {#if activePanel === 'font'}
      <div class="modal-title" style="color:{c.textPrimary}">Fonte</div>
      <div class="modal-grid">
        {#each FONTS as f}
          <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary};font-family:{f.value}" on:click={() => dispatch('setfont', f.value)}>{f.label}</button>
        {/each}
      </div>
    {:else if activePanel === 'size'}
      <div class="modal-title" style="color:{c.textPrimary}">Tamanho</div>
      <div class="modal-grid">
        {#each SIZES as s}
          <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('setsize', s)}>{s}</button>
        {/each}
      </div>
    {:else if activePanel === 'align'}
      <div class="modal-title" style="color:{c.textPrimary}">Alinhamento</div>
      <div class="modal-grid">
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyLeft')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_left.svg');-webkit-mask-image:url('/icons/svg/docs/align_left.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyCenter')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_center.svg');-webkit-mask-image:url('/icons/svg/docs/align_center.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyRight')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_right.svg');-webkit-mask-image:url('/icons/svg/docs/align_right.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setalign', 'justifyFull')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/align_justify.svg');-webkit-mask-image:url('/icons/svg/docs/align_justify.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
      </div>
    {:else if activePanel === 'list'}
      <div class="modal-title" style="color:{c.textPrimary}">Listas</div>
      <div class="modal-grid">
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setlist', 'insertUnorderedList')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/list_bullet.svg');-webkit-mask-image:url('/icons/svg/docs/list_bullet.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
        <button class="panel-icon-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('setlist', 'insertOrderedList')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/docs/list_number.svg');-webkit-mask-image:url('/icons/svg/docs/list_number.svg');background:{c.iconTint};width:20px;height:20px;"></span>
        </button>
      </div>
    {:else if activePanel === 'insert'}
      <div class="modal-title" style="color:{c.textPrimary}">Inserir</div>
      <div class="modal-grid">
        <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('triggerimage')}>Imagem</button>
      </div>
    {:else if activePanel === 'table'}
      <div class="modal-title" style="color:{c.textPrimary}">Inserir tabela</div>
      <div class="modal-grid">
        <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('inserttable', {rows:2, cols:2})}>2×2</button>
        <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('inserttable', {rows:3, cols:3})}>3×3</button>
        <button class="modal-chip" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('inserttable', {rows:4, cols:3})}>4×3</button>
      </div>
    {:else if activePanel === 'link'}
      <div class="modal-title" style="color:{c.textPrimary}">Inserir link</div>
      <input
        class="modal-input"
        style="background:{c.appbarBtnBg};color:{c.textPrimary}"
        placeholder="https://..."
        bind:value={linkUrlDraft}
        on:keydown={(e) => e.key === 'Enter' && dispatch('confirmlink')}
      />
      <div class="modal-actions">
        <button class="modal-btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('removelink')}>Remover</button>
        <button class="modal-btn-primary" on:click={() => dispatch('confirmlink')}>Aplicar</button>
      </div>
    {:else if activePanel === 'footnote'}
      <div class="modal-title" style="color:{c.textPrimary}">Nova nota de rodapé</div>
      <input
        class="modal-input"
        style="background:{c.appbarBtnBg};color:{c.textPrimary}"
        placeholder="Texto da nota…"
        bind:value={footnoteDraft}
        on:keydown={(e) => e.key === 'Enter' && dispatch('confirmfootnote')}
      />
      <div class="modal-actions">
        <button class="modal-btn-secondary" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={close}>Cancelar</button>
        <button class="modal-btn-primary" on:click={() => dispatch('confirmfootnote')}>Inserir</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0,0,0,0.45);
    animation: fadeIn .26s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .modal-card {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 81;
    min-width: 280px; max-width: 90vw;
    animation: popIn .38s cubic-bezier(0.34, 1.35, 0.64, 1);
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn {
    0% { transform: translate(-50%, -50%) scale(0.90); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  .modal-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; text-align: center; }
  .modal-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .modal-chip {
    border: none; border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-chip:active { transform: scale(0.95); }
  .panel-icon-btn {
    width: 44px; height: 44px; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .panel-icon-btn:active { transform: scale(0.9); }
  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .modal-input {
    width: 100%; border: none; border-radius: 999px; padding: 12px 16px;
    font-size: 14px; outline: none; margin-bottom: 14px; box-sizing: border-box;
  }
  .modal-actions { display: flex; gap: 10px; }
  .modal-btn-primary, .modal-btn-secondary {
    flex: 1; padding: 11px 16px; border-radius: 999px; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; text-align: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .modal-btn-primary { background: #2F7BF6; color: #fff; }
  .modal-btn-primary:active, .modal-btn-secondary:active { transform: scale(0.96); }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay, .modal-card, .modal-chip, .panel-icon-btn, .modal-btn-primary, .modal-btn-secondary { animation: none !important; transition: none !important; }
  }
</style>