<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { showToast } from '../../core/utils.js';
  import Drawer from '../shared/Drawer.svelte';

  export let isDark = false;
  export let user   = null;

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const tracks = [
    { title:'Night Drive',   artist:'Nexa Flow',      tag:'Pop' },
    { title:'Blue Horizon',  artist:'Studio Pulse',   tag:'Lo-fi' },
    { title:'Midnight Echo', artist:'Aurora Lab',     tag:'Chill' },
    { title:'City Lights',   artist:'MonoWave',       tag:'Instrumental' },
    { title:'Open Tabs',     artist:'Creative Space', tag:'Mix' },
    { title:'Solar Wind',    artist:'Dusk Theory',    tag:'Ambient' },
    { title:'Glass Road',    artist:'Echo Unit',      tag:'Electronic' },
  ];
  const grads = [
    'linear-gradient(135deg,#2F7BF6,#6D8CFF)',
    'linear-gradient(135deg,#10B981,#34D399)',
    'linear-gradient(135deg,#F59E0B,#FBBF24)',
    'linear-gradient(135deg,#8B5CF6,#A78BFA)',
    'linear-gradient(135deg,#EF4444,#F87171)',
    'linear-gradient(135deg,#06B6D4,#22D3EE)',
    'linear-gradient(135deg,#EC4899,#F472B6)',
  ];

  let filter = '', drawerOpen = false, nowPlaying = null, showSearch = false;
  $: filtered = tracks.filter(t => !filter.trim() || [t.title,t.artist,t.tag].some(v=>v.toLowerCase().includes(filter.trim().toLowerCase())));
  const drawerMenuItems = [
    { icon: 'search', label: 'Pesquisar', action: () => { showSearch = true; } },
    { icon: 'bookmark', label: 'Favoritos', action: () => showToast('Favoritos em breve') },
    { icon: 'settings', label: 'Definições', action: () => showToast('Definições em breve') },
  ];
</script>

<div class="music-shell" style="background:{isDark?'#0F0F0F':'#F9FAFB'}">
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="icon-btn pulse-tap" style="color:{c.iconTint}" on:click={() => drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <div style="margin-left:8px">
      <div style="font-size:17px;font-weight:800;color:{c.textPrimary};line-height:1">Music</div>
      <div style="font-size:11px;color:{c.textSecondary};margin-top:1px">Pesquisar e ouvir</div>
    </div>
    <div style="flex:1"></div>
    <button class="icon-btn pulse-tap" style="background:{c.addCircleBg}" on:click={() => { showSearch=!showSearch; if(!showSearch) filter=''; }}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');width:17px;height:17px;background:{c.iconTint}"></span>
    </button>
  </div>

  <Drawer {isDark} {user} open={drawerOpen}
    title="Music" subtitle="Pesquisar e ouvir"
    menuItems={drawerMenuItems}
    on:close={() => drawerOpen=false}
  />

  <div class="content">
    {#if showSearch}
      <div class="search-bar" style="background:{c.addCircleBg}">
        <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');width:15px;height:15px;background:{c.iconTintSecondary};flex-shrink:0"></span>
        <input type="text" placeholder="Pesquisar música ou artista..." style="color:{c.textPrimary}" bind:value={filter} />
      </div>
    {/if}
    <div class="section-label" style="color:{c.textSecondary}">Recomendações</div>
    {#each filtered as track, i}
      <div class="track-row pulse-tap" on:click={() => { nowPlaying=track; showToast(`A tocar: ${track.title}`); }}>
        <div class="track-thumb" style="background:{grads[tracks.indexOf(track)%grads.length]}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="track-info">
          <div class="track-title" style="color:{c.textPrimary}">{track.title}</div>
          <div class="track-artist" style="color:{c.textSecondary}">{track.artist}</div>
        </div>
        <span class="track-tag">{track.tag}</span>
        <button class="more-btn pulse-tap" style="background:{c.addCircleBg}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');width:14px;height:14px;background:{c.iconTintSecondary}"></span>
        </button>
      </div>
      {#if i < filtered.length-1}<div class="divider" style="background:{c.divider}"></div>{/if}
    {/each}
    {#if !filtered.length}
      <div style="padding:32px 16px;text-align:center;font-size:14px;color:{c.textSecondary}">Nenhum resultado</div>
    {/if}
    <div style="flex:1"></div>
    {#if nowPlaying}
      <div class="now-playing">
        <div class="np-thumb" style="background:{grads[tracks.indexOf(nowPlaying)%grads.length]}"></div>
        <div style="flex:1;min-width:0">
          <div class="np-title">{nowPlaying.title}</div>
          <div class="np-artist">{nowPlaying.artist}</div>
        </div>
        <button class="np-btn pulse-tap"><span class="icon-mask" style="mask-image:url('/icons/svg/flash_filled.svg');-webkit-mask-image:url('/icons/svg/flash_filled.svg');width:15px;height:15px;background:#fff"></span></button>
        <button class="np-btn pulse-tap" on:click={() => nowPlaying=null}><span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');width:13px;height:13px;background:#fff"></span></button>
      </div>
    {/if}
  </div>
</div>

<style>
  .music-shell { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; }
  .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; background:none; }
  .content { padding-top:68px; flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; }
  .search-bar { display:flex; align-items:center; gap:10px; margin:8px 16px 0; border-radius:14px; padding:0 14px; height:44px; }
  .search-bar input { flex:1; border:none; outline:none; background:transparent; font-size:14px; font-family:inherit; -webkit-user-select:text; user-select:text; }
  .search-bar input::placeholder { color:rgba(127,127,127,.7); }
  .section-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:18px 16px 8px; }
  .track-row { display:flex; align-items:center; gap:12px; padding:10px 16px; cursor:pointer; transition:background .12s; }
  .track-row:active { background:rgba(127,127,127,.06); }
  .track-thumb { width:46px; height:46px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .track-info { flex:1; min-width:0; }
  .track-title { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .track-artist { font-size:12px; margin-top:2px; }
  .track-tag { font-size:11px; font-weight:600; color:#2F7BF6; flex-shrink:0; }
  .more-btn { width:32px; height:32px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer; }
  .divider { height:1px; margin:0 16px; }
  .now-playing { margin:8px 16px 20px; border-radius:16px; padding:12px 14px; display:flex; align-items:center; gap:12px; background:#2F7BF6; }
  .np-thumb { width:36px; height:36px; border-radius:8px; flex-shrink:0; }
  .np-title { font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .np-artist { font-size:11px; color:rgba(255,255,255,.72); margin-top:1px; }
  .np-btn { width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; border:none; }
  .np-btn:active { background:rgba(255,255,255,.35); }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>