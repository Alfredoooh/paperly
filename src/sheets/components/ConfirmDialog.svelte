<!-- components/ConfirmDialog.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let visible = false;
  export let c;
  export let message = '';
  export let confirmLabel = 'Confirmar';
  export let loading = false;
  
  const dispatch = createEventDispatcher();
</script>

{#if visible}
  <div class="logout-overlay logout-overlay-in"></div>
  <div class="logout-dialog logout-dialog-in" style="background:{c.dialogBackground}">
    <p class="logout-dialog-text" style="color:{c.textPrimary}">{message}</p>
    <div class="logout-dialog-actions">
      <button class="logout-btn-cancel" style="background:{c.appbarBtnBg};color:{c.textPrimary}" on:click={() => dispatch('cancel')} disabled={loading}>Cancelar</button>
      <button class="logout-btn-confirm" on:click={() => dispatch('confirm')} disabled={loading}>
        {loading ? 'A processar…' : confirmLabel}
      </button>
    </div>
  </div>
{/if}

<style>
  .logout-overlay {
    position: fixed; inset: 0; z-index: 80;
    background: rgba(0, 0, 0, 0);
    animation: fadeIn .32s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }
  @keyframes fadeIn { to { background: rgba(0, 0, 0, 0.5); } }
  .logout-dialog {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(0.90);
    opacity: 0;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 81;
    min-width: 280px; max-width: 90vw;
    animation: popIn .38s cubic-bezier(0.34, 1.35, 0.64, 1) forwards;
  }
  @keyframes popIn { to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
  .logout-dialog-text { font-size: 16px; margin: 0 0 20px; text-align: center; font-family: inherit; }
  .logout-dialog-actions { display: flex; gap: 12px; justify-content: center; }
  .logout-btn-cancel, .logout-btn-confirm {
    flex: 1; padding: 12px 20px; border-radius: 999px; border: none;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center;
    transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .logout-btn-cancel:active { transform: scale(0.96); }
  .logout-btn-confirm { background: #FF3B30; color: white; }
  .logout-btn-confirm:active { transform: scale(0.96); }
  .logout-btn-cancel:disabled, .logout-btn-confirm:disabled { opacity: .6; }

  @media (prefers-reduced-motion: reduce) {
    .logout-overlay, .logout-dialog, .logout-btn-cancel, .logout-btn-confirm { animation: none !important; transition: none !important; }
  }
</style>