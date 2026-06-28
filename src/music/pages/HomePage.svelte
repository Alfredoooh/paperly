<script>
  import { feedTracks, newAlbums, trendTracks, feedLoading, feedError, loadFeed, queue, playTrack } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let bgChip = '#2a2a2a';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  let activeChip = 0;
  const chips = ['Para ti', 'Tendências', 'Novidades'];
  
  $: currentTracks = activeChip === 0 ? $feedTracks : $trendTracks;
  $: queue.set(currentTracks);
</script>

<div class="chips-row">
  {#each chips as chip, i}
    <button class="chip"
      style="background:{activeChip===i?(isDark?'#fff':'#000'):bgChip};color:{activeChip===i?(isDark?'#000':'#fff'):txtPrim};"
      on:click={() => activeChip=i}>{chip}</button>
  {/each}
</div>

{#if $feedLoading}
  <div class="center-pad">
    <div class="spinner" style="border-top-color:{txtPrim}"></div>
  </div>

{:else if $feedError}
  <div class="center-pad col">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span style="color:{txtSec};font-size:15px;margin-top:12px">Não foi possível carregar</span>
    <button class="retry-btn" style="background:{bgCard};color:{txtPrim};margin-top:12px" on:click={loadFeed}>Tentar novamente</button>
  </div>

{:else}
  <div class="section-hdr">
    <span class="section-title" style="color:{txtPrim}">Álbuns em destaque</span>
  </div>
  <div class="h-scroll">
    {#each $newAlbums as a}
      <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} />
    {/each}
  </div>

  <div class="section-hdr" style="margin-top:20px">
    <span class="section-title" style="color:{txtPrim}">{chips[activeChip]}</span>
  </div>
  <div class="tracks-list">
    {#each currentTracks as t}
      <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} />
    {/each}
  </div>
{/if}

<div style="height:{currentTrackExists?148:88}px"></div>

<style>
  .chips-row { display:flex;gap:8px;padding:16px 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .chips-row::-webkit-scrollbar { display:none; }
  .chip { border:none;border-radius:999px;padding:8px 18px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background .15s,color .15s; }
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .h-scroll { display:flex;gap:12px;padding:0 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .tracks-list { display:flex;flex-direction:column;padding:4px 16px; }
  .center-pad { display:flex;align-items:center;justify-content:center;padding:56px; }
  .center-pad.col { flex-direction:column; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .retry-btn { border:none;border-radius:12px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit; }
</style>