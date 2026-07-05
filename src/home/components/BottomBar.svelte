<!-- src/routes/home/components/BottomBar.svelte -->
<script>
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
  
  // Estado dos extras — usado só para calcular o badge do botão "+"
  export let thinkMoreMode = false;
  export let sheetsEnabled = false;
  
  $: badgeCount = thinkMoreMode ? (sheetsEnabled ? 2 : 1) : 0;
</script>

<div class="bottom-bar">
  {#if pendingAttachments.length}
    <div class="att-preview">
      {#each pendingAttachments as att, i}
        <div class="att-preview-item">
          {#if att.kind === 'image' && att.dataUrl}
            <img src={att.dataUrl} class="att-preview-img" alt="" />
          {:else}
            <div class="att-preview-file">
              <span class="icon-mask" style="mask-image:url('/icons/svg/upload.svg');-webkit-mask-image:url('/icons/svg/upload.svg');width:20px;height:20px;background:var(--icon-strong)"></span>
            </div>
          {/if}
          <button class="att-remove pulse-tap" on:click={() => onRemoveAttachment(i)}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <textarea
    class="chat-input"
    placeholder="Escreve aqui..."
    rows="1"
    bind:value={inputText}
    bind:this={textInputEl}
    on:input={onAutoResize}
    on:keydown={onKeyDown}
    on:focus={onFocus}
    on:blur={onBlur}
  ></textarea>

  <div class="bb-row">
    <button class="bb-btn bb-btn-badge-holder pulse-tap" on:click={onOpenAddPopup}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
      {#if badgeCount > 0}
        <span class="bb-badge">{badgeCount}</span>
      {/if}
    </button>
    <div class="flex1"></div>
    <button class="bb-pill pulse-tap" on:click={onOpenAppsPopup}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
      <span class="bb-pill-label">Apps &amp; Utilitários</span>
    </button>
    <div style="width:8px"></div>
    {#if inputText.trim() || pendingAttachments.length}
      <button class="bb-btn pulse-tap" on:click={onSend}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:var(--icon-strong)"></span>
      </button>
    {:else}
      <button class="bb-btn pulse-tap" on:click={onStartRecording}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
      </button>
    {/if}
  </div>
</div>

<style>
  .bottom-bar {
    border-radius:22px;
    background:var(--surface);
    border:0.5px solid var(--border-soft);
    box-shadow:0 6px 24px rgba(0,0,0,0.16);
    display:flex; flex-direction:column;
    transition: box-shadow .25s cubic-bezier(0.16,1,0.3,1);
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
  .att-preview-file { width:56px; height:56px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--btn-bg); }
  .att-remove {
    position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%;
    background:#000; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .att-remove:active { transform:scale(0.85); }
  .chat-input {
    resize:none; outline:none; border:none; background:transparent; font-size:15px; line-height:1.5;
    padding:13px 18px 0; width:100%; font-family:inherit; color:var(--icon-strong);
    max-height:150px; overflow-y:auto; -webkit-user-select:text; user-select:text;
    transition: height .12s cubic-bezier(0.16,1,0.3,1);
  }
  .chat-input::placeholder { color:var(--text-faint); }
  .bb-row { display:flex; align-items:center; height:52px; padding:0 6px; }
  .flex1 { flex:1; }
  .bb-btn {
    width:40px; height:40px; display:flex; align-items:center; justify-content:center;
    border-radius:50%; border:0.5px solid var(--border-faint);
    cursor:pointer; background:var(--btn-bg); flex-shrink:0;
    transition:background .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-btn:active { background:var(--btn-bg-active); transform:scale(0.86); }
  .bb-btn-badge-holder { position:relative; overflow:visible; }
  .bb-badge {
    position:absolute; top:-3px; right:-3px; min-width:16px; height:16px; padding:0 4px;
    border-radius:999px; background:#FF3B30; color:#fff; font-size:10px; font-weight:800;
    display:flex; align-items:center; justify-content:center; line-height:1;
    border:1.5px solid var(--surface); box-shadow:0 1px 3px rgba(0,0,0,0.3);
    font-variant-numeric:tabular-nums; pointer-events:none;
    animation: badgePop .28s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes badgePop {
    from { opacity:0; transform:scale(0.4); }
    to { opacity:1; transform:scale(1); }
  }
  .bb-pill {
    display:flex; align-items:center; gap:6px; height:40px; padding:0 14px; border-radius:20px;
    border:0.5px solid var(--border-faint); background:var(--btn-bg); cursor:pointer; flex-shrink:0;
    transition:background .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bb-pill:active { background:var(--btn-bg-active); transform:scale(0.93); }
  .bb-pill-label { font-size:14px; font-weight:700; color:var(--icon-strong); white-space:nowrap; }
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