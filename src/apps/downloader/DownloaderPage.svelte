<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors } from '../../core/theme.js';
  import { showToast } from '../../core/utils.js';
  import Drawer from '../shared/Drawer.svelte';
  
  export let isDark = false;
  export let user = null;
  
  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);
  
  const downloads = [
    { name: 'Angola_Luanda_4K.mp4', meta: '1.2 GB · Vídeo', progress: 100, status: 'done' },
    { name: 'Relatório_Anual_2024.pdf', meta: '4.8 MB · PDF', progress: 67, status: 'active' },
    { name: 'Soundtrack_OST.zip', meta: '342 MB · Arquivo', progress: 38, status: 'active' },
    { name: 'Apresentação_Final.pptx', meta: '18 MB · PPTX', progress: 100, status: 'done' },
    { name: 'Dataset_CSV_2024.zip', meta: '89 MB · Arquivo', progress: 0, status: 'paused' },
  ];
  
  const statusLabel = { done: 'Concluído', active: 'A transferir', paused: 'Pausado' };
  const statusColor = { done: '#10B981', active: '#2F7BF6', paused: '#F59E0B' };
  const statusIcon = { done: '/icons/svg/download.svg', active: '/icons/svg/refresh.svg', paused: '/icons/svg/warning.svg' };
  
  let urlInput = '',
    drawerOpen = false;
</script>

<div class="dl-shell" style="background:{isDark?'#0F0F0F':'#F9FAFB'}">
  <div class="appbar-gradient" class:dark={isDark}></div>
  <div class="appbar">
    <button class="icon-btn pulse-tap" style="color:{c.iconTint}" on:click={()=> drawerOpen=true}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');width:18px;height:18px;background:{c.iconTint}"></span>
    </button>
    <div style="margin-left:8px">
      <div style="font-size:17px;font-weight:800;color:{c.textPrimary};line-height:1">Downloader</div>
      <div style="font-size:11px;color:{c.textSecondary};margin-top:1px">Transferências</div>
    </div>
    <div style="flex:1"></div>
    <button class="icon-btn pulse-tap" style="background:{c.addCircleBg}">
      <span class="icon-mask" style="mask-image:url('/icons/svg/folder.svg');-webkit-mask-image:url('/icons/svg/folder.svg');width:17px;height:17px;background:{c.iconTint}"></span>
    </button>
  </div>
  
  <Drawer {isDark} {user} open={drawerOpen} activeApp="downloader" on:close={()=> drawerOpen=false}
    on:switchApp={(e) => { drawerOpen=false; dispatch('nav',{to:e.detail.id,data:{user}}); }}
    on:settings={() => { drawerOpen=false; showToast('Definições em breve'); }}
    />
    
    <div class="content">
      <div class="input-wrap" style="background:{isDark?'#1C1C1E':'#FFFFFF'};border-color:{c.divider}">
        <span class="icon-mask" style="mask-image:url('/icons/svg/link.svg');-webkit-mask-image:url('/icons/svg/link.svg');width:15px;height:15px;background:{c.iconTintSecondary};flex-shrink:0"></span>
        <input type="url" placeholder="Colar link para transferir..." style="color:{c.textPrimary}" bind:value={urlInput} />
        <button class="go-btn pulse-tap" on:click={()=> { if(!urlInput.trim()){showToast('Cola um link primeiro');return;} showToast('Transferência adicionada'); urlInput=''; }}>Transferir</button>
      </div>
      <div class="section-label" style="color:{c.textSecondary}">Transferências</div>
      {#each downloads as d, i}
      <div class="dl-item pulse-tap" on:click={() => { if(d.status==='done')showToast(`A abrir: ${d.name}`); else if(d.status==='active')showToast(`A transferir: ${d.progress}% concluído`); else showToast('Transferência pausada'); }}>
        <div class="dl-icon" style="background:{statusColor[d.status]}20">
          <span class="icon-mask" style="mask-image:url('{statusIcon[d.status]}');-webkit-mask-image:url('{statusIcon[d.status]}');width:18px;height:18px;background:{statusColor[d.status]}"></span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="dl-name" style="color:{c.textPrimary}">{d.name}</div>
          <div class="dl-meta" style="color:{c.textSecondary}">{d.meta}{d.status==='active'?` · ${d.progress}%`:''}</div>
          {#if d.status === 'active'}
            <div class="progress-wrap" style="background:{c.divider}"><div class="progress-bar" style="width:{d.progress}%;background:#2F7BF6"></div></div>
          {/if}
        </div>
        <span class="status-pill {d.status}" style="background:{statusColor[d.status]}20;color:{statusColor[d.status]}">{statusLabel[d.status]}</span>
      </div>
      {#if i < downloads.length-1}<div class="divider" style="background:{c.divider}"></div>{/if}
    {/each}
  </div>
</div>

<style>
  .dl-shell { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .appbar-gradient { position:absolute; top:0; left:0; right:0; height:90px; pointer-events:none; z-index:39; }
  .appbar-gradient:not(.dark) { background:linear-gradient(to bottom,rgba(249,250,251,1) 0%,rgba(249,250,251,.95) 45%,rgba(249,250,251,0) 100%); }
  .appbar-gradient.dark { background:linear-gradient(to bottom,rgba(15,15,15,1) 0%,rgba(15,15,15,.95) 45%,rgba(15,15,15,0) 100%); }
  .appbar { position:absolute; top:0; left:0; right:0; z-index:40; height:60px; display:flex; align-items:center; padding:0 8px; }
  .icon-btn { width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; background:none; }
  .content { padding-top:68px; flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; }
  .input-wrap { margin:8px 16px 0; border:1.5px solid; border-radius:14px; padding:0 14px; display:flex; align-items:center; gap:10px; height:48px; }
  .input-wrap input { flex:1; border:none; outline:none; background:transparent; font-size:14px; font-family:inherit; -webkit-user-select:text; user-select:text; }
  .input-wrap input::placeholder { color:rgba(127,127,127,.7); }
  .go-btn { height:32px; padding:0 16px; border-radius:10px; background:#2F7BF6; color:#fff; font-size:13px; font-weight:700; font-family:inherit; border:none; cursor:pointer; flex-shrink:0; }
  .go-btn:active { opacity:.85; transform:scale(0.96); }
  .section-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:18px 16px 8px; }
  .dl-item { display:flex; align-items:center; gap:12px; padding:10px 16px; cursor:pointer; transition:background .12s; }
  .dl-item:active { background:rgba(127,127,127,.06); }
  .dl-icon { width:40px; height:40px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .dl-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .dl-meta { font-size:11px; margin-top:2px; }
  .progress-wrap { height:3px; border-radius:2px; margin-top:5px; overflow:hidden; }
  .progress-bar { height:100%; border-radius:2px; transition:width .4s ease; }
  .status-pill { font-size:10px; font-weight:700; padding:3px 9px; border-radius:10px; flex-shrink:0; }
  .divider { height:1px; margin:0 16px; }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1),opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform:scale(0.97); opacity:.86; }
  .icon-mask { display:block; background-color:currentColor; mask-size:contain; -webkit-mask-size:contain; mask-repeat:no-repeat; -webkit-mask-repeat:no-repeat; mask-position:center; -webkit-mask-position:center; flex-shrink:0; }
</style>