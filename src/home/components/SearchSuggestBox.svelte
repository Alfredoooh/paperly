<!-- src/routes/home/components/SearchSuggestBox.svelte -->
<script>
  export let showSuggestBox = false;
  export let suggestLoading = false;
  export let searchSuggestions = [];
  export let onUse;
  export let onFill;
</script>

{#if showSuggestBox && (searchSuggestions.length > 0 || suggestLoading)}
  <div class="suggest-box">
    {#if suggestLoading && !searchSuggestions.length}
      <div class="suggest-row suggest-loading">
        <svg class="suggest-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="suggest-text suggest-text-faint">A procurar sugestões...</span>
      </div>
    {:else}
      {#each searchSuggestions as s (s)}
        <button class="suggest-row pulse-tap" on:click={() => onUse(s)}>
          <svg class="suggest-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="suggest-text">{s}</span>
          <span
            class="suggest-fill pulse-tap"
            role="button"
            tabindex="0"
            on:click|stopPropagation={() => onFill(s)}
            on:keydown|stopPropagation={(e) => { if (e.key === 'Enter' || e.key === ' ') onFill(s); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--icon-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="17" y1="7" x2="7" y2="17"/>
              <polyline points="7 9 7 17 15 17"/>
            </svg>
          </span>
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .suggest-box {
    border-radius:18px; background:var(--surface-strong); border:0.5px solid var(--border-soft);
    box-shadow:0 8px 26px rgba(0,0,0,0.16); overflow:hidden; margin-bottom:8px;
    animation:suggestIn .26s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes suggestIn {
    from { opacity:0; transform:translateY(10px) scale(0.98); }
    to { opacity:1; transform:translateY(0) scale(1); }
  }
  .suggest-row {
    display:flex; align-items:center; gap:12px; width:100%; padding:11px 12px;
    background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left;
    transition:background .16s cubic-bezier(0.16,1,0.3,1);
  }
  .suggest-row:active { background:var(--row-active); }
  .suggest-loading { cursor:default; }
  .suggest-search-ico { flex-shrink:0; }
  .suggest-text {
    flex:1; font-size:14px; font-weight:500; color:var(--icon-strong);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .suggest-text-faint { color:var(--text-faint); font-weight:400; }
  .suggest-fill {
    width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;
    transition:background .16s cubic-bezier(0.16,1,0.3,1), transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .suggest-fill:active { background:var(--btn-bg-active); transform:scale(0.84); }
  .pulse-tap {
    cursor:pointer;
    transition:transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .16s cubic-bezier(0.16,1,0.3,1);
  }
  .pulse-tap:active { transform:scale(0.96); opacity:.80; }
</style>