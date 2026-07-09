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
          <button class="att-remove" on:click={() => onRemoveAttachment(i)}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="input-row">
    <button class="bb-btn pulse-tap" on:click={onOpenAddPopup}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');width:22px;height:22px;background:var(--icon-strong)"></span>
      {#if badgeCount > 0}
        <span class="bb-badge">{badgeCount}</span>
      {/if}
    </button>

    <div class="input-wrapper">
      <textarea
        class="chat-input"
        placeholder="Mensagem"
        rows="1"
        bind:value={inputText}
        bind:this={textInputEl}
        on:input={onAutoResize}
        on:keydown={onKeyDown}
        on:focus={onFocus}
        on:blur={onBlur}
      ></textarea>
    </div>

    <button class="bb-btn pulse-tap" on:click={onOpenAppsPopup} title="Modelos & Apps">
      <span class="icon-mask" style="mask-image:url('/icons/svg/preview_filled.svg');-webkit-mask-image:url('/icons/svg/preview_filled.svg');width:20px;height:20px;background:var(--icon-strong)"></span>
    </button>

    {#if inputText.trim() || pendingAttachments.length}
      <button class="bb-btn send-btn pulse-tap" on:click={onSend}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('/icons/svg/ic_send_arrow.svg');width:18px;height:18px;background:#fff"></span>
      </button>
    {:else}
      <button class="bb-btn pulse-tap" on:click={onStartRecording}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/record.svg');-webkit-mask-image:url('/icons/svg/record.svg');width:20px;height:20px;background:var(--icon-strong)"></span>
      </button>
    {/if}
  </div>
</div>

<style>
  .bottom-bar {
    background: var(--surface);
    border-top: 0.5px solid var(--border-soft);
    padding: 8px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    transition: background 0.3s;
  }

  .att-preview {
    display: flex;
    gap: 8px;
    padding: 0 4px 8px;
    flex-wrap: wrap;
  }

  .att-preview-item {
    position: relative;
    flex-shrink: 0;
    animation: attIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes attIn {
    from { opacity: 0; transform: scale(0.7); }
    to { opacity: 1; transform: scale(1); }
  }

  .att-preview-img {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 12px;
  }

  .att-preview-file {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--btn-bg);
  }

  .att-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .att-remove:active {
    transform: scale(0.85);
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  .input-wrapper {
    flex: 1;
    background: var(--btn-bg);
    border-radius: 22px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    min-height: 42px;
    transition: background 0.2s, box-shadow 0.2s;
    border: 0.5px solid var(--border-faint);
  }

  .chat-input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    line-height: 1.4;
    resize: none;
    outline: none;
    font-family: inherit;
    color: var(--icon-strong);
    padding: 0;
    max-height: 120px;
    overflow-y: auto;
    transition: height 0.12s cubic-bezier(0.16, 1, 0.3, 1);
    -webkit-user-select: text;
    user-select: text;
  }

  .chat-input::placeholder {
    color: var(--text-faint);
    opacity: 0.7;
  }

  .bb-btn {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    position: relative;
    transition: background 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .bb-btn:active {
    background: var(--btn-bg-active);
    transform: scale(0.9);
  }

  .send-btn {
    background: var(--accent, #007aff);
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
  }

  .send-btn:active {
    background: var(--accent-active, #005fc7);
    transform: scale(0.9);
    box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
  }

  .bb-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ff3b30;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    border: 2px solid var(--surface);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
    animation: badgePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes badgePop {
    from { opacity: 0; transform: scale(0.4); }
    to { opacity: 1; transform: scale(1); }
  }

  .icon-mask {
    display: block;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    flex-shrink: 0;
  }

  .pulse-tap {
    transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pulse-tap:active {
    transform: scale(0.96);
    opacity: 0.8;
  }
</style>