<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import Drawer from '../components/Drawer.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: bg      = isDark ? '#181818' : '#ffffff';
  $: bgCard  = isDark ? '#242424' : '#f2f2f2';
  $: bgChip  = isDark ? '#2a2a2a' : '#ebebeb';
  $: txtPrim = isDark ? '#ffffff' : '#000000';
  $: txtSec  = isDark ? '#aaaaaa' : '#777777';
  $: divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  let drawerOpen = false;
  const menuItems = [
    { icon: 'home_outline', label: 'Início',    action: () => { activeTab='home'; drawerOpen=false; } },
    { icon: 'star',         label: 'Favoritos', action: () => showToast('Em breve') },
    { icon: 'history',      label: 'Recentes',  action: () => showToast('Em breve') },
  ];

  let activeTab  = 'home';
  let activeChip = 0;
  const chips = ['Para ti', 'Escolhas do staff', 'Carregamentos'];

  // Library tabs
  let libTab = 'playlists';

  // Data
  let spotlightTracks = [];
  let newAlbums       = [];
  let newTracks       = [];
  let popularMixes    = [];
  let loading         = true;
  let loadError       = false;

  // Fake library data
  const libraryPlaylists = [
    { id:1, title:'Favoritas',         desc:'32 músicas',  color:'#E8002D' },
    { id:2, title:'Chill Vibes',       desc:'18 músicas',  color:'#007AFF' },
    { id:3, title:'Workout Mix',       desc:'24 músicas',  color:'#FF9500' },
    { id:4, title:'Late Night',        desc:'15 músicas',  color:'#5856D6' },
    { id:5, title:'Top Hits 2024',     desc:'40 músicas',  color:'#34C759' },
    { id:6, title:'Descobertas',       desc:'10 músicas',  color:'#FF2D55' },
  ];
  const libraryAlbums = [
    { id:1, title:'GNX',               artist:'Kendrick Lamar', cover:'https://e-cdns-images.dzcdn.net/images/cover/d41d8cd98f00b204e9800998ecf8427e/264x264-000000-80-0-0.jpg' },
    { id:2, title:'Chromakopia',       artist:'Tyler, the Creator', cover:'https://e-cdns-images.dzcdn.net/images/cover/d41d8cd98f00b204e9800998ecf8427e/264x264-000000-80-0-0.jpg' },
    { id:3, title:'Short n\' Sweet',   artist:'Sabrina Carpenter', cover:'https://e-cdns-images.dzcdn.net/images/cover/d41d8cd98f00b204e9800998ecf8427e/264x264-000000-80-0-0.jpg' },
  ];
  const libraryArtists = [
    { id:1, name:'Drake',              color:'#FF9500' },
    { id:2, name:'Taylor Swift',       color:'#FF2D55' },
    { id:3, name:'The Weeknd',         color:'#5856D6' },
    { id:4, name:'Kendrick Lamar',     color:'#E8002D' },
    { id:5, name:'Billie Eilish',      color:'#34C759' },
    { id:6, name:'Bad Bunny',          color:'#007AFF' },
  ];

  async function loadFeed() {
    loading = true; loadError = false;
    try {
      // Use allorigins proxy to bypass CORS
      const proxy = (url) =>
        fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
          .then(r => r.json())
          .then(d => JSON.parse(d.contents));

      const [chart, albums] = await Promise.all([
        proxy('https://api.deezer.com/chart/0/tracks?limit=12'),
        proxy('https://api.deezer.com/chart/0/albums?limit=8'),
      ]);

      spotlightTracks = (chart.data || []).slice(0, 6);
      newTracks       = (chart.data || []).slice(0, 5);
      newAlbums       = (albums.data || []).slice(0, 8);
      popularMixes    = (albums.data || []).slice(0, 4);
    } catch(e) {
      loadError = true;
    } finally {
      loading = false;
    }
  }

  onMount(loadFeed);

  // Player
  let currentTrack = null;
  let playing      = false;
  let audio        = null;

  function playTrack(track) {
    if (!track?.preview) { showToast('Sem preview disponível'); return; }
    if (currentTrack?.id === track.id) {
      if (playing) { audio?.pause(); playing = false; }
      else         { audio?.play();  playing = true;  }
      return;
    }
    audio?.pause();
    currentTrack = track;
    audio = new Audio(track.preview);
    audio.play();
    playing = true;
    audio.onended = () => { playing = false; };
  }

  function stopPlayer() { audio?.pause(); currentTrack = null; playing = false; }
</script>

<div class="root" style="background:{bg};color:{txtPrim}">

  <Drawer {isDark} {user} open={drawerOpen} {menuItems}
    on:close={() => drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to:'settings' })} />

  <!-- APP BAR -->
  <div class="appbar" style="border-bottom:0.5px solid {divider};background:{bg}">
    <button class="appbar-btn" on:click={() => drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
    </button>
    <span class="appbar-title" style="color:{txtPrim}">Music</span>
    <div style="width:36px"></div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- ═══════════════ HOME ═══════════════ -->
    {#if activeTab === 'home'}

      <!-- SPOTLIGHT BANNER -->
      <div class="spotlight-banner">
        <div class="spotlight-eyebrow">Spotlight <span class="sp-badge">↑</span></div>
        <div class="spotlight-headline">Onde as vozes emergentes encontram o seu palco</div>
        <div class="spotlight-body-text">O Spotlight destaca carregamentos incríveis de artistas independentes, escolhidos a dedo pela nossa equipa editorial. As músicas em destaque são adicionadas a playlists especialmente selecionadas e cada artista elegível recebe 1000 USD quando é escolhida uma música.</div>
        <button class="spotlight-cta" on:click={() => showToast('A abrir Spotlight…')}>Ouve agora</button>
      </div>

      <!-- CHIPS -->
      <div class="chips-row">
        {#each chips as chip, i}
          <button
            class="chip"
            style="background:{activeChip===i?(isDark?'#fff':'#000'):bgChip};color:{activeChip===i?(isDark?'#000':'#fff'):txtPrim};"
            on:click={() => activeChip=i}
          >{chip}</button>
        {/each}
      </div>

      {#if loading}
        <div class="loader-wrap">
          <div class="spinner" style="border-top-color:{txtPrim}"></div>
        </div>

      {:else if loadError}
        <div class="error-block" style="color:{txtSec}">
          <div style="font-size:32px;margin-bottom:12px">⚠️</div>
          <div style="font-size:15px;margin-bottom:16px">Não foi possível carregar o feed</div>
          <button class="retry-btn" style="background:{bgCard};color:{txtPrim}" on:click={loadFeed}>Tentar novamente</button>
        </div>

      {:else}

        <!-- SPOTLIGHT GRID -->
        <div class="section-hdr">
          <span class="section-title" style="color:{txtPrim}">Spotlight</span>
          <button class="see-all" style="color:{txtSec}">Ver tudo</button>
        </div>
        <p class="section-sub" style="color:{txtSec}">Músicas independentes selecionadas pela equipa editorial</p>
        <div class="spotlight-grid">
          {#each spotlightTracks as t}
            <button class="sp-item" on:click={() => playTrack(t)}>
              <div class="sp-thumb-wrap">
                <img src={t.album?.cover_medium} alt={t.title} class="sp-thumb" loading="lazy" />
                {#if currentTrack?.id===t.id && playing}
                  <div class="sp-playing-overlay">▐▐</div>
                {/if}
              </div>
              <div class="sp-info">
                <span class="sp-track" style="color:{txtPrim}">{t.title?.length>13 ? t.title.slice(0,13)+'…' : t.title} <span class="up-badge">↑</span></span>
                <span class="sp-artist" style="color:{txtSec}">{t.artist?.name}</span>
              </div>
            </button>
          {/each}
        </div>

        <!-- NOVOS ÁLBUNS -->
        <div class="section-hdr" style="margin-top:24px">
          <span class="section-title" style="color:{txtPrim}">Novos Álbuns</span>
          <button class="see-all" style="color:{txtSec}">Ver tudo</button>
        </div>
        <div class="h-scroll">
          {#each newAlbums as a}
            <button class="album-card" on:click={() => showToast(a.title)}>
              <div class="album-img-wrap">
                <img src={a.cover_medium} alt={a.title} class="album-img" loading="lazy" />
              </div>
              <span class="album-title" style="color:{txtPrim}">{a.title?.length>16?a.title.slice(0,16)+'…':a.title}</span>
              <span class="album-artist" style="color:{txtSec}">{a.artist?.name}</span>
            </button>
          {/each}
        </div>

        <!-- NOVAS MÚSICAS -->
        <div class="section-hdr" style="margin-top:24px">
          <span class="section-title" style="color:{txtPrim}">Novas Músicas</span>
          <button class="see-all" style="color:{txtSec}">Ver tudo</button>
        </div>
        <div class="tracks-list">
          {#each newTracks as t}
            {@const active = currentTrack?.id===t.id && playing}
            <button class="track-row" on:click={() => playTrack(t)}>
              <img src={t.album?.cover_small} alt={t.title} class="track-thumb" loading="lazy" />
              <div class="track-info">
                <span class="track-title" style="color:{active?'#E8002D':txtPrim}">{t.title} <span class="exp-tag">E</span></span>
                <span class="track-artist" style="color:{txtSec}">{t.artist?.name}</span>
              </div>
              {#if active}
                <span style="color:#E8002D;font-size:14px;font-weight:700;letter-spacing:1px;">▐▐</span>
              {:else}
                <button class="more-btn" style="color:{txtSec}" on:click|stopPropagation={() => showToast('Opções')}>•••</button>
              {/if}
            </button>
          {/each}
        </div>

        <!-- MIXES POPULARES -->
        <div class="section-hdr" style="margin-top:24px">
          <span class="section-title" style="color:{txtPrim}">Mixes populares</span>
          <button class="see-all" style="color:{txtSec}">Ver tudo</button>
        </div>
        <div class="h-scroll" style="padding-bottom:8px">
          {#each popularMixes as m}
            <button class="mix-card" on:click={() => showToast(m.title)}>
              <img src={m.cover_medium} alt={m.title} class="mix-img" loading="lazy" />
            </button>
          {/each}
        </div>

      {/if}

      <div style="height:{currentTrack?140:80}px"></div>

    <!-- ═══════════════ SEARCH ═══════════════ -->
    {:else if activeTab === 'search'}
      <div class="search-page">
        <div class="search-bar" style="background:{bgCard}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:18px;height:18px;flex-shrink:0;"></span>
          <input class="search-input" style="color:{txtPrim}" placeholder="Artistas, músicas, álbuns…" />
        </div>
        <div class="search-hint" style="color:{txtSec}">Pesquisa músicas, artistas e álbuns</div>
      </div>
      <div style="height:80px"></div>

    <!-- ═══════════════ LIBRARY ═══════════════ -->
    {:else if activeTab === 'library'}
      <div class="lib-header">
        <span class="lib-title" style="color:{txtPrim}">A minha biblioteca</span>
        <button class="lib-add-btn" style="background:{bgCard}" on:click={() => showToast('Nova playlist')}>
          <span class="icon-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:{txtPrim};width:18px;height:18px;"></span>
        </button>
      </div>

      <!-- Library tabs -->
      <div class="lib-tabs">
        {#each [['playlists','Playlists'],['albums','Álbuns'],['artists','Artistas']] as [id,label]}
          <button
            class="lib-tab"
            style="color:{libTab===id?txtPrim:txtSec};border-bottom:2px solid {libTab===id?txtPrim:'transparent'};"
            on:click={() => libTab=id}
          >{label}</button>
        {/each}
      </div>

      {#if libTab === 'playlists'}
        <div class="lib-list">
          {#each libraryPlaylists as pl}
            <button class="lib-row" on:click={() => showToast(pl.title)}>
              <div class="lib-icon-sq" style="background:{pl.color}">
                <span class="icon-mask" style="mask-image:url('/icons/svg/music_note.svg');-webkit-mask-image:url('/icons/svg/music_note.svg');background:#fff;width:22px;height:22px;"></span>
              </div>
              <div class="lib-row-info">
                <span class="lib-row-title" style="color:{txtPrim}">{pl.title}</span>
                <span class="lib-row-sub" style="color:{txtSec}">Playlist • {pl.desc}</span>
              </div>
              <span class="icon-mask lib-row-chevron" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{txtSec};width:14px;height:14px;"></span>
            </button>
          {/each}
        </div>

      {:else if libTab === 'albums'}
        <div class="lib-grid">
          {#each libraryAlbums as al}
            <button class="lib-grid-card" on:click={() => showToast(al.title)}>
              <div class="lib-grid-cover" style="background:{bgCard}">
                <span class="icon-mask" style="mask-image:url('/icons/svg/music_note.svg');-webkit-mask-image:url('/icons/svg/music_note.svg');background:{txtSec};width:32px;height:32px;"></span>
              </div>
              <span class="lib-grid-title" style="color:{txtPrim}">{al.title}</span>
              <span class="lib-grid-sub" style="color:{txtSec}">{al.artist}</span>
            </button>
          {/each}
        </div>

      {:else if libTab === 'artists'}
        <div class="lib-list">
          {#each libraryArtists as ar}
            <button class="lib-row" on:click={() => showToast(ar.name)}>
              <div class="lib-avatar" style="background:{ar.color}">
                <span class="lib-avatar-initial">{ar.name[0]}</span>
              </div>
              <div class="lib-row-info">
                <span class="lib-row-title" style="color:{txtPrim}">{ar.name}</span>
                <span class="lib-row-sub" style="color:{txtSec}">Artista</span>
              </div>
              <span class="icon-mask lib-row-chevron" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{txtSec};width:14px;height:14px;"></span>
            </button>
          {/each}
        </div>
      {/if}

      <div style="height:{currentTrack?140:80}px"></div>
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
      <button class="mini-ctrl" style="color:{txtPrim}" on:click={() => playTrack(currentTrack)}>
        {playing ? '▐▐' : '▶'}
      </button>
      <button class="mini-ctrl" style="color:{txtSec}" on:click={stopPlayer}>✕</button>
    </div>
  {/if}

  <!-- BOTTOM BAR -->
  <div class="bottom-bar" style="background:{bg};border-top:0.5px solid {divider}">
    {#each [['home','Home'],['search','Pesquisa'],['library','Biblioteca']] as [id,label]}
      <button class="tab-btn" on:click={() => activeTab=id}>
        <span class="icon-mask tab-icon"
          style="mask-image:url('/icons/svg/{id==='home'?(activeTab==='home'?'home_filled':'home_outline'):id==='search'?(activeTab==='search'?'search_filled':'search'):(activeTab==='library'?'library_filled':'library')}.svg');-webkit-mask-image:url('/icons/svg/{id==='home'?(activeTab==='home'?'home_filled':'home_outline'):id==='search'?(activeTab==='search'?'search_filled':'search'):(activeTab==='library'?'library_filled':'library')}.svg');background:{activeTab===id?txtPrim:txtSec};">
        </span>
        <span class="tab-label" style="color:{activeTab===id?txtPrim:txtSec}">{label}</span>
      </button>
    {/each}
  </div>

</div>

<style>
  .root { position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }

  /* APPBAR */
  .appbar { display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;flex-shrink:0; }
  .appbar-btn { width:36px;height:36px;border-radius:10px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s; }
  .appbar-btn:active { opacity:0.5; }
  .appbar-title { font-size:17px;font-weight:700;letter-spacing:-.3px; }

  /* BODY */
  .body { flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch; }

  /* SPOTLIGHT BANNER */
  .spotlight-banner { margin:16px 16px 0;border-radius:18px;background:#E8002D;padding:22px 20px 20px;color:#fff; }
  .spotlight-eyebrow { font-size:20px;font-weight:800;letter-spacing:-.4px;margin-bottom:8px; }
  .sp-badge { font-size:14px;background:rgba(255,255,255,0.25);border-radius:5px;padding:2px 5px;vertical-align:middle; }
  .spotlight-headline { font-size:17px;font-weight:700;line-height:1.3;margin-bottom:10px; }
  .spotlight-body-text { font-size:13px;line-height:1.6;opacity:0.88;margin-bottom:20px; }
  .spotlight-cta { background:#fff;color:#000;border:none;border-radius:999px;padding:12px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit; }
  .spotlight-cta:active { opacity:0.85; }

  /* CHIPS */
  .chips-row { display:flex;gap:8px;padding:16px 16px 4px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .chips-row::-webkit-scrollbar { display:none; }
  .chip { border:none;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background .15s,color .15s; }
  .chip:active { opacity:0.7; }

  /* SECTIONS */
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 16px 4px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .section-sub { font-size:13px;padding:0 16px 10px;margin:0; }
  .see-all { background:none;border:none;font-size:14px;cursor:pointer;font-family:inherit;padding:0; }
  .see-all:active { opacity:0.6; }

  /* SPOTLIGHT GRID */
  .spotlight-grid { display:grid;grid-template-columns:1fr 1fr;gap:2px;padding:0 16px; }
  .sp-item { display:flex;align-items:center;gap:10px;background:transparent;border:none;cursor:pointer;padding:8px 4px;text-align:left; }
  .sp-thumb-wrap { position:relative;flex-shrink:0; }
  .sp-thumb { width:54px;height:54px;border-radius:6px;object-fit:cover;display:block; }
  .sp-playing-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.45);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px; }
  .sp-info { display:flex;flex-direction:column;min-width:0; }
  .sp-track { font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .sp-artist { font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .up-badge { font-size:10px;background:#E8002D;color:#fff;border-radius:3px;padding:1px 3px;vertical-align:middle; }

  /* ALBUMS */
  .h-scroll { display:flex;gap:12px;padding:8px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .album-card { flex-shrink:0;width:150px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .album-img-wrap { width:150px;height:150px;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .album-img { width:100%;height:100%;object-fit:cover;display:block; }
  .album-title { display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .album-artist { display:block;font-size:12px;margin-top:2px; }
  .exp-tag { font-size:10px;background:rgba(128,128,128,0.3);border-radius:3px;padding:1px 4px;vertical-align:middle; }

  /* TRACKS */
  .tracks-list { display:flex;flex-direction:column;padding:4px 16px; }
  .track-row { display:flex;align-items:center;gap:12px;padding:10px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .track-thumb { width:50px;height:50px;border-radius:6px;object-fit:cover;flex-shrink:0; }
  .track-info { flex:1;min-width:0; }
  .track-title { display:block;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .track-artist { display:block;font-size:13px;margin-top:2px; }
  .more-btn { background:none;border:none;font-size:16px;cursor:pointer;padding:4px 6px;letter-spacing:1px; }

  /* MIXES */
  .mix-card { flex-shrink:0;width:150px;height:150px;border-radius:10px;overflow:hidden;border:none;cursor:pointer;padding:0; }
  .mix-img { width:100%;height:100%;object-fit:cover;display:block; }

  /* LOADER / ERROR */
  .loader-wrap { display:flex;justify-content:center;padding:48px; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .error-block { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px; }
  .retry-btn { border:none;border-radius:12px;padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit; }

  /* SEARCH */
  .search-page { padding:16px; }
  .search-bar { display:flex;align-items:center;gap:10px;border-radius:12px;padding:12px 14px;margin-bottom:24px; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .search-hint { font-size:15px;text-align:center;margin-top:48px; }

  /* LIBRARY */
  .lib-header { display:flex;align-items:center;justify-content:space-between;padding:20px 16px 12px; }
  .lib-title { font-size:24px;font-weight:800;letter-spacing:-.5px; }
  .lib-add-btn { width:34px;height:34px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .lib-tabs { display:flex;border-bottom:0.5px solid rgba(128,128,128,0.15);padding:0 16px;gap:0; }
  .lib-tab { flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:10px 0;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:color .15s;letter-spacing:-.2px; }
  .lib-list { display:flex;flex-direction:column;padding:8px 16px; }
  .lib-row { display:flex;align-items:center;gap:14px;padding:12px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .lib-row:active { opacity:0.7; }
  .lib-icon-sq { width:50px;height:50px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
  .lib-avatar { width:50px;height:50px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
  .lib-avatar-initial { font-size:20px;font-weight:700;color:#fff; }
  .lib-row-info { flex:1;min-width:0; }
  .lib-row-title { display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .lib-row-sub { display:block;font-size:13px;margin-top:2px; }
  .lib-row-chevron { flex-shrink:0; }
  .lib-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px; }
  .lib-grid-card { background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .lib-grid-cover { width:100%;aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:8px; }
  .lib-grid-title { display:block;font-size:14px;font-weight:600; }
  .lib-grid-sub { display:block;font-size:12px;margin-top:2px; }

  /* MINI PLAYER */
  .mini-player { flex-shrink:0;display:flex;align-items:center;gap:12px;padding:10px 16px; }
  .mini-thumb { width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0; }
  .mini-info { flex:1;min-width:0; }
  .mini-title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .mini-artist { display:block;font-size:12px; }
  .mini-ctrl { background:none;border:none;font-size:20px;cursor:pointer;padding:6px 8px; }

  /* BOTTOM BAR */
  .bottom-bar { flex-shrink:0;display:flex;align-items:center;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px)); }
  .tab-btn { display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:4px 20px; }
  .tab-btn:active { opacity:0.6; }
  .tab-icon { width:24px;height:24px; }
  .tab-label { font-size:10px;font-weight:500; }

  .icon-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>