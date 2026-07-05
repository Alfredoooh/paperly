<!-- src/routes/home/components/RecordingCard.svelte -->
<script>
  export let recCanvasEl;
  export let recTimerStr = '0:00';
  export let onCancel;
  export let onStop;
</script>

<div class="rec-card">
  <canvas bind:this={recCanvasEl} class="rec-canvas"></canvas>
  <div class="rec-inner">
    <button class="rec-btn pulse-tap" on:click={onCancel}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:18px;height:18px;background:var(--icon-strong)"></span>
    </button>
    <div class="rec-center">
      <div class="rec-dot"></div>
      <span class="rec-timer">{recTimerStr}</span>
    </div>
    <button class="rec-btn rec-send pulse-tap" on:click={onStop}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon-strong)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .rec-card {
    position:relative; overflow:hidden; border-radius:999px; background:var(--surface);
    border:0.5px solid var(--border-soft); box-shadow:0 6px 24px rgba(0,0,0,0.16); height:64px;
    animation:recIn .34s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes recIn {
    from { opacity:0; transform:scale(0.9) translateY(12px); }
    to { opacity:1; transform:scale(1) translateY(0); }
  }
  .rec-canvas { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; }
  .rec-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; height:100%; padding:0 10px; }
  .rec-btn {
    width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%;
    border:0.5px solid var(--border-faint); cursor:pointer; background:var(--btn-bg); flex-shrink:0;
    transition:background .2s cubic-bezier(0.16,1,0.3,1), transform .2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .rec-btn:active { background:var(--btn-bg-active); transform:scale(0.86); }
  .rec-send { background:var(--btn-bg-active); }
  .rec-center { display:flex; align-items:center; gap:8px; flex:1; justify-content:center; pointer-events:none; }
  .rec-dot { width:7px; height:7px; border-radius:50%; background:#FF3B30; flex-shrink:0; animation:recPulse 1.1s ease-in-out infinite; }
  @keyframes recPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:.4; transform:scale(.75); }
  }
  .rec-timer { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--icon-strong); letter-spacing:.06em; }
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