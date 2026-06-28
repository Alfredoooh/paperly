<script>
  import { PROXY, queue, playTrack } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';

  export let isDark   = false;
  export let bgCard   = '#242424';
  export let txtPrim  = '#ffffff';
  export let txtSec   = '#aaaaaa';
  export let currentTrackExists = false;

  let query      = '';
  let results    = null;
  let searching  = false;
  let searchErr  = false;
  let debounce   = null;

  async function doSearch(q) {
    if (!q?.trim()) { results = null; return; }
    searching = true; searchErr = false;
    try {
      const res  = await fetch(`${PROXY}/api/search?q=${encodeURIComponent(q)}`);
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
</script>

<div class="page">
  <div class="search-bar" style="background:{bgCard}">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input class="search-input" style="color:{txtPrim}" placeholder="Artistas, músicas, álbuns…"
      value={query} on:input={onInput} />
    {#if query}
      <button class="clear-btn" on:click={() => { query=''; results=null; }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    {/if}
  </div>

  {#if searching}
    <div class="center-pad">
      <div class="spinner" style="border-top-color:{txtPrim}"></div>
    </div>

  {:else if searchErr}
    <p class="hint" style="color:{txtSec}">Erro ao pesquisar. Tenta novamente.</p>

  {:else if results}
    {#if results.tracks?.length}
      <div class="section-hdr">
        <span class="section-title" style="color:{txtPrim}">Músicas</span>
      </div>
      <div class="tracks-list">
        {#each results.tracks as t}
          <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} />
        {/each}
      </div>
    {/if}

    {#if results.albums?.length}
      <div class="section-hdr" style="margin-top:20px">
        <span class="section-title" style="color:{txtPrim}">Álbuns</span>
      </div>
      <div class="h-scroll">
        {#each results.albums as a}
          <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} />
        {/each}
      </div>
    {/if}

    {#if results.artists?.length}
      <div class="section-hdr" style="margin-top:20px">
        <span class="section-title" style="color:{txtPrim}">Artistas</span>
      </div>
      <div class="artists-list">
        {#each results.artists as ar}
          <div class="artist-row">
            <div class="artist-avatar" style="overflow:hidden;">
              {#if ar.picture_small}
                <img src={ar.picture_small} alt={ar.name} style="width:100%;height:100%;object-fit:cover;" />
              {:else}
                <span class="avatar-letter">{ar.name[0]}</span>
              {/if}
            </div>
            <div class="artist-info">
              <span class="artist-name" style="color:{txtPrim}">{ar.name}</span>
              <span class="artist-sub" style="color:{txtSec}">Artista</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if !results.tracks?.length && !results.albums?.length && !results.artists?.length}
      <p class="hint" style="color:{txtSec}">Nenhum resultado para "{query}"</p>
    {/if}

  {:else}
    <p class="hint" style="color:{txtSec}">Pesquisa músicas, artistas e álbuns</p>
  {/if}
</div>

<div style="height:{currentTrackExists?148:88}px"></div>

<style>
  .page { padding:16px; }
  .search-bar { display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;margin-bottom:16px; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .clear-btn { border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0; }
  .section-hdr { display:flex;align-items:center;padding:8px 0 8px; }
  .section-title { font-size:18px;font-weight:800;letter-spacing:-.3px; }
  .tracks-list { display:flex;flex-direction:column; }
  .h-scroll { display:flex;gap:12px;padding:0 0 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .artists-list { display:flex;flex-direction:column;gap:4px; }
  .artist-row { display:flex;align-items:center;gap:14px;padding:8px 0; }
  .artist-avatar { width:50px;height:50px;border-radius:50%;flex-shrink:0;background:#333;display:flex;align-items:center;justify-content:center; }
  .avatar-letter { font-size:20px;font-weight:700;color:#fff; }
  .artist-info { flex:1;min-width:0; }
  .artist-name { display:block;font-size:15px;font-weight:600; }
  .artist-sub { display:block;font-size:13px;margin-top:2px; }
  .hint { font-size:15px;text-align:center;margin:48px 0 0; }
  .center-pad { display:flex;align-items:center;justify-content:center;padding:56px; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>