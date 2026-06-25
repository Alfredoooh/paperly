<script>
  import { onMount, createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let isDark = false;

  onMount(() => {
    setTimeout(() => dispatch('nav', { to: 'login' }), 800);
  });
</script>

<div class="splash" style="background:{isDark ? '#121212' : '#FFFFFF'}">
  <img src="/icons/png/logo.png" alt="Nexa" class="logo" />
</div>

<style>
  .splash {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 0.4s ease;
  }
  .logo {
    width: 84px; height: 84px; border-radius: 20px;
  }
</style>