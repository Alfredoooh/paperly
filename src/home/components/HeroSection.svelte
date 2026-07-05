<!-- src/routes/home/components/HeroSection.svelte -->
<script>
  export let shouldPlayLottie = false;
  export let lottieFinished = false;
  export let lottieEl;
  export let heroDisplayText = '';
  export let heroLocked = false;
</script>

<main class="content">
  {#if shouldPlayLottie}
    <div class="lottie-wrap" class:lottie-hidden={lottieFinished} bind:this={lottieEl}></div>
  {:else}
    <div class="hero-text-wrap">
      <p class="hero-text">{heroDisplayText}{#if !heroLocked}<span class="hero-caret">|</span>{/if}</p>
    </div>
  {/if}
</main>

<style>
  .content {
    flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; position:relative;
    width: 100%;
  }
  .lottie-wrap {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%, -50%);
    width:220px; height:220px;
    transition:opacity .4s cubic-bezier(0.16,1,0.3,1), transform .4s cubic-bezier(0.16,1,0.3,1);
  }
  .lottie-hidden { opacity:0; transform:translate(-50%,-50%) scale(0.85); pointer-events:none; }
  .hero-text-wrap {
    position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);
    width:min(78vw, 340px); display:flex; align-items:center; justify-content:center; pointer-events:none;
    animation: heroFadeIn .6s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes heroFadeIn {
    from { opacity:0; transform:translate(-50%, -50%) translateY(8px) scale(0.97); }
    to { opacity:1; transform:translate(-50%, -50%) translateY(0) scale(1); }
  }
  .hero-text {
    text-align:center; font-family:Georgia, 'Times New Roman', serif; font-style:italic; font-weight:500;
    font-size:21px; line-height:1.45; color:var(--icon-strong); letter-spacing:0.1px; opacity:0.92; min-height:1.45em;
  }
  .hero-caret {
    display:inline-block; font-style:normal; margin-left:1px;
    animation:heroBlink 0.9s step-end infinite;
    color:var(--icon-strong); font-weight:300;
  }
  @keyframes heroBlink { 50% { opacity:0; } }
</style>