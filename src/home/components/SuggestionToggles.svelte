<!-- src/routes/home/components/SuggestionToggles.svelte -->
<script>
  import { SUGGESTION_TOGGLES } from '../lib/constants.js';
  
  export let mountToggles = false;
  export let panelShouldShow = false;
  export let togglesShouldShow = false;
  export let activeToggle = null;
  export let onSelect;
  
  $: rows = [SUGGESTION_TOGGLES.slice(0, 2), SUGGESTION_TOGGLES.slice(2, 4), SUGGESTION_TOGGLES.slice(4, 6)];
</script>

{#if mountToggles}
  <div class="toggles-wrap" class:toggles-in={panelShouldShow} class:toggles-hidden={!togglesShouldShow} style="pointer-events:{togglesShouldShow?'auto':'none'}">
    {#each rows as row, ri}
      <div class="toggles-row">
        {#each row as t, i}
          <button
            class="suggestion-toggle pulse-tap"
            class:toggle-active={activeToggle?.id === t.id}
            style="transition-delay:{panelShouldShow ? (ri*2+i)*45 : 0}ms;"
            tabindex={togglesShouldShow ? 0 : -1}
            on:click={() => onSelect(t)}
          >
            <img src={t.icon} alt={t.label} class="toggle-img" />
            <span class="toggle-label">{t.label}</span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .toggles-wrap {
    display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; padding-bottom:10px;
  }
  .toggles-row { display:flex; flex-direction:row; justify-content:center; gap:7px; }
  .suggestion-toggle {
    display:inline-flex; align-items:center; gap:7px;
    padding:7px 14px 7px 7px; border-radius:999px;
    border:1px solid var(--toggle-border); background:var(--toggle-bg);
    cursor:pointer; font-family:inherit; white-space:nowrap;
    box-shadow:0 2px 8px rgba(0,0,0,0.10);
    opacity:0; transform:scale(0.86) translateY(10px);
    transition:
      opacity .5s cubic-bezier(0.16,1,0.3,1),
      transform .5s cubic-bezier(0.16,1,0.3,1),
      background .18s cubic-bezier(0.16,1,0.3,1),
      border-color .18s cubic-bezier(0.16,1,0.3,1);
  }
  .toggles-in .suggestion-toggle { opacity:1; transform:scale(1) translateY(0); }
  .toggles-hidden .suggestion-toggle {
    opacity:0; transform:scale(0.92) translateY(6px);
    transition:opacity .24s cubic-bezier(0.4,0,1,1), transform .24s cubic-bezier(0.4,0,1,1);
    transition-delay:0ms !important;
  }
  .suggestion-toggle:active { transform:scale(0.94); }
  .toggle-active { background:var(--toggle-bg-act) !important; border-color:var(--toggle-border-act) !important; }
  .toggle-img { width:22px; height:22px; object-fit:contain; flex-shrink:0; border-radius:5px; }
  .toggle-label { font-size:13px; font-weight:600; color:var(--toggle-label); }
  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
</style>