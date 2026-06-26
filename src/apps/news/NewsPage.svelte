<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { showToast } from '../../core/utils.js';
  import Drawer from '../shared/Drawer.svelte';
  import SettingsPage from '../ai/SettingsPage.svelte';
  
  export let isDark = false;
  export let user = null;
  
  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);
  
  const cats = ['Todos', 'Angola', 'Mundo', 'Tech', 'Desporto', 'Economia'];
  const featured = { title: 'Angola regista crescimento económico de 3.2% no primeiro trimestre', source: 'Jornal de Angola', time: '2h atrás', cat: 'Economia', bg: 'linear-gradient(135deg,#1e3a5f 0%,#2F7BF6 100%)' };
  const articles = [
    { title: 'Novo parque tecnológico será inaugurado em Luanda', source: 'Angola Digital', time: '1h', cat: 'Tech', bg: 'linear-gradient(135deg,#8B5CF6,#A78BFA)' },
    { title: 'Seleção nacional prepara amistoso internacional', source: 'Desporto AO', time: '3h', cat: 'Desporto', bg: 'linear-gradient(135deg,#EF4444,#F87171)' },
    { title: 'Cimeira africana debate energias renováveis', source: 'Africa Today', time: '5h', cat: 'Mundo', bg: 'linear-gradient(135deg,#10B981,#34D399)' },
    { title: 'Kwanza regista valorização face ao dólar', source: 'Expansão AO', time: '6h', cat: 'Economia', bg: 'linear-gradient(135deg,#F59E0B,#FBBF24)' },
    { title: 'Governo lança programa de habitação social', source: 'DNA Angola', time: '8h', cat: 'Angola', bg: 'linear-gradient(135deg,#06B6D4,#22D3EE)' },
    { title: 'Startup angolana levanta $2M em financiamento seed', source: 'TechMundo', time: '10h', cat: 'Tech', bg: 'linear-gradient(135deg,#EC4899,#F472B6)' },
  ];
  
  let activeCat = 'Todos',
    drawerOpen = false,
    showSettings = false;
  $: filteredArts = activeCat === 'Todos' ? articles : articles.filter(a => a.cat === activeCat);
  $: showFeatured = activeCat === 'Todos' || activeCat === featured.cat;
</script>

<div class="news-shell" style="background:{isDark?'#0F0F0F':'#F9FAFB'}">
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="icon-btn pulse-tap" style="color:{c.iconTint}" on:click={()=> drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <div style="margin-left:8px">
      <div style="font-size:17px;font-weight:800;color:{c.textPrimary};line-height:1">News</div>
      <div style="font-size:11px;color:{c.textSecondary};margin-top:1px">Notícias do dia</div>
    </div>
    <div style="flex:1"></div>
    <button class="icon-btn pulse-tap" style="background:{c.addCircleBg}">
      <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');width:17px;height:17px;background:{c.iconTint}"></span>
    </button>
  </div>
  
  <Drawer {isDark} {user} open={drawerOpen} activeApp="news" on:close={()=> drawerOpen=false}
    on:switchApp={(e) => { drawerOpen=false; dispatch('nav',{to:e.detail.id,data:{user}}); }}
    on:settings={() => { drawerOpen=false; showSettings=true; }}
    />
    
    <div class="content">
      <div class="cats">
        {#each cats as cat}
        <button class="chip" style="{cat===activeCat?'background:#2F7BF6;border-color:#2F7BF6;color:#fff':`border-color:${c.divider};color:${c.textSecondary}`}" on:click={() => activeCat=cat}>{cat}</button>
      {/each}
    </div>
    {#if showFeatured}
      <div class="featured pulse-tap" on:click={() => showToast(`A abrir: ${featured.title}`)}>
        <div class="featured-thumb" style="background:{featured.bg}">
          <div class="featured-cat-label">{featured.cat}</div>
          <div>
            <div class="featured-title">{featured.title}</div>
            <div class="featured-meta">{featured.source} · {featured.time}</div>
          </div>
        </div>
      </div>
    {/if}
    <div class="section-label" style="color:{c.textSecondary}">Mais Notícias</div>
    {#each filteredArts as art, i}
      <div class="news-row pulse-tap" on:click={() => showToast(`A abrir: ${art.title}`)}>
        <div class="row-thumb" style="background:{art.bg}">
          <span class="icon-mask" style="mask-image:url('/icons/svg/web.svg');-webkit-mask-image:url('/icons/svg/web.svg');width:24px;height:24px;background:rgba(255,255,255,.85)"></span>
        </div>
        <div class="row-info">
          <div class="row-title" style="color:{c.textPrimary}">{art.title}</div>
          <div class="row-meta" style="color:{c.textSecondary}">{art.source} · {art.time}</div>
        </div>
      </div>
      {#if i < filteredArts.length-1}<div class="divider" style="background:{c.divider}"></div>{/if}
    {/each}
    {#if !filteredArts.length}
      <div style="padding:32px 16px;text-align:center;font-size:14px;color:{c.textSecondary}">Sem notícias nesta categoria</div>
    {/if}
    <div style="height:24px"></div>
  </div>
</div>

<style>
  .news-shell { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; }
  .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; background:none; }
  .content { padding-top:68px; padding-bottom:104px; flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .cats { display:flex; gap:8px; padding:8px 16px 0; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .cats::-webkit-scrollbar { display:none; }
  .chip { flex-shrink:0; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid; background:transparent; font-family:inherit; transition:all .15s; white-space:nowrap; }
  .featured { margin:14px 16px 0; border-radius:18px; overflow:hidden; cursor:pointer; transition:transform .12s; }
  .featured:active { transform:scale(0.98); }
  .featured-thumb { height:160px; display:flex; align-items:flex-end; padding:16px; position:relative; }
  .featured-cat-label { background:#2F7BF6; color:#fff; font-size:10px; font-weight:700; letter-spacing:.06em; padding:3px 10px; border-radius:10px; position:absolute; top:12px; left:12px; }
  .featured-title { font-size:16px; font-weight:800; color:#fff; line-height:1.3; text-shadow:0 1px 8px rgba(0,0,0,.5); }
  .featured-meta { font-size:11px; color:rgba(255,255,255,.72); margin-top:4px; }
  .section-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:18px 16px 8px; }
  .news-row { display:flex; align-items:flex-start; gap:12px; padding:10px 16px; cursor:pointer; transition:background .12s; }
  .news-row:active { background:rgba(127,127,127,.06); }
  .row-thumb { width:72px; height:60px; border-radius:10px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .row-info { flex:1; min-width:0; }
  .row-title { font-size:13px; font-weight:700; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .row-meta { font-size:11px; margin-top:5px; }
  .divider { height:1px; margin:0 16px; }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>
{#if showSettings}
  <SettingsPage {isDark} {user}
    on:close={() => showSettings=false}
    on:themeChange={(e) => dispatch('nav', { to: 'news', data: { isDark: e.detail.isDark } })}
    on:logout={() => dispatch('nav', { to: 'login', data: { logout: true } })}
  />
{/if}