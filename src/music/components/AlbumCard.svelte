<script>
  export let album;
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let bgCard = '#242424';
  export let onClick = () => {};
</script>

<button class="card" on:click={onClick}>
  <div class="img-wrap">
    {#if album.cover_medium}
      <img src={album.cover_medium} alt={album.title} class="img" loading="lazy" />
    {:else}
      <div class="img" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
    {/if}
  </div>
  <span class="title" style="color:{txtPrim}">{album.title?.length>16?album.title.slice(0,16)+'…':album.title}</span>
  <span class="artist" style="color:{txtSec}">{album.artist?.name}</span>
</button>

<style>
  .card { flex-shrink:0;width:148px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .card:active { opacity:0.7; }
  .img-wrap { width:148px;height:148px;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .img { width:100%;height:100%;object-fit:cover;display:block; }
  .title { display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .artist { display:block;font-size:12px;margin-top:2px; }
</style>