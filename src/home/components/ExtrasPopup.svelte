<!-- src/routes/home/components/ExtrasPopup.svelte -->
<script>
  export let showPopup = false;
  export let popupVisible = false;
  export let popupMode = '';
  export let popupPos = { bottom: 0, left: 0 };
  export let popupFading = false;
  export let POPUP_W = 230;

  export let flashMode = true;
  export let thinkMoreMode = false;
  export let sheetsEnabled = false;

  export let onClose;
  export let onSwitchPopup;
  export let onAddFile;
  export let onToggleFlash;
  export let onToggleThink;
  export let onToggleSheets;

  const EXTRAS_ROWS = [
    { key: 'flash',  title: 'Flash',      ico: 'flash',  icoOn: 'flash_filled'  },
    { key: 'think',  title: 'Think More', ico: 'brain',  icoOn: 'brain_filled'  },
    { key: 'sheets', title: 'Sheets',     ico: 'sheets', icoOn: 'sheets_filled' },
  ];

  function isActive(key) {
    if (key === 'flash') return flashMode;
    if (key === 'think') return thinkMoreMode;
    return sheetsEnabled;
  }
  function runToggle(key) {
    if (key === 'flash') onToggleFlash();
    else if (key === 'think') onToggleThink();
    else onToggleSheets();
  }
</script>

{#if showPopup}
  <div class="popup-overlay" on:click={onClose}></div>
  <div class="popup-box" class:popup-in={popupVisible} style="bottom:{popupPos.bottom}px;left:{popupPos.left}px;width:{POPUP_W}px;">
    <div class="popup-content" class:fading={popupFading}>
      {#if popupMode === 'add'}
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/image.svg');-webkit-mask-image:url('/icons/svg/image.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label">Enviar Imagem</span>
          <input type="file" accept="image/*" style="display:none" on:change={(e) => onAddFile(e, 'image')} />
        </label>
        <div class="popup-sep"></div>
        <label class="popup-row pulse-tap" style="cursor:pointer">
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label">Enviar Ficheiro</span>
          <input type="file" accept="*/*" style="display:none" on:change={(e) => onAddFile(e, 'file')} />
        </label>
        <div class="popup-sep"></div>
        <button class="popup-row pulse-tap" on:click={() => onSwitchPopup('extras')}>
          <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/extras.svg');-webkit-mask-image:url('/icons/svg/extras.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
          <span class="popup-label" style="flex:1">Extras</span>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_right.svg');-webkit-mask-image:url('/icons/svg/arrow_right.svg');width:13px;height:13px;background:var(--icon-faint)"></span>
        </button>
      {:else if popupMode === 'extras'}
        <button class="popup-row popup-back pulse-tap" on:click={() => onSwitchPopup('add')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');width:15px;height:15px;background:var(--icon-faint)"></span>
          <span class="popup-label" style="color:var(--text-faint);font-size:13px">Extras</span>
        </button>
        <div class="popup-sep"></div>
        {#each EXTRAS_ROWS as row, i}
          {#if i > 0}<div class="popup-sep"></div>{/if}
          <button class="popup-row pulse-tap" style={isActive(row.key) ? 'background:var(--row-active)' : ''} on:click={() => runToggle(row.key)}>
            <div class="popup-icon-wrap"><span class="icon-mask" style="mask-image:url('/icons/svg/{isActive(row.key) ? row.icoOn : row.ico}.svg');-webkit-mask-image:url('/icons/svg/{isActive(row.key) ? row.icoOn : row.ico}.svg');width:17px;height:17px;background:var(--icon-strong)"></span></div>
            <span class="popup-label" style="flex:1">{row.title}</span>
            {#if isActive(row.key)}<div class="popup-active-dot"></div>{/if}
          </button>
        {/each}
      {/if}
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
  .popup-content { transition:opacity .15s cubic-bezier(0.16,1,0.3,1), transform .15s cubic-bezier(0.16,1,0.3,1); }
  .popup-content.fading { opacity:0; transform:translateY(4px); pointer-events:none; }
  .popup-row {
    display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px;
    background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left;
    transition:background .16s cubic-bezier(0.16,1,0.3,1);
  }
  .popup-row:active { background:var(--row-active); }
  .popup-back { padding:9px 14px; }
  .popup-icon-wrap {
    width:32px; height:32px; border-radius:50%; background:var(--btn-bg);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .popup-label { font-size:15px; font-weight:500; color:var(--icon-strong); flex:1; }
  .popup-sep { height:0.5px; background:var(--border-faint); margin:0 14px; }
  .popup-active-dot { width:7px; height:7px; border-radius:50%; background:var(--icon-strong); flex-shrink:0; }
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