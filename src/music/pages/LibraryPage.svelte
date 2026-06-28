<script>
  import { newAlbums, playlists, artists, loadArtist } from '../store/music.js';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  let libTab = 'playlists';
</script>

<div class="lib-header">
  <span class="lib-title" style="color:{txtPrim}">Biblioteca</span>
</div>

<div class="lib-tabs" style="border-bottom:0.5px solid {divider}">
  {#each [['playlists','Playlists'],['albums','Álbuns'],['artists','Artistas']] as [id,label]}
    <button class="lib-tab"
      style="color:{libTab===id?txtPrim:txtSec};border-bottom:2px solid {libTab===id?'#FC3C44':'transparent'};"
      on:click={() => libTab=id}>{label}</button>
  {/each}
</div>

{#if libTab === 'playlists'}
  <div class="lib-list">
    {#each $playlists as pl}
      <div class="lib-row">
        <div class="lib-sq" style="overflow:hidden;background:#FC3C44;">
          {#if pl.picture_small}
            <img src={pl.picture_small} alt={pl.title} style="width:100%;height:100%;object-fit:cover;" />
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {/if}
        </div>
        <div class="lib-row-info">
          <span class="lib-row-title" style="color:{txtPrim}">{pl.title}</span>
          <span class="lib-row-sub" style="color:{txtSec}">Playlist • {pl.nb_tracks ?? '—'} músicas</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    {/each}
  </div>

{:else if libTab === 'albums'}
  <div class="lib-grid">
    {#each $newAlbums as a}
      <div class="lib-grid-card">
        <div class="lib-grid-img-wrap">
          {#if a.cover_medium}
            <img src={a.cover_medium} alt={a.title} class="lib-grid-img" loading="lazy" />
          {:else}
            <div class="lib-grid-img" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
          {/if}
        </div>
        <span class="lib-grid-title" style="color:{txtPrim}">{a.title?.length>14?a.title.slice(0,14)+'…':a.title}</span>
        <span class="lib-grid-sub" style="color:{txtSec}">{a.artist?.name}</span>
      </div>
    {/each}
  </div>

{:else}
  <div class="lib-list">
    {#each $artists as ar}
      <button class="lib-row" on:click={() => loadArtist(ar)}>
        <div class="lib-avatar" style="overflow:hidden;">
          {#if ar.picture_small}
            <img src={ar.picture_small} alt={ar.name} style="width:100%;height:100%;object-fit:cover;" />
          {:else}
            <span class="lib-avatar-letter">{ar.name[0]}</span>
          {/if}
        </div>
        <div class="lib-row-info">
          <span class="lib-row-title" style="color:{txtPrim}">{ar.name}</span>
          <span class="lib-row-sub" style="color:{txtSec}">Artista</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    {/each}
  </div>
{/if}

<div style="height:{currentTrackExists?148:88}px"></div>

<style>
  .lib-header { display:flex;align-items:center;justify-content:space-between;padding:20px 16px 12px; }
  .lib-title { font-size:28px;font-weight:900;letter-spacing:-.6px; }
  .lib-tabs { display:flex;padding:0 16px; }
  .lib-tab { flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:10px 0;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-0.5px; }
  .lib-list { display:flex;flex-direction:column;padding:8px 16px; }
  .lib-row { display:flex;align-items:center;gap:14px;padding:11px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .lib-row:active { opacity:0.7; }
  .lib-sq { width:52px;height:52px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
  .lib-avatar { width:52px;height:52px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#333; }
  .lib-avatar-letter { font-size:22px;font-weight:700;color:#fff; }
  .lib-row-info { flex:1;min-width:0; }
  .lib-row-title { display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .lib-row-sub { display:block;font-size:13px;margin-top:2px; }
  .lib-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px; }
  .lib-grid-card { cursor:pointer; }
  .lib-grid-card:active { opacity:0.7; }
  .lib-grid-img-wrap { width:100%;aspect-ratio:1;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .lib-grid-img { width:100%;height:100%;object-fit:cover;display:block; }
  .lib-grid-title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .lib-grid-sub { display:block;font-size:12px;margin-top:2px; }
</style>