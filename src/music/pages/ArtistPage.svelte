<script>
  import { currentArtist, currentPage, queue, playTrack, loadFeed } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  $: artist = $currentArtist;
  $: if (artist?.topTracks) queue.set(artist.topTracks);
  
  function goBack() { currentPage.set('home'); }
  
  function fmtFans(n) {
    if (!n) return '';
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M fãs`;
    if (n >= 1_000) return `${(n/1_000).toFixed(0)}K fãs`;
    return `${n} fãs`;
  }
</script>

<div class="page">
  
  <!-- Hero -->
  <div class="hero">
    {#if artist?.picture_xl || artist?.picture_big}
      <img src={artist.picture_xl || artist.picture_big} alt={artist?.name} class="hero-img" />
    {:else}
      <div class="hero-img hero-fallback">
        <span>{artist?.name?.[0]}</span>
      </div>
    {/if}
    <div class="hero-overlay"></div>

    <!-- Back button -->
    <button class="back-btn" on:click={goBack}>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <!-- Artist name -->
    <div class="hero-info">
      <span class="hero-name">{artist?.name}</span>
      {#if artist?.nb_fan}
        <span class="hero-fans">{fmtFans(artist.nb_fan)}</span>
      {/if}
    </div>

    <!-- Play all button -->
    <div class="hero-actions">
      <button class="play-all-btn" on:click={() => artist?.topTracks?.[0] && playTrack(artist.topTracks[0])}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        Reproduzir
      </button>
      <button class="follow-btn">Seguir</button>
    </div>
  </div>

  {#if !artist}
    <div class="center-pad">
      <div class="spinner" style="border-top-color:{txtPrim}"></div>
    </div>
  {:else}

    <!-- Top tracks -->
    {#if artist.topTracks?.length}
      <div class="section-hdr">
        <span class="section-title" style="color:{txtPrim}">Músicas populares</span>
      </div>
      <div class="tracks-list">
        {#each artist.topTracks as t, i}
          <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} rank={i+1} />
        {/each}
      </div>
    {/if}

    <!-- Albums -->
    {#if artist.albums?.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">Discografia</span>
      </div>
      <div class="h-scroll">
        {#each artist.albums as a}
          <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} size={148} />
        {/each}
      </div>
    {/if}

    <!-- Related artists -->
    {#if artist.related?.length}
      <div class="section-hdr" style="margin-top:24px">
        <span class="section-title" style="color:{txtPrim}">Artistas relacionados</span>
      </div>
      <div class="h-scroll">
        {#each artist.related as ar}
          <button class="rel-card" on:click={() => { currentArtist.set(null); setTimeout(() => { import('../store/music.js').then(m => m.loadArtist(ar)); }, 50); }}>
            <div class="rel-avatar">
              {#if ar.picture_medium}
                <img src={ar.picture_medium} alt={ar.name} class="rel-img" loading="lazy" />
              {:else}
                <div class="rel-img rel-fallback"><span>{ar.name[0]}</span></div>
              {/if}
            </div>
            <span class="rel-name" style="color:{txtPrim}">{ar.name?.length>12?ar.name.slice(0,12)+'…':ar.name}</span>
          </button>
        {/each}
      </div>
    {/if}

  {/if}

  <div style="height:{currentTrackExists?148:88}px"></div>
</div>

<style>
  .page { padding:0; }

  .hero { position:relative;height:320px;overflow:hidden;flex-shrink:0; }
  .hero-img { width:100%;height:100%;object-fit:cover;display:block; }
  .hero-fallback { background:#333;display:flex;align-items:center;justify-content:center; }
  .hero-fallback span { font-size:80px;font-weight:800;color:rgba(255,255,255,0.3); }
  .hero-overlay { position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); }

  .back-btn { position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);left:16px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(8px); }

  .hero-info { position:absolute;bottom:72px;left:16px;right:16px; }
  .hero-name { display:block;font-size:36px;font-weight:900;color:#fff;letter-spacing:-.8px; }
  .hero-fans { display:block;font-size:14px;color:rgba(255,255,255,0.65);margin-top:4px; }

  .hero-actions { position:absolute;bottom:16px;left:16px;right:16px;display:flex;gap:12px;align-items:center; }
  .play-all-btn { display:flex;align-items:center;gap:8px;background:#FC3C44;border:none;border-radius:999px;padding:12px 24px;font-size:15px;font-weight:700;color:#fff;cursor:pointer; }
  .play-all-btn:active { opacity:0.85; }
  .follow-btn { background:transparent;border:1.5px solid rgba(255,255,255,0.6);border-radius:999px;padding:11px 24px;font-size:15px;font-weight:600;color:#fff;cursor:pointer; }
  .follow-btn:active { opacity:0.7; }

  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:8px 16px 10px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .tracks-list { display:flex;flex-direction:column;padding:0 16px; }
  .h-scroll { display:flex;gap:12px;padding:0 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }

  .rel-card { display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;flex-shrink:0;padding:0; }
  .rel-card:active { opacity:0.7; }
  .rel-avatar { width:80px;height:80px;border-radius:50%;overflow:hidden; }
  .rel-img { width:100%;height:100%;object-fit:cover;display:block; }
  .rel-fallback { background:#333;display:flex;align-items:center;justify-content:center; }
  .rel-fallback span { font-size:22px;font-weight:700;color:#fff; }
  .rel-name { font-size:12px;font-weight:600;text-align:center; }

  .center-pad { display:flex;align-items:center;justify-content:center;padding:60px; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>