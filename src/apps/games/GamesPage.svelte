<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { showToast } from '../../core/utils.js';
  import Drawer from '../shared/Drawer.svelte';
  
  export let isDark = false;
  export let user = null;
  
  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);
  
  const cats = ['Todos', 'Ação', 'Puzzle', 'Corrida', 'RPG', 'Casual'];
  const games = [
    { title: 'Pixel Runner', genre: 'Ação', badge: 'Novo', bg: 'linear-gradient(135deg,#2F7BF6,#6D8CFF)' },
    { title: 'Mind Maze', genre: 'Puzzle', badge: 'Top', bg: 'linear-gradient(135deg,#8B5CF6,#A78BFA)' },
    { title: 'Turbo Drift', genre: 'Corrida', badge: '', bg: 'linear-gradient(135deg,#EF4444,#F87171)' },
    { title: 'Shadow Quest', genre: 'RPG', badge: 'Beta', bg: 'linear-gradient(135deg,#374151,#6B7280)' },
    { title: 'Block Party', genre: 'Casual', badge: '', bg: 'linear-gradient(135deg,#10B981,#34D399)' },
    { title: 'Star Sector', genre: 'Ação', badge: 'Novo', bg: 'linear-gradient(135deg,#F59E0B,#FBBF24)' },
    { title: 'Word Storm', genre: 'Puzzle', badge: '', bg: 'linear-gradient(135deg,#EC4899,#F472B6)' },
    { title: 'Drift Kings', genre: 'Corrida', badge: 'Top', bg: 'linear-gradient(135deg,#06B6D4,#22D3EE)' },
  ];
  
  let activeCat = 'Todos',
    drawerOpen = false;
  $: filtered = activeCat === 'Todos' ? games : games.filter(g => g.genre === activeCat);
  $: sectionLabel = activeCat === 'Todos' ? 'Todos os Jogos' : activeCat;
  const drawerMenuItems = [
    { icon: 'game_filled', label: 'Todos os Jogos', action: () => { activeCat = 'Todos'; } },
    { icon: 'bookmark', label: 'Favoritos', action: () => showToast('Favoritos em breve') },
    { icon: 'settings', label: 'Definições', action: () => showToast('Definições em breve') },
  ];
</script>

<div class="games-shell" style="background:{isDark?'#0F0F0F':'#F9FAFB'}">
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="icon-btn pulse-tap" style="color:{c.iconTint}" on:click={()=> drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <div style="margin-left:8px">
      <div style="font-size:17px;font-weight:800;color:{c.textPrimary};line-height:1">Games</div>
      <div style="font-size:11px;color:{c.textSecondary};margin-top:1px">Explorar jogos</div>
    </div>
    <div style="flex:1"></div>
    <button class="icon-btn pulse-tap" style="background:{c.addCircleBg}">
      <span class="icon-mask" style="mask-image:url('/icons/svg/find.svg');-webkit-mask-image:url('/icons/svg/find.svg');width:17px;height:17px;background:{c.iconTint}"></span>
    </button>
  </div>
  
  <Drawer {isDark} {user} open={drawerOpen}
    title="Games" subtitle="Explorar jogos"
    menuItems={drawerMenuItems}
    on:close={()=> drawerOpen=false}
    />
    
    <div class="content">
      <div class="cats">
        {#each cats as cat}
        <button class="chip" class:active={cat===activeCat} style="{cat===activeCat?'background:#2F7BF6;border-color:#2F7BF6;color:#fff':`border-color:${c.divider};color:${c.textSecondary}`}" on:click={() => activeCat=cat}>{cat}</button>
      {/each}
    </div>
    <div class="section-label" style="color:{c.textSecondary}">{sectionLabel}</div>
    <div class="grid">
      {#each filtered as game}
        <div class="card pulse-tap" style="background:{isDark?'#1C1C1E':'#FFFFFF'};border-color:{c.divider}" on:click={() => showToast(`A abrir: ${game.title}`)}>
          <div class="card-thumb" style="background:{game.bg}">
            <span class="icon-mask" style="mask-image:url('/icons/svg/game_filled.svg');-webkit-mask-image:url('/icons/svg/game_filled.svg');width:32px;height:32px;background:rgba(255,255,255,.85)"></span>
          </div>
          {#if game.badge}<div class="badge">{game.badge}</div>{/if}
          <div class="card-body">
            <div class="card-title" style="color:{c.textPrimary}">{game.title}</div>
            <div class="card-genre" style="color:{c.textSecondary}">{game.genre}</div>
          </div>
        </div>
      {/each}
    </div>
    <div style="height:24px"></div>
  </div>
</div>

<style>
  .games-shell { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; }
  .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; background:none; }
  .content { padding-top:68px; flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .cats { display:flex; gap:8px; padding:8px 16px 0; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .cats::-webkit-scrollbar { display:none; }
  .chip { flex-shrink:0; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid; background:transparent; font-family:inherit; transition:all .15s; white-space:nowrap; }
  .section-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:18px 16px 10px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 16px; }
  .card { border-radius:16px; overflow:hidden; cursor:pointer; border:1px solid; transition:transform .12s; position:relative; }
  .card:active { transform:scale(0.97); }
  .card-thumb { height:90px; display:flex; align-items:center; justify-content:center; }
  .card-body { padding:10px 12px 12px; }
  .card-title { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .card-genre { font-size:11px; margin-top:2px; }
  .badge { position:absolute; top:8px; right:8px; background:rgba(0,0,0,.42); color:#fff; font-size:10px; font-weight:700; padding:3px 8px; border-radius:10px; }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>