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
  
  const videos = [
    { name: 'Natureza Angola', meta: '4K · 2h 14m', bg: 'linear-gradient(135deg,#10B981,#34D399)' },
    { name: 'City Timelapse', meta: 'HD · 45m', bg: 'linear-gradient(135deg,#2F7BF6,#6D8CFF)' },
    { name: 'Ocean Waves', meta: '4K · 1h 02m', bg: 'linear-gradient(135deg,#06B6D4,#22D3EE)' },
    { name: 'Tech Review Ep.12', meta: 'HD · 28m', bg: 'linear-gradient(135deg,#8B5CF6,#A78BFA)' },
  ];
  const files = [
    { name: 'Relatório Q1.pdf', meta: 'PDF · 2.4 MB', bg: '#EF4444', icon: '/icons/svg/external.svg' },
    { name: 'Apresentação.pptx', meta: 'PPTX · 8.1 MB', bg: '#F59E0B', icon: '/icons/svg/desktop.svg' },
    { name: 'Base de dados.xlsx', meta: 'XLSX · 1.2 MB', bg: '#10B981', icon: '/icons/svg/sheets.svg' },
    { name: 'Notas projeto.txt', meta: 'TXT · 48 KB', bg: '#6B7280', icon: '/icons/svg/find.svg' },
  ];
  
  let activeTab = 'videos',
    drawerOpen = false,
    showSettings = false;
</script>

<div class="media-shell" style="background:{isDark?'#0F0F0F':'#F9FAFB'}">
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="icon-btn pulse-tap" style="color:{c.iconTint}" on:click={()=> drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <div style="margin-left:8px">
      <div style="font-size:17px;font-weight:800;color:{c.textPrimary};line-height:1">Media</div>
      <div style="font-size:11px;color:{c.textSecondary};margin-top:1px">Vídeos e ficheiros</div>
    </div>
    <div style="flex:1"></div>
    <button class="icon-btn pulse-tap" style="background:{c.addCircleBg}">
      <span class="icon-mask" style="mask-image:url('/icons/svg/search.svg');-webkit-mask-image:url('/icons/svg/search.svg');width:17px;height:17px;background:{c.iconTint}"></span>
    </button>
  </div>
  
  <Drawer {isDark} {user} open={drawerOpen} activeApp="media" on:close={()=> drawerOpen=false}
    on:switchApp={(e) => { drawerOpen=false; dispatch('nav',{to:e.detail.id,data:{user}}); }}
    on:settings={() => { drawerOpen=false; showSettings=true; }}
    />
    
    <div class="tabs" style="border-color:{c.divider}">
      {#each ['videos','files'] as tab}
      <button class="tab" class:active={activeTab===tab} style="color:{activeTab===tab?'#2F7BF6':c.textSecondary}" on:click={() => activeTab=tab}>
        {tab==='videos'?'Vídeos':'Ficheiros'}
      </button>
    {/each}
  </div>

  <div class="content">
    {#if activeTab === 'videos'}
      <div class="grid">
        {#each videos as v}
          <div class="vid-item pulse-tap" style="background:{isDark?'#1C1C1E':'#FFFFFF'};border-color:{c.divider}" on:click={() => showToast(`A abrir: ${v.name}`)}>
            <div class="vid-thumb" style="background:{v.bg}">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,.85)"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div class="vid-name" style="color:{c.textPrimary}">{v.name}</div>
            <div class="vid-meta" style="color:{c.textSecondary}">{v.meta}</div>
          </div>
        {/each}
      </div>
    {:else}
      {#each files as f, i}
        <div class="file-row pulse-tap" on:click={() => showToast(`A abrir: ${f.name}`)}>
          <div class="file-icon" style="background:{f.bg}20">
            <span class="icon-mask" style="mask-image:url('{f.icon}');-webkit-mask-image:url('{f.icon}');width:18px;height:18px;background:{f.bg}"></span>
          </div>
          <div style="flex:1;min-width:0">
            <div class="file-name" style="color:{c.textPrimary}">{f.name}</div>
            <div class="file-meta" style="color:{c.textSecondary}">{f.meta}</div>
          </div>
          <span class="icon-mask" style="mask-image:url('/icons/svg/more_vertical.svg');-webkit-mask-image:url('/icons/svg/more_vertical.svg');width:14px;height:14px;background:{c.iconTintSecondary};flex-shrink:0"></span>
        </div>
        {#if i < files.length-1}<div class="divider" style="background:{c.divider}"></div>{/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .media-shell { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; }
  .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; background:none; }
  .tabs { display:flex; border-bottom:1px solid; margin-top:60px; padding:0 16px; gap:0; flex-shrink:0; }
  .tab { flex:1; padding:12px 0; text-align:center; font-size:13px; font-weight:600; cursor:pointer; border:none; background:transparent; font-family:inherit; position:relative; transition:color .15s; }
  .tab.active::after { content:''; position:absolute; bottom:0; left:16px; right:16px; height:2px; background:#2F7BF6; border-radius:2px 2px 0 0; }
  .content { flex:1; padding-bottom:104px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:14px 16px; }
  .vid-item { border-radius:12px; overflow:hidden; cursor:pointer; transition:transform .12s; border:1px solid; }
  .vid-item:active { transform:scale(0.97); }
  .vid-thumb { height:80px; display:flex; align-items:center; justify-content:center; }
  .vid-name { font-size:12px; font-weight:600; padding:8px 10px 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .vid-meta { font-size:11px; padding:0 10px 10px; }
  .file-row { display:flex; align-items:center; gap:12px; padding:10px 16px; cursor:pointer; transition:background .12s; }
  .file-row:active { background:rgba(127,127,127,.06); }
  .file-icon { width:40px; height:40px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .file-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .file-meta { font-size:11px; margin-top:2px; }
  .divider { height:1px; margin:0 16px; }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>
{#if showSettings}
  <SettingsPage {isDark} {user}
    on:close={() => showSettings=false}
    on:themeChange={(e) => dispatch('nav', { to: 'media', data: { isDark: e.detail.isDark } })}
    on:logout={() => dispatch('nav', { to: 'login', data: { logout: true } })}
  />
{/if}