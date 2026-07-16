<!-- docs/pages/ExportPickerPage.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let docName = '';
  export let mode = 'export';
  export let getHtml = () => '';
  export let setSuppressRouterPopstate = () => {};
  // slideX vem PRONTO do spring do MainPage pai — mesmo padrão do profile
  export let slideX = 100;

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  let selectedFormat = 'docx';
  let currentPath = '';
  let entries = [];
  let loading = true;
  let permissionNeeded = false;
  let exporting = false;

  let folderStack = [];

  function pushFolderState(depth) {
    const currentUrl = window.location.pathname + window.location.search;
    history.pushState({ nexaExportPicker: true, depth }, '', currentUrl + '#export-picker');
  }

  function onPopState() {
    const state = history.state;
    if (state && state.nexaExportPicker !== undefined) return;
    setSuppressRouterPopstate(true);
    if (folderStack.length > 1) {
      folderStack = folderStack.slice(0, -1);
      loadPath(folderStack[folderStack.length - 1]);
      pushFolderState(folderStack.length - 1);
    } else {
      window.removeEventListener('popstate', onPopState);
      dispatch('close');
    }
    setSuppressRouterPopstate(false);
  }

  let exportResolvers = new Map();
  let exportRequestId = 0;

  function buzz() {
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  }

  function exportDocumentAsync(html, targetPath, format, mode) {
    return new Promise((resolve) => {
      const requestId = ++exportRequestId;
      exportResolvers.set(requestId, resolve);
      window.AndroidStorage.exportDocument(requestId, html, targetPath, format, mode);
    });
  }

  onMount(() => {
    window.onNexaExportResult = (requestId, resultRaw) => {
      const resolver = exportResolvers.get(requestId);
      if (resolver) { exportResolvers.delete(requestId); resolver(resultRaw); }
    };
  });
  onDestroy(() => { delete window.onNexaExportResult; });

  onMount(() => {
    window.addEventListener('popstate', onPopState);
    pushFolderState(0);
    checkPermissionAndLoad();
  });
  onDestroy(() => { window.removeEventListener('popstate', onPopState); });

  function closePage() {
    if (history.state && history.state.nexaExportPicker !== undefined) {
      history.back();
    } else {
      window.removeEventListener('popstate', onPopState);
      dispatch('close');
    }
  }

  function goBackFolder() { buzz(); closePage(); }

  async function checkPermissionAndLoad() {
    if (!window.AndroidStorage) { showToast('Acesso ao armazenamento não disponível'); return; }
    const hasPermission = window.AndroidStorage.hasPermission();
    if (!hasPermission) { permissionNeeded = true; loading = false; return; }
    permissionNeeded = false;
    await loadRoot();
  }

  function requestPermission() { window.AndroidStorage.requestPermission(); }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && permissionNeeded) checkPermissionAndLoad();
  }
  onMount(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  async function loadRoot() {
    loading = true;
    try {
      const rootPath = window.AndroidStorage.getRootPath();
      await loadPath(rootPath);
      folderStack = [rootPath];
    } finally { loading = false; }
  }

  async function loadPath(path) {
    loading = true;
    try {
      const raw = window.AndroidStorage.listFolders(path);
      const parsed = JSON.parse(raw);
      currentPath = parsed.path;
      entries = parsed.folders || [];
    } catch (e) { showToast('Não foi possível ler esta pasta'); }
    finally { loading = false; }
  }

  function openFolder(folder) {
    buzz();
    folderStack = [...folderStack, folder.path];
    pushFolderState(folderStack.length - 1);
    loadPath(folder.path);
  }

  let showNewFolderInput = false;
  let newFolderName = '';

  function toggleNewFolder() { buzz(); showNewFolderInput = !showNewFolderInput; newFolderName = ''; }
  function confirmNewFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const ok = window.AndroidStorage.createFolder(currentPath, name);
    if (ok) { loadPath(currentPath); showNewFolderInput = false; newFolderName = ''; }
    else showToast('Não foi possível criar a pasta');
  }

  async function confirmExport() {
    if (exporting) return;
    exporting = true;
    try {
      const html = getHtml();
      const safeName = docName.replace(/[^\w\-]+/g, '_') || 'documento';
      const fileName = `${safeName}.${selectedFormat}`;
      const targetPath = `${currentPath}/${fileName}`;
      const resultRaw = await exportDocumentAsync(html, targetPath, selectedFormat, mode);
      const result = JSON.parse(resultRaw);
      if (result.ok) {
        showToast(mode === 'share' ? 'Documento partilhado' : `Exportado para ${currentPath}`);
        window.removeEventListener('popstate', onPopState);
        history.go(-(folderStack.length));
        dispatch('close');
      } else { showToast(result.error || 'Não foi possível gerar o documento'); }
    } catch (e) { showToast('Não foi possível gerar o documento'); }
    finally { exporting = false; }
  }

  $: formatIndex = selectedFormat === 'docx' ? 0 : 1;
</script>

<!-- slideX vem do spring do pai — nunca tem spring próprio aqui -->
<div class="root" style="background:{c.background};transform:translate3d({slideX}%,0,0);">

  <div class="appbar">
    <button class="appbar-btn pulse-tap" on:click={goBackFolder} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/arrow_left.svg');-webkit-mask-image:url('/icons/svg/arrow_left.svg');background:{c.iconTint};"></span>
    </button>
    <div class="appbar-title" style="color:{c.textPrimary}">
      {mode === 'share' ? 'Partilhar' : 'Exportar'} "{docName}"
    </div>
    <span class="appbar-spacer"></span>
  </div>

  {#if permissionNeeded}
    <div class="permission-gate">
      <div class="permission-text" style="color:{c.textSecondary}">
        Para exportar o documento diretamente para uma pasta do teu telemóvel, é preciso autorizar o acesso ao armazenamento.
      </div>
      <button class="primary-btn pulse-tap" on:click={requestPermission}>Autorizar acesso</button>
    </div>
  {:else}
    <div class="segmented" style="--count:2">
      <div class="segmented-thumb" style="--index:{formatIndex}"></div>
      <button class="segmented-opt" class:active={selectedFormat === 'docx'} on:click={() => { buzz(); selectedFormat = 'docx'; }}>
        <span class="segmented-opt-label">Word (.docx)</span>
      </button>
      <button class="segmented-opt" class:active={selectedFormat === 'pdf'} on:click={() => { buzz(); selectedFormat = 'pdf'; }}>
        <span class="segmented-opt-label">PDF (.pdf)</span>
      </button>
    </div>

    <div class="path-row" style="color:{c.textSecondary}">{currentPath}</div>
    <button class="new-folder-btn" on:click={toggleNewFolder}>+ Nova pasta</button>

    {#if showNewFolderInput}
      <div class="new-folder-form">
        <input class="new-folder-input" placeholder="Nome da pasta" bind:value={newFolderName}
          on:keydown={(e) => e.key === 'Enter' && confirmNewFolder()} />
        <button class="new-folder-confirm" on:click={confirmNewFolder}>Criar</button>
      </div>
    {/if}

    <div class="folder-list">
      {#if loading}
        <div class="folder-list-inner">
          {#each Array(5) as _}
            <div class="skeleton-row">
              <div class="skeleton-icon"></div>
              <div class="skeleton-line"></div>
            </div>
          {/each}
        </div>
      {:else if entries.length === 0}
        <div class="state-msg" style="color:{c.textSecondary}">Pasta vazia</div>
      {:else}
        {#each entries as folder (folder.path)}
          <button class="folder-row" on:click={() => openFolder(folder)}>
            <img src="/icons/svg/docs/color_svg/folder.svg" alt="" class="folder-icon" width="24" height="24" />
            <span class="folder-name" style="color:{c.textPrimary}">{folder.name}</span>
          </button>
        {/each}
      {/if}
    </div>

    <div class="confirm-bar">
      <button class="confirm-btn pulse-tap" on:click={confirmExport} disabled={exporting}>
        {exporting ? 'A gerar…' : (mode === 'share' ? 'Guardar e partilhar aqui' : 'Exportar para esta pasta')}
      </button>
    </div>
  {/if}
</div>

<style>
  .root {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: flex;
    flex-direction: column;
    will-change: transform;
    overflow: hidden;
    contain: layout style paint;
  }

  .appbar {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;
    flex-shrink: 0;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    background: var(--btn-bg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; padding: 0;
    transition: background .18s cubic-bezier(0.16,1,0.3,1), transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .appbar-btn:active { background: var(--btn-bg-active); transform: scale(0.88); }
  .icon-mask {
    display: block; width: 18px; height: 18px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .appbar-title {
    flex: 1; min-width: 0; text-align: center;
    font-size: 16px; font-weight: 700;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .appbar-spacer { width: 36px; flex-shrink: 0; }

  .permission-gate {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px; gap: 20px; text-align: center;
  }
  .permission-text { font-size: 14px; line-height: 1.5; }
  .primary-btn {
    border: none; border-radius: 999px; padding: 14px 28px;
    background: var(--accent-primary, #2F7BF6); color: #fff;
    font-size: 15px; font-weight: 700; cursor: pointer;
  }

  .segmented {
    position: relative; display: flex;
    margin: 4px 16px 0; background: var(--btn-bg);
    border-radius: 999px; padding: 4px;
  }
  .segmented-thumb {
    position: absolute; top: 4px; left: 4px;
    width: calc((100% - 8px) / var(--count));
    height: calc(100% - 8px); border-radius: 999px;
    background: var(--btn-solid-bg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.12);
    transform: translateX(calc(var(--index) * 100%));
    transition: transform .48s cubic-bezier(0.22, 1.42, 0.36, 1);
  }
  .segmented-opt {
    position: relative; z-index: 1; flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 10px 6px; border: none; background: transparent;
    font: inherit; cursor: pointer; border-radius: 999px;
    -webkit-tap-highlight-color: transparent;
  }
  .segmented-opt-label {
    font-size: 13.5px; font-weight: 700; color: var(--text-faint);
    transition: color .22s ease, transform .3s cubic-bezier(0.22, 1.42, 0.36, 1);
  }
  .segmented-opt.active .segmented-opt-label { color: var(--btn-solid-text); transform: scale(1.04); }
  .segmented-opt:active .segmented-opt-label { transform: scale(0.92); }

  .path-row { padding: 10px 16px 4px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .new-folder-btn {
    background: none; border: none; text-align: left;
    padding: 4px 16px 10px; font-size: 14px; font-weight: 700;
    color: var(--accent-primary, #2F7BF6); cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .new-folder-form { display: flex; gap: 8px; padding: 0 16px 12px; }
  .new-folder-input {
    flex: 1; border: none; border-radius: 12px; padding: 11px 14px;
    font-size: 14px; outline: none;
    background: var(--surface-apps-tab); color: var(--drawer-text);
  }
  .new-folder-confirm {
    background: none; border: none; font-size: 14px; font-weight: 700;
    color: var(--accent-primary, #2F7BF6); cursor: pointer; padding: 0 8px;
  }

  .folder-list { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 4px 8px; }
  .folder-row {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 13px 12px;
    text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent; border-radius: 16px;
    transition: background .16s ease, transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .folder-row:active { background: var(--row-active); transform: scale(0.98); }
  .folder-icon { flex-shrink: 0; width: 24px; height: 24px; }
  .folder-name { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .state-msg { text-align: center; padding: 40px 16px; font-size: 14px; }

  .folder-list-inner { display: flex; flex-direction: column; gap: 4px; padding: 8px 4px; }
  .skeleton-row { display: flex; align-items: center; gap: 12px; padding: 13px 12px; }
  .skeleton-icon, .skeleton-line {
    background: linear-gradient(100deg, var(--border-faint) 30%, var(--border-soft) 50%, var(--border-faint) 70%);
    background-size: 200% 100%;
    animation: shimmer 1.3s ease-in-out infinite;
  }
  .skeleton-icon { width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0; }
  .skeleton-line { flex: 1; height: 14px; border-radius: 7px; max-width: 60%; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .confirm-bar { padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 20px); flex-shrink: 0; }
  .confirm-btn {
    width: 100%; border: none; border-radius: 999px; padding: 15px;
    background: var(--accent-primary, #2F7BF6); color: #fff;
    font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .confirm-btn:disabled { opacity: 0.6; }

  .pulse-tap { transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1); }
  .pulse-tap:active { transform: scale(0.96); opacity: .82; }

  @media (prefers-reduced-motion: reduce) {
    .segmented-thumb, .segmented-opt-label, .pulse-tap { transition: none !important; }
  }
</style>