<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import Drawer from '../components/Drawer.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();

  $: bg       = isDark ? '#181818' : '#ffffff';
  $: bgCard   = isDark ? '#242424' : '#f0f0f0';
  $: bgChip   = isDark ? '#2a2a2a' : '#e8e8e8';
  $: txtPrim  = isDark ? '#ffffff' : '#000000';
  $: txtSec   = isDark ? '#aaaaaa' : '#777777';
  $: divider  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  let drawerOpen = false;
  const menuItems = [
    { icon: 'home_outline', label: 'Início',    action: () => { activeTab='home'; drawerOpen=false; } },
    { icon: 'bookmark',     label: 'Guardados', action: () => showToast('Em breve') },
    { icon: 'history',      label: 'Recentes',  action: () => showToast('Em breve') },
  ];

  // Tabs
  let activeTab  = 'home';
  let activeChip = 0;
  const chips = ['Para ti', 'Tendências', 'Novidades'];

  // Library
  let libTab = 'playlists';
  const libraryPlaylists = [
    { id:1, title:'Favoritas',      desc:'32 músicas', color:'#E8002D' },
    { id:2, title:'Chill Vibes',    desc:'18 músicas', color:'#007AFF' },
    { id:3, title:'Workout Mix',    desc:'24 músicas', color:'#FF9500' },
    { id:4, title:'Late Night',     desc:'15 músicas', color:'#5856D6' },
    { id:5, title:'Top Hits 2025',  desc:'40 músicas', color:'#34C759' },
    { id:6, title:'Descobertas',    desc:'10 músicas', color:'#FF2D55' },
  ];
  const libraryArtists = [
    { id:1, name:'Drake',           color:'#FF9500' },
    { id:2, name:'Taylor Swift',    color:'#FF2D55' },
    { id:3, name:'The Weeknd',      color:'#5856D6' },
    { id:4, name:'Kendrick Lamar',  color:'#E8002D' },
    { id:5, name:'Billie Eilish',   color:'#34C759' },
    { id:6, name:'Bad Bunny',       color:'#007AFF' },
  ];

  // Feed data
  let feedTracks   = [];
  let newAlbums    = [];
  let trendTracks  = [];
  let loading      = true;
  let loadError    = false;

  async function proxyFetch(url) {
    const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const d = await r.json();
    return JSON.parse(d.contents);
  }

  async function loadFeed() {
    loading = true; loadError = false;
    try {
      const [chart, albums, genre] = await Promise.all([
        proxyFetch('https://api.deezer.com/chart/0/tracks?limit=20'),
        proxyFetch('https://api.deezer.com/chart/0/albums?limit=10'),
        proxyFetch('https://api.deezer.com/chart/116/tracks?limit=10'), // pop
      ]);
      feedTracks  = chart.data  || [];
      newAlbums   = albums.data || [];
      trendTracks = genre.data  || [];
    } catch(e) {
      loadError = true;
    } finally {
      loading = false;
    }
  }

  onMount(loadFeed);

  // Player
  let currentTrack  = null;
  let playing       = false;
  let audio         = null;
  let playerOpen    = false;
  let shuffle       = false;
  let repeatMode    = 0; // 0=off 1=all 2=one
  let progress      = 0;
  let duration      = 30;
  let progressTimer = null;

  function openPlayer(track) {
    if (!track?.preview) { showToast('Sem preview disponível'); return; }
    if (currentTrack?.id !== track.id) {
      audio?.pause();
      clearInterval(progressTimer);
      currentTrack = track;
      progress = 0;
      duration = 30;
      audio = new Audio(track.preview);
      audio.play();
      playing = true;
      audio.onloadedmetadata = () => { duration = audio.duration || 30; };
      audio.onended = () => { playing = false; progress = 0; };
      progressTimer = setInterval(() => {
        if (audio && playing) progress = audio.currentTime;
      }, 500);
    }
    playerOpen = true;
  }

  function togglePlay() {
    if (!audio) return;
    if (playing) { audio.pause(); playing = false; }
    else         { audio.play();  playing = true;  }
  }

  function seekTo(e) {
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    progress = audio.currentTime;
  }

  function fmtTime(s) {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  function closePlayer() { playerOpen = false; }
  function stopAll()     { audio?.pause(); playing=false; clearInterval(progressTimer); currentTrack=null; playerOpen=false; }

  // Liked tracks
  let liked = new Set();
  function toggleLike(id) {
    liked = new Set(liked);
    if (liked.has(id)) liked.delete(id); else liked.add(id);
  }

  // Queue (current feed as queue)
  $: queue = activeChip === 0 ? feedTracks : trendTracks;

  function playNext() {
    const i = queue.findIndex(t => t.id === currentTrack?.id);
    const next = queue[(i+1) % queue.length];
    if (next) openPlayer(next);
  }
  function playPrev() {
    const i = queue.findIndex(t => t.id === currentTrack?.id);
    const prev = queue[(i-1+queue.length) % queue.length];
    if (prev) openPlayer(prev);
  }

  // Gradient from album cover color (simple static palette)
  const gradients = ['#1a1a2e','#16213e','#0f3460','#1b1b2f','#2c003e','#1a0a00','#001a00','#001a1a'];
  $: playerGradient = gradients[((currentTrack?.id || 0) % gradients.length)];
</script>

<!-- ROOT -->
<div class="root" style="background:{bg};color:{txtPrim}">

  <Drawer {isDark} {user} open={drawerOpen} {menuItems}
    on:close={() => drawerOpen=false}
    on:openSettings={() => dispatch('nav', { to:'settings' })} />

  <!-- APP BAR -->
  <div class="appbar" style="background:{bg};border-bottom:0.5px solid {divider}">
    <button class="icon-btn" on:click={() => drawerOpen=true}>
      <span class="svg-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{txtPrim};width:20px;height:20px;"></span>
    </button>
    <span class="appbar-title" style="color:{txtPrim}">Music</span>
    <div style="width:36px"></div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- ══════════ HOME ══════════ -->
    {#if activeTab === 'home'}

      <!-- CHIPS -->
      <div class="chips-row">
        {#each chips as chip, i}
          <button class="chip"
            style="background:{activeChip===i?(isDark?'#fff':'#000'):bgChip};color:{activeChip===i?(isDark?'#000':'#fff'):txtPrim};"
            on:click={() => activeChip=i}>{chip}</button>
        {/each}
      </div>

      {#if loading}
        <div class="center-pad">
          <div class="spinner" style="border-top-color:{txtPrim}"></div>
        </div>

      {:else if loadError}
        <div class="center-pad" style="flex-direction:column;gap:12px">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style="color:{txtSec};font-size:15px">Não foi possível carregar</span>
          <button class="retry-btn" style="background:{bgCard};color:{txtPrim}" on:click={loadFeed}>Tentar novamente</button>
        </div>

      {:else}

        <!-- ÁLBUNS EM DESTAQUE -->
        <div class="section-hdr">
          <span class="section-title" style="color:{txtPrim}">Álbuns em destaque</span>
          <button class="see-all-btn" style="color:{txtSec}">Ver tudo</button>
        </div>
        <div class="h-scroll">
          {#each newAlbums as a}
            <button class="album-card" on:click={() => showToast(a.title)}>
              <div class="album-img-wrap">
                {#if a.cover_medium}
                  <img src={a.cover_medium} alt={a.title} class="album-img" loading="lazy" />
                {:else}
                  <div class="album-img" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </div>
                {/if}
              </div>
              <span class="album-title" style="color:{txtPrim}">{a.title?.length>16?a.title.slice(0,16)+'…':a.title}</span>
              <span class="album-artist" style="color:{txtSec}">{a.artist?.name}</span>
            </button>
          {/each}
        </div>

        <!-- MÚSICAS -->
        <div class="section-hdr" style="margin-top:20px">
          <span class="section-title" style="color:{txtPrim}">{activeChip===0?'Para ti':activeChip===1?'Tendências':'Novidades'}</span>
          <button class="see-all-btn" style="color:{txtSec}">Ver tudo</button>
        </div>
        <div class="tracks-list">
          {#each (activeChip===0?feedTracks:trendTracks) as t}
            {@const active = currentTrack?.id===t.id}
            <button class="track-row" on:click={() => openPlayer(t)}>
              <div class="track-thumb-wrap">
                {#if t.album?.cover_small}
                  <img src={t.album.cover_small} alt={t.title} class="track-thumb" loading="lazy" />
                {:else}
                  <div class="track-thumb" style="background:{bgCard};display:flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </div>
                {/if}
                {#if active && playing}
                  <div class="thumb-playing">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  </div>
                {/if}
              </div>
              <div class="track-info">
                <span class="track-title" style="color:{active?'#E8002D':txtPrim}">{t.title}</span>
                <span class="track-artist" style="color:{txtSec}">{t.artist?.name}</span>
              </div>
              <button class="icon-btn-sm" on:click|stopPropagation={() => toggleLike(t.id)}>
                {#if liked.has(t.id)}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#E8002D" stroke="#E8002D" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {/if}
              </button>
              <button class="icon-btn-sm" on:click|stopPropagation={() => showToast('Opções')}>
                <span class="svg-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');background:{txtSec};width:16px;height:16px;"></span>
              </button>
            </button>
          {/each}
        </div>

      {/if}

      <div style="height:{currentTrack?148:88}px"></div>

    <!-- ══════════ SEARCH ══════════ -->
    {:else if activeTab === 'search'}
      <div class="search-page">
        <div class="search-bar" style="background:{bgCard}">
          <span class="svg-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:18px;height:18px;flex-shrink:0;"></span>
          <input class="search-input" style="color:{txtPrim}" placeholder="Artistas, músicas, álbuns…" />
        </div>
        <p class="search-hint" style="color:{txtSec}">Pesquisa músicas, artistas e álbuns</p>
      </div>
      <div style="height:{currentTrack?148:88}px"></div>

    <!-- ══════════ LIBRARY ══════════ -->
    {:else if activeTab === 'library'}
      <div class="lib-header">
        <span class="lib-title" style="color:{txtPrim}">A minha biblioteca</span>
        <button class="icon-btn" style="background:{bgCard};border-radius:50%" on:click={() => showToast('Nova playlist')}>
          <span class="svg-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:{txtPrim};width:18px;height:18px;"></span>
        </button>
      </div>
      <div class="lib-tabs" style="border-bottom:0.5px solid {divider}">
        {#each [['playlists','Playlists'],['albums','Álbuns'],['artists','Artistas']] as [id,label]}
          <button class="lib-tab"
            style="color:{libTab===id?txtPrim:txtSec};border-bottom:2px solid {libTab===id?txtPrim:'transparent'};"
            on:click={() => libTab=id}>{label}</button>
        {/each}
      </div>

      {#if libTab === 'playlists'}
        <div class="lib-list">
          {#each libraryPlaylists as pl}
            <button class="lib-row" on:click={() => showToast(pl.title)}>
              <div class="lib-sq" style="background:{pl.color}">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <div class="lib-row-info">
                <span class="lib-row-title" style="color:{txtPrim}">{pl.title}</span>
                <span class="lib-row-sub" style="color:{txtSec}">Playlist • {pl.desc}</span>
              </div>
              <span class="svg-mask" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{txtSec};width:14px;height:14px;flex-shrink:0;"></span>
            </button>
          {/each}
        </div>

      {:else if libTab === 'albums'}
        <div class="lib-grid">
          {#each newAlbums.slice(0,6) as a}
            <button class="lib-grid-card" on:click={() => showToast(a.title)}>
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
            </button>
          {/each}
        </div>

      {:else}
        <div class="lib-list">
          {#each libraryArtists as ar}
            <button class="lib-row" on:click={() => showToast(ar.name)}>
              <div class="lib-avatar" style="background:{ar.color}">
                <span class="lib-avatar-letter">{ar.name[0]}</span>
              </div>
              <div class="lib-row-info">
                <span class="lib-row-title" style="color:{txtPrim}">{ar.name}</span>
                <span class="lib-row-sub" style="color:{txtSec}">Artista</span>
              </div>
              <span class="svg-mask" style="mask-image:url('/icons/svg/chevron_right.svg');-webkit-mask-image:url('/icons/svg/chevron_right.svg');background:{txtSec};width:14px;height:14px;flex-shrink:0;"></span>
            </button>
          {/each}
        </div>
      {/if}

      <div style="height:{currentTrack?148:88}px"></div>
    {/if}

  </div>

  <!-- MINI PLAYER (flutuante sobre bottom bar) -->
  {#if currentTrack && !playerOpen}
    <div class="mini-player" style="background:{bgCard};border:0.5px solid {divider}" on:click={() => playerOpen=true}>
      {#if currentTrack.album?.cover_small}
        <img src={currentTrack.album.cover_small} alt={currentTrack.title} class="mini-thumb" />
      {:else}
        <div class="mini-thumb" style="background:{bg};display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{txtSec}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
      {/if}
      <div class="mini-info">
        <span class="mini-title" style="color:{txtPrim}">{currentTrack.title}</span>
        <span class="mini-artist" style="color:{txtSec}">{currentTrack.artist?.name}</span>
      </div>
      <button class="icon-btn" on:click|stopPropagation={togglePlay}>
        {#if playing}
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="{txtPrim}" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </button>
      <button class="icon-btn" on:click|stopPropagation={stopAll}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{txtSec};width:18px;height:18px;"></span>
      </button>
    </div>
  {/if}

  <!-- BOTTOM BAR -->
  <div class="bottom-bar" style="background:{bg};border-top:0.5px solid {divider}">
    {#each [['home','Home','home'],['search','Pesquisa','search'],['library','Biblioteca','library']] as [id,label,icon]}
      <button class="tab-btn" on:click={() => activeTab=id}>
        {#if id === 'home'}
          <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='home'?'home_filled':'home_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
        {:else if id === 'search'}
          <span class="svg-mask tab-icon" style="mask-image:url('/icons/svg/{activeTab==='search'?'magnifying_glass_filled':'magnifying_glass_outline'}.svg');-webkit-mask-image:url('/icons/svg/{activeTab==='search'?'magnifying_glass_filled':'magnifying_glass_outline'}.svg');background:{activeTab===id?txtPrim:txtSec};"></span>
        {:else}
          <!-- library: sem SVG próprio, usa Lucide inline -->
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
            fill="{activeTab===id?(isDark?'#fff':'#000'):'none'}"
            stroke="{activeTab===id?txtPrim:txtSec}"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        {/if}
        <span class="tab-label" style="color:{activeTab===id?txtPrim:txtSec}">{label}</span>
      </button>
    {/each}
  </div>

</div>

<!-- FULL SCREEN PLAYER -->
{#if playerOpen && currentTrack}
  <div class="player-screen" style="background:{playerGradient}">

    <!-- Header -->
    <div class="player-header">
      <button class="icon-btn" on:click={closePlayer}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="player-header-info">
        <span class="player-header-title">A reproduzir</span>
      </div>
      <button class="icon-btn" on:click={() => showToast('Opções')}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');background:white;width:20px;height:20px;"></span>
      </button>
    </div>

    <!-- Cover -->
    <div class="player-cover-wrap">
      {#if currentTrack.album?.cover_big || currentTrack.album?.cover_medium}
        <img src={currentTrack.album.cover_big || currentTrack.album.cover_medium} alt={currentTrack.title} class="player-cover" />
      {:else}
        <div class="player-cover" style="background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
      {/if}
    </div>

    <!-- Info + like -->
    <div class="player-info-row">
      <div class="player-info">
        <span class="player-track-title">{currentTrack.title}</span>
        <span class="player-track-artist">{currentTrack.artist?.name}</span>
      </div>
      <button class="icon-btn" on:click={() => toggleLike(currentTrack.id)}>
        {#if liked.has(currentTrack.id)}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#E8002D" stroke="#E8002D" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {/if}
      </button>
    </div>

    <!-- Progress -->
    <div class="player-progress-wrap">
      <div class="player-progress-track" on:click={seekTo}>
        <div class="player-progress-fill" style="width:{duration>0?(progress/duration)*100:0}%"></div>
        <div class="player-progress-thumb" style="left:{duration>0?(progress/duration)*100:0}%"></div>
      </div>
      <div class="player-times">
        <span>{fmtTime(progress)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="player-controls">
      <button class="player-ctrl-sm" on:click={() => { shuffle=!shuffle; showToast(shuffle?'Aleatório ligado':'Aleatório desligado'); }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{shuffle?'#E8002D':'rgba(255,255,255,0.6)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
      </button>
      <button class="player-ctrl-md" on:click={playPrev}>
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="19,20 9,12 19,4"/><rect x="5" y="4" width="2" height="16" rx="1"/></svg>
      </button>
      <button class="player-play-btn" on:click={togglePlay}>
        {#if playing}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="{playerGradient}" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="{playerGradient}" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>
        {/if}
      </button>
      <button class="player-ctrl-md" on:click={playNext}>
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5,4 15,12 5,20"/><rect x="17" y="4" width="2" height="16" rx="1"/></svg>
      </button>
      <button class="player-ctrl-sm" on:click={() => { repeatMode=(repeatMode+1)%3; showToast(['Repetir desligado','Repetir tudo','Repetir uma'][repeatMode]); }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{repeatMode>0?'#E8002D':'rgba(255,255,255,0.6)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </button>
    </div>

    <!-- Bottom actions -->
    <div class="player-actions">
      <button class="icon-btn" on:click={() => showToast('Partilhar')}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/share.svg');-webkit-mask-image:url('/icons/svg/share.svg');background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
      </button>
      <button class="icon-btn" on:click={() => showToast('Adicionar a playlist')}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/add.svg');-webkit-mask-image:url('/icons/svg/add.svg');background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
      </button>
      <button class="icon-btn" on:click={() => showToast('Download')}>
        <span class="svg-mask" style="mask-image:url('/icons/svg/download.svg');-webkit-mask-image:url('/icons/svg/download.svg');background:rgba(255,255,255,0.6);width:20px;height:20px;"></span>
      </button>
    </div>

  </div>
{/if}

<style>
  .root { position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; }

  /* APPBAR */
  .appbar { display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;flex-shrink:0; }
  .appbar-title { font-size:17px;font-weight:700;letter-spacing:-.3px; }

  /* ICON BTNS */
  .icon-btn { width:36px;height:36px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s;flex-shrink:0; }
  .icon-btn:active { opacity:0.5; }
  .icon-btn-sm { width:32px;height:32px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .15s;flex-shrink:0; }
  .icon-btn-sm:active { opacity:0.5; }

  /* BODY */
  .body { flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch; }

  /* CHIPS */
  .chips-row { display:flex;gap:8px;padding:16px 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .chips-row::-webkit-scrollbar { display:none; }
  .chip { border:none;border-radius:999px;padding:8px 18px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:inherit;transition:background .15s,color .15s; }

  /* SECTIONS */
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .see-all-btn { background:none;border:none;font-size:14px;cursor:pointer;font-family:inherit;padding:0; }

  /* ALBUMS */
  .h-scroll { display:flex;gap:12px;padding:0 16px 8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .album-card { flex-shrink:0;width:148px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .album-img-wrap { width:148px;height:148px;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .album-img { width:100%;height:100%;object-fit:cover;display:block; }
  .album-title { display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .album-artist { display:block;font-size:12px;margin-top:2px; }

  /* TRACKS */
  .tracks-list { display:flex;flex-direction:column;padding:4px 16px; }
  .track-row { display:flex;align-items:center;gap:12px;padding:10px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .track-thumb-wrap { position:relative;flex-shrink:0; }
  .track-thumb { width:50px;height:50px;border-radius:8px;object-fit:cover;display:block; }
  .thumb-playing { position:absolute;inset:0;background:rgba(0,0,0,0.45);border-radius:8px;display:flex;align-items:center;justify-content:center; }
  .track-info { flex:1;min-width:0; }
  .track-title { display:block;font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .track-artist { display:block;font-size:13px;margin-top:2px; }

  /* LOADER */
  .center-pad { display:flex;align-items:center;justify-content:center;padding:56px;flex-direction:row;gap:0; }
  .spinner { width:28px;height:28px;border-radius:50%;border:3px solid rgba(128,128,128,0.2);animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .retry-btn { border:none;border-radius:12px;padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit; }

  /* SEARCH */
  .search-page { padding:16px; }
  .search-bar { display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;margin-bottom:24px; }
  .search-input { flex:1;border:none;background:transparent;font-size:16px;outline:none;font-family:inherit; }
  .search-hint { font-size:15px;text-align:center;margin:48px 0 0; }

  /* LIBRARY */
  .lib-header { display:flex;align-items:center;justify-content:space-between;padding:20px 16px 12px; }
  .lib-title { font-size:24px;font-weight:800;letter-spacing:-.5px; }
  .lib-tabs { display:flex;padding:0 16px;gap:0; }
  .lib-tab { flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:10px 0;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:color .15s; }
  .lib-list { display:flex;flex-direction:column;padding:8px 16px; }
  .lib-row { display:flex;align-items:center;gap:14px;padding:11px 0;background:transparent;border:none;cursor:pointer;text-align:left;width:100%; }
  .lib-row:active { opacity:0.7; }
  .lib-sq { width:50px;height:50px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
  .lib-avatar { width:50px;height:50px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
  .lib-avatar-letter { font-size:20px;font-weight:700;color:#fff; }
  .lib-row-info { flex:1;min-width:0; }
  .lib-row-title { display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .lib-row-sub { display:block;font-size:13px;margin-top:2px; }
  .lib-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px; }
  .lib-grid-card { background:transparent;border:none;cursor:pointer;text-align:left;padding:0; }
  .lib-grid-img-wrap { width:100%;aspect-ratio:1;border-radius:10px;overflow:hidden;margin-bottom:8px; }
  .lib-grid-img { width:100%;height:100%;object-fit:cover;display:block; }
  .lib-grid-title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .lib-grid-sub { display:block;font-size:12px;margin-top:2px; }

  /* MINI PLAYER */
  .mini-player {
    position:absolute;
    left:12px;right:12px;
    bottom:calc(env(safe-area-inset-bottom,0px) + 56px + 12px);
    border-radius:16px;
    display:flex;align-items:center;gap:12px;
    padding:10px 12px;
    cursor:pointer;
    backdrop-filter:blur(20px);
    -webkit-backdrop-filter:blur(20px);
    z-index:50;
    box-shadow:0 4px 24px rgba(0,0,0,0.18);
  }
  .mini-thumb { width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0; }
  .mini-info { flex:1;min-width:0; }
  .mini-title { display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .mini-artist { display:block;font-size:12px; }

  /* BOTTOM BAR */
  .bottom-bar { flex-shrink:0;display:flex;align-items:center;justify-content:space-around;padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));position:relative;z-index:40; }
  .tab-btn { display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:4px 20px;transition:opacity .15s; }
  .tab-btn:active { opacity:0.6; }
  .tab-icon { width:24px;height:24px;display:block; }
  .tab-label { font-size:10px;font-weight:500; }

  /* PLAYER SCREEN */
  .player-screen {
    position:fixed;inset:0;z-index:200;
    display:flex;flex-direction:column;
    padding:calc(env(safe-area-inset-top,0px) + 10px) 24px calc(env(safe-area-inset-bottom,0px) + 24px);
    transition:background .4s ease;
  }
  .player-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:24px; }
  .player-header-info { flex:1;text-align:center; }
  .player-header-title { font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:.04em;text-transform:uppercase; }
  .player-cover-wrap { flex:1;display:flex;align-items:center;justify-content:center;margin-bottom:28px; }
  .player-cover { width:min(75vw,320px);height:min(75vw,320px);border-radius:16px;object-fit:cover;box-shadow:0 24px 64px rgba(0,0,0,0.5); }
  .player-info-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
  .player-info { min-width:0;flex:1; }
  .player-track-title { display:block;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .player-track-artist { display:block;font-size:15px;color:rgba(255,255,255,0.65);margin-top:4px; }
  .player-progress-wrap { margin-bottom:16px; }
  .player-progress-track { position:relative;height:4px;border-radius:999px;background:rgba(255,255,255,0.2);cursor:pointer;margin-bottom:8px; }
  .player-progress-fill { height:100%;border-radius:999px;background:#fff;transition:width .5s linear; }
  .player-progress-thumb { position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff; }
  .player-times { display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.5); }
  .player-controls { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px; }
  .player-ctrl-sm { width:40px;height:40px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .player-ctrl-sm:active { opacity:0.6; }
  .player-ctrl-md { width:52px;height:52px;border-radius:50%;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer; }
  .player-ctrl-md:active { opacity:0.6; }
  .player-play-btn { width:68px;height:68px;border-radius:50%;border:none;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.3); }
  .player-play-btn:active { transform:scale(0.95); }
  .player-actions { display:flex;align-items:center;justify-content:space-around; }

  /* SVG MASK */
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
</style>