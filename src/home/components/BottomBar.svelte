<!-- src/routes/home/components/BottomBar.svelte -->
<script>
  import { getThemeColors } from '$shared/theme.js';
  
  export let pendingAttachments = [];
  export let inputText = '';
  export let textInputEl;
  export let onAutoResize;
  export let onKeyDown;
  export let onFocus;
  export let onBlur;
  export let onRemoveAttachment;
  export let onOpenAddPopup;
  export let onOpenAppsPopup;
  export let onSend;
  export let onStartRecording;
  
  export let thinkMoreMode = false;
  export let sheetsEnabled = false;
  export let isDark = false;
  
  $: c = getThemeColors(isDark);
  $: badgeCount = thinkMoreMode ? (sheetsEnabled ? 2 : 1) : 0;
</script>

<div class="bottom-bar" style="background:{c.surface};border-color:{c.divider}">
  {#if pendingAttachments.length}
    <div class="att-preview">
      {#each pendingAttachments as att, i}
        <div class="att-preview-item">
          {#if att.kind === 'image' && att.dataUrl}
            <img src={att.dataUrl} class="att-preview-img" alt="" />
          {:else}
            <div class="att-preview-file" style="background:{c.btnBg}">
              <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:20px;height:20px;background:{c.iconTint}"></span>
            </div>
          {/if}
          <button class="att-remove pulse-tap" style="background:{c.textPrimary}" on:click={() => onRemoveAttachment(i)}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c.background} stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <textarea
    class="chat-input"
    placeholder="Escreve aqui..."
    rows="1"
    style="color:{c.textPrimary}"
    bind:value={inputText}
    bind:this={textInputEl}
    on:input={onAutoResize}
    on:keydown={onKeyDown}
    on:focus={onFocus}
    on:blur={onBlur}
  ></textarea>

  <div class="bb-row">
    <button class="bb-btn pulse-tap" style="background:{c.textPrimary}" on:click={onOpenAddPopup}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:{c.background}"></span>
      {#if badgeCount > 0}
        <span class="bb-badge" style="border-color:{c.surface}">{badgeCount}</span>
      {/if}
    </button>
    <div class="flex1"></div>
    <button class="bb-pill pulse-tap" style="background:{c.textPrimary}" on:click={onOpenAppsPopup}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:18px;height:18px;background:{c.background}"></span>
      <span class="bb-pill-label" style="color:{c.background}">Modelos &amp; Apps</span>
    </button>
    <div style="width:8px"></div>
    {#if inputText.trim() || pendingAttachments.length}
      <button class="bb-btn pulse-tap" style="background:{c.textPrimary}" on:click={onSend}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:{c.background}"></span>
      </button>
    {:else}
      <button class="bb-btn pulse-tap" style="background:{c.textPrimary}" on:click={onStartRecording}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:{c.background}"></span>
      </button>
    {/if}
  </div>
</div>

<style>
  .bottom-bar {
    border-radius:22px;
    border:0.5px solid;
    box-shadow:0 6px 24px rgba(0,0,0,0.16);
    display:flex; flex-direction:column;
    transition: box-shadow .25s cubic-bezier(0.16,1,0.3,1), background .25s cubic-bezier(0.16,1,0.3,1), border-color .25s cubic-bezier(0.16,1,0.3,1);
  }
  .att-preview { display:flex; gap:8px; padding:10px 14px 0; flex-wrap:wrap; }
  .att-preview-item {
    position:relative; flex-shrink:0;
    animation: attIn .3s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes attIn {
    from { opacity:0; transform:scale(0.7); }
    to { opacity:1; transform:scale(1); }
  }
  .att-preview-img { width:56px; height:56px; object-fit:cover; border-radius:10px; }
  .att-preview-file { width:56px; height:56px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .att-remove {
    position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%;
    border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .att-remove:active { transform:scale(0.85); }
  .chat-input {
    resize:none; outline:none; border:none; background:transparent; font-size:15px; line-height:1.5;
    padding:13px 18px 0; width:100%; font-family:inherit;
    max-height:150px; overflow-y:auto; -webkit-user-select:text; user-select:text;
    transition: height .12s cubic-bezier(0.16,1,0.3,1);
  }
  .chat-input::placeholder { color:inherit; opacity:.45; }
  .bb-row { display:flex; align-items:center; height:52px; padding:0 6px; }
  .flex1 { flex:1; }

  /* Botão circular padrão (+, enviar, microfone) */
  .bb-btn {
    width:40px; height:40px; display:flex; align-items:center; justify-content:center;
    border-radius: 999px;
    border: none;
    cursor:pointer;
    flex-shrink:0;
    transition: filter .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active {
    filter: brightness(0.85);
    transform:scale(0.9);
  }
  @media (hover:hover) and (pointer:fine) {
    .bb-btn:hover { filter: brightness(1.15); }
  }

  .bb-badge {
    position:absolute; top:-3px; right:-3px; min-width:16px; height:16px; padding:0 4px;
    border-radius:999px; background:#FF3B30; color:#fff; font-size:10px; font-weight:800;
    display:flex; align-items:center; justify-content:center; line-height:1;
    border:1.5px solid; box-shadow:0 1px 3px rgba(0,0,0,0.3);
    font-variant-numeric:tabular-nums; pointer-events:none;
    animation: badgePop .28s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes badgePop {
    from { opacity:0; transform:scale(0.4); }
    to { opacity:1; transform:scale(1); }
  }

  /* Botão pill "Modelos & Apps" */
  .bb-pill {
    display:flex; align-items:center; gap:6px; height:40px; padding:0 14px; border-radius:999px;
    border: none;
    cursor:pointer; flex-shrink:0;
    transition: filter .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-pill:active {
    filter: brightness(0.85);
    transform:scale(0.93);
  }
  @media (hover:hover) and (pointer:fine) {
    .bb-pill:hover { filter: brightness(1.15); }
  }
  .bb-pill-label {
    font-size:14px; font-weight:700;
    white-space:nowrap;
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