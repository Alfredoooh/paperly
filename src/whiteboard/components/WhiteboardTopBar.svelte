<script>
  import { localIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';

  export let c;
  export let boardName = 'Design sem título';
  export let savedState = 'saved';
  export let canUndo = false;
  export let canRedo = false;

  const dispatch = createEventDispatcher();

  function handleNameInput(e) { dispatch('namechange', e.target.value); }
  function handleNameBlur(e) {
    if (!e.target.value || !e.target.value.trim()) {
      e.target.value = 'Design sem título';
      dispatch('namechange', 'Design sem título');
    }
  }
</script>

<div class="appbar" style="background:{c.background};border-bottom:0.5px solid {c.divider}">
  <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('back')} aria-label="Voltar">
    <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_left_24_regular')}');-webkit-mask-image:url('{localIconPath('arrow_undo_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
  </button>

  <div class="appbar-center">
    <input class="board-name-input" style="color:{c.textPrimary}" value={boardName} on:input={handleNameInput} on:blur={handleNameBlur} aria-label="Nome do design" />
    <span class="save-state" style="color:{c.textSecondary}">
      {#if savedState === 'saving'}A gravar…{:else if savedState === 'dirty'}Não gravado{:else}Gravado{/if}
    </span>
  </div>

  <button class="appbar-btn" style="background:{c.appbarBtnBg};opacity:{canUndo ? 1 : 0.4}" on:click={() => dispatch('undo')} disabled={!canUndo} aria-label="Desfazer">
    <span class="icon-mask" style="mask-image:url('{localIconPath('arrow_redo_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
  </button>
  <button class="appbar-btn" style="background:{c.appbarBtnBg};opacity:{canRedo ? 1 : 0.4}" on:click={() => dispatch('redo')} disabled={!canRedo} aria-label="Refazer">
    <span class="icon-mask" style="mask-image:url('{localIconPath('question_circle_24_regular')}');-webkit-mask-image:url('{localIconPath('question_circle_24_regular')}');background:{c.iconTint};width:24px;height:24px;"></span>
  </button>
</div>

<style>
  .appbar { display:flex; align-items:center; gap:8px; padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 10px; flex-shrink:0; background:inherit; }
  .appbar-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent; transition:transform .16s cubic-bezier(0.34,1.56,0.64,1); }
  .appbar-btn:active { transform:scale(0.94); }
  .appbar-btn:disabled { cursor:default; }
  .appbar-center { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; }
  .board-name-input { width:100%; max-width:200px; text-align:center; font-size:16px; font-weight:700; border:none; background:transparent; outline:none; padding:0; }
  .save-state { font-size:11px; font-weight:500; margin-top:1px; white-space:nowrap; }
  .icon-mask { display:block; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>