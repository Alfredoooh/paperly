<script>
  import { feedTracks, newAlbums, trendTracks, artists, playlists, feedLoading, feedError, loadFeed, queue, playTrack, loadArtist, currentPage, ACCENT } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let bgChip = '#2a2a2a';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  $: greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();
  
  $: {
    queue.set($feedTracks);
  }
  
  const genreColors = [
    { label: 'Pop', color: '#FC3C44' },
    { label: 'Hip-Hop', color: '#5856D6' },
    { label: 'R&B', color: '#FF9500' },
    { label: 'Electronic', color: '#007AFF' },
    { label: 'Rock', color: '#34C759' },
    { label: 'Afro', color: '#FF2D55' },
    { label: 'Jazz', color: '#AF52DE' },
    { label: 'Clássica', color: '#FF6B35' },
  ];
</script>

<div class="page">
  
  {#if $feedLoading}
    <div class="center-pad">
      <div class="spinner" style="border-top-color:{txtPrim}"></div>
    </div>

  {:else if $feedError}
    <div class="center-pad col">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style="color:{txtSec};font-size:15px;margin-top:12px">Não foi possível carregar</span>
      <button class="retry-btn" style="background:{bgCard};color:{txtPrim}" on:click={loadFeed}>Tentar novamente</button>
    </div>

  {:else}

    <!-- Greeting -->
    <div class="greeting-wrap">
      <h2 class="greeting" style="color:{txtPrim}">{greeting} 👋</h2>
    </div>

    <!-- Quick picks (top 6 albums as grid) -->
    {#if $newAlbums.length}
      <div class="quick-grid">
        {#each $newAlbums.slice(0,6) as a}
          <button class="quick-card" style="background:{bgCard}">
            {#if a.cover_medium}
              <img src={a.cover_medium} alt={a.title} class="quick-img" loading="lazy" />
            {:else}
              <div class="quick-img" style="background:#333;display:flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
            {/if}
            <span class="quick-title" style="color:{txtPrim}">{a.title?.length>14?a.title.slice(0,14)+'…':a.title}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Top Artistas -->
    {#if $artists.length}
      <div class="section-hdr">
        <span class="section-title" style="color:{txtPrim}">Artistas em destaque</span>
      </div>
      <div class="h-scroll">
        {#each $artists as ar}
          <button class="artist-card" on:click={() => loadArtist(ar)}>
            <div class="artist-avatar">
              {#if ar.picture_medium}
                <img src={ar.picture_medium} alt={ar.name} class="artist-img" loading="lazy" />
              {:else}
                <div class="artist-img" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:22px;font-weight:700;color:#fff">{ar.name[0]}</span>
                </div>
              {/if}
            </div>
            <span class="artist-name" style="color:{txtPrim}">{ar.name?.length>12?ar.name.slice(0,12)+'…':ar.name}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Charts globais -->
    {#if $feedTracks.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">🔥 Charts globais</span>
      </div>
      <div class="tracks-list">
        {#each $feedTracks.slice(0,20) as t, i}
          <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} rank={i+1} />
        {/each}
      </div>
    {/if}

    <!-- Álbuns em destaque -->
    {#if $newAlbums.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">Álbuns em destaque</span>
      </div>
      <div class="h-scroll">
        {#each $newAlbums as a}
          <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} size={160} />
        {/each}
      </div>
    {/if}

    <!-- Playlists editoriais -->
    {#if $playlists.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">Playlists editoriais</span>
      </div>
      <div class="h-scroll">
        {#each $playlists as pl}
          <button class="playlist-card">
            <div class="playlist-img-wrap">
              {#if pl.picture_medium}
                <img src={pl.picture_medium} alt={pl.title} class="playlist-img" loading="lazy" />
              {:else}
                <div class="playlist-img" style="background:#FC3C44;display:flex;align-items:center;justify-content:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
              {/if}
            </div>
            <span class="playlist-title" style="color:{txtPrim}">{pl.title?.length>16?pl.title.slice(0,16)+'…':pl.title}</span>
            <span class="playlist-sub" style="color:{txtSec}">{pl.nb_tracks} músicas</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Géneros -->
    <div class="section-hdr" style="margin-top:24px">
      <span class="section-title" style="color:{txtPrim}">Explorar géneros</span>
    </div>
    <div class="genre-grid">
      {#each genreColors as g}
        <button class="genre-card" style="background:{g.color}">
          <span class="genre-label">{g.label}</span>
        </button>
      {/each}
    </div>

    <!-- Tendências -->
    {#if $trendTracks.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">Tendências</span>
      </div>
      <div class="tracks-list">
        {#each $trendTracks.slice(0,15) as t, i}
          <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} rank={i+1} />
        {/each}
      </div>
    {/if}

  {/if}

  <div style="height:{currentTrackExists?148:88}px"></div>
</div>

<style>
  .page { padding:0; }

  .greeting-wrap { padding:20px 16px 12px; }
  .greeting { font-size:26px;font-weight:800;letter-spacing:-.5px;margin:0; }

  .quick-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 16px 8px; }
  .quick-card { display:flex;align-items:center;gap:10px;background:transparent;border:none;cursor:pointer;border-radius:8px;padding:0;overflow:hidden;text-align:left;transition:opacity .15s; }
  .quick-card:active { opacity:0.7; }
  .quick-img { width:52px;height:52px;object-fit:cover;flex-shrink:0;border-radius:6px; }
  .quick-title { font-size:13px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:8px 16px 10px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }

  .h-scroll { display:flex;gap:12px;padding:0 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }

  .artist-card { display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;flex-shrink:0;padding:0; }
  .artist-card:active { opacity:0.7; }
  .artist-avatar { width:80px;height:80px;border-radius:50%;overflow:hidden; }
  .artist-img { width:100%;height:100%;object-fit:cover;display:block; }
  .artist-name { font-size:12px;font-weight:600;text-align:center; }

  .tracks-list { display:flex;flex-direction:column;padding:0 16px; }

  .playlist-card { flex-shrink:0;width:148px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .playlist-card:active { opacity:0.7; }
  .playlist-img-wrap { width:148px;height:148px;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .playlist-img { width:100%;height:100%;object-fit:cover;display:block; }
  .playlist-title { display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .playlist-sub { display:block;font-size:12px;margin-top:2px; }

  .genre-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 8px; }
  .genre-card { border:none;border-radius:12px;padding:20px 16px;cursor:pointer;text-align:left;min-height:72px;display:flex;align-items:flex-end;transition:opacity .15s; }
  .genre-card:active { opacity:0.8; }
  .genre-label { font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px; }

  .center-pad { display:flex;align-items:center;justify-content:center;padding:80px 16px; }
  .center-pad.col { flex-direction:column;gap:0; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .retry-btn { border:none;border-radius:12px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:12px; }
</style>