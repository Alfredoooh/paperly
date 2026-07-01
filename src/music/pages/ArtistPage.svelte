<script>
  import { currentArtist, currentPage, queue, playTrack } from '../store/music.js';
  import TrackRow from '../components/TrackRow.svelte';
  import AlbumCard from '../components/AlbumCard.svelte';
  import { fade, fly } from 'svelte/transition';

  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;

  $: artist = $currentArtist;
  $: if (artist?.topTracks) queue.set(artist.topTracks);

  function goBack() {
    currentPage.set('home');
  }

  function fmtFans(n) {
    if (!n) return '';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fãs`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K fãs`;
    return `${n} fãs`;
  }

  // Altura dinâmica do rodapé (barra aprovar + player)
  $: footerHeight = currentTrackExists ? 140 : 72;
</script>

<div class="page">
  <!-- Hero com fade nativo -->
  <div class="hero" in:fly={{ y: -20, duration: 350 }}>
    {#if artist?.picture_xl || artist?.picture_big}
      <img
        src={artist.picture_xl || artist.picture_big}
        alt={artist?.name}
        class="hero-img"
        loading="eager"
        decoding="async"
      />
    {:else if artist}
      <div class="hero-img hero-fallback">
        <span>{artist.name[0]}</span>
      </div>
    {:else}
      <div class="hero-img hero-fallback">
        <span>♪</span>
      </div>
    {/if}
    <div class="hero-overlay"></div>

    <!-- Botão voltar com transição -->
    <button class="back-btn" on:click={goBack} in:fade={{ delay: 200, duration: 200 }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>

    <!-- Informações do artista -->
    <div class="hero-info">
      <span class="hero-name">{artist?.name || 'Artista'}</span>
      {#if artist?.nb_fan}
        <span class="hero-fans">{fmtFans(artist.nb_fan)}</span>
      {/if}
    </div>

    <!-- Ações do hero -->
    <div class="hero-actions">
      <button
        class="play-all-btn"
        on:click={() => artist?.topTracks?.[0] && playTrack(artist.topTracks[0])}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg>
        Reproduzir
      </button>
      <button class="follow-btn">Seguir</button>
    </div>
  </div>

  <!-- Conteúdo principal com fade -->
  {#if artist}
    <div class="content" in:fade={{ duration: 400 }}>
      <!-- Músicas populares -->
      {#if artist.topTracks?.length}
        <div class="section-hdr">
          <span class="section-title" style="color:{txtPrim}">Músicas populares</span>
        </div>
        <div class="tracks-list">
          {#each artist.topTracks as t, i (t.id)}
            <div in:fade={{ delay: 50 + i * 30, duration: 250 }}>
              <TrackRow
                track={t}
                {isDark}
                {bgCard}
                {txtPrim}
                {txtSec}
                rank={i + 1}
              />
            </div>
          {/each}
        </div>
      {/if}

      <!-- Discografia -->
      {#if artist.albums?.length}
        <div class="section-hdr" style="margin-top:24px">
          <span class="section-title" style="color:{txtPrim}">Discografia</span>
        </div>
        <div class="h-scroll">
          {#each artist.albums as a (a.id)}
            <div in:fade={{ delay: 100, duration: 250 }}>
              <AlbumCard album={a} {txtPrim} {txtSec} {bgCard} size={148} />
            </div>
          {/each}
        </div>
      {/if}

      <!-- Artistas relacionados -->
      {#if artist.related?.length}
        <div class="section-hdr" style="margin-top:24px">
          <span class="section-title" style="color:{txtPrim}">Artistas relacionados</span>
        </div>
        <div class="h-scroll">
          {#each artist.related as ar (ar.id)}
            <button
              class="rel-card"
              on:click={() => {
                currentArtist.set(null);
                setTimeout(() => {
                  import('../store/music.js').then(m => m.loadArtist(ar));
                }, 50);
              }}
              in:fade={{ duration: 250 }}
            >
              <div class="rel-avatar">
                {#if ar.picture_medium}
                  <img src={ar.picture_medium} alt={ar.name} class="rel-img" loading="lazy" />
                {:else}
                  <div class="rel-img rel-fallback"><span>{ar.name[0]}</span></div>
                {/if}
              </div>
              <span class="rel-name" style="color:{txtPrim}">
                {ar.name?.length > 12 ? ar.name.slice(0, 12) + '…' : ar.name}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Estado de carregamento -->
    <div class="center-pad" in:fade={{ duration: 200 }}>
      <div class="spinner" style="border-top-color:{txtPrim}"></div>
    </div>
  {/if}

  <!-- Espaçador para compensar footer + player fixos -->
  <div style="height:{footerHeight}px" aria-hidden="true"></div>
</div>

<!-- 🔒 Barra "Aprovar" fixa nativa (nunca sobe) -->
<div class="approve-bar">
  <button class="approve-btn">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
    Aprovar
  </button>
</div>

<style>
  /* Scroll suave e desempenho */
  .page {
    padding: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    will-change: scroll-position;
    scroll-behavior: smooth;
  }

  /* ===== HERO ===== */
  .hero {
    position: relative;
    height: 340px;
    overflow: hidden;
    flex-shrink: 0;
    background: #1a1a1a;
  }
  .hero-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease-out;
  }
  .hero:hover .hero-img {
    transform: scale(1.02);
  }
  .hero-fallback {
    background: #2a2a2a;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hero-fallback span {
    font-size: 80px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.25);
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.85) 100%);
  }

  /* Botão voltar */
  .back-btn {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    left: 16px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s;
    z-index: 2;
  }
  .back-btn:active {
    transform: scale(0.92);
    background: rgba(0, 0, 0, 0.7);
  }

  /* Info do artista */
  .hero-info {
    position: absolute;
    bottom: 80px;
    left: 16px;
    right: 16px;
  }
  .hero-name {
    display: block;
    font-size: 38px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.8px;
    line-height: 1.1;
  }
  .hero-fans {
    display: block;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.65);
    margin-top: 6px;
    font-weight: 500;
  }

  /* Botões do hero */
  .hero-actions {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .play-all-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #FC3C44;
    border: none;
    border-radius: 999px;
    padding: 12px 26px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    box-shadow: 0 4px 14px rgba(252, 60, 68, 0.5);
  }
  .play-all-btn:active {
    opacity: 0.85;
    transform: scale(0.97);
  }
  .follow-btn {
    background: transparent;
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    border-radius: 999px;
    padding: 11px 26px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .follow-btn:active {
    background: rgba(255, 255, 255, 0.1);
    border-color: #fff;
  }

  /* ===== CONTEÚDO ===== */
  .content {
    padding-top: 4px;
  }
  .section-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 12px;
  }
  .section-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.4px;
  }
  .tracks-list {
    display: flex;
    flex-direction: column;
    padding: 0 12px;
  }
  .h-scroll {
    display: flex;
    gap: 12px;
    padding: 0 16px 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
  }
  .h-scroll::-webkit-scrollbar {
    display: none;
  }

  /* Cards de artistas relacionados */
  .rel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: transform 0.15s, opacity 0.15s;
    scroll-snap-align: start;
  }
  .rel-card:active {
    transform: scale(0.95);
    opacity: 0.8;
  }
  .rel-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
  .rel-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .rel-fallback {
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rel-fallback span {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
  }
  .rel-name {
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    max-width: 80px;
  }

  /* ===== CARREGAMENTO ===== */
  .center-pad {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 60px;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid rgba(128, 128, 128, 0.15);
    animation: spin 0.75s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ===== BARRA APROVAR FIXA ===== */
  .approve-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 25;
    background: rgba(20, 20, 20, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px);
    display: flex;
    justify-content: center;
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .approve-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #FC3C44;
    border: none;
    border-radius: 999px;
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    width: 100%;
    max-width: 340px;
    justify-content: center;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.15s;
    box-shadow: 0 6px 20px rgba(252, 60, 68, 0.45);
    letter-spacing: 0.3px;
  }
  .approve-btn:active {
    transform: scale(0.96);
    opacity: 0.9;
    box-shadow: 0 3px 10px rgba(252, 60, 68, 0.3);
  }
</style>