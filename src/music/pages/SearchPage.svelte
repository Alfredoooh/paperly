<script>
  import { PROXY, queue, playTrack, loadArtist } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';

  export let isDark   = false;
  export let bgCard   = '#242424';
  export let txtPrim  = '#ffffff';
  export let txtSec   = '#aaaaaa';
  export let divider  = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;

  let query     = '';
  let results   = null;
  let searching = false;
  let searchErr = false;
  let debounce  = null;

  const genres = [
    { label:'Pop',        color:'#FC3C44' },
    { label:'Hip-Hop',    color:'#5856D6' },
    { label:'R&B',        color:'#FF9500' },
    { label:'Electronic', color:'#007AFF' },
    { label:'Rock',       color:'#34C759' },
    { label:'Afro',       color:'#FF2D55' },
    { label:'Jazz',       color:'#AF52DE' },
    { label:'Clássica',   color:'#FF6B35' },
    { label:'Kizomba',    color:'#E8002D' },
    { label:'Kuduro',     color:'#FF9F0A' },
  ];

  async function doSearch(q) {
    if (!q?.trim()) { results = null; return; }
    searching = true; searchErr = false;
    try {
      const res = await fetch(`${PROXY}/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      results = await res.json();
      queue.set(results.tracks || []);
    } catch {
      searchErr = true;
    } finally {
      searching = false;
    }
  }

  function onInput(e) {
    query = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => doSearch(query), 400);
  }

  function clear() { query = ''; results = null; }
</script>

<div class="page">

  <!-- Search bar -->
  <div class="search-wrap">
    <div class="search-bar" style="background:{bgCard}">
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="search-input" style="color:{txtPrim}" placeholder="O que queres ouvir?"
        value={query} on:input={onInput} />
      {#if query}
        <button class="clear-btn" on:click={clear}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      {/if}
    </div>
  </div>

  {#if searching}
    <div class="center-pad">
      <div class="spinner" style="border-top-color:{txtPrim}"></div>
    </div>

  {:else if searchErr}
    <div class="center-pad col">
      <span style="color:{txtSec}">Erro ao pesquisar</span>
    </div>

  {:else if results}

    {#if results.tracks?.length}
      <div class="section-hdr">
        <span class="section-title" style="color:{txtPrim}">Músicas</span>
        <span style="color:{txtSec};font-size:13px">{results.tracks.length} resultados</span>
      </div>
      <div class="tracks-list">
        {#each results.tracks as t}
          <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} />
        {/each}
      </div>
    {/if}

    {#if results.artists?.length}
      <div class="section-hdr" style="margin-top:20px">
        <span class="section-title" style="color:{txtPrim}">Artistas</span>
      </div>
      <div class="h-scroll">
        {#each results.artists as ar}
          <button class="artist-card" on:click={() => loadArtist(ar)}>
            <div class="artist-avatar">
              {#if ar.picture_medium}
                <img src={ar.picture_medium} alt={ar.name} class="artist-img" loading="lazy" />
              {:else}
                <div class="artist-img fallback-avatar">
                  <span>{ar.name[0]}</span>
                </div>
              {/if}
            </div>
            <span class="artist-name" style="color:{txtPrim}">{ar.name?.length>12?ar.name.slice(0,12)+'…':ar.name}</span>
            <span class="artist-sub" style="color:{txtSec}">Artista</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if results.albums?.length}
      <div class="section-hdr" style="margin-top:20px">
        <span class="section-title" style="color:{txtPrim}">Álbuns</span>
      </div>
      <div class="h-scroll">
        {#each results.albums as a}
          <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} size={148} />
        {/each}
      </div>
    {/if}

    {#if !results.tracks?.length && !results.albums?.length && !results.artists?.length}
      <div class="center-pad col">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span style="color:{txtSec};font-size:15px;margin-top:12px">Nenhum resultado para "{query}"</span>
      </div>
    {/if}

  {:else}
    <!-- Explore genres -->
    <div class="section-hdr">
      <span class="section-title" style="color:{txtPrim}">Explorar</span>
    </div>
    <div class="genre-grid">
      {#each genres as g}
        <button class="genre-card" style="background:{g.color}">
          <span class="genre-label">{g.label}</span>
        </button>
      {/each}
    </div>
  {/if}

</div>

<div style="height:{currentTrackExists?148:88}px"></div>

<style>
  .page { padding:0 0 8px; }
  .search-wrap { padding:16px 16px 8px; }
  .search-bar { display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .clear-btn { border:none;background:transparent;cursor:pointer;display:flex;padding:0; }
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:8px 16px 10px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .tracks-list { display:flex;flex-direction:column;padding:0 16px; }
  .h-scroll { display:flex;gap:16px;padding:0 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .artist-card { display:flex;flex-direction:column;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;flex-shrink:0;padding:0; }
  .artist-card:active { opacity:0.7; }
  .artist-avatar { width:88px;height:88px;border-radius:50%;overflow:hidden; }
  .artist-img { width:100%;height:100%;object-fit:cover;display:block; }
  .fallback-avatar { background:#333;display:flex;align-items:center;justify-content:center; }
  .fallback-avatar span { font-size:28px;font-weight:700;color:#fff; }
  .artist-name { font-size:13px;font-weight:600;text-align:center; }
  .artist-sub { font-size:11px;text-align:center; }
  .genre-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px; }
  .genre-card { border:none;border-radius:12px;padding:20px 16px;cursor:pointer;text-align:left;min-height:80px;display:flex;align-items:flex-end;transition:opacity .15s; }
  .genre-card:active { opacity:0.8; }
  .genre-label { font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px; }
  .center-pad { display:flex;align-items:center;justify-content:center;padding:60px 16px; }
  .center-pad.col { flex-direction:column; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>