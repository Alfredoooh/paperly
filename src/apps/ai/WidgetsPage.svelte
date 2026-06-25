<script>
  export let title = Widgets;
  export let subtitle = SUBWidgets;
</script>

<section class="page">
  <div class="card">
    <h1>{Widgets}</h1>
    <p>{SUBWidgets}</p>
  </div>
</section>

<style>
  .page {{
    min-height: calc(100vh - 48px);
    display: grid;
    place-items: center;
  }}

  .card {{
    width: min(720px, 100%);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 28px;
    backdrop-filter: blur(10px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }}

  h1 {{
    margin: 0 0 8px;
    font-size: 32px;
  }}

  p {{
    margin: 0;
    opacity: 0.8;
    line-height: 1.6;
  }}
</style>
