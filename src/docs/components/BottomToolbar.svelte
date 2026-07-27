<!-- components/BottomToolbar.svelte -->
<script>
  import { localIconPath, localColorIconPath } from '$shared/local-icon.js';

  import { createEventDispatcher } from 'svelte';

  export let c;
  export let activePanel = null;
  export let visible = false;
  export let fontColorHex = '#1a1a1a';   // cor atual do texto (swatch sob o "A")
  export let highlightHex = null;         // cor atual do realçador (null = sem realce, swatch cinza)

  const dispatch = createEventDispatcher();
  const ICON_PX = 24;

  // ══════════════════════════════════════════════════════════════════
  //  GRUPOS — o seletor "Base ▾" no início do bottombar troca qual
  //  destes grupos aparece no scroll horizontal. Cada grupo tem os
  //  seus próprios itens, categorizados exatamente como no Word
  //  Mobile (Base = formatação de texto; Inserir = imagem/tabela;
  //  Desenhar = ferramentas de desenho, que abrem o DesignModal já
  //  existente).
  // ══════════════════════════════════════════════════════════════════
  const GROUPS = [
    { id: 'base', label: 'Base' },
    { id: 'insert', label: 'Inserir' },
    { id: 'draw', label: 'Desenhar' },
  ];

  export let activeGroup = 'base';

  const ITEMS_BASE = [
    { id: 'bold', icon: 'text_bold_24_regular', label: 'Negrito' },
    { id: 'italic', icon: 'text_italic_24_regular', label: 'Itálico' },
    { id: 'underline', icon: 'text_underline_24_regular', label: 'Sublinhado' },
    { id: 'strikethrough', icon: 'text_strikethrough_24_regular', label: 'Rasurado' },
    { id: 'color', icon: 'highlight_24_regular', label: 'Realçador', panel: true, swatch: 'highlight' },
    { id: 'fontcolor', icon: 'text_font_24_regular', label: 'Cor da fonte', panel: true, swatch: 'font' },
    { id: 'font', icon: 'text_font_24_regular', label: 'Fonte', panel: true },
    { id: 'size', icon: 'text_font_size_24_regular', label: 'Tamanho', panel: true },
    { id: 'align', icon: 'text_align_left_24_regular', label: 'Alinhamento', panel: true },
    { id: 'list', icon: 'text_bullet_list_24_regular', label: 'Marcadores', panel: true },
    { id: 'numbering', icon: 'text_number_list_rtl_24_regular', label: 'Numeração', panel: true },
    { id: 'link', icon: 'link_24_regular', label: 'Link', panel: true },
    { id: 'footnote', icon: 'text_footnote_24_regular', label: 'Nota de rodapé', panel: true },
    { id: 'layers', icon: 'layer_24_regular', label: 'Camadas', panel: true },
  ];

  const ITEMS_INSERT = [
    { id: 'insert', icon: 'image_24_color', label: 'Imagem', colorIcon: true },
    { id: 'table', icon: 'table_24_color', label: 'Tabela', colorIcon: true },
    { id: 'link', icon: 'link_24_regular', label: 'Link', panel: true },
    { id: 'footnote', icon: 'text_footnote_24_regular', label: 'Nota de rodapé', panel: true },
  ];

  const ITEMS_DRAW = [
    { id: 'design', icon: 'paint_brush_24_regular', label: 'Ferramentas de desenho', panel: true },
  ];

  $: ITEMS = activeGroup === 'insert' ? ITEMS_INSERT
    : activeGroup === 'draw' ? ITEMS_DRAW
    : ITEMS_BASE;

  $: activeGroupLabel = GROUPS.find(g => g.id === activeGroup)?.label || 'Base';

  let groupMenuOpen = false;
  let sheetOpen = false;

  function iconUrl(item) {
    return item.colorIcon ? localColorIconPath(item.icon) : localIconPath(item.icon);
  }

  function press(item) {
    if (item.disabled && item.disabled()) return;
    dispatch('action', item.id);
  }

  function toggleGroupMenu() {
    groupMenuOpen = !groupMenuOpen;
  }

  function pickGroup(id) {
    activeGroup = id;
    groupMenuOpen = false;
    dispatch('groupchange', id);
  }

  function openSheet() {
    sheetOpen = true;
  }
  function closeSheet() {
    sheetOpen = false;
  }

  function pressFromSheet(item) {
    closeSheet();
    press(item);
  }
</script>

<div
  class="tb-wrap"
  class:tb-hidden={!visible}
  style="background:{c.toolbarSolidBg};"
>
  <div class="tb-row">
    <!-- Seletor de grupo: "Base ▾" — abre um pequeno menu para trocar
         entre Base / Inserir / Desenhar. O bottombar compacto passa a
         mostrar só os itens do grupo escolhido. -->
    <div class="tb-group-wrap">
      <button class="tb-group-btn" on:click={toggleGroupMenu} aria-label="Trocar grupo de ferramentas">
        <span style="color:{c.accentPrimary || c.textPrimary};font-weight:600;font-size:14px;">{activeGroupLabel}</span>
        <span
          class="icon-mask tb-chevron"
          class:tb-chevron-open={groupMenuOpen}
          style="mask-image:url('{localIconPath('chevron_down_24_regular')}');-webkit-mask-image:url('{localIconPath('chevron_down_24_regular')}');background:{c.accentPrimary || c.iconTint};width:16px;height:16px;"
        ></span>
      </button>

      {#if groupMenuOpen}
        <div class="tb-group-menu" style="background:{c.dialogBackground || c.toolbarSolidBg};border-color:{c.divider};">
          {#each GROUPS as g}
            <button
              class="tb-group-item"
              class:tb-group-item-active={g.id === activeGroup}
              on:click={() => pickGroup(g.id)}
              style="color:{g.id === activeGroup ? (c.accentPrimary || c.textPrimary) : c.textPrimary};"
            >
              {g.label}
              {#if g.id === activeGroup}
                <span
                  class="icon-mask"
                  style="mask-image:url('{localIconPath('checkmark_24_regular')}');-webkit-mask-image:url('{localIconPath('checkmark_24_regular')}');background:{c.accentPrimary || c.iconTint};width:15px;height:15px;"
                ></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="tb-scroll">
      {#each ITEMS as item}
        <button
          class="tb-btn"
          class:tb-active={item.panel && activePanel === item.id}
          disabled={item.disabled ? item.disabled() : false}
          on:click={() => press(item)}
          aria-label={item.label}
        >
          {#if item.colorIcon}
            <!-- Ícone colorido (imagem/tabela): sem mask, cores próprias do SVG. -->
            <img
              class="icon-color"
              src={iconUrl(item)}
              alt=""
              width="24"
              height="24"
              style="opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
            />
          {:else if item.swatch === 'font'}
            <!-- Cor da fonte: "A" com uma barra de cor por baixo,
                 mostrando a cor atualmente aplicada (preto por
                 omissão, antes de qualquer escolha). -->
            <span class="swatch-wrap">
              <span class="swatch-letter" style="color:{c.iconTint};">A</span>
              <span class="swatch-bar" style="background:{fontColorHex || '#1a1a1a'};"></span>
            </span>
          {:else if item.swatch === 'highlight'}
            <!-- Realçador: ícone de marcador com uma barra de cor por
                 baixo. Sem realce escolhido ainda → barra cinza. -->
            <span class="swatch-wrap">
              <span
                class="icon-mask"
                style="mask-image:url('{iconUrl(item)}');-webkit-mask-image:url('{iconUrl(item)}');background:{c.iconTint};width:22px;height:22px;"
              ></span>
              <span class="swatch-bar" style="background:{highlightHex || '#c9c9c9'};"></span>
            </span>
          {:else}
            <span
              class="icon-mask"
              style="mask-image:url('{iconUrl(item)}');-webkit-mask-image:url('{iconUrl(item)}');background:{c.iconTint};width:24px;height:24px;max-width:24px;max-height:24px;opacity:{item.disabled && item.disabled() ? 0.32 : 1};"
            ></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Seta no fim: abre o sheet cheio (lista vertical, mantendo o
         bottombar reto/parado por trás) com todos os itens do grupo
         ativo. -->
    <button class="tb-expand-btn" on:click={openSheet} aria-label="Ver todas as opções">
      <span
        class="icon-mask"
        style="mask-image:url('{localIconPath('chevron_up_24_regular')}');-webkit-mask-image:url('{localIconPath('chevron_up_24_regular')}');background:{c.iconTint};width:20px;height:20px;"
      ></span>
    </button>
  </div>
</div>

{#if sheetOpen}
  <div class="tb-sheet-overlay" on:click={closeSheet}></div>
  <div class="tb-sheet" style="background:{c.dialogBackground || '#1c1c1e'};">
    <div class="tb-sheet-handle"></div>
    <div class="tb-sheet-title-row">
      <span class="tb-sheet-title" style="color:{c.textPrimary};">{activeGroupLabel}</span>
      <button class="tb-sheet-close" on:click={closeSheet} aria-label="Fechar">
        <span
          class="icon-mask"
          style="mask-image:url('{localIconPath('dismiss_24_regular')}');-webkit-mask-image:url('{localIconPath('dismiss_24_regular')}');background:{c.textSecondary || c.iconTint};width:18px;height:18px;"
        ></span>
      </button>
    </div>
    <div class="tb-sheet-list">
      {#each ITEMS as item}
        <button
          class="tb-sheet-item"
          class:tb-sheet-item-active={item.panel && activePanel === item.id}
          disabled={item.disabled ? item.disabled() : false}
          on:click={() => pressFromSheet(item)}
        >
          <span class="tb-sheet-icon" style="background:{item.panel && activePanel === item.id ? (c.accentPrimary ? c.accentPrimary + '18' : 'rgba(127,127,127,0.14)') : 'transparent'};">
            {#if item.colorIcon}
              <img src={iconUrl(item)} alt="" width="20" height="20" />
            {:else if item.swatch === 'font'}
              <span class="swatch-wrap swatch-wrap-sheet">
                <span class="swatch-letter" style="color:{c.iconTint};font-size:16px;">A</span>
                <span class="swatch-bar" style="background:{fontColorHex || '#1a1a1a'};"></span>
              </span>
            {:else if item.swatch === 'highlight'}
              <span class="swatch-wrap swatch-wrap-sheet">
                <span class="icon-mask" style="mask-image:url('{iconUrl(item)}');-webkit-mask-image:url('{iconUrl(item)}');background:{c.iconTint};width:18px;height:18px;"></span>
                <span class="swatch-bar" style="background:{highlightHex || '#c9c9c9'};"></span>
              </span>
            {:else}
              <span class="icon-mask" style="mask-image:url('{iconUrl(item)}');-webkit-mask-image:url('{iconUrl(item)}');background:{item.panel && activePanel === item.id ? (c.accentPrimary || c.iconTint) : c.iconTint};width:20px;height:20px;"></span>
            {/if}
          </span>
          <span class="tb-sheet-label" style="color:{item.panel && activePanel === item.id ? (c.accentPrimary || c.textPrimary) : c.textPrimary};">{item.label}</span>
          {#if item.panel}
            <span
              class="icon-mask tb-sheet-chevron"
              style="mask-image:url('{localIconPath('chevron_right_24_regular')}');-webkit-mask-image:url('{localIconPath('chevron_right_24_regular')}');background:{c.textSecondary || c.iconTint};width:15px;height:15px;"
            ></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .tb-wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 40;
    padding: 8px 0 calc(env(safe-area-inset-bottom,0px) + 8px);
    box-shadow: 0 -0.5px 0 0 rgba(127,127,127,0.18);
    transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .3s cubic-bezier(0.32, 0.72, 0, 1);
    opacity: 1;
    /* A barra sobe exatamente o valor do teclado (--kb-offset), a
       ÚNICA variável de referência, também usada em MainPage.svelte
       para calcular a altura útil do canvas. O appbar nunca lê esta
       variável, por isso só a toolbar sobe, nunca o appbar. */
    transform: translate3d(0, calc(-1 * var(--kb-offset, 0px)), 0);
  }
  .tb-wrap.tb-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translate3d(0, calc(100% + var(--kb-offset, 0px)), 0);
  }

  .tb-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  /* ── Seletor de grupo "Base ▾" ────────────────────────────────── */
  .tb-group-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .tb-group-btn {
    display: flex; align-items: center; gap: 4px;
    height: 40px; padding: 0 10px 0 12px;
    border: none; background: transparent; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tb-chevron { transition: transform .18s ease; }
  .tb-chevron-open { transform: rotate(180deg); }
  /* Cantos mais finos e sombra mais discreta — aproxima do estilo
     nativo de menus contextuais Android/iOS em vez do border-radius
     16px genérico anterior. Sem backdrop-filter em lado nenhum. */
  .tb-group-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 8px;
    min-width: 160px;
    border-radius: 10px;
    border: 0.5px solid;
    box-shadow: 0 2px 10px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12);
    padding: 4px;
    z-index: 50;
  }
  .tb-group-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 9px 10px;
    border: none; background: transparent;
    border-radius: 7px;
    font-size: 14px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tb-group-item:active { background: rgba(127,127,127,0.12); }
  .tb-group-item-active { font-weight: 600; }

  /* Scroll horizontal nativo: todas as opções do grupo ficam
     disponíveis deslizando, sem chevron a escondê-las. */
  .tb-scroll {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    flex: 1;
    min-width: 0;
    width: 100%;
  }
  .tb-scroll::-webkit-scrollbar { display: none; }

  .tb-btn {
    width: 44px; height: 40px; border: none; background: transparent; border-radius: 0;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .12s;
  }
  .tb-btn:active { opacity: .55; }
  .tb-btn:disabled { cursor: default; }
  .tb-btn:disabled:active { opacity: .32; }
  .tb-active .icon-mask { background: var(--accent-primary) !important; }

  .tb-expand-btn {
    width: 36px; height: 40px; border: none; background: transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    border-left: 0.5px solid rgba(127,127,127,0.22);
  }
  .tb-expand-btn:active { opacity: .55; }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
    flex-shrink: 0;
  }
  .icon-color {
    display: block;
    width: 24px; height: 24px;
    flex-shrink: 0;
    object-fit: contain;
  }

  /* ── Swatches (cor da fonte / realçador) ──────────────────────── */
  .swatch-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .swatch-wrap-sheet { gap: 3px; }
  .swatch-letter {
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
  }
  .swatch-bar {
    width: 18px;
    height: 3px;
    border-radius: 1.5px;
    flex-shrink: 0;
  }

  /* ── Sheet cheio (lista vertical), aberto pela seta ⌃ ─────────── */
  /* Overlay sólido semi-transparente, sem blur — igual ao pedido de
     remover backdrop-filter em todos os overlays. */
  .tb-sheet-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.36);
    z-index: 49;
  }
  /* Cantos superiores mais finos (14px em vez de 16px), sombra mais
     rasa e mais próxima do padrão nativo de bottom sheets Android
     (Material 3) / iOS, em vez da sombra genérica anterior. */
  .tb-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 51;
    max-height: 62vh;
    border-radius: 14px 14px 0 0;
    padding: 8px 0 calc(env(safe-area-inset-bottom,0px) + 8px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 -2px 16px rgba(0,0,0,0.22);
  }
  .tb-sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(127,127,127,0.4);
    margin: 4px auto 10px;
    flex-shrink: 0;
  }
  .tb-sheet-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px 8px 20px;
    flex-shrink: 0;
  }
  .tb-sheet-title {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.6;
  }
  .tb-sheet-close {
    width: 30px; height: 30px;
    border: none; background: transparent;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tb-sheet-close:active { background: rgba(127,127,127,0.12); }
  .tb-sheet-list {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 8px;
  }
  /* Cada linha ganha raio próprio, mais fino (10px) e organizado —
     lista de opções agora lê-se como cartões discretos em vez de
     uma lista plana, ainda mais próximo do padrão nativo de menus
     de contexto do Word/iOS. */
  .tb-sheet-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border: none;
    background: transparent;
    border-radius: 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
  }
  .tb-sheet-item:active { background: rgba(127,127,127,0.10); }
  .tb-sheet-item:disabled { opacity: 0.4; cursor: default; }
  .tb-sheet-icon {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    border-radius: 8px;
    flex-shrink: 0;
    transition: background .15s;
  }
  .tb-sheet-label {
    flex: 1;
    font-size: 15px;
  }
  .tb-sheet-chevron { flex-shrink: 0; opacity: 0.5; }
  .tb-sheet-item-active .tb-sheet-label { font-weight: 600; }

  @media (prefers-reduced-motion: reduce) {
    .tb-wrap { transition: none !important; }
  }
</style>