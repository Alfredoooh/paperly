<script>
  import { createEventDispatcher, afterUpdate } from 'svelte';
  export let isDark = false;
  export let open   = false;

  const dispatch = createEventDispatcher();

  function close() { dispatch('close'); }

  let startY = 0, dy = 0, dragging = false, startH = 0;
  let sheetEl;

  // Sempre que open passa a true, limpa qualquer transform inline deixado pelo drag
  afterUpdate(() => {
    if (open && sheetEl) {
      sheetEl.style.transform = '';
      sheetEl.style.transition = '';
    }
  });

  function onDown(e) {
    dragging = true; startY = e.touches?.[0]?.clientY ?? e.clientY;
    dy = 0; startH = sheetEl?.offsetHeight || 1;
    if (sheetEl) sheetEl.style.transition = 'none';
  }
  function onMove(e) {
    if (!dragging) return;
    const y = e.touches?.[0]?.clientY ?? e.clientY;
    dy = Math.max(0, y - startY);
    if (sheetEl) sheetEl.style.transform = `translateY(${dy}px)`;
  }
  function onUp() {
    if (!dragging) return; dragging = false;
    if (sheetEl) sheetEl.style.transition = '';
    const threshold = Math.min(140, startH * 0.3);
    if (dy > threshold) {
      if (sheetEl) sheetEl.style.transform = 'translateY(100%)';
      setTimeout(close, 350);
    } else {
      if (sheetEl) sheetEl.style.transform = '';
    }
    dy = 0;
  }
</script>

<div class="overlay" class:open on:click={close}></div>
<div class="sheet" class:open class:dark={isDark} bind:this={sheetEl}>
  <div class="handle-wrap" on:pointerdown={onDown} on:pointermove={onMove} on:pointerup={onUp} on:pointercancel={onUp}>
    <div class="handle-bar" style="background:{isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}"></div>
  </div>
  <slot />
</div>

<style>
  .overlay {
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.08); z-index:200;
    opacity:0; pointer-events:none;
    backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px);
    transition:opacity .4s ease, backdrop-filter .4s ease;
  }
  .overlay.open {
    opacity:1; pointer-events:auto;
    backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
    transition:opacity .3s ease, backdrop-filter .3s ease;
  }

  .sheet {
    position:fixed; bottom:0; left:0; right:0; z-index:201;
    transform:translateY(100%);
    transition:transform .4s cubic-bezier(0.4,0,0.2,1);
    border-radius:12px 12px 0 0; max-height:85vh; overflow-y:auto;
    background:var(--app-surface, #FFFFFF);
    will-change:transform;
  }
  .sheet.dark { background:#1C1C1E; }
  .sheet.open { transform:translateY(0); }

  .handle-wrap { display:flex; justify-content:center; padding:12px 0 4px; cursor:grab; touch-action:none; }
  .handle-wrap:active { cursor:grabbing; }
  .handle-bar { width:36px; height:4px; border-radius:2px; }

  @media (min-width:768px) {
    .sheet { left:50%; right:auto; width:400px; transform:translateX(-50%) translateY(100%); }
    .sheet.open { transform:translateX(-50%) translateY(0); }
  }
</style>