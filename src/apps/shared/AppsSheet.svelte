<script>
  import { createEventDispatcher } from 'svelte';
  import { DRAWER_APPS } from '../../core/plans.js';
  import { getThemeColors } from '../../core/theme.js';

  export let isDark = false;
  export let currentApp = 'ai';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  const groups = [
    { label: 'Inteligência', ids: ['ai'] },
    { label: 'Entretenimento', ids: ['music', 'games', 'media'] },
    { label: 'Informação', ids: ['news'] },
    { label: 'Ferramentas', ids: ['downloader'] },
  ];

  const lookup = Object.fromEntries(DRAWER_APPS.map(app => [app.id, app]));

  function selectApp(id) {
    dispatch('selectApp', { id });
  }
</script>

<div class="apps-sheet">
  <div class="sheet-title" style="color:{c.textPrimary}">Apps</div>
  <div class="sheet-subtitle" style="color:{c.textSecondary}">Escolhe uma plataforma</div>

  {#each groups as group}
    <div class="group-block">
      <div class="group-label" style="color:{c.textSecondary}">{group.label}</div>
      <div class="apps-grid">
        {#each group.ids as id}
          {@const app = lookup[id]}
          <button
            class="app-card pulse-tap"
            class:selected={currentApp === id}
            style="background:{currentApp === id ? c.tabPreviewPillBg : (isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF')};border-color:{currentApp === id ? c.primary : c.divider}"
            on:click={() => selectApp(id)}
          >
            <div class="app-icon-wrap" style="box-shadow:{currentApp === id ? '0 10px 24px rgba(75,131,255,0.20)' : 'none'}">
              <img src={app.icon} alt={app.title} class="app-icon" />
            </div>
            <div class="app-name" style="color:{c.textPrimary}">{app.title}</div>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .apps-sheet { padding: 0 16px 18px; }
  .sheet-title { font-size: 22px; font-weight: 850; letter-spacing: -0.03em; margin: 0 0 6px; }
  .sheet-subtitle { font-size: 13px; margin-bottom: 14px; }
  .group-block { margin-top: 16px; }
  .group-label { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
  .apps-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 10px; }
  .app-card {
    width: 100%;
    border: 1px solid;
    border-radius: 22px;
    padding: 14px 10px 12px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap: 9px;
    cursor:pointer;
    transition: transform .12s ease, opacity .12s ease, border-color .12s ease, background .12s ease;
  }
  .app-card:active { transform: scale(0.97); opacity: .88; }
  .app-card.selected { transform: translateY(-1px); }
  .app-icon-wrap {
    width: 56px; height: 56px;
    border-radius: 18px;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
    background: rgba(255,255,255,0.5);
  }
  .app-icon { width: 42px; height: 42px; object-fit:cover; border-radius: 14px; }
  .app-name { font-size: 12px; font-weight: 700; text-align:center; line-height: 1.15; min-height: 28px; display:flex; align-items:center; justify-content:center; }
  .pulse-tap { cursor:pointer; transition:transform .11s cubic-bezier(0.4,0,.2,1), opacity .11s cubic-bezier(0.4,0,.2,1); }
  .pulse-tap:active { transform: scale(0.97); opacity:.86; }
  @media (min-width: 720px) {
    .apps-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
</style>
