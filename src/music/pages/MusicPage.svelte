<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import Drawer from '../components/Drawer.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // Theme
  $: bg        = isDark ? '#121212' : '#ffffff';
  $: bgCard    = isDark ? '#1e1e1e' : '#f5f5f5';
  $: bgChip    = isDark ? '#2a2a2a' : '#efefef';
  $: bgChipAct = isDark ? '#ffffff' : '#000000';
  $: txtPrim   = isDark ? '#ffffff' : '#000000';
  $: txtSec    = isDark ? '#aaaaaa' : '#666666';
  $: divider   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  let drawerOpen = false;
  const menuItems = [
    { icon: 'home_outline', label: 'Início',    action: () => { activeTab = 'home'; drawerOpen = false; } },
    { icon: 'star',         label: 'Favoritos', action: () => showToast('Em breve') },
    { icon: 'history',      label: 'Recentes',  action: () => showToast('Em breve') },
  ];

  // Tabs
  let activeTab = 'home'; // home | search | library
  let activeChip = 0;
  const chips = ['Para ti', 'Escolhas do staff', 'Carregamentos'];

  // Data
  let spotlightTracks = [];
  let newAlbums       = [];
  let newTracks       = [];
  let popularMixes    = [];
  let loading         = true;
  let error           = false;

  const CORS = 'https://corsproxy.io/?';
  const DEEZER = 'https://api.deezer.com';

  async function deezer(path) {
    const r = await fetch(CORS + encodeURIComponent(DEEZER + path));
    return r.json();
  }

  onMount(async () => {
    try {
      const [chart, editorial, newReleases] = await Promise.all([
        deezer('/chart/0/tracks?limit=10'),
        deezer('/editorial/0/releases?limit=6'),
        deezer('/chart/0/albums?limit=6'),
      ]);
      spotlightTracks = (chart.data || []).slice(0, 6);
      newAlbums       = (newReleases.data || []).slice(0, 6);
      newTracks       = (chart.data || []).slice(0, 5);
      popularMixes    = (editorial.data || []).slice(0, 4);
    } catch(e) {
      error = true;
    } finally {
      loading = false;
    }
  });

  function fmtSec(s) {
    if (!s) return '';
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  let currentTrack = null;
  let playing = false;
  let audio = null;

  function playTrack(track) {
    if (!track?.preview) { showToast('Sem preview disponível'); return; }
    if (currentTrack?.id === track.id) {
      if (playing) { audio?.pause(); playing = false; }
      else { audio?.play(); playing = true; }
      return;
    }
    audio?.pause();
    currentTrack = track;
    audio = new Audio(track.preview);
    audio.play();
    playing = true;
    audio.onended = () => { playing = false; };
  }
</script>

<div class="root" style="background:{bg};color:{txtPrim}">

  <Drawer {isDark} {user} open={drawerOpen} {menuItems}
    on:close={() => drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to: 'settings' })} />

  <!-- APP BAR -->
  <div class="appbar" style="border-bottom:0.5px solid {divider};background:{bg}">
    <button class="appbar-btn" on:click={() => drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
    </button>
    <div class="appbar-logo">
      <img src="/icons/png/music.png" alt="Music" class="appbar-logo-img" />
    </div>
    <button class="appbar-btn" on:click={() => activeTab = 'search'}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtPrim};width:20px;height:20px;"></span>
    </button>
  </div>

  <!-- BODY -->
  <div class="body">

    {#if activeTab === 'home'}
      <!-- SPOTLIGHT BANNER -->
      <div class="spotlight-banner">
        <div class="spotlight-text">
          <div class="spotlight-title">Spotlight <span class="spotlight-icon">↑</span></div>
          <div class="spotlight-sub">Onde as vozes emergentes encontram o seu palco</div>
          <div class="spotlight-desc">Músicas independentes selecionadas pela equipa editorial</div>
          <button class="spotlight-btn" on:click={() => showToast('A abrir Spotlight…')}>Ouve agora</button>
        </div>
      </div>

      <!-- CHIPS -->
      <div class="chips-row">
        {#each chips as chip, i}
          <button
            class="chip"
            style="background:{activeChip===i ? bgChipAct : bgChip};color:{activeChip===i ? (isDark?'#000':'#fff') : txtPrim};"
            on:click={() => activeChip=i}
          >{chip}</button>
        {/each}
      </div>

      {#if loading}
        <div class="loader-wrap">
          <div class="loader" style="border-top-color:{txtPrim}"></div>
        </div>
      {:else if error}
        <div class="error-msg" style="color:{txtSec}">Não foi possível carregar músicas.</div>
      {:else}

        <!-- SPOTLIGHT GRID -->
        <div class="section-header">
          <span class="section-title" style="color:{txtPrim}">Spotlight</span>
          <button class="see-all" style="color:{txtSec}" on:click={() => showToast('Ver tudo')}>Ver tudo</button>
        </div>
        <div class="section-sub" style="color:{txtSec}">Músicas independentes selecionadas pela equipa editorial</div>
        <div class="spotlight-grid">
          {#each spotlightTracks as track}
            <button class="spotlight-item" on:click={() => playTrack(track)}>
              <img src={track.album?.cover_medium || track.album?.cover} alt={track.title} class="spotlight-thumb" loading="lazy" />
              <div class="spotlight-info">
                <span class="spotlight-track" style="color:{txtPrim}">{track.title?.length>12 ? track.title.slice(0,12)+'…' : track.title} <span class="upload-icon">↑</span></span>
                <span class="spotlight-artist" style="color:{txtSec}">{track.artist?.name}</span>
              </div>
            </button>
          {/each}
        </div>

        <!-- NOVOS ÁLBUNS -->
        <div class="section-header" style="margin-top:28px">
          <span class="section-title" style="color:{txtPrim}">Novos Álbuns</span>
          <button class="see-all" style="color:{txtSec}" on:click={() => showToast('Ver tudo')}>Ver tudo</button>
        </div>
        <div class="albums-row">
          {#each newAlbums as album}
            <button class="album-card" on:click={() => showToast(album.title)}>
              <div class="album-cover-wrap">
                <img src={album.cover_medium || album.cover} alt={album.title} class="album-cover" loading="lazy" />
                <div class="album-play-btn">▶</div>
                <button class="album-heart" on:click|stopPropagation={() => showToast('Guardado')}>♡</button>
              </div>
              <span class="album-title" style="color:{txtPrim}">{album.title?.length>16 ? album.title.slice(0,16)+'…' : album.title} <span class="exp-badge">E</span></span>
              <span class="album-artist" style="color:{txtSec}">{album.artist?.name}</span>
            </button>
          {/each}
        </div>

        <!-- NOVAS MÚSICAS -->
        <div class="section-header" style="margin-top:28px">
          <span class="section-title" style="color:{txtPrim}">Novas Músicas</span>
          <button class="see-all" style="color:{txtSec}" on:click={() => showToast('Ver tudo')}>Ver tudo</button>
        </div>
        <div class="tracks-list">
          {#each newTracks as track}
            {@const isPlaying = currentTrack?.id===track.id && playing}
            <button class="track-row" on:click={() => playTrack(track)}>
              <img src={track.album?.cover_small || track.album?.cover} alt={track.title} class="track-thumb" loading="lazy" />
              <div class="track-info">
                <span class="track-title" style="color:{txtPrim}">{track.title} <span class="exp-badge">E</span></span>
                <span class="track-artist" style="color:{txtSec}">{track.artist?.name}</span>
              </div>
              {#if isPlaying}
                <span class="playing-indicator">▐▐</span>
              {:else}
                <button class="track-more" style="color:{txtSec}" on:click|stopPropagation={() => showToast('Opções')}>•••</button>
              {/if}
            </button>
          {/each}
        </div>

        <!-- MIXES POPULARES -->
        <div class="section-header" style="margin-top:28px">
          <span class="section-title" style="color:{txtPrim}">Mixes populares</span>
          <button class="see-all" style="color:{txtSec}" on:click={() => showToast('Ver tudo')}>Ver tudo</button>
        </div>
        <div class="mixes-row">
          {#each popularMixes as mix}
            <button class="mix-card" on:click={() => showToast(mix.title)}>
              <img src={mix.cover_medium || mix.cover} alt={mix.title} class="mix-cover" loading="lazy" />
            </button>
          {/each}
        </div>

      {/if}

      <div style="height:90px"></div>

    {:else if activeTab === 'search'}
      <div class="search-page" style="color:{txtPrim}">
        <div class="search-bar-wrap">
          <span class="icon-mask search-bar-icon" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};"></span>
          <input class="search-input" style="background:{bgCard};color:{txtPrim}" placeholder="Artistas, músicas, álbuns…" />
        </div>
        <div class="search-hint" style="color:{txtSec}">Pesquisa músicas, artistas e álbuns</div>
      </div>

    {:else if activeTab === 'library'}
      <div class="library-page">
        <div class="page-title" style="color:{txtPrim}">A minha biblioteca</div>
        <div class="empty-lib" style="color:{txtSec}">Ainda não tens músicas guardadas.</div>
      </div>
    {/if}

  </div>

  <!-- MINI PLAYER -->
  {#if currentTrack}
    <div class="mini-player" style="background:{bgCard};border-top:0.5px solid {divider}">
      <img src={currentTrack.album?.cover_small} alt={currentTrack.title} class="mini-thumb" />
      <div class="mini-info">
        <span class="mini-title" style="color:{txtPrim}">{currentTrack.title}</span>
        <span class="mini-artist" style="color:{txtSec}">{currentTrack.artist?.name}</span>
      </div>
      <button class="mini-play" style="color:{txtPrim}" on:click={() => playTrack(currentTrack)}>
        {playing ? '▐▐' : '▶'}
      </button>
      <button class="mini-close" style="color:{txtSec}" on:click={() => { audio?.pause(); currentTrack=null; playing=false; }}>✕</button>
    </div>
  {/if}

  <!-- BOTTOM BAR -->
  <div class="bottom-bar" style="background:{bg};border-top:0.5px solid {divider}">
    <button class="tab-btn" on:click={() => activeTab='home'}>
      <span class="icon-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');background:{activeTab==='home'?txtPrim:txtSec};"></span>
      <span class="tab-label" style="color:{activeTab==='home'?txtPrim:txtSec}">Home</span>
    </button>
    <button class="tab-btn" on:click={() => activeTab='search'}>
      <span class="icon-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='search'?'search_filled':'search'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='search'?'search_filled':'search'}.svg');background:{activeTab==='search'?txtPrim:txtSec};"></span>
      <span class="tab-label" style="color:{activeTab==='search'?txtPrim:txtSec}">Pesquisa</span>
    </button>
    <button class="tab-btn" on:click={() => activeTab='library'}>
      <span class="icon-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='library'?'library_filled':'library'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='library'?'library_filled':'library'}.svg');background:{activeTab==='library'?txtPrim:txtSec};"></span>
      <span class="tab-label" style="color:{activeTab==='library'?txtPrim:txtSec}">Biblioteca</span>
    </button>
  </div>

</div>

<style>
  .root { position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }

  /* APPBAR */
  .appbar { display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;flex-shrink:0; }
  .appbar-btn { width:36px;height:36px;border-radius:10px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s; }
  .appbar-btn:active { opacity:0.5; }
  .appbar-logo { display:flex;align-items:center;gap:6px; }
  .appbar-logo-img { width:28px;height:28px;border-radius:8px; }

  /* BODY */
  .body { flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch; }

  /* SPOTLIGHT BANNER */
  .spotlight-banner { margin:16px 16px 0;border-radius:18px;background:#E8002D;padding:24px 20px 20px;color:#fff; }
  .spotlight-title { font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px; }
  .spotlight-icon { font-size:16px; }
  .spotlight-sub { font-size:16px;font-weight:600;line-height:1.3;margin-bottom:8px; }
  .spotlight-desc { font-size:13px;opacity:0.85;line-height:1.5;margin-bottom:20px; }
  .spotlight-btn { background:#fff;color:#000;border:none;border-radius:999px;padding:12px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit; }
  .spotlight-btn:active { opacity:0.85; }

  /* CHIPS */
  .chips-row { display:flex;gap:8px;padding:16px 16px 4px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .chips-row::-webkit-scrollbar { display:none; }
  .chip { border:none;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background .15s,color .15s; }

  /* SECTIONS */
  .section-header { display:flex;align-items:center;justify-content:space-between;padding:20px 16px 4px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .section-sub { font-size:13px;padding:0 16px 12px; }
  .see-all { background:none;border:none;font-size:14px;cursor:pointer;font-family:inherit;padding:0; }

  /* SPOTLIGHT GRID */
  .spotlight-grid { display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0 16px; }
  .spotlight-item { display:flex;align-items:center;gap:10px;background:transparent;border:none;cursor:pointer;padding:8px 0;text-align:left; }
  .spotlight-thumb { width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0; }
  .spotlight-info { display:flex;flex-direction:column;min-width:0; }
  .spotlight-track { font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .spotlight-artist { font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .upload-icon { font-size:11px;background:#E8002D;color:#fff;border-radius:4px;padding:1px 3px; }

  /* ALBUMS ROW */
  .albums-row { display:flex;gap:12px;padding:8px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .albums-row::-webkit-scrollbar { display:none; }
  .album-card { flex-shrink:0;width:160px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .album-cover-wrap { position:relative;width:160px;height:160px;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .album-cover { width:100%;height:100%;object-fit:cover;display:block; }
  .album-play-btn { position:absolute;bottom:10px;left:10px;width:40px;height:40px;border-radius:50%;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;font-size:16px;opacity:0; transition:opacity .2s; }
  .album-cover-wrap:hover .album-play-btn { opacity:1; }
  .album-heart { position:absolute;bottom:10px;right:10px;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s; }
  .album-cover-wrap:hover .album-heart { opacity:1; }
  .album-title { display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .album-artist { display:block;font-size:12px;margin-top:2px; }
  .exp-badge { font-size:10px;background:rgba(128,128,128,0.3);border-radius:3px;padding:1px 4px;vertical-align:middle; }

  /* TRACKS LIST */
  .tracks-list { display:flex;flex-direction:column;padding:4px 16px; }
  .track-row { display:flex;align-items:center;gap:12px;padding:10px 0;background:transparent;border:none;cursor:pointer;text-align:left;border-bottom:0.5px solid transparent;width:100%; }
  .track-thumb { width:52px;height:52px;border-radius:6px;object-fit:cover;flex-shrink:0; }
  .track-info { flex:1;min-width:0;display:flex;flex-direction:column; }
  .track-title { font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .track-artist { font-size:13px;margin-top:2px; }
  .track-more { background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;letter-spacing:2px; }
  .playing-indicator { font-size:16px;color:#E8002D;font-weight:700; }

  /* MIXES ROW */
  .mixes-row { display:flex;gap:12px;padding:8px 16px 24px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .mixes-row::-webkit-scrollbar { display:none; }
  .mix-card { flex-shrink:0;width:160px;height:160px;border-radius:10px;overflow:hidden;border:none;cursor:pointer;padding:0; }
  .mix-cover { width:100%;height:100%;object-fit:cover;display:block; }

  /* SEARCH PAGE */
  .search-page { padding:16px; }
  .search-bar-wrap { display:flex;align-items:center;gap:10px;border-radius:12px;padding:12px 14px;margin-bottom:20px; }
  .search-bar-icon { width:18px;height:18px;flex-shrink:0; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .search-hint { font-size:15px;text-align:center;margin-top:40px; }

  /* LIBRARY PAGE */
  .library-page { padding:24px 16px; }
  .page-title { font-size:26px;font-weight:800;margin-bottom:16px; }
  .empty-lib { font-size:15px; }

  /* LOADER */
  .loader-wrap { display:flex;justify-content:center;padding:40px; }
  .loader { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);border-top-color:#000;animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .error-msg { text-align:center;padding:40px 16px;font-size:15px; }

  /* MINI PLAYER */
  .mini-player { flex-shrink:0;display:flex;align-items:center;gap:10px;padding:10px 16px; }
  .mini-thumb { width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0; }
  .mini-info { flex:1;min-width:0; }
  .mini-title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .mini-artist { display:block;font-size:12px; }
  .mini-play { background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px; }
  .mini-close { background:none;border:none;font-size:16px;cursor:pointer;padding:4px 8px; }

  /* BOTTOM BAR */
  .bottom-bar { flex-shrink:0;display:flex;align-items:center;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px)); }
  .tab-btn { display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:4px 20px;transition:opacity .15s; }
  .tab-btn:active { opacity:0.6; }
  .tab-icon { width:24px;height:24px; }
  .tab-label { font-size:10px;font-weight:500; }

  /* ICON MASK */
  .icon-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>