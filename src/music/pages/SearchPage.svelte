<script>
  import { createEventDispatcher } from 'svelte';
  
  export let isDark = false;
  export let bgCard = '#242424';
  export let txtPrim = '#ffffff';
  export let txtSec = '#aaaaaa';
  export let divider = 'rgba(255,255,255,0.07)';
  export let currentTrackExists = false;
  
  const dispatch = createEventDispatcher();
  
  const genres = [
    { label: 'Pop', color: '#FC3C44' },
    { label: 'Hip-Hop', color: '#5856D6' },
    { label: 'R&B', color: '#FF9500' },
    { label: 'Electronic', color: '#007AFF' },
    { label: 'Rock', color: '#34C759' },
    { label: 'Afro', color: '#FF2D55' },
    { label: 'Jazz', color: '#AF52DE' },
    { label: 'Clássica', color: '#FF6B35' },
    { label: 'Kizomba', color: '#E8002D' },
    { label: 'Kuduro', color: '#FF9F0A' },
  ];
  
  function openSearch() {
    dispatch('openSearch');
  }
</script>

<div class="page">
  
  <!-- Search trigger (não é input real, abre a tela de pesquisa) -->
  <div class="search-wrap">
    <button class="search-bar" style="background:{bgCard}" on:click={openSearch}>
      <span class="svg-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');background:{txtSec};width:17px;height:17px;"></span>
      <span class="search-placeholder" style="color:{txtSec}">O que queres ouvir?</span>
    </button>
  </div>
  
  <!-- Explorar géneros -->
  <div class="section-hdr">
    <span class="section-title" style="color:{txtPrim}">Explorar</span>
  </div>
  <div class="genre-grid">
    {#each genres as g}
      <button class="genre-card" style="background:{g.color}" on:click={openSearch}>
        <span class="genre-label">{g.label}</span>
      </button>
    {/each}
  </div>

</div>

<div style="height:{currentTrackExists?148:88}px"></div>

<style>
  .page { padding:0 0 8px; }
  .search-wrap { padding:8px 16px 8px; }
  .search-bar { display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;border:none;width:100%;cursor:pointer;text-align:left;transition:opacity .15s,transform .15s; }
  .search-bar:active { opacity:0.7;transform:scale(0.99); }
  .search-placeholder { font-size:16px;font-family:inherit; }
  .svg-mask { display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;flex-shrink:0; }
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:16px 16px 10px; }
  .section-title { font-size:20px;font-weight:800;letter-spacing:-.4px; }
  .genre-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px; }
  .genre-card { border:none;border-radius:12px;padding:20px 16px;cursor:pointer;text-align:left;min-height:80px;display:flex;align-items:flex-end;transition:opacity .15s,transform .15s; }
  .genre-card:active { opacity:0.8;transform:scale(0.97); }
  .genre-label { font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px; }
</style>