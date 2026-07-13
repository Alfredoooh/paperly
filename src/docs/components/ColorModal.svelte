<!-- src/home/components/ColorModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  // Modal centrado (mesmo padrão scale-in do logout-dialog do
  // SettingsPage). Grelha de cores predefinidas + secção "Criadas" com
  // as cores que o utilizador adicionou via ColorPickerModal, mais um
  // botão "Adicionar cor" que fecha este modal e delega ao pai a
  // abertura do ColorPickerModal.
  export let visible = false;
  export let c;
  export let customColors = []; // array de hex strings, ex: ['#AABBCC']

  const dispatch = createEventDispatcher();

  const PRESET_COLORS = [
    '#000000', '#3C3C43', '#8E8E93', '#F0384A',
    '#E8720F', '#F5B700', '#1FA34A', '#0FA3A3',
    '#2F7BF6', '#5856D6', '#8B3FE0', '#D63384',
  ];

  function pick(hex) {
    dispatch('select', hex);
  }
  function requestAddColor() {
    dispatch('addcolor');
  }
</script>

{#if visible}
  <div class="modal-overlay" on:click={() => dispatch('close')}></div>
  <div class="modal-card" style="background:{c.dialogBackground}">
    <div class="modal-title" style="color:{c.textPrimary}">Cor do texto</div>

    <div class="color-grid">
      {#each PRESET_COLORS as hex}
        <button class="color-dot" style="background:{hex}" on:click={() => pick(hex)} aria-label={hex}></button>
      {/each}
    </div>

    {#if customColors.length > 0}
      <div class="modal-subtitle" style="color:{c.textSecondary}">Criadas</div>
      <div class="color-grid">
        {#each customColors as hex}
          <button class="color-dot" style="background:{hex}" on:click={() => pick(hex)} aria-label={hex}></button>
        {/each}
      </div>
    {/if}

    <button class="add-color-btn" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={requestAddColor}>
      <span class="add-plus">+</span>
      Adicionar cor
    </button>
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
  .modal-subtitle { font-size: 12px; font-weight: 600; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
  .color-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .color-dot {
    width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(127,127,127,0.18);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .color-dot:active { transform: scale(0.86); }
  .add-color-btn {
    width: 100%; margin-top: 16px; border: none; border-radius: 999px;
    padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    -webkit-tap-highlight-color: transparent;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .add-color-btn:active { transform: scale(0.97); }
  .add-plus { font-size: 17px; font-weight: 700; line-height: 1; }

  @media (prefers-reduced-motion: reduce) {
    .modal-overlay, .modal-card, .color-dot, .add-color-btn { animation: none !important; transition: none !important; }
  }
</style>