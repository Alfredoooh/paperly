<script>
  function goHome() {
    window.location.href = '/home/';
  }
</script>

<div class="root">
  <div class="code">404</div>
  <h1>Página não encontrada</h1>
  <p>O link que tentaste aceder não existe ou foi movido.</p>
  <button class="btn pulse-tap" on:click={goHome}>Voltar à página inicial</button>
</div>

<style>
  :global(html), :global(body) { height:100%; margin:0; padding:0; background:#0b0b0d; }
  .root {
    min-height:100dvh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    text-align:center;
    padding:24px;
    font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
    color:#fff;
    background:#0b0b0d;
  }
  .code {
    font-size:88px;
    font-weight:800;
    line-height:1;
    background:linear-gradient(135deg,#6ea8ff,#2F7BF6);
    -webkit-background-clip:text;
    background-clip:text;
    color:transparent;
    margin-bottom:12px;
  }
  h1 { font-size:20px; font-weight:700; margin:0 0 8px; }
  p { font-size:14.5px; color:rgba(255,255,255,0.55); margin:0 0 28px; max-width:320px; }
  .btn {
    padding:14px 28px;
    border-radius:999px;
    border:none;
    background:#2F7BF6;
    color:#fff;
    font-size:15px;
    font-weight:700;
    cursor:pointer;
    font-family:inherit;
  }
  .pulse-tap { transition:transform .14s cubic-bezier(0.25,0.46,0.45,0.94), opacity .14s ease; }
  .pulse-tap:active { transform:scale(0.96); opacity:.85; }
</style>