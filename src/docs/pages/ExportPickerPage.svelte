<!-- docs/pages/ExportPickerPage.svelte -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { createSlideTransition } from '../../home/lib/nav-transition.js';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';

  export let isDark = false;
  export let docName = '';
  export let mode = 'export'; // 'export' | 'share'
  export let getHtml = () => ''; // função que o MainPage passa para obter o HTML atual do documento na hora de confirmar (evita re-serializar HTML grande cedo demais)

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  // Mesma primitiva de spring usada nos bottom-sheets (ColorModal, TableModal,
  // etc.), aqui aplicada como slide horizontal de página cheia — entra da
  // direita (x: 100 -> 0), tal como as outras rotas internas (Profile/Settings).
  const slide = createSlideTransition({});
  let pageX = 100;
  const unsubscribe = slide.subscribe((v) => { pageX = v; });

  let selectedFormat = 'docx'; // 'docx' | 'pdf'
  let currentPath = '';
  let entries = [];
  let loading = true;
  let permissionNeeded = false;
  let exporting = false;

  let historyStack = []; // caminhos visitados, para o botão voltar interno navegar sem sair da página

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

  function handlePopState() {
    closePage(false);
  }

  function closePage(shouldPopHistory = true) {
    slide.close();
    setTimeout(() => {
      dispatch('close');
    }, 300);
    if (shouldPopHistory) {
      history.back();
    }
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
    // A Activity relança onResume ao voltar das Definições; o WebApp
    // reage a isso escutando visibilitychange, para verificar de novo
    // sem precisar que o utilizador toque em nada.
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
    if (historyStack.length <= 1) {
      closePage();
      return;
    }
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

  function selectFormat(format) {
    selectedFormat = format;
  }

  async function confirmExport() {
    if (exporting) return;
    exporting = true;
    try {
      const html = getHtml();
      const safeName = docName.replace(/[^\w\-]+/g, '_') || 'documento';
      const fileName = `${safeName}.${selectedFormat}`;
      const targetPath = `${currentPath}/${fileName}`;

      const resultRaw = await window.AndroidStorage.exportDocument(html, targetPath, selectedFormat, mode);
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

<div class="root" style="background:{c.background};color:{c.textPrimary};transform: translate3d({pageX}%, 0, 0);">

  <div class="appbar" style="border-bottom:0.5px solid {c.divider}">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={goBackFolder} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;"></span>
    </button>
    <div class="appbar-title" style="color:{c.textPrimary}">
      {mode === 'share' ? 'Partilhar' : 'Exportar'} "{docName}"
    </div>
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={() => closePage()} aria-label="Fechar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/close.svg');-webkit-mask-image:url('/icons/svg/close.svg');background:{c.iconTint};width:16px;height:16px;"></span>
    </button>
  </div>

  {#if permissionNeeded}
    <div class="permission-gate">
      <div class="permission-text" style="color:{c.textSecondary}">
        Para exportar o documento diretamente para uma pasta do teu telemóvel, é preciso autorizar o acesso ao armazenamento.
      </div>
      <button class="primary-btn" style="background:#2F7BF6" on:click={requestPermission}>
        Autorizar acesso
      </button>
    </div>
  {:else}
    <div class="format-row">
      <button
        class="format-chip"
        class:format-chip-active={selectedFormat === 'docx'}
        style={selectedFormat === 'docx' ? 'background:#2F7BF6;color:#fff' : `background:${c.appbarBtnBg};color:${c.textPrimary}`}
        on:click={() => selectFormat('docx')}
      >
        Word (.docx)
      </button>
      <button
        class="format-chip"
        class:format-chip-active={selectedFormat === 'pdf'}
        style={selectedFormat === 'pdf' ? 'background:#2F7BF6;color:#fff' : `background:${c.appbarBtnBg};color:${c.textPrimary}`}
        on:click={() => selectFormat('pdf')}
      >
        PDF (.pdf)
      </button>
    </div>

    <div class="path-row" style="color:{c.textSecondary}">
      {currentPath}
    </div>

    <button class="new-folder-btn" style="color:#2F7BF6" on:click={toggleNewFolder}>
      + Nova pasta
    </button>

    {#if showNewFolderInput}
      <div class="new-folder-form">
        <input
          class="new-folder-input"
          style="background:{c.appbarBtnBg};color:{c.textPrimary}"
          placeholder="Nome da pasta"
          bind:value={newFolderName}
          on:keydown={(e) => e.key === 'Enter' && confirmNewFolder()}
        />
        <button class="new-folder-confirm" style="color:#2F7BF6" on:click={confirmNewFolder}>Criar</button>
      </div>
    {/if}

    <div class="folder-list">
      {#if loading}
        <div class="state-msg" style="color:{c.textSecondary}">A carregar…</div>
      {:else if entries.length === 0}
        <div class="state-msg" style="color:{c.textSecondary}">Pasta vazia</div>
      {:else}
        {#each entries as folder (folder.path)}
          <button class="folder-row" on:click={() => openFolder(folder)}>
            <span class="folder-icon">📁</span>
            <span class="folder-name" style="color:{c.textPrimary}">{folder.name}</span>
          </button>
        {/each}
      {/if}
    </div>

    <div class="confirm-bar">
      <button class="confirm-btn" style="background:#2F7BF6" on:click={confirmExport} disabled={exporting}>
        {#if exporting}
          A gerar…
        {:else}
          {mode === 'share' ? 'Guardar e partilhar aqui' : 'Exportar para esta pasta'}
        {/if}
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
  }

  .appbar {
    display: flex; align-items: center; gap: 10px;
    padding: 52px 12px 12px; flex-shrink: 0;
  }
  .appbar-btn {
    width: 36px; height: 36px; border-radius: 50%; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .appbar-title {
    flex: 1; min-width: 0; text-align: center; font-size: 15px; font-weight: 700;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .permission-gate {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 32px; gap: 20px; text-align: center;
  }
  .permission-text { font-size: 14px; line-height: 1.5; }
  .primary-btn {
    border: none; border-radius: 14px; padding: 14px 28px;
    color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  }

  .format-row { display: flex; gap: 8px; padding: 4px 16px 12px; }
  .format-chip {
    flex: 1; border: none; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 600;
    cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background .16s;
  }

  .path-row {
    padding: 0 16px 8px; font-size: 12px; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap;
  }

  .new-folder-btn {
    background: none; border: none; text-align: left; padding: 0 16px 8px;
    font-size: 14px; font-weight: 600; cursor: pointer; -webkit-tap-highlight-color: transparent;
  }

  .new-folder-form { display: flex; gap: 8px; padding: 0 16px 12px; }
  .new-folder-input {
    flex: 1; border: none; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none;
  }
  .new-folder-confirm {
    background: none; border: none; font-size: 14px; font-weight: 700; cursor: pointer; padding: 0 8px;
  }

  .folder-list { flex: 1; overflow-y: auto; padding: 0 8px; }
  .folder-row {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: none; border: none; padding: 14px 12px; text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .folder-icon { font-size: 18px; }
  .folder-name { font-size: 15px; }

  .state-msg { text-align: center; padding: 40px 16px; font-size: 14px; }

  .confirm-bar { padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 20px); }
  .confirm-btn {
    width: 100%; border: none; border-radius: 14px; padding: 15px;
    color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  .confirm-btn:disabled { opacity: 0.6; }
</style>