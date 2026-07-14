<!-- docs/pages/ExportPickerPage.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let docName = '';
  export let mode = 'export'; // 'export' | 'share'
  export let getHtml = () => '';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const slide = createSlideTransition({});
  let pageX = 100;
  const unsubscribe = slide.subscribe((v) => { pageX = v; });

  let selectedFormat = 'docx';
  let currentPath = '';
  let entries = [];
  let loading = true;
  let permissionNeeded = false;
  let exporting = false;
  let historyStack = [];

  let exportResolvers = new Map();
  let exportRequestId = 0;

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
      if (resolver) {
        exportResolvers.delete(requestId);
        resolver(resultRaw);
      }
    };
  });

  onDestroy(() => { delete window.onNexaExportResult; });

  onMount(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => slide.open()));
    window.addEventListener('popstate', handlePopState);
    history.pushState({ nexaExportPicker: true }, '', location.href);
    checkPermissionAndLoad();
  });

  onDestroy(() => {
    unsubscribe?.();
    slide.destroy();
    window.removeEventListener('popstate', handlePopState);
  });

  function handlePopState() { closePage(false); }

  function closePage(shouldPopHistory = true) {
    slide.close();
    setTimeout(() => dispatch('close'), 300);
    if (shouldPopHistory) history.back();
  }

  async function checkPermissionAndLoad() {
    if (!window.AndroidStorage) {
      showToast('Acesso ao armazenamento não disponível');
      return;
    }
    const hasPermission = window.AndroidStorage.hasPermission();
    if (!hasPermission) {
      permissionNeeded = true;
      loading = false;
      return;
    }
    permissionNeeded = false;
    await loadRoot();
  }

  function requestPermission() {
    window.AndroidStorage.requestPermission();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && permissionNeeded) {
      checkPermissionAndLoad();
    }
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
      historyStack = [rootPath];
    } finally {
      loading = false;
    }
  }

  async function loadPath(path) {
    loading = true;
    try {
      const raw = window.AndroidStorage.listFolders(path);
      const parsed = JSON.parse(raw);
      currentPath = parsed.path;
      entries = parsed.folders || [];
    } catch (e) {
      showToast('Não foi possível ler esta pasta');
    } finally {
      loading = false;
    }
  }

  function openFolder(folder) {
    historyStack = [...historyStack, folder.path];
    loadPath(folder.path);
  }

  function goBackFolder() {
    if (historyStack.length <= 1) { closePage(); return; }
    historyStack = historyStack.slice(0, -1);
    loadPath(historyStack[historyStack.length - 1]);
  }

  let showNewFolderInput = false;
  let newFolderName = '';

  function toggleNewFolder() {
    showNewFolderInput = !showNewFolderInput;
    newFolderName = '';
  }

  function confirmNewFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const ok = window.AndroidStorage.createFolder(currentPath, name);
    if (ok) {
      loadPath(currentPath);
      showNewFolderInput = false;
      newFolderName = '';
    } else {
      showToast('Não foi possível criar a pasta');
    }
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
        closePage();
      } else {
        showToast(result.error || 'Não foi possível gerar o documento');
      }
    } catch (e) {
      showToast('Não foi possível gerar o documento');
    } finally {
      exporting = false;
    }
  }
</script>

<!-- fundo: c.background via style inline — é página fixed, não herda nada -->
<div class="root" style="background:{c.background};transform:translate3d({pageX}%,0,0);">

  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" on:click={goBackFolder} aria-label="Voltar">
      <span class="icon-mask" style="
        mask-image:url('/icons/svg/back_arrow.svg');
        -webkit-mask-image:url('/icons/svg/back_arrow.svg');
        background:{c.iconTint};
        width:20px;height:20px;
      "></span>
    </button>
    <div class="appbar-title" style="color:{c.textPrimary}">
      {mode === 'share' ? 'Partilhar' : 'Exportar'} "{docName}"
    </div>
    <button class="appbar-btn" on:click={() => closePage()} aria-label="Fechar">
      <span class="icon-mask" style="
        mask-image:url('/icons/svg/close.svg');
        -webkit-mask-image:url('/icons/svg/close.svg');
        background:{c.iconTint};
        width:16px;height:16px;
      "></span>
    </button>
  </div>

  {#if permissionNeeded}
    <div class="permission-gate">
      <div class="permission-text">
        Para exportar o documento diretamente para uma pasta do teu telemóvel, é preciso autorizar o acesso ao armazenamento.
      </div>
      <button class="primary-btn" on:click={requestPermission}>Autorizar acesso</button>
    </div>
  {:else}

    <!-- chips de formato — usam variáveis CSS como o TemplatesTab -->
    <div class="format-row">
      <button
        class="format-chip"
        class:format-chip-active={selectedFormat === 'docx'}
        on:click={() => { selectedFormat = 'docx'; }}
      >Word (.docx)</button>
      <button
        class="format-chip"
        class:format-chip-active={selectedFormat === 'pdf'}
        on:click={() => { selectedFormat = 'pdf'; }}
      >PDF (.pdf)</button>
    </div>

    <div class="path-row">{currentPath}</div>

    <button class="new-folder-btn" on:click={toggleNewFolder}>+ Nova pasta</button>

    {#if showNewFolderInput}
      <div class="new-folder-form">
        <input
          class="new-folder-input"
          placeholder="Nome da pasta"
          bind:value={newFolderName}
          on:keydown={(e) => e.key === 'Enter' && confirmNewFolder()}
        />
        <button class="new-folder-confirm" on:click={confirmNewFolder}>Criar</button>
      </div>
    {/if}

    <div class="folder-list">
      {#if loading}
        <div class="state-msg">A carregar…</div>
      {:else if entries.length === 0}
        <div class="state-msg">Pasta vazia</div>
      {:else}
        {#each entries as folder (folder.path)}
          <button class="folder-row" on:click={() => openFolder(folder)}>
            <img
              src="/icons/svg/docs/color_svg/folder.svg"
              alt=""
              class="folder-icon"
              width="24"
              height="24"
            />
            <span class="folder-name" style="color:{c.textPrimary}">{folder.name}</span>
          </button>
        {/each}
      {/if}
    </div>

    <div class="confirm-bar">
      <button class="confirm-btn" on:click={confirmExport} disabled={exporting}>
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
    /* fundo definido via style inline com c.background — não aqui */
  }

  /* ── appbar ── */
  .appbar {
    display: flex; align-items: center; gap: 10px;
    padding: 52px 12px 12px; flex-shrink: 0;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    /* fundo do botão — mesmo padrão do TemplatesTab: var do sistema */
    background: var(--surface-apps-tab);
    box-shadow: 0 1px 3px var(--drawer-shadow);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .appbar-btn:active { transform: scale(0.88); }
  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
  .appbar-title {
    flex: 1; min-width: 0; text-align: center;
    font-size: 15px; font-weight: 700;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── permission gate ── */
  .permission-gate {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px; gap: 20px; text-align: center;
  }
  .permission-text {
    font-size: 14px; line-height: 1.5;
    color: var(--drawer-text-secondary);
  }
  .primary-btn {
    border: none; border-radius: 14px; padding: 14px 28px;
    background: #2F7BF6; color: #fff;
    font-size: 15px; font-weight: 600; cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .primary-btn:active { transform: scale(0.96); }

  /* ── format chips — mesmo padrão visual que doc-card/img-card do TemplatesTab ── */
  .format-row { display: flex; gap: 8px; padding: 12px 16px; }
  .format-chip {
    flex: 1; border: none; border-radius: 12px; padding: 12px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    /* estado inativo: mesma superfície dos cards do TemplatesTab */
    background: var(--surface-apps-tab);
    color: var(--drawer-text);
    box-shadow: 0 1px 4px var(--drawer-shadow);
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .format-chip:active { transform: scale(0.96); }
  /* estado ativo: accent azul, exatamente como doc-card:active usa --row-active */
  .format-chip-active {
    background: #2F7BF6 !important;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(47,123,246,0.35) !important;
  }

  /* ── path ── */
  .path-row {
    padding: 0 16px 4px;
    font-size: 12px; color: var(--drawer-text-secondary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── nova pasta ── */
  .new-folder-btn {
    background: none; border: none; text-align: left;
    padding: 4px 16px 10px;
    font-size: 14px; font-weight: 600; color: #2F7BF6;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .new-folder-form { display: flex; gap: 8px; padding: 0 16px 12px; }
  .new-folder-input {
    flex: 1; border: none; border-radius: 10px;
    padding: 10px 12px; font-size: 14px; outline: none;
    background: var(--surface-apps-tab);
    color: var(--drawer-text);
  }
  .new-folder-confirm {
    background: none; border: none;
    font-size: 14px; font-weight: 700; color: #2F7BF6;
    cursor: pointer; padding: 0 8px;
  }

  /* ── lista de pastas ── */
  .folder-list { flex: 1; overflow-y: auto; padding: 0 8px; }
  .folder-row {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none;
    padding: 13px 12px; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    border-radius: 14px;
    /* mesmo padrão de transição do img-card / doc-card do TemplatesTab */
    transition: background .16s ease, transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .folder-row:active {
    background: var(--row-active);
    transform: scale(0.98);
  }
  .folder-icon { flex-shrink: 0; width: 24px; height: 24px; }
  .folder-name {
    font-size: 15px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .state-msg {
    text-align: center; padding: 40px 16px;
    font-size: 14px; color: var(--drawer-text-secondary);
  }

  /* ── botão confirmar ── */
  .confirm-bar {
    padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 20px);
    flex-shrink: 0;
  }
  .confirm-btn {
    width: 100%; border: none; border-radius: 14px; padding: 15px;
    background: #2F7BF6; color: #fff;
    font-size: 15px; font-weight: 600; cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .confirm-btn:active:not(:disabled) { transform: scale(0.97); }
  .confirm-btn:disabled { opacity: 0.6; }
</style>