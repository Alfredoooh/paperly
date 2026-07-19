<script>
  import { createEventDispatcher } from 'svelte';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Sheets';

  const dispatch = createEventDispatcher();

  $: c = isDark
    ? {
        background: '#0B0D10',
        textPrimary: '#F2F3F5',
        textSecondary: '#9AA0A8',
        divider: 'rgba(255,255,255,0.10)',
        appbarBtnBg: 'rgba(255,255,255,0.08)',
        iconTint: '#F2F3F5',
        dialogBackground: '#1B1E23',
        settings_section_label: '#7E858E',
      }
    : {
        background: '#F4F5F7',
        textPrimary: '#15181D',
        textSecondary: '#6B7280',
        divider: 'rgba(0,0,0,0.08)',
        appbarBtnBg: 'rgba(0,0,0,0.05)',
        iconTint: '#15181D',
        dialogBackground: '#FFFFFF',
        settings_section_label: '#8A9099',
      };

  function goBack() {
    dispatch('nav', { to: 'main' });
  }

  function toggleTheme() {
    dispatch('nav', { to: 'main', data: { isDark: !isDark } });
  }
</script>

<div class="page-shell" style="background:{c.background};">
  <div class="appbar" style="background:{c.background};border-color:{c.divider};">
    <button class="appbar-btn" style="background:{c.appbarBtnBg}" on:click={goBack} aria-label="Voltar">
      <span class="icon-mask" style="mask-image:url('/icons/svg/back.svg');-webkit-mask-image:url('/icons/svg/back.svg');background:{c.iconTint};width:20px;height:20px;"></span>
    </button>
    <div class="appbar-title" style="color:{c.textPrimary}">Definições</div>
    <div class="appbar-spacer"></div>
  </div>

  <div class="settings-body">
    <div class="settings-section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <button class="settings-row" on:click={toggleTheme}>
        <span class="row-label" style="color:{c.textPrimary}">Tema escuro</span>
        <div class="toggle-track" class:toggle-on={isDark}>
          <div class="toggle-thumb" class:toggle-thumb-on={isDark}></div>
        </div>
      </button>
    </div>

    <div class="settings-section-label" style="color:{c.settings_section_label}">Conta</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <div class="settings-row settings-row-static">
        <span class="row-label" style="color:{c.textPrimary}">{user?.name || user?.email || 'Utilizador'}</span>
      </div>
    </div>

    <div class="settings-section-label" style="color:{c.settings_section_label}">Sobre</div>
    <div class="settings-group" style="background:{c.dialogBackground};">
      <div class="settings-row settings-row-static">
        <span class="row-label" style="color:{c.textPrimary}">{appTitle}</span>
        <span class="row-value" style="color:{c.textSecondary}">v1.0</span>
      </div>
    </div>
  </div>
</div>

<style>
  .page-shell {
    display: flex; flex-direction: column; height: 100%; width: 100%; overflow: hidden;
  }
  .appbar {
    display: flex; align-items: center; gap: 8px;
    padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px;
    border-bottom: 1px solid; flex-shrink: 0;
  }
  .appbar-btn {
    width: 38px; height: 38px; border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s cubic-bezier(0.34,1.56,0.64,1);
  }
  .appbar-btn:active { transform: scale(0.88); }
  .appbar-title { flex: 1; font-size: 16px; font-weight: 700; text-align: center; margin-right: 38px; }
  .appbar-spacer { width: 38px; flex-shrink: 0; }

  .icon-mask {
    display: block; mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .settings-body { flex: 1; overflow-y: auto; padding: 18px 16px calc(env(safe-area-inset-bottom,0px) + 24px); -webkit-overflow-scrolling: touch; }
  .settings-section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 20px 8px 8px; }
  .settings-section-label:first-child { margin-top: 0; }
  .settings-group { border-radius: 16px; overflow: hidden; }
  .settings-row {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; background: none; border: none; cursor: pointer; text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .settings-row-static { cursor: default; }
  .row-label { font-size: 15px; font-weight: 500; }
  .row-value { font-size: 14px; }

  .toggle-track {
    width: 46px; height: 27px; border-radius: 999px; background: rgba(127,127,127,0.28);
    position: relative; transition: background .22s ease; flex-shrink: 0;
  }
  .toggle-track.toggle-on { background: #2F7BF6; }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px; width: 23px; height: 23px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform .22s cubic-bezier(0.34,1.4,0.64,1);
  }
  .toggle-thumb-on { transform: translateX(19px); }
</style>