<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { PROXY, queue, loadArtist, searchBarRect, playTrack } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  const dispatch = createEventDispatcher();
  
  let query = '';
  let results = null;
  let searching = false;
  let searchErr = false;
  let debounce = null;
  let inputEl;
  let bodyEl;
  let appbarEl;
  
  // ---- Container transform (entrada a partir do botão de pesquisa) ----
  let originRect = null;
  let transformReady = false;
  
  // ---- Appbar que recolhe no scroll, input fixo ----
  let scrollTop = 0;
  $: collapseAmt = Math.min(Math.max(scrollTop / 40, 0), 1); // 0 -> expandido, 1 -> recolhido
  
  onMount(async () => {
    let r = null;
    searchBarRect.subscribe(v => r = v)();
    originRect = r;
    searchBarRect.set(null);
    
    await tick();
    transformReady = true;
    await tick();
    inputEl?.focus();
  });
  
  async function doSearch(q) {
    if (!q?.trim()) { results = null; return; }
    searching = true;
    searchErr = false;
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
  
  function clear() { query = '';
    results = null;
    inputEl?.focus(); }
  
  function close() {
    dispatch('close');
  }
  
  function onScroll(e) {
    scrollTop = e.target.scrollTop;
  }
  
  let openMenuFor = null;
  
  function toggleMenu(id) {
    openMenuFor = openMenuFor === id ? null : id;
  }
  
  function addToQueueAndClose(t) {
    queue.update(q => [...q, t]);
    openMenuFor = null;
  }
</script>

<svelte:window on:click={()=> openMenuFor = null} />
  
  <div class="page" class:enter={transformReady} style={originRect && !transformReady ? ` --ox:${originRect.left}px; --oy:${originRect.top}px; --ow:${originRect.width}px; --oh:${originRect.height}px; ` : '' }>
    
    <!-- App bar com input integrado — input sempre fixo, linha de cima recolhe -->
    <div class="appbar" bind:this={appbarEl} style="background:{bgCard ? 'transparent' : 'transparent'}">
      <div class="appbar-row" style="opacity:{1 - collapseAmt};max-height:{collapseAmt>0.85?0:40}px;margin-bottom:{collapseAmt>0.85?0:6}px;">
        <span class="appbar-row-label" style="color:{txtSec}">Pesquisa</span>
      </div>
      <div class="appbar-input-row">
        <div class="search-bar" style="background:{bgCard}">
          <span class="svg-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:16px;height:16px;"></span>
          <input bind:this={inputEl} class="search-input" style="color:{txtPrim}" placeholder="O que queres ouvir?" value={query} on:input={onInput} />
          {#if query}
          <button class="clear-btn" on:click={clear}>
            <span class="svg-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{txtSec};width:14px;height:14px;"></span>
          </button>
        {/if}
      </div>
      <button class="cancel-btn" style="color:{txtPrim}" on:click={close}>Cancelar</button>
    </div>
  </div>

  <div class="scroll-body" bind:this={bodyEl} on:scroll={onScroll}>

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
            <div class="result-row">
              <TrackRow track={t} {isDark} {bgCard} {txtPrim} {txtSec} />
              <button class="circle-btn" style="background:{bgCard}" on:click|stopPropagation={() => playTrack(t)}>
                <span class="svg-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:{txtPrim};width:14px;height:14px;"></span>
              </button>
              <div class="more-wrap">
                <button class="more-btn" on:click|stopPropagation={() => toggleMenu(t.id)}>
                  <span class="svg-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');background:{txtSec};width:16px;height:16px;"></span>
                </button>
                {#if openMenuFor === t.id}
                  <div class="menu" style="background:{bgCard}" on:click|stopPropagation>
                    <button class="menu-item" style="color:{txtPrim}" on:click={() => addToQueueAndClose(t)}>Adicionar à fila</button>
                    <button class="menu-item" style="color:{txtPrim}" on:click={() => { loadArtist(t.artist); openMenuFor = null; }}>Ver artista</button>
                  </div>
                {/if}
              </div>
            </div>
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
          <span class="svg-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:40px;height:40px;"></span>
          <span style="color:{txtSec};font-size:15px;margin-top:12px">Nenhum resultado para "{query}"</span>
        </div>
      {/if}

    {/if}

    <div style="height:{currentTrackExists?148:88}px"></div>
  </div>

</div>

<style>
  .page {
    position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;
    overflow:hidden;
  }
  .page:not(.enter) {
    position:fixed;
    top:var(--oy);left:var(--ox);
    width:var(--ow);height:var(--oh);
    border-radius:14px;
    transform-origin:top left;
  }
  .page.enter {
    top:0;left:0;width:100%;height:100%;
    border-radius:0;
    transition:top .32s cubic-bezier(.2,.8,.2,1),left .32s cubic-bezier(.2,.8,.2,1),
      width .32s cubic-bezier(.2,.8,.2,1),height .32s cubic-bezier(.2,.8,.2,1),
      border-radius .32s cubic-bezier(.2,.8,.2,1);
  }

  .appbar { flex-shrink:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 8px;position:relative;z-index:2; }
  .appbar-row { overflow:hidden;transition:opacity .18s ease,max-height .22s ease,margin-bottom .22s ease; }
  .appbar-row-label { font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em; }
  .appbar-input-row { display:flex;align-items:center;gap:10px; }
  .search-bar { flex:1;display:flex;align-items:center;gap:10px;border-radius:14px;padding:11px 14px; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .clear-btn { border:none;background:transparent;cursor:pointer;display:flex;padding:0; }
  .cancel-btn { border:none;background:transparent;cursor:pointer;font-size:16px;font-family:inherit;padding:0;white-space:nowrap;transition:opacity .15s; }
  .cancel-btn:active { opacity:0.5; }

  .scroll-body { flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch; }

  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:8px 16px 10px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .tracks-list { display:flex;flex-direction:column;padding:0 16px; }

  .result-row { display:flex;align-items:center;gap:6px; }
  .result-row > :global(.row) { flex:1;min-width:0; }
  .circle-btn { width:30px;height:30px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
  .circle-btn:active { opacity:0.6; }
  .more-wrap { position:relative;flex-shrink:0; }
  .more-btn { width:30px;height:30px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .more-btn:active { opacity:0.6; }
  .menu { position:absolute;top:34px;right:0;border-radius:12px;padding:6px;min-width:170px;box-shadow:0 8px 28px rgba(0,0,0,0.35);z-index:10;display:flex;flex-direction:column; }
  .menu-item { background:none;border:none;text-align:left;padding:10px 10px;font-size:14px;font-family:inherit;cursor:pointer;border-radius:8px; }
  .menu-item:active { opacity:0.6; }

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
  .center-pad { display:flex;align-items:center;justify-content:center;padding:60px 16px; }
  .center-pad.col { flex-direction:column; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>